import { MessageDirection } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { isDemoMockSendEnabled } from "@/lib/deliver-text";
import { getConversationForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { markWhatsAppMessageAsRead } from "@/lib/whatsapp/cloud-api-mark-read";

const bodySchema = z.object({
  waMessageId: z.string().min(1).max(200).optional(),
});

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  const { conversationId } = await context.params;
  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const conv = await getConversationForUser({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role,
    conversationId,
  });

  if (!conv) {
    return NextResponse.json({ error: "Konuşma yok" }, { status: 404 });
  }

  if (conv.status === "ARCHIVED") {
    return NextResponse.json({ ok: true, skipped: true, reason: "archived" });
  }

  let targetId = parsed.data.waMessageId?.trim();
  if (!targetId) {
    const last = await prisma.message.findFirst({
      where: {
        conversationId: conv.id,
        direction: MessageDirection.INBOUND,
        waMessageId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { waMessageId: true },
    });
    targetId = last?.waMessageId?.trim() ?? "";
  }

  if (!targetId) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_inbound_id" });
  }

  if (isDemoMockSendEnabled() || targetId.startsWith("mock_") || targetId.startsWith("seed-")) {
    return NextResponse.json({ ok: true, mock: true });
  }

  const channel = await prisma.whatsAppChannel.findFirst({
    where: { id: conv.channelId, organizationId: session.user.organizationId },
    select: { metaPhoneNumberId: true, graphApiAccessToken: true },
  });

  const token =
    (channel?.graphApiAccessToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim()) ?? "";
  const pid = channel?.metaPhoneNumberId?.trim() ?? "";
  if (!pid || !token) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_meta_config" });
  }

  try {
    await markWhatsAppMessageAsRead({
      phoneNumberId: pid,
      accessToken: token,
      waMessageId: targetId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Okundu işaretlenemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
