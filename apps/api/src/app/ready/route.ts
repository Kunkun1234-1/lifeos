import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`select 1`;
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
