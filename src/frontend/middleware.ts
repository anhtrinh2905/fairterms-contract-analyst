import { NextResponse } from "next/server";

export function middleware() {
  // Pass-through middleware. Security is enforced in Node.js server layout.tsx
  // to avoid Prisma db session Edge runtime incompatibility in NextAuth v5.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
