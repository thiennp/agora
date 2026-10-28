/** Words from a person are untrusted data (CLAUDE.md): cleaned and capped before they reach a prompt, a config or a screen. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Letters that do not split into a base letter and an accent, so NFKD alone would drop them ("Đổi Đồ" must not become "oi-o"). */
const LETTERS: Record<string, string> = { đ: "d", ð: "d", ø: "o", ł: "l", ß: "ss", æ: "ae", œ: "oe", þ: "th", ı: "i" };

/** A config id part: lower-case letters, digits and dashes, starting with a letter. Empty when nothing usable is left. */
export function slugify(raw: string, max = 40): string {
  const s = raw
    .toLowerCase()
    .replace(/[đðøłßæœþı]/g, (c) => LETTERS[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return s;
}
