"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import { listingQueryToParams, type ListingQuery } from "@your-app/shared";

export function listingHref(basePath: string, query: ListingQuery): string {
  const params = listingQueryToParams(query).toString();
  return params ? `${basePath}?${params}` : basePath;
}

type ListingContextValue = {
  basePath: string;
  /** While a change is loading, the query being loaded, so controls show the new choice at once. */
  query: ListingQuery;
  pending: boolean;
  navigate: (next: ListingQuery, options?: { scroll?: boolean }) => void;
  retry: () => void;
};

const ListingContext = createContext<ListingContextValue | null>(null);

export function useListing(): ListingContextValue {
  const value = useContext(ListingContext);
  if (!value) throw new Error("useListing must be used inside <ListingProvider>");
  return value;
}

/**
 * The URL owns facets, sort and page (spec §1.3). Every change is a router
 * push inside a transition: the old results stay mounted while the new ones
 * load, `pending` drives the E16 loading state, and Back restores the query.
 */
export function ListingProvider({ basePath, query, children }: { basePath: string; query: ListingQuery; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<ListingQuery | null>(null);

  const navigate = useCallback(
    (next: ListingQuery, { scroll = false }: { scroll?: boolean } = {}) => {
      setTarget(next);
      startTransition(() => {
        router.push(listingHref(basePath, next), { scroll });
      });
    },
    [basePath, router],
  );

  const retry = useCallback(() => {
    setTarget(null);
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const value = useMemo(
    () => ({ basePath, query: pending && target ? target : query, pending, navigate, retry }),
    [basePath, query, pending, target, navigate, retry],
  );
  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

/**
 * A real link (works without JS, opens in a new tab) that navigates through
 * the listing transition on a plain click.
 */
export function ListingLink({
  to,
  scroll = false,
  className,
  children,
  ...rest
}: {
  to: ListingQuery;
  scroll?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page";
}) {
  const { basePath, navigate } = useListing();
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to, { scroll });
  }
  return (
    <a href={listingHref(basePath, to)} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  );
}

/** Shows the E16 loading state in place of the results while a change is pending. */
export function ListingResults({ loading, children }: { loading: ReactNode; children: ReactNode }) {
  const { pending } = useListing();
  return <div className="flex min-w-0 flex-1 flex-col gap-4">{pending ? loading : children}</div>;
}
