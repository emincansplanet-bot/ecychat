import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { notifyInbox, notifyTeam } from "@/lib/realtime-notify";
import { UserRole } from "@prisma/client";
import { parseOnDutySchedule } from "@/lib/on-duty-schedule";

const timeHm = z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/);

const createSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6).max(128),
    name: z.string().max(120).optional(),
    role: z.enum(["OPERATOR", "NOBETCI"]).default("OPERATOR"),
    onDutySchedule: z
      .array(
        z.object({
          dow: z.number().int().min(0).max(6),
          start: timeHm,
          end: timeHm,
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "NOBETCI") return;
    const parsed = parseOnDutySchedule(data.onDutySchedule);
    if (!parsed?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nöbetçi için en az bir geçerli gün/saat penceresi gerekli (ör. dow 0–6, HH:mm)",
        path: ["onDutySchedule"],
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
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const role =
    parsed.data.role === "NOBETCI" ? UserRole.NOBETCI : UserRole.OPERATOR;
  const onDutySchedule =
    role === UserRole.NOBETCI
      ? (parseOnDutySchedule(parsed.data.onDutySchedule) as object[])
      : undefined;

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name?.trim() || null,
        role,
        onDutySchedule: onDutySchedule ?? undefined,
        organizationId: session.user.organizationId,
        active: true,
      },
    });
  } catch {
    return NextResponse.json({ error: "E-posta zaten kayıtlı" }, { status: 400 });
  }

  revalidatePath("/dashboard/team");
  notifyTeam(session.user.organizationId);
  notifyInbox(session.user.organizationId);

  return NextResponse.json({ ok: true });
}
