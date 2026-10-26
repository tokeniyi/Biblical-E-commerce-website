import Link from "next/link";
import { PageContent } from "@/components/shell/StorefrontShell";

/**
 * Public content route (spec §3.4). Published-only rendering and draft 404s
 * arrive with B12/B13 in Phase 5; until then this keeps footer links working.
 */
export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PageContent>
      <h1 className="text-[28px] font-semibold text-ink">Help</h1>
      <div role="status" className="border border-line bg-panel p-4 text-sm">
        <p className="font-semibold">Not built yet</p>
        <p>
          Content page <span className="font-mono">/help/{slug}</span> renders published content from the
          admin editor (B12/B13), planned for Phase 5.
        </p>
      </div>
      <p className="text-sm">
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>
    </PageContent>
  );
}
