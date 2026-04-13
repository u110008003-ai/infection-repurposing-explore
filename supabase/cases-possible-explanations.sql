alter table public.cases
add column if not exists possible_explanations text not null default '';
