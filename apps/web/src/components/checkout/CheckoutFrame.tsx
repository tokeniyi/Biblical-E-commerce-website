import type { ReactNode } from "react";
import { PageContent } from "@/components/shell/StorefrontShell";

type CheckoutFrameProps = {
  screen: string;
  title: string;
  stepper: ReactNode;
  children: ReactNode;
  /** Right column (320px in Figma): order summary and notes. */
  aside: ReactNode;
};

/** Page frame shared by O02–O07: heading, stepper, content and summary column (single column on mobile). */
export function CheckoutFrame({ screen, title, stepper, children, aside }: CheckoutFrameProps) {
  return (
    <PageContent screen={screen}>
      <h1 className="text-[28px] font-semibold text-ink">{title}</h1>
      {stepper}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
        <aside aria-label="Order summary" className="flex w-full flex-col gap-4 md:w-[320px] md:shrink-0">
          {aside}
        </aside>
      </div>
    </PageContent>
  );
}
