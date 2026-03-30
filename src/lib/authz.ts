import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

export function requireOrg(session: Session | null): session is Session & {
  user: { id: string; organizationId: string; role: "ADMIN" | "OPERATOR" };
} {
  return Boolean(session?.user?.organizationId && session.user.id);
}

export function requireAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

/** Yönetici tarafından pasif yapılmış hesaplar (JWT hâlâ geçerli olsa bile API’yi kapatır). */
export async function isUserActive(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { active: true },
  });
  return Boolean(u?.active);
}
