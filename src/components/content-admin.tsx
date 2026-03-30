"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type QR = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  active: boolean;
};

type Promo = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  active: boolean;
};

export function ContentAdmin({
  quickReplies: initialQr,
  promotions: initialPromo,
}: {
  quickReplies: QR[];
  promotions: Promo[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function run(url: string, init: RequestInit) {
    setMsg(null);
    const res = await fetch(url, init);
    const raw = await res.text();
    let data: { error?: string } = {};
    if (raw) {
      try {
        data = JSON.parse(raw) as { error?: string };
      } catch {
        /* gövde yok veya JSON değil */
      }
    }
    if (!res.ok) throw new Error(data.error ?? "Hata");
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Hızlı yanıtlar</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sohbette chip: başlık kutuya ekler; yeşil ok ile doğrudan gönderilir.
        </p>
        <NewQuickReplyForm
          onCreate={async (payload) => {
            try {
              await run("/api/admin/quick-replies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Kayıt hatası");
            }
          }}
        />
        <ul className="mt-4 space-y-3">
          {initialQr.map((row) => (
            <QuickReplyRow
              key={row.id}
              row={row}
              onError={(m) => setMsg(m)}
              onSave={async (id, patch) => {
                await run(`/api/admin/quick-replies/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(patch),
                });
              }}
              onDelete={async (id) => {
                await run(`/api/admin/quick-replies/${id}`, { method: "DELETE" });
              }}
            />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Promosyonlar</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sohbet sağ panelinde kopyalanabilir veya tek tıkla müşteriye gönderilebilir.
        </p>
        <NewPromoForm
          onCreate={async (payload) => {
            try {
              await run("/api/admin/promotions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Kayıt hatası");
            }
          }}
        />
        <ul className="mt-4 space-y-3">
          {initialPromo.map((row) => (
            <PromoRow
              key={row.id}
              row={row}
              onError={(m) => setMsg(m)}
              onSave={async (id, patch) => {
                await run(`/api/admin/promotions/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(patch),
                });
              }}
              onDelete={async (id) => {
                await run(`/api/admin/promotions/${id}`, { method: "DELETE" });
              }}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function NewQuickReplyForm({
  onCreate,
}: {
  onCreate: (p: { title: string; body: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;
        setPending(true);
        try {
          await onCreate({ title: title.trim(), body: body.trim() });
          setTitle("");
          setBody("");
        } finally {
          setPending(false);
        }
      }}
    >
      <input
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="Başlık"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        rows={2}
        placeholder="Mesaj metni"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Ekleniyor…" : "Hızlı yanıt ekle"}
      </button>
    </form>
  );
}

function QuickReplyRow({
  row,
  onSave,
  onDelete,
  onError,
}: {
  row: QR;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [body, setBody] = useState(row.body);
  const [sortOrder, setSortOrder] = useState(row.sortOrder);
  const [active, setActive] = useState(row.active);
  const [pending, setPending] = useState(false);

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Aktif
        </label>
      </div>
      <textarea
        className="mt-2 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          onClick={async () => {
            setPending(true);
            try {
              await onSave(row.id, { title, body, sortOrder, active });
            } catch (e) {
              onError(e instanceof Error ? e.message : "Kayıt hatası");
            } finally {
              setPending(false);
            }
          }}
        >
          Kaydet
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700"
          onClick={async () => {
            if (!confirm("Silinsin mi?")) return;
            setPending(true);
            try {
              await onDelete(row.id);
            } catch (e) {
              onError(e instanceof Error ? e.message : "Silinemedi");
            } finally {
              setPending(false);
            }
          }}
        >
          Sil
        </button>
      </div>
    </li>
  );
}

function NewPromoForm({
  onCreate,
}: {
  onCreate: (p: { title: string; body: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4 flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;
        setPending(true);
        try {
          await onCreate({ title: title.trim(), body: body.trim() });
          setTitle("");
          setBody("");
        } finally {
          setPending(false);
        }
      }}
    >
      <input
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="Başlık"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        rows={3}
        placeholder="Promosyon metni"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Ekleniyor…" : "Promosyon ekle"}
      </button>
    </form>
  );
}

function PromoRow({
  row,
  onSave,
  onDelete,
  onError,
}: {
  row: Promo;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [body, setBody] = useState(row.body);
  const [sortOrder, setSortOrder] = useState(row.sortOrder);
  const [active, setActive] = useState(row.active);
  const [pending, setPending] = useState(false);

  return (
    <li className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Aktif
        </label>
      </div>
      <textarea
        className="mt-2 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          onClick={async () => {
            setPending(true);
            try {
              await onSave(row.id, { title, body, sortOrder, active });
            } catch (e) {
              onError(e instanceof Error ? e.message : "Kayıt hatası");
            } finally {
              setPending(false);
            }
          }}
        >
          Kaydet
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700"
          onClick={async () => {
            if (!confirm("Silinsin mi?")) return;
            setPending(true);
            try {
              await onDelete(row.id);
            } catch (e) {
              onError(e instanceof Error ? e.message : "Silinemedi");
            } finally {
              setPending(false);
            }
          }}
        >
          Sil
        </button>
      </div>
    </li>
  );
}
