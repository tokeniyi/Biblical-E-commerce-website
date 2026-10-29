/**
 * Typed HTTP client: the ONLY way UI code talks to the back end. Today it
 * hits the mock Route Handlers under /api; swapping to NestJS is a baseUrl
 * change (spec §10). Every response is validated against a Zod contract.
 */
import type { z } from "zod";
import {
  AccountOrderDetailSchema,
  AccountOrdersResponseSchema,
  AccountOverviewSchema,
  AddressBookSchema,
  AddressSchema,
  AuthResultSchema,
  CooldownResultSchema,
  MyReviewsSchema,
  ProfileSchema,
  ProfileUpdateResultSchema,
  RegisterResultSchema,
  ReorderResultSchema,
  ResetTokenStatusSchema,
  ReviewFormViewSchema,
  VerificationStatusSchema,
  VerifyEmailResultSchema,
  WishlistItemsSchema,
  accountOrdersQueryToParams,
  type AccountOrdersQuery,
  type LoginInput,
  type MergeChoiceInput,
  type ProfileInput,
  type RegisterInput,
  type ResetPasswordInput,
  type ReviewInput,
  type SavedAddressInput,
  CartMutationResponseSchema,
  CartViewSchema,
  CategoryDirectorySchema,
  CheckoutViewSchema,
  OrderConfirmationSchema,
  PaymentIntentViewSchema,
  ErrorEnvelopeSchema,
  ListingResponseSchema,
  ProductDetailSchema,
  ReviewsResponseSchema,
  SessionResponseSchema,
  WishlistSchema,
  listingQueryToParams,
  reviewsQueryToParams,
  type AddToCartInput,
  type DeliveryInput,
  type PaymentInput,
  type ShippingMethodId,
  type ApiErrorCode,
  type ListingQuery,
  type ReviewsQuery,
} from "@your-app/shared";
import {
  ApprovedSchema,
  DevStateSchema,
  InboxSchema,
  OkSchema,
} from "./dev-schemas";
import type { IdentityOption, Scenario } from "@/lib/dev/scenario-defs";

