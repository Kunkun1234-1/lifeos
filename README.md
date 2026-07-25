# LifeOS

LifeOS uses separately deployable Web and API applications.

- Web: Next.js at the repository root during the gradual migration
- API: Next.js Route Handler service in `apps/api`
- Shared request contracts: `packages/contracts`
- Database: Prisma + PostgreSQL

All business API routes now live in the independent API application. See
[`docs/Backend_Migration.md`](docs/Backend_Migration.md) for architecture,
environment variables, local commands, rollback behavior, and the next stages.

Database models, ownership boundaries, relationships, migrations, and operational
commands are documented in [`docs/Database_Design.md`](docs/Database_Design.md).

## ChatGPT / MCP connection

The API application exposes a tool-only MCP server at `POST /mcp`. After OAuth
authorization, ChatGPT or another MCP client can list the signed-in user's areas,
projects, goals, and tasks, then create goals/tasks or complete tasks. Every write
requires an idempotency key and is recorded in `AgentAction`.

Local endpoints:

- MCP resource: `http://127.0.0.1:4000/mcp`
- protected-resource metadata: `http://127.0.0.1:4000/.well-known/oauth-protected-resource`
- OAuth issuer and consent UI: `http://localhost:3000`

Set `MCP_OAUTH_SECRET` to the same 32+ character value in both deployments, set
`MCP_AUTH_ISSUER` to the public Web origin, and set `MCP_RESOURCE_URL` to the exact
public API `/mcp` URL. Apply migrations with `npm run db:deploy` before connecting.
The OAuth implementation supports dynamic client registration, authorization code
with PKCE (`S256`), refresh-token rotation, resource indicators, and scoped access.

When adding the deployed connector to ChatGPT, use the public HTTPS
`MCP_RESOURCE_URL`. The user will be redirected to LifeOS to sign in and approve
the requested permissions.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
