/** "Returning to: Checkout / Delivery" for the destinations people come back to most. */
export function destinationLabel(path: string): string {
  const pathname = path.split(/[?#]/)[0] ?? path;
  const known: Record<string, string> = {
    "/checkout/delivery": "Checkout / Delivery",
    "/checkout/identity": "Checkout",
    "/account": "Your account",
    "/account/profile": "Profile details",
    "/account/addresses": "Delivery addresses",
    "/account/orders": "Your orders",
    "/account/wishlist": "Your wishlist",
    "/account/reviews": "My reviews",
    "/cart": "Your cart",
  };
  if (known[pathname]) return known[pathname];
  const order = /^\/account\/orders\/([^/]+)$/.exec(pathname);
  if (order?.[1]) return `Order ${decodeURIComponent(order[1])}`;
  return pathname;
}
