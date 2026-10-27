import { normalizeLanguage } from "./language-code";

export interface Detection {
  /** ISO 639-1 code, or "unknown". */
  language: string;
  confidence: number;
  method: "script" | "words" | "none";
}

/** Short stopword lists: enough to tell the supported Latin-script languages apart on a sentence. */
const WORDS: Record<string, string[]> = {
  en: ["the", "and", "is", "are", "you", "your", "it", "this", "that", "for", "with", "have", "can", "please", "thanks", "hello", "what", "how", "would", "we", "i"],
  de: ["der", "die", "das", "und", "ist", "nicht", "ich", "du", "sie", "wir", "mit", "für", "ein", "eine", "bitte", "danke", "hallo", "wie", "was", "noch", "kann", "haben"],
  es: ["el", "la", "los", "las", "y", "es", "de", "que", "un", "una", "por", "para", "con", "hola", "gracias", "por favor", "cómo", "qué", "puedes", "está", "tengo"],
  fr: ["le", "la", "les", "et", "est", "un", "une", "pour", "avec", "je", "vous", "nous", "bonjour", "merci", "s'il", "comment", "pouvez", "avez", "ce"],
  vi: ["và", "là", "của", "không", "có", "tôi", "mình", "bạn", "cho", "một", "xin", "chào", "cảm", "ơn", "được", "nhé", "ạ", "với"],
};

const VI_MARKS = /[ăâđêôơưạảãàáặắằẳẵấầẩẫậẹẻẽèéệếềểễịỉĩìíọỏõòóộốồổỗợớờởỡụủũùúựứừửữỳỵỷỹý]/i;

const tokens = (t: string) => t.toLowerCase().match(/[\p{L}']+/gu) ?? [];

/**
 * Cheap deterministic detection among `candidates` (the app's languages). No model, no side effects. Returns
 * "unknown" when it is not sure, so callers can ask a model or the owner (LNG-DET-02) instead of guessing.
 */
export function detectLanguage(text: string, candidates: readonly string[]): Detection {
  const allowed = candidates.map((c) => normalizeLanguage(c)).filter((c): c is string => c !== null);
  const t = text.slice(0, 2000);
  if (!/\p{L}/u.test(t)) return { language: "unknown", confidence: 0, method: "none" };

  if (allowed.includes("vi") && VI_MARKS.test(t) && (t.match(VI_MARKS)?.length ?? 0) >= 2) {
    return { language: "vi", confidence: 0.9, method: "script" };
  }
  const words = tokens(t);
  const scores = allowed
    .filter((l) => WORDS[l])
    .map((l) => ({ l, n: words.filter((w) => WORDS[l]!.includes(w)).length }))
    .sort((a, b) => b.n - a.n);
  const [best, second] = scores;
  if (best && best.n >= 2 && best.n > (second?.n ?? 0)) {
    return { language: best.l, confidence: Math.min(0.95, 0.5 + 0.1 * (best.n - (second?.n ?? 0))), method: "words" };
  }
  return { language: "unknown", confidence: 0, method: "none" };
}
