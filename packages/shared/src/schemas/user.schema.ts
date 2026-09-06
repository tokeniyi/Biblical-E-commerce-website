import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).nullable().optional(),
  image: z.string().url().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

// Shape safe to send to the frontend. As internal-only fields get added
// to UserSchema later (role flags, etc.), they will NOT leak through this
// unless explicitly added below.
export const PublicUserSchema = UserSchema.pick({
  id: true,
  email: true,
  name: true,
  image: true,
});

export type PublicUser = z.infer<typeof PublicUserSchema>;