"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { deliveryOptions, money } from "@/lib/catalog";
import {
  categoryName,
  edit,
  imagePath,
  productPath,
  trendyVariantId,
  variantLimit,
  type Product,
} from "@/lib/trendy";

type BagEntry = { slug: string; colour: string; size: string; quantity: number };

const bagKey = "trendy-luxury-bag";
const bagEvent = "trendy-luxury-bag-change";
let fallbackBag = "[]";

function readBag() {
  try {
    return localStorage.getItem(bagKey) ?? "[]";
  } catch {
    return fallbackBag;
  }
}

function subscribe(update: () => void) {
  window.addEventListener(bagEvent, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(bagEvent, update);
    window.removeEventListener("storage", update);
  };
}

function resolve(entry: BagEntry) {
  const product = edit.find((item) => item.slug === entry.slug);
  const colour = product?.colours.find((item) => item.name === entry.colour);
  if (
    !product ||
    !colour ||
    typeof entry.size !== "string" ||
    !Number.isSafeInteger(entry.quantity)
  ) {
    return [];
  }
  const limit = variantLimit(product, colour, entry.size);
  if (entry.quantity < 1 || entry.quantity > limit) return [];
  return [{ entry, product, colour, limit }];
}

function lines(raw: string) {
  try {
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry) => (entry && typeof entry === "object" ? resolve(entry) : []));
  } catch {
    return [];
  }
}

function sameVariant(left: BagEntry, right: BagEntry) {
  return left.slug === right.slug && left.colour === right.colour && left.size === right.size;
}

function writeQuantity(entry: BagEntry) {
  const bag = lines(readBag()).map((line) => line.entry);
  const index = bag.findIndex((line) => sameVariant(line, entry));
  if (index >= 0) bag.splice(index, 1, ...(entry.quantity > 0 ? [entry] : []));
  else if (entry.quantity > 0) bag.push(entry);
  fallbackBag = JSON.stringify(bag);
  try {
    localStorage.setItem(bagKey, fallbackBag);
  } catch {
    // Keep the bag available for this visit when storage is blocked.
  }
  window.dispatchEvent(new Event(bagEvent));
}

function useLines() {
  return lines(useSyncExternalStore(subscribe, readBag, () => "[]"));
}

export function BagLink() {
  const count = useLines().reduce((sum, { entry }) => sum + entry.quantity, 0);
  return (
    <Link className="tl-bag-link" href="/shopping-bag">
      Bag <span aria-label={`${count} items`}>{count}</span>
    </Link>
  );
}

function lineDescription(product: Product, { colour, size, quantity }: BagEntry) {
  const price = product.terms === "enquiry" ? "price on request" : money(product.price * quantity);
  const variant = size ? `${colour} / ${size}` : colour;
  return `${quantity} × ${product.name} · ${variant} · ${price}`;
}

