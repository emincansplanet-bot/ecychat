"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ChannelEditCard(props: {
  id: string;
  internalLabel: string;
  metaPhoneNumberId: string | null;
  hasToken: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(props.internalLabel);
  const [pid, setPid] = useState(props.metaPhoneNumberId ?? "");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLabel(props.internalLabel);
    setPid(props.metaPhoneNumberId ?? "");
  }, [props.internalLabel, props.metaPhoneNumberId]);

  async function onSave() {
    setPending(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        internalLabel: label.trim(),
        metaPhoneNumberId: pid.trim() || null,
      };
      if (token.trim()) {
        body.graphApiAccessToken = token.trim();
      }
      const res = await fetch(`/api/admin/channels/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Kaydedilemedi");
        return;
      }
      setToken("");
      setMsg("Kaydedildi.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function verifyConnection() {
    setVerifyPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/channels/${props.id}/verify`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        mock?: boolean;
        message?: string;
        displayPhoneNumber?: string | null;
        verifiedName?: string | null;
        qualityRating?: string | null;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Meta doğrulaması başarısız");
        return;
      }
      if (data.mock) {
        setMsg(data.message ?? "Demo modu: Graph çağrısı yok.");
        return;
      }
      const bits = [
        data.displayPhoneNumber ? `Numara: ${data.displayPhoneNumber}` : null,
        data.verifiedName ? `Ad: ${data.verifiedName}` : null,
        data.qualityRating ? `Kalite: ${data.qualityRating}` : null,
      ].filter(Boolean);
      setMsg(bits.length ? `Bağlantı OK — ${bits.join(" · ")}` : "Bağlantı OK.");
    } finally {
      setVerifyPending(false);
    }
  }

  async function clearToken() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/channels/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graphApiAccessToken: null }),
      });
      if (!res.ok) {
        setMsg("Token silinemedi");
        return;
      }
      setMsg("Token silindi.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-zinc-900">{props.internalLabel}</h3>
        <span className="text-xs text-zinc-500">
          Token: {props.hasToken ? "kayıtlı" : "yok"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-600">Etiket</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Meta phone_number_id</span>
          <input
            value={pid}
            onChange={(e) => setPid(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-zinc-600">Graph API token (hat bazlı)</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={props.hasToken ? "•••• değiştirmek için yeni girin" : "Yapıştırın"}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={verifyConnection}
          disabled={pending || verifyPending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {verifyPending ? "Meta kontrol…" : "Bağlantıyı doğrula"}
        </button>
        {props.hasToken ? (
          <button
            type="button"
            onClick={clearToken}
            disabled={pending}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Token sil
          </button>
        ) : null}
      </div>
      {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}
    </div>
  );
}
