"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConversationStatusToggle({
  conversationId,
  isArchived,
}: {
  conversationId: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: "OPEN" | "ARCHIVED") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Güncellenemedi");
        return;
      }
      if (next === "ARCHIVED") {
        router.push("/dashboard/inbox");
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {isArchived ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStatus("OPEN")}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
        >
          {pending ? "…" : "Yeniden aç"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStatus("ARCHIVED")}
          className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          {pending ? "…" : "Arşive al"}
        </button>
      )}
    </div>
  );
}
