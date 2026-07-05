# MWM Client Hub

Private client workspace scaffold with a responsive financial calculator index and Supabase passwordless authentication.

## Run locally

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Add your Supabase project URL and anonymous key to `.env.local`. For local UI work before Supabase is connected, set `VITE_DEV_AUTH_BYPASS=true`. The bypass is guarded by Vite's development mode and is ignored by production builds.

## Private access model

The sign-in request uses `shouldCreateUser: false`, so an unknown email cannot create an account. Invite approved clients from Supabase Authentication and disable public sign-ups in the Supabase dashboard. Configure your production site URL and redirect URLs before deployment.

## Commands

- `pnpm dev` — start the local app
- `pnpm build` — type-check and build for production
- `pnpm lint` — run ESLint
