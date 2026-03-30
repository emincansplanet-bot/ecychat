"use client";

import { useState } from "react";

export function CopyTextButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* yoksay */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 ${className}`}
    >
      {done ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}
