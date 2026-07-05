-- Public account data linked one-to-one with Supabase Auth users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  account_role text not null default 'client',
  account_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_full_name_length
    check (full_name is null or char_length(full_name) between 1 and 120),
  constraint profiles_phone_length
    check (phone is null or char_length(phone) between 1 and 32),
  constraint profiles_account_role
    check (account_role in ('client', 'advisor', 'admin')),
  constraint profiles_account_status
    check (account_status in ('active', 'disabled'))
);

comment on table public.profiles is
  'Application account data for users managed by Supabase Auth.';
comment on column public.profiles.account_role is
  'Server-managed authorization role; clients cannot update this column.';
comment on column public.profiles.account_status is
  'Server-managed switch used to allow or disable application access.';

-- Keep timestamps consistent for client-editable profile fields.
create function public.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profile_updated_at();

-- Create the application profile in the same transaction as the Auth user.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, created_at)
  values (
    new.id,
    new.email,
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    new.created_at
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Auth remains the source of truth for email addresses.
create function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute procedure public.handle_auth_user_email_change();

-- Backfill users who were invited before this migration was applied.
insert into public.profiles (id, email, full_name, created_at)
select
  id,
  email,
  nullif(
    trim(
      coalesce(
        raw_user_meta_data ->> 'full_name',
        raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  ),
  created_at
from auth.users
on conflict (id) do nothing;

-- Browser clients can read only their row and edit only non-authoritative fields.
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Trigger functions are not part of the public RPC surface.
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.handle_auth_user_email_change() from public, anon, authenticated;

