import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
