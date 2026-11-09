# TUGAS HUB V4

Next.js 14 + Supabase starter for a legitimate task-management and review platform. It is not intended for creating, trading, or collecting credentials for third-party accounts. Never request passwords, OTPs, or recovery codes from task participants.

## Requirements
- Node.js 18.17+
- A Supabase project
- A Vercel project (optional)

## Environment variables
Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_LEGACY_ANON_KEY
```

Use the Supabase Project URL and Publishable key (or legacy anon key). Never put the `service_role` or `sb_secret_` key in browser environment variables.

## Database
Run all of `supabase/schema.sql` in Supabase SQL Editor. If an older incompatible schema already exists, back it up and inspect it before applying migrations; do not drop existing tables blindly.

After registering your own account, promote it to admin in Supabase SQL Editor:

```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_AUTH_USER_UUID';
```

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Routes: `/auth`, `/dashboard`, `/tugas`, `/riwayat`, `/saldo`, `/profil`, `/aturan`, `/admin`.

## Deploy to Vercel
1. Import the GitHub repository.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Project Settings → Environment Variables for Production, Preview, and Development as needed.
3. Redeploy after saving the variables.

The fallback in `lib/supabase.ts` prevents prerender from crashing when variables are absent, but authentication/database requests will not work until valid values are configured.

## Google OAuth (optional)
The auth page includes a Google sign-in button. Enable Google under Supabase Authentication → Providers and configure the Google OAuth credentials and redirect URLs. If Google OAuth is not configured, use email/password login or remove the Google button.
