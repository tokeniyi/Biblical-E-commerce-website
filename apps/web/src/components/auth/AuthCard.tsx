import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { eyebrow, pageHeading } from "@/components/ui/styles";

const PERKS: { icon: IconName; text: string }[] = [
  { icon: "package", text: "Track orders and request returns" },
  { icon: "heart", text: "Save editions to your wishlist" },
  { icon: "truck", text: "Check out faster with saved addresses" },
];

/** Two-column auth layout: form card plus the benefits of an account. */
export function AuthCard({ kicker, title, intro, notice, children, aside }: {
  kicker: string;
  title: string;
  intro: ReactNode;
  notice?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-card md:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-5 p-8 sm:p-10">
        <div className="flex flex-col gap-2">
          <p className={eyebrow}>{kicker}</p>
          <h1 className={pageHeading}>{title}</h1>
          <p className="text-sm text-muted">{intro}</p>
        </div>
        {notice}
        {children}
      </div>
      <div className="flex flex-col justify-center gap-6 bg-ink p-8 text-white sm:p-10">
        {aside ?? (
          <>
            <h2 className="font-display text-2xl font-semibold">Your account</h2>
            <ul className="flex flex-col gap-4 text-sm">
              {PERKS.map((p) => (
                <li key={p.text} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-gold">
                    <Icon name={p.icon} />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
            <p className="text-sm text-white/70">No account needed to buy: guest checkout is always available.</p>
          </>
        )}
      </div>
    </div>
  );
}
