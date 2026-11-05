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

create index if not exists chunks_embedding_idx
    on public.chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists chunks_document_id_idx
    on public.chunks (document_id);

alter table public.chunks enable row level security;

-- Top-k by cosine similarity, only from ready documents.
create or replace function public.match_chunks(
    query_embedding extensions.vector(1024),
    k int default 8
)
returns table (
    id uuid,
    document_id uuid,
    filename text,
    page_start int,
    page_end int,
    content text,
    similarity float
)
language sql stable
set search_path = public, extensions
as $$
    select c.id, c.document_id, d.filename, c.page_start, c.page_end, c.content,
           1 - (c.embedding <=> query_embedding) as similarity
    from public.chunks c
    join public.documents d on d.id = c.document_id
    where d.status = 'ready'
    order by c.embedding <=> query_embedding
    limit k;
$$;

-- Private PDF bucket (20 MB per file, application/pdf only).
-- No policies on storage.objects: access is through the service role only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
