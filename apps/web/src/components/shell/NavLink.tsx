"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  /** Match nested routes too (e.g. /account/orders/BS-1 under /account/orders). */
  matchPrefix?: boolean;
};

export function NavLink({ href, children, className, matchPrefix = false }: NavLinkProps) {
  const pathname = usePathname();
  const active = matchPrefix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className ?? ""} hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline`}
    >
      {children}
    </Link>
  );
}
