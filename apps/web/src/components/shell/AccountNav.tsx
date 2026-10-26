import { NavLink } from "./NavLink";
import { SignOutButton } from "./SignOutButton";
import { Sidebar, SidebarList } from "./Sidebar";

/** Sidebar from Figma A07. The A07 cards link to this same route inventory. */
const ACCOUNT_NAV = [
  { href: "/account", label: "Overview", matchPrefix: false },
  { href: "/account/profile", label: "Profile", matchPrefix: true },
  { href: "/account/addresses", label: "Addresses", matchPrefix: true },
  { href: "/account/orders", label: "Orders", matchPrefix: true },
  { href: "/account/wishlist", label: "Wishlist", matchPrefix: true },
  { href: "/account/reviews", label: "Reviews", matchPrefix: true },
] as const;

export function AccountNav() {
  return (
    <Sidebar label="Account menu">
      <SidebarList>
        {ACCOUNT_NAV.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} matchPrefix={item.matchPrefix}>
              {item.label}
            </NavLink>
          </li>
        ))}
        <li>
          <SignOutButton redirectTo="/login?reason=signed-out">Sign out</SignOutButton>
        </li>
      </SidebarList>
    </Sidebar>
  );
}
