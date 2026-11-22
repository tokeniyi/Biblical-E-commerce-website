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
  /** Skip the default underline styling (the caller styles aria-current itself). */
  plain?: boolean;
  ariaLabel?: string;
};

export function NavLink({ href, children, className, matchPrefix = false, plain = false, ariaLabel }: NavLinkProps) {
  const pathname = usePathname();
  const active = matchPrefix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
  const base = plain
    ? ""
    : "hover:text-brand aria-[current=page]:font-semibold aria-[current=page]:text-brand";
  return (
    <Link href={href} aria-current={active ? "page" : undefined} aria-label={ariaLabel} className={`${className ?? ""} ${base}`}>
      {children}
    </Link>
  );
}
