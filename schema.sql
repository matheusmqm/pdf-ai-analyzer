-- Documentos: o dono é o usuário do Supabase Auth (auth.users).
create table public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    filename text not null,
    storage_path text not null unique,
    created_at timestamptz not null default now()
);

create index documents_user_id_created_at_idx
    on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents
    for select to authenticated
    using (user_id = (select auth.uid()));

create policy "documents_insert_own" on public.documents
    for insert to authenticated
    with check (user_id = (select auth.uid()));

create policy "documents_update_own" on public.documents
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy "documents_delete_own" on public.documents
    for delete to authenticated
    using (user_id = (select auth.uid()));

-- Bucket privado de PDFs (20 MB por arquivo, só application/pdf).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- Cada usuário só acessa arquivos dentro da pasta <user_id>/.
create policy "pdfs_select_own" on storage.objects
    for select to authenticated
    using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "pdfs_insert_own" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "pdfs_delete_own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
