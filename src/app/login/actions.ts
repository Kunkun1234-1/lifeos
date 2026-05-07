"use server";

import { signOut as authSignOut } from "@/auth";

export async function signOutAction() {
  await authSignOut({ redirectTo: "/login" });
}
