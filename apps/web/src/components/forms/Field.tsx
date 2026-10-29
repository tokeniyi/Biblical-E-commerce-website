import type { ReactNode } from "react";
import { fieldBox, fieldLabel } from "@/components/ui/styles";

export type FieldErrors = Record<string, string | undefined>;

export function errorId(id: string): string {
  return `${id}-error`;
}

/** Props that wire a control to its label and inline error (aria-invalid + aria-describedby). */
export function controlProps(id: string, error: string | undefined) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId(id) : undefined,
  } as const;
}

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/**
 * The Figma "Labeled input": bold label (required fields marked *) above the
 * control, and the inline "! message" below it when invalid (E07).
 */
export function Field({ id, label, required, error, hint, children, className }: FieldProps) {
  return (
    <div className={`${fieldBox} ${error ? "border-2 border-danger" : ""} ${className ?? ""}`}>
      <label htmlFor={id} className={fieldLabel}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {hint && !error ? <p className="text-muted">{hint}</p> : null}
      {error ? (
        <p id={errorId(id)} className="text-danger">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass = "w-full border border-line bg-white p-1.5 text-sm aria-[invalid=true]:border-danger";
