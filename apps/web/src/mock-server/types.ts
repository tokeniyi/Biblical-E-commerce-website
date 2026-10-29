// DELETE-ME-LATER: in-memory record shapes. Public shapes come from
// @your-app/shared; these add the server-only fields the real API will
// keep in Postgres.
import type {
  Address,
  AddressInput,
  Cart,
  ContentPage,
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
  name: string;
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
};

export type OutboxKind =
  | "verify-email"
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
  carts: Cart[];
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
  /** One-shot scenario flags already fired (see lib/dev/scenario-defs.ts). */
  consumedOneShots: string[];
  /** Monotonic counter for generated ids, so ids stay stable across a run. */
  seq: number;
};
