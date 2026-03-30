import { auth } from "@/auth";
import { TeamManager } from "@/components/team-manager";
import { requireAdmin, requireOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const session = await auth();
  if (!requireOrg(session)) redirect("/login");
  if (!requireAdmin(session)) redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Ekip</h1>
      <p className="mt-1 text-sm text-zinc-500">Operatör oluşturma ve aktif / pasif durumu.</p>
      <div className="mt-8">
        <TeamManager users={users} />
      </div>
    </div>
  );
}
