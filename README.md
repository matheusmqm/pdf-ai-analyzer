# SecondMind

**Upload PDFs and ask questions about your whole library at once.** Answers come from your own documents and cite the file and page they came from.

![Python](https://img.shields.io/badge/python-3.13-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-bge--m3-000000)
![Claude](https://img.shields.io/badge/Claude-Anthropic_API-D97757)

<p align="center">
  <img src="docs/screenshots/library-light.png" alt="SecondMind, Paper (light) theme" width="49%" />
  <img src="docs/screenshots/library-dark.png" alt="SecondMind, Night (dark) theme" width="49%" />
</p>
<p align="center"><sub>The Paper and Night themes. Screenshots use sample data.</sub></p>

A personal, open source project:

- **Single user**: no sign-up, login or email.
- **One knowledge base**: every uploaded PDF feeds it.
- **RAG**: on upload, each PDF is split into chunks (keeping the source page) and embedded locally with **Ollama**. When you ask a question, the closest chunks (vector search) are sent to **Claude** ([Anthropic API](https://docs.anthropic.com)), which answers citing file and page.
- **Supabase** stores the PDF list and the vectors (Postgres + pgvector) and the files (Storage).
- Ingestion runs in the background (`BackgroundTasks`); a PDF is `pending`, `processing`, `ready` or `failed`. There is no OCR: a PDF without text becomes `failed`.

> **No authentication:** anyone who can reach the API can use it. It binds to `127.0.0.1`; do not expose it to the internet.

## How it works

**Ingestion** (on upload, in the background):

```mermaid
flowchart LR
    U[Upload PDF] --> S[(Supabase Storage)]
    S --> P[Extract text per page<br/>pdfplumber]
    P --> C[Chunk with overlap<br/>keep page numbers]
    C --> E[Embed<br/>Ollama bge-m3]
    E --> V[(Supabase pgvector<br/>chunks)]
```

**Asking a question**:

```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as FastAPI
    participant O as Ollama
    participant DB as pgvector
    participant C as Claude
    UI->>API: POST /ask {prompt}
    API->>O: embed(question)
    O-->>API: vector
    API->>DB: match_chunks(vector, top_k)
    DB-->>API: closest chunks + file/page
    API->>C: question + numbered excerpts
    C-->>API: answer citing [n]
    API-->>UI: {answer, sources[]}
```

## Excel and CSV (agent)

Besides PDFs you can upload `.xlsx` and `.csv` files, and ask questions that cross both.

- **Why an agent:** a spreadsheet is numbers, not text. Cutting it into chunks makes the model guess sums and averages. Instead, Claude gets tools and calculates for real.
- **Ingestion:** each sheet becomes a short "card" (columns, types, ranges, sample rows) that is embedded like a PDF chunk, so the search can find the right spreadsheet. The rows are not embedded.
- **Routing (when the agent runs):** the agent is more expensive than a plain RAG answer, so a spreadsheet is only used when it is clearly related to the question. On each question (`retrieval_service.retrieve_routed`), one embedding feeds two searches: the normal top-k chunks and the `SHEET_TOP_K` closest sheet cards on their own (so a card is not crowded out by the many PDF chunks). A spreadsheet is relevant only if one of its cards has cosine similarity of at least `SHEET_MIN_SIMILARITY` with the question, in either search.
  - Relevant spreadsheet found: agent, limited to those spreadsheets.
  - None reaches the threshold: spreadsheets are discarded and the question is answered from the PDFs only (search + one call to Claude). There is no fallback to the agent, even if the answer is "not found".
  - The first step of the answer's `trace` says why the agent was called.
- **Question:** `POST /ask` runs the agent loop (`app/services/agent_service.py`). Claude calls these tools until it can answer:
  - `search_documents`: the same vector search as before (PDF excerpts and sheet cards)
  - `list_tables` / `describe_table`: the spreadsheet tables (one per sheet) and their columns
  - `run_sql`: one read-only `SELECT` over the tables, executed by **DuckDB** in memory
- **Safety:** the SQL sandbox (`app/services/query_engine.py`) accepts a single `SELECT`, has no file or network access, caps rows and stops slow queries. Nothing is persisted; there is no cache, the sheets are loaded from Storage for each question that needs them. Cell text is treated as data, not instructions.
- **Cost:** a PDF-only question is one call to Claude. With a relevant spreadsheet, each question takes several calls (one per tool step, up to `MAX_AGENT_STEPS`). The answer returns `trace` (the steps and SQL used) and `usage` (calls, tokens, estimated cost), and the chat shows them.
- **Limits:** the header must be in the first row of each sheet; formulas are read as their last saved value; old `.xls` is not supported. Column names are normalized (lowercase, no accents, `_`) so they can be used in SQL.

## Requirements

- [uv](https://docs.astral.sh/uv/) (it installs Python 3.13) and Node.js 20.19+ (or 22.12+)
- A [Supabase](https://supabase.com) project
- [Ollama](https://ollama.com) installed, with the embedding model: `ollama pull bge-m3`
- An [Anthropic API](https://console.anthropic.com/settings/keys) key with credit

## Project structure

```
main.py                    # starts uvicorn (127.0.0.1:8000, with reload)
schema.sql                 # documents, chunks (pgvector), match_chunks and the pdfs bucket (idempotent)
app/
  main.py                  # FastAPI + CORS
  routes/                  # declare the endpoints and delegate to the controller
  controllers/             # business rules and error-to-HTTP translation
  models/                  # input/output shapes (pydantic)
  services/
    document_service.py    # documents table (Supabase)
    storage_service.py     # PDFs in Storage (upload, download, signed link, remove)
    pdf_service.py         # extracts text per page (pdfplumber)
    chunking_service.py    # splits into overlapping chunks, keeping the pages
    embedding_service.py   # embeddings via Ollama (/api/embed)
    ingestion_service.py   # extract -> chunk -> embed -> store (background)
    retrieval_service.py   # embeds the question and fetches the top-k chunks
    llm_service.py         # asks Claude with the chunks and returns the sources
  core/config.py           # environment variables
  db/client.py             # Supabase client (service role)
  db/vector_store.py       # chunk inserts and the match_chunks RPC
frontend/                  # React + Vite with the SecondMind identity
docs/screenshots/          # images used in this README
```

Flow: `Route -> Controller -> Service`.

## Running

1. In Supabase, open the *SQL Editor*, paste the contents of `schema.sql` and run it. It creates `documents`, `chunks` (pgvector), the `match_chunks` function (with RLS on and no policies, since only the backend accesses them) and the private `pdfs` bucket (which also accepts `.xlsx` and `.csv`). The script is idempotent: running it again on an existing database applies the Excel/CSV changes. PDFs uploaded before RAG existed have no chunks: delete and re-upload them.
2. `cp .env.example .env` and fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (*Project Settings > API*; backend only) and `ANTHROPIC_API_KEY`.
3. Backend: `uv sync && uv run python main.py` (docs at http://localhost:8000/docs).
4. Frontend: `cd frontend && npm install && npm run dev` (http://localhost:5173). If the API is at another address, copy `frontend/.env.example` to `frontend/.env` and adjust `VITE_API_URL`.

The frontend port is fixed (`strictPort`) because the backend only allows that origin in CORS (`FRONTEND_URL`). If you change one, change the other.

### Environment variables (`.env`)

| Variable | Default | What it does |
|---|---|---|
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role key (never in the frontend) |
| `SUPABASE_STORAGE_BUCKET` | `pdfs` | PDF bucket |
| `FRONTEND_URL` | `http://localhost:5173` | Origin allowed by CORS |
| `ANTHROPIC_API_KEY` | — | Claude API key |
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | Model used for answers |
| `ANTHROPIC_EFFORT` | `low` | `low`, `medium` or `high` (lower = faster and cheaper) |
| `MAX_OUTPUT_TOKENS` | `2048` | Answer token limit |
| `LLM_TIMEOUT_SECONDS` | `120` | Maximum time waiting for the model |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama address |
| `EMBEDDING_MODEL` | `bge-m3` | Embedding model (multilingual) |
| `EMBEDDING_DIM` | `1024` | Vector size; must match `vector(N)` in `schema.sql` |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `600` / `80` | Chunk size and overlap (approximate tokens) |
| `TOP_K` | `8` | Chunks sent to Claude per question |
| `MAX_UPLOAD_MB` | `20` | Maximum file size |
| `MAX_AGENT_STEPS` | `6` | Maximum calls to the model per question when spreadsheets are involved |
| `SHEET_TOP_K` | `3` | How many sheet cards are searched on their own to decide if the agent is needed |
| `SHEET_MIN_SIMILARITY` | `0.45` | Minimum cosine similarity for a card to count as relevant; raise it to use the agent less, lower it to use it more |
| `SQL_MAX_ROWS` | `50` | Rows returned to the model by one SQL query |
| `SQL_TIMEOUT_SECONDS` | `15` | A SQL query running longer is stopped |
| `PRICE_INPUT_PER_MTOK` / `PRICE_OUTPUT_PER_MTOK` | `0.10` / `0.50` | USD per million tokens, only to show the estimated cost (defaults are Haiku 5.5) |
| `DOWNLOAD_URL_EXPIRES_SECONDS` | `300` | Lifetime of the download/view link |

The 20 MB limit is also set on the bucket in `schema.sql`; if you raise `MAX_UPLOAD_MB`, adjust the bucket too.

## API

| Endpoint | What it does |
|---|---|
| `POST /documents/upload` | Uploads a PDF, `.xlsx` or `.csv` (multipart, field `file`, up to `MAX_UPLOAD_MB`); ingestion continues in the background |
| `GET /documents/` | Lists files with `file_type`, `status`, `error`, `page_count` (PDF) and `sheet_count` / `row_count` (spreadsheets) |
| `GET /documents/{id}/preview` | First rows of each sheet of a spreadsheet (`{filename, sheets[]}`) |
| `GET /documents/{id}/download` | `{url, filename}`: a temporary link that downloads the PDF; with `?inline=true`, to view it |
| `POST /ask` | `{prompt}` → `{answer, sources[], trace[], usage}`. Each source has `kind` (`pdf` or `sheet`), `document_id`, `filename` and either `page_start` / `page_end` or `sheet_name` + `sql`. `trace` and `usage` are filled only on the agent path |
| `DELETE /documents/{id}` | Deletes the record (and chunks, by cascade) and the file (204) |

Upload errors: unsupported or invalid file → 400, over the limit → 413, file already uploaded (same hash) → 409. Unknown document → 404.
Model errors: timeout → 504, rate limit → 429, invalid key/credit → 502, Ollama down → 503.

## Frontend

React + Vite, Axios, Tailwind v4, React Router and TanStack Query, with the **SecondMind** identity (the "brainstorming notebook": paper, ink, blue pen and highlighter; *Paper* and *Night* themes).

- `/`: your PDFs (multi-file upload, processing status, search by name, download and delete) next to a chat over the whole base, with clickable sources.
- `/documents/:id?page=N`: the PDF opened at the cited page.

Chat history and theme are kept in the browser (`localStorage`); the backend stores none of it.

## Known limitations

- Single user, no authentication: meant to run locally.
- No OCR: scanned PDFs cannot be ingested.
- Ingestion runs inside the API process; a restart marks in-flight documents as `failed`.
- Changing the embedding model or dimension requires editing `schema.sql` and re-uploading the PDFs.
