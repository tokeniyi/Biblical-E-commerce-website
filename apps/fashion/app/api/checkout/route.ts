import { checkoutInput, StoreError } from "@/lib/input";
import { releaseHold, reserveOrder } from "@/lib/orders";
import { checkoutEnabled, initialisePayment } from "@/lib/paystack";

export async function POST(request: Request) {
  if (!checkoutEnabled()) {
    return Response.json({ error: "Test checkout is unavailable." }, { status: 503 });
  }
  const input = checkoutInput.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json(
      { error: "Check your bag and enter valid delivery details." },
      { status: 400 },
    );
  }

  let reference: string | undefined;
  try {
    const order = await reserveOrder(input.data);
    reference = order.reference;
    const url = await initialisePayment(reference, order.amount, input.data.email);
    return Response.json({ url, reference });
  } catch (error) {
    if (reference) {
      await releaseHold(reference).catch(() =>
        console.error("Failed to release fashion checkout hold", reference),
      );
    }
    if (error instanceof StoreError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error("Fashion checkout failed", error instanceof Error ? error.name : "unknown error");
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
