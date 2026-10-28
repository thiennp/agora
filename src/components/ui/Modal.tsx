"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "./cn";
import { Icon } from "./icons";
import { isTop, register, unregister } from "./modalStack";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WIDTH = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof WIDTH;
  /** When false, Escape and a click on the backdrop do not close it (use for must-answer prompts). */
  dismissible?: boolean;
}

/**
 * A dialog: portal to <body>, focus moves in and is kept inside, Escape closes the top-most dialog, the page behind
 * does not scroll, and focus returns to what had it before.
 */
export function Modal({ open, onClose, title, children, footer, size = "md", dismissible = true }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const latest = useRef({ onClose, dismissible });
  latest.current = { onClose, dismissible };

  useEffect(() => {
    if (!open) return;
    const id = Symbol("dialog");
    register(id);
    const before = document.activeElement as HTMLElement | null;
    const scrollLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const node = panel.current;
    (node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (!isTop(id)) return;
      if (e.key === "Escape" && latest.current.dismissible) {
        e.stopPropagation();
        latest.current.onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      unregister(id);
      document.body.style.overflow = scrollLock;
      before?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => dismissible && onClose()} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn("relative max-h-[90vh] w-full overflow-y-auto rounded-hero border border-line bg-surface p-6 shadow-pop focus:outline-none", WIDTH[size])}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-title font-semibold text-ink">
            {title}
          </h2>
          {dismissible ? (
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500">
              <Icon name="close" />
            </button>
          ) : null}
        </div>
        <div className="text-body text-muted">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
