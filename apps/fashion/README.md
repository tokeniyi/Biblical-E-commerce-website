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

1. Start on the homepage, browse Clothing, Footwear or Accessories, then use search and the product-type filter to narrow the collection. Filtered collections can be shared by URL.
2. Open Layered Panel Sneakers, switch between the blue and brown photos, and enter a preferred size if you know it. The product page links to complementary pieces.
3. Add the selection to the bag, then add a bag or hat from Accessories. Open the WhatsApp draft and check the selected colours, any preferred sizes, and the direct product links.
4. Without a configured sales number, the message stays in a copyable preview.

## Catalogue and brand

The storefront uses 70 photo crops sourced from all 20 supplied Instagram screenshots. Catalogue names and colour labels describe what is visible in the posts. Espresso `#2C2018`, warm ivory `#F7F2E9`, and amber `#EAB568` pick up the wood interiors and warm tones in the photography.

Before enabling customer enquiries, confirm the official logo and Instagram URL, approved product names and media, prices and negotiability, available variants and stock, delivery and returns terms, and the business WhatsApp number. The preview presents prices and availability on request. A preferred size in a WhatsApp draft is a request to the store.

Source data is in `lib/trendy-catalogue.ts`. The product model supports confirmed fixed or negotiable prices and variant-level stock when the owner supplies them.

## Vercel

Import the GitHub repository into a dedicated Next.js project with **Root Directory** set to `apps/fashion`. Use Node.js 22 or 24, keep the default install and build commands, set `ENABLE_EXPERIMENTAL_COREPACK=1`, and deploy `feat/trendy-luxury-mvp` as a Preview deployment. Check that the share link opens from a signed-out browser before sharing it with the client.

When the owner confirms the recipient, set `NEXT_PUBLIC_TRENDY_WHATSAPP` to the sales number in international digits without the plus sign or separators, then redeploy. Shoppers review the message before opening WhatsApp.

[Vercel monorepos](https://vercel.com/docs/monorepos) · [Sharing a preview](https://vercel.com/docs/deployments/sharing-deployments) · [WhatsApp click to chat](https://faq.whatsapp.com/5913398998672934)

The [Studio Form template](https://github.com/tokeniyi/Biblical-E-commerce-website/tree/feat/fashion-storefront-mvp/apps/fashion) remains available on its original branch and at `/studio` in this checkout with its existing environment requirements.

```sh
corepack pnpm --filter fashion typecheck
corepack pnpm --filter fashion build
```
