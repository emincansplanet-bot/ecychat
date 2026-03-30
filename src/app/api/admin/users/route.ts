import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { notifyInbox, notifyTeam } from "@/lib/realtime-notify";
import { UserRole } from "@prisma/client";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().max(120).optional(),
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

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name?.trim() || null,
        role: UserRole.OPERATOR,
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
