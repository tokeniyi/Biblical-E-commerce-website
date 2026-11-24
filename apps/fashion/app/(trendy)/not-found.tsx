import Link from "next/link";

export default function MissingStyle() {
  return (
    <section className="frame tl-section inner-page">
      <h1>Style unavailable</h1>
      <p>Browse the collection to find another style.</p>
      <Link className="tl-button" href="/collection">
        Shop the collection
      </Link>
    </section>
  );
}
