import type { FulfillmentStatus, Order } from "@your-app/shared";
import { Icon } from "@/components/ui/Icon";
import { badge } from "@/components/ui/styles";

const LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Processing",
  on_hold: "On hold",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const TONES: Record<FulfillmentStatus, string> = {
  unfulfilled: "bg-gold-soft text-warning",
  on_hold: "bg-band text-muted",
  packed: "bg-gold-soft text-warning",
  shipped: "bg-focus/10 text-focus",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-band text-muted",
};

export function fulfillmentLabel(status: FulfillmentStatus): string {
  return LABELS[status];
}

export function StatusBadge({ status }: { status: FulfillmentStatus }) {
  return <span className={`${badge} ${TONES[status]}`}>{LABELS[status]}</span>;
}

const STEPS: { key: FulfillmentStatus | "placed"; label: string }[] = [
  { key: "placed", label: "Order placed" },
  { key: "unfulfilled", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];
const ORDER: Record<string, number> = { placed: 0, on_hold: 0, unfulfilled: 1, packed: 2, shipped: 3, delivered: 4 };

const dateFmt = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

/** Progress tracker for an order; text carries the state, color only reinforces it. */
export function OrderTimeline({ order }: { order: Order }) {
  if (order.fulfillmentStatus === "cancelled") {
    return <p className="rounded-xl bg-band p-4 text-sm">This order was cancelled.</p>;
  }
  const reached = ORDER[order.fulfillmentStatus] ?? 0;
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const when = i === 0 ? formatDate(order.placedAt) : step.key === "delivered" && order.deliveredAt ? formatDate(order.deliveredAt) : null;
        return (
          <li key={step.key} className="flex flex-col items-center gap-2 text-center text-xs">
            <span className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done ? "bg-success" : "bg-line"}`} />
              <span
                className={`grid h-8 w-8 place-items-center rounded-full border-2 ${done ? "border-success bg-success text-white" : "border-line bg-white text-muted"}`}
              >
                {done ? <Icon name="check" className="h-4 w-4" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
              </span>
              <span className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "opacity-0" : i < reached ? "bg-success" : "bg-line"}`} />
            </span>
            <span className={done ? "font-semibold text-ink" : "text-muted"}>
              {step.label}
              <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
            </span>
            {when ? <span className="text-muted">{when}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
