"use client";

import { createContext, useContext, type ReactNode } from "react";
import { postJson, type PostResult } from "./post";
import { apiIn, demoScope, hrefIn, type Scope } from "./scope";

const Ctx = createContext<Scope>(demoScope("a"));

export function ScopeProvider({ scope, children }: { scope: Scope; children: ReactNode }) {
  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}

/** The scope a component runs in, with `post` (JSON to an API path, scoped to the app) and `href` (a page path, scoped to the app). */
export function useScope() {
  const scope = useContext(Ctx);
  return {
    scope,
    as: scope.as,
    other: scope.words.other,
    post: <T = unknown,>(url: string, body: unknown): Promise<PostResult<T>> => postJson<T>(apiIn(scope, url), body),
    href: (path: string) => hrefIn(scope, path),
  };
}
