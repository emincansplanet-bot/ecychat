import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { getConversationForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { notifyInbox } from "@/lib/realtime-notify";

const bodySchema = z.object({
  status: z.enum(["OPEN", "ARCHIVED"]),
});

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
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
    return NextResponse.json({ error: "Konuşma yok" }, { status: 404 });
  }

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "CONVERSATION_STATUS",
    meta: { conversationId: conv.id, status: parsed.data.status },
  });

  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/audit");
  notifyInbox(session.user.organizationId, conversationId);

  return NextResponse.json({ ok: true });
}
