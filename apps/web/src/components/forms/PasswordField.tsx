"use client";

import { useState } from "react";
import { Field, controlProps, inputClass } from "./Field";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  autoComplete: "current-password" | "new-password";
  onChange: (value: string) => void;
};

/**
 * Password input with the Figma "[ Show ]" toggle. Paste and password
 * managers are allowed (spec §2), so nothing blocks them.
 */
export function PasswordField({ id, label, value, error, hint, autoComplete, onChange }: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <Field id={id} label={label} required error={error} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          {...controlProps(id, error)}
          type={shown ? "text" : "password"}
          className={inputClass}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
        />
        <button
          type="button"
          className="shrink-0 border border-line px-2 py-1 text-sm"
          aria-pressed={shown}
          aria-controls={id}
          onClick={() => { setShown((s) => !s); }}
        >
          {shown ? "Hide" : "Show"}
          <span className="sr-only"> {label.toLowerCase()}</span>
        </button>
      </div>
    </Field>
  );
}
