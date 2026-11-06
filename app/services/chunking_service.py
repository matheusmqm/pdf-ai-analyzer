"""Splits text by page/paragraph into overlapping chunks, keeping the page numbers."""

import re
from dataclasses import dataclass

CHARS_PER_TOKEN = 4


@dataclass
class Chunk:
    index: int
    page_start: int | None
    page_end: int | None
    content: str
    sheet_name: str | None = None  # spreadsheet cards have a sheet, not pages


def _segments(pages: list[tuple[int, str]], max_chars: int) -> list[tuple[int, str]]:
    """Paragraphs (or sentences / windows, if too large) with their source page."""
    result: list[tuple[int, str]] = []
    for page, text in pages:
        for paragraph in re.split(r"\n\s*\n", text):
            paragraph = " ".join(paragraph.split())
            if not paragraph:
                continue
            if len(paragraph) <= max_chars:
                result.append((page, paragraph))
                continue
            for sentence in re.split(r"(?<=[.!?])\s+", paragraph):
                for start in range(0, len(sentence), max_chars):
                    piece = sentence[start : start + max_chars].strip()
                    if piece:
                        result.append((page, piece))
    return result


def chunk_pages(
    pages: list[tuple[int, str]], chunk_size: int, chunk_overlap: int
) -> list[Chunk]:
    max_chars = max(chunk_size * CHARS_PER_TOKEN, 200)
    overlap_chars = min(chunk_overlap * CHARS_PER_TOKEN, max_chars // 2)

    chunks: list[Chunk] = []
    current: list[tuple[int, str]] = []
    size = 0
    fresh = 0  # new segments in `current` (excluding the inherited overlap)

    def flush() -> None:
        chunks.append(
            Chunk(
                index=len(chunks),
                page_start=current[0][0],
                page_end=current[-1][0],
                content="\n".join(text for _, text in current),
            )
        )

    for segment in _segments(pages, max_chars):
        if current and size + len(segment[1]) + 1 > max_chars:
            flush()
            # Overlap: reuse the last segments up to ~overlap_chars.
            tail: list[tuple[int, str]] = []
            tail_size = 0
            for item in reversed(current):
                if tail_size + len(item[1]) > overlap_chars:
                    break
                tail.insert(0, item)
                tail_size += len(item[1]) + 1
            current, size, fresh = tail, tail_size, 0
        current.append(segment)
        size += len(segment[1]) + 1
        fresh += 1

    if fresh:
        flush()
    return chunks
