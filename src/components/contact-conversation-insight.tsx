function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContactConversationInsight({
  total,
  inbound,
  outbound,
  firstAt,
  lastAt,
}: {
  total: number;
  inbound: number;
  outbound: number;
  firstAt: Date | null;
  lastAt: Date | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600">
      <p className="font-semibold uppercase tracking-wide text-zinc-500">Sohbet özeti</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-zinc-500">Toplam mesaj</dt>
        <dd className="text-right font-medium tabular-nums text-zinc-900">{total}</dd>
        <dt className="text-zinc-500">Gelen</dt>
        <dd className="text-right tabular-nums text-zinc-800">{inbound}</dd>
        <dt className="text-zinc-500">Giden</dt>
        <dd className="text-right tabular-nums text-zinc-800">{outbound}</dd>
        <dt className="text-zinc-500">İlk</dt>
        <dd className="text-right text-zinc-700">{fmt(firstAt)}</dd>
        <dt className="text-zinc-500">Son</dt>
        <dd className="text-right text-zinc-700">{fmt(lastAt)}</dd>
      </dl>
    </div>
  );
}
