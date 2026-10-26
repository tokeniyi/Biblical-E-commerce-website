import Link from "next/link";
import { PageContent } from "@/components/shell/StorefrontShell";
import { figmaNodeUrl, screensById } from "@/lib/dev/screens";

/**
 * Placeholder for a wireframed screen that a later phase implements.
 * Shows the Figma frame label ("C01 / Home") so testers know where they are.
 */
export function ScreenStub({ ids }: { ids: readonly string[] }) {
  const screens = screensById(ids);
  const [first] = screens;
  if (!first) throw new Error(`ScreenStub: unknown screen id(s) ${ids.join(", ")}`);

  return (
    <PageContent>
      <div data-screen={screens.map((s) => s.id).join(" ")} className="flex flex-col gap-4">
        <h1 className="text-[28px] font-semibold text-ink">
          {screens.map((s) => `${s.id} / ${s.name}`).join(" · ")}
        </h1>
        <div role="status" className="border border-line bg-panel p-4 text-sm">
          <p className="font-semibold">Not built yet</p>
          <p>Planned for Phase {first.phase} of the wireframe build.</p>
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          {screens.map((s) => (
            <div key={s.id} className="contents">
              <dt className="font-semibold">{s.id} route</dt>
              <dd className="font-mono">{s.route}</dd>
              <dt className="font-semibold">{s.id} Figma</dt>
              <dd>
                <a href={figmaNodeUrl(s.node)} className="underline" target="_blank" rel="noreferrer">
                  Node {s.node}
                </a>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm">
          <Link href="/__dev/screens" className="underline">
            All screens
          </Link>
        </p>
      </div>
    </PageContent>
  );
}
