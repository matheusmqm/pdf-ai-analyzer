"""Tools the agent can call, and the per-question context that executes them.

search_documents -> semantic search (PDF excerpts + spreadsheet cards), same RAG as before
list_tables      -> the tables (one per sheet) available for SQL
describe_table   -> columns, types and sample rows of one table
run_sql          -> read-only SELECT on the spreadsheets (DuckDB sandbox)

Every tool returns plain text to the model. Source numbers [n] are assigned here, so
the model can cite them and the API can return the matching sources.
"""

import json
import logging

import pandas as pd

from app.services import (
    document_service,
    llm_service,
    retrieval_service,
    spreadsheet_service,
    storage_service,
)
from app.services.query_engine import QueryEngine, QueryError, TableInfo
from app.core.config import get_settings

log = logging.getLogger(__name__)

TOOLS = [
    {
        "name": "search_documents",
        "description": (
            "Semantic search over the knowledge base. Returns numbered excerpts from PDFs "
            "and short descriptions ('cards') of spreadsheet sheets. Use it to find facts "
            "stated in PDFs and to discover which spreadsheets are relevant."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to look for, in natural language."}
            },
            "required": ["query"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_tables",
        "description": (
            "Lists the SQL tables available (one per spreadsheet sheet) with the source "
            "file, sheet name, row count and column names."
        ),
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "describe_table",
        "description": "Shows the columns (with types) and a few sample rows of one table.",
        "input_schema": {
            "type": "object",
            "properties": {"table": {"type": "string", "description": "Table name from list_tables."}},
            "required": ["table"],
            "additionalProperties": False,
        },
    },
    {
        "name": "run_sql",
        "description": (
            "Runs ONE read-only SELECT (DuckDB SQL) on the spreadsheet tables and returns the "
            "rows. Use it for every sum, count, average, filter, grouping, ranking or "
            "comparison; never compute numbers yourself. Results are capped, so aggregate."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "A single SELECT statement."}},
            "required": ["query"],
            "additionalProperties": False,
        },
    },
]


