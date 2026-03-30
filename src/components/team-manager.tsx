"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "OPERATOR";
  active: boolean;
};

export function TeamManager({ users }: { users: Row[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createOperator(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Oluşturulamadı");
        return;
      }
      setEmail("");
      setPassword("");
      setName("");
      setMsg("Operatör oluşturuldu.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function setActive(userId: string, active: boolean) {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Güncellenemedi");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={createOperator}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h3 className="font-medium text-zinc-900">Yeni operatör</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            required
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            placeholder="Şifre (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Ad (isteğe bağlı)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Ekleniyor…" : "Operatör ekle"}
        </button>
      </form>

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{u.name ?? "—"}</p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600">{u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {u.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role === "OPERATOR" ? (
                    <button
                      type="button"
                      onClick={() => setActive(u.id, !u.active)}
                      className="text-xs font-medium text-emerald-700 hover:underline"
                    >
                      {u.active ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
