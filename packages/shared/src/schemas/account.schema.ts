import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "../config/rules";
import { AddressInputSchema, AddressSchema } from "./address.schema";
import { NonNegativeCentsSchema } from "./money.schema";
import { OrderSchema } from "./order.schema";
import { ReviewStatusSchema } from "./review.schema";

/*
 * Customer auth and account contracts (A01–A14). Every auth response is
 * generic where Figma asks for it: login, forgot password and resend never
 * say whether an email has an account.
 */

export const EmailInputSchema = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .email("Enter a valid email address.");

/** Password managers and paste are allowed; only the length is checked (spec §2). */
export const NewPasswordSchema = z
  .string()
  .min(1, "Enter a password.")
  .min(PASSWORD_MIN_LENGTH, `Use at least ${String(PASSWORD_MIN_LENGTH)} characters.`)
  .max(256, "Use 256 characters or fewer.");

const PASSWORDS_DIFFER = "Passwords don’t match.";

/** A01. `save` carries a ♡ tap made while signed out (saved after sign-in). */
export const LoginInputSchema = z.object({
  email: EmailInputSchema,
  password: z.string().min(1, "Enter your password."),
  keepSignedIn: z.boolean().default(false),
  returnTo: z.string().optional(),
  save: z.string().optional(),
});
export type LoginInput = z.input<typeof LoginInputSchema>;

/** The ♡ save carried through sign-in: confirmed by the server, never assumed. */
export const PendingSaveResultSchema = z.object({
  sku: z.string(),
  saved: z.boolean(),
});
export type PendingSaveResult = z.infer<typeof PendingSaveResultSchema>;

export const AuthResultSchema = z.object({
  /** Already made safe by the server; the client navigates there. */
  returnTo: z.string(),
  pendingSave: PendingSaveResultSchema.nullable(),
});
export type AuthResult = z.infer<typeof AuthResultSchema>;

/** A02. Marketing opt-in is unchecked by default. */
export const RegisterInputSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name."),
    lastName: z.string().trim().min(1, "Enter your last name."),
    email: EmailInputSchema,
    password: NewPasswordSchema,
    confirmPassword: z.string().min(1, "Repeat your password."),
    termsAccepted: z.literal(true, { errorMap: () => ({ message: "Agree to the Terms to continue." }) }),
    marketingOptIn: z.boolean().default(false),
    returnTo: z.string().optional(),
    save: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: PASSWORDS_DIFFER });
export type RegisterInput = z.input<typeof RegisterInputSchema>;

/** A03 link. The token is single use and short lived. */
export const VerifyEmailInputSchema = z.object({ token: z.string().min(1) });

export const VerifyEmailResultSchema = z.object({
  email: z.string().email(),
  /** The destination preserved from sign-up (O03 when it started in checkout). */
  returnTo: z.string(),
});
export type VerifyEmailResult = z.infer<typeof VerifyEmailResultSchema>;

/**
 * A03 "Resend email" (signed in) and "Send a new link" (from an expired
 * link's token). The answer is the same whatever happened.
 */
export const ResendVerificationInputSchema = z.object({ token: z.string().optional() });

/** Generic acknowledgement with the resend cooldown (A03, A04, A05). */
export const CooldownResultSchema = z.object({
  ok: z.literal(true),
  retryAfterSeconds: z.number().int().nonnegative(),
});
export type CooldownResult = z.infer<typeof CooldownResultSchema>;

/** A04 / A05. */
export const ForgotPasswordInputSchema = z.object({ email: EmailInputSchema });

/** A06: the server checks the token before the form is enabled. */
export const ResetTokenStatusSchema = z.object({ valid: z.literal(true) });

export const ResetPasswordInputSchema = z
  .object({
    token: z.string().min(1),
    password: NewPasswordSchema,
    confirmPassword: z.string().min(1, "Repeat your new password."),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: PASSWORDS_DIFFER });
