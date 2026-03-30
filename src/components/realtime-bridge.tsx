"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Sunucu tek süreç (npm run dev / node) iken SSE ile gelen kutusu canlı yenilenir.
 * Bağlantı koptuğunda yedek olarak yavaş polling.
 */
export function RealtimeBridge() {
  const router = useRouter();

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const startPoll = () => {
      if (poll) return;
      poll = setInterval(() => router.refresh(), 45000);
    };

    const stopPoll = () => {
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    };

    try {
      es = new EventSource("/api/events");
      es.onopen = () => stopPoll();
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data) as {
            type?: string;
            hint?: string;
            conversationId?: string;
          };
          if (d.type === "ping" || d.type === "connected") return;
          router.refresh();
          window.dispatchEvent(new CustomEvent("ecychat:realtime"));
          if (typeof window !== "undefined" && document.visibilityState === "hidden") {
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            ) {
              try {
                if (d.type === "inbox") {
                  const body =
                    typeof d.hint === "string" && d.hint.trim()
                      ? d.hint.trim()
                      : "Gelen kutusu güncellendi";
                  new Notification("ECYChat", {
                    body,
                    tag: d.conversationId ?? "ecychat-inbox",
                  });
                } else if (d.type === "content") {
                  new Notification("ECYChat", {
                    body: "Hızlı yanıt veya promosyon listesi güncellendi",
                    tag: "ecychat-content",
                  });
                }
              } catch {
                /* */
              }
            }
          }
        } catch {
          /* */
        }
      };
      es.onerror = () => {
        startPoll();
      };
    } catch {
      startPoll();
    }

    return () => {
      es?.close();
      stopPoll();
    };
  }, [router]);

  return null;
}
