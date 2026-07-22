-- Client-owned settings for the My Plan workspace.
alter table public.profiles
  add column if not exists user_preferences jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_user_preferences_object'
  ) then
    alter table public.profiles
      add constraint profiles_user_preferences_object
      check (jsonb_typeof(user_preferences) = 'object');
  end if;
end $$;

comment on column public.profiles.user_preferences is
  'Client-owned planning, notification, display, and calculator preference settings.';

grant update (user_preferences)
  on table public.profiles to authenticated;

