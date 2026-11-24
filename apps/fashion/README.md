# Trendy Luxury storefront concept

An unofficial, mobile-first client demo by Treasure Okeniyi, built from the Studio Form Next.js app in this monorepo. The design translates the supplied audit into an editorial streetwear drop that people can shop directly from Instagram. A listing gives shoppers the price, size and sample availability up front, while buying and negotiation continue in WhatsApp.

## Run locally

From the repository root, using Node.js 22 or 24 and the pinned pnpm 9:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter fashion dev
```

Open http://localhost:3000. The full Trendy Luxury demo runs with no environment variables, database, payment provider or account. The bag lives in the shopper's browser.

## Client walkthrough

1. On a phone, open the homepage as if coming from an Instagram bio. Point out the drop, the styled look and the entry points for clothing, footwear and accessories.
2. Open the Terrace Jersey at `/collection/terrace-jersey` as if coming from an Instagram post. Forest size L is sold out, while Chalk size L has stock. Select Chalk / L to see the product photo, availability and order draft.
3. From **Complete the look**, open the Afterhours Runner and select EU 42. Its WhatsApp action starts a price discussion. The Nightshift Frames demonstrate asking the store for price and availability.
4. Add the jersey and a complementary item, adjust quantity, then select **Send bag on WhatsApp**. The draft includes the colour, size, quantity, listed price and link for each item. Without a configured number, the message stays in a copyable preview.

The merchandise, prices, stock, photography and wordmark are concept materials. The palette and campaign reflect the product mix and social-first sales flow described in the audit. Confirm the official brand assets, catalogue and sales number before enabling order handoff.

## Vercel

Import the GitHub repo into a dedicated Next.js project with **Root Directory** set to `apps/fashion`. Use Node.js 22 or 24, keep the default install and build commands, set `ENABLE_EXPERIMENTAL_COREPACK=1`, and deploy `feat/trendy-luxury-mvp` as a Preview deployment. Share the preview link and verify it opens from a signed-out browser.

Only when the owner confirms the recipient, set `NEXT_PUBLIC_TRENDY_WHATSAPP` to the sales number in international digits without the plus sign or separators, then redeploy. The shopper reviews the message and chooses whether to open WhatsApp. No orders or payments are processed by the demo website.

[Vercel monorepos](https://vercel.com/docs/monorepos) · [Sharing a preview](https://vercel.com/docs/deployments/sharing-deployments) · [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934)

## Research and design choices

| Storefront reviewed                                                                                                                             | Applied to Trendy Luxury                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Kith Spring collection and lookbook](https://kith.com/collections/kith-spring-2026)                                                            | Present the drop as a styled collection with a clear shopping entry point and a lookbook that leads back into the products.    |
| [Nike Nigeria jersey product page](https://www.nike.com/t/nigeria-2026-stadium-home-mens-nike-dri-fit-soccer-short-sleeve-jersey-jfLCnjUy)      | Put price, colour, size, fit and purchase controls together. Show sold-out sizes at the point of selection.                    |
| [ASOS football jersey product page](https://www.asos.com/faded-store/faded-store-logo-football-jersey-with-panel-detail-in-black/prd/210536385) | Give shoppers a fast search and familiar categories, then suggest complementary footwear and accessories from the jersey page. |

The Studio Form template is available on [its original branch](https://github.com/tokeniyi/Biblical-E-commerce-website/tree/feat/fashion-storefront-mvp/apps/fashion). Its storefront is also reachable at `/studio` in this checkout with its existing environment requirements. This demo is independent of the Bible storefront and NestJS API.

```sh
corepack pnpm --filter fashion typecheck
corepack pnpm --filter fashion build
```
