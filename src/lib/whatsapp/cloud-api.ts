type GraphSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string };
};

export async function sendWhatsAppText(params: {
  phoneNumberId: string;
  toWaId: string;
  text: string;
  accessToken: string;
  apiVersion?: string;
}): Promise<{ waMessageId: string }> {
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
      type: "text",
      text: { preview_url: false, body: params.text },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GraphSendResponse;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : `Meta HTTP ${res.status}`;
    throw new Error(msg);
  }

  const id = data.messages?.[0]?.id;
  if (typeof id !== "string") {
    throw new Error("Meta yanıtında mesaj kimliği yok");
  }
  return { waMessageId: id };
}
