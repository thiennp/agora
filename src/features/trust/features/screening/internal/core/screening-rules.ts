export type FindingKind = "phone" | "email" | "handle" | "link" | "address" | "payment";

export interface Finding {
  kind: FindingKind;
  /** Where in the original text, or null when only an obfuscated reading found it (then the whole message is blocked). */
  span: [number, number] | null;
}

export interface ScreeningResult {
  decision: "allow" | "redact" | "block";
  findings: Finding[];
  kinds: FindingKind[];
  /** The text that may be delivered: contact details replaced, or empty when blocked. */
  redacted: string;
  /** Plain words for the sender (TRU-SCR-02). */
  reason: string | null;
}

export interface ScreeningOptions {
  /** What to do with phone numbers, emails, handles and links. Addresses and payment requests are always blocked. */
  contactMode?: "redact" | "block";
}

const PLATFORMS = "whatsapp|telegram|signal|instagram|insta|snapchat|facebook|messenger|wechat|viber|zalo|kik|discord|tiktok";
const TLDS = "com|net|org|io|me|co|de|app|ly|link|shop|biz|info|xyz|top|vn|es|fr|uk|us|eu|at|ch";

const RE = {
  email: /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi,
  link: new RegExp(`https?:\\/\\/\\S+|www\\.\\S+|\\b[a-z0-9-]+\\.(?:${TLDS})\\b(?:\\/\\S*)?`, "gi"),
  handle: new RegExp(`(?:^|\\s)@[a-z0-9_.]{3,}|\\b(?:${PLATFORMS})\\b[^.!?\\n]{0,15}(?:\\bme\\b|\\bus\\b|number|handle|nick|\\bid\\b|:)|\\b(?:add|text|message|contact|dm|write|call|reach|find|ping)\\s+(?:me|us)\\b[^.!?\\n]{0,12}\\b(?:${PLATFORMS})\\b|\\bmy\\s+(?:${PLATFORMS})\\b`, "gi"),
  // phone: international, grouped national, or long digit runs; short digit runs (sizes, ages, prices) never match
  phoneIntl: /\+\d[\d\s().-]{6,}\d/g,
  phoneGrouped: /(?<!\d)\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,5}(?!\d)/g,
  phoneLong: /(?<!\d)\d{9,15}(?!\d)/g,
  phoneContext: /\b(?:call|text|ring|phone|mobile|whatsapp|number|nummer|handy|llama|gọi)\b[^\n\d]{0,12}(\d[\d\s.-]{5,}\d)/gi,
  address: new RegExp(
    [
      "\\b\\d{1,5}\\s+[a-zà-ÿ'.\\- ]{2,30}\\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|way|platz|straße|strasse|str\\.|weg|allee|calle|avenida|đường|phố)\\b\\.?",
      "\\b[a-zäöüß]+(?:straße|strasse|str\\.|weg|platz|allee)\\s*\\d{1,4}[a-z]?\\b",
      "\\b(?:i live (?:at|on|in)|my address is|our address is|come to my (?:house|place|home|flat|apartment)|ring the bell|door (?:number|code)|apartment \\d|flat \\d|ich wohne|meine adresse|vivo en|mi dirección|tôi sống ở|địa chỉ của (?:tôi|mình))\\b",
      "\\b(?:zip|postcode|postal code|plz)\\W{0,3}\\d{4,6}\\b",
    ].join("|"),
    "gi",
  ),
  payment:
    /\b(?:paypal|venmo|zelle|cash ?app|western union|moneygram|revolut|iban|swift|bank transfer|wire transfer|gift ?cards?|bitcoin|btc|crypto|ethereum|usdt|send (?:me )?(?:the )?money|pay (?:me )?(?:first|upfront|in advance|before)|deposit|advance payment|vorkasse|überweis\w*|anzahlung|transferencia|chuyển khoản|đặt cọc)\b/gi,
};

