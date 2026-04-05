import { auth } from "@/auth";
import { OrgPhonePrivacyCard } from "@/components/org-phone-privacy-card";
import { TeamManager } from "@/components/team-manager";
import { requireAdmin, requireOrg } from "@/lib/authz";
import { parsePrivacyPhoneRevealRoles } from "@/lib/org-privacy";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const session = await auth();
  if (!requireOrg(session)) redirect("/dashboard");
  if (!requireAdmin(session)) redirect("/dashboard");

  const [org, users] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { privacyPhoneRevealRoles: true },
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: [{ role: "asc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        onDutySchedule: true,
        privacyRevealWaIdOverride: true,
      },
    }),
  ]);

  const phoneRevealRoles = parsePrivacyPhoneRevealRoles(
    org?.privacyPhoneRevealRoles,
  ) as ("OPERATOR" | "NOBETCI")[];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Ekip</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Operatör ve nöbetçi oluşturma; nöbetçi için gün/saat pencereleri ve hesap durumu.
      </p>
      <div className="mt-8 space-y-8">
        <OrgPhonePrivacyCard initialRoles={phoneRevealRoles} />
        <TeamManager users={users} />
      </div>
    </div>
  );
}
