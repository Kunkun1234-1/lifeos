import { prisma } from "./prisma";

/**
 * Phase 1 MVP is single-user. This returns "the" user (first in table),
 * auto-creating if somehow missing. Phase 2 will swap this out for auth-derived lookup.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({
    include: { currency: true },
  });
  if (user) return user;

  // Fallback: auto-provision. Seed should have run, but be resilient.
  return prisma.user.create({
    data: {
      name: "Player One",
      currency: { create: {} },
    },
    include: { currency: true },
  });
}

export async function getCurrentUserId(): Promise<string> {
  const u = await getCurrentUser();
  return u.id;
}