/** Set by the mock server when a scenario simulates an outage (E18). */
export const NETWORK_FAILURE_HEADER = "x-mock-network-failure";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string[]>,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiClientOptions = {
  baseUrl?: string;
  /** Extra headers, e.g. the forwarded cookie for server-side calls. */
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? "";
  const doFetch = options.fetch ?? fetch;

  async function request<S extends z.ZodTypeAny>(
    path: string,
    schema: S,
    { method = "GET", body }: RequestOptions = {},
  ): Promise<z.infer<S>> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...options.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new ApiError("network_error", "We couldn’t reach the store.", 0);
    }

    if (response.headers.get(NETWORK_FAILURE_HEADER) === "1") {
      throw new ApiError("network_error", "We couldn’t reach the store.", response.status);
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const envelope = ErrorEnvelopeSchema.safeParse(payload);
      if (envelope.success) {
        const { code, message, fieldErrors, details } = envelope.data.error;
        throw new ApiError(code, message, response.status, fieldErrors, details);
      }
      throw new ApiError("internal", "Something went wrong.", response.status);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError("internal", `Unexpected response from ${path}`, response.status);
    }
    return parsed.data as z.infer<S>;
  }

  return {
    request,

    getSession: () => request("/api/session", SessionResponseSchema),
    signOut: () => request("/api/session/logout", OkSchema, { method: "POST" }),

    catalog: {
      /** C03 with a category slug; C04 search with `category: null`. */
      listProducts: (category: string | null, query: ListingQuery) => {
        const params = listingQueryToParams(query);
        if (category !== null) params.set("category", category);
        return request(`/api/catalog/products?${params.toString()}`, ListingResponseSchema);
      },
      getCategories: () => request("/api/catalog/categories", CategoryDirectorySchema),
      getProduct: (slug: string) =>
        request(`/api/catalog/products/${encodeURIComponent(slug)}`, ProductDetailSchema),
      getReviews: (slug: string, query: ReviewsQuery) =>
        request(
          `/api/catalog/products/${encodeURIComponent(slug)}/reviews?${reviewsQueryToParams(query).toString()}`,
          ReviewsResponseSchema,
        ),
    },

    cart: {
      get: () => request("/api/cart", CartViewSchema),
      addLine: (input: AddToCartInput) =>
        request("/api/cart/lines", CartMutationResponseSchema, { method: "POST", body: input }),
      moveSavedToCart: (sku: string) =>
        request(`/api/cart/saved/${encodeURIComponent(sku)}/move`, CartMutationResponseSchema, { method: "POST" }),
      removeSaved: (sku: string) =>
        request(`/api/cart/saved/${encodeURIComponent(sku)}`, CartViewSchema, { method: "DELETE" }),
      setQuantity: (sku: string, quantity: number) =>
        request(`/api/cart/lines/${encodeURIComponent(sku)}`, CheckoutViewSchema, { method: "PATCH", body: { quantity } }),
      removeLine: (sku: string) =>
        request(`/api/cart/lines/${encodeURIComponent(sku)}`, CheckoutViewSchema, { method: "DELETE" }),
      saveForLater: (sku: string) =>
        request(`/api/cart/lines/${encodeURIComponent(sku)}/save`, CheckoutViewSchema, { method: "POST" }),
      applyPromo: (code: string) => request("/api/cart/promo", CheckoutViewSchema, { method: "POST", body: { code } }),
      removePromo: () => request("/api/cart/promo", CheckoutViewSchema, { method: "DELETE" }),
      acceptChanges: () => request("/api/cart/reconcile", CheckoutViewSchema, { method: "POST" }),
      resolveMerge: (input: MergeChoiceInput) =>
        request("/api/cart/merge", CheckoutViewSchema, { method: "POST", body: input }),
    },

    auth: {
      login: (input: LoginInput) => request("/api/auth/login", AuthResultSchema, { method: "POST", body: input }),
      register: (input: RegisterInput) =>
        request("/api/auth/register", RegisterResultSchema, { method: "POST", body: input }),
      verificationStatus: () => request("/api/auth/verification", VerificationStatusSchema),
      verifyEmail: (token: string) =>
        request("/api/auth/verify-email", VerifyEmailResultSchema, { method: "POST", body: { token } }),
      /** With an old link's token, or for the signed-in / just-registered address. */
      resendVerification: (token?: string) =>
        request("/api/auth/verify-email/resend", CooldownResultSchema, { method: "POST", body: token ? { token } : {} }),
      forgotPassword: (email: string) =>
        request("/api/auth/password/forgot", CooldownResultSchema, { method: "POST", body: { email } }),
      checkResetToken: (token: string) =>
        request(`/api/auth/password/reset?token=${encodeURIComponent(token)}`, ResetTokenStatusSchema),
      resetPassword: (input: ResetPasswordInput) =>
        request("/api/auth/password/reset", OkSchema, { method: "POST", body: input }),
    },

    account: {
      overview: () => request("/api/account", AccountOverviewSchema),
      profile: () => request("/api/account/profile", ProfileSchema),
      updateProfile: (input: ProfileInput) =>
        request("/api/account/profile", ProfileUpdateResultSchema, { method: "PATCH", body: input }),
      addresses: () => request("/api/account/addresses", AddressBookSchema),
      address: (id: string) => request(`/api/account/addresses/${encodeURIComponent(id)}`, AddressSchema),
      addAddress: (input: SavedAddressInput) =>
        request("/api/account/addresses", AddressBookSchema, { method: "POST", body: input }),
      updateAddress: (id: string, input: SavedAddressInput) =>
        request(`/api/account/addresses/${encodeURIComponent(id)}`, AddressBookSchema, { method: "PUT", body: input }),
      deleteAddress: (id: string) =>
        request(`/api/account/addresses/${encodeURIComponent(id)}`, AddressBookSchema, { method: "DELETE" }),
      orders: (query: AccountOrdersQuery) =>
        request(`/api/account/orders?${accountOrdersQueryToParams(query).toString()}`, AccountOrdersResponseSchema),
      order: (id: string) => request(`/api/account/orders/${encodeURIComponent(id)}`, AccountOrderDetailSchema),
      reorder: (id: string) =>
        request(`/api/account/orders/${encodeURIComponent(id)}/reorder`, ReorderResultSchema, { method: "POST" }),
      wishlist: () => request("/api/account/wishlist", WishlistItemsSchema),
      reviews: () => request("/api/account/reviews", MyReviewsSchema),
      reviewForm: (orderId: string, sku: string) =>
        request(
          `/api/account/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(sku)}/review`,
          ReviewFormViewSchema,
        ),
      submitReview: (orderId: string, sku: string, input: ReviewInput) =>
        request(
          `/api/account/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(sku)}/review`,
          ReviewFormViewSchema,
          { method: "PUT", body: input },
        ),
      deleteReview: (id: string) =>
        request(`/api/account/reviews/${encodeURIComponent(id)}`, MyReviewsSchema, { method: "DELETE" }),
    },

    checkout: {
      get: () => request("/api/checkout", CheckoutViewSchema),
      saveDelivery: (input: DeliveryInput) =>
        request("/api/checkout/delivery", CheckoutViewSchema, { method: "POST", body: input }),
      chooseShipping: (method: ShippingMethodId) =>
        request("/api/checkout/shipping", CheckoutViewSchema, { method: "POST", body: { method } }),
      pay: (input: PaymentInput) =>
        request("/api/checkout/payment", PaymentIntentViewSchema, { method: "POST", body: input }),
      getIntent: (id: string) =>
        request(`/api/checkout/intents/${encodeURIComponent(id)}`, PaymentIntentViewSchema),
      checkIntent: (id: string) =>
        request(`/api/checkout/intents/${encodeURIComponent(id)}/check`, PaymentIntentViewSchema, { method: "POST" }),
    },

    orders: {
      getConfirmation: (id: string) =>
        request(`/api/orders/${encodeURIComponent(id)}/confirmation`, OrderConfirmationSchema),
    },

    wishlist: {
      get: () => request("/api/wishlist", WishlistSchema),
      add: (sku: string) => request("/api/wishlist", WishlistSchema, { method: "POST", body: { sku } }),
      remove: (sku: string) =>
        request(`/api/wishlist/${encodeURIComponent(sku)}`, WishlistItemsSchema, { method: "DELETE" }),
    },

    dev: {
      getState: () => request("/api/__dev/state", DevStateSchema),
      setScenario: (patch: Partial<Scenario> | { clear: true }) =>
        request("/api/__dev/scenario", OkSchema, { method: "POST", body: patch }),
      setIdentity: (identity: IdentityOption) =>
        request("/api/__dev/identity", OkSchema, { method: "POST", body: { identity } }),
      expireSession: () => request("/api/__dev/session/expire", OkSchema, { method: "POST" }),
      reset: () => request("/api/__dev/reset", OkSchema, { method: "POST" }),
      approveReviews: () => request("/api/__dev/reviews/approve", ApprovedSchema, { method: "POST" }),
      getInbox: () => request("/api/__dev/inbox", InboxSchema),
      loadSampleCart: () => request("/api/__dev/cart/sample", OkSchema, { method: "POST" }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Browser-side client (relative URLs, cookies sent automatically). */
export const api = createApiClient();
