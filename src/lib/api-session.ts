import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { isUserActive, requireOrg } from "@/lib/authz";

export type ActiveOrgSession = Session & {
  user: { id: string; organizationId: string; role: "ADMIN" | "OPERATOR" };
};

/**
 * Tüm panel API’leri için: oturum + devre dışı hesap kontrolü (JWT tek başına yetmez).
 */
export async function requireActiveOrgSession(): Promise<
  | { ok: true; session: ActiveOrgSession }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!requireOrg(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }),
    };
  }
  if (!(await isUserActive(session.user.id))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Hesap devre dışı" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
