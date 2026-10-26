import { z } from "zod";

/** The signed-in customer's wishlist, keyed by variant SKU (A12). */
export const WishlistSchema = z.object({ skus: z.array(z.string()) });
export type Wishlist = z.infer<typeof WishlistSchema>;

export const WishlistAddInputSchema = z.object({ sku: z.string().min(1) });
