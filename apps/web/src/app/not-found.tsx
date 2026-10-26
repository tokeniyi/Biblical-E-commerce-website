import { PageContent, StorefrontShell } from "@/components/shell/StorefrontShell";
import { NotFoundPanel } from "@/components/storefront/NotFoundPanel";

/** E19 for URLs that match no route: same panel, inside the storefront shell. */
export default function NotFound() {
  return (
    <StorefrontShell>
      <PageContent screen="E19">
        <NotFoundPanel />
      </PageContent>
    </StorefrontShell>
  );
}
