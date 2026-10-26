import { z } from "zod";

/** Integer minor units (cents). Never floats. */
export const CentsSchema = z.number().int();
export const NonNegativeCentsSchema = CentsSchema.nonnegative();

/** Every versioned record carries this for optimistic concurrency (E24/E25/B13). */
export const VersionSchema = z.number().int().nonnegative();
