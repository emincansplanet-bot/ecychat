import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * Varsayılan: açık (şifresiz, doğrudan dashboard — ilk aktif yönetici taklidi).
 * Kapatmak için: ECYCHAT_OPEN_PANEL=false veya 0.
 */
export function isOpenPanel(): boolean {
  const v = process.env.ECYCHAT_OPEN_PANEL?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return true;
}

export async function getSessionIfOpenPanel(): Promise<Session | null> {
  if (!isOpenPanel()) return null;
  try {
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN, active: true },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) return null;
    return {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name ?? admin.email,
        role: admin.role as "ADMIN" | "OPERATOR",
        organizationId: admin.organizationId,
      },
    };
  } catch {
    /* Docker build / DB kapalı: Prisma yok say; auth() normal akışa düşer. */
    return null;
  }
}
