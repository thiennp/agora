/** ISO 639-1 codes only, lower case ("de", not "de-DE"). Returns null for anything else. */
export function normalizeLanguage(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return /^[a-z]{2}$/.test(c) ? c : null;
}
