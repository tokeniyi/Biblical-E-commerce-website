import Link from "next/link";

export default function NotFound() {
  return (
    <section className="shell inner">
      <h1>Page unavailable</h1>
      <Link className="button" href="/#collection">
        Shop the collection
      </Link>
    </section>
  );
}
