import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { WaitingBadge } from "@/components/WaitingBadge";
import { appVocabulary, loadApp } from "@/lib/app-config";
import { memberScope } from "@/app/_composition/member-scope";
import { getAppStore } from "@/app/_composition/apps";

/**
 * Everything under `/app/{app}`: an unknown app is a real 404 here (before any page streams), and a person using the app gets the
 * app's own bar instead of the demo navigation. Strangers get the bare name; they see only the public page.
 */
export default async function AppLayout({ children, params }: { children: ReactNode; params: Promise<{ app: string }> }) {
  const id = (await params).app;
  getAppStore();
  let app;
  try {
    app = await loadApp(id);
  } catch {
    notFound();
  }
  const s = await memberScope(id, (await cookies()).toString());
  const links: { path: string; label: string; badge?: number }[] = [];
  let pending = 0;
  if (s.kind === "member") {
    const w = appVocabulary(app);
    const board = w.style === "board";
    await s.platform.cards.settled();
    pending = s.platform.cards.questionsFor(s.me.id).length + s.platform.cards.confirmationsFor(s.me.id).length;
    links.push(
      { path: "", label: s.me.role === "creator" ? "Overview" : "About" },
      { path: "/items", label: board ? "Posts" : "Items" },
      { path: "/cards", label: "Cards", badge: pending },
      { path: "/deals", label: board ? "Conversations" : "Deals" },
      { path: `/muse/${s.me.id}`, label: "My agent" },
    );
  }
  return (
    <>
      <AppNav appId={id} appName={app.name} links={links} />
      {s.kind === "member" ? <WaitingBadge appId={id} initial={pending} /> : null}
      {children}
    </>
  );
}
