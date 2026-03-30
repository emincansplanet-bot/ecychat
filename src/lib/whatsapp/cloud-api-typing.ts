type GraphErr = { error?: { message?: string } };

/**
 * Müşteriye “yazıyor” göstergesi (Meta sürümüne göre gövde değişebilir).
 * @see https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators/
 */
export async function sendWhatsAppTypingIndicator(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  apiVersion?: string;
}): Promise<void> {
  const v =
    params.apiVersion?.trim() ||
    process.env.WHATSAPP_API_VERSION?.trim() ||
    "v22.0";
  const url = `https://graph.facebook.com/${v}/${params.phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.toWaId,
      typing_indicator: { type: "text" },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GraphErr;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : `Meta typing HTTP ${res.status}`;
    throw new Error(msg);
  }
}
