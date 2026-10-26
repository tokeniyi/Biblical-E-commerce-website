"use client";

import { useId, useRef, type ReactNode, type RefObject } from "react";
import { Dialog } from "./Dialog";
import { secondaryButton } from "./styles";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Destructive confirmation (C08 remove). Focus starts on the safe choice so
 * Enter never deletes by accident.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
  fallbackFocusRef,
}: ConfirmDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      initialFocusRef={cancelRef}
      fallbackFocusRef={fallbackFocusRef}
      className="m-auto w-[min(520px,calc(100vw-2rem))] border border-ink p-0 backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-3 p-4">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <div className="text-base leading-snug">{children}</div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-[3px] border border-danger bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Removing…" : confirmLabel}
          </button>
          <button ref={cancelRef} type="button" className={secondaryButton} disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
