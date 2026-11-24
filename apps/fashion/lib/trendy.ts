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
  stock: number[];
};

export type Product = {
  slug: string;
  name: string;
  category: Category;
  description: string;
  fit: string;
  price: number;
  terms: "fixed" | "negotiable" | "enquiry";
  sizes: string[];
  colours: Colour[];
  pairsWith: string[];
};

export const edit = [
  {
    slug: "terrace-jersey",
    name: "Terrace Jersey",
    category: "clothing",
    description:
      "A relaxed football top with tonal stripes, a contrast collar and a straight hem. Wear it loose over cargos.",
    fit: "Relaxed fit with room through the body. Choose your usual letter size.",
    price: 2850000,
    terms: "fixed",
    sizes: ["S", "M", "L", "XL"],
    colours: [
      { name: "Forest", swatch: "#2f4739", photo: "jersey-forest", stock: [4, 6, 0, 2] },
      { name: "Chalk", swatch: "#ded8c9", photo: "jersey-chalk", stock: [0, 3, 5, 1] },
    ],
    pairsWith: ["afterhours-runner", "nightshift-frames", "utility-cargo"],
  },
  {
    slug: "afterhours-runner",
    name: "Afterhours Runner",
    category: "footwear",
    description: "A low-profile runner with layered mesh, ash-grey panels and a dark rubber sole.",
    fit: "Sizes are listed in EU sizing. Ask about fit if you are between sizes.",
    price: 7200000,
    terms: "negotiable",
    sizes: ["EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45"],
    colours: [
      { name: "Bone / Ash", swatch: "#a9a79c", photo: "runner", stock: [1, 1, 3, 4, 0, 2] },
    ],
    pairsWith: ["terrace-jersey", "utility-cargo", "nightshift-frames"],
  },
  {
    slug: "nightshift-frames",
    name: "Nightshift Frames",
    category: "accessories",
    description: "Slim rectangular sunglasses with a glossy black frame and smoke-tinted lenses.",
    fit: "One size, with a narrow rectangular profile.",
    price: 0,
    terms: "enquiry",
    sizes: ["One size"],
    colours: [{ name: "Gloss Black", swatch: "#232521", photo: "frames", stock: [0] }],
    pairsWith: ["terrace-jersey", "afterhours-runner", "utility-cargo"],
  },
  {
    slug: "utility-cargo",
    name: "Utility Cargo",
    category: "clothing",
    description: "Washed charcoal cargos with a roomy straight leg and two generous side pockets.",
    fit: "Waist sizes are listed in inches. Straight leg with a relaxed fit.",
    price: 3950000,
    terms: "fixed",
    sizes: ["W28", "W30", "W32", "W34", "W36"],
    colours: [{ name: "Washed Black", swatch: "#373733", photo: "cargo", stock: [2, 4, 3, 2, 0] }],
    pairsWith: ["terrace-jersey", "afterhours-runner", "nightshift-frames"],
  },
] satisfies Product[];

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
  const stock = colour.stock[product.sizes.indexOf(size)] ?? 0;
  return product.terms === "enquiry" && product.sizes.includes(size) ? 1 : stock;
}

export function salesNumber() {
  const number = process.env.NEXT_PUBLIC_TRENDY_WHATSAPP?.trim();
  return number && /^[1-9][0-9]{7,14}$/.test(number) ? number : undefined;
}
