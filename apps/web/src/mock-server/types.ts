// DELETE-ME-LATER: in-memory record shapes. Public shapes come from
// @your-app/shared; these add the server-only fields the real API will
// keep in Postgres.
import type {
  Address,
  AddressInput,
  Cart,
  ContentPage,
  MergeConflict,
  Discount,
  Order,
  PaymentIntent,
  Product,
  Quote,
  ShippingMethodId,
  ReturnRequest,
  Review,
  StaffRole,
  StockAdjustment,
} from "@your-app/shared";

export type CustomerRecord = {
  kind: "customer";
  id: string;
  email: string;
  /** "First Last", kept in step with the two name fields (session and header use it). */
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  emailVerified: boolean;
  /** Mock only: plain text so testers can sign in. Never do this for real. */
  password: string;
  marketingOptIn: boolean;
  addresses: Address[];
};

export type StaffRecord = {
  kind: "staff";
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  password: string;
};

export type UserRecord = CustomerRecord | StaffRecord;

export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: string;
  /** "Keep me signed in on this device" (A01): a 30-day session and cookie. */
  persistent: boolean;
};

/** Single-use emailed link (A03 verification, A06 password reset). */
export type AuthTokenRecord = {
  token: string;
  kind: "verify-email" | "password-reset";
  userId: string;
  /** The address the link was sent to; verifying it verifies this exact email. */
  email: string;
  expiresAt: string;
  usedAt: string | null;
  /** Verification only: where to continue after the link (safe returnTo) and a ♡ save to finish. */
  returnTo: string | null;
  save: string | null;
};

/**
 * The cart behind a token. A signed-in customer's cart is linked to them,
 * so it follows them to other browsers and survives sign-out (A14).
 */
export type CartRecord = Cart & {
  customerId: string | null;
  /** Lines both carts had when sign-in merged them; resolved on O01. */
  mergeConflicts: Omit<MergeConflict, "productName">[];
};

export type OutboxKind =
  | "verify-email"
  | "account-notice"
  | "password-reset"
  | "guest-code"
  | "order-receipt"
  | "shipment"
  | "refund";

export type OutboxMessage = {
  id: string;
  kind: OutboxKind;
  to: string;
  subject: string;
  body: string;
  /** Clickable link or code the tester needs (A03, A05→A06, O09). */
  link: string | null;
  code: string | null;
  sentAt: string;
};

/** Checkout progress for one cart (O03/O04), kept server-side so Back never loses it. */
export type CheckoutDraft = {
  email: string;
  address: AddressInput;
  emailUpdates: boolean;
  shippingMethod: ShippingMethodId;
};

/** Scenario outcome locked in when the intent was created (spec §7.1 payment). */
export type PaymentOutcome = "paid" | "declined" | "uncertain-paid" | "uncertain-failed" | "pending";

/** Server-side payment intent: the public fields plus what the order is built from. */
export type PaymentIntentRecord = PaymentIntent & {
  cartToken: string;
  customerId: string | null;
  outcome: PaymentOutcome;
  paymentMethodLabel: string;
  /** Snapshot at submit time, so the order matches what was paid for. */
  snapshot: {
    lines: Order["lines"];
    quote: Quote;
    email: string;
    address: AddressInput;
  };
};

/** Guest order-session (O08): the paying browser's cart token may read the order briefly. */
export type OrderAccessGrant = { cartToken: string; orderId: string; expiresAt: string };

export type Db = {
  products: Product[];
  users: UserRecord[];
  sessions: SessionRecord[];
  authTokens: AuthTokenRecord[];
  carts: CartRecord[];
  wishlists: Record<string, string[]>;
  orders: Order[];
  checkouts: Partial<Record<string, CheckoutDraft>>;
  paymentIntents: PaymentIntentRecord[];
  orderAccess: OrderAccessGrant[];
  returns: ReturnRequest[];
  reviews: Review[];
  discounts: Discount[];
  content: ContentPage[];
  stockAdjustments: StockAdjustment[];
  outbox: OutboxMessage[];
  /**
   * Rate limits and resend cooldowns, in real wall-clock milliseconds (not
   * the mock clock, which is usually frozen): failed sign-ins per email, and
   * when each kind of email was last sent to an address.
   */
  throttle: Record<string, number[]>;
  /** One-shot scenario flags already fired (see lib/dev/scenario-defs.ts). */
  consumedOneShots: string[];
  /** Monotonic counter for generated ids, so ids stay stable across a run. */
  seq: number;
};
