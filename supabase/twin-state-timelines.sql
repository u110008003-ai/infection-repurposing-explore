create table if not exists public.twin_state_timelines (
  case_id uuid primary key,
  observations jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.twin_state_timelines enable row level security;

create policy "Allow public read twin_state_timelines"
on public.twin_state_timelines
for select
using (true);

create policy "Allow public upsert twin_state_timelines"
on public.twin_state_timelines
for insert
with check (true);

create policy "Allow public update twin_state_timelines"
on public.twin_state_timelines
for update
using (true)
with check (true);
