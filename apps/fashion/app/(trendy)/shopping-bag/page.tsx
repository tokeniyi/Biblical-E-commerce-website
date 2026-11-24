import { salesNumber } from "@/lib/trendy";
import { ShoppingBag } from "../ordering";

export const metadata = { title: "Your bag" };

export default function BagPage() {
  return (
    <section className="frame tl-section inner-page">
      <h1>Your bag</h1>
      <ShoppingBag number={salesNumber()} />
    </section>
  );
}
