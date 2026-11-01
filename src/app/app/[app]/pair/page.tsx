import { notFound } from "next/navigation";
import { PairNewComputer } from "@/components/PairNewComputer";
import { loadApp } from "@/lib/app-config";
import { getAppStore } from "@/app/_composition/apps";
import { isStoredApp } from "@/app/_composition/identity";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/**
 * `/app/{app}/pair`: the page to open on a new computer. Unlike the app page it does not set a person up on first visit, because the point
 * is to become the person who already uses the app. Needs a device that is already signed in to approve.
 */
export default async function PairPage({ params }: { params: Promise<{ app: string }> }) {
  const id = (await params).app;
  getAppStore();
  if (!isStoredApp(id)) notFound();
  const app = await loadApp(id).catch(() => notFound());
  return <PairNewComputer appId={id} appName={app.name} />;
}