class AgentContext:
    """State of ONE question: numbered sources, trace and (lazily) the SQL engine."""

    def __init__(self, document_ids: set[str] | None = None) -> None:
        # Spreadsheets this question may query (None = every ready spreadsheet).
        self.document_ids = document_ids
        self.sources: dict[int, dict] = {}
        self.trace: list[dict] = []
        self._chunk_refs: dict[str, int] = {}
        self._sheet_refs: dict[tuple[str, str, str | None], int] = {}
        self._engine: QueryEngine | None = None

    # ---- lifecycle -------------------------------------------------------
    def close(self) -> None:
        if self._engine:
            self._engine.close()
            self._engine = None

    def _new_ref(self, source: dict) -> int:
        ref = len(self.sources) + 1
        source["ref"] = ref
        self.sources[ref] = source
        return ref

    # ---- SQL engine (loaded only if a tool needs it) ---------------------
    def engine(self) -> QueryEngine:
        if self._engine is None:
            self._engine = QueryEngine(self._load_tables())
        return self._engine

    def _load_tables(self) -> list[TableInfo]:
        infos: list[TableInfo] = []
        used: set[str] = set()
        for doc in document_service.list_ready_spreadsheets():
            if self.document_ids is not None and doc["id"] not in self.document_ids:
                continue
            try:
                data = storage_service.download_file(doc["storage_path"])
                tables = spreadsheet_service.parse(data, doc["file_type"], doc["filename"])
            except Exception:
                # A broken file must not break the question for the other files.
                log.exception("Could not load spreadsheet %s", doc["id"])
                continue
            for table in tables:
                base = spreadsheet_service.table_name(doc["filename"], table.sheet, doc["file_type"])
                name, n = base, 2
                while name in used:
                    name, n = f"{base}_{n}", n + 1
                used.add(name)
                infos.append(
                    TableInfo(
                        name=name,
                        document_id=doc["id"],
                        filename=doc["filename"],
                        sheet=table.sheet,
                        df=table.df,
                    )
                )
        return infos

    # ---- dispatch --------------------------------------------------------
    def execute(self, name: str, tool_input: dict) -> tuple[str, bool]:
        """Returns (text for the model, is_error). Also appends to the trace."""
        try:
            handler = {
                "search_documents": self._search_documents,
                "list_tables": self._list_tables,
                "describe_table": self._describe_table,
                "run_sql": self._run_sql,
            }.get(name)
            if handler is None:
                raise QueryError(f"Unknown tool: {name}")
            text, summary = handler(tool_input)
            self.trace.append({"tool": name, "input": tool_input, "summary": summary, "error": False})
            return text, False
        except QueryError as e:
            self.trace.append({"tool": name, "input": tool_input, "summary": str(e), "error": True})
            return str(e), True

    # ---- tools -----------------------------------------------------------
    def _search_documents(self, tool_input: dict) -> tuple[str, str]:
        query = str(tool_input.get("query", "")).strip()
        if not query:
            raise QueryError("Empty query.")
        chunks = retrieval_service.retrieve(query)
        if not chunks:
            return "No results.", "0 results"
        blocks = []
        for chunk in chunks:
            ref = self._chunk_refs.get(chunk["id"])
            if ref is None:
                ref = self._new_ref(llm_service.chunk_source(0, chunk))
                self._chunk_refs[chunk["id"]] = ref
            where = llm_service.chunk_location(chunk)
            hint = (
                "\n(Spreadsheet description. To read or calculate from it, use list_tables and run_sql.)"
                if chunk.get("sheet_name")
                else ""
            )
            blocks.append(f"[{ref}] ({chunk['filename']}, {where}){hint}\n{chunk['content']}")
        return "\n\n".join(blocks), f"{len(chunks)} results"

    def _list_tables(self, _: dict) -> tuple[str, str]:
        tables = self.engine().tables
        if not tables:
            return "There are no spreadsheet tables.", "0 tables"
        lines = [
            f"{t.name} | file: {t.filename} | sheet: {t.sheet} | {len(t.df)} rows | "
            f"columns: {', '.join(t.df.columns)}"
            for t in tables.values()
        ]
        return "\n".join(lines), f"{len(tables)} tables"

    def _describe_table(self, tool_input: dict) -> tuple[str, str]:
        name = str(tool_input.get("table", "")).strip()
        table = self.engine().tables.get(name)
        if table is None:
            known = ", ".join(self.engine().tables) or "none"
            raise QueryError(f"Unknown table '{name}'. Available tables: {known}")
        df = table.df
        columns = "\n".join(f"- {c}: {_sql_type(df[c])}" for c in df.columns)
        sample = "\n".join(
            json.dumps([spreadsheet_service.jsonable(v) for v in row], ensure_ascii=False)
            for row in df.head(3).itertuples(index=False)
        )
        text = f"Table {name} ({len(df)} rows)\nColumns:\n{columns}\nSample rows (in column order):\n{sample}"
        return text, name

    def _run_sql(self, tool_input: dict) -> tuple[str, str]:
        engine = self.engine()
        sql = str(tool_input.get("query", ""))
        result = engine.run(sql)  # raises QueryError with a message the model can act on

        refs = [self._sheet_ref(t, sql) for t in engine.tables_used(sql)]
        header = f"Sources: {''.join(f'[{r}]' for r in refs)}\n" if refs else ""
        lines = [" | ".join(result.columns)]
        lines += [json.dumps(row, ensure_ascii=False) for row in result.rows]
        if not result.rows:
            lines.append("(no rows)")
        if result.truncated:
            lines.append(f"(truncated: only the first {get_settings().sql_max_rows} rows are shown; aggregate or filter)")
        summary = f"{len(result.rows)} row(s)" + (" (truncated)" if result.truncated else "")
        return header + "\n".join(lines), summary

    def _sheet_ref(self, table: TableInfo, sql: str) -> int:
        key = (table.document_id, table.sheet, " ".join(sql.split()))
        ref = self._sheet_refs.get(key)
        if ref is None:
            ref = self._new_ref(
                {
                    "document_id": table.document_id,
                    "filename": table.filename,
                    "kind": "sheet",
                    "page_start": None,
                    "page_end": None,
                    "sheet_name": table.sheet,
                    "sql": " ".join(sql.split()),
                }
            )
            self._sheet_refs[key] = ref
        return ref


def _sql_type(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_integer_dtype(series):
        return "integer"
    if pd.api.types.is_numeric_dtype(series):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    return "text"
