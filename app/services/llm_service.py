import requests

from app.core.config import get_settings
from app.services.pdf_service import extract_text

SYSTEM_PROMPT = """Você é um assistente que extrai informações de documentos.
Responda SOMENTE com base no texto do documento fornecido.
Não invente informações.
Se não encontrar, diga exatamente: "Informação não encontrada no documento."
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


def ask_question(pdf_bytes: bytes, prompt: str) -> str:
    settings = get_settings()
    texto = extract_text(pdf_bytes)
    try:
        response = requests.post(
            f"{settings.openrouter_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            json={
                "model": settings.openrouter_model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"TEXTO DO DOCUMENTO:\n{texto}\n\nPERGUNTA DO USUÁRIO:\n{prompt}",
                    },
                ],
            },
            timeout=settings.llm_timeout_seconds,
        )
        response.raise_for_status()
    except requests.Timeout as e:
        raise LLMTimeoutError from e
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else None
        if status == 429:
            raise LLMRateLimitError from e
        if status in (401, 402):
            raise LLMAuthError from e
        raise LLMUnavailableError from e
    except requests.RequestException as e:
        raise LLMUnavailableError from e
    choices = response.json().get("choices") or []
    if not choices:
        return ""
    return (choices[0]["message"].get("content") or "").strip()
