import type { ReactNode } from "react";

type SidebarProps = {
  label: string;
  children: ReactNode;
  note?: ReactNode;
};

/**
 * Desktop sidebar that collapses to a disclosure menu below the md
 * breakpoint (spec §4: "desktop sidebar becomes drawer on mobile").
 * Rendered twice so it needs no client JS; CSS hides the inactive copy,
 * which also removes it from the accessibility tree.
 */
export function Sidebar({ label, children, note }: SidebarProps) {
  return (
    <>
      <details className="border-b border-line bg-panel p-4 text-sm md:hidden">
        <summary className="cursor-pointer font-semibold">{label}</summary>
        <nav aria-label={label} className="mt-3">
          {children}
        </nav>
      </details>
      <aside className="hidden w-[184px] shrink-0 flex-col gap-5 border-r border-line bg-panel p-4 text-sm md:flex">
        <nav aria-label={label}>{children}</nav>
        {note}
      </aside>
    </>
  );
}

export function SidebarList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-3.5 leading-snug">{children}</ul>;
}
