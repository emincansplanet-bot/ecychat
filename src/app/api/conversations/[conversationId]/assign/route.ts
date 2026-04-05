import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { canAssignConversations } from "@/lib/authz";
import { isWithinOnDutyWindow } from "@/lib/on-duty-schedule";
import { prisma } from "@/lib/prisma";
import { notifyInbox } from "@/lib/realtime-notify";

const bodySchema = z.object({
  userId: z.string().min(1).nullable(),
});

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!canAssignConversations(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  if (session.user.role === "NOBETCI") {
    const actor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onDutySchedule: true },
    });
    if (!isWithinOnDutyWindow(actor?.onDutySchedule ?? null, new Date())) {
      return NextResponse.json({ error: "Nöbet saati dışında atama yapılamaz" }, { status: 403 });
    }
  }

  const { conversationId } = await context.params;
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId: session.user.organizationId },
  });
  if (!conv) {
    return NextResponse.json({ error: "Konuşma yok" }, { status: 404 });
  }

  const now = new Date();

  await prisma.conversationAssignment.updateMany({
    where: { conversationId: conv.id, unassignedAt: null },
    data: { unassignedAt: now },
  });

  const targetId = parsed.data.userId;
  if (targetId) {
    const op = await prisma.user.findFirst({
      where: {
        id: targetId,
        organizationId: session.user.organizationId,
        role: "OPERATOR",
        active: true,
      },
    });
    if (!op) {
      return NextResponse.json({ error: "Operatör bulunamadı" }, { status: 400 });
    }
    await prisma.conversationAssignment.create({
      data: { conversationId: conv.id, userId: op.id },
    });
  }

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "CONVERSATION_ASSIGN",
    meta: {
      conversationId: conv.id,
      assignedUserId: targetId,
    },
  });

  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/audit");
  notifyInbox(session.user.organizationId, conversationId);

  return NextResponse.json({ ok: true });
}
