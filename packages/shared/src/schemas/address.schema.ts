import { z } from "zod";

/** US-only per the wireframes (see the open question on NGN/Nigeria). */
export const UsZipSchema = z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code");

export const AddressInputSchema = z.object({
  fullName: z.string().trim().min(1, "Enter a full name"),
  line1: z.string().trim().min(1, "Enter a street address"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "Enter a city"),
  state: z.string().trim().length(2, "Choose a state"),
  zip: UsZipSchema,
  country: z.literal("US"),
  phone: z.string().trim().optional(),
});
export type AddressInput = z.infer<typeof AddressInputSchema>;

export const AddressSchema = AddressInputSchema.extend({
  id: z.string().min(1),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof AddressSchema>;
