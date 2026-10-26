import { z } from "zod";

export const ContentStatusSchema = z.enum(["draft", "published"]);

export const ContentPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  /** Public route this content renders on, e.g. /help/shipping-returns. */
  path: z.string().startsWith("/"),
  body: z.string(),
  status: ContentStatusSchema,
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
});
export type ContentPage = z.infer<typeof ContentPageSchema>;
