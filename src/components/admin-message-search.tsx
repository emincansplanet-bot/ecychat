"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

type Hit = {
  id: string;
  createdAt: string;
  direction: string;
  bodyPreview: string;
  conversationId: string;
  channelLabel: string;
  contactWaId: string;
  contactName: string | null;
};

export function AdminMessageSearch() {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Hit[] | null>(null);

  const search = useCallback(async () => {
    const t = q.trim();
    if (t.length < 2) {
      setError("En az 2 karakter yazın.");
      setResults(null);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/search/messages?q=${encodeURIComponent(t)}&limit=50`,
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        results?: Hit[];
      };
      if (!res.ok) {
        setError(data.error ?? "Arama başarısız");
        setResults(null);
        return;
      }
      setResults(data.results ?? []);
    } finally {
      setPending(false);
    }
  }, [q]);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-zinc-600">
        Tüm hatlarda mesaj metninde arar (PostgreSQL: contains, harf duyarlı). Sonuçlardan konuşmaya
        gidebilirsiniz.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
          placeholder="Örn. sipariş, fiyat, teşekkür…"
          className="min-w-[200px] flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={pending}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Aranıyor…" : "Ara"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {results && results.length === 0 ? (
        <p className="text-sm text-zinc-500">Eşleşme yok.</p>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {results.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`/dashboard/inbox/${r.conversationId}`}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Konuşmaya git →
                </Link>
                <span className="text-xs text-zinc-400">
                  {new Date(r.createdAt).toLocaleString("tr-TR")} · {r.direction} ·{" "}
                  {r.channelLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {(r.contactName || r.contactWaId).toString()}
              </p>
              <p className="mt-1 text-sm text-zinc-800">{r.bodyPreview}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
