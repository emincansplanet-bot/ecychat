import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { notifyContent, notifyInbox } from "@/lib/realtime-notify";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(4096).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await context.params;
  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const existing = await prisma.quickReply.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const data: {
    title?: string;
    body?: string;
    sortOrder?: number;
    active?: boolean;
  } = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
  if (parsed.data.body !== undefined) data.body = parsed.data.body.trim();
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  await prisma.quickReply.update({ where: { id }, data });

  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/inbox");
  notifyContent(session.user.organizationId);
  notifyInbox(session.user.organizationId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.quickReply.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  await prisma.quickReply.delete({ where: { id } });

  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/inbox");
  notifyContent(session.user.organizationId);
  notifyInbox(session.user.organizationId);

  return NextResponse.json({ ok: true });
}
