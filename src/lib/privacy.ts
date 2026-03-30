/** Operatör arayüzünde ham WhatsApp kimliğini göstermemek için. */
export function maskWaId(waId: string): string {
  const digits = waId.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `••••${digits.slice(-4)}`;
}

export function contactDisplayLabel(
  displayName: string | null | undefined,
  waId: string,
  role: "ADMIN" | "OPERATOR",
): string {
  if (displayName?.trim()) return displayName.trim();
  if (role === "ADMIN") return waId;
  return maskWaId(waId);
}
