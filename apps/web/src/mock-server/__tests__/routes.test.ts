import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as getCart } from "@/app/api/cart/route";
import { POST as addLine } from "@/app/api/cart/lines/route";
import { POST as moveSaved } from "@/app/api/cart/saved/[sku]/move/route";
import { DELETE as removeSaved } from "@/app/api/cart/saved/[sku]/route";
import { GET as getProduct } from "@/app/api/catalog/products/[slug]/route";
import { GET as getReviews } from "@/app/api/catalog/products/[slug]/reviews/route";
import { GET as listProducts } from "@/app/api/catalog/products/route";
import { GET as getWishlist, POST as addWishlist } from "@/app/api/wishlist/route";
import { POST as loadSample } from "@/app/api/%5F_dev/cart/sample/route";
import { SCENARIO_COOKIE } from "@/lib/dev/scenario-defs";
import { SAMPLE_NOW } from "../clock";
import { CART_COOKIE, SESSION_COOKIE, createSession, expireSession } from "../services/auth";
import { resetDb } from "../store";
import type { Db } from "../types";

let db: Db;
beforeEach(() => {
  db = resetDb();
});

function req(path: string, init: { method?: string; body?: unknown; cookies?: Record<string, string> } = {}) {
  const cookie = Object.entries(init.cookies ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? "GET",
    headers: { ...(cookie ? { cookie } : {}), ...(init.body ? { "content-type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

function sessionFor(userId: string): string {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error(userId);
  return createSession(db, user, SAMPLE_NOW);
}

describe("catalog routes", () => {
  it("lists a category from the URL query", async () => {
    const res = await listProducts(req("/api/catalog/products?category=bibles&translation=NIV"));
    const body = (await res.json()) as { category: { slug: string }; items: { variant: { translation: string } }[] };
    expect(body.category.slug).toBe("bibles");
    expect(body.items.every((i) => i.variant.translation === "NIV")).toBe(true);
  });

  it("returns the error envelope for an unknown category", async () => {
    const res = await listProducts(req("/api/catalog/products?category=nope"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "not_found" } });
  });

  it("passes the dynamic slug through to the product handler", async () => {
    expect((await getProduct(req("/api/catalog/products/esv-study-bible"), params({ slug: "esv-study-bible" }))).status).toBe(200);
    expect((await getProduct(req("/api/catalog/products/esv-journaling-bible"), params({ slug: "esv-journaling-bible" }))).status).toBe(404);
  });

  it("E18: fail-read hits the listing, so the page shows the network error", async () => {
    const res = await listProducts(req("/api/catalog/products", { cookies: { [SCENARIO_COOKIE]: "network:fail-read~r1" } }));
    expect(res.status).toBe(503);
  });

  it("derives review eligibility from the session cookie", async () => {
    const jordan = sessionFor("cus_jordan");
    const res = await getReviews(
      req("/api/catalog/products/esv-study-bible/reviews", { cookies: { [SESSION_COOKIE]: jordan } }),
      params({ slug: "esv-study-bible" }),
    );
    expect(((await res.json()) as { eligibility: unknown }).eligibility).toMatchObject({ status: "eligible" });
  });
});

describe("cart routes", () => {
  it("sets an httpOnly cart cookie on first add, and reuses it after", async () => {
    const first = await addLine(req("/api/cart/lines", { method: "POST", body: { sku: "ESV-ST-HC", quantity: 1 } }));
    expect(first.status).toBe(200);
    const token = first.cookies.get(CART_COOKIE)?.value ?? "";
    expect(token).not.toBe("");
    expect(first.headers.get("set-cookie")).toMatch(/HttpOnly/i);

    await addLine(req("/api/cart/lines", { method: "POST", body: { sku: "NIV-EV-PB", quantity: 1 }, cookies: { [CART_COOKIE]: token } }));
    const view = (await (await getCart(req("/api/cart", { cookies: { [CART_COOKIE]: token } }))).json()) as {
      itemCount: number;
      subtotalCents: number;
    };
    expect(view).toMatchObject({ itemCount: 2, subtotalCents: 6300 });
    expect(db.carts).toHaveLength(1);
  });

  it("rejects quantity 0 with a field error", async () => {
    const res = await addLine(req("/api/cart/lines", { method: "POST", body: { sku: "ESV-ST-HC", quantity: 0 } }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: { code: "validation_failed", fieldErrors: { quantity: [expect.any(String)] } } });
  });

  it("moves and removes saved items for the cookie's cart only", async () => {
    const sample = await loadSample(req("/api/__dev/cart/sample", { method: "POST" }));
    const token = sample.cookies.get(CART_COOKIE)?.value ?? "";
    const moved = await moveSaved(
      req("/api/cart/saved/KJV-LP-LL/move", { method: "POST", cookies: { [CART_COOKIE]: token } }),
      params({ sku: "KJV-LP-LL" }),
    );
    expect(moved.status).toBe(200);
    const soldOut = await moveSaved(
      req("/api/cart/saved/NLT-CH-HC/move", { method: "POST", cookies: { [CART_COOKIE]: token } }),
      params({ sku: "NLT-CH-HC" }),
    );
    expect(soldOut.status).toBe(400);
    expect(await soldOut.json()).toMatchObject({ error: { code: "out_of_stock" } });
    const stranger = await removeSaved(req("/api/cart/saved/NLT-CH-HC", { method: "DELETE" }), params({ sku: "NLT-CH-HC" }));
    expect(stranger.status).toBe(404);
  });

  it("the sample-cart form redirects only to same-site paths", async () => {
    const ok = await loadSample(req("/api/__dev/cart/sample?next=/cart/saved", { method: "POST" }));
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toBe("http://localhost/cart/saved");
    for (const next of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
      const res = await loadSample(req(`/api/__dev/cart/sample?next=${encodeURIComponent(next)}`, { method: "POST" }));
      expect(res.status).toBe(200);
    }
  });
});

describe("wishlist routes", () => {
  it("signed out → unauthenticated (A01)", async () => {
    const res = await addWishlist(req("/api/wishlist", { method: "POST", body: { sku: "ESV-ST-HC" } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "unauthenticated" } });
  });

  it("expired session → session_expired (E11)", async () => {
    const jordan = sessionFor("cus_jordan");
    expireSession(db, jordan, SAMPLE_NOW);
    const res = await addWishlist(req("/api/wishlist", { method: "POST", body: { sku: "ESV-ST-HC" }, cookies: { [SESSION_COOKIE]: jordan } }));
    expect(await res.json()).toMatchObject({ error: { code: "session_expired" } });
  });

  it("staff sessions are not customers", async () => {
    const alex = sessionFor("stf_alex");
    const res = await addWishlist(req("/api/wishlist", { method: "POST", body: { sku: "ESV-ST-HC" }, cookies: { [SESSION_COOKIE]: alex } }));
    expect(res.status).toBe(401);
  });

  it("saves for the signed-in customer", async () => {
    const sam = sessionFor("cus_sam");
    await addWishlist(req("/api/wishlist", { method: "POST", body: { sku: "ESV-ST-HC" }, cookies: { [SESSION_COOKIE]: sam } }));
    const res = await getWishlist(req("/api/wishlist", { cookies: { [SESSION_COOKIE]: sam } }));
    expect(await res.json()).toEqual({ skus: ["ESV-ST-HC"] });
  });
});
