"use client";

import { useSyncExternalStore } from "react";
import { variants, type Variant } from "./catalog";

const key = "studio-form-bag";
const change = "studio-form-bag-change";
type Entry = { id: string; quantity: number };
export type BagLine = { variant: Variant; quantity: number };

function read() {
  return localStorage.getItem(key) ?? "[]";
}

function entries(raw = read()): Entry[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const valid = data.filter(
      (item): item is Entry =>
        item &&
        typeof item.id === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 10,
    );
    return [...new Map(valid.map((item) => [item.id, item])).values()];
  } catch {
    return [];
  }
}

function subscribe(update: () => void) {
  window.addEventListener(change, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(change, update);
    window.removeEventListener("storage", update);
  };
}

export function useBag() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  return entries(raw).flatMap((item): BagLine[] => {
    const variant = variants.find((entry) => entry.id === item.id);
    return variant ? [{ variant, quantity: item.quantity }] : [];
  });
}

function save(items: Entry[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event(change));
}

export function setQuantity(id: string, quantity: number) {
  const items = entries().filter((item) => item.id !== id);
  if (quantity > 0) items.push({ id, quantity: Math.min(quantity, 10) });
  save(items);
}

export function addToBag(variant: Variant) {
  const current = entries().find((item) => item.id === variant.id)?.quantity ?? 0;
  if (current >= Math.min(10, variant.quantity)) return false;
  setQuantity(variant.id, current + 1);
  return true;
}

export function rememberCheckout(reference: string) {
  try {
    sessionStorage.setItem(`studio-form:${reference}`, read());
  } catch {
    // The payment can continue when browser storage is unavailable.
  }
}

export function clearPurchasedBag(reference: string) {
  try {
    const saved = sessionStorage.getItem(`studio-form:${reference}`);
    if (saved && saved === read()) save([]);
    sessionStorage.removeItem(`studio-form:${reference}`);
  } catch {
    // The receipt stays readable when browser storage is unavailable.
  }
}
