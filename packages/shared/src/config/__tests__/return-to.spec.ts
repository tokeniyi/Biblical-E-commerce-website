import { describe, expect, it } from "vitest";
import { DEFAULT_RETURN_TO, loginPath, safeReturnTo } from "../return-to";

describe("safeReturnTo (spec §5.5)", () => {
  it("keeps same-origin relative paths with their query and hash", () => {
    expect(safeReturnTo("/checkout/delivery")).toBe("/checkout/delivery");
    expect(safeReturnTo("/categories/bibles?translation=ESV#top")).toBe("/categories/bibles?translation=ESV#top");
  });

  it.each([
    "https://evil.example/account",
    "//evil.example/account",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/\r\nSet-Cookie:x",
    "/ account",
    "account",
    "",
    "/\tx",
  ])("rejects %j", (raw) => {
    expect(safeReturnTo(raw)).toBe(DEFAULT_RETURN_TO);
  });

  it("falls back for missing values and auth pages (no loops)", () => {
    expect(safeReturnTo(undefined)).toBe("/account");
    expect(safeReturnTo(null, "/cart")).toBe("/cart");
    expect(safeReturnTo("/login?returnTo=/account")).toBe("/account");
    expect(safeReturnTo("/password/reset?token=x")).toBe("/account");
  });

  it("normalizes dot segments without leaving the site", () => {
    expect(safeReturnTo("/account/../cart")).toBe("/cart");
  });
});

describe("loginPath", () => {
  it("puts returnTo first, then the A14 reason", () => {
    expect(loginPath("/account/orders/BS-10428", "session-expired")).toBe(
      "/login?returnTo=%2Faccount%2Forders%2FBS-10428&reason=session-expired",
    );
  });
});
