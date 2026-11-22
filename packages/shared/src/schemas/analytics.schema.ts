import { z } from "zod";

/**
 * First-party UX analytics contract (docs/ECOMMERCE_BUILD_PLAN.md §3.5).
 * Events are only sent after the visitor grants analytics consent, and never
 * carry personal data: no emails, names, form values or free-form query
 * strings other than the search term.
 */
export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "page_leave",
  "click",
  "search",
  "add_to_cart",
  "wishlist_add",
  "checkout_step",
  "purchase",
  "rage_click",
  "dead_click",
  "js_error",
] as const;

export const AnalyticsEventTypeSchema = z.enum(ANALYTICS_EVENT_TYPES);
export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;

export const DEVICE_CLASSES = ["mobile", "tablet", "desktop"] as const;
export const DeviceClassSchema = z.enum(DEVICE_CLASSES);
export type DeviceClass = z.infer<typeof DeviceClassSchema>;

const PropValueSchema = z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null()]);

export const AnalyticsPropsSchema = z
  .record(z.string().max(40), PropValueSchema)
  .refine((props) => Object.keys(props).length <= 20, "Too many event properties.");
export type AnalyticsProps = z.infer<typeof AnalyticsPropsSchema>;

export const AnalyticsEventSchema = z.object({
  type: AnalyticsEventTypeSchema,
  /** Pathname plus allow-listed query params, e.g. "/search?q=esv". */
  path: z.string().startsWith("/").max(300),
  /** Client timestamp (ms since epoch); the server clamps it to "now". */
  at: z.number().int().nonnegative(),
  props: AnalyticsPropsSchema.default({}),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/** Random identifiers from the first-party analytics cookies. */
const AnalyticsIdSchema = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/);

export const ANALYTICS_MAX_BATCH = 50;

/** POST /api/analytics/events */
export const AnalyticsBatchSchema = z.object({
  visitorId: AnalyticsIdSchema,
  sessionId: AnalyticsIdSchema,
  device: DeviceClassSchema,
  events: z.array(AnalyticsEventSchema).min(1).max(ANALYTICS_MAX_BATCH),
});
export type AnalyticsBatch = z.infer<typeof AnalyticsBatchSchema>;

export const AnalyticsIngestResponseSchema = z.object({ accepted: z.number().int().nonnegative() });

/** GET /api/admin/analytics */
export const InsightsQuerySchema = z.object({
  range: z.enum(["1d", "7d", "14d", "30d"]).default("14d"),
  /** Include the labelled demo traffic seeded with the store. */
  demo: z.enum(["include", "exclude"]).default("include"),
});
export type InsightsQuery = z.infer<typeof InsightsQuerySchema>;

const Count = z.number().int().nonnegative();

export const InsightsSchema = z.object({
  range: InsightsQuerySchema.shape.range,
  includesDemo: z.boolean(),
  generatedAt: z.string().datetime(),
  kpis: z.object({
    sessions: Count,
    visitors: Count,
    pageViews: Count,
    pagesPerSession: z.number(),
    avgSessionSeconds: z.number(),
    bounceRate: z.number(),
    conversionRate: z.number(),
    avgScrollDepth: z.number(),
  }),
  daily: z.array(z.object({ date: z.string(), sessions: Count, purchases: Count })),
  funnel: z.array(z.object({ step: z.string(), sessions: Count, dropOff: z.number() })),
  topPages: z.array(
    z.object({
      page: z.string(),
      views: Count,
      sessions: Count,
      avgSeconds: z.number(),
      avgScroll: z.number(),
      exitRate: z.number(),
    }),
  ),
  paths: z.array(z.object({ from: z.string(), to: z.string(), count: Count })),
  entryPages: z.array(z.object({ page: z.string(), count: Count })),
  exitPages: z.array(z.object({ page: z.string(), count: Count })),
  searches: z.array(z.object({ query: z.string(), count: Count, zeroResults: Count })),
  topClicks: z.array(z.object({ page: z.string(), target: z.string(), count: Count })),
  frictions: z.array(
    z.object({ kind: z.enum(["rage_click", "dead_click", "js_error"]), page: z.string(), target: z.string(), count: Count }),
  ),
  devices: z.array(z.object({ device: DeviceClassSchema, sessions: Count, conversionRate: z.number() })),
  recommendations: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["high", "medium", "low"]),
      title: z.string(),
      evidence: z.string(),
      suggestion: z.string(),
    }),
  ),
});
export type Insights = z.infer<typeof InsightsSchema>;
