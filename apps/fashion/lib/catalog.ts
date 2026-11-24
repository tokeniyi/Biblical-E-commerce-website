export const sizes = ["XS", "S", "M", "L", "XL"] as const;
export const deliveryFee = 350000;

export const products = [
  {
    slug: "column-dress",
    name: "The Column Dress",
    category: "Dresses",
    price: 4650000,
    description:
      "A square neckline and a clean, full-length silhouette. Cut from breathable linen with a back slit for an easy stride.",
    fit: "Close through the bust, straight through the body. Size up if between sizes.",
    colours: [
      {
        name: "Chalk",
        code: "chalk",
        hex: "#eae0cd",
        image: "/images/dress-chalk.webp",
        stock: [4, 6, 4, 0, 2],
      },
      {
        name: "Espresso",
        code: "espresso",
        hex: "#47312a",
        image: "/images/dress-espresso.webp",
        stock: [0, 3, 5, 3, 1],
      },
    ],
  },
  {
    slug: "sunday-shirt",
    name: "The Sunday Shirt",
    category: "Shirts",
    price: 3200000,
    description:
      "A loose, washed linen shirt with a dropped shoulder, an open collar and a curved hem.",
    fit: "Oversized. Choose your usual size for a relaxed fit or size down for a closer fit.",
    colours: [
      {
        name: "Clay",
        code: "clay",
        hex: "#aa6d57",
        image: "/images/shirt-clay.webp",
        stock: [5, 5, 2, 3, 1],
      },
      {
        name: "Salt",
        code: "salt",
        hex: "#eee8de",
        image: "/images/shirt-salt.webp",
        stock: [5, 0, 6, 4, 2],
      },
    ],
  },
  {
    slug: "wide-leg-trouser",
    name: "The Wide-Leg Trouser",
    category: "Trousers",
    price: 3850000,
    description:
      "A high-rise linen trouser with front pleats and a full, wide leg. Finished with side pockets and a clean waistband.",
    fit: "Fitted at the waist with room through the hip and leg.",
    colours: [
      {
        name: "Stone",
        code: "stone",
        hex: "#a48c73",
        image: "/images/trouser-stone.webp",
        stock: [2, 4, 6, 3, 0],
      },
    ],
  },
];

export type Product = (typeof products)[number];
export type Variant = {
  id: string;
  slug: string;
  name: string;
  colour: string;
  code: string;
  size: (typeof sizes)[number];
  image: string;
  price: number;
  quantity: number;
};

export const variants: Variant[] = products.flatMap((product) =>
  product.colours.flatMap((colour) =>
    sizes.map((size, index) => ({
      id: `${product.slug}-${colour.code}-${size.toLowerCase()}`,
      slug: product.slug,
      name: product.name,
      colour: colour.name,
      code: colour.code,
      size,
      image: colour.image,
      price: product.price,
      quantity: colour.stock[index],
    })),
  ),
);

export function money(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

export const fulfilmentSteps = ["unfulfilled", "packed", "shipped", "delivered"] as const;
export type Fulfilment = (typeof fulfilmentSteps)[number];
