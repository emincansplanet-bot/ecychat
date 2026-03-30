import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { getDashboardStats } from "@/lib/dashboard-stats";

/** Panel özet metrikleri (JSON) — harici entegrasyon / yenileme için */
export async function GET() {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  const stats = await getDashboardStats({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role,
  });

  return NextResponse.json({
    role: session.user.role,
    ...stats,
  });
}
