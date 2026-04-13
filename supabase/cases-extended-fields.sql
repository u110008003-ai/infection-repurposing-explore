alter table public.cases
add column if not exists narrative_timeline text not null default '';

alter table public.cases
add column if not exists summary_image_url text not null default '';

alter table public.cases
add column if not exists summary_image_note text not null default '';
