import { checkoutEnabled } from "@/lib/paystack";
import { Checkout } from "../shopper";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <Checkout enabled={checkoutEnabled()} />;
}
