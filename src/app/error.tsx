"use client";

import { Button } from "@/components/Button";
import { Banner } from "@/components/Card";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="stack">
      <Banner tone="bad">Something went wrong showing this page. Nothing was lost; you can try again.</Banner>
      <div><Button onClick={reset}>Try again</Button></div>
    </div>
  );
}
