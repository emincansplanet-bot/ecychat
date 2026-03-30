import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  organizationId: string;
  actorUserId: string | undefined;
  action: string;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        meta: params.meta ?? undefined,
      },
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}
