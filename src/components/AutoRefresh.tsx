"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the page's data every few seconds, so a question or a message from the other side shows up without a reload. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
