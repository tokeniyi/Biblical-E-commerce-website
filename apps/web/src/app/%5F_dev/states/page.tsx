import { EDGE_STATES, figmaNodeUrl } from "@/lib/dev/screens";

/**
 * Edge-state gallery (spec §7.3). Phase 0 lists E01–E25 with their triggers;
 * each phase replaces its rows' placeholders with the rendered component.
 */
export default function StatesPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink">Edge states ({EDGE_STATES.length})</h1>
      <p className="text-sm">None are rendered yet. The phase column says when each one lands.</p>
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
              <th scope="col" className="p-2">Figma</th>
            </tr>
          </thead>
          <tbody>
            {EDGE_STATES.map((state) => (
              <tr key={state.id} data-testid="state-row" className="border-t border-band align-top">
                <td className="p-2 font-mono">{state.id}</td>
                <td className="p-2">{state.name}</td>
                <td className="p-2 font-mono">{state.host}</td>
                <td className="p-2">{state.trigger}</td>
                <td className="p-2">{state.recovery}</td>
                <td className="p-2">{state.phase}</td>
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
    </>
  );
}
