import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import prisma from "./lib/prisma";

function requireServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: requireServerEnv("AUTH_SECRET"),
  trustHost: true,
  session: {
    strategy: "database",
  },
  providers: [
    Google({
      clientId: requireServerEnv("AUTH_GOOGLE_ID"),
      clientSecret: requireServerEnv("AUTH_GOOGLE_SECRET"),
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
});
