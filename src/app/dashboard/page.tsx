import { auth } from "@/auth";
import { PRESET_CONTACT_TAGS } from "@/lib/contact-tags";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { inboxListPathFromParts } from "@/lib/inbox-filters";
import Link from "next/link";

const unassignedInboxHref = inboxListPathFromParts({ filter: "unassigned" });

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const isNobetc = user?.role === "NOBETCI";
  const canSeeUnassignedNav = isAdmin || isNobetc;

  const stats =
    user?.organizationId && user.id && user.role
      ? await getDashboardStats({
          organizationId: user.organizationId,
          userId: user.id,
          role: user.role,
        })
      : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Özet</h1>
        <p className="mt-1 text-sm text-zinc-500">{user?.name ?? user?.email}</p>
      </div>

      {isNobetc && stats && stats.shiftActive === false ? (
        <div className="mb-6 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Şu an nöbet saatiniz dışındasınız. Gelen kutusu ve özet yalnızca tanımlı gün/saat
          aralığında yanıt bekleyen konuşmalar için açılır.
        </div>
      ) : null}

      {stats ? (
        <>
          <section
            className={`mb-8 grid gap-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Açık konuşma
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
                {stats.openConversations}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/80">
                Yanıtsız (son mesaj müşteri)
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-950">
                {stats.unansweredConversations}
              </p>
            </div>
            {isAdmin ? (
              <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900/80">
                  Atanmamış açık
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-sky-950">
                  {stats.unassignedOpen}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Bugün gelen
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
                {stats.inboundToday}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Bugün giden
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
                {stats.outboundToday}
              </p>
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-zinc-900">Günlük özet raporu</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Dün (tam gün) ile bugün karşılaştırması ve son 7 gün mesaj hacmi.
                </p>
              </div>
              {isAdmin ? (
                <code className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
                  GET /api/dashboard/stats
                </code>
              ) : null}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                <p className="text-xs font-medium text-zinc-500">Dün gelen</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                  {stats.inboundYesterday}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                <p className="text-xs font-medium text-zinc-500">Dün giden</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                  {stats.outboundYesterday}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                <p className="text-xs font-medium text-zinc-500">Bugün gelen</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">
                  {stats.inboundToday}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                <p className="text-xs font-medium text-zinc-500">Bugün giden</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">
                  {stats.outboundToday}
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto">
              <h3 className="mb-3 text-sm font-semibold text-zinc-800">Son 7 gün (gün bazlı)</h3>
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Tarih</th>
                    <th className="py-2 pr-4 font-medium">Gelen</th>
                    <th className="py-2 font-medium">Giden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {stats.last7Days.map((row) => (
                    <tr key={row.date}>
                      <td className="py-2 pr-4 font-mono text-xs text-zinc-700">{row.date}</td>
                      <td className="py-2 pr-4 tabular-nums text-zinc-800">{row.inbound}</td>
                      <td className="py-2 tabular-nums text-zinc-800">{row.outbound}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isAdmin && stats.operatorActivityToday.length > 0 ? (
              <div className="mt-8 overflow-x-auto">
                <h3 className="mb-1 text-sm font-semibold text-zinc-800">
                  Operatör özeti (bugün)
                </h3>
                <p className="mb-3 text-xs text-zinc-500">
                  Gelen: mesaj geldiğinde o konuşmada atanmış olan kullanıcı. Giden: mesajı gönderen
                  kullanıcı. Açık atama: şu an üzerinde olan açık konuşmalar.
                  {stats.operatorActivityToday[0]?.messagesToday ? (
                    <>
                      {" "}
                      En yoğun:{" "}
                      <span className="font-medium text-zinc-700">
                        {stats.operatorActivityToday[0].name}
                      </span>{" "}
                      ({stats.operatorActivityToday[0].messagesToday} mesaj).
                    </>
                  ) : null}
                </p>
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Kullanıcı</th>
                      <th className="py-2 pr-4 font-medium">Rol</th>
                      <th className="py-2 pr-4 text-right font-medium">Açık atama</th>
                      <th className="py-2 pr-4 text-right font-medium">Gelen</th>
                      <th className="py-2 pr-4 text-right font-medium">Giden</th>
                      <th className="py-2 text-right font-medium">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {stats.operatorActivityToday.map((op, i) => (
                      <tr
                        key={op.userId}
                        className={i === 0 && op.messagesToday > 0 ? "bg-emerald-50/50" : undefined}
                      >
                        <td className="py-2 pr-4 text-zinc-800">
                          {op.name}
                          <span className="mt-0.5 block text-[11px] text-zinc-400">{op.email}</span>
                        </td>
                        <td className="py-2 pr-4 text-zinc-600">
                          {op.role === "NOBETCI" ? "Nöbetçi" : "Operatör"}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-zinc-900">
                          {op.openAssigned}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-zinc-800">
                          {op.inboundToday}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-zinc-800">
                          {op.outboundToday}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium text-zinc-900">
                          {op.messagesToday}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          {isAdmin && stats.broadcastSummary ? (
            <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-zinc-900">Yayın özeti</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Son 30 gün: toplu mesaj çalıştırmaları ve teslim sayıları (kayıtlı yayınlar).
                  </p>
                </div>
                <Link
                  href="/dashboard/broadcast"
                  className="shrink-0 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Yayın sayfası →
                </Link>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                  <p className="text-xs font-medium text-zinc-500">Çalıştırma (30 gün)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                    {stats.broadcastSummary.last30Days.runs}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                  <p className="text-xs font-medium text-zinc-500">Başarılı gönderim (30 gün)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">
                    {stats.broadcastSummary.last30Days.successTotal}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                  <p className="text-xs font-medium text-zinc-500">Hata (30 gün)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-red-800/90">
                    {stats.broadcastSummary.last30Days.failTotal}
                  </p>
                </div>
              </div>
              {stats.broadcastSummary.lastRun ? (
                <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Son yayın
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {new Date(stats.broadcastSummary.lastRun.createdAt).toLocaleString("tr-TR")}
                    {stats.broadcastSummary.lastRun.authorLabel
                      ? ` · ${stats.broadcastSummary.lastRun.authorLabel}`
                      : ""}
                  </p>
                  <p className="mt-2 text-sm text-zinc-800">
                    {stats.broadcastSummary.lastRun.bodyPreview || "—"}
                  </p>
                  <p className="mt-2 text-xs tabular-nums text-zinc-600">
                    Başarılı {stats.broadcastSummary.lastRun.successCount} · Hata{" "}
                    {stats.broadcastSummary.lastRun.failCount} · Limit{" "}
                    {stats.broadcastSummary.lastRun.targetLimit}
                  </p>
                </div>
              ) : (
                <p className="mt-6 text-sm text-zinc-500">Henüz yayın kaydı yok.</p>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      <section className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-zinc-900">Durum</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Gelen kutusu (SSE), içerik, yayın, hat/ekip, atama, etiketler ve şablon gönderimi hazır.
            Canlı Meta için DEMO_MOCK_SEND=false ve token ayarlayın.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/inbox"
              className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Gelen kutusu
            </Link>
            {stats ? (
              <Link
                href="/dashboard/inbox?filter=unanswered"
                className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Yanıtsızlar
              </Link>
            ) : null}
            {canSeeUnassignedNav ? (
              <Link
                href={unassignedInboxHref}
                className="inline-flex rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100"
              >
                Atanmamış konuşmalar
              </Link>
            ) : null}
            {PRESET_CONTACT_TAGS.map((preset) => (
              <Link
                key={preset}
                href={inboxListPathFromParts({ tag: preset })}
                className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                {preset}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5">
            <h3 className="font-medium text-zinc-900">Hızlı yanıtlar</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {stats
                ? `${stats.quickReplyCount} aktif kayıt — İçerik menüsünden yönetin.`
                : "—"}
            </p>
            <Link
              href="/dashboard/content"
              className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              İçeriğe git →
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5">
            <h3 className="font-medium text-zinc-900">Atamalar</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {isAdmin
                ? "Konuşma sayfasından operatör atayın; operatör yalnızca kendisine atananları görür."
                : "Size atanan konuşmalar gelen kutusunda listelenir."}
            </p>
          </div>
          {isAdmin ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:col-span-2">
              <h3 className="font-medium text-emerald-900">Yönetici</h3>
              <p className="mt-1 text-sm text-emerald-800/90">
                Tüm sohbetleri görebilirsiniz. Kritik aksiyonlar{" "}
                <Link href="/dashboard/audit" className="font-semibold underline">
                  Denetim
                </Link>{" "}
                sayfasında izlenir; mesaj raporu için{" "}
                <Link href="/dashboard/export" className="font-semibold underline">
                  Dışa aktarma
                </Link>
                ; tam metin arama:{" "}
                <Link href="/dashboard/search" className="font-semibold underline">
                  Arama
                </Link>
                ; yayın geçmişi JSON:{" "}
                <code className="rounded bg-emerald-100/80 px-1 text-[11px]">
                  GET /api/admin/broadcast/logs
                </code>
                .
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
