import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const users = [
  {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    email: "test@example.com",
    name: "Test User",
    password: "password123",
  },
];

export const { handlers, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        if (!credentials.email || !credentials.password) return null;

        const user = users.find(
          (u) =>
            u.email === credentials.email &&
            u.password === credentials.password,
        );

        if (!user) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token, user }) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.email = token.email as string;
      if (token.name) {
        session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
  },
});

export default auth;