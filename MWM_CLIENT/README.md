# MWM Client Hub

Private client workspace with a responsive financial calculator index and
invite-only Supabase passwordless authentication.

## Run locally

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Add your Supabase project URL and publishable key to `.env.local`. For local UI
work before Supabase is connected, set `VITE_DEV_AUTH_BYPASS=true`. The bypass
is guarded by Vite's development mode and is ignored by production builds.

See [Authentication setup](docs/AUTH_SETUP.md) for the dashboard configuration,
account database migration, client invitation flow, production email
requirements, and security checklist.

## Private access model

The sign-in request uses `shouldCreateUser: false`, so an unknown email cannot
create an account. Invite approved clients from Supabase Authentication and
disable public sign-ups in the Supabase dashboard. Configure your production
site URL and redirect URLs before deployment.

## Email sending

"Send email" in the advisor contact card and every calculator's Share popover
delivers mail through the `send-advisor-email` Supabase Edge Function (the
pre-approval checklist uses `send-review-request`). Both are deployed with JWT
verification, so only signed-in clients can send. Configure these secrets in
Supabase (Project Settings → Edge Functions → Secrets):

- `RESEND_API_KEY` — API key from [resend.com](https://resend.com)
- `ADVISOR_EMAIL` — advisor inbox for messages and shared scenarios
- `ADVISOR_REVIEW_EMAIL` — inbox for pre-approval review requests
- `EMAIL_FROM` / `REVIEW_EMAIL_FROM` — optional verified sender, defaults to
  `MWM Client Hub <onboarding@resend.dev>`

Until the secrets are set, the UI automatically falls back to opening a
prefilled email draft in the client's mail app.

## Commands

- `pnpm dev` — start the local app
- `pnpm build` — type-check and build for production
- `pnpm lint` — run ESLint
