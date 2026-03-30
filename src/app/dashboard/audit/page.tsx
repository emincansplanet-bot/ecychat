import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ action?: string; actionPrefix?: string }>;
};

function chipClass(active: boolean) {
  return `rounded-full px-3 py-1 text-xs font-medium transition ${
    active
      ? "bg-emerald-600 text-white shadow-sm"
      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
  }`;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user;
  if (!user?.organizationId) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const actionExact =
    typeof sp.action === "string" && sp.action.trim() ? sp.action.trim() : "";
  const actionPrefix =
    typeof sp.actionPrefix === "string" && sp.actionPrefix.trim()
      ? sp.actionPrefix.trim()
      : "";

  const rows = await prisma.auditLog.findMany({
    where: {
      organizationId: user.organizationId,
      ...(actionExact
        ? { action: actionExact }
        : actionPrefix
          ? { action: { startsWith: actionPrefix } }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { email: true, name: true } },
    },
  });

  const none = !actionExact && !actionPrefix;
  const isExport = !actionExact && actionPrefix === "EXPORT_";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Denetim günlüğü</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Son 100 kritik aksiyon (yayın, hat, ekip, atama, müşteri kartı, giden medya; CSV indirmeleri:
          EXPORT_MESSAGES_CSV, EXPORT_AUDIT_CSV, EXPORT_BROADCAST_CSV; konuşma durumu). JSON:{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">
            GET /api/admin/audit/logs?limit=100
          </code>
          — isteğe bağlı{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">action=…</code> (tam eşleşme) veya{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">actionPrefix=EXPORT_</code>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/audit" className={chipClass(none)}>
            Tümü
          </Link>
          <Link
            href="/dashboard/audit?action=BROADCAST_SEND"
            className={chipClass(actionExact === "BROADCAST_SEND")}
          >
            Yayın
          </Link>
          <Link
            href="/dashboard/audit?actionPrefix=EXPORT_"
            className={chipClass(isExport)}
          >
            CSV dışa aktarma
          </Link>
          <Link
            href="/dashboard/audit?action=CONVERSATION_ASSIGN"
            className={chipClass(actionExact === "CONVERSATION_ASSIGN")}
          >
            Atama
          </Link>
          <Link
            href="/dashboard/audit?action=CONTACT_UPDATE"
            className={chipClass(actionExact === "CONTACT_UPDATE")}
          >
            Müşteri kartı
          </Link>
          <Link
            href="/dashboard/audit?action=CHANNEL_UPDATE"
            className={chipClass(actionExact === "CHANNEL_UPDATE")}
          >
            Hat
          </Link>
          <Link
            href="/dashboard/audit?action=USER_ACTIVE_SET"
            className={chipClass(actionExact === "USER_ACTIVE_SET")}
          >
            Ekip aktif/pasif
          </Link>
        </div>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Özete dön
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Zaman</th>
              <th className="px-4 py-3">İşlem</th>
              <th className="px-4 py-3">Kim</th>
              <th className="px-4 py-3">Detay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                  {none ? "Henüz kayıt yok." : "Bu filtreyle kayıt yok."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {r.createdAt.toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-800">{r.action}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {r.actor ? (r.actor.name ?? r.actor.email) : "—"}
                  </td>
                  <td className="max-w-md break-all px-4 py-3 font-mono text-xs text-zinc-500">
                    {r.meta == null
                      ? "—"
                      : JSON.stringify(r.meta as Record<string, unknown>)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
