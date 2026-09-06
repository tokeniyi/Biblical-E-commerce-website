import { describe, expect, it } from "vitest";
import { TransactionSchema } from "../transaction.schema";

const baseTransaction = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  userId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  provider: "paystack",
  providerReference: "ref_12345",
  amountMinorUnits: 500000,
  currency: "NGN",
  status: "success",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("TransactionSchema", () => {
  it("accepts a valid Paystack transaction", () => {
    expect(TransactionSchema.safeParse(baseTransaction).success).toBe(true);
  });

  it("accepts a valid Stripe transaction with the same shape", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      provider: "stripe",
      providerReference: "pi_3Mtwj52eZvKYlo2C1nCz9gGY",
      currency: "USD",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown provider", () => {
    const result = TransactionSchema.safeParse({ ...baseTransaction, provider: "paypal" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = TransactionSchema.safeParse({ ...baseTransaction, amountMinorUnits: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects a currency code that isn't 3 letters", () => {
    const result = TransactionSchema.safeParse({ ...baseTransaction, currency: "NAIRA" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = TransactionSchema.safeParse({ ...baseTransaction, status: "refunded" });
    expect(result.success).toBe(false);
  });
});