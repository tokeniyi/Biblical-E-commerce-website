import { instagramProducts } from "./trendy-catalogue";

export const categories = [
  { name: "Clothing", slug: "clothing" },
  { name: "Footwear", slug: "footwear" },
  { name: "Accessories", slug: "accessories" },
] as const;

export type Category = (typeof categories)[number]["slug"];

type Colour = {
  name: string;
  swatch: string;
  photo: string;
  stock: readonly number[];
};

export type Product = {
  slug: string;
  name: string;
  category: Category;
  kind: string;
  description: string;
  fit?: string;
  price: number;
  terms: "fixed" | "negotiable" | "enquiry";
  sizes: string[];
  colours: readonly Colour[];
};

export const edit: readonly Product[] = instagramProducts.map((product) => ({
  price: 0,
  terms: "enquiry",
  sizes: [],
  ...product,
}));

export const featured = [
  "green-contrast-jersey",
  "layered-panel-sneakers",
  "patterned-zip-pouch",
  "embroidered-scenic-jacket",
  "striped-rugby-shirt",
  "lace-up-boots",
  "checker-knit-beanie",
  "round-metal-frames",
];

export function relatedProducts(product: Product) {
  return categories
    .filter(({ slug }) => slug !== product.category)
    .map(({ slug }) => edit.find((item) => item.category === slug && featured.includes(item.slug)))
    .concat(edit.find((item) => item.slug !== product.slug && item.kind === product.kind))
    .filter((item) => item !== undefined);
}

export function imagePath(photo: string) {
  return `/images/trendy/${photo}.webp`;
}

export function productPath(slug: string) {
  return `/collection/${slug}`;
}

export function categoryName(category: Category) {
  return categories.find((item) => item.slug === category)?.name;
}

export function variantLimit(product: Product, colour: Colour, size: string) {
  if (product.terms === "enquiry") {
    if (product.sizes.length === 0) return size.length <= 32 && size === size.trim() ? 1 : 0;
    return product.sizes.includes(size) ? 1 : 0;
  }
  return colour.stock[product.sizes.indexOf(size)] ?? 0;
}

export function salesNumber() {
  const number = process.env.NEXT_PUBLIC_TRENDY_WHATSAPP?.trim();
  return number && /^[1-9][0-9]{7,14}$/.test(number) ? number : undefined;
}
