import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const MCP_SCOPES = [
  "lifeos:read",
  "lifeos:write",
  "lifeos:economy",
  "lifeos:ai",
  // Retained so already-authorized clients can keep using the original tools.
  "tasks:write",
  "goals:write",
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

export const MCP_SCOPE_LABELS: Record<McpScope, string> = {
  "lifeos:read": "查看 LifeOS 中的个人资料、计划、知识库、资产与游戏状态",
  "lifeos:write": "创建、修改、归档或删除 LifeOS 内容",
  "lifeos:economy": "执行余额、奖励、祈愿和领取等有经济副作用的操作",
  "lifeos:ai": "调用 AI 教练并消耗树脂",
  "tasks:write": "兼容旧版：创建、修改和完成任务",
  "goals:write": "兼容旧版：创建、修改目标和关键结果",
};

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
export const AUTHORIZATION_CODE_TTL_SECONDS = 5 * 60;

function firstConfiguredOrigin(value: string | undefined) {
  return value?.split(",")[0]?.trim().replace(/\/$/, "");
}

export function getMcpAuthIssuer() {
  return (
    firstConfiguredOrigin(process.env.MCP_AUTH_ISSUER) ||
    firstConfiguredOrigin(process.env.AUTH_URL) ||
    firstConfiguredOrigin(process.env.WEB_ORIGIN) ||
    "http://localhost:3000"
  );
}

export function getMcpResourceUrl() {
  return (
    process.env.MCP_RESOURCE_URL?.trim().replace(/\/$/, "") ||
    "http://127.0.0.1:4000/mcp"
  );
}

function getMcpSigningSecret() {
  const value =
    process.env.MCP_OAUTH_SECRET ||
    process.env.API_JWT_SECRET ||
    process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("MCP OAuth signing is not configured");
  }
  return new TextEncoder().encode(value);
}

export function randomOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function parseRequestedScopes(value: string | null | undefined): McpScope[] {
  const requested = value?.trim() ? value.trim().split(/\s+/) : [...MCP_SCOPES];
  const unique = Array.from(new Set(requested));
  if (unique.some((scope) => !MCP_SCOPES.includes(scope as McpScope))) {
    throw new Error("Unsupported OAuth scope");
  }
  return unique as McpScope[];
}

export async function issueMcpAccessToken(input: {
  userId: string;
  clientId: string;
  scopes: string[];
  resource: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ACCESS_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({
    type: "mcp_access",
    client_id: input.clientId,
    scope: input.scopes.join(" "),
    resource: input.resource,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuer(getMcpAuthIssuer())
    .setAudience(input.resource)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(getMcpSigningSecret());

  return { token, expiresAt, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export async function verifyMcpAccessToken(token: string) {
  const resource = getMcpResourceUrl();
  const { payload } = await jwtVerify(token, getMcpSigningSecret(), {
    issuer: getMcpAuthIssuer(),
    audience: resource,
  });
  if (
    payload.type !== "mcp_access" ||
    !payload.sub ||
    typeof payload.client_id !== "string" ||
    typeof payload.scope !== "string" ||
    payload.resource !== resource
  ) {
    throw new Error("Invalid MCP access token");
  }

  return {
    userId: payload.sub,
    clientId: payload.client_id,
    scopes: payload.scope.split(/\s+/).filter(Boolean),
    expiresAt: payload.exp,
    resource,
  };
}
