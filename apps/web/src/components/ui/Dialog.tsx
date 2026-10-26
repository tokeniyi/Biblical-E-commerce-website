"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

type DialogProps = {
  open: boolean;
  /** Called when the dialog closes for any reason (Esc, a close button, or `open` going false). */
  onClose: () => void;
  labelledBy: string;
  /** Receives focus when the dialog opens (C07: the Close control). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Where focus goes on close when the opener is gone (e.g. its row was deleted). */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
};

/**
 * Modal dialog on the native <dialog> element: showModal() makes the rest of
 * the page inert, which traps focus, and Esc closes it. Focus returns to the
 * element that opened it (spec §5.12: "dialog focus trap + restore").
 */
export function Dialog({ open, onClose, labelledBy, initialFocusRef, fallbackFocusRef, className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    function handleClose() {
      const from = opener.current;
      const target = from && from !== document.body && from.isConnected ? from : fallbackFocusRef?.current;
      target?.focus();
      onCloseRef.current();
    }
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [fallbackFocusRef]);

  return (
    <dialog ref={ref} aria-labelledby={labelledBy} className={className}>
      {children}
    </dialog>
  );
}
