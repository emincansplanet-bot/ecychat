/** Tek nöbet penceresi: `dow` JS ile aynı (0=Pazar … 6=Cumartesi), `start`/`end` "HH:mm", sunucu yerel saati. */

export type OnDutyWindow = {
  dow: number;
  start: string;
  end: string;
};

const timeRe = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function parseOnDutySchedule(raw: unknown): OnDutyWindow[] | null {
  if (!raw || !Array.isArray(raw)) return null;
  const out: OnDutyWindow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const dow = Number(o.dow);
    const start = String(o.start ?? "").trim();
    const end = String(o.end ?? "").trim();
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) continue;
    if (!timeRe.test(start) || !timeRe.test(end)) continue;
    out.push({ dow, start, end });
  }
  return out.length ? out : null;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Verilen anda herhangi bir pencere içinde mi (aynı gün içi; gece yarısı geçişi yok). */
export function isWithinOnDutyWindow(raw: unknown, at: Date): boolean {
  const windows = parseOnDutySchedule(raw);
  if (!windows?.length) return false;
  const dow = at.getDay();
  const nowMin = at.getHours() * 60 + at.getMinutes();
  for (const w of windows) {
    if (w.dow !== dow) continue;
    const a = toMinutes(w.start);
    const b = toMinutes(w.end);
    if (a <= b) {
      if (nowMin >= a && nowMin <= b) return true;
    } else {
      if (nowMin >= a || nowMin <= b) return true;
    }
  }
  return false;
}
