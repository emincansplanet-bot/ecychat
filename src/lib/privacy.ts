/** Operatör arayüzünde ham WhatsApp kimliğini göstermemek için. */
export function maskWaId(waId: string): string {
  const digits = waId.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `••••${digits.slice(-4)}`;
}

/** Başlık metni: görünen ad varsa ad; yoksa tam veya maskeli waId. */
export function contactDisplayLabel(
  displayName: string | null | undefined,
  waId: string,
  revealFullWaId: boolean,
): string {
  if (displayName?.trim()) return displayName.trim();
  return revealFullWaId ? waId : maskWaId(waId);
}
