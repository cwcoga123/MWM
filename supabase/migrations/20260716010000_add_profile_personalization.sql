-- Client personalization used by the Overview, Advisor Console, calculators,
-- Cost Watch, and lightweight alerts.
alter table public.profiles
  add column if not exists client_state text not null default 'browsing',
  add column if not exists advisor_note text,
  add column if not exists target_budget numeric(12, 2),
  add column if not exists neighborhoods text[] not null default array[]::text[],
  add column if not exists closing_date date,
  add column if not exists locked_rate numeric(5, 3),
  add column if not exists refi_threshold numeric(5, 3),
  add column if not exists recent_calculator_ids text[] not null default array[]::text[],
  add column if not exists saved_scenarios jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_client_state'
  ) then
    alter table public.profiles
      add constraint profiles_client_state
      check (client_state in ('browsing', 'house-hunting', 'in-escrow', 'homeowner'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_advisor_note_length'
  ) then
    alter table public.profiles
      add constraint profiles_advisor_note_length
      check (advisor_note is null or char_length(advisor_note) <= 2000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_target_budget_positive'
  ) then
    alter table public.profiles
      add constraint profiles_target_budget_positive
      check (target_budget is null or target_budget >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_neighborhoods_limit'
  ) then
    alter table public.profiles
      add constraint profiles_neighborhoods_limit
      check (array_length(neighborhoods, 1) is null or array_length(neighborhoods, 1) <= 20);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_locked_rate_range'
  ) then
    alter table public.profiles
      add constraint profiles_locked_rate_range
      check (locked_rate is null or (locked_rate >= 0 and locked_rate <= 25));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_refi_threshold_range'
  ) then
    alter table public.profiles
      add constraint profiles_refi_threshold_range
      check (refi_threshold is null or (refi_threshold >= 0 and refi_threshold <= 25));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_saved_scenarios_array'
  ) then
    alter table public.profiles
      add constraint profiles_saved_scenarios_array
      check (jsonb_typeof(saved_scenarios) = 'array');
  end if;
end $$;

comment on column public.profiles.client_state is
  'Advisor-managed lifecycle state for client personalization.';
comment on column public.profiles.advisor_note is
  'Short advisor-authored note shown on the client overview.';
comment on column public.profiles.target_budget is
  'Client target purchase budget in dollars.';
comment on column public.profiles.neighborhoods is
  'Saved neighborhoods, areas, or market interests for client filtering.';
comment on column public.profiles.closing_date is
  'Client closing date or current in-escrow milestone date.';
comment on column public.profiles.locked_rate is
  'Locked mortgage rate percentage for in-escrow clients.';
comment on column public.profiles.refi_threshold is
  'Mortgage rate percentage at or below which refinance review should be flagged.';
comment on column public.profiles.recent_calculator_ids is
  'Client-owned list of recently opened calculator ids.';
comment on column public.profiles.saved_scenarios is
  'Client-owned calculator scenario snapshots as JSON.';

-- RLS helper kept behind a security definer boundary to avoid recursive
-- policies on public.profiles.
create or replace function public.current_account_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select p.account_role
  from public.profiles p
  where p.id = (select auth.uid())
$$;

create policy "Advisors can read profiles"
  on public.profiles
  for select
  to authenticated
  using (public.current_account_role() in ('advisor', 'admin'));

create or replace function public.update_client_personalization(
  client_id uuid,
  new_client_state text,
  new_advisor_note text,
  new_target_budget numeric,
  new_neighborhoods text[],
  new_closing_date date,
  new_locked_rate numeric,
  new_refi_threshold numeric
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
  updated_profile public.profiles;
begin
  select p.account_role
  into actor_role
  from public.profiles p
  where p.id = (select auth.uid());

  if actor_role not in ('advisor', 'admin') then
    raise exception 'Not authorized to edit client personalization.'
      using errcode = '42501';
  end if;

  update public.profiles
  set
    client_state = coalesce(new_client_state, 'browsing'),
    advisor_note = nullif(trim(coalesce(new_advisor_note, '')), ''),
    target_budget = new_target_budget,
    neighborhoods = coalesce(new_neighborhoods, array[]::text[]),
    closing_date = new_closing_date,
    locked_rate = new_locked_rate,
    refi_threshold = new_refi_threshold
  where id = client_id
    and account_role = 'client'
  returning *
  into updated_profile;

  if not found then
    raise exception 'Client profile not found.'
      using errcode = 'P0002';
  end if;

  return updated_profile;
end;
$$;

grant update (recent_calculator_ids, saved_scenarios)
  on table public.profiles to authenticated;
grant execute on function public.current_account_role() to authenticated;
grant execute on function public.update_client_personalization(
  uuid,
  text,
  text,
  numeric,
  text[],
  date,
  numeric,
  numeric
) to authenticated;

revoke all on function public.current_account_role() from public, anon;
revoke all on function public.update_client_personalization(
  uuid,
  text,
  text,
  numeric,
  text[],
  date,
  numeric,
  numeric
) from public, anon;
