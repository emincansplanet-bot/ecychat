import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { getConversationForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { fetchWhatsAppMediaStream } from "@/lib/whatsapp/fetch-graph-media";
import { parseWaMediaRef } from "@/lib/whatsapp/wa-media-ref";

type RouteContext = {
  params: Promise<{ conversationId: string; messageId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  const { conversationId, messageId } = await context.params;

  const conv = await getConversationForUser({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role,
    conversationId,
  });
  if (!conv) {
    return NextResponse.json({ error: "Konuşma yok" }, { status: 404 });
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId: conv.id },
    select: { mediaUrl: true },
  });
  if (!message) {
    return NextResponse.json({ error: "Mesaj yok" }, { status: 404 });
  }

  const mediaId = parseWaMediaRef(message.mediaUrl);
  if (!mediaId) {
    return NextResponse.json({ error: "Bu mesajda Meta medyası yok" }, { status: 404 });
  }

  const channel = await prisma.whatsAppChannel.findFirst({
    where: { id: conv.channelId, organizationId: session.user.organizationId },
    select: { graphApiAccessToken: true },
  });

  const token =
    (channel?.graphApiAccessToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim()) ?? "";
  if (!token) {
    return NextResponse.json(
      { error: "Medya için Graph token gerekli (hat veya WHATSAPP_ACCESS_TOKEN)." },
      { status: 503 },
    );
  }

  const out = await fetchWhatsAppMediaStream({
    mediaId,
    accessToken: token,
  });

  if (!out.ok) {
    return NextResponse.json({ error: out.message }, { status: out.status });
  }

  return new Response(out.stream, {
    headers: {
      "Content-Type": out.contentType,
      "Cache-Control": "private, max-age=120",
    },
  });
}
