// Side-effect imports make this file a module so the blocks below augment
// next-auth's types instead of replacing them.
import "next-auth";
import "next-auth/jwt";

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
