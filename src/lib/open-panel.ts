import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/** Kapı açık mod: giriş ekranı yok; ilk aktif yönetici olarak oturum taklidi (sadece güvenilir ortamda). */
export function isOpenPanel(): boolean {
  const v = process.env.ECYCHAT_OPEN_PANEL;
  return v === "true" || v === "1";
}

export async function getSessionIfOpenPanel(): Promise<Session | null> {
  if (!isOpenPanel()) return null;
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
}
