import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { orderReference, StoreError } from "./input";

const paymentData = z.object({
  reference: z.string().regex(orderReference),
  status: z.literal("success"),
  amount: z.number().int().positive(),
  currency: z.literal("NGN"),
  domain: z.literal("test"),
});

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key?.startsWith("sk_test_") ? key : undefined;
}

function appUrl() {
  try {
    const url = new URL(process.env.APP_URL ?? "");
    if (
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
    ) {
      return url.origin;
    }
  } catch {
    return undefined;
  }
}

export function checkoutEnabled() {
  return Boolean(secretKey() && appUrl() && process.env.DATABASE_URL);
}

async function paystack(path: string, init?: RequestInit) {
  const key = secretKey();
  if (!key) throw new StoreError("Test checkout is unavailable.", 503);
  const response = await fetch(`https://api.paystack.co/transaction/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8500),
  });
  const payload = await response.json();
  if (!response.ok || payload?.status !== true) {
    throw new StoreError("Paystack could not complete the request. Please try again.", 502);
  }
  return payload.data as unknown;
}

export async function initialisePayment(reference: string, amount: number, email: string) {
  const callback = new URL("/order", appUrl());
  callback.searchParams.set("order", reference);
  const cancel = new URL(callback);
  cancel.searchParams.set("cancelled", "1");
  const data = await paystack("initialize", {
    method: "POST",
    body: JSON.stringify({
      reference,
      email,
      amount,
      currency: "NGN",
      channels: ["card"],
      callback_url: callback.href,
      metadata: JSON.stringify({ cancel_action: cancel.href }),
    }),
  });
  const { authorization_url, reference: returnedReference } = z
    .object({
      authorization_url: z.string().url(),
      reference: z.string(),
    })
    .parse(data);
  const url = new URL(authorization_url);
  if (url.origin !== "https://checkout.paystack.com" || returnedReference !== reference) {
    throw new StoreError("Paystack returned an unexpected checkout link.", 502);
  }
  return url.href;
}

export async function verifyPayment(reference: string) {
  const data = paymentData.safeParse(await paystack(`verify/${encodeURIComponent(reference)}`));
  return data.success && data.data.reference === reference ? data.data : null;
}

function matchesSignature(expected: Buffer, received: string | null) {
  return (
    !!received &&
    /^[0-9a-f]{128}$/i.test(received) &&
    timingSafeEqual(expected, Buffer.from(received, "hex"))
  );
}

export function validWebhook(raw: Buffer, headers: Headers) {
  const signingSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (signingSecret) {
    const parts = (headers.get("paystack-signature") ?? "").split(",").map((part) => part.trim());
    const timestamps = parts.filter((part) => part.startsWith("t="));
    const timestamp = timestamps[0]?.slice(2);
    if (
      timestamps.length !== 1 ||
      !timestamp ||
      !/^\d+$/.test(timestamp) ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
    )
      return false;
    const expected = createHmac("sha512", signingSecret)
      .update(`${timestamp}.`)
      .update(raw)
      .digest();
    return parts.some((part) => {
      const match = /^v1=[^:]+:([0-9a-f]{128})$/i.exec(part);
      return match ? matchesSignature(expected, match[1]) : false;
    });
  }
  const key = secretKey();
  return (
    !!key &&
    matchesSignature(
      createHmac("sha512", key).update(raw).digest(),
      headers.get("x-paystack-signature"),
    )
  );
}

export function parsePaymentEvent(event: unknown) {
  const payload = z
    .object({ event: z.literal("charge.success"), data: paymentData })
    .safeParse(event);
  return payload.success ? payload.data.data : null;
}
