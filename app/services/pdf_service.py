import io

import pdfplumber


def extract_pages(pdf_bytes: bytes) -> list[tuple[int, str]]:
    """Text of each page (numbered from 1). Pages without text are omitted."""
    pages: list[tuple[int, str]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for number, page in enumerate(pdf.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                pages.append((number, text))
    return pages


def count_pages(pdf_bytes: bytes) -> int:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return len(pdf.pages)
