import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { provisionUserDefaults, ensureDevTestCurrency } from "@/lib/provision";

const isDev = process.env.NODE_ENV !== "production";
const hasGoogle =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

/**
 * Auth.js v5 (next-auth) configuration.
 *
 * Strategy:
 * - Production / multi-user: Google OAuth via `Google` provider.
 * - Local dev: a Credentials "magic dev login" that always logs you in as the
 *   first user (id taken from env or auto-created). No password.
 *
 * Sessions are JWT (not DB sessions) so the Prisma adapter is only used for
 * the OAuth account/user upserts.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(isDev
      ? [
          Credentials({
            id: "dev",
            name: "Dev Login",
            credentials: {},
            authorize: async () => {
              // In dev mode, log in as the first existing user, or auto-create one.
              let user = await prisma.user.findFirst({
                where: { email: "dev@local" },
              });
              if (!user) {
                user = await prisma.user.create({
                  data: { email: "dev@local", name: "Dev Player" },
                });
              }
              await provisionUserDefaults(user.id);
              // Existing local accounts still get topped up to the generous floor.
              await ensureDevTestCurrency(user.id);
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) token.userId = user.id;
      if (account?.provider === "google" && token.userId) {
        // First-time google login: provision defaults if not already done.
        await provisionUserDefaults(token.userId as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
