import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomOpaqueToken } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";

function validRedirectUri(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      !url.hash &&
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const redirectUris = body?.redirect_uris;
  const tokenMethod = body?.token_endpoint_auth_method ?? "none";
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.length > 10 ||
    !redirectUris.every(validRedirectUri) ||
    tokenMethod !== "none"
  ) {
    return NextResponse.json(
      { error: "invalid_client_metadata" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const clientId = `lifeos_${randomOpaqueToken(24)}`;
  const clientName =
    typeof body?.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, 120)
      : "ChatGPT";
  const grantTypes = ["authorization_code", "refresh_token"];

  await prisma.oAuthClient.create({
    data: {
      id: clientId,
      name: clientName,
      redirectUris,
      grantTypes,
      tokenEndpointAuthMethod: "none",
    },
  });

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
