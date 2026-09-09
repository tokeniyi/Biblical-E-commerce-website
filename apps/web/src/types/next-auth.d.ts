import { auth } from "@/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    email: string;
    name: string | null;
    iat: number;
    exp: number;
  }
}
