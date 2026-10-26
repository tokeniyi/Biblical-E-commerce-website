import Link from "next/link";

export type Crumb = { label: string; href?: string };

/** "Home / Categories / All Bibles": the last crumb is the current page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap gap-1">
        {crumbs.map((crumb, i) => (
          <li key={`${crumb.label}-${String(i)}`} className="flex gap-1">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
