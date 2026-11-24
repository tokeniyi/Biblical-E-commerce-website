"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  addToBag,
  clearPurchasedBag,
  rememberCheckout,
  setQuantity,
  useBag,
  type BagLine,
} from "@/lib/bag";
import { deliveryFee, money, sizes, type Product, type Variant } from "@/lib/catalog";

export function BagLink() {
  const count = useBag().reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Link href="/bag" aria-label={`Bag, ${count} items`}>
      Bag <span>({count})</span>
    </Link>
  );
}

export function ProductPurchase({ product, stock }: { product: Product; stock: Variant[] }) {
  const [code, setCode] = useState(product.colours[0].code);
  const [size, setSize] = useState<string>();
  const [notice, setNotice] = useState("");
  const colour = product.colours.find((entry) => entry.code === code)!;
  const selected = stock.find((variant) => variant.code === code && variant.size === size);

  return (
    <div className="product-layout shell">
      <div className="product-photo">
        <Image
          src={colour.image}
          alt={`${product.name} in ${colour.name}`}
          width={750}
          height={950}
          unoptimized
          preload
        />
      </div>
      <section className="product-info">
        <Link className="back-link" href="/#collection">
          ← Back to collection
        </Link>
        <h1>{product.name}</h1>
        <p className="product-price">{money(product.price)}</p>
        <p className="product-description">{product.description}</p>
        <fieldset>
          <legend>
            Colour <span className="muted">/ {colour.name}</span>
          </legend>
          <div className="choices">
            {product.colours.map((entry) => (
              <button
                type="button"
                key={entry.code}
                className="swatch"
                aria-label={entry.name}
                aria-pressed={entry.code === code}
                onClick={() => {
                  setCode(entry.code);
                  setSize(undefined);
                  setNotice("");
                }}
              >
                <span style={{ background: entry.hex }} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            Size <span className="muted">{size ? `/ ${size}` : ""}</span>
          </legend>
          <div className="choices">
            {sizes.map((entry) => {
              const available = stock.some(
                (variant) =>
                  variant.code === code && variant.size === entry && variant.quantity > 0,
              );
              return (
                <button
                  type="button"
                  key={entry}
                  disabled={!available}
                  aria-label={available ? entry : `${entry} — sold out`}
                  aria-pressed={entry === size}
                  onClick={() => {
                    setSize(entry);
                    setNotice("");
                  }}
                >
                  {entry}
                </button>
              );
            })}
          </div>
        </fieldset>
        <p className="availability" aria-live="polite">
          {selected
            ? selected.quantity > 0
              ? `${selected.quantity} in stock`
              : "Sold out"
            : "Select a size to see stock."}
        </p>
        <button
          type="button"
          className="button full"
          disabled={!selected?.quantity}
          onClick={() =>
            selected &&
            setNotice(
              addToBag(selected)
                ? "Added to your bag."
                : "Your bag already contains the available quantity.",
            )
          }
        >
          Add to bag
        </button>
        {notice && (
          <p className="feedback" role="status">
            {notice} <Link href="/bag">View bag</Link>
          </p>
        )}
        <details>
          <summary>Fit & size guide</summary>
          <p>{product.fit}</p>
          <table className="size-guide">
            <caption>Body measurements in cm</caption>
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">Bust</th>
                <th scope="col">Waist</th>
                <th scope="col">Hip</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((entry, index) => (
                <tr key={entry}>
                  <th scope="row">{entry}</th>
                  <td>{80 + index * 5}</td>
                  <td>{62 + index * 5}</td>
                  <td>{88 + index * 5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <details>
          <summary>Delivery & payment</summary>
          <p>
            Lagos delivery is {money(deliveryFee)} per order. This portfolio demo uses Paystack test
            mode.
          </p>
        </details>
      </section>
    </div>
  );
}

function totals(lines: BagLine[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.variant.price, 0);
  return { subtotal, total: subtotal + deliveryFee };
}

function Summary({ lines, children }: { lines: BagLine[]; children?: React.ReactNode }) {
  const { subtotal, total } = totals(lines);
  return (
    <aside className="summary">
      <h2>Order summary</h2>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(subtotal)}</dd>
        </div>
        <div>
          <dt>Lagos delivery</dt>
          <dd>{money(deliveryFee)}</dd>
        </div>
        <div className="summary-total">
          <dt>Total</dt>
          <dd>{money(total)}</dd>
        </div>
      </dl>
      {children}
    </aside>
  );
}

function Line({ line, editable }: { line: BagLine; editable?: boolean }) {
  const { variant, quantity } = line;
  return (
    <li className="bag-line">
      <Link href={`/shop/${variant.slug}`}>
        <Image
          src={variant.image}
          alt={`${variant.name} in ${variant.colour}`}
          width={100}
          height={125}
          unoptimized
        />
      </Link>
      <div>
        <Link className="line-name" href={`/shop/${variant.slug}`}>
          {variant.name}
        </Link>
        <p>
          {variant.colour} / {variant.size}
          {!editable && ` · Qty ${quantity}`}
        </p>
        {editable && (
          <div className="quantity">
            <button
              type="button"
              aria-label={`Decrease quantity for ${variant.name}, ${variant.colour}, ${variant.size}`}
              disabled={quantity <= 1}
              onClick={() => setQuantity(variant.id, quantity - 1)}
            >
              −
            </button>
            <span aria-label={`Quantity ${quantity}`}>{quantity}</span>
            <button
              type="button"
              aria-label={`Increase quantity for ${variant.name}, ${variant.colour}, ${variant.size}`}
              disabled={quantity >= 10}
              onClick={() => setQuantity(variant.id, quantity + 1)}
            >
              +
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setQuantity(variant.id, 0)}
            >
              Remove
            </button>
          </div>
        )}
      </div>
      <strong className="line-price">{money(variant.price * quantity)}</strong>
    </li>
  );
}

function EmptyBag() {
  return (
    <div className="empty">
      <p>Your bag is empty.</p>
      <Link className="button" href="/#collection">
        Shop the collection
      </Link>
    </div>
  );
}

export function Bag() {
  const lines = useBag();
  return (
    <div className="shell inner">
      <h1>Your bag</h1>
      {lines.length === 0 ? (
        <EmptyBag />
      ) : (
        <div className="split">
          <ul className="bag-lines">
            {lines.map((line) => (
              <Line key={line.variant.id} line={line} editable />
            ))}
          </ul>
          <Summary lines={lines}>
            <Link className="button full" href="/checkout">
              Continue to checkout
            </Link>
            <p className="muted note">Stock is confirmed when you start payment.</p>
          </Summary>
        </div>
      )}
    </div>
  );
}

export function Checkout({ enabled }: { enabled: boolean }) {
  const lines = useBag();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setNotice("");
    const details = Object.fromEntries(new FormData(event.currentTarget));
    let redirected = false;
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...details,
          items: lines.map(({ variant, quantity }) => ({ id: variant.id, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.url || !result.reference) {
        setNotice(result.error ?? "Checkout could not start. Please try again.");
        return;
      }
      rememberCheckout(result.reference);
      window.location.assign(result.url);
      redirected = true;
    } catch {
      setNotice("Could not connect to checkout. Please try again.");
    } finally {
      if (!redirected) {
        submitting.current = false;
        setPending(false);
      }
    }
  }

  return (
    <div className="shell inner">
      <Link className="back-link" href="/bag">
        ← Back to bag
      </Link>
      <h1>Checkout</h1>
      {lines.length === 0 ? (
        <EmptyBag />
      ) : (
        <div className="split">
          <div>
            <h2>Delivery details</h2>
            <p className="muted">
              Lagos demo orders only. Use sample contact and delivery details.
            </p>
            <form className="shop-form" onSubmit={submit}>
              <label>
                Full name
                <input name="name" required minLength={2} maxLength={100} />
              </label>
              <label>
                Email
                <input name="email" type="email" required maxLength={200} />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" required minLength={7} maxLength={22} />
              </label>
              <label>
                Lagos delivery address
                <textarea name="address" rows={3} required minLength={5} maxLength={300} />
              </label>
              <div className="payment-note">
                <strong>Paystack test mode</strong>
                <p>Use a Paystack test card at the next step. No money will be charged.</p>
              </div>
              {!enabled && (
                <p className="feedback" role="status">
                  Test checkout has not been configured for this deployment.
                </p>
              )}
              {notice && (
                <p className="feedback" role="alert">
                  {notice}
                </p>
              )}
              <button type="submit" className="button full" disabled={!enabled || pending}>
                {pending ? "Opening Paystack…" : `Pay ${money(totals(lines).total)} with Paystack`}
              </button>
            </form>
          </div>
          <div>
            <ul className="bag-lines compact">
              {lines.map((line) => (
                <Line key={line.variant.id} line={line} />
              ))}
            </ul>
            <Summary lines={lines} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ClearBag({ reference }: { reference: string }) {
  useEffect(() => {
    clearPurchasedBag(reference);
  }, [reference]);
  return null;
}
