import { MessageDirection, MessageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { resolveBroadcastRecipients } from "@/lib/broadcast-targets";
import { deliverOutboundText } from "@/lib/deliver-text";
import { prisma } from "@/lib/prisma";
import { notifyInbox } from "@/lib/realtime-notify";

const bodySchema = z
  .object({
    text: z.string().max(4096).optional().default(""),
    preview: z.boolean().optional().default(false),
    limit: z.number().int().min(1).max(200).optional().default(50),
    audience: z.enum(["all_open", "unanswered", "tag"]).optional().default("all_open"),
    tag: z.string().min(1).max(40).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.audience === "tag" && !val.tag?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Etiket hedefi için tag gerekli",
        path: ["tag"],
      });
    }
    if (!val.preview && val.text.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Gönderim için mesaj yazın",
        path: ["text"],
      });
    }
  });

export async function POST(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Geçersiz gövde";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const text = parsed.data.text.trim();
  const limit = parsed.data.limit;
  const audience = parsed.data.audience;
  const isPreview = parsed.data.preview;
  const tagFilter =
    audience === "tag" && parsed.data.tag?.trim()
      ? parsed.data.tag.trim()
      : null;

  const convs = await resolveBroadcastRecipients({
    organizationId: session.user.organizationId,
    limit,
    audience,
    tagFilter,
  });

  if (isPreview) {
    return NextResponse.json({
      ok: true,
      preview: true,
      wouldSend: convs.length,
      audience,
      tag: tagFilter,
      limit,
    });
  }

  let successCount = 0;
  let failCount = 0;
  const now = new Date();

  for (const conv of convs) {
    try {
      const out = await deliverOutboundText({
        phoneNumberId: conv.channel.metaPhoneNumberId,
        toWaId: conv.contact.waId,
        text,
        channelToken: conv.channel.graphApiAccessToken,
        envToken: process.env.WHATSAPP_ACCESS_TOKEN,
      });

      await prisma.message.create({
        data: {
          conversationId: conv.id,
          direction: MessageDirection.OUTBOUND,
          type: MessageType.TEXT,
          body: text,
          waMessageId: out.waMessageId,
          sentByUserId: session.user.id,
          createdAt: now,
        },
      });
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: now },
      });
      successCount += 1;
    } catch {
      failCount += 1;
    }
  }

  await prisma.broadcastLog.create({
    data: {
      organizationId: session.user.organizationId,
      body: `[${audience}${tagFilter ? `:${tagFilter}` : ""}] ${text}`,
      successCount,
      failCount,
      targetLimit: limit,
      createdByUserId: session.user.id,
    },
  });

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "BROADCAST_SEND",
    meta: {
      successCount,
      failCount,
      targetLimit: limit,
      attempted: convs.length,
      audience,
      tag: tagFilter,
    },
  });

  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/broadcast");
  revalidatePath("/dashboard/audit");
  notifyInbox(session.user.organizationId);

  return NextResponse.json({
    ok: true,
    successCount,
    failCount,
    attempted: convs.length,
    audience,
    tag: tagFilter,
  });
}
