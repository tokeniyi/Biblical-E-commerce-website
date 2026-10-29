import type { MergeConflict } from "@your-app/shared";
import { secondaryButton } from "@/components/ui/styles";

type MergeConflictsProps = {
  conflicts: readonly MergeConflict[];
  disabled: boolean;
  onChoose: (conflict: MergeConflict, use: "kept" | "account") => void;
};

/**
 * Sign-in merged this browser's cart with the account cart (spec §5.1).
 * Where both had the same edition, this visit's quantity was kept and the
 * customer decides; quantities are never added together silently.
 */
export function MergeConflicts({ conflicts, disabled, onChoose }: MergeConflictsProps) {
  return (
    <section aria-labelledby="merge-title" className="flex flex-col gap-3 border-2 border-ink bg-panel p-3.5">
      <h2 id="merge-title" className="text-base font-semibold">
        We combined your carts
      </h2>
      <p className="text-sm">Your account had a saved cart. Choose the quantity you want for items that were in both.</p>
      <ul className="flex flex-col gap-3 text-sm">
        {conflicts.map((c) => (
          <li key={c.sku} className="flex flex-col gap-2">
            <p>
              {c.productName}: we kept quantity {c.keptQuantity} from this visit. Your account cart had {c.accountQuantity}.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={secondaryButton} disabled={disabled} onClick={() => { onChoose(c, "kept"); }}>
                Keep {c.keptQuantity}
              </button>
              <button type="button" className={secondaryButton} disabled={disabled} onClick={() => { onChoose(c, "account"); }}>
                Use {c.accountQuantity}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
