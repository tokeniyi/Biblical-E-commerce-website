import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import {
  AUTH_DEV_EMAIL,
  AUTH_DEV_PASSWORD,
  AUTH_DEV_USER_ID,
  AUTH_SECRET,
} from "./infrastructure/config/env";
import { decodeApiJwt, encodeApiJwt } from "./auth/jwt-codec";
export { decodeApiJwt, encodeApiJwt } from "./auth/jwt-codec";

export async function authorizeDevelopmentCredentials(
  credentials: Partial<Record<"email" | "password", unknown>> | undefined,
) {
  if (
    !AUTH_DEV_EMAIL ||
    !AUTH_DEV_PASSWORD ||
    !AUTH_DEV_USER_ID ||
    credentials?.email !== AUTH_DEV_EMAIL ||
    credentials?.password !== AUTH_DEV_PASSWORD
  ) {
    return null;
  }

  return {
    id: AUTH_DEV_USER_ID,
    email: AUTH_DEV_EMAIL,
    name: "Development User",
  };
}

export const authConfig = {
  secret: AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Development credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeDevelopmentCredentials,
    }),
  ],
  session: { strategy: "jwt" },
  // Auth.js defaults to encrypted JWE sessions. The architecture requires
  // NestJS to verify the same token independently, so this explicit JWS
  // contract is shared by Auth.js and passport-jwt.
  jwt: {
    encode: encodeApiJwt,
    decode: decodeApiJwt,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? "";
        session.user.name = token.name ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
