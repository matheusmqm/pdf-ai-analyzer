"""Reads Excel (.xlsx) and CSV files into tables and builds the "sheet cards".

A card is a short text describing one sheet (columns, types, ranges, sample rows).
Cards are embedded like PDF chunks, so the search can tell which spreadsheet is
relevant to a question. The rows themselves are NOT embedded: numbers are computed
by SQL (see query_engine), never guessed by the model from text.
"""

import io
import math
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

import pandas as pd

SPREADSHEET_TYPES = {"xlsx", "csv"}
MAX_CARD_CHARS = 3500
_SAMPLE_ROWS = 5
_MAX_CELL_CHARS = 40
_MAX_COLUMNS_IN_CARD = 60
_COERCE_THRESHOLD = 0.9  # share of non-empty values that must convert

_BR_NUMBER = re.compile(r"^-?\d{1,3}(\.\d{3})+(,\d+)?$|^-?\d+,\d+$")
_BR_DATE = re.compile(r"^\d{2}/\d{2}/\d{4}$")


class SpreadsheetError(Exception):
    """The file could not be read as a spreadsheet (message is user-facing)."""


@dataclass
class Table:
    sheet: str  # sheet name (CSV: the file name without extension)
    df: pd.DataFrame  # columns already normalized (snake_case, unique)


def _slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", str(text))
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def table_name(filename: str, sheet: str, file_type: str) -> str:
    """SQL-friendly table name, e.g. vendas_2025.xlsx + Janeiro -> vendas_2025_janeiro."""
    stem = _slug(filename.rsplit(".", 1)[0]) or "planilha"
    if file_type == "csv":
        name = stem
    else:
        name = f"{stem}_{_slug(sheet)}".strip("_")
    if name[0].isdigit():
        name = f"t_{name}"
    return name


def _normalize_columns(columns: list) -> list[str]:
    result: list[str] = []
    seen: dict[str, int] = {}
    for i, col in enumerate(columns):
        name = _slug(col)
        if not name or name.startswith("unnamed"):
            name = f"col_{i + 1}"
        if name[0].isdigit():
            name = f"c_{name}"
        count = seen.get(name, 0) + 1
        seen[name] = count
        result.append(name if count == 1 else f"{name}_{count}")
    return result


def _is_text(series: pd.Series) -> bool:
    return pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series)


def _coerce(series: pd.Series) -> pd.Series:
    """Text columns that hold Brazilian numbers or dates become numeric / datetime."""
    if not _is_text(series):
        return series
    values = series.dropna().astype(str).str.strip()
    values = values[values != ""]
    if values.empty:
        return series
    cleaned = values.str.replace(r"^R\$\s*", "", regex=True)

    if (cleaned.str.match(_BR_DATE)).mean() >= _COERCE_THRESHOLD:
        parsed = pd.to_datetime(
            series.astype("string").str.strip(), format="%d/%m/%Y", errors="coerce"
        )
        return parsed

    if (cleaned.str.match(_BR_NUMBER)).mean() >= _COERCE_THRESHOLD:
        text = (
            series.astype("string")
            .str.strip()
            .str.replace(r"^R\$\s*", "", regex=True)
            .str.replace(".", "", regex=False)
            .str.replace(",", ".", regex=False)
        )
        return pd.to_numeric(text, errors="coerce")

    numeric = pd.to_numeric(values, errors="coerce")
    if numeric.notna().mean() >= _COERCE_THRESHOLD:
        return pd.to_numeric(series, errors="coerce")
    return series


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(how="all").dropna(axis=1, how="all").reset_index(drop=True)
    df.columns = _normalize_columns(list(df.columns))
    for col in df.columns:
        df[col] = _coerce(df[col])
    return df


def _read_csv(data: bytes) -> pd.DataFrame:
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            text = data.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    return pd.read_csv(io.StringIO(text), sep=None, engine="python")


def parse(data: bytes, file_type: str, filename: str) -> list[Table]:
    """Returns one Table per non-empty sheet. Raises SpreadsheetError."""
    try:
        if file_type == "csv":
            raw = {filename.rsplit(".", 1)[0]: _read_csv(data)}
        else:
            raw = pd.read_excel(io.BytesIO(data), sheet_name=None, engine="openpyxl")
    except Exception as e:
        raise SpreadsheetError(
            "Could not read the spreadsheet. Is the file corrupted or password-protected?"
        ) from e

    tables = []
    for sheet, df in raw.items():
        df = _clean(df)
        if df.empty or len(df.columns) == 0:
            continue
        tables.append(Table(sheet=str(sheet), df=df))
    if not tables:
        raise SpreadsheetError("The spreadsheet has no data (all sheets are empty).")
    return tables


def jsonable(value):
    """Converts a cell to something JSON-serializable (NaN/NaT -> None)."""
    if value is None or value is pd.NaT:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat() if value == value.normalize() else value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "item"):  # numpy scalar
        return jsonable(value.item())
    if isinstance(value, (int, float, str, bool)):
        return value
    return str(value)


def _column_description(name: str, series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return f"{name} (boolean)"
    if pd.api.types.is_numeric_dtype(series):
        s = series.dropna()
        if s.empty:
            return f"{name} (number, empty)"
        return f"{name} (number, min {s.min():g}, max {s.max():g}, sum {s.sum():,.2f})"
    if pd.api.types.is_datetime64_any_dtype(series):
        s = series.dropna()
        if s.empty:
            return f"{name} (date, empty)"
        return f"{name} (date, {jsonable(s.min())} to {jsonable(s.max())})"
    s = series.dropna().astype(str)
    distinct = s.nunique()
    if distinct <= 8:
        values = ", ".join(sorted(s.unique())[:8])
        return f"{name} (text, values: {values})"
    return f"{name} (text, {distinct} distinct values)"


def _cell(value) -> str:
    text = str(jsonable(value))
    return text if len(text) <= _MAX_CELL_CHARS else text[: _MAX_CELL_CHARS - 1] + "…"


def build_card(filename: str, table: Table) -> str:
    df = table.df
    columns = list(df.columns)[:_MAX_COLUMNS_IN_CARD]
    lines = [
        f"Spreadsheet: {filename} | Sheet: {table.sheet} | {len(df)} rows, {len(df.columns)} columns",
        "Columns: " + "; ".join(_column_description(c, df[c]) for c in columns),
        "Sample rows:",
    ]
    for _, row in df.head(_SAMPLE_ROWS).iterrows():
        lines.append("- " + "; ".join(f"{c}={_cell(row[c])}" for c in columns))
    return "\n".join(lines)[:MAX_CARD_CHARS]


def preview(data: bytes, file_type: str, filename: str, max_rows: int = 100) -> list[dict]:
    result = []
    for table in parse(data, file_type, filename):
        head = table.df.head(max_rows)
        result.append(
            {
                "name": table.sheet,
                "columns": list(table.df.columns),
                "rows": [[jsonable(v) for v in row] for row in head.itertuples(index=False)],
                "total_rows": len(table.df),
            }
        )
    return result
