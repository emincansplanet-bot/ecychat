"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RevealRole = "OPERATOR" | "NOBETCI";

export function OrgPhonePrivacyCard({ initialRoles }: { initialRoles: RevealRole[] }) {
  const router = useRouter();
  const [operator, setOperator] = useState(initialRoles.includes("OPERATOR"));
  const [nobetc, setNobetc] = useState(initialRoles.includes("NOBETCI"));
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const privacyPhoneRevealRoles: RevealRole[] = [];
    if (operator) privacyPhoneRevealRoles.push("OPERATOR");
    if (nobetc) privacyPhoneRevealRoles.push("NOBETCI");
    try {
      const res = await fetch("/api/admin/org/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyPhoneRevealRoles }),
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
    <form
      onSubmit={save}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <h3 className="font-medium text-zinc-900">Müşteri GSM ve hat kimliği</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Varsayılan olarak yalnızca <strong className="font-medium text-zinc-700">yönetici</strong> tam
        müşteri WhatsApp numarasını ve Meta <code className="rounded bg-zinc-100 px-1 text-[11px]">phone_number_id</code>{" "}
        satırını görür. Operatör ve nöbetçi için son dört haneyi maskeli gösterim kullanılır.
      </p>
      <div className="mt-4 space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={operator}
            onChange={(e) => setOperator(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Tüm operatörler tam numarayı görsün
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={nobetc}
            onChange={(e) => setNobetc(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Nöbetçi rolü tam numarayı görsün
        </label>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Ayrıca aşağıdaki tabloda tek tek hesaplara „onaylı izin“ verebilirsiniz (rol bazı kutular
        kapalı olsa bile).
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
      >
        {pending ? "Kaydediliyor…" : "Rol ayarını kaydet"}
      </button>
      {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}
    </form>
  );
}
