"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { money } from "@/lib/catalog";
import {
  categoryName,
  edit,
  imagePath,
  productPath,
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
  if (!product || !colour || !Number.isSafeInteger(entry.quantity)) return [];
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

function contactButton(product: Product) {
  if (product.terms === "enquiry") return "Enquire on WhatsApp";
  if (product.terms === "negotiable") return "Discuss price on WhatsApp";
  return "Order on WhatsApp";
}

function lineDescription(product: Product, { colour, size, quantity }: BagEntry) {
  const price = product.terms === "enquiry" ? "price on request" : money(product.price);
  return `${quantity} × ${product.name} · ${colour} / ${size} · ${price}`;
}

function WhatsAppButton({
  label,
  number,
  message,
  disabled,
}: {
  label: string;
  number?: string;
  message: (origin: string) => string;
  disabled?: boolean;
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
      <button className="tl-button contact-button" type="button" disabled={disabled} onClick={open}>
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
  const selected = size
    ? { slug: product.slug, colour: colour.name, size, quantity: 1 }
    : undefined;
  const limit = size ? variantLimit(product, colour, size) : 0;

  function add() {
    if (!selected || !limit) return;
    const current =
      lines(readBag()).find(({ entry }) => sameVariant(entry, selected))?.entry.quantity ?? 0;
    if (current >= limit) {
      setNotice("Your bag already has the available quantity.");
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
          {product.terms === "negotiable" && <small>Asking price · Negotiable</small>}
        </p>
      </div>
      <div className="detail-photo">
        <Image
          src={imagePath(colour.photo)}
          alt={`${product.name} in ${colour.name}`}
          width={820}
          height={780}
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
          <button className="tl-button" type="button" disabled={!limit} onClick={add}>
            Add to bag
          </button>
          <WhatsAppButton
            label={contactButton(product)}
            number={number}
            disabled={!limit}
            message={(origin) => {
              if (!selected) return "";
              const request =
                product.terms === "fixed"
                  ? "I'd like to order"
                  : product.terms === "negotiable"
                    ? "I'd like to discuss the price for"
                    : "Could you confirm the price and availability for";
              return `Hi Trendy Luxury! ${request} this item:\n\n${lineDescription(product, selected)}\n${origin}${productPath(product.slug)}`;
            }}
          />
        </div>
        {notice && (
          <p role="status" className="add-feedback">
            {notice}{" "}
            <Link href="/shopping-bag" className="text-link">
              View bag
            </Link>
          </p>
        )}
        <details className="fit-details">
          <summary>Size &amp; fit</summary>
          <p>{product.fit}</p>
        </details>
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
  const needsQuote = bag.some(({ product }) => product.terms !== "fixed");
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
                {entry.colour} / {entry.size}
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
        <p>
          {needsQuote
            ? "Confirm final prices, availability and delivery on WhatsApp."
            : "Confirm delivery with the store on WhatsApp."}
        </p>
        <WhatsAppButton
          label="Send bag on WhatsApp"
          number={number}
          message={(origin) =>
            `Hi Trendy Luxury! Could you confirm my order and delivery options?\n\n${bag.map(({ product, entry }) => `${lineDescription(product, entry)}\n${origin}${productPath(product.slug)}`).join("\n\n")}`
          }
        />
      </aside>
    </div>
  );
}
