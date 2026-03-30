import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 100;

/** Yönetici: tüm hatlarda metin gövdesi araması (PostgreSQL contains — harf duyarlı) */
export async function GET(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  if (!requireAdmin(gate.session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ error: "En az 2 karakter girin" }, { status: 400 });
  }
  if (q.length > 200) {
    return NextResponse.json({ error: "Arama en fazla 200 karakter" }, { status: 400 });
  }

  const rawLimit = Number(searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit)))
    : 40;

  const rows = await prisma.message.findMany({
    where: {
      conversation: { organizationId: gate.session.user.organizationId },
      body: { contains: q },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      direction: true,
      body: true,
      conversationId: true,
      conversation: {
        select: {
          channel: { select: { internalLabel: true } },
          contact: { select: { waId: true, displayName: true } },
        },
      },
    },
  });

  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      direction: r.direction,
      bodyPreview: (r.body ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
      conversationId: r.conversationId,
      channelLabel: r.conversation.channel.internalLabel,
      contactWaId: r.conversation.contact.waId,
      contactName: r.conversation.contact.displayName,
    })),
  });
}
