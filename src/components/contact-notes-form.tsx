"use client";

import { PRESET_CONTACT_TAGS } from "@/lib/contact-tags";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ContactNotesForm({
  conversationId,
  displayName,
  notes,
  tags: tagsProp,
  role,
}: {
  conversationId: string;
  displayName: string;
  notes: string;
  tags: string[];
  role: "ADMIN" | "OPERATOR" | "NOBETCI";
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [n, setN] = useState(notes);
  const [tags, setTags] = useState<string[]>(tagsProp);
  const [customTag, setCustomTag] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(displayName);
    setN(notes);
    setTags(tagsProp);
  }, [displayName, notes, tagsProp]);

  function togglePreset(p: string) {
    setTags((prev) => {
      const has = prev.includes(p);
      const next = has ? prev.filter((t) => t !== p) : [...prev, p];
      return [...new Set(next)].slice(0, 15);
    });
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (!t) return;
    setTags((prev) => [...new Set([...prev, t])].slice(0, 15));
    setCustomTag("");
  }

  async function onSave() {
    setPending(true);
    setMsg(null);
    try {
      const payload =
        role === "ADMIN"
          ? { displayName: name.trim(), notes: n, tags }
          : { notes: n, tags };
      const res = await fetch(`/api/conversations/${conversationId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Kaydedilemedi");
        return;
      }
      setMsg("Kaydedildi.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Müşteri kartı</p>
      {role === "ADMIN" ? (
        <label className="mt-2 block text-sm">
          <span className="text-zinc-600">Görünen ad</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <div className="mt-3">
        <p className="text-sm text-zinc-600">Etiketler</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {PRESET_CONTACT_TAGS.map((p) => {
            const on = tags.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePreset(p)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  on
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="Özel etiket"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addCustomTag}
            className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Ekle
          </button>
        </div>
        {tags.length ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Seçili: {tags.join(", ")}
          </p>
        ) : null}
      </div>
      <label className="mt-3 block text-sm">
        <span className="text-zinc-600">Notlar</span>
        <textarea
          value={n}
          onChange={(e) => setN(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
      >
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>
      {msg ? <p className="mt-2 text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
