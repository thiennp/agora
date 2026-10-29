import type { SVGProps } from "react";

/**
 * The Agora mark: an open square (the public square, with a way in) around one person. The frame takes the brand colour, the
 * person the text colour, so the mark follows light and dark mode on its own. Decorative unless a title is given.
 */
export function AgoraMark({ size = 22, title, ...rest }: { size?: number; title?: string } & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={MARK_PATH} stroke="var(--accent)" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />
    </svg>
  );
}

/** The frame of the mark on a 32 × 32 grid, drawn clockwise from the left foot to the right foot. Shared with the favicon and the app icon. */
export const MARK_PATH = "M13.5 27H11a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6h10a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-2.5";

/** The mark with the wordmark beside it. The header uses it as the link home. */
export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <span className={className ? `logo ${className}` : "logo"}>
      <AgoraMark size={size} />
      <span>Agora</span>
    </span>
  );
}
