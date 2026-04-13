alter table public.cases
  add column if not exists created_by uuid;

alter table public.cases
  add column if not exists promoted_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cases_created_by_fkey'
  ) then
    alter table public.cases
      add constraint cases_created_by_fkey
      foreign key (created_by)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cases_promoted_by_fkey'
  ) then
    alter table public.cases
      add constraint cases_promoted_by_fkey
      foreign key (promoted_by)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;
