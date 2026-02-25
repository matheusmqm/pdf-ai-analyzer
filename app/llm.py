import requests

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
        "http://ollama:11434/api/generate",
        json={
            "model": "phi3:latest",
            "prompt": prompt_final,
            "stream": False 
        },
        timeout=60
    )

    print("Status:", response.status_code)
    print("Body:", response.text)

    response.raise_for_status()  
    return response.json().get("response", "").strip()
