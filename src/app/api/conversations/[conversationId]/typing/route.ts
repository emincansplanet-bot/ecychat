import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { isDemoMockSendEnabled } from "@/lib/deliver-text";
import { getConversationForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTypingIndicator } from "@/lib/whatsapp/cloud-api-typing";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  const { conversationId } = await context.params;

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
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (isDemoMockSendEnabled()) {
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
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await sendWhatsAppTypingIndicator({
      phoneNumberId: pid,
      accessToken: token,
      toWaId: conv.contact.waId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Typing başarısız";
    console.warn("[typing]", conversationId, message);
    return NextResponse.json({ ok: true, skipped: true });
  }
}
