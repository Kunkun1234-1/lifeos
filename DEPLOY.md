# Deploy to Vercel + Neon Postgres + Vercel Blob

Path C from the deployment options. Total wall-clock: ~30 min if you've used Vercel before.

## 0. Prerequisites

- GitHub account (for the source repo)
- Vercel account (free tier OK)
- Neon Postgres account (free tier OK — neon.tech)
- Google Cloud Console account (for OAuth)
- DeepSeek API key — get a fresh one at https://platform.deepseek.com (rotate the one in `.env`!)

## Release gate: test before production

Production must not be updated directly from an unverified local change.

This repository disables automatic Vercel deployments for `main` in `vercel.json`.
Use this flow for every production change:

1. Work on a feature branch, not directly on `main`.
2. Point local `.env` at a reachable staging/local Postgres database.
   The smoke test uses Dev Login, which reads/writes the database.
   Run `npm run db:check` first; it verifies DNS, TCP, PostgreSQL SSL,
   and an actual Prisma `select 1`.
3. Run the deployment gate:

   ```bash
   npm run verify:predeploy
   ```

   This runs lint, typecheck, production build, starts a local dev server,
   signs in with Dev Login, creates a body-only Knowledge Base note, verifies
   it can be found through `/api/notes`, then deletes the test note.

4. Push the branch and inspect the Vercel Preview deployment.
5. Only after local + preview verification passes, manually promote/deploy from
   Vercel. Do not rely on a direct `main` push as the test step.

## 1. Initial GitHub setup

For normal production changes after initial setup, use the Release gate above
instead of pushing directly to `main`.

```bash
git add -A && git commit -m "Production-ready: auth + Postgres + Blob"
git remote add origin git@github.com:YOUR_USER/lifeos.git
git push -u origin main
```

## 2. Create Neon database

1. neon.tech → New Project → name "lifeos" → region nearest you
2. Copy the **pooled** connection string (looks like `postgresql://…@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`)

## 3. Create Google OAuth credentials

1. https://console.cloud.google.com → APIs & Services → Credentials
2. **Create credentials** → OAuth client ID → Web application
3. Authorized JavaScript origins:
   - `https://YOUR_VERCEL_DOMAIN.vercel.app` (and your custom domain if any)
4. Authorized redirect URIs:
   - `https://YOUR_VERCEL_DOMAIN.vercel.app/api/auth/callback/google`
5. Copy `Client ID` + `Client Secret`

## 4. Switch Prisma schema to Postgres

Edit `prisma/schema.prisma`, change the datasource block:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

Then locally:

```bash
# Wipe old SQLite migrations (they're SQLite-specific)
rm -rf prisma/migrations
rm -f prisma/dev.db

# Point DATABASE_URL at Neon (use a *new* throwaway DB or branch for the migration generation)
export DATABASE_URL="postgresql://…neon.tech/…?sslmode=require"

# Create the initial Postgres migration
npx prisma migrate dev --name init

# Seed system globals (Achievements, Titles, Equipment, Events, Principles, Notes templates)
npx prisma db seed
```

Commit the new `prisma/migrations/` folder:

```bash
git add prisma/migrations prisma/schema.prisma
git commit -m "Migrate to Postgres"
git push
```

## 5. Deploy to Vercel

1. vercel.com → Add New → Project → Import your GitHub repo
2. **Framework**: Next.js (auto-detected)
3. **Build Command**: `prisma generate && next build` (override the default)
4. **Environment Variables** — paste these (see `.env.example` for the full list):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon pooled connection string |
   | `AUTH_SECRET` | `openssl rand -base64 32` output |
   | `GOOGLE_CLIENT_ID` | From step 3 |
   | `GOOGLE_CLIENT_SECRET` | From step 3 |
   | `DEEPSEEK_API_KEY` | New rotated key |
   | `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
   | `DEEPSEEK_MODEL` | `deepseek-chat` |

5. Deploy.

## 6. Connect Vercel Blob (for image uploads)

After first deploy:

1. Project → **Storage** tab → **Create Database** → Blob → Create
2. Vercel auto-injects `BLOB_READ_WRITE_TOKEN` into env. Redeploy.
3. Now `/api/upload` will write to Blob instead of disk.

## 7. First login

1. Open `https://YOUR_DOMAIN.vercel.app`
2. Middleware redirects to `/login`
3. Click **Sign in with Google**
4. On first sign-in, the app auto-provisions:
   - A Currency record (100 Mora, 0 Gems, 5 Fate starter)
   - 6 default Life Areas (Health/Learning/Relationships/Wellbeing/Creative/Finance)

## 8. Post-deploy checklist

- [ ] Login works (try a fresh incognito tab)
- [ ] Create one Task → it counts toward achievements
- [ ] Upload an avatar image in Settings → URL is `*.public.blob.vercel-storage.com/...`
- [ ] AI Coach (Daily/Weekly Review → Decision Coach) returns a response
- [ ] Sign out from `/settings` → `Account` panel → bounces back to `/login`

## Troubleshooting

**"PrismaClientInitializationError: Can't reach database server"** —
Check Neon dashboard; the free tier auto-suspends after 5 min idle. First request will be slow (~1-3s) while it wakes.
If this happens locally but production works, run `npm run db:check`.
When the Neon host resolves to `198.18.x.x`, a local proxy/DNS fake-ip mode is
intercepting the database host. Browser HTTPS may still work, but Prisma uses
raw PostgreSQL over TCP/TLS and can fail during the protocol handshake. Use one
of these fixes:

- Use a local Postgres database for local development.
- Configure the proxy/DNS tool to resolve and route `*.neon.tech` without fake-ip
  interception for PostgreSQL traffic.
- Use a Neon dev branch with the pooled connection string, but note that pooler
  still requires working raw PostgreSQL TCP/TLS from this machine.

**Google OAuth: redirect_uri_mismatch** —
The redirect URI in Google Console must EXACTLY match the deploy URL, including https and `/api/auth/callback/google`.

**Image upload returns 401** —
You're not logged in. Check `AUTH_SECRET` is set and the cookie isn't blocked.

**Image upload writes to disk on Vercel** —
Means `BLOB_READ_WRITE_TOKEN` isn't set. Redo step 6.

**Custom domain** —
After adding the domain in Vercel, also add it to Google OAuth's authorized origins/redirects, and update `AUTH_TRUSTED_HOSTS` if you're behind a proxy.

## Local dev after this change

This repo now uses the Postgres Prisma provider. Recommended local options:

1. Use local Postgres and point `.env.local` at it.
2. Use a Neon dev branch (`neon.tech` → Branches → New from `main`) and point
   local `.env.local` at its pooled connection string.

That way local + prod schemas always agree.

For local sign-in without setting up Google: the **Dev Login** button on `/login` is enabled when `NODE_ENV !== "production"`. It skips OAuth and creates a `dev@local` user.
