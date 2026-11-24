import { z } from "zod";

export const checkoutInput = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(100),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(25)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,22}$/),
  address: z.string().trim().min(5).max(300),
});

export type CheckoutInput = z.infer<typeof checkoutInput>;

export const orderReference = /^sf-[0-9a-f]{32}$/;

export class StoreError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}
