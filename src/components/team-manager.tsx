"use client";

import { parseOnDutySchedule } from "@/lib/on-duty-schedule";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

const DOW_OPTIONS = [
  { v: 0, l: "Pazar" },
  { v: 1, l: "Pazartesi" },
  { v: 2, l: "Salı" },
  { v: 3, l: "Çarşamba" },
  { v: 4, l: "Perşembe" },
  { v: 5, l: "Cuma" },
  { v: 6, l: "Cumartesi" },
] as const;

type UserRoleRow = "ADMIN" | "OPERATOR" | "NOBETCI";

type DutyWindow = { dow: number; start: string; end: string };

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: UserRoleRow;
  active: boolean;
  onDutySchedule: unknown;
  privacyRevealWaIdOverride: boolean;
};

function windowsFromRaw(raw: unknown): DutyWindow[] {
  const p = parseOnDutySchedule(raw);
  if (p?.length) return p.map((w) => ({ dow: w.dow, start: w.start, end: w.end }));
  return [{ dow: 1, start: "09:00", end: "18:00" }];
}

function roleLabel(role: UserRoleRow): string {
  switch (role) {
    case "ADMIN":
      return "Yönetici";
    case "NOBETCI":
      return "Nöbetçi";
    default:
      return "Operatör";
  }
}

function ScheduleRows({
  windows,
  onChange,
}: {
  windows: DutyWindow[];
  onChange: (next: DutyWindow[]) => void;
}) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Nöbet pencereleri (yerel saat, 0=Pazar)
      </p>
      {windows.map((w, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-600">
            Gün
            <select
              className="mt-0.5 block rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
              value={w.dow}
              onChange={(e) => {
                const next = [...windows];
                next[i] = { ...next[i], dow: Number(e.target.value) };
                onChange(next);
              }}
            >
              {DOW_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-600">
            Başlangıç
            <input
              type="time"
              className="mt-0.5 block rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
              value={w.start}
              onChange={(e) => {
                const next = [...windows];
                next[i] = { ...next[i], start: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label className="text-xs text-zinc-600">
            Bitiş
            <input
              type="time"
              className="mt-0.5 block rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
              value={w.end}
              onChange={(e) => {
                const next = [...windows];
                next[i] = { ...next[i], end: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(windows.filter((_, j) => j !== i))}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-white"
          >
            Sil
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...windows, { dow: 1, start: "09:00", end: "18:00" }])
        }
        className="text-xs font-medium text-emerald-700 hover:underline"
      >
        + Pencere ekle
      </button>
    </div>
  );
}

export function TeamManager({ users }: { users: Row[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [createRole, setCreateRole] = useState<"OPERATOR" | "NOBETCI">("OPERATOR");
  const [createWindows, setCreateWindows] = useState<DutyWindow[]>([
    { dow: 1, start: "09:00", end: "18:00" },
  ]);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        email,
        password,
        name: name.trim() || undefined,
        role: createRole,
      };
      if (createRole === "NOBETCI") body.onDutySchedule = createWindows;

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Oluşturulamadı");
        return;
      }
      setEmail("");
      setPassword("");
      setName("");
      setCreateRole("OPERATOR");
      setCreateWindows([{ dow: 1, start: "09:00", end: "18:00" }]);
      setMsg("Kullanıcı oluşturuldu.");
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

  async function saveSchedule(userId: string, windows: DutyWindow[]) {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onDutySchedule: windows }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Takvim kaydedilemedi");
      return;
    }
    setMsg("Nöbet takvimi güncellendi.");
    router.refresh();
  }

  async function setWaReveal(userId: string, privacyRevealWaIdOverride: boolean) {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyRevealWaIdOverride }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "İzin güncellenemedi");
      return;
    }
    setMsg("GSM görünürlük izni güncellendi.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={createUser}
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h3 className="font-medium text-zinc-900">Yeni kullanıcı</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Operatör (atamalı çalışma) veya nöbetçi (tanımlı saatlerde yalnız yanıt bekleyen açık
          konuşmalar).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <label className="flex flex-col text-xs text-zinc-600">
            Rol
            <select
              className="mt-0.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value as "OPERATOR" | "NOBETCI")}
            >
              <option value="OPERATOR">Operatör</option>
              <option value="NOBETCI">Nöbetçi</option>
            </select>
          </label>
        </div>
        {createRole === "NOBETCI" ? (
          <ScheduleRows windows={createWindows} onChange={setCreateWindows} />
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Ekleniyor…" : "Kullanıcı ekle"}
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
              <TeamUserRow
                key={u.id}
                user={u}
                onSetActive={setActive}
                onSaveSchedule={saveSchedule}
                onSetWaReveal={setWaReveal}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamUserRow({
  user: u,
  onSetActive,
  onSaveSchedule,
  onSetWaReveal,
}: {
  user: Row;
  onSetActive: (id: string, active: boolean) => void;
  onSaveSchedule: (id: string, windows: DutyWindow[]) => void;
  onSetWaReveal: (id: string, reveal: boolean) => void;
}) {
  const [editWindows, setEditWindows] = useState<DutyWindow[]>(() => windowsFromRaw(u.onDutySchedule));
  const schedKey = JSON.stringify(u.onDutySchedule ?? null);
  useEffect(() => {
    setEditWindows(windowsFromRaw(u.onDutySchedule));
  }, [u.id, schedKey]);

  const waRevealRow =
    u.role === "OPERATOR" || u.role === "NOBETCI" ? (
      <label className="mt-2 flex cursor-pointer items-center justify-end gap-2 text-[11px] text-zinc-600">
        <input
          type="checkbox"
          checked={u.privacyRevealWaIdOverride}
          onChange={(e) => onSetWaReveal(u.id, e.target.checked)}
          className="rounded border-zinc-300"
        />
        Onaylı tam GSM
      </label>
    ) : null;

  if (u.role === "NOBETCI") {
    return (
      <Fragment>
        <tr>
          <td className="px-4 py-3">
            <p className="font-medium text-zinc-900">{u.name ?? "—"}</p>
            <p className="text-xs text-zinc-500">{u.email}</p>
          </td>
          <td className="px-4 py-3 text-zinc-600">{roleLabel(u.role)}</td>
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
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => onSetActive(u.id, !u.active)}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                {u.active ? "Pasifleştir" : "Aktifleştir"}
              </button>
              {waRevealRow}
            </div>
          </td>
        </tr>
        <tr className="bg-zinc-50/50">
          <td colSpan={4} className="px-4 py-3">
            <ScheduleRows windows={editWindows} onChange={setEditWindows} />
            <button
              type="button"
              onClick={() => onSaveSchedule(u.id, editWindows)}
              className="mt-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-900"
            >
              Nöbet takvimini kaydet
            </button>
          </td>
        </tr>
      </Fragment>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900">{u.name ?? "—"}</p>
        <p className="text-xs text-zinc-500">{u.email}</p>
      </td>
      <td className="px-4 py-3 text-zinc-600">{roleLabel(u.role)}</td>
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
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => onSetActive(u.id, !u.active)}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              {u.active ? "Pasifleştir" : "Aktifleştir"}
            </button>
            {waRevealRow}
          </div>
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}
