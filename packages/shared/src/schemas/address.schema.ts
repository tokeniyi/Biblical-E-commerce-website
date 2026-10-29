import { z } from "zod";

/** US-only per the wireframes (see the open question on NGN/Nigeria). Copy from Figma E07. */
export const UsZipSchema = z.string().regex(/^\d{5}(-\d{4})?$/, "Use a valid 5-digit ZIP.");

export const AddressInputSchema = z.object({
  fullName: z.string().trim().min(1, "Enter a full name."),
  line1: z.string().trim().min(1, "Enter a street address."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "Enter a city."),
  state: z.string().trim().length(2, "Choose a state."),
  zip: UsZipSchema,
  country: z.literal("US", { errorMap: () => ({ message: "Choose a country." }) }),
  phone: z.string().trim().optional(),
});
export type AddressInput = z.infer<typeof AddressInputSchema>;

export const AddressSchema = AddressInputSchema.extend({
  id: z.string().min(1),
  isDefault: z.boolean(),
  /** Contact email kept with a saved address (Figma A09 form). */
  email: z.string().email().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

/** US states and DC, as offered by the address form (O03, A09). */
export const US_STATES: readonly (readonly [code: string, name: string])[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

/** "OR" → "Oregon" (A07: "Portland, Oregon · Default"). Unknown codes pass through. */
export function stateName(code: string): string {
  return US_STATES.find(([c]) => c === code)?.[1] ?? code;
}
