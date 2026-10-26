import { PageContent } from "@/components/shell/StorefrontShell";
import { NotFoundPanel } from "@/components/storefront/NotFoundPanel";

/** E19 for notFound() inside storefront routes (unknown product, category…). */
export default function StoreNotFound() {
  return (
    <PageContent screen="E19">
      <NotFoundPanel />
    </PageContent>
  );
}