function WhatsAppButton({
  label,
  number,
  message,
  disabled,
  secondary,
}: {
  label: string;
  number?: string;
  message: (origin: string) => string;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");

  function open() {
    setDraft(message(window.location.origin));
    setFeedback("");
    dialog.current?.showModal();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setFeedback("Message copied.");
    } catch {
      setFeedback("Select and copy the message below.");
    }
  }

  return (
    <>
      <button
        className={secondary ? "text-link" : "tl-button contact-button"}
        type="button"
        disabled={disabled}
        onClick={open}
      >
        {label}
      </button>
      <dialog ref={dialog} className="whatsapp-dialog" aria-label="WhatsApp message preview">
        <form method="dialog" className="dialog-head">
          <h2>WhatsApp message</h2>
          <button className="text-link" type="submit">
            Close
          </button>
        </form>
        <p>
          {number
            ? "Review your message before opening WhatsApp."
            : "Demo preview. Your message will stay here until a sales number is connected."}
        </p>
        <textarea aria-label="Message draft" readOnly rows={6} value={draft} />
        <p className="dialog-feedback" role="status">
          {feedback}
        </p>
        <div className="dialog-actions">
          <button className="tl-button outline" type="button" onClick={copy}>
            Copy message
          </button>
          {number && (
            <a
              className="tl-button"
              href={`https://wa.me/${number}?text=${encodeURIComponent(draft)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open WhatsApp
            </a>
          )}
        </div>
      </dialog>
    </>
  );
}

export function ProductOrder({ product, number }: { product: Product; number?: string }) {
  const [colourIndex, setColourIndex] = useState(0);
  const colour = product.colours[colourIndex];
  const [size, setSize] = useState<string | undefined>(
    product.sizes.length === 1 ? product.sizes[0] : undefined,
  );
  const [notice, setNotice] = useState("");
  const sizeOnRequest = product.sizes.length === 0;
  const chosenSize = sizeOnRequest ? (size ?? "").trim() : size;
  const selected =
    chosenSize === undefined
      ? undefined
      : { slug: product.slug, colour: colour.name, size: chosenSize, quantity: 1 };
  const limit = selected ? variantLimit(product, colour, selected.size) : 0;

  function add() {
    if (!selected || !limit) return;
    const current =
      lines(readBag()).find(({ entry }) => sameVariant(entry, selected))?.entry.quantity ?? 0;
    if (current >= limit) {
      setNotice(
        product.terms === "enquiry"
          ? "This selection is already in your bag."
          : "Your bag already has the available quantity.",
      );
      return;
    }
    writeQuantity({ ...selected, quantity: current + 1 });
    setNotice("Added to your bag.");
  }

  return (
    <div className="tl-product">
      <div className="detail-heading">
        <p className="label">{categoryName(product.category)}</p>
        <h1>{product.name}</h1>
        <p className="detail-price">
          {product.terms === "enquiry" ? "Price on request" : money(product.price)}
          {product.terms === "negotiable" && <small>Sample price · Negotiable</small>}
        </p>
      </div>
      <div className="detail-photo">
        <Image
          src={imagePath(colour.photo)}
          alt={`${product.name} in ${colour.name}`}
          width={228}
          height={282}
          preload
          unoptimized
        />
      </div>
      <div className="detail-actions">
        <p className="product-description">{product.description}</p>
        <fieldset>
          <legend>
            Colour <span>{colour.name}</span>
          </legend>
          <div className="variant-row">
            {product.colours.map((item, index) => (
              <button
                key={item.name}
                type="button"
                className="colour-option"
                aria-label={item.name}
                aria-pressed={index === colourIndex}
                onClick={() => {
                  setColourIndex(index);
                  setSize((current) =>
                    current && variantLimit(product, item, current) > 0 ? current : undefined,
                  );
                  setNotice("");
                }}
              >
                <span style={{ background: item.swatch }} />
              </button>
            ))}
          </div>
        </fieldset>
        {sizeOnRequest && product.category !== "accessories" && (
          <label className="preferred-size">
            Preferred size <span>(optional)</span>
            <input
              type="text"
              maxLength={32}
              value={size ?? ""}
              onChange={(event) => {
                setSize(event.target.value);
                setNotice("");
              }}
              placeholder={product.category === "footwear" ? "e.g. EU 42" : "e.g. M or W32"}
            />
          </label>
        )}
        {!sizeOnRequest && (
          <fieldset>
            <legend>Size</legend>
            <div className="variant-row">
              {product.sizes.map((option) => {
                const available = variantLimit(product, colour, option) > 0;
                return (
                  <button
                    key={option}
                    type="button"
                    className="size-option"
                    aria-pressed={size === option}
                    disabled={!available}
                    aria-label={available ? option : `${option} — sold out`}
                    onClick={() => {
                      setSize(option);
                      setNotice("");
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <p className="variant-stock" role="status">
          {product.terms === "enquiry"
            ? "Confirm availability with the store."
            : selected
              ? limit > 0
                ? `In stock · ${limit} available`
                : "Sold out"
              : "Select a size to check availability."}
        </p>
        <div className="purchase-actions">
          {product.price > 0 && (
            <button className="tl-button" type="button" disabled={!limit} onClick={add}>
              Add to bag
            </button>
          )}
          {product.price === 0 && (
            <WhatsAppButton
              label="Enquire on WhatsApp"
              number={number}
              disabled={!limit}
              message={(origin) =>
                selected
                  ? `Hi Trendy Luxury! Could you confirm the price and availability?\n\n${lineDescription(product, selected)}\n${origin}${productPath(product.slug)}`
                  : ""
              }
            />
          )}
        </div>
        {notice && (
          <p role="status" className="add-feedback">
            {notice}{" "}
            <Link href="/shopping-bag" className="text-link">
              View bag
            </Link>
          </p>
        )}
        {product.fit && (
          <details className="fit-details">
            <summary>Size &amp; fit</summary>
            <p>{product.fit}</p>
          </details>
        )}
      </div>
    </div>
  );
}

export function ShoppingBag({ number }: { number?: string }) {
  const bag = useLines();
  if (bag.length === 0) {
    return (
      <div className="empty-state">
        <p>Your bag is empty.</p>
        <Link className="tl-button" href="/collection">
          Shop the collection
        </Link>
      </div>
    );
  }
  const subtotal = bag.reduce((sum, { product, entry }) => sum + product.price * entry.quantity, 0);
  const needsQuote = bag.some(({ product }) => product.price === 0);
  return (
    <div className="tl-bag">
      <ul className="tl-bag-items">
        {bag.map(({ entry, product, colour, limit }) => (
          <li className="tl-bag-row" key={`${entry.slug}/${entry.colour}/${entry.size}`}>
            <Link href={productPath(product.slug)} aria-label={product.name}>
              <Image src={imagePath(colour.photo)} alt="" width={120} height={120} unoptimized />
            </Link>
            <div className="bag-item-copy">
              <Link className="bag-item-title" href={productPath(product.slug)}>
                {product.name}
              </Link>
              <p>
                {entry.colour}
                {entry.size && ` / ${entry.size}`}
              </p>
              <div className="tl-quantity">
                <button
                  type="button"
                  aria-label={`Decrease quantity for ${product.name}, ${entry.colour}, ${entry.size}`}
                  disabled={entry.quantity === 1}
                  onClick={() => writeQuantity({ ...entry, quantity: entry.quantity - 1 })}
                >
                  −
                </button>
                <span>{entry.quantity}</span>
                <button
                  type="button"
                  aria-label={`Increase quantity for ${product.name}, ${entry.colour}, ${entry.size}`}
                  disabled={entry.quantity >= limit}
                  onClick={() => writeQuantity({ ...entry, quantity: entry.quantity + 1 })}
                >
                  +
                </button>
                <button
                  type="button"
                  className="text-link"
                  aria-label={`Remove ${product.name}, ${entry.colour}, ${entry.size}`}
                  onClick={() => writeQuantity({ ...entry, quantity: 0 })}
                >
                  Remove
                </button>
              </div>
            </div>
            <strong>
              {product.terms === "enquiry"
                ? "Price on request"
                : money(product.price * entry.quantity)}
            </strong>
          </li>
        ))}
      </ul>
      <aside className="tl-summary">
        <h2>Bag summary</h2>
        <dl>
          <div>
            <dt>{needsQuote ? "Listed subtotal" : "Subtotal"}</dt>
            <dd>{subtotal > 0 ? money(subtotal) : "On request"}</dd>
          </div>
        </dl>
        {needsQuote && <p>Items marked “Price on request” are handled on WhatsApp.</p>}
        {subtotal > 0 && (
          <Link className="tl-button" href="/guest-checkout">
            Proceed to checkout
          </Link>
        )}
        {(needsQuote || bag.some(({ product }) => product.terms === "negotiable")) && (
          <WhatsAppButton
            label={subtotal > 0 ? "Negotiate price" : "Enquire on WhatsApp"}
            number={number}
            secondary={subtotal > 0}
            message={(origin) =>
              `Hi Trendy Luxury! Could we discuss the price for these items?\n\n${bag.map(({ product, entry }) => `${lineDescription(product, entry)}\n${origin}${productPath(product.slug)}`).join("\n\n")}${subtotal > 0 ? `\n\nListed subtotal: ${money(subtotal)}` : ""}`
            }
          />
        )}
      </aside>
    </div>
  );
}

export function GuestCheckout({ enabled }: { enabled: boolean }) {
  const bag = useLines();
  const priced = bag.filter(({ product }) => product.price > 0);
  const [delivery, setDelivery] = useState<keyof typeof deliveryOptions>("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const subtotal = priced.reduce(
    (sum, { product, entry }) => sum + product.price * entry.quantity,
    0,
  );

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !enabled || !priced.length) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const items = priced.map(({ entry }) => ({
      id: trendyVariantId(entry.slug, entry.colour, entry.size),
      quantity: entry.quantity,
    }));
    const snapshot = readBag();
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          address: form.get("address") ?? "",
          storefront: "trendy",
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not start checkout.");
        return;
      }
      try {
        sessionStorage.setItem(`trendy-checkout:${result.reference}`, snapshot);
      } catch {
        // Payment can proceed without browser storage.
      }
      window.location.assign(result.url);
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!priced.length)
    return (
      <p>
        No items with a listed price.{" "}
        <Link className="text-link" href="/shopping-bag">
          Return to bag
        </Link>
      </p>
    );

  return (
    <div className="tl-checkout">
      <form onSubmit={pay}>
        <label>
          Full name
          <input name="name" autoComplete="name" minLength={2} maxLength={100} required />
        </label>
        <label>
          WhatsApp phone number
          <input name="phone" type="tel" autoComplete="tel" maxLength={22} required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" maxLength={200} required />
        </label>
        <label>
          Delivery option
          <select
            name="delivery"
            value={delivery}
            onChange={(event) =>
              setDelivery(event.target.value === "pickup" ? "pickup" : "standard")
            }
          >
            {Object.entries(deliveryOptions).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label} · {option.fee ? money(option.fee) : "Free"}
              </option>
            ))}
          </select>
        </label>
        {delivery === "standard" && (
          <label>
            Delivery address
            <textarea
              name="address"
              autoComplete="street-address"
              minLength={5}
              maxLength={300}
              required
            />
          </label>
        )}
        {!enabled && <p>Test payments require a configured database and Paystack test key.</p>}
        {error && <p role="alert">{error}</p>}
        <button className="tl-button" disabled={!enabled || busy}>
          {busy ? "Opening Paystack…" : "Pay with Paystack (test)"}
        </button>
      </form>
      <aside className="tl-summary">
        <h2>Order summary</h2>
        <ul>
          {priced.map(({ product, entry }) => (
            <li key={trendyVariantId(entry.slug, entry.colour, entry.size)}>
              {entry.quantity} × {product.name} · {entry.colour} / {entry.size} ·{" "}
              {money(product.price * entry.quantity)}
            </li>
          ))}
        </ul>
        {priced.length < bag.length && <p>Items without a listed price stay in your bag.</p>}
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>{money(deliveryOptions[delivery].fee)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(subtotal + deliveryOptions[delivery].fee)}</dd>
          </div>
        </dl>
        <Link className="text-link" href="/shopping-bag">
          Return to bag
        </Link>
      </aside>
    </div>
  );
}

export function ClearTrendyBag({ reference }: { reference: string }) {
  useEffect(() => {
    try {
      const key = `trendy-checkout:${reference}`;
      const raw = readBag();
      if (sessionStorage.getItem(key) === raw) {
        const remaining = lines(raw).filter(({ product }) => product.price === 0);
        localStorage.setItem(bagKey, JSON.stringify(remaining.map(({ entry }) => entry)));
        window.dispatchEvent(new Event(bagEvent));
      }
      sessionStorage.removeItem(key);
    } catch {
      // The order confirmation remains readable without browser storage.
    }
  }, [reference]);
  return null;
}
