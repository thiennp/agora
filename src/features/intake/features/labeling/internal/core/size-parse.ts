/** Map free text a model wrote ("size 98", "98 cm", "Gr. 86/92") to one of the app's own sizes, or nothing. Never invents a size. */
export function normalizeSize(raw: string | null | undefined, allowed: readonly string[] | undefined): string | undefined {
  if (!raw || !allowed?.length) return undefined;
  const text = raw.trim().toLowerCase();
  const exact = allowed.find((a) => a.toLowerCase() === text);
  if (exact) return exact;
  const tokens: string[] = text.match(/[a-z]+|\d+/g) ?? [];
  const hits = allowed.filter((a) => tokens.includes(a.toLowerCase()));
  return hits.length === 1 ? hits[0] : undefined;
}
