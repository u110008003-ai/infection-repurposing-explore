alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('level_1', 'level_2', 'level_3', 'level_4'));

-- Replace the email below with your own admin account.
update public.profiles
set role = 'level_4'
where email = 'your-admin-email@example.com';
