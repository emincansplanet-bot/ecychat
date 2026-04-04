import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionIfOpenPanel } from "@/lib/open-panel";
import authConfig from "./auth.config";

const credentialsSchema = z.object({
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.string().email(),
  ),
  password: z.string().min(1),
});

const { handlers, auth: authConfigured, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          });
        } catch {
          const err = new CredentialsSignin();
          err.code = "database";
          throw err;
        }

        if (!user || !user.active) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
});

/** Sunucu bileşenleri / API: ECYCHAT_OPEN_PANEL=true iken şifresiz ilk yönetici oturumu. */
export async function auth() {
  const open = await getSessionIfOpenPanel();
  if (open) return open;
  return authConfigured();
}

export { handlers, signIn, signOut };
