import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/user";
import { getBPSnapshot } from "@/lib/battlepass";

export async function GET() {
  const userId = await getCurrentUserId();
  const snap = await getBPSnapshot(userId);
  return NextResponse.json(snap);
}
