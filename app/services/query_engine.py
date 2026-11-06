"""Read-only SQL sandbox over the spreadsheets, backed by DuckDB (in memory).

Each sheet is registered as a table. The model writes SQL, DuckDB computes the
numbers exactly. The sandbox is locked down:
- the connection has no access to files or the network and its settings are locked;
- only a single SELECT statement is accepted (no DDL/DML, no multiple statements);
- the result is capped (rows) and the query is interrupted after a timeout.
Nothing is persisted: the connection lives only for the duration of one question.
"""

import re
import threading
from dataclasses import dataclass

import duckdb
import pandas as pd

from app.core.config import get_settings
from app.services.spreadsheet_service import jsonable


class QueryError(Exception):
    """User-facing (model-facing) message explaining why the query was rejected."""


@dataclass
class TableInfo:
    name: str  # SQL table name
    document_id: str
    filename: str
    sheet: str
    df: pd.DataFrame


@dataclass
class QueryResult:
    columns: list[str]
    rows: list[list]
    truncated: bool


class QueryEngine:
    def __init__(self, tables: list[TableInfo]):
        self.tables = {t.name: t for t in tables}
        self._con = duckdb.connect(":memory:")
        for table in tables:
            self._con.register(table.name, table.df)
        # Lock everything down only after the tables are registered.
        self._con.execute("SET autoload_known_extensions=false")
        self._con.execute("SET autoinstall_known_extensions=false")
        self._con.execute("SET enable_external_access=false")
        self._con.execute("SET lock_configuration=true")

    def close(self) -> None:
        self._con.close()

    def validate(self, sql: str) -> str:
        sql = (sql or "").strip().rstrip(";").strip()
        if not sql:
            raise QueryError("Empty query.")
        try:
            statements = self._con.extract_statements(sql)
        except duckdb.Error as e:
            raise QueryError(f"Invalid SQL: {_short(e)}") from e
        if len(statements) != 1:
            raise QueryError("Send exactly one SQL statement.")
        if statements[0].type != duckdb.StatementType.SELECT:
            raise QueryError("Only read-only SELECT queries are allowed.")
        return sql

    def run(self, sql: str) -> QueryResult:
        sql = self.validate(sql)
        settings = get_settings()
        timer = threading.Timer(settings.sql_timeout_seconds, self._con.interrupt)
        timer.start()
        try:
            cursor = self._con.execute(sql)
            columns = [d[0] for d in cursor.description]
            fetched = cursor.fetchmany(settings.sql_max_rows + 1)
        except duckdb.Error as e:
            if "INTERRUPT" in str(e).upper():
                raise QueryError(
                    f"The query took longer than {settings.sql_timeout_seconds}s and was stopped."
                ) from e
            raise QueryError(f"SQL error: {_short(e)}") from e
        finally:
            timer.cancel()
        truncated = len(fetched) > settings.sql_max_rows
        rows = [[jsonable(v) for v in row] for row in fetched[: settings.sql_max_rows]]
        return QueryResult(columns=columns, rows=rows, truncated=truncated)

    def tables_used(self, sql: str) -> list[TableInfo]:
        """Known tables mentioned in the query (used to cite sources)."""
        lowered = sql.lower()
        return [
            t
            for name, t in self.tables.items()
            if re.search(rf"\b{re.escape(name)}\b", lowered)
        ]


def _short(e: Exception) -> str:
    return " ".join(str(e).split())[:300]
