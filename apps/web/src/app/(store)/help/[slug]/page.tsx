import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageContent } from "@/components/shell/StorefrontShell";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";
import { eyebrow, pageHeading, panel } from "@/components/ui/styles";

type HelpPage = { title: string; intro: string; body: ReactNode };

const PAGES: Record<string, HelpPage> = {
  "shipping-returns": {
    title: "Shipping & returns",
    intro: "Delivery options, costs and how returns work. Sample policy for this demo store.",
    body: (
      <>
        <h2>Delivery</h2>
        <ul>
          <li>
            <strong>Standard — $5.00</strong>, arrives in 5–7 days.
          </li>
          <li>
            <strong>Express — $12.00</strong>, arrives in 2–3 days.
          </li>
          <li>Exact delivery dates are shown at checkout once we know your address, before you pay.</li>
          <li>We currently ship to US addresses only.</li>
        </ul>
        <h2>Returns</h2>
        <ul>
          <li>Unopened items can be returned within 30 days of delivery.</li>
          <li>Refunds go back to your original payment method. Shipping is not refunded on partial returns.</li>
          <li>Paid orders that have not shipped can be cancelled from your order page.</li>
        </ul>
      </>
    ),
  },
  translations: {
    title: "Translation guide",
    intro: "How the translations we stock differ, so you can choose with confidence.",
    body: (
      <>
        <h2>Word-for-word</h2>
        <p>
          <strong>ESV</strong> and <strong>KJV</strong> stay close to the original wording. Good for study and
          memorisation; the KJV uses 17th-century English.
        </p>
        <h2>Thought-for-thought</h2>
        <p>
          <strong>NIV</strong> balances accuracy and readability; <strong>NLT</strong> uses clear contemporary English,
          ideal for new readers and children.
        </p>
        <h2>Spanish</h2>
        <p>
          <strong>RVR1960</strong> (classic) and <strong>NVI</strong> (contemporary). Choose “All languages” on any
          listing to include them.
        </p>
        <p>
          <Link href="/categories/bibles">Browse all Bibles</Link>
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy & cookies",
    intro: "What we collect, why, and how to change your mind.",
    body: (
      <>
        <h2>Strictly necessary cookies</h2>
        <p>
          Always on: <code>cart_token</code> (your cart), <code>mock_session</code> (your sign-in) and{" "}
          <code>bs_consent</code> (your cookie choice).
        </p>
        <h2>UX analytics (only with your consent)</h2>
        <p>
          If you accept analytics we set two first-party cookies: <code>_bs_vid</code>, a random visitor id kept for 180
          days, and <code>_bs_sid</code>, a session id that expires after 30 minutes of inactivity. We record pages
          visited, the page you came from, time on page, how far you scrolled, which links and buttons you clicked
          (including repeated “rage” clicks), searches with their result counts, cart and checkout steps, and script
          errors.
        </p>
        <p>
          We do <strong>not</strong> record anything you type into forms, your name, email address, address or payment
          details, and we strip identifying parameters from page addresses. The data is used only to improve the
          store’s usability and is never shared with advertisers.
        </p>
        <h2>Changing your choice</h2>
        <p>
          You can change or withdraw consent at any time. Withdrawing deletes the analytics cookies and the events
          recorded for this browser. Browsers that send Global Privacy Control or Do Not Track are not asked and are
          not tracked unless they opt in.
        </p>
        <p>
          <CookieSettingsButton />
        </p>
      </>
    ),
  },
  terms: {
    title: "Terms of sale",
    intro: "Sample terms for this demonstration store. No real orders are fulfilled.",
    body: (
      <>
        <h2>Orders</h2>
        <p>Prices are in US dollars and include the tax shown at checkout. Your order is confirmed only once payment succeeds.</p>
        <h2>Payments</h2>
        <p>This demo simulates payments. Never enter a real card number.</p>
        <h2>Returns</h2>
        <p>
          See <Link href="/help/shipping-returns">Shipping &amp; returns</Link>.
        </p>
      </>
    ),
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: PAGES[slug]?.title ?? "Help" };
}

/** Public help and policy content. */
export default async function HelpContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <PageContent>
      <div className="flex flex-col gap-2">
        <p className={eyebrow}>Help</p>
        <h1 className={pageHeading}>{page.title}</h1>
        <p className="max-w-2xl text-muted">{page.intro}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <article
          className={`${panel} max-w-3xl gap-0 text-[15px] leading-relaxed [&_a]:text-brand [&_a]:underline [&_button]:font-semibold [&_button]:text-brand [&_button]:underline [&_code]:rounded [&_code]:bg-panel [&_code]:px-1 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2:first-child]:mt-0 [&_li]:mt-1 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5`}
        >
          {page.body}
        </article>
        <nav aria-label="Help topics" className={`${panel} self-start text-sm`}>
          <h2 className="font-semibold">Help topics</h2>
          <ul className="flex flex-col gap-2">
            {Object.entries(PAGES).map(([s, p]) => (
              <li key={s}>
                <Link href={`/help/${s}`} aria-current={s === slug ? "page" : undefined} className="hover:text-brand aria-[current=page]:font-semibold aria-[current=page]:text-brand">
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/orders/lookup" className="hover:text-brand">
                Find an order
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </PageContent>
  );
}
