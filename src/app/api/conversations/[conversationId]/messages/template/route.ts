import { MessageDirection, MessageType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { deliverOutboundTemplate } from "@/lib/deliver-text";
import { getConversationForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { notifyInbox } from "@/lib/realtime-notify";

const bodySchema = z.object({
  templateName: z.string().min(1).max(120),
  languageCode: z.string().min(2).max(12).optional().default("tr"),
  bodyParameter: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  const { conversationId } = await context.params;
  const raw = await req.json().catch(() => null);
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
    return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });
  }

  if (conv.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Arşivdeki konuşmaya gönderilemez; önce yeniden açın." },
      { status: 409 },
    );
  }

  const channelSecrets = await prisma.whatsAppChannel.findFirst({
    where: { id: conv.channelId, organizationId: session.user.organizationId },
    select: { metaPhoneNumberId: true, graphApiAccessToken: true },
  });

  const { templateName, languageCode, bodyParameter } = parsed.data;

  let waMessageId: string;
  try {
    const out = await deliverOutboundTemplate({
      phoneNumberId: channelSecrets?.metaPhoneNumberId,
      toWaId: conv.contact.waId,
      templateName,
      languageCode,
      bodyParameter,
      channelToken: channelSecrets?.graphApiAccessToken,
      envToken: process.env.WHATSAPP_ACCESS_TOKEN,
    });
    waMessageId = out.waMessageId;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gönderim başarısız";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const summary = bodyParameter?.trim()
    ? `[Şablon: ${templateName}] ${bodyParameter.trim()}`
    : `[Şablon: ${templateName}]`;
  const now = new Date();

  try {
    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        body: summary,
        waMessageId,
        sentByUserId: session.user.id,
        createdAt: now,
      },
    });

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: now },
    });

    revalidatePath(`/dashboard/inbox/${conversationId}`);
    revalidatePath("/dashboard/inbox");
    notifyInbox(session.user.organizationId, conversationId);

    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Bu mesaj zaten kayıtlı (yinelenen Meta ID)." },
        { status: 409 },
      );
    }
    throw e;
  }
}
