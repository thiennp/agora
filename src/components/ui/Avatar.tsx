import { cn } from "./cn";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type Presence = "online" | "away" | "offline";

const BOX: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-caption",
  md: "h-10 w-10 text-small",
  lg: "h-12 w-12 text-body",
  xl: "h-16 w-16 text-heading",
};

const DOT: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

const TINTS = [
  "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100",
  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
];

const PRESENCE: Record<Presence, string> = { online: "bg-green-500", away: "bg-amber-500", offline: "bg-slate-400" };

/** First letters of the first and last word, upper case. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]![0]!;
  const last = words.length > 1 ? words[words.length - 1]![0]! : "";
  return (first + last).toUpperCase();
}

/** A stable tint for a name, so the same person always gets the same colour. */
function tintOf(name: string): string {
  let sum = 0;
  for (const ch of name) sum = (sum * 31 + ch.charCodeAt(0)) % 997;
  return TINTS[sum % TINTS.length]!;
}

/** Initials in a coloured circle. Members have no photos in Agora, so nothing is loaded from anywhere. */
export function Avatar({ name, size = "md", presence, className }: { name: string; size?: AvatarSize; presence?: Presence; className?: string }) {
  return (
    <span role="img" aria-label={presence ? `${name}, ${presence}` : name} className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold", BOX[size], tintOf(name), className)}>
      <span aria-hidden="true">{initialsOf(name)}</span>
      {presence ? <span aria-hidden="true" className={cn("absolute bottom-0 right-0 rounded-full ring-2 ring-surface", DOT[size], PRESENCE[presence])} /> : null}
    </span>
  );
}

/** Overlapping avatars; shows at most `max` and a "+n" chip for the rest. */
export function AvatarStack({ names, max = 4, size = "md" }: { names: string[]; max?: number; size?: AvatarSize }) {
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((n) => (
        <Avatar key={n} name={n} size={size} className="-ml-2 ring-2 ring-surface first:ml-0" />
      ))}
      {more > 0 ? (
        <span className={cn("-ml-2 inline-flex items-center justify-center rounded-full bg-surface-2 font-semibold text-muted ring-2 ring-surface", BOX[size])}>+{more}</span>
      ) : null}
    </div>
  );
}
