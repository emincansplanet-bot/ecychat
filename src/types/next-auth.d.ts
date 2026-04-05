import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "ADMIN" | "OPERATOR" | "NOBETCI";
    organizationId?: string;
  }

  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "OPERATOR" | "NOBETCI";
      organizationId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "OPERATOR" | "NOBETCI";
    organizationId?: string;
  }
}
