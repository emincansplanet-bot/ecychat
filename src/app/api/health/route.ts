import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Uptime / LB: auth yok. ?db=1 ile PostgreSQL ping (LIVE izleme). */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ts = new Date().toISOString();
  const base = { ok: true as const, service: "ecychat", ts };

  const checkDb = new URL(req.url).searchParams.get("db") === "1";
  if (!checkDb) {
    return NextResponse.json(base);
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ...base, db: "up" });
  } catch {
    return NextResponse.json(
      { ok: false, service: "ecychat", db: "down", ts },
      { status: 503 },
    );
  }
}