export type ResetPasswordInput = z.input<typeof ResetPasswordInputSchema>;

/** A08. */
export const ProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  phone: z.string().nullable(),
  marketingOptIn: z.boolean(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ProfileInputSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name."),
  lastName: z.string().trim().min(1, "Enter your last name."),
  email: EmailInputSchema,
  phone: z.string().trim().optional(),
  marketingOptIn: z.boolean(),
});
export type ProfileInput = z.input<typeof ProfileInputSchema>;

export const ProfileUpdateResultSchema = z.object({
  profile: ProfileSchema,
  /** A changed email is unverified until the link sent to it is opened (A03). */
  verificationSentTo: z.string().email().nullable(),
});
export type ProfileUpdateResult = z.infer<typeof ProfileUpdateResultSchema>;

/** A09 form: the shared address fields plus the contact email and default flag drawn in Figma. */
export const SavedAddressInputSchema = AddressInputSchema.extend({
  email: EmailInputSchema,
  isDefault: z.boolean().default(false),
});
export type SavedAddressInput = z.input<typeof SavedAddressInputSchema>;

export const AddressBookSchema = z.object({ addresses: z.array(AddressSchema) });
export type AddressBook = z.infer<typeof AddressBookSchema>;

/** Customer-facing order status (A10 filter); fulfillment and payment stay separate fields. */
export const ACCOUNT_ORDER_STATUSES = ["all", "processing", "shipped", "delivered", "cancelled"] as const;
export const AccountOrderStatusSchema = z.enum(ACCOUNT_ORDER_STATUSES);
export type AccountOrderStatus = z.infer<typeof AccountOrderStatusSchema>;

/** A07. Counts come from the server so the cards never disagree with the pages. */
export const AccountOverviewSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  addresses: z.object({
    count: z.number().int().nonnegative(),
    /** "Portland, Oregon" */
    defaultPlace: z.string().nullable(),
  }),
  orders: z.object({
    count: z.number().int().nonnegative(),
    processing: z.number().int().nonnegative(),
    latest: z
      .object({
        id: z.string(),
        totalCents: NonNegativeCentsSchema,
        placedAt: z.string().datetime(),
        status: AccountOrderStatusSchema.exclude(["all"]),
      })
      .nullable(),
  }),
  wishlistCount: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative(),
  /** Delivered purchases not reviewed yet. */
  awaitingReviewCount: z.number().int().nonnegative(),
});
export type AccountOverview = z.infer<typeof AccountOverviewSchema>;

/** A10 query; it lives in the page URL (`?status=all&page=1`). */
export const AccountOrdersQuerySchema = z.object({
  status: AccountOrderStatusSchema,
  q: z.string(),
  page: z.number().int().min(1),
});
export type AccountOrdersQuery = z.infer<typeof AccountOrdersQuerySchema>;

