"use client";

import { PRESET_CONTACT_TAGS } from "@/lib/contact-tags";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Audience = "all_open" | "unanswered" | "tag";

export function BroadcastPanel() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [limit, setLimit] = useState(50);
  const [audience, setAudience] = useState<Audience>("all_open");
  const [tag, setTag] = useState("");
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [previewHint, setPreviewHint] = useState<string | null>(null);

  async function onPreview() {
    if (audience === "tag" && !tag.trim()) {
      setPreviewHint("Etiket hedefi için bir etiket seçin veya yazın.");
      return;
    }
    setPreviewPending(true);
    setPreviewHint(null);
    try {
      const body: Record<string, unknown> = {
        text: text.trim(),
        limit,
        audience,
        preview: true,
      };
      if (audience === "tag") body.tag = tag.trim();
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        wouldSend?: number;
        limit?: number;
        audience?: string;
        tag?: string | null;
      };
      if (!res.ok) {
        setPreviewHint(data.error ?? "Önizleme alınamadı");
        return;
      }
      const scope =
        data.audience === "unanswered"
          ? "yanıtsız açık"
          : data.audience === "tag"
            ? `etiket:${data.tag ?? tag}`
            : "tüm açık";
      setPreviewHint(
        `Önizleme (${scope}): gönderimde en fazla ${data.wouldSend ?? 0} konuşma hedeflenir (üst limit: ${data.limit ?? limit}). Mesaj yazmadan da sayabilirsiniz.`,
      );
    } finally {
      setPreviewPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (audience === "tag" && !tag.trim()) {
      setResult("Etiket hedefi için bir etiket seçin veya yazın.");
      return;
    }
    setPending(true);
    setResult(null);
    setPreviewHint(null);
    try {
      const body: Record<string, unknown> = {
        text: text.trim(),
        limit,
        audience,
        preview: false,
      };
      if (audience === "tag") body.tag = tag.trim();
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        successCount?: number;
        failCount?: number;
        attempted?: number;
        audience?: string;
        tag?: string | null;
      };
      if (!res.ok) {
        setResult(data.error ?? "Gönderilemedi");
        return;
      }
      const scope =
        data.audience === "unanswered"
          ? "yanıtsız"
          : data.audience === "tag"
            ? `etiket:${data.tag ?? tag}`
            : "tüm açık";
      setResult(
        `Tamam (${scope}): ${data.successCount ?? 0} başarılı, ${data.failCount ?? 0} hata (denenen: ${data.attempted ?? 0}).`,
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm"
    >
      <h2 className="font-semibold text-zinc-900">Toplu metin gönderimi</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Hedef kitle + limit ile gerçekçi yayın. «Hedefi önizle» göndermeden kaç konuşmanın seçileceğini
        gösterir (mesaj boş olabilir). Açık konuşmalara gider; DEMO_MOCK_SEND açıksa Meta çağrısı yapılmaz.
        En fazla 200 konuşma / istek.
      </p>
      <textarea
        className="mt-4 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Gönderilecek mesaj…"
      />
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">Hedef</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(
              [
                ["all_open", "Tüm açık"],
                ["unanswered", "Yanıtsız"],
                ["tag", "Etiket"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAudience(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  audience === value
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {audience === "tag" ? (
          <div>
            <p className="text-xs text-zinc-600">Etiket</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PRESET_CONTACT_TAGS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTag(p)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    tag === p
                      ? "border-amber-600 bg-amber-100 text-amber-950"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Özel etiket…"
              className="mt-2 w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Konuşma limiti
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={previewPending || pending}
          onClick={() => void onPreview()}
          className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {previewPending ? "Hesaplanıyor…" : "Hedefi önizle"}
        </button>
        <button
          type="submit"
          disabled={pending || previewPending || !text.trim()}
          className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {pending ? "Gönderiliyor…" : "Gönder"}
        </button>
      </div>
      {previewHint ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-sm text-amber-950">
          {previewHint}
        </p>
      ) : null}
      {result ? <p className="mt-3 text-sm text-zinc-700">{result}</p> : null}
    </form>
  );
}
