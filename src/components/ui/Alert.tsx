import type { ReactNode } from "react";

import { cn } from "./cn";
import { Icon, type IconName } from "./icons";

export type AlertTone = "success" | "danger" | "warning" | "info";

const LOOK: Record<AlertTone, { box: string; icon: string; glyph: IconName }> = {
  success: { box: "border-green-300 bg-ok-soft dark:border-green-800", icon: "text-ok", glyph: "check" },
  danger: { box: "border-red-300 bg-bad-soft dark:border-red-800", icon: "text-bad", glyph: "alert" },
  warning: { box: "border-amber-300 bg-warn-soft dark:border-amber-800", icon: "text-warn", glyph: "warning" },
  info: { box: "border-sky-300 bg-info-soft dark:border-sky-800", icon: "text-info", glyph: "info" },
};

export function Alert({ tone = "info", title, children, action, className }: {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  /** Optional link or button shown under the message. */
  action?: ReactNode;
  className?: string;
}) {
  const look = LOOK[tone];
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cn("flex gap-3 rounded-card border p-4", look.box, className)}>
      <span className={cn("mt-0.5 shrink-0", look.icon)}>
        <Icon name={look.glyph} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        {children ? <div className="mt-1 text-small text-muted">{children}</div> : null}
        {action ? <div className="mt-2 text-small font-semibold">{action}</div> : null}
      </div>
    </div>
  );
}
