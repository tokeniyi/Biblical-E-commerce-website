import Link from "next/link";
import type { ReactNode } from "react";
import { DEFAULT_LISTING_QUERY } from "@your-app/shared";
import { LoadingGrid } from "@/components/storefront/LoadingGrid";
import { NetworkError } from "@/components/storefront/NetworkError";
import { NotFoundPanel } from "@/components/storefront/NotFoundPanel";
import { ListingProvider } from "@/components/storefront/listing/ListingContext";
import { NoResults } from "@/components/storefront/listing/ListingControls";
import { SoldOutNotice, VariantUnavailableNotice } from "@/components/storefront/product/VariantNotices";
import { primaryButton, textLink } from "@/components/ui/styles";
import { EDGE_STATES, figmaNodeUrl } from "@/lib/dev/screens";

/**
 * Fixture renders of each implemented state, matching its Figma frame.
 * The same components render in the real flow; the "Open in flow" link
 * reaches it there with the scenario preset (spec §3.5).
 */
const RENDERED: Record<string, ReactNode> = {
  E02: (
    <ListingProvider
      basePath="/search"
      query={{ ...DEFAULT_LISTING_QUERY, q: "spanish study", translation: ["ESV"], binding: "Hardcover" }}
    >
      <NoResults isSearch />
    </ListingProvider>
  ),
  E05: (
    <SoldOutNotice
      variant={{ binding: "Hardcover", sku: "NLT-CH-HC" }}
      alternativesHref="/categories/children"
      wishlist={
        <Link href="/login?returnTo=%2Fproducts%2Fnlt-childrens-bible" className={textLink}>
          Save to wishlist
        </Link>
      }
    />
  ),
  E12: (
    <VariantUnavailableNotice
      selection={{ binding: "Leather-look", printSize: "Large print" }}
      alternative={{
        binding: "Hardcover",
        printSize: "Standard print",
        priceCents: 3900,
        stock: { onHand: 15, reserved: 3, available: 12 },
      }}
      alternativesHref="/categories/study"
      selectAlternative={
        <Link href="/products/esv-study-bible?variant=ESV-ST-HC" className={primaryButton}>
          Select available variant
        </Link>
      }
    />
  ),
  E16: <LoadingGrid cancellable={false} />,
  E18: <NetworkError />,
  E19: <NotFoundPanel headingLevel={2} />,
};

export default function StatesPage() {
  const rendered = EDGE_STATES.filter((s) => s.id in RENDERED);
  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink">Edge states ({EDGE_STATES.length})</h1>
      <p className="text-sm">
        {rendered.length} rendered below; the rest land in the phase shown in the table.
      </p>
      <div className="overflow-x-auto border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-band font-mono">
            <tr>
              <th scope="col" className="p-2">ID</th>
              <th scope="col" className="p-2">State</th>
              <th scope="col" className="p-2">Host</th>
              <th scope="col" className="p-2">Trigger</th>
              <th scope="col" className="p-2">Recovery</th>
              <th scope="col" className="p-2">Phase</th>
              <th scope="col" className="p-2">In flow</th>
              <th scope="col" className="p-2">Figma</th>
            </tr>
          </thead>
          <tbody>
            {EDGE_STATES.map((state) => (
              <tr key={state.id} data-testid="state-row" className="border-t border-band align-top">
                <td className="p-2 font-mono">
                  {state.id in RENDERED ? (
                    <a href={`#${state.id}`} className="underline">
                      {state.id}
                    </a>
                  ) : (
                    state.id
                  )}
                </td>
                <td className="p-2">{state.name}</td>
                <td className="p-2 font-mono">{state.host}</td>
                <td className="p-2">{state.trigger}</td>
                <td className="p-2">{state.recovery}</td>
                <td className="p-2">{state.phase}</td>
                <td className="p-2">
                  {state.href ? (
                    <Link href={state.href} className="underline" aria-label={`Open ${state.id} in flow`}>
                      Open in flow
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  <a href={figmaNodeUrl(state.node)} className="underline" target="_blank" rel="noreferrer">
                    {state.node}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rendered.map((state) => (
        <section
          key={state.id}
          id={state.id}
          aria-labelledby={`${state.id}-title`}
          data-testid="rendered-state"
          className="flex flex-col gap-3"
        >
          <h2 id={`${state.id}-title`} className="text-[22px] font-semibold">
            {state.id} / {state.name}
          </h2>
          <div className="border border-ink p-5">{RENDERED[state.id]}</div>
        </section>
      ))}
    </>
  );
}
