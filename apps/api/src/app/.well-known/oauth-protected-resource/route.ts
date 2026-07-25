import { NextResponse } from "next/server";
import {
  getMcpAuthIssuer,
  getMcpResourceUrl,
  MCP_SCOPES,
} from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      resource: getMcpResourceUrl(),
      authorization_servers: [getMcpAuthIssuer()],
      bearer_methods_supported: ["header"],
      scopes_supported: MCP_SCOPES,
      resource_name: "LifeOS",
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
