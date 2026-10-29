"use client";

import { Button } from "@/components/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="status-page" role="alert">
      <h1>Something went wrong</h1>
      <p>This page could not be shown. Nothing was lost. Try again, and if it keeps happening, come back in a moment.</p>
      <div><Button onClick={reset}>Try again</Button></div>
    </div>
  );
}
