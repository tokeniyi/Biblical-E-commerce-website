# Studio Form

Studio Form is an original portfolio storefront concept by Treasure Okeniyi. It demonstrates how a fashion brand can take a shopper from an Instagram bio link to a paid order and show that order to the store owner. The catalogue, imagery, and orders are demo material. Paystack runs in test mode and charges no money.

The Next.js app lives at `apps/fashion` on `feat/fashion-storefront-mvp`. It contains its own storefront, checkout routes, and owner area. The existing Bible storefront and NestJS API are independent of this deployment.

## Deploy to Vercel

1. Provision a dedicated PostgreSQL database, for example Neon, and copy its pooled connection string. Use a database role with permission to create the `fashion` schema and its tables. The app initializes the schema and seeds demo inventory on its first database request. Subsequent runs preserve stock and orders.
2. Import the GitHub repository into a dedicated Vercel project. Choose **Next.js**, set **Root Directory** to `apps/fashion`, and use Node.js **22.x** or **24.x**. Keep the default build and install commands. Enable Corepack using the variable below so Vercel uses the root pnpm version. Deploy the `feat/fashion-storefront-mvp` branch. Use a public deployment URL when sharing the demo or receiving Paystack webhooks.
3. Add these variables to the Vercel environment used by that branch, then redeploy. Set `APP_URL` to the stable public HTTPS URL for the demo. Use the branch's stable domain or a custom domain, since individual deployment URLs change.

| Variable                       | Value                                                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`. Uses the version pinned in the monorepo.                                                                                                                        |
| `DATABASE_URL`                 | The dedicated PostgreSQL connection string. Use the SSL parameters supplied by your provider.                                                                        |
| `PAYSTACK_SECRET_KEY`          | Your Paystack test secret key, beginning with `sk_test_`. The app rejects live keys.                                                                                 |
| `APP_URL`                      | The public demo origin, such as `https://studio-form-demo.vercel.app`.                                                                                               |
| `OWNER_PASSWORD`               | A randomly generated password of at least 24 characters. Run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` to generate one.        |
| `PAYSTACK_WEBHOOK_SECRET`      | The Paystack test webhook signing secret, beginning with `whsec_`, when available. If omitted, the endpoint verifies the legacy signature using the test secret key. |

4. In the Paystack **test** dashboard, set the webhook URL to `https://<your-demo-domain>/api/paystack/webhook`. Checkout passes its own callback URL. The webhook handles successful payments even if the shopper closes the tab before returning. Use a test account reserved for this demo or confirm that changing the test webhook URL will not replace one used by another app.

With no configuration the catalogue is browsable and checkout displays an unavailable state. No Railway deployment, Stripe credentials or image hosting is needed.

References [Vercel monorepo setup](https://vercel.com/docs/monorepos), [Vercel Git deployments](https://vercel.com/docs/git), [Vercel package managers](https://vercel.com/docs/package-managers), [Paystack redirect checkout](https://paystack.com/docs/v2/payments/online/checkout/redirect), and [Paystack webhooks](https://paystack.com/docs/v2/developer-tools/integration/webhooks).

## Run locally

From the repository root using Node.js 22 or 24 and pnpm 9:

```sh
corepack pnpm install --frozen-lockfile
cp apps/fashion/.env.example apps/fashion/.env.local
corepack pnpm --filter fashion dev
```

Populate `apps/fashion/.env.local` and visit `http://localhost:3000`. Use a separate database for local testing. The callback works in a local browser with `APP_URL=http://localhost:3000`. The webhook needs a public endpoint.

```sh
corepack pnpm --filter fashion typecheck
corepack pnpm --filter fashion build
```

## Client demo walkthrough

1. Open the homepage at a phone viewport and shop the collection. Open The Column Dress, switch from Chalk to Espresso, and observe the product photo and available sizes change. Chalk size L and Espresso size XS start sold out.
2. Add an in-stock size. Open the bag, adjust the quantity, and check the item, Lagos delivery fee, and total.
3. Enter sample contact and address information at guest checkout. Use Paystack's test card `4084 0840 8408 4081`, CVV `408`, and any future expiry. Return to the storefront and check the confirmation. Use only sample customer information. [Paystack test payment details](https://paystack.com/docs/v2/developer-tools/integration/test-payments).
4. Go to `/owner`, sign in privately, and find the order by its reference. Show the line items and progress the order through **Packed**, **Shipped**, and **Delivered**. Reopen the product to confirm the paid quantity was deducted.
5. For a recovery demo, use Paystack's declined test card or cancel checkout. The order stays unpaid and the expired hold becomes available again after 15 minutes. If a late successful payment arrives after the stock has been taken, the owner sees **Stock review**.

Pricing and inventory are checked on the server. Orders and fulfilment are stored in PostgreSQL. Callback and webhook events both settle the same order, and replaying a successful event never deducts stock twice. This concept uses three products, 25 size and colour variants, NGN prices and a flat ₦3,500 Lagos delivery fee.

## Research and design decisions

| Source reviewed                                                                                                                                                                                                                                                                | What Studio Form uses                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ARKET linen collection](https://www.arket.com/en-ww/women/clothing/linen-collection/) and [ARKET seasonal lookbook](https://www.arket.com/en-gb/women/edits/ss26-lookbook/)                                                                                                   | A short campaign lead-in, a focused linen capsule, and a simple grid. Visitors from an Instagram bio can go straight from the hero to the products.    |
| [COS gathered shirt dress](https://www.cos.com/en-us/women/womenswear/dresses/shirtdresses/product/gathered-cotton-midi-shirt-dress-navy-1311495001) and [COS cotton-jersey midi dress](https://www.cos.com/en-in/product/folded-shoulder-cotton-jersey-midi-dress-1335903003) | Imagery beside the purchase controls, a clearly named colour, a size guide close to the size buttons, and collapsible fit and delivery details.        |
| [Zara stock availability](https://www.zara.com/us/en/help-center/ItemsAvailability) and [Baymard apparel UX](https://baymard.com/research-articles/apparel-5-best-practices)                                                                                                   | Display stock at the colour and size level before adding to the bag. Sold-out sizes stay visible with an explicit accessible label.                    |
| [UNIQLO sizing guidance](https://faq-id.uniqlo.com/pkb_Home_UQ_ID?fs=RelatedArticle&id=kA0Ie000000TP0n&l=en_US&q=exchange)                                                                                                                                                     | The guide explicitly labels the figures as body measurements and lists the units in centimetres. Measurements are illustrative for the demo catalogue. |
| [Baymard guest checkout research](https://baymard.com/research-articles/make-guest-checkout-prominent)                                                                                                                                                                         | Open directly to delivery details with the order total beside the form. There is no account selection step.                                            |

Studio Form uses original branding. The hero and product photography are six AI-generated images from a single 3×2 contact sheet, cropped and exported as WebP under `public/images/`. The image brief requested a warm Lagos linen campaign with Black Nigerian models, architectural plaster, natural light, and separate product views for Chalk, Espresso, Clay, Salt and Stone. The portfolio label appears across the app.

## Later updates

- Owner product and inventory editing, multiple staff accounts, search, and pagination.
- Customer accounts, order history, email receipts, shipment notifications, and courier tracking.
- Delivery zones, pickup, discount codes, reviews, and wishlists.
- Live payment activation, refunds and cancellation workflows, and handling real customer data. Before accepting real orders, add rate limits, data retention controls and payment reconciliation. This demo uses a single owner password and shows the latest 100 verified orders.
