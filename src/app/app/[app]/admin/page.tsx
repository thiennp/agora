import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AdminSignIn } from "@/components/AdminSignIn";
import { appPageView } from "@/app/_composition/app-views";

export const dynamic = "force-dynamic";

/**
 * `/app/{app}/admin`: the door to the admin dashboard, which is `/app/{app}` for the creator. The admin's own session goes straight to
 * the dashboard; anyone else sees only the app's name and a recovery-code form, never the dashboard.
 */
export default async function AdminDoor({ params }: { params: Promise<{ app: string }> }) {
  const id = (await params).app;
  const view = await appPageView(id, (await cookies()).toString());
  if (view.kind === "unknown" || view.kind === "demo") notFound();
  if (view.kind === "creator") redirect(`/app/${id}`);
  return (
    <div className="stack-lg">
      <h1>{view.app.name}</h1>
      <AdminSignIn appId={id} appName={view.app.name} />
    </div>
  );
}
