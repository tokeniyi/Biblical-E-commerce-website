import type { ReactNode } from "react";

type SidebarProps = {
  label: string;
  children: ReactNode;
  note?: ReactNode;
};

/**
 * Desktop sidebar that collapses to a disclosure menu below the md
 * breakpoint. Rendered twice so it needs no client JS; CSS hides the
 * inactive copy, which also removes it from the accessibility tree.
 */
export function Sidebar({ label, children, note }: SidebarProps) {
  return (
    <>
      <details className="rounded-xl border border-line bg-white p-4 text-sm md:hidden">
        <summary className="cursor-pointer font-semibold">{label}</summary>
        <nav aria-label={label} className="mt-3">
          {children}
        </nav>
      </details>
      <aside className="hidden w-[208px] shrink-0 flex-col gap-5 self-start rounded-2xl border border-line bg-white p-5 text-sm shadow-card md:sticky md:top-36 md:flex">
        <nav aria-label={label}>{children}</nav>
        {note}
      </aside>
    </>
  );
}

export function SidebarList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-3 leading-snug">{children}</ul>;
}
