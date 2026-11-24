import { Suspense } from "react";
import { Catalogue } from "./catalogue";

export const metadata = { title: "Shop the collection" };

export default function Collection() {
  return (
    <section className="frame tl-section inner-page">
      <h1>Shop the collection</h1>
      <Suspense fallback={<p>Loading the collection…</p>}>
        <Catalogue />
      </Suspense>
    </section>
  );
}
