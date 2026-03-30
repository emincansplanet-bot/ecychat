import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { notifyContent, notifyInbox } from "@/lib/realtime-notify";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4096),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const rows = await prisma.promotion.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  await prisma.promotion.create({
    data: {
      organizationId: session.user.organizationId,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      sortOrder: parsed.data.sortOrder ?? 0,
      active: parsed.data.active ?? true,
    },
  });

  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/inbox");
  notifyContent(session.user.organizationId);
  notifyInbox(session.user.organizationId);

  return NextResponse.json({ ok: true });
}
