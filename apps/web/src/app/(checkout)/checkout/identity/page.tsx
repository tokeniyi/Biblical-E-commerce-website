import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutFrame } from "@/components/checkout/CheckoutFrame";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PageContent } from "@/components/shell/StorefrontShell";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, primaryButton, textLink } from "@/components/ui/styles";
import { hasItems, loadCheckout } from "@/lib/api/checkout";

const RETURN_TO = encodeURIComponent("/checkout/delivery");

/** O02: guest and sign-in are equal paths; signed-in customers skip straight to O03. */
export default async function CheckoutIdentityPage() {
  const view = await loadCheckout();
  if (!view) {
    return (
      <PageContent screen="O02">
        <h1 className="text-[28px] font-semibold text-ink">How would you like to check out?</h1>
        <NetworkError />
      </PageContent>
    );
  }
  if (!hasItems(view)) redirect("/cart");
  if (view.viewer.kind === "customer") redirect("/checkout/delivery");

  const { cart } = view;
  const names = cart.lines.map((l) => l.productName).join(" + ");

  return (
    <CheckoutFrame
      screen="O02"
      title="How would you like to check out?"
      stepper={<CheckoutStepper current="identity" title="Checkout / 1 / Identity" />}
      aside={<OrderSummary lines={cart.lines} totals={view.quote} />}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <section aria-labelledby="guest-title" className={`${panel} flex-1`}>
          <h2 id="guest-title" className="text-base font-semibold">
            Continue as guest
          </h2>
          <p className="text-base">No account needed. Enter your contact and delivery details on the next step.</p>
          <Link href="/checkout/delivery" className={`${primaryButton} self-start`}>
            Continue as guest
          </Link>
        </section>
        <section aria-labelledby="account-title" className={`${panel} flex-1`}>
          <h2 id="account-title" className="text-base font-semibold">
            Already have an account?
          </h2>
          <p className="text-base">Use saved addresses and keep your order history together.</p>
          <Link href={`/login?returnTo=${RETURN_TO}`} className={`${primaryButton} self-start`}>
            Sign in
          </Link>
          <p className="text-sm">
            New here?{" "}
            <Link href={`/register?returnTo=${RETURN_TO}`} className="underline">
              Create account
            </Link>{" "}
            (optional)
          </p>
        </section>
      </div>
      <StatusMessage title="Your cart is preserved">
        {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} · {names}. Signing in or choosing guest does not clear these items.
      </StatusMessage>
      <Link href="/cart" className={textLink}>
        Back to cart
      </Link>
    </CheckoutFrame>
  );
}
