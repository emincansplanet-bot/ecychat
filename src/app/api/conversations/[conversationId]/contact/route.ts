import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { tagsToPrismaJson } from "@/lib/contact-tags";
import { getConversationForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { notifyInbox } from "@/lib/realtime-notify";

const bodySchema = z.object({
  notes: z.string().max(8000).optional(),
  displayName: z.string().max(200).optional(),
  tags: z.array(z.string().min(1).max(40)).max(15).optional(),
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

  const data: {
    notes?: string;
    displayName?: string | null;
    tags?: ReturnType<typeof tagsToPrismaJson>;
  } = {};
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.displayName !== undefined) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Adı yalnızca yönetici değiştirebilir" }, { status: 403 });
    }
    const trimmed = parsed.data.displayName.trim();
    data.displayName = trimmed.length ? trimmed : null;
  }
  if (parsed.data.tags !== undefined) {
    data.tags = tagsToPrismaJson(parsed.data.tags);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  await prisma.contact.update({
    where: { id: conv.contactId },
    data,
  });

  const fields: string[] = [];
  if (parsed.data.notes !== undefined) fields.push("notes");
  if (parsed.data.displayName !== undefined) fields.push("displayName");
  if (parsed.data.tags !== undefined) fields.push("tags");

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "CONTACT_UPDATE",
    meta: { conversationId: conv.id, contactId: conv.contactId, fields },
  });

  revalidatePath(`/dashboard/inbox/${conversationId}`);
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/audit");
  notifyInbox(session.user.organizationId, conversationId);

  return NextResponse.json({ ok: true });
}
