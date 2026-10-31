import io

import pdfplumber


def extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        texto = ""
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                texto += t + "\n"
    return " ".join(texto.split())
