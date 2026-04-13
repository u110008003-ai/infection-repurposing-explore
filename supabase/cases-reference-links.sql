alter table public.cases
add column if not exists reference_links text not null default '';
