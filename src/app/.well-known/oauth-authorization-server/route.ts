import { NextResponse } from "next/server";
import { getMcpAuthIssuer, MCP_SCOPES } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

export function GET() {
  const issuer = getMcpAuthIssuer();
  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: MCP_SCOPES,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
