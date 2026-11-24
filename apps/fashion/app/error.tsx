"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="shell inner">
      <h1>Something went wrong</h1>
      <p>Try loading this page again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
