import Link from "next/link";
import type { ReactNode } from "react";
import { AutoRefresh } from "./AutoRefresh";
import { Banner } from "./Card";
import { ScopeProvider } from "./ScopeContext";
import { hrefIn, type Scope } from "./scope";

/** Every owner page starts with who you are acting as and how many things wait for you (APP-OWN-03). In a created app the person is the signed-in member and the app is named instead of a persona. */
export function OwnerShell({ name, language, pending, scope, children }: { name: string; language: string; pending: number; scope: Scope; children: ReactNode }) {
  return (
    <ScopeProvider scope={scope}>
      <div className="stack-lg">
        <AutoRefresh />
        {scope.app ? null : (
          <div>
            <p className="muted small" style={{ margin: 0 }}>You are acting as</p>
            <h1 style={{ margin: 0 }}>{name} <span className="muted" style={{ fontWeight: 400 }}>· {language === "de" ? "Deutsch" : "English"}</span></h1>
          </div>
        )}
        {pending > 0 ? (
          <Banner tone="accent">
            <strong>{pending === 1 ? "1 thing needs you." : `${pending} things need you.`}</strong> <Link href={hrefIn(scope, "/cards")}>Answer them first.</Link>
          </Banner>
        ) : (
          <Banner>Nothing is waiting for you right now.</Banner>
        )}
        {children}
      </div>
    </ScopeProvider>
  );
}
