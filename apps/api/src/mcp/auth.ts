import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getMcpResourceUrl, MCP_DEFAULT_SCOPES, verifyMcpAccessToken } from "@/lib/mcp-auth";

function metadataUrl() {
  return `${new URL(getMcpResourceUrl()).origin}/.well-known/oauth-protected-resource`;
}

export function mcpAuthChallenge(error?: "invalid_token" | "insufficient_scope") {
  const description = error === "insufficient_scope"
    ? "Approve the LifeOS connection permissions to use this tool"
    : "The access token is invalid or expired";
  return `Bearer resource_metadata="${metadataUrl()}", scope="${MCP_DEFAULT_SCOPES.join(" ")}"${error ? `, error="${error}", error_description="${description}"` : ""}`;
}

export function mcpToolAuthorizationRequired(requiredScopes: string[], authenticated: boolean) {
  return {
    isError: true as const,
    content: [{
      type: "text" as const,
      text: authenticated
        ? `Additional LifeOS permission is required: ${requiredScopes.join(" or ")}. Approve the connection upgrade, then retry this action with the same idempotencyKey. No action was performed.`
        : "Connect your LifeOS account before using this tool. No action was performed.",
    }],
    _meta: {
      "mcp/www_authenticate": [mcpAuthChallenge(authenticated ? "insufficient_scope" : "invalid_token")],
    },
  };
}

export function mcpUnauthorized(
  description = "A valid LifeOS access token is required",
  invalidToken = false,
) {
  return new Response(JSON.stringify({ error: "unauthorized", error_description: description }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "WWW-Authenticate": mcpAuthChallenge(invalidToken ? "invalid_token" : undefined),
    },
  });
}

export async function authenticateMcpRequest(req: Request): Promise<AuthInfo | Response> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return mcpUnauthorized();
  const token = header.slice(7).trim();
  if (!token) return mcpUnauthorized();

  try {
    const verified = await verifyMcpAccessToken(token);
    return {
      token,
      clientId: verified.clientId,
      scopes: verified.scopes,
      expiresAt: verified.expiresAt,
      resource: new URL(verified.resource),
      extra: { userId: verified.userId },
    };
  } catch {
    return mcpUnauthorized("The LifeOS access token is invalid or expired", true);
  }
}
