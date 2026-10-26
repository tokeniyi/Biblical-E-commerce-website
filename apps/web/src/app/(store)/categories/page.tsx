import Link from "next/link";
import type { ReactNode } from "react";
import type { CategoryDirectory } from "@your-app/shared";
import { PageContent } from "@/components/shell/StorefrontShell";
import { BookCover } from "@/components/storefront/BookCover";
import { NetworkError } from "@/components/storefront/NetworkError";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { panel, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";

async function loadDirectory(): Promise<CategoryDirectory | null> {
  try {
    return await (await serverApi()).catalog.getCategories();
  } catch (error) {
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

/** "By format" links: C03 facets on All Bibles (large print has its own category). */
const FORMATS = [
  { label: "Large print", href: "/categories/large-print" },
  { label: "Hardcover", href: "/categories/bibles?binding=Hardcover" },
  { label: "Paperback", href: "/categories/bibles?binding=Paperback" },
  { label: "Leather / leather-look", href: "/categories/bibles?binding=Leather-look" },
  { label: "English / Spanish", href: "/categories/bibles?language=all" },
] as const;

/** Featured collections; Family reading and Gift editions are proposed category slugs. */
const COLLECTIONS = [
  { label: "Study collection", link: "Study Bibles", href: "/categories/study" },
  { label: "Family reading", link: "Family reading", href: "/categories/family-reading" },
  { label: "Gift editions", link: "Gift editions", href: "/categories/gift-editions" },
] as const;

function Panel({ title, children, action }: { title: string; children: ReactNode; action: ReactNode }) {
  const id = `panel-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id} className={`${panel} flex-1`}>
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <ul className="flex flex-col text-base leading-snug">{children}</ul>
      <div className="mt-auto">{action}</div>
    </section>
  );
}

/** C02 Category directory: navigable links (not filter toggles); counts from the server. */
export default async function CategoriesPage() {
  const directory = await loadDirectory();

  return (
    <PageContent screen="C02">
      <h1 className="text-[28px] font-semibold text-ink">Category directory</h1>
      <p className="text-base">Start with how you’ll use your Bible, then narrow by translation and format.</p>

      {directory ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <Panel
            title="By purpose"
            action={
              <Link href="/categories/study" className={secondaryButton}>
                Explore study editions
              </Link>
            }
          >
            {directory.purposes.map((p) => (
              <li key={p.slug}>
                <Link href={`/categories/${p.slug}`} className="hover:underline">
                  {p.name} · {p.count} editions
                </Link>
              </li>
            ))}
          </Panel>
          <Panel
            title="By translation"
            action={
              <Link href="/categories/bibles?translation=ESV" className={secondaryButton}>
                Browse ESV
              </Link>
            }
          >
            {directory.translations.map((t) => (
              <li key={t.code}>
                <Link href={`/categories/bibles?translation=${t.code}`} className="hover:underline">
                  {t.code} · {t.name}
                </Link>
              </li>
            ))}
          </Panel>
          <Panel
            title="By format"
            action={
              <Link href="/categories/large-print" className={secondaryButton}>
                Browse large print
              </Link>
            }
          >
            {FORMATS.map((f) => (
              <li key={f.label}>
                <Link href={f.href} className="hover:underline">
                  {f.label}
                </Link>
              </li>
            ))}
          </Panel>
        </div>
      ) : (
        <NetworkError />
      )}

      <section aria-labelledby="collections-heading" className={panel}>
        <h2 id="collections-heading" className="text-base font-semibold">
          Featured collections
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COLLECTIONS.map((c) => (
            <BookCover key={c.label} label={c.label} heightClass="h-48" />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-3 text-sm">
          {COLLECTIONS.map((c, i) => (
            <li key={c.href} className="flex gap-3">
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <Link href={c.href} className="underline">
                {c.link}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <StatusMessage title="Not sure where to start?">
        Compare the translation and print-size specifications on each product page. Help content is managed in B12 /
        B13.
      </StatusMessage>
    </PageContent>
  );
}
