"""Answers questions about the PDF base using Claude (Anthropic API).

Only the retrieved chunks (RAG) go in the message, along with the question. This is
the project's only call to Claude: one question = one call.
"""

import re

import anthropic

from app.core.config import get_settings

NOT_FOUND = "Information not found in the documents."

SYSTEM_PROMPT = f"""You are an assistant that answers questions about a base of PDF documents.
You receive numbered excerpts in the format [n] (file, page).
Answer ONLY from those excerpts. Do not make anything up.
Cite the source of each piece of information with the excerpt number in square brackets, e.g. [1] or [2][3].
Answer in the same language as the user's question.
If the excerpts do not contain the answer, say exactly: "{NOT_FOUND}"
"""


class LLMError(Exception):
    pass


class LLMTimeoutError(LLMError):
    pass


class LLMRateLimitError(LLMError):
    pass


class LLMAuthError(LLMError):
    pass


class LLMUnavailableError(LLMError):
    pass


_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        settings = get_settings()
        _client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key.get_secret_value(),
            timeout=settings.llm_timeout_seconds,
        )
    return _client


def _map_error(e: Exception) -> LLMError:
    if isinstance(e, anthropic.APITimeoutError):
        return LLMTimeoutError()
    if isinstance(e, anthropic.RateLimitError):
        return LLMRateLimitError()
    if isinstance(e, (anthropic.AuthenticationError, anthropic.PermissionDeniedError)):
        return LLMAuthError()
    if isinstance(e, anthropic.APIStatusError):
        # Exhausted credit comes as a 400 "credit balance is too low".
        if e.status_code == 400 and "credit balance" in str(e.message).lower():
            return LLMAuthError()
        return LLMUnavailableError()
    return LLMUnavailableError()  # APIConnectionError e demais


def _pages(chunk: dict) -> str:
    start, end = chunk["page_start"], chunk["page_end"]
    return f"p. {start}" if start == end else f"pp. {start}-{end}"


def _context(chunks: list[dict]) -> str:
    return "\n\n".join(
        f"[{n}] ({c['filename']}, {_pages(c)})\n{c['content']}"
        for n, c in enumerate(chunks, start=1)
    )


def _sources(answer: str, chunks: list[dict]) -> list[dict]:
    if NOT_FOUND in answer:
        return []
    cited = {int(n) for n in re.findall(r"\[(\d+)\]", answer)}
    selected = [n for n in range(1, len(chunks) + 1) if n in cited] or list(
        range(1, len(chunks) + 1)
    )
    return [
        {
            "ref": n,
            "document_id": chunks[n - 1]["document_id"],
            "filename": chunks[n - 1]["filename"],
            "page_start": chunks[n - 1]["page_start"],
            "page_end": chunks[n - 1]["page_end"],
        }
        for n in selected
    ]


def ask_question(prompt: str, chunks: list[dict]) -> tuple[str, list[dict]]:
    """Returns (answer, sources). With no chunks, the model is not even called."""
    if not chunks:
        return NOT_FOUND, []
    settings = get_settings()
    try:
        # No `thinking`, `temperature` or `top_p`: the 5.5 models reject them (400).
        response = _get_client().messages.create(
            model=settings.anthropic_model,
            max_tokens=settings.max_output_tokens,
            system=SYSTEM_PROMPT,
            output_config={"effort": settings.anthropic_effort},
            messages=[
                {
                    "role": "user",
                    "content": f"EXCERPTS:\n{_context(chunks)}\n\nUSER QUESTION:\n{prompt}",
                }
            ],
        )
    except anthropic.AnthropicError as e:
        raise _map_error(e) from e
    answer = "".join(b.text for b in response.content if b.type == "text").strip()
    return answer, _sources(answer, chunks)
