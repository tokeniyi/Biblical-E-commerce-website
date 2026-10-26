import type { ReactNode } from "react";
import { statusBox } from "./styles";

type StatusMessageProps = {
  title: ReactNode;
  children?: ReactNode;
  /** "status" for polite announcements, "alert" for errors. */
  role?: "status" | "alert";
  className?: string;
};

/** The gray "Status message" box from the Figma frames. */
export function StatusMessage({ title, children, role, className }: StatusMessageProps) {
  return (
    <div role={role} className={`${statusBox} ${className ?? ""}`}>
      <p className="text-base font-semibold leading-snug">{title}</p>
      {children ? <div className="text-sm leading-snug">{children}</div> : null}
    </div>
  );
}
