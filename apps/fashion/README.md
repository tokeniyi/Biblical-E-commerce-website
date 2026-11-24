# Trendy Luxury storefront

An unofficial, mobile-first storefront preview by Treasure Okeniyi. The collection turns Trendy Luxury’s Instagram product photos into a searchable catalogue. Shoppers can open a product directly from a social link, browse related styles, and prepare a product or bag enquiry for WhatsApp.

## Run locally

From the repository root, use Node.js 22 or 24 and the pinned pnpm version.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter fashion dev
```

Open http://localhost:3000. The preview works with no environment variables, database or payment provider. The bag is stored in the shopper’s browser.

## Client walkthrough

1. Open Black Script Tee or Layered Panel Sneakers, select a colour and size, and add it to your bag. These two products have sample prices, sizes and inventory. The rest of the collection uses WhatsApp enquiries.
2. From the bag, choose **Proceed to checkout**. Enter guest contact details and choose Lagos delivery or pickup. The summary updates before payment.
3. With test checkout configured, pay through Paystack. The receipt shows the order number and verified payment state. Paid orders appear at `/owner`, where the owner can update fulfilment and manually send a prefilled WhatsApp confirmation.
4. **Negotiate price** opens a WhatsApp draft with the bag items, variants and listed subtotal. Negotiated payments are handled manually outside checkout in this MVP. With no sales number configured, the draft is available to copy.

For integrated testing, copy `.env.example` to `.env.local` in `apps/fashion` and set `DATABASE_URL`, `PAYSTACK_SECRET_KEY` (test key), `APP_URL` and `OWNER_PASSWORD`. The app creates its schema and seeds initial test inventory. To test webhook settlement, point the Paystack test webhook at `/api/paystack/webhook` on a public HTTPS deployment.

## Catalogue and brand

The storefront uses 70 photo crops sourced from all 20 supplied Instagram screenshots. Espresso `#2C2018`, warm ivory `#F7F2E9`, and amber `#EAB568` take their cues from the wood interiors and product photography. The catalogue and demo inventory are defined in `lib/trendy-catalogue.ts` and `lib/trendy.ts`.

Confirm product names, prices, sizes, stock, delivery and pickup terms, and the business WhatsApp number before launch.

## Vercel

Import the GitHub repository into a dedicated Next.js project with **Root Directory** set to `apps/fashion`. Use Node.js 22 or 24, keep the default install and build commands, set `ENABLE_EXPERIMENTAL_COREPACK=1`, and deploy `feat/trendy-luxury-mvp` as a Preview deployment. Check that the share link opens from a signed-out browser before sharing it with the client.

When the owner confirms the recipient, set `NEXT_PUBLIC_TRENDY_WHATSAPP` to the sales number in international digits without the plus sign or separators, then redeploy. Shoppers review the message before opening WhatsApp.

[Vercel monorepos](https://vercel.com/docs/monorepos) · [Sharing a preview](https://vercel.com/docs/deployments/sharing-deployments) · [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934)

The [Studio Form template](https://github.com/tokeniyi/Biblical-E-commerce-website/tree/feat/fashion-storefront-mvp/apps/fashion) remains available on its original branch and at `/studio` in this checkout with its existing environment requirements.

```sh
corepack pnpm --filter fashion typecheck
corepack pnpm --filter fashion build
```
