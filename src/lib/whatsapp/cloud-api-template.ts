type GraphSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string };
};

export async function sendWhatsAppTemplate(params: {
  phoneNumberId: string;
  toWaId: string;
  accessToken: string;
  templateName: string;
  languageCode: string;
  bodyParameter?: string;
  apiVersion?: string;
}): Promise<{ waMessageId: string }> {
  const v =
    params.apiVersion?.trim() ||
    process.env.WHATSAPP_API_VERSION?.trim() ||
    "v22.0";
  const url = `https://graph.facebook.com/${v}/${params.phoneNumberId}/messages`;

  const bodyComponents =
    params.bodyParameter && params.bodyParameter.trim().length > 0
      ? [
          {
            type: "body",
            parameters: [{ type: "text", text: params.bodyParameter.trim() }],
          },
        ]
      : [];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.toWaId,
      type: "template",
      template: {
        name: params.templateName.trim(),
        language: { code: params.languageCode.trim() },
        ...(bodyComponents.length ? { components: bodyComponents } : {}),
      },
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
