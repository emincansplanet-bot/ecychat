import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { csvLine } from "@/lib/csv";
import { normalizeContactTagsJson } from "@/lib/contact-tags";
import { prisma } from "@/lib/prisma";

const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_ROWS = 25_000;

function parseDayParam(s: string | null, end: boolean): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return end
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function filenameDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const defaultFrom = new Date(defaultTo.getTime() - 29 * 24 * 60 * 60 * 1000);
  defaultFrom.setHours(0, 0, 0, 0);

  let to = parseDayParam(searchParams.get("to"), true) ?? defaultTo;
  let from = parseDayParam(searchParams.get("from"), false) ?? defaultFrom;

  if (from.getTime() > to.getTime()) {
    const a = new Date(from);
    const b = new Date(to);
    from = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 0, 0, 0, 0);
    to = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 23, 59, 59, 999);
  }

  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Tarih aralığı en fazla 90 gün olabilir" }, { status: 400 });
  }

  const rows = await prisma.message.findMany({
    where: {
      conversation: { organizationId: session.user.organizationId },
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_ROWS,
    select: {
      id: true,
      createdAt: true,
      direction: true,
      type: true,
      body: true,
      conversationId: true,
      conversation: {
        select: {
          channel: { select: { internalLabel: true } },
          contact: { select: { waId: true, displayName: true, tags: true } },
        },
      },
      sentBy: { select: { email: true, name: true } },
    },
  });

  const header = csvLine([
    "tarih",
    "yön",
    "tür",
    "kanal",
    "müşteri_wa_id",
    "müşteri_adı",
    "müşteri_etiketleri",
    "gönderen",
    "mesaj",
    "konuşma_id",
    "mesaj_id",
  ]);

  const lines = [header];
  for (const r of rows) {
    const bodyPreview = r.body?.replace(/\s+/g, " ").trim() ?? "";
    const tagStr = normalizeContactTagsJson(r.conversation.contact.tags).join("; ");
    lines.push(
      csvLine([
        r.createdAt.toISOString(),
        r.direction,
        r.type,
        r.conversation.channel.internalLabel,
        r.conversation.contact.waId,
        r.conversation.contact.displayName ?? "",
        tagStr,
        r.sentBy ? (r.sentBy.name ?? r.sentBy.email) : "",
        bodyPreview.slice(0, 8000),
        r.conversationId,
        r.id,
      ]),
    );
  }

  const csv = `\ufeff${lines.join("\n")}`;

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "EXPORT_MESSAGES_CSV",
    meta: {
      from: from.toISOString(),
      to: to.toISOString(),
      rowCount: rows.length,
      capped: rows.length >= MAX_ROWS,
    },
  });

  const fname = `ecychat-mesajlar-${filenameDate(from)}_${filenameDate(to)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
