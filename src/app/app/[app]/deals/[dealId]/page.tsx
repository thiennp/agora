import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { DealRoomBody } from "@/app/_pages/DealRoomBody";
import { memberScope } from "@/app/_composition/member-scope";

export const dynamic = "force-dynamic";

/** A person's own page in a created app. Anyone without a session for this app (or an app that has no members) gets the not-found page. */
export default async function Page({ params }: { params: Promise<{ app: string; dealId: string }> }) {
  const { app, dealId } = await params;
  const s = await memberScope(app, (await cookies()).toString());
  if (s.kind !== "member") notFound();
  return <DealRoomBody platform={s.platform} scope={s.scope} dealId={dealId} />;
}
