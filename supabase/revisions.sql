create extension if not exists pgcrypto;

create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  editor_id uuid,
  summary text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

alter table public.revisions enable row level security;

drop policy if exists "Anyone can read revisions" on public.revisions;
create policy "Anyone can read revisions"
on public.revisions
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can insert revisions" on public.revisions;
create policy "Anyone can insert revisions"
on public.revisions
for insert
to anon, authenticated
with check (true);
