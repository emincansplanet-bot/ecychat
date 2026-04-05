import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { parseOnDutySchedule } from "@/lib/on-duty-schedule";
import { notifyInbox, notifyTeam } from "@/lib/realtime-notify";
import { Prisma, UserRole } from "@prisma/client";

const timeHm = z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/);

const patchSchema = z
  .object({
    active: z.boolean().optional(),
    privacyRevealWaIdOverride: z.boolean().optional(),
    onDutySchedule: z
      .array(
        z.object({
          dow: z.number().int().min(0).max(6),
          start: timeHm,
          end: timeHm,
        }),
      )
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.active === undefined &&
      data.onDutySchedule === undefined &&
      data.privacyRevealWaIdOverride === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Geçersiz gövde",
      });
    }
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

  if (parsed.data.privacyRevealWaIdOverride !== undefined) {
    if (user.role !== UserRole.OPERATOR && user.role !== UserRole.NOBETCI) {
      return NextResponse.json(
        { error: "GSM görünürlük izni yalnızca operatör ve nöbetçi için" },
        { status: 400 },
      );
    }
  }

  if (parsed.data.onDutySchedule !== undefined) {
    if (user.role !== UserRole.NOBETCI) {
      return NextResponse.json(
        { error: "Nöbet takvimi yalnızca nöbetçi hesapları için" },
        { status: 400 },
      );
    }
    if (parsed.data.onDutySchedule === null) {
      // clear allowed
    } else {
      const sched = parseOnDutySchedule(parsed.data.onDutySchedule);
      if (!sched?.length) {
        return NextResponse.json({ error: "Geçersiz nöbet takvimi" }, { status: 400 });
      }
    }
  }

  const data: {
    active?: boolean;
    privacyRevealWaIdOverride?: boolean;
    onDutySchedule?: object[] | typeof Prisma.JsonNull;
  } = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.privacyRevealWaIdOverride !== undefined) {
    data.privacyRevealWaIdOverride = parsed.data.privacyRevealWaIdOverride;
  }
  if (parsed.data.onDutySchedule !== undefined) {
    if (parsed.data.onDutySchedule === null) {
      data.onDutySchedule = Prisma.JsonNull;
    } else {
      data.onDutySchedule = parseOnDutySchedule(parsed.data.onDutySchedule) as object[];
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data,
  });

  const auditMeta: Record<string, unknown> = { targetUserId: userId };
  if (parsed.data.active !== undefined) auditMeta.active = parsed.data.active;
  if (parsed.data.onDutySchedule !== undefined) auditMeta.onDutyScheduleUpdated = true;
  if (parsed.data.privacyRevealWaIdOverride !== undefined) {
    auditMeta.privacyRevealWaIdOverride = parsed.data.privacyRevealWaIdOverride;
  }

  const changeCount = [
    parsed.data.active !== undefined,
    parsed.data.onDutySchedule !== undefined,
    parsed.data.privacyRevealWaIdOverride !== undefined,
  ].filter(Boolean).length;

  let auditAction = "USER_ADMIN_PATCH";
  if (changeCount === 1) {
    if (parsed.data.active !== undefined) auditAction = "USER_ACTIVE_SET";
    else if (parsed.data.onDutySchedule !== undefined) auditAction = "USER_NOBET_SCHEDULE_SET";
    else if (parsed.data.privacyRevealWaIdOverride !== undefined) {
      auditAction = "USER_PRIVACY_WA_REVEAL";
    }
  }

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: auditAction,
    meta: auditMeta as Prisma.InputJsonValue,
  });

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/audit");
  revalidatePath("/dashboard/inbox");
  notifyTeam(session.user.organizationId);
  notifyInbox(session.user.organizationId);

  return NextResponse.json({ ok: true });
}
