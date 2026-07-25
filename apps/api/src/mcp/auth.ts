import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getMcpResourceUrl, verifyMcpAccessToken } from "@/lib/mcp-auth";

function metadataUrl() {
  return `${new URL(getMcpResourceUrl()).origin}/.well-known/oauth-protected-resource`;
}

export function mcpUnauthorized(description = "A valid LifeOS access token is required") {
  return new Response(JSON.stringify({ error: "unauthorized", error_description: description }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl()}", scope="lifeos:read"`,
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
    return mcpUnauthorized("The LifeOS access token is invalid or expired");
  }
}
