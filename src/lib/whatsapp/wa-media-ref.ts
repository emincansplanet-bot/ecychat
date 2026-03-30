/** Sunucuda Meta medya kimliğini `Message.mediaUrl` içinde saklamak için önek (HTTP URL değil). */
export const WA_MEDIA_PREFIX = "wa-media:" as const;

export function parseWaMediaRef(url: string | null | undefined): string | null {
  if (!url?.startsWith(WA_MEDIA_PREFIX)) return null;
  const id = url.slice(WA_MEDIA_PREFIX.length).trim();
  return id.length ? id : null;
}

export function buildWaMediaRef(mediaId: string): string {
  return `${WA_MEDIA_PREFIX}${mediaId.trim()}`;
}
