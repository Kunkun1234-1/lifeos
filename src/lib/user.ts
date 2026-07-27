import { prisma } from "./prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { jwtVerify } from "jose";

const provisionCache = new Map<string, Promise<void>>();

async function provisionUserDefaultsOnce(userId: string) {
  let pending = provisionCache.get(userId);
  if (!pending) {
    pending = (async () => {
      const { provisionUserDefaults } = await import("./provision");
      // JWT sessions can outlive a local database reset. Recreate the signed-in
      // identity before provisioning records that reference User via foreign keys.
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId },
        update: {},
      });
      await provisionUserDefaults(userId);
    })().catch((error) => {
      provisionCache.delete(userId);
      throw error;
    });
    provisionCache.set(userId, pending);
  }
  await pending;
}

/**
 * Resolve the current authenticated user from the session.
 *
 * - If session exists: return that user. Production defaults are provisioned
 *   during sign-in, rather than on every serverless function cold start.
 * - If no session: throw — middleware redirects to /login before page handlers
 *   reach here, but API routes that bypass the page chain still need a guard.
 */
export async function getCurrentUser() {
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { currency: true },
  });
  if (!user) {
    throw new Response("User not found", { status: 401 });
  }
  return user;
}

export async function getCurrentUserId(): Promise<string> {
  const userId = (await getApiTokenUserId()) ?? (await getSessionUserId());

  if (!userId) {
    throw new Response("Unauthenticated", { status: 401 });
  }

  // Local databases are reset frequently, so keep the self-repair path in
  // development. Production sign-in already provisions defaults in auth.ts;
  // repeating those reads here made every cold serverless route pay for them.
  if (process.env.NODE_ENV !== "production") {
    await provisionUserDefaultsOnce(userId);
  }

  return userId;
}

async function getSessionUserId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

async function getApiTokenUserId(): Promise<string | null> {
  const authorization = (await headers()).get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const secretValue = process.env.API_JWT_SECRET || process.env.AUTH_SECRET;
  if (!secretValue || secretValue.length < 32) {
    throw new Response("API authentication is not configured", { status: 503 });
  }
  try {
    const { payload } = await jwtVerify(
      authorization.slice(7),
      new TextEncoder().encode(secretValue),
      { issuer: "lifeos-web", audience: "lifeos-api" },
    );
    if (!payload.sub) throw new Error("Token subject is missing");
    return payload.sub;
  } catch {
    throw new Response("Unauthenticated", { status: 401 });
  }
}
