"use client";

import { useMemo, useState } from "react";

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ExportMessagesForm() {
  const defaults = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 29);
    return { from: toInputDate(from), to: toInputDate(to) };
  }, []);

  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const href = `/api/admin/export/messages?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-zinc-700">
          Başlangıç (gün)
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm text-zinc-700">
          Bitiş (gün)
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        En fazla 90 günlük aralık; dosyada en çok 25.000 satır. UTF-8 (Excel için BOM ekli).
        İndirme denetim günlüğüne kaydedilir. CSV’de müşteri etiketleri{" "}
        <span className="font-mono text-[11px]">müşteri_etiketleri</span> sütununda (ayraç{" "}
        <span className="font-mono text-[11px]">;</span>).
      </p>
      <a
        href={href}
        className="inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        CSV indir
      </a>
    </div>
  );
}
