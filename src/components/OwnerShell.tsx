import type { ReactNode } from "react";
import { AutoRefresh } from "./AutoRefresh";
import { Banner } from "./Card";

/** Every owner page starts with who you are acting as and how many things wait for you (APP-OWN-03). */
export function OwnerShell({ name, language, pending, as, children }: { name: string; language: string; pending: number; as: "a" | "b"; children: ReactNode }) {
  return (
    <div className="stack-lg">
      <AutoRefresh />
      <div>
        <p className="muted small" style={{ margin: 0 }}>You are acting as</p>
        <h1 style={{ margin: 0 }}>{name} <span className="muted" style={{ fontWeight: 400 }}>· {language === "de" ? "Deutsch" : "English"}</span></h1>
      </div>
      {pending > 0 ? (
        <Banner tone="accent">
          <strong>{pending === 1 ? "1 thing needs you." : `${pending} things need you.`}</strong> <a href={`/cards?as=${as}`}>Answer them first.</a>
        </Banner>
      ) : (
        <Banner>Nothing is waiting for you right now.</Banner>
      )}
      {children}
    </div>
  );
}