const DIGIT_WORDS = /\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s,-]+){6,}(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\b/i;
const DATE = /\b\d{1,4}[./-]\d{1,2}[./-]\d{1,4}\b/g;

const REASON: Record<FindingKind, string> = {
  phone: "phone numbers can't be shared in chat",
  email: "email addresses can't be shared in chat",
  handle: "other messaging accounts can't be shared in chat",
  link: "links can't be shared in chat",
  address: "addresses can't be shared in chat; the exact place is shown only after both of you confirm",
  payment: "payment requests are not allowed in chat; the platform never handles money",
};

const MARK: Record<string, string> = { phone: "[number removed]", email: "[email removed]", handle: "[contact removed]", link: "[link removed]" };

/** Mask dates so they are never read as phone numbers; same length keeps spans valid. */
const maskDates = (t: string) => t.replace(DATE, (m) => " ".repeat(m.length));

/** Undo common obfuscation ("name (at) mail [dot] com", "w w w"). Spans no longer map to the original after this. */
function deobfuscate(t: string): string {
  return t
    .replace(/\s*[[(]\s*at\s*[\])]\s*/gi, "@")
    .replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".")
    .replace(/\b(\w+)\s+at\s+(\w+)\s+dot\s+(\w+)\b/gi, "$1@$2.$3")
    .replace(/(?<=\d)[\s.,_-]+(?=\d)/g, "");
}

function scan(text: string, masked: string): Finding[] {
  const out: Finding[] = [];
  const add = (kind: FindingKind, re: RegExp, source: string) => {
    for (const m of source.matchAll(re)) if (m.index !== undefined) out.push({ kind, span: [m.index, m.index + m[0].length] });
  };
  add("email", RE.email, text);
  add("link", RE.link, text);
  add("handle", RE.handle, text);
  add("phone", RE.phoneIntl, masked);
  add("phone", RE.phoneGrouped, masked);
  add("phone", RE.phoneLong, masked);
  for (const m of masked.matchAll(RE.phoneContext)) {
    // Only the number is removed, not the words around it.
    if (m.index !== undefined && m[1]) {
      const start = m.index + m[0].lastIndexOf(m[1]);
      out.push({ kind: "phone", span: [start, start + m[1].length] });
    }
  }
  add("address", RE.address, text);
  add("payment", RE.payment, text);
  return out;
}

/**
 * Screens one message for contact details, links, addresses and payment requests (TRU-SCR-01, NEG-REL-03).
 * Phones, emails, handles and links are redacted (or the message blocked, by setting); addresses and payment requests
 * are always blocked. Anything found only after undoing obfuscation blocks the whole message. Pure and side-effect free.
 */
export function screen(text: string, opts: ScreeningOptions = {}): ScreeningResult {
  const masked = maskDates(text);
  const findings = scan(text, masked);

  const deob = deobfuscate(text);
  if (deob !== text) {
    const known = new Set(findings.map((f) => f.kind));
    for (const f of scan(deob, maskDates(deob))) if (!known.has(f.kind)) findings.push({ kind: f.kind, span: null });
  }
  if (DIGIT_WORDS.test(text)) findings.push({ kind: "phone", span: null });

  const kinds = [...new Set(findings.map((f) => f.kind))];
  if (kinds.length === 0) return { decision: "allow", findings, kinds, redacted: text, reason: null };

  const mustBlock = kinds.some((k) => k === "address" || k === "payment") || findings.some((f) => f.span === null) || opts.contactMode === "block";
  const reason = `Not sent as written: ${kinds.map((k) => REASON[k]).join("; ")}.`;
  if (mustBlock) return { decision: "block", findings, kinds, redacted: "", reason };

  // Redact right to left so earlier spans stay valid; merge overlaps first.
  const spans = findings.map((f) => ({ kind: f.kind, from: f.span![0], to: f.span![1] })).sort((a, b) => a.from - b.from);
  const merged: typeof spans = [];
  for (const s of spans) {
    const last = merged.at(-1);
    if (last && s.from <= last.to) last.to = Math.max(last.to, s.to);
    else merged.push({ ...s });
  }
  let redacted = text;
  for (const s of merged.reverse()) redacted = redacted.slice(0, s.from) + (MARK[s.kind] ?? "[removed]") + redacted.slice(s.to);
  return { decision: "redact", findings, kinds, redacted, reason: reason.replace("Not sent as written", "Sent with details removed") };
}
