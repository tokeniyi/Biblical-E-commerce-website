"use client";

import { useState, type FormEvent } from "react";

/** Demo newsletter sign-up: validates and confirms; no email is stored or sent. */
export function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("newsletter-email") ?? "");
    setStatus(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "done" : "error");
  }

  if (status === "done") {
    return (
      <p role="status" className="rounded-xl bg-gold-soft p-3 text-sm text-ink">
        Thanks for subscribing. (Demo store: no emails are sent.)
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 text-sm" data-track="newsletter-form">
      <label htmlFor="newsletter-email" className="font-semibold">
        Reading plans &amp; new editions, monthly
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          name="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={status === "error" || undefined}
          aria-describedby={status === "error" ? "newsletter-error" : undefined}
          className="min-w-0 flex-1"
        />
        <button type="submit" className="rounded-full bg-ink px-4 font-semibold text-white hover:bg-brand">
          Subscribe
        </button>
      </div>
      {status === "error" ? (
        <p id="newsletter-error" className="text-danger">
          Enter an email address like name@example.com.
        </p>
      ) : null}
    </form>
  );
}
