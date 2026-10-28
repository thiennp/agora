"use client";

import type { ReactNode } from "react";

import { Card, PageHeader, cn } from "@/components/ui";

import { SECTIONS } from "./sections";
import { useActiveSection } from "./useActiveSection";

/** Page frame: heading, a sticky index that follows the scroll position, then the sections. */
export default function StyleguideFrame({ children }: { children: ReactNode }) {
  const active = useActiveSection();
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agora" title="Design system" lead="The shared look of the demo: colors, surfaces and form controls that every page builds from. Read-only, no sign-in." />
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <Card as="aside" padding="sm" className="h-fit lg:sticky lg:top-20">
          <nav aria-label="Sections">
            <p className="mb-2 px-2 text-caption font-semibold uppercase tracking-wide text-muted">On this page</p>
            <ul className="m-0 flex list-none flex-row flex-wrap gap-1 p-0 lg:flex-col">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={s.id === active ? "location" : undefined}
                    className={cn(
                      "block rounded-control px-3 py-1.5 text-small no-underline transition-colors",
                      s.id === active ? "bg-brand-100 font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-100" : "text-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Card>
        <div className="min-w-0 space-y-12">{children}</div>
      </div>
    </div>
  );
}
