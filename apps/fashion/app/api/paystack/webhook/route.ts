import { settleOrder } from "@/lib/orders";
import { parsePaymentEvent, validWebhook } from "@/lib/paystack";

export async function POST(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());
  if (!validWebhook(raw, request.headers)) return new Response(null, { status: 401 });

  let event: unknown;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return new Response(null, { status: 400 });
  }
  const payment = parsePaymentEvent(event);
  if (payment) await settleOrder(payment.reference, payment.amount);
  return new Response(null, { status: 200 });
}
