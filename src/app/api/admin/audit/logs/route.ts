import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 500;

/** Denetim günlüğü (JSON) — SIEM / harici arşiv */
export async function GET(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  if (!requireAdmin(gate.session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const raw = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(raw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)))
    : 100;

  const actionExact = searchParams.get("action")?.trim() ?? "";
  const actionPrefix = searchParams.get("actionPrefix")?.trim() ?? "";
  if (actionExact && actionPrefix) {
    return NextResponse.json(
      { error: "action ve actionPrefix birlikte kullanılamaz" },
      { status: 400 },
    );
  }
  if (actionExact.length > 80 || actionPrefix.length > 80) {
    return NextResponse.json({ error: "Filtre çok uzun" }, { status: 400 });
  }

  const rows = await prisma.auditLog.findMany({
    where: {
      organizationId: gate.session.user.organizationId,
      ...(actionExact
        ? { action: actionExact }
        : actionPrefix
          ? { action: { startsWith: actionPrefix } }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      meta: r.meta,
      actor: r.actor
        ? { id: r.actor.id, email: r.actor.email, name: r.actor.name }
        : null,
    })),
  });
}
