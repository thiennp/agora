import { DealRoomBody } from "@/app/_pages/DealRoomBody";
import { Unavailable } from "@/components/Unavailable";
import { demoScope } from "@/components/scope";
import { getPlatform } from "@/app/_composition/platform";
import { asKey } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

export default async function DealRoom({ params, searchParams }: { params: Promise<{ dealId: string }>; searchParams: Promise<{ as?: string }> }) {
  const { dealId } = await params;
  const as = asKey((await searchParams).as);
  try {
    return <DealRoomBody platform={await getPlatform()} scope={demoScope(as)} dealId={dealId} />;
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
}
