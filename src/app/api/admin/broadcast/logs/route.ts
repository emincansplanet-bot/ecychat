import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 200;

/** Toplu yayın geçmişi (JSON) — entegrasyon veya harici raporlama */
export async function GET(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  if (!requireAdmin(gate.session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const raw = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(raw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)))
    : 50;

  const logs = await prisma.broadcastLog.findMany({
    where: { organizationId: gate.session.user.organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      body: true,
      successCount: true,
      failCount: true,
      targetLimit: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      body: l.body,
      successCount: l.successCount,
      failCount: l.failCount,
      targetLimit: l.targetLimit,
      createdByName: l.createdBy?.name ?? l.createdBy?.email ?? null,
    })),
  });
}
