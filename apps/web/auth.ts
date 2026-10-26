import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Not used by the wireframe build: the mock server owns sessions until the
// real API lands (docs/WIREFRAME_BUILD_SPEC.md §0, decision 2).
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const { email, password } = credentials;
        if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
          return null;
        }
        return {
          id: "00000000-0000-0000-0000-000000000000",
          email,
          name: "Test User",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on sign-in, despite the non-optional type.
      if ((user as typeof user | undefined) !== undefined) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub;
      session.user.email = token.email;
      session.user.name = token.name;
      return session;
    },
  },
});
