-- Documents: no login, a single user. Only the backend accesses it (service role).
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    storage_path text not null unique,
    created_at timestamptz not null default now()
);

-- Ingestion (RAG): processing status and hash to avoid duplicate PDFs.
-- Documents created before this version have no chunks: delete and re-upload them.
alter table public.documents
    add column if not exists status text not null default 'pending'
        check (status in ('pending', 'processing', 'ready', 'failed')),
    add column if not exists error text,
    add column if not exists page_count int,
    add column if not exists content_hash text unique;

-- Excel/CSV support: file kind plus spreadsheet counters (page_count stays PDF-only).
alter table public.documents
    add column if not exists file_type text not null default 'pdf',
    add column if not exists sheet_count int,
    add column if not exists row_count int;
alter table public.documents drop constraint if exists documents_file_type_check;
alter table public.documents
    add constraint documents_file_type_check check (file_type in ('pdf', 'xlsx', 'csv'));

create index if not exists documents_created_at_idx
    on public.documents (created_at desc);

-- RLS on and no policies: anon/authenticated read nothing; the backend's
-- service role bypasses RLS.
alter table public.documents enable row level security;

-- pgvector + chunks. The dimension (1024) is bge-m3's; another model needs
-- a different dimension here and in match_chunks (and re-indexing the PDFs).
create extension if not exists vector with schema extensions;

create table if not exists public.chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents (id) on delete cascade,
    chunk_index int not null,
    page_start int not null,
    page_end int not null,
    content text not null,
    embedding extensions.vector(1024) not null,
    embedding_model text not null,
    unique (document_id, chunk_index)
);

-- Spreadsheet "cards" are chunks without pages: they carry the sheet name instead.
alter table public.chunks
    alter column page_start drop not null,
    alter column page_end drop not null,
    add column if not exists sheet_name text;

create index if not exists chunks_embedding_idx
    on public.chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists chunks_document_id_idx
    on public.chunks (document_id);

alter table public.chunks enable row level security;

-- Top-k by cosine similarity, only from ready documents.
-- The return type changed (file_type, sheet_name), so the old version is dropped first.
drop function if exists public.match_chunks(extensions.vector, int);
create function public.match_chunks(
    query_embedding extensions.vector(1024),
    k int default 8
)
returns table (
    id uuid,
    document_id uuid,
    filename text,
    file_type text,
    page_start int,
    page_end int,
    sheet_name text,
    content text,
    similarity float
)
language sql stable
set search_path = public, extensions
as $$
    select c.id, c.document_id, d.filename, d.file_type, c.page_start, c.page_end,
           c.sheet_name, c.content,
           1 - (c.embedding <=> query_embedding) as similarity
    from public.chunks c
    join public.documents d on d.id = c.document_id
    where d.status = 'ready'
    order by c.embedding <=> query_embedding
    limit k;
$$;

-- Top-k spreadsheet cards only (sheet_name is not null), from ready documents.
-- Used to decide whether a question needs the spreadsheet agent, without having to
-- compete with the (many more) PDF chunks for the top-k slots.
create or replace function public.match_sheet_chunks(
    query_embedding extensions.vector(1024),
    k int default 3
)
returns table (
    id uuid,
    document_id uuid,
    filename text,
    sheet_name text,
    similarity float
)
language sql stable
set search_path = public, extensions
as $$
    select c.id, c.document_id, d.filename, c.sheet_name,
           1 - (c.embedding <=> query_embedding) as similarity
    from public.chunks c
    join public.documents d on d.id = c.document_id
    where d.status = 'ready' and c.sheet_name is not null
    order by c.embedding <=> query_embedding
    limit k;
$$;

-- Private bucket (20 MB per file): PDF, Excel (.xlsx) and CSV.
-- No policies on storage.objects: access is through the service role only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 20971520, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
])
on conflict (id) do update set allowed_mime_types = excluded.allowed_mime_types;
