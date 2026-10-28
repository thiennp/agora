import type { ReactElement, SVGProps } from "react";

export type IconName = "check" | "alert" | "warning" | "info" | "close" | "upload" | "sun" | "moon" | "copy";

const PATHS: Record<IconName, ReactElement[]> = {
  check: [<circle key="c" cx="12" cy="12" r="9" />, <path key="p" d="M8 12.5l2.7 2.7L16 9.5" />],
  alert: [<circle key="c" cx="12" cy="12" r="9" />, <path key="p" d="M12 7.5v5.5M12 16.2v.1" />],
  warning: [<path key="t" d="M12 3.5l9 15.5H3z" />, <path key="p" d="M12 10v4.2M12 16.8v.1" />],
  info: [<circle key="c" cx="12" cy="12" r="9" />, <path key="p" d="M12 11v5.5M12 7.8v.1" />],
  close: [<path key="p" d="M6 6l12 12M18 6L6 18" />],
  upload: [<path key="a" d="M12 16V5M7.5 9.5L12 5l4.5 4.5" />, <path key="b" d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />],
  sun: [<circle key="c" cx="12" cy="12" r="3.6" />, <path key="r" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />],
  moon: [<path key="p" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />],
  copy: [<rect key="a" x="8.5" y="8.5" width="11" height="11" rx="2" />, <path key="b" d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />],
};

/** Small outline icons drawn for this project (24x24 grid, stroke follows the text colour). */
export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
