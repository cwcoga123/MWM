# MWM

MWM is now split into two apps that share the same Supabase backend:

- `MWM_CLIENT` - private client hub with calculators, calendar, resources, and client-facing planning tools.
- `MWM_ADMIN` - advisor/admin CRM surface, starting with the separated Advisor Console.

## Run Locally

```bash
npm run dev:client
npm run dev:admin
```

You can also work inside either app directly:

```bash
cd MWM_CLIENT
pnpm dev

cd ../MWM_ADMIN
pnpm dev
```

Both apps use their own `.env.local` with the same Supabase project values.
