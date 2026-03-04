import pdfplumber
import requests
import io

def extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        texto = ""
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                texto += t + "\n"
    return " ".join(texto.split())

def ask_question(pdf_bytes: bytes, prompt: str) -> str:
    texto = extract_text(pdf_bytes)
    prompt_final = f"""
Você é um assistente que extrai informações de documentos.
TEXTO DO DOCUMENTO:
{texto}
PERGUNTA DO USUÁRIO:
{prompt}
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
    response.raise_for_status()
    return response.json().get("response", "").strip()