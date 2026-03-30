"use client";

import { startTransition, useEffect, useState } from "react";

const LS_KEY = "ecychat-notify-nudge-dismissed";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    try {
      if (localStorage.getItem(LS_KEY)) return;
    } catch {
      return;
    }
    if (Notification.permission !== "default") return;
    startTransition(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <p className="leading-snug">
        Sekme arka plandayken gelen mesajlar için tarayıcı bildirimi açabilirsiniz (izin sizde).
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
          onClick={async () => {
            try {
              const p = await Notification.requestPermission();
              setShow(false);
              if (p === "denied") {
                try {
                  localStorage.setItem(LS_KEY, "1");
                } catch {
                  /* */
                }
              }
            } catch {
              setShow(false);
            }
          }}
        >
          Bildirim izni
        </button>
        <button
          type="button"
          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/80"
          onClick={() => {
            try {
              localStorage.setItem(LS_KEY, "1");
            } catch {
              /* */
            }
            setShow(false);
          }}
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
