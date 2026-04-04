import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Giriş kaldırıldı; her zaman panele. */
export default function LoginPage() {
  redirect("/dashboard");
}
