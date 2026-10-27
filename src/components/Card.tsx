import type { ReactNode } from "react";

export function Card({ title, children, prominent = false, as: Tag = "section", id }: { title?: ReactNode; children: ReactNode; prominent?: boolean; as?: "section" | "div" | "article"; id?: string }) {
  return (
    <Tag className={`card${prominent ? " prominent" : ""}`} id={id}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </Tag>
  );
}

export function Banner({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "warn" | "bad" | "info"; children: ReactNode }) {
  return <div className={`banner${tone === "neutral" ? "" : ` ${tone}`}`} role={tone === "bad" || tone === "warn" ? "alert" : undefined}>{children}</div>;
}
