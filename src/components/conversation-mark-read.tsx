"use client";

import { useEffect, useRef } from "react";

/**
 * Konuşma görüntülendiğinde Meta’da son gelen mesajı okundu işaretler (token + phone_number_id varsa).
 */
export function ConversationMarkRead({
  conversationId,
  waMessageId,
}: {
  conversationId: string;
  waMessageId: string | null;
}) {
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!waMessageId) return;
    if (doneRef.current === waMessageId) return;
    doneRef.current = waMessageId;

    void fetch(`/api/conversations/${conversationId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waMessageId }),
    }).catch(() => {
      /* sessiz: ağ / Meta hatası paneli bozmasın */
    });
  }, [conversationId, waMessageId]);

  return null;
}
