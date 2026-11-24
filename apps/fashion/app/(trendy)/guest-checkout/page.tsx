import { checkoutEnabled } from "@/lib/paystack";
import { GuestCheckout } from "../ordering";

export const metadata = { title: "Guest checkout" };

export default function CheckoutPage() {
  return (
    <section className="frame inner-page">
      <h1>Guest checkout</h1>
      <GuestCheckout enabled={checkoutEnabled()} />
    </section>
  );
}
