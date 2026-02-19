from fastapi import FastAPI, UploadFile, HTTPException, File
import pdfplumber
from app.schema import Prompt
from app.llm import llm_response


app = FastAPI()

texto_pdf = ""


@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="O arquivo deveria ser um pdf")
    
    global texto_pdf
    

    with pdfplumber.open(file.file) as pdf:
        texto_pdf = ""
        for page in pdf.pages:
            texto = page.extract_text()
            if texto:
                texto_pdf += texto + "\n"
    texto_pdf = " ".join(texto_pdf.split())


    return {"filename": file.filename,
            "texto": texto_pdf
            }



@app.post("/client_prompt")
async def client_prompt(data: Prompt):
    if not texto_pdf:
        return {"Erro": "Nenhum pdf foi enviado"}

    resposta = llm_response(texto_pdf, data.prompt)

    return {"resposta": resposta}

