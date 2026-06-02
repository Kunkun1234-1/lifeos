import { prisma } from "./prisma";
import { auth } from "@/auth";
import { provisionUserDefaults } from "./provision";

const provisionCache = new Map<string, Promise<void>>();

async function provisionUserDefaultsOnce(userId: string) {
  let pending = provisionCache.get(userId);
  if (!pending) {
    pending = provisionUserDefaults(userId).catch((error) => {
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
 * - If session exists: return that user, ensuring per-user defaults
 *   (Currency + 6 Areas) are provisioned.
 * - If no session: throw — middleware redirects to /login before page handlers
 *   reach here, but API routes that bypass the page chain still need a guard.
 */
export async function getCurrentUser() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    throw new Response("Unauthenticated", { status: 401 });
  }

  // Idempotent — short-circuits when defaults already exist.
  await provisionUserDefaultsOnce(userId);

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
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    throw new Response("Unauthenticated", { status: 401 });
  }

  return userId;
}
