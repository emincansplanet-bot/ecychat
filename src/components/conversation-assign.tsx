"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ConversationAssignControl({
  conversationId,
  operators,
  currentOperatorId,
}: {
  conversationId: string;
  operators: { id: string; name: string | null; email: string }[];
  currentOperatorId: string | null;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(currentOperatorId ?? "");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setUserId(currentOperatorId ?? "");
  }, [currentOperatorId]);

  async function onSave() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId ? userId : null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Atama başarısız");
        return;
      }
      setMsg("Atama güncellendi.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Operatör ataması</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 sm:max-w-xs"
        >
          <option value="">— Atanmadı —</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name ?? o.email}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
