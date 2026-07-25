import { prisma } from "@/lib/prisma";
import {
  getMcpResourceUrl,
  MCP_SCOPE_LABELS,
  parseRequestedScopes,
} from "@/lib/mcp-auth";
import { approveAuthorization, denyAuthorization } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const values = {
    client_id: one(params.client_id),
    redirect_uri: one(params.redirect_uri),
    response_type: one(params.response_type),
    scope: one(params.scope),
    state: one(params.state),
    code_challenge: one(params.code_challenge),
    code_challenge_method: one(params.code_challenge_method),
    resource: one(params.resource),
  };
  const client = values.client_id
    ? await prisma.oAuthClient.findUnique({ where: { id: values.client_id } })
    : null;
  const redirectUris = Array.isArray(client?.redirectUris) ? client.redirectUris : [];

  let scopes: ReturnType<typeof parseRequestedScopes> = [];
  let valid = Boolean(
    client &&
      redirectUris.includes(values.redirect_uri) &&
      values.response_type === "code" &&
      values.code_challenge_method === "S256" &&
      values.code_challenge.length >= 43 &&
      values.resource === getMcpResourceUrl(),
  );
  try {
    scopes = parseRequestedScopes(values.scope);
  } catch {
    valid = false;
  }

  if (!valid) {
    return (
      <main className="grid min-h-[100dvh] place-items-center p-6">
        <section className="w-full max-w-lg rounded-sm border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <h1 className="font-display text-xl font-bold">无法授权此连接</h1>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">
            OAuth 请求无效或回调地址未注册。请返回 ChatGPT 后重新连接。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center p-6">
      <section className="w-full max-w-lg rounded-sm border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-deep)]">LifeOS MCP</p>
        <h1 className="mt-2 font-display text-2xl font-bold">允许 {client!.name} 连接？</h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          授权后，AI 只能在当前登录账户内执行你明确要求的操作。
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {scopes.map((scope) => (
            <li key={scope} className="rounded-sm border border-[var(--border)] px-3 py-2">
              {MCP_SCOPE_LABELS[scope]}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-3">
          <AuthorizationForm action={approveAuthorization} values={values} label="允许连接" primary />
          <AuthorizationForm action={denyAuthorization} values={values} label="取消" />
        </div>
      </section>
    </main>
  );
}

function AuthorizationForm({
  action,
  values,
  label,
  primary = false,
}: {
  action: (form: FormData) => Promise<void>;
  values: Record<string, string>;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={action}>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className={primary
          ? "rounded-sm bg-[var(--gold-deep)] px-4 py-2 text-sm font-medium text-white"
          : "rounded-sm border border-[var(--border-strong)] px-4 py-2 text-sm"}
      >
        {label}
      </button>
    </form>
  );
}
