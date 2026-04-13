drop policy if exists "Level 3 can insert cases" on public.cases;
create policy "Level 3 can insert cases"
on public.cases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('level_3', 'level_4')
  )
);

drop policy if exists "Anyone can update cases" on public.cases;
drop policy if exists "Level 3 can update cases" on public.cases;
drop policy if exists "Level 4 can update cases" on public.cases;
create policy "Level 4 can update cases"
on public.cases
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'level_4'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'level_4'
  )
);

drop policy if exists "Anyone can delete cases" on public.cases;
drop policy if exists "Level 4 can delete cases" on public.cases;
create policy "Level 4 can delete cases"
on public.cases
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'level_4'
  )
);
