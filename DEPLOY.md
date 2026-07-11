# Deploy LifeOS Web + API

LifeOS now has two independently deployable applications backed by the same PostgreSQL database.

## Release gate

Use Node.js 20 and a local or staging PostgreSQL database:

```bash
npm ci
npm run db:check
npm run verify:predeploy
```

This validates Web, API, migrations-facing Prisma generation, API authentication, 23 business modules, concurrent Task completion, and cross-service Notes/Routine CRUD.

## Shared infrastructure

- PostgreSQL: Neon or another reachable PostgreSQL 16 service
- Uploads: Vercel Blob recommended
- OAuth: Google OAuth credentials
- AI: optional DeepSeek credentials

Run migrations once per release:

```bash
npm run db:deploy
npm run db:seed
```

## API deployment

Create a Vercel project from this repository.

- Project name: `lifeos-api`
- Root Directory: `apps/api`
- Build Command: `npm run build`
- Framework: Next.js

Environment variables:

```env
DATABASE_URL="postgresql://..."
API_JWT_SECRET="shared-random-48-byte-secret"
WEB_ORIGIN="https://lifeos-web.example.com"
BLOB_READ_WRITE_TOKEN="..."
DEEPSEEK_API_KEY="..."
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
```

After deployment verify:

```text
https://lifeos-api.example.com/health
https://lifeos-api.example.com/ready
```

## Web deployment

Create a second Vercel project from the same repository.

- Project name: `lifeos-web`
- Root Directory: repository root
- Build Command: `npm run build`
- Framework: Next.js

Environment variables:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="auth-random-secret"
API_JWT_SECRET="same-value-as-api"
NEXT_PUBLIC_API_URL="https://lifeos-api.example.com"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

The Web database connection is only used by the Auth.js Prisma Adapter and first-login provisioning. Business data traffic goes to the API deployment.

Google OAuth callback:

```text
https://lifeos-web.example.com/api/auth/callback/google
```

## Post-deploy checks

- Login and logout work in an incognito session.
- Browser requests target the API domain, not Web `/api` routes.
- API responses contain the expected CORS origin.
- Create, update, complete and delete a Task.
- Upload an avatar and verify the returned URL is absolute.
- Check `/health` and `/ready` on the API domain.

See `docs/Backend_Migration.md` and `docs/Separation_Report.md` for architecture and verification details.
