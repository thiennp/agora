"use client";

import { useState } from "react";
import type { ElementType, ReactNode } from "react";

import { Button } from "./Button";
import { cn } from "./cn";
import { Icon } from "./icons";

/** The basic raised surface: rounded, soft shadow, thin border. */
export function Card({ as: Tag = "div", title, description, actions, padding = "md", className, children }: {
  as?: ElementType;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  padding?: "sm" | "md" | "none";
  className?: string;
  children?: ReactNode;
}) {
  const pad = padding === "none" ? "" : padding === "sm" ? "p-4" : "p-5 sm:p-6";
  return (
    <Tag className={cn("rounded-card border border-line bg-surface shadow-card", pad, className)}>
      {title || actions ? (
        <div className={cn("flex flex-wrap items-start justify-between gap-3", Boolean(children) && "mb-4")}>
          <div className="min-w-0">
            {title ? <h3 className="text-heading font-semibold text-ink">{title}</h3> : null}
            {description ? <p className="mt-1 text-small text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

/** A tinted box to point at something: brand tint, thin brand border. */
export function Callout({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950", className)}>
      {title ? <p className="mb-1 font-semibold text-brand-800 dark:text-brand-100">{title}</p> : null}
      <div className="text-small text-ink">{children}</div>
    </div>
  );
}

/** Page title block: small label above, title, optional lead text and actions on the right. */
export function PageHeader({ eyebrow, title, lead, actions }: { eyebrow?: string; title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-caption font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">{eyebrow}</p> : null}
        <h1 className="text-display font-semibold text-ink">{title}</h1>
        {lead ? <p className="mt-2 max-w-prose text-body text-muted">{lead}</p> : null}
      </div>
      {actions}
    </header>
  );
}

/** A large intro panel. `tone="brand"` fills it with the brand gradient. */
export function Hero({ tone = "plain", title, children, actions }: { tone?: "plain" | "brand"; title: string; children?: ReactNode; actions?: ReactNode }) {
  const brand = tone === "brand";
  return (
    <section
      className={cn(
        "rounded-hero p-6 sm:p-10",
        brand ? "bg-gradient-to-br from-brand-600 to-brand-900 text-white" : "border border-line bg-surface shadow-card",
      )}
    >
      <h2 className={cn("text-title font-semibold", brand ? "text-white" : "text-ink")}>{title}</h2>
      {children ? <div className={cn("mt-2 max-w-prose", brand ? "text-brand-100" : "text-muted")}>{children}</div> : null}
      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}

/** Preformatted text (commands, snippets) with a copy button. */
export function CodeBlock({ children, label = "Code" }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the text stays selectable */
    }
  };
  return (
    <div className="relative">
      <pre aria-label={label} className="overflow-x-auto rounded-card bg-slate-900 p-4 pr-24 font-mono text-small text-slate-100">
        <code>{children}</code>
      </pre>
      <Button size="sm" variant="secondary" onClick={copy} before={<Icon name="copy" size={16} />} className="absolute right-3 top-3" aria-live="polite">
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
