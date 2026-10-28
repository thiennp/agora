import { DealsBody } from "@/app/_pages/DealsBody";
import { Unavailable } from "@/components/Unavailable";
import { demoScope } from "@/components/scope";
import { getPlatform } from "@/app/_composition/platform";
import { asKey } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const as = asKey((await searchParams).as);
  try {
    return <DealsBody platform={await getPlatform()} scope={demoScope(as)} />;
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
}
