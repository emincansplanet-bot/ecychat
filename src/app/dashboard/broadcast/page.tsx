import Link from "next/link";
import { auth } from "@/auth";
import { BroadcastPanel } from "@/components/broadcast-panel";
import { requireAdmin, requireOrg } from "@/lib/authz";
import { getOrgBroadcastSummary } from "@/lib/dashboard-stats";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function BroadcastPage() {
  const session = await auth();
  if (!requireOrg(session)) redirect("/dashboard");
  if (!requireAdmin(session)) redirect("/dashboard");

  const [logs, summary] = await Promise.all([
    prisma.broadcastLog.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    getOrgBroadcastSummary(session.user.organizationId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Yayın</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Toplu mesaj ve son gönderim özeti. Geçmiş JSON:{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">GET /api/admin/broadcast/logs?limit=50</code>
        ; gönderim önizlemesi:{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">POST /api/admin/broadcast</code> gövdesinde{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">preview: true</code>
        . CSV (tarih aralığı):{" "}
        <Link href="/dashboard/export" className="font-medium text-emerald-700 underline">
          Dışa aktarma
        </Link>{" "}
        veya{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">
          GET /api/admin/export/broadcast?from=YYYY-MM-DD&amp;to=YYYY-MM-DD
        </code>
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Son 30 gün çalıştırma
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
            {summary.last30Days.runs}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Başarılı gönderim (30 gün)
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-800">
            {summary.last30Days.successTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Hata (30 gün)
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-red-800/90">
            {summary.last30Days.failTotal}
          </p>
        </div>
      </section>

      <div className="mt-8">
        <BroadcastPanel />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900">Son kayıtlar</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Özet</th>
                <th className="px-4 py-3">Başarı / Hata</th>
                <th className="px-4 py-3">Limit</th>
                <th className="px-4 py-3">Kim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Henüz toplu gönderim yok.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {log.createdAt.toLocaleString("tr-TR")}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-800" title={log.body}>
                      {log.body}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-700">{log.successCount}</span>
                      <span className="text-zinc-400"> / </span>
                      <span className="text-red-600">{log.failCount}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{log.targetLimit}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {log.createdBy?.name ?? log.createdBy?.email ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
