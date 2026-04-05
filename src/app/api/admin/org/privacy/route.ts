import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const bodySchema = z.object({
  privacyPhoneRevealRoles: z.array(z.enum(["OPERATOR", "NOBETCI"])),
});

export async function PATCH(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const roles = [...new Set(parsed.data.privacyPhoneRevealRoles)];

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: {
      privacyPhoneRevealRoles: roles.length ? roles : Prisma.JsonNull,
    },
  });

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "ORG_PRIVACY_PHONE_ROLES",
    meta: { privacyPhoneRevealRoles: roles } as Prisma.InputJsonValue,
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/inbox");

  return NextResponse.json({ ok: true, privacyPhoneRevealRoles: roles });
}
