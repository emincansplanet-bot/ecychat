type GraphMediaMeta = {
  url?: string;
  mime_type?: string;
  error?: { message?: string };
};

export async function fetchWhatsAppMediaStream(params: {
  mediaId: string;
  accessToken: string;
  apiVersion?: string;
}): Promise<
  | { ok: true; stream: ReadableStream<Uint8Array>; contentType: string }
  | { ok: false; status: number; message: string }
> {
  const v =
    params.apiVersion?.trim() ||
    process.env.WHATSAPP_API_VERSION?.trim() ||
    "v22.0";
  const metaUrl = `https://graph.facebook.com/${v}/${encodeURIComponent(params.mediaId)}`;

  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  const meta = (await metaRes.json().catch(() => ({}))) as GraphMediaMeta;

  if (!metaRes.ok) {
    const msg =
      typeof meta.error?.message === "string"
        ? meta.error.message
        : `Meta medya meta HTTP ${metaRes.status}`;
    return { ok: false, status: metaRes.status === 404 ? 404 : 502, message: msg };
  }

  const downloadUrl = typeof meta.url === "string" ? meta.url : "";
  if (!downloadUrl) {
    return { ok: false, status: 502, message: "Meta medya URL dönmedi" };
  }

  const binRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });

  if (!binRes.ok || !binRes.body) {
    return {
      ok: false,
      status: 502,
      message: `Medya indirilemedi (HTTP ${binRes.status})`,
    };
  }

  const contentType =
    (typeof meta.mime_type === "string" && meta.mime_type) ||
    binRes.headers.get("content-type") ||
    "application/octet-stream";

  return { ok: true, stream: binRes.body, contentType };
}
