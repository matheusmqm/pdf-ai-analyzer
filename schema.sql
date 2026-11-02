-- Documentos: sem login, um único usuário. Só o backend acessa (service role).
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    storage_path text not null unique,
    created_at timestamptz not null default now()
);

create index if not exists documents_created_at_idx
    on public.documents (created_at desc);

-- RLS ligado e sem políticas: anon/authenticated não leem nada; a service
-- role do backend ignora o RLS.
alter table public.documents enable row level security;

-- Bucket privado de PDFs (20 MB por arquivo, só application/pdf).
-- Sem políticas em storage.objects: o acesso é só pela service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
