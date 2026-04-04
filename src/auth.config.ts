import type { NextAuthConfig } from "next-auth";

/** Nginx / TLS sonlandırma arkasında __Host- CSRF çerezi bazen reddedilir; daha uyumlu isim kullan. */
function authCookieSecure(): boolean {
  const origin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  if (origin.startsWith("https://")) return true;
  if (origin.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}

const secureCookies = authCookieSecure();

/** Edge-safe: no Prisma/bcrypt/Credentials — used by middleware only. */
export default {
  trustHost: true,
  cookies: {
    csrfToken: {
      name: "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookies,
      },
    },
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user && "role" in user && user.role) {
        token.role = user.role as "ADMIN" | "OPERATOR";
        token.sub = user.id;
        if ("organizationId" in user && user.organizationId) {
          token.organizationId = user.organizationId;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "ADMIN" | "OPERATOR") ?? "OPERATOR";
        session.user.organizationId = (token.organizationId as string) ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
