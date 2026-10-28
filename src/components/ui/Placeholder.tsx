import { cn } from "./cn";

/** A picture slot drawn in CSS and SVG, for layouts that will later hold a photo. Ships no image file. */
export function Placeholder({ label = "Image", ratio = "video", className }: { label?: string; ratio?: "video" | "square" | "wide"; className?: string }) {
  const aspect = ratio === "square" ? "aspect-square" : ratio === "wide" ? "aspect-[21/9]" : "aspect-video";
  return (
    <div role="img" aria-label={label} className={cn("relative grid place-items-center overflow-hidden rounded-card bg-gradient-to-br from-brand-100 to-sky-100 dark:from-brand-900 dark:to-slate-800", aspect, className)}>
      <svg viewBox="0 0 64 48" className="w-1/4 min-w-10 max-w-20 text-brand-500/60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="58" height="40" rx="6" />
        <circle cx="20" cy="18" r="5" />
        <path d="M3 38l16-12 12 9 9-6 21 14" />
      </svg>
    </div>
  );
}
