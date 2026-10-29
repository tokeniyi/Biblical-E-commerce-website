import { z } from "zod";
import { AddressInputSchema, AddressSchema } from "./address.schema";
import { CartViewSchema } from "./cart.schema";
import { NonNegativeCentsSchema } from "./money.schema";
import { OrderSchema } from "./order.schema";
import { PaymentIntentStatusSchema } from "./payment-intent.schema";
import { QuoteSchema, ShippingMethodIdSchema } from "./quote.schema";

/** PATCH /api/cart/lines/:sku (O01). Zero is not a quantity: removing is explicit. */
export const UpdateLineInputSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1."),
});
export type UpdateLineInput = z.infer<typeof UpdateLineInputSchema>;

/** POST /api/cart/promo (O01 / E08). */
export const PromoInputSchema = z.object({
  code: z.string().trim().min(1, "Enter a promo code."),
});
export type PromoInput = z.infer<typeof PromoInputSchema>;

/** Why a promo code was refused; picks the E08 variant. */
export const PromoRejectionSchema = z.enum(["invalid", "expired", "ineligible"]);
export type PromoRejection = z.infer<typeof PromoRejectionSchema>;

/** POST /api/checkout/delivery (O03): contact + address, same validation for guests and customers. */
export const DeliveryInputSchema = AddressInputSchema.extend({
  email: z.string().trim().min(1, "Enter an email address.").email("Enter a valid email address."),
  /** Signed-in only; ignored for guests. */
  saveAddress: z.boolean().default(false),
  emailUpdates: z.boolean().default(false),
});
export type DeliveryInput = z.input<typeof DeliveryInputSchema>;

export const DeliveryDetailsSchema = z.object({
  email: z.string().email(),
  address: AddressInputSchema,
  emailUpdates: z.boolean(),
});
export type DeliveryDetails = z.infer<typeof DeliveryDetailsSchema>;

/** POST /api/checkout/shipping (O04). */
export const ShippingInputSchema = z.object({ method: ShippingMethodIdSchema });

export const ShippingOptionSchema = z.object({
  id: ShippingMethodIdSchema,
  label: z.string(),
  priceCents: NonNegativeCentsSchema,
  /** "12–14 Oct" */
  estimate: z.string(),
  estimateYear: z.number().int(),
  /** Unavailable methods are listed with a reason, never selectable. */
  available: z.boolean(),
  reason: z.string().nullable(),
  /** Order total if this method were chosen ("If chosen: … = $80.04"). */
  totalIfChosenCents: NonNegativeCentsSchema,
});
export type ShippingOption = z.infer<typeof ShippingOptionSchema>;

/**
 * A cart line whose server price or stock no longer matches what the
 * customer saw (E06). Payment is blocked until accepted or removed.
 */
export const CartChangeSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  cartQuantity: z.number().int().min(1),
  cartUnitPriceCents: NonNegativeCentsSchema,
  /** Null when stock still covers the cart quantity. */
  available: z.number().int().nonnegative().nullable(),
  /** Null when the price is unchanged. */
  currentPriceCents: NonNegativeCentsSchema.nullable(),
});
export type CartChange = z.infer<typeof CartChangeSchema>;

export const CheckoutViewerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("guest") }),
  z.object({
    kind: z.literal("customer"),
    name: z.string(),
    email: z.string().email(),
    savedAddresses: z.array(AddressSchema),
  }),
]);
export type CheckoutViewer = z.infer<typeof CheckoutViewerSchema>;

/** GET /api/checkout: everything O01–O07 render, from one authoritative read. */
export const CheckoutViewSchema = z.object({
  cart: CartViewSchema,
  /** Totals for the cart as the customer saw it (prices stored on the lines). */
  quote: QuoteSchema,
  /** Server-side changes (E06); empty when the cart is current. */
  changes: z.array(CartChangeSchema),
  /** Totals after accepting `changes`; null when there are none. */
  reconciledQuote: QuoteSchema.nullable(),
  viewer: CheckoutViewerSchema,
  delivery: DeliveryDetailsSchema.nullable(),
  /** "unknown" until an address is entered; "unsupported" drives E14. */
  coverage: z.enum(["unknown", "supported", "unsupported"]),
  shippingOptions: z.array(ShippingOptionSchema),
});
export type CheckoutView = z.infer<typeof CheckoutViewSchema>;

/**
 * POST /api/checkout/payment (O05). Card values never leave the hosted
 * fields: the client sends only the simulated provider token.
 */
export const PaymentInputSchema = z.object({
  /** One per attempt; repeating it returns the same intent (no second charge). */
  idempotencyKey: z.string().min(8),
  paymentToken: z.string().regex(/^sim_[a-z]+_\d{4}$/),
  billingSameAsDelivery: z.boolean(),
  billingAddress: AddressInputSchema.nullable(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "Agree to the Terms to continue." }) }),
  /** The total the customer was shown; any drift is E06, never a silent charge. */
  expectedTotalCents: NonNegativeCentsSchema,
});
export type PaymentInput = z.infer<typeof PaymentInputSchema>;

/** Public view of a payment intent (O06). `pending` = outcome not yet known (E15). */
export const PaymentIntentViewSchema = z.object({
  id: z.string(),
  status: PaymentIntentStatusSchema,
  amountCents: NonNegativeCentsSchema,
  /** Set only once the server has verified payment and created the order. */
  orderId: z.string().nullable(),
});
export type PaymentIntentView = z.infer<typeof PaymentIntentViewSchema>;

/** GET /api/orders/:id/confirmation (O08): owner or this browser's order session only. */
export const OrderConfirmationSchema = z.object({
  /** Lines carry the short variant label ("Hardcover / Standard"), as drawn. */
  order: OrderSchema.omit({ version: true }),
  shippingLabel: z.string(),
  estimate: z.string(),
  estimateYear: z.number().int(),
  isGuest: z.boolean(),
});
export type OrderConfirmation = z.infer<typeof OrderConfirmationSchema>;
