create or replace view public.profile_public_names as
select
  id,
  display_name
from public.profiles;

grant select on public.profile_public_names to anon, authenticated;
