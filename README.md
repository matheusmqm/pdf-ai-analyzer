# PDF AI Analyzer

API (FastAPI) para enviar PDFs e fazer perguntas sobre eles usando um LLM via [OpenRouter](https://openrouter.ai).
Autenticação, banco (Postgres) e armazenamento de arquivos ficam no **Supabase**.

## Estrutura

```
backend/
  main.py                    # sobe o uvicorn
  app/
    main.py                  # instância FastAPI e routes
    routes/                  # *_routes.py: declaram os endpoints e delegam ao controller
    controllers/             # *_controller.py: regra de negócio e orquestração
    models/                  # *_model.py: formatos de entrada/saída (pydantic)
    services/                # *_service.py: integrações (Supabase, storage, pdf e llm)
    dependencies.py          # CurrentUser e get_current_user
    core/
      config.py              # settings (variáveis de ambiente)
      security.py            # validação do JWT (JWKS ou HS256)
    db/client.py             # cliente Supabase agindo como o usuário (RLS)
  schema.sql                 # tabela, RLS e bucket
frontend/                    # React (veja abaixo)
```

Fluxo: `Route -> Controller -> Service`.

## Autenticação (login por link no e-mail)

Não há senha. O Supabase Auth envia um link de acesso por e-mail:

1. `POST /auth/otp {"email"}`: envia o e-mail (cria a conta no primeiro acesso).
2. O link do e-mail abre `{FRONTEND_URL}/auth/callback#access_token=...`; o frontend lê a
   sessão do fragmento da URL, guarda e limpa a barra de endereço. O usuário não vê nem
   digita token.
3. Use `Authorization: Bearer <access_token>` nas rotas `/documents`.
4. `POST /auth/refresh {"refresh_token"}`: renova o `access_token` sem pedir novo login.

`POST /auth/verify {"email", "code"}` continua disponível para quem usar o código numérico
(`{{ .Token }}`) em vez do link, por exemplo em testes pela API.

## Documentos

- `POST /documents/upload`: envia um PDF.
- `GET /documents/`: lista os PDFs do usuário.
- `GET /documents/{id}/download`: devolve `{url, filename}` com um link temporário (5 min,
  `DOWNLOAD_URL_EXPIRES_SECONDS`) que baixa o PDF. Com `?inline=true` o link serve para
  visualizar o arquivo.
- `POST /documents/ask`: pergunta sobre um PDF. O limite de espera é
  `LLM_TIMEOUT_SECONDS` (padrão 120). Estouro vira 504, limite de uso do modelo vira 429 e
  falha ao falar com o modelo vira 502.

A API valida o JWT e usa o mesmo token para falar com o Postgres e o Storage, então o RLS
garante que cada usuário só acessa os próprios dados. O mesmo e-mail é sempre o mesmo
usuário, por isso os PDFs enviados antes reaparecem em novos logins.

### Configuração no painel do Supabase

- *Authentication > URL Configuration*: em *Redirect URLs* adicione
  `http://localhost:5173/auth/callback` (e a URL do frontend em produção). Sem isso o
  Supabase ignora o redirecionamento do link.
- *Authentication > Email Templates > Magic Link* (e *Confirm signup*): mantenha o link
  (`{{ .ConfirmationURL }}`) no corpo do e-mail. Se alguém ainda usar o template com
  `{{ .Token }}`, o e-mail traz só o código e o login por link não funciona.
- *Authentication > Providers > Email*: defina a validade do link (sugestão: 10 minutos).
- Configure um SMTP próprio (ex.: Resend). O SMTP padrão envia poucos e-mails por hora e
  serve só para teste.

## Rodando

1. Crie um projeto no Supabase, abra o *SQL Editor*, cole o conteúdo de `backend/schema.sql`
   e execute (cria a tabela, o RLS e o bucket de PDFs).
2. `cd backend && cp .env.example .env` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
3. Crie uma chave em [openrouter.ai/keys](https://openrouter.ai/keys) e preencha
   `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` (modelos gratuitos terminam em `:free`).
4. `uv sync && uv run python main.py` (dentro de `backend/`).
5. Frontend: `cd frontend && npm install && npm run dev` (http://localhost:5173).
   A porta é fixa porque o backend só libera essa origem no CORS (`FRONTEND_URL`).
   Para apontar para outra API, defina `VITE_API_URL` (veja `frontend/.env.example`).

Docs interativas em http://localhost:8000/docs.

## Frontend (`frontend/`)

React + TypeScript + Vite, Tailwind v4, React Router e TanStack Query. Organizado por
funcionalidade:

```
frontend/src/
  app/               # router, layouts (AuthLayout, AppLayout)
  features/
    auth/            # login, callback do link, sessão e RequireAuth
    documents/       # biblioteca, upload, download e visualizador de PDF
    chat/            # perguntas e respostas (histórico salvo no navegador)
  components/ui/     # Button, Spinner, Logo, Alert
  lib/               # apiClient (Bearer + renovação), session, queryClient
```
