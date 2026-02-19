import requests
import json

def llm_response(texto_pdf: str, prompt_usuario: str):
    prompt_final = f"""
Você é um assistente que extrai informações de documentos.

TEXTO DO DOCUMENTO:
{texto_pdf}

PERGUNTA DO USUÁRIO:
{prompt_usuario}

Responda SOMENTE com base no texto fornecido.
Não invente informações.
Se não encontrar, diga exatamente: "Informação não encontrada no documento."
"""
   
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "phi3:latest",
            "prompt": prompt_final,
            "stream": False  # 👈 DESLIGA O STREAM
        },
        timeout=60
    )

    response.raise_for_status()  # já lança erro se não for 200

    return response.json().get("response", "").strip()
