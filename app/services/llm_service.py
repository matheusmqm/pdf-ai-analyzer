"""Pergunta sobre um PDF usando o Claude (API da Anthropic).

O texto inteiro do PDF vai na mensagem, junto com a pergunta. É a única chamada ao
Claude do projeto: uma pergunta = uma chamada.
"""

import anthropic

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


class EmptyDocumentError(Exception):
    """O PDF não tem texto extraível (ex.: escaneado)."""


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
        # Crédito esgotado vem como 400 "credit balance is too low".
        if e.status_code == 400 and "credit balance" in str(e.message).lower():
            return LLMAuthError()
        return LLMUnavailableError()
    return LLMUnavailableError()  # APIConnectionError e demais


def ask_question(pdf_bytes: bytes, prompt: str) -> str:
    settings = get_settings()
    texto = extract_text(pdf_bytes)
    if not texto:
        raise EmptyDocumentError
    try:
        # Sem `thinking`, `temperature` ou `top_p`: os modelos 5.5 rejeitam (400).
        response = _get_client().messages.create(
            model=settings.anthropic_model,
            max_tokens=settings.max_output_tokens,
            system=SYSTEM_PROMPT,
            output_config={"effort": settings.anthropic_effort},
            messages=[
                {
                    "role": "user",
                    "content": [
                        # O documento vai num bloco próprio com cache: perguntas
                        # seguidas sobre o mesmo PDF reaproveitam o prefixo.
                        {
                            "type": "text",
                            "text": f"TEXTO DO DOCUMENTO:\n{texto}",
                            "cache_control": {"type": "ephemeral"},
                        },
                        {"type": "text", "text": f"PERGUNTA DO USUÁRIO:\n{prompt}"},
                    ],
                }
            ],
        )
    except anthropic.AnthropicError as e:
        raise _map_error(e) from e
    return "".join(b.text for b in response.content if b.type == "text").strip()
