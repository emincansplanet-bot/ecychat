type GraphErr = { error?: { message?: string } };

export async function markWhatsAppMessageAsRead(params: {
  phoneNumberId: string;
  accessToken: string;
  waMessageId: string;
  apiVersion?: string;
}): Promise<void> {
  const id = params.waMessageId.trim();
  if (!id || id.startsWith("mock_") || id.startsWith("seed-")) {
    return;
  }

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
      status: "read",
      message_id: id,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as GraphErr;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : `Meta okundu HTTP ${res.status}`;
    throw new Error(msg);
  }
}
