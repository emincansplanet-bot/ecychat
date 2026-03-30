import { MessageDirection, MessageType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { deliverOutboundMedia } from "@/lib/deliver-text";
import { getConversationForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { notifyInbox } from "@/lib/realtime-notify";

const MAX_BYTES = 15 * 1024 * 1024;

type RouteContext = { params: Promise<{ conversationId: string }> };

function buildStoredBody(params: {
  filename: string;
  caption?: string;
  demo: boolean;
}): string {
  const c = params.caption?.trim();
  if (params.demo) {
    return `[Demo medya: ${params.filename}]${c ? ` — ${c}` : ""}`;
  }
  if (c) return c;
  return `📎 ${params.filename}`;
}

export async function POST(req: Request, context: RouteContext) {
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
    return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });
  }

  if (conv.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Arşivdeki konuşmaya gönderilemez; önce yeniden açın." },
      { status: 409 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz form verisi" }, { status: 400 });
  }

  const file = form.get("file");
  const captionRaw = form.get("caption");
  const caption =
    typeof captionRaw === "string" && captionRaw.trim() ? captionRaw.trim().slice(0, 1024) : undefined;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Dosya en fazla 15 MB olabilir" }, { status: 400 });
  }

  const channelSecrets = await prisma.whatsAppChannel.findFirst({
    where: { id: conv.channelId, organizationId: session.user.organizationId },
    select: { metaPhoneNumberId: true, graphApiAccessToken: true },
  });

  const buffer = await file.arrayBuffer();
  const mimeType = file.type || "application/octet-stream";
  const filename = file.name?.trim() || "file";

  let waMessageId: string;
  let messageType: MessageType;
  let mode: "mock" | "meta";

  try {
    const out = await deliverOutboundMedia({
      phoneNumberId: channelSecrets?.metaPhoneNumberId,
      toWaId: conv.contact.waId,
      buffer,
      mimeType,
      filename,
      caption,
      channelToken: channelSecrets?.graphApiAccessToken,
      envToken: process.env.WHATSAPP_ACCESS_TOKEN,
    });
    waMessageId = out.waMessageId;
    messageType = out.messageType;
    mode = out.mode;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gönderim başarısız";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const now = new Date();
  const body = buildStoredBody({
    filename,
    caption,
    demo: mode === "mock",
  });

  try {
    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: MessageDirection.OUTBOUND,
        type: messageType,
        body,
        waMessageId,
        sentByUserId: session.user.id,
        createdAt: now,
      },
    });

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: now },
    });

    await logAudit({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      action: "OUTBOUND_MEDIA",
      meta: {
        conversationId: conv.id,
        messageType,
        filename: filename.slice(0, 120),
        mock: mode === "mock",
      },
    });

    revalidatePath(`/dashboard/inbox/${conversationId}`);
    revalidatePath("/dashboard/inbox");
    revalidatePath("/dashboard/audit");
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