export const DEFAULT_ACCOUNT_ORDERS_QUERY: AccountOrdersQuery = { status: "all", q: "", page: 1 };

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Unknown values fall back to the defaults, so a bad link never breaks the page. */
export function parseAccountOrdersQuery(source: ParamSource): AccountOrdersQuery {
  const status = AccountOrderStatusSchema.safeParse(readParam(source, "status"));
  const page = Number(readParam(source, "page"));
  return {
    status: status.success ? status.data : "all",
    q: (readParam(source, "q") ?? "").trim().slice(0, 40),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function accountOrdersQueryToParams(query: AccountOrdersQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  params.set("page", String(query.page));
  return params;
}

export const AccountOrderRowSchema = z.object({
  id: z.string(),
  placedAt: z.string().datetime(),
  status: AccountOrderStatusSchema.exclude(["all"]),
  paymentStatus: OrderSchema.shape.paymentStatus,
  deliveredAt: z.string().datetime().nullable(),
  totalCents: NonNegativeCentsSchema,
});
export type AccountOrderRow = z.infer<typeof AccountOrderRowSchema>;

export const AccountOrdersResponseSchema = z.object({
  query: AccountOrdersQuerySchema,
  items: z.array(AccountOrderRowSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  pageCount: z.number().int().nonnegative(),
  /** False drives E04 (no account orders at all), as opposed to a filter with no matches. */
  hasOrders: z.boolean(),
});
export type AccountOrdersResponse = z.infer<typeof AccountOrdersResponseSchema>;

/** A11: the paid snapshot plus what the customer may do next. */
export const AccountOrderDetailSchema = z.object({
  order: OrderSchema.omit({ version: true }),
  status: AccountOrderStatusSchema.exclude(["all"]),
  shippingLabel: z.string(),
  estimate: z.string(),
  canCancel: z.boolean(),
  canReturn: z.boolean(),
  /** Delivered lines the customer may still review (A13). */
  reviewable: z.array(z.object({ sku: z.string(), productName: z.string() })),
});
export type AccountOrderDetail = z.infer<typeof AccountOrderDetailSchema>;

/** A11 Reorder: lines go back in the cart at the paid price, so O01 shows any drift (E06). */
export const ReorderResultSchema = z.object({
  added: z.array(z.object({ sku: z.string(), quantity: z.number().int().min(1) })),
  skipped: z.array(z.object({ sku: z.string(), productName: z.string() })),
});
export type ReorderResult = z.infer<typeof ReorderResultSchema>;

/** A12 card: current price and stock, rechecked on every read. */
export const WishlistItemSchema = z.object({
  sku: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  /** "ESV · Hardcover · Standard print" */
  variantLabel: z.string(),
  binding: z.string(),
  priceCents: NonNegativeCentsSchema,
  available: z.number().int().nonnegative(),
  /** False for editions taken off sale since they were saved. */
  purchasable: z.boolean(),
  categorySlug: z.string().nullable(),
});
export type WishlistItem = z.infer<typeof WishlistItemSchema>;

export const WishlistItemsSchema = z.object({ items: z.array(WishlistItemSchema) });
export type WishlistItems = z.infer<typeof WishlistItemsSchema>;

/** A13 list row. */
export const MyReviewSchema = z.object({
  id: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  sku: z.string(),
  orderId: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  status: ReviewStatusSchema,
});
export type MyReview = z.infer<typeof MyReviewSchema>;

export const ReviewableItemSchema = z.object({
  orderId: z.string(),
  sku: z.string(),
  productName: z.string(),
  deliveredAt: z.string().datetime(),
});
export type ReviewableItem = z.infer<typeof ReviewableItemSchema>;

export const MyReviewsSchema = z.object({
  reviews: z.array(MyReviewSchema),
  awaiting: z.array(ReviewableItemSchema),
});
export type MyReviews = z.infer<typeof MyReviewsSchema>;

/**
 * A13 write/edit route. The order must be the customer's (otherwise 404);
 * a line that wasn't delivered or wasn't bought is "ineligible", writing disabled.
 */
export const ReviewFormViewSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("eligible"),
    item: ReviewableItemSchema.extend({ productSlug: z.string(), variantLabel: z.string() }),
    existing: MyReviewSchema.extend({ body: z.string() }).nullable(),
  }),
  z.object({
    status: z.literal("ineligible"),
    reason: z.enum(["not-delivered", "not-purchased"]),
    orderId: z.string(),
    productSlug: z.string().nullable(),
    productName: z.string().nullable(),
  }),
]);
export type ReviewFormView = z.infer<typeof ReviewFormViewSchema>;

/**
 * A03 without a token: the address waiting for verification, from the
 * signed-in customer or from this browser's sign-up. Null when unknown.
 */
export const VerificationStatusSchema = z.object({
  email: z.string().email().nullable(),
  verified: z.boolean(),
});
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const RegisterResultSchema = z.object({ email: z.string().email() });
