import Link from "next/link";
import { SCREENS, figmaNodeUrl, presetAction, type ScreenGroup } from "@/lib/dev/screens";

const GROUPS: ScreenGroup[] = ["Customer", "Checkout & orders", "Account", "Admin"];

/** Route index of all 48 wireframed screens (spec §7.3); doubles as a coverage checklist. */
export default function ScreensPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink">Screens ({SCREENS.length})</h1>
      <p className="text-sm">
        Each row opens the live route with a fixture/scenario preset. Presets in the URL (
        <span className="font-mono">?scenario=…</span>) are stored in the scenario cookie.
      </p>
      {GROUPS.map((group) => (
        <section key={group} aria-labelledby={`group-${group}`} className="flex flex-col gap-2">
          <h2 id={`group-${group}`} className="text-base font-semibold">
            {group}
          </h2>
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-band font-mono">
                <tr>
                  <th scope="col" className="p-2">ID</th>
                  <th scope="col" className="p-2">Screen</th>
                  <th scope="col" className="p-2">Route</th>
                  <th scope="col" className="p-2">Phase</th>
                  <th scope="col" className="p-2">Figma</th>
                </tr>
              </thead>
              <tbody>
                {SCREENS.filter((s) => s.group === group).map((s) => (
                  <tr key={s.id} data-testid="screen-row" className="border-t border-band">
                    <td className="p-2 font-mono">{s.id}</td>
                    <td className="p-2">
                      {s.sampleCart ? (
                        // Loads the drawn cart for this browser, then opens the screen.
                        <form
                          method="post"
                          action={`/api/__dev/cart/sample?next=${encodeURIComponent(s.href)}${s.sampleCart === true ? "" : `&stage=${s.sampleCart}`}`}
                        >
                          <button type="submit" className="text-left underline">
                            {s.name}
                          </button>{" "}
                          <span className="text-muted">
                            {s.sampleCart === true ? "(loads sample cart)" : `(sample cart → ${s.sampleCart})`}
                          </span>
                        </form>
                      ) : s.preset ? (
                        // Signs in as the preset identity (or prepares a link), then opens the screen.
                        <form method="post" action={presetAction(s.href, s.preset)}>
                          <button type="submit" className="text-left underline">
                            {s.name}
                          </button>{" "}
                          <span className="text-muted">
                            ({[s.preset.identity ? `as ${s.preset.identity}` : null, s.preset.prep].filter(Boolean).join(", ")})
                          </span>
                        </form>
                      ) : (
                        <Link href={s.href} className="underline">
                          {s.name}
                        </Link>
                      )}
                    </td>
                    <td className="p-2 font-mono">{s.route}</td>
                    <td className="p-2">{s.phase}</td>
                    <td className="p-2">
                      <a href={figmaNodeUrl(s.node)} className="underline" target="_blank" rel="noreferrer">
                        {s.node}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
