# SecondMind

Envie PDFs e faça perguntas sobre cada um deles. Projeto pessoal e open source:

- **Um único usuário**, sem cadastro, login ou e-mail.
- Vários PDFs, sem relação entre eles: você abre um PDF e conversa com ele.
- As respostas vêm do **Claude** ([API da Anthropic](https://docs.anthropic.com)): o texto do PDF vai junto com a pergunta (uma chamada por pergunta). Não há busca vetorial, agente nem fila de processamento.
- O **Supabase** guarda a lista de PDFs (Postgres) e os arquivos (Storage).

> **Sem autenticação:** qualquer um que alcance a API pode usá-la. Ela sobe em `127.0.0.1`; não a exponha na internet.

## Requisitos

- [uv](https://docs.astral.sh/uv/) (o Python 3.13 é instalado por ele) e Node.js
- Um projeto no [Supabase](https://supabase.com)
- Uma chave da [API da Anthropic](https://console.anthropic.com/settings/keys) com crédito

## Estrutura

```
main.py                    # sobe o uvicorn (127.0.0.1:8000, com reload)
schema.sql                 # tabela documents + bucket pdfs (idempotente)
app/
  main.py                  # FastAPI + CORS
  routes/                  # declaram os endpoints e delegam ao controller
  controllers/             # regras e tradução de erros para HTTP
  models/                  # formatos de entrada/saída (pydantic)
  services/
    document_service.py    # tabela documents (Supabase)
    storage_service.py     # PDFs no Storage (upload, download, link assinado, remover)
    pdf_service.py         # extrai o texto do PDF (pdfplumber)
    llm_service.py         # pergunta ao Claude
  core/config.py           # variáveis de ambiente
  db/client.py             # cliente Supabase (service role)
frontend/                  # React + Vite com a identidade SecondMind
```

Fluxo: `Route -> Controller -> Service`.

## Rodando

1. No Supabase, abra o *SQL Editor*, cole o conteúdo de `schema.sql` e execute. Isso cria a tabela `documents` (com RLS ligado e sem políticas, já que só o backend acessa) e o bucket privado `pdfs`.
2. `cp .env.example .env` e preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (*Project Settings > API*; só no backend) e `ANTHROPIC_API_KEY`.
3. Backend: `uv sync && uv run python main.py` (docs em http://localhost:8000/docs).
4. Frontend: `cd frontend && npm install && npm run dev` (http://localhost:5173). Se a API estiver em outro endereço, copie `frontend/.env.example` para `frontend/.env` e ajuste `VITE_API_URL`.

A porta do frontend é fixa (`strictPort`) porque o backend libera só essa origem no CORS (`FRONTEND_URL`). Se mudar uma, mude a outra.

### Variáveis de ambiente (`.env`)

| Variável | Padrão | O que faz |
|---|---|---|
| `SUPABASE_URL` | — | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Chave service role (nunca no frontend) |
| `SUPABASE_STORAGE_BUCKET` | `pdfs` | Bucket dos PDFs |
| `FRONTEND_URL` | `http://localhost:5173` | Origem liberada no CORS |
| `ANTHROPIC_API_KEY` | — | Chave da API do Claude |
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | Modelo usado nas respostas |
| `ANTHROPIC_EFFORT` | `low` | `low`, `medium` ou `high` (menos = mais rápido e barato) |
| `MAX_OUTPUT_TOKENS` | `2048` | Limite de tokens da resposta |
| `LLM_TIMEOUT_SECONDS` | `120` | Tempo máximo esperando o modelo |
| `MAX_UPLOAD_MB` | `20` | Tamanho máximo do PDF |
| `DOWNLOAD_URL_EXPIRES_SECONDS` | `300` | Validade do link de download/visualização |

O limite de 20 MB também está no bucket em `schema.sql`; se aumentar `MAX_UPLOAD_MB`, ajuste o bucket.

## API

| Endpoint | O que faz |
|---|---|
| `POST /documents/upload` | Envia um PDF (multipart, campo `file`, até `MAX_UPLOAD_MB`) |
| `GET /documents/` | Lista os PDFs |
| `GET /documents/{id}/download` | `{url, filename}`: link temporário que baixa o PDF; com `?inline=true`, para visualizar |
| `POST /documents/ask` | `{document_id, prompt}` → `{resposta}`. Responde só com o texto do PDF |
| `DELETE /documents/{id}` | Apaga o registro e o arquivo (204) |

Erros do upload: arquivo que não é PDF → 400, acima do limite → 413. Documento inexistente → 404.
Erros do modelo: timeout → 504, limite de uso → 429, chave/crédito inválido → 502, PDF sem texto (escaneado) → 422.

## Frontend

React + Vite, Axios, Tailwind v4, React Router e TanStack Query, com a identidade **SecondMind** (o "caderno de brainstorming": papel, tinta, caneta azul e marca-texto; temas *Papel* e *Noite*).

- `/` — seus PDFs: envio de vários de uma vez (arrastar ou escolher), busca por nome, baixar e apagar.
- `/documents/:id` — o PDF ao lado da conversa sobre ele.

O histórico das conversas e o tema ficam no navegador (`localStorage`); o backend não guarda nada disso.
