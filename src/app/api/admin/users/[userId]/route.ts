import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { notifyInbox, notifyTeam } from "@/lib/realtime-notify";

const patchSchema = z.object({
  active: z.boolean(),
});

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Kendi hesabınızı kapatamazsınız" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.user.organizationId },
  });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı yok" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: parsed.data.active },
  });

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "USER_ACTIVE_SET",
    meta: { targetUserId: userId, active: parsed.data.active },
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/audit");
  revalidatePath("/dashboard/inbox");
  notifyTeam(session.user.organizationId);
  notifyInbox(session.user.organizationId);

  return NextResponse.json({ ok: true });
}
