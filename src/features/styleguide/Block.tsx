import type { ReactNode } from "react";

import { Card } from "@/components/ui";

/** One section of the page: anchor, heading and a stack of demos. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-title font-semibold text-ink">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** A titled card around one demo. */
export function Demo({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Card title={title} description={note}>
      {children}
    </Card>
  );
}
