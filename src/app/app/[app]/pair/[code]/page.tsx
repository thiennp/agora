import { notFound } from "next/navigation";
import { ApprovePair } from "@/components/ApprovePair";
import { isStoredApp } from "@/app/_composition/identity";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** `/app/{app}/pair/{code}`: opened from the pasted prompt on a device that is already signed in. The code alone grants nothing; the person's tap and the four digits do. */
export default async function ApprovePairPage({ params }: { params: Promise<{ app: string; code: string }> }) {
  const { app, code } = await params;
  if (!isStoredApp(app)) notFound();
  return <ApprovePair appId={app} code={code} />;
}
