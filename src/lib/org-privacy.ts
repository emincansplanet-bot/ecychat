import type { UserRole } from "@prisma/client";
import { UserRole as UserRoleEnum } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = new Set<UserRole>([
  UserRoleEnum.ADMIN,
  UserRoleEnum.OPERATOR,
  UserRoleEnum.NOBETCI,
]);

/** Org JSON: ek olarak tam numara görebilecek roller (ADMIN her zaman tam görür). */
export function parsePrivacyPhoneRevealRoles(raw: unknown): UserRole[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: UserRole[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    if (!VALID_ROLES.has(x as UserRole) || x === UserRoleEnum.ADMIN) continue;
    out.push(x as UserRole);
  }
  return [...new Set(out)];
}

export async function resolveCustomerPhoneReveal(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
}): Promise<boolean> {
  if (params.role === UserRoleEnum.ADMIN) return true;

  const [org, user] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { privacyPhoneRevealRoles: true },
    }),
    prisma.user.findUnique({
      where: { id: params.userId },
      select: { privacyRevealWaIdOverride: true },
    }),
  ]);

  if (user?.privacyRevealWaIdOverride) return true;

  const extra = parsePrivacyPhoneRevealRoles(org?.privacyPhoneRevealRoles);
  return extra.includes(params.role);
}
