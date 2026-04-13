create extension if not exists pgcrypto;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid,
  type text not null check (type in ('evidence', 'error', 'inference')),
  content text not null,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

drop policy if exists "Anyone can insert submissions" on public.submissions;
create policy "Anyone can insert submissions"
on public.submissions
for insert
to anon, authenticated
with check (true);

drop policy if exists "Anyone can read submissions" on public.submissions;
create policy "Anyone can read submissions"
on public.submissions
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can update submissions" on public.submissions;
create policy "Anyone can update submissions"
on public.submissions
for update
to anon, authenticated
using (true)
with check (true);
