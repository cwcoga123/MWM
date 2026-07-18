# Authentication setup

The client hub uses Supabase Auth with passwordless email magic links. New users
cannot create their own accounts; an administrator must invite them first.

## 1. Create and configure the project

1. Create a Supabase project.
2. In **Authentication > URL Configuration**, set **Site URL** to the production
   application URL.
3. Add `http://localhost:5173/` to **Redirect URLs** for local development. Add
   the exact production URL as well.
4. In **Authentication > Sign In / Providers > Email**, keep email authentication
   enabled and disable public user sign-ups.

The app also sets `shouldCreateUser: false` on every magic-link request. This is
the application-level guard against self-registration.

## 2. Configure the application

Copy `.env.example` to `.env.local`, then use the browser-safe values from
**Project Settings > API**:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_DEV_AUTH_BYPASS=false
```

Never put a Supabase secret key or legacy `service_role` key in a `VITE_`
variable. Vite exposes these variables to every browser that loads the app.

The older browser-safe anonymous key is supported as
`VITE_SUPABASE_ANON_KEY` during migration, but new projects should use the
publishable key.

Restart `pnpm dev` after changing environment variables.

## 3. Apply the account database migration

Run
[`supabase/migrations/20260705010000_create_account_profiles.sql`](../supabase/migrations/20260705010000_create_account_profiles.sql)
in the Supabase SQL Editor. If the project is linked to the Supabase CLI, run
`supabase db push` instead.

The migration creates `public.profiles`, links each profile to `auth.users`, and
backfills users that already exist. It also installs triggers to create profiles
for future users and keep their email addresses synchronized.

Account records contain:

- Email, full name, and phone
- Role: `client`, `advisor`, or `admin`
- Status: `active` or `disabled`
- Creation and update timestamps

Users can read only their own profile and can update only `full_name` and
`phone`. Roles and account status must be changed through a trusted server or
the Supabase SQL Editor. For example:

```sql
update public.profiles
set account_status = 'disabled'
where email = 'client@example.com';
```

## 4. Invite a client

In **Authentication > Users**, choose **Add user > Send invitation**. Once the
user exists, they can request a magic link from the app's sign-in page.

For local-only UI work, `VITE_DEV_AUTH_BYPASS=true` supplies a mock client. The
bypass is compiled out of production builds by the `import.meta.env.DEV` guard.

## 5. Production requirements

- Configure custom SMTP before production. Supabase's default mail service is
  intended for testing and has restrictive rate limits.
- Add only exact production callback URLs; avoid broad wildcards.
- Keep `.env.local` out of source control.
- Enable Row Level Security on every table exposed through Supabase. The React
  auth gate protects the interface, not the database API.
- Write RLS policies against `auth.uid()` so each client can access only their
  own records. Do not rely on email addresses as stable authorization IDs.

## Verification

1. Run `pnpm dev` and open `http://localhost:5173`.
2. Confirm the `profiles` table exists and Row Level Security is enabled.
3. Confirm an unknown email cannot create an account.
4. Invite a test client, request a link, and open it in the same browser.
5. Confirm the new user has exactly one matching row in `profiles`.
6. Refresh the page and confirm the session remains active.
7. Sign out and confirm the client workspace is no longer rendered.
