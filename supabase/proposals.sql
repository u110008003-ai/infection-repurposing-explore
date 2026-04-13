create extension if not exists pgcrypto;

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  content text not null,
  status text not null default 'under_review' check (status in ('under_review', 'promoted')),
  promoted_case_id uuid references public.cases(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proposals
  add column if not exists promoted_case_id uuid references public.cases(id) on delete set null;

alter table public.proposals
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.proposals
  add column if not exists updated_at timestamptz not null default now();

alter table public.proposals enable row level security;

drop policy if exists "Anyone can read proposals" on public.proposals;
create policy "Anyone can read proposals"
on public.proposals
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can insert proposals" on public.proposals;
drop policy if exists "Anyone can insert proposals" on public.proposals;
drop policy if exists "Level 2 can insert proposals" on public.proposals;
create policy "Level 2 can insert proposals"
on public.proposals
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('level_2', 'level_3', 'level_4')
  )
);

drop policy if exists "Anyone can update proposals" on public.proposals;
drop policy if exists "Author or Level 4 can update draft proposals" on public.proposals;
drop policy if exists "Level 3 can promote proposals" on public.proposals;
create policy "Author or Level 4 can update draft proposals"
on public.proposals
for update
to authenticated
using (
  status = 'under_review'
  and (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'level_4'
    )
  )
)
with check (
  status = 'under_review'
  and (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'level_4'
    )
  )
);

create policy "Level 3 can promote proposals"
on public.proposals
for update
to authenticated
using (
  status = 'under_review'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('level_3', 'level_4')
  )
)
with check (
  status = 'promoted'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('level_3', 'level_4')
  )
);
