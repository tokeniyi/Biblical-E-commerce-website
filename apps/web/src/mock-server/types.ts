// DELETE-ME-LATER: in-memory record shapes. Public shapes come from
// @your-app/shared; these add the server-only fields the real API will
// keep in Postgres.
import type {
  Address,
  Cart,
  ContentPage,
  Discount,
  Order,
  PaymentIntent,
  Product,
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

export type Db = {
  products: Product[];
  users: UserRecord[];
  sessions: SessionRecord[];
  carts: Cart[];
  wishlists: Record<string, string[]>;
  orders: Order[];
  paymentIntents: PaymentIntent[];
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
