import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveOrgSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { notifyChannels, notifyInbox } from "@/lib/realtime-notify";

const patchSchema = z.object({
  internalLabel: z.string().min(1).max(120).optional(),
  metaPhoneNumberId: z.string().max(64).nullable().optional(),
  graphApiAccessToken: z.string().max(2000).nullable().optional(),
});

type RouteContext = { params: Promise<{ channelId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { channelId } = await context.params;
  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const existing = await prisma.whatsAppChannel.findFirst({
    where: { id: channelId, organizationId: session.user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Hat yok" }, { status: 404 });
  }

  const nextMeta = parsed.data.metaPhoneNumberId;
  const nextToken = parsed.data.graphApiAccessToken;

  const data: {
    internalLabel?: string;
    metaPhoneNumberId?: string | null;
    graphApiAccessToken?: string | null;
  } = {};

  if (parsed.data.internalLabel !== undefined) {
    data.internalLabel = parsed.data.internalLabel;
  }
  if (nextMeta !== undefined) {
    const trimmed = nextMeta?.trim() || null;
    data.metaPhoneNumberId = trimmed;
  }
  if (nextToken !== undefined) {
    if (nextToken === null) {
      data.graphApiAccessToken = null;
    } else {
      const t = nextToken.trim();
      data.graphApiAccessToken = t.length ? t : null;
    }
  }

  const changedFields: string[] = [];
  if (parsed.data.internalLabel !== undefined) changedFields.push("internalLabel");
  if (nextMeta !== undefined) changedFields.push("metaPhoneNumberId");
  if (nextToken !== undefined) changedFields.push("graphApiAccessToken");

  try {
    await prisma.whatsAppChannel.update({
      where: { id: channelId },
      data,
    });
  } catch {
    return NextResponse.json(
      { error: "Kayıt hatası (phone_number_id benzersiz olmalı)" },
      { status: 400 },
    );
  }

  await logAudit({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "CHANNEL_UPDATE",
    meta: { channelId, fields: changedFields },
  });

  revalidatePath("/dashboard/channels");
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/audit");
  notifyChannels(session.user.organizationId);
  notifyInbox(session.user.organizationId);

  return NextResponse.json({ ok: true });
}
