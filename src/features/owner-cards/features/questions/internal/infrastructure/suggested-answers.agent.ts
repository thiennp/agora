import type { SuggestedAnswer } from "../core/owner-question.schema";

export type TermsFact = { kind: "free" } | { kind: "swap"; swapFor: string } | { kind: "price"; amount: number; currency: string } | { kind: "unknown" };

interface QuestionFacts {
  topic: string;
  /** Structured summary of what is being asked, never raw counterparty text. */
  terms?: TermsFact;
  window?: { from: string; to: string };
  weAreProposing?: boolean;
}

interface Pack {
  free: string;
  swap: (x: string) => string;
  price: (amount: number, cur: string) => string;
  unknown: string;
  priceQ: (terms: string) => string;
  windowOurs: (w: string) => string;
  windowTheirs: (w: string) => string;
  windowNone: string;
  generic: string;
  yesTerms: string; noDeal: string; yesTime: string; yesGo: string; noStop: string;
}

/** Fixed wording in the app's main languages (no model, nothing a counterparty can steer). Other languages are translated by the caller. */
const PACKS: Record<string, Pack> = {
  en: {
    free: "free of charge", swap: (x) => `a swap for ${x}`, price: (a, c) => `${a} ${c}, settled between the two of you`, unknown: "different terms",
    priceQ: (t) => `The terms on the table are: ${t}. Do you accept them?`,
    windowOurs: (w) => `Your agent would like to suggest this pickup time: ${w}. Is that OK?`,
    windowTheirs: (w) => `The other side suggests this pickup time: ${w}. Is that OK?`,
    windowNone: "A pickup time needs to be agreed. Is it OK for your agent to go ahead?",
    generic: "Your agent needs your decision before it can go on. Do you want it to continue?",
    yesTerms: "Yes, accept these terms", noDeal: "No, decline the deal", yesTime: "Yes, that works", yesGo: "Yes, continue", noStop: "No, stop here",
  },
  de: {
    free: "kostenlos", swap: (x) => `ein Tausch gegen ${x}`, price: (a, c) => `${a} ${c}, unter euch beiden geregelt`, unknown: "andere Bedingungen",
    priceQ: (t) => `Die Bedingungen sind: ${t}. Stimmst du zu?`,
    windowOurs: (w) => `Dein Agent möchte diese Abholzeit vorschlagen: ${w}. Passt das?`,
    windowTheirs: (w) => `Die andere Seite schlägt diese Abholzeit vor: ${w}. Passt das?`,
    windowNone: "Eine Abholzeit muss vereinbart werden. Darf dein Agent weitermachen?",
    generic: "Dein Agent braucht deine Entscheidung, bevor er weitermacht. Soll er fortfahren?",
    yesTerms: "Ja, diese Bedingungen annehmen", noDeal: "Nein, den Handel ablehnen", yesTime: "Ja, das passt", yesGo: "Ja, weiter", noStop: "Nein, hier stoppen",
  },
  es: {
    free: "gratis", swap: (x) => `un intercambio por ${x}`, price: (a, c) => `${a} ${c}, acordado entre ustedes`, unknown: "otras condiciones",
    priceQ: (t) => `Las condiciones son: ${t}. ¿Las aceptas?`,
    windowOurs: (w) => `Tu agente quiere proponer esta hora de recogida: ${w}. ¿Te parece bien?`,
    windowTheirs: (w) => `La otra parte propone esta hora de recogida: ${w}. ¿Te parece bien?`,
    windowNone: "Hay que acordar una hora de recogida. ¿Puede seguir tu agente?",
    generic: "Tu agente necesita tu decisión para continuar. ¿Quieres que siga?",
    yesTerms: "Sí, aceptar estas condiciones", noDeal: "No, rechazar el trato", yesTime: "Sí, me viene bien", yesGo: "Sí, continuar", noStop: "No, parar aquí",
  },
  vi: {
    free: "miễn phí", swap: (x) => `đổi lấy ${x}`, price: (a, c) => `${a} ${c}, hai bên tự thỏa thuận`, unknown: "điều kiện khác",
    priceQ: (t) => `Điều kiện đang đề xuất: ${t}. Bạn có đồng ý không?`,
    windowOurs: (w) => `Trợ lý của bạn muốn đề xuất giờ nhận hàng: ${w}. Được không?`,
    windowTheirs: (w) => `Bên kia đề xuất giờ nhận hàng: ${w}. Được không?`,
    windowNone: "Cần thống nhất giờ nhận hàng. Trợ lý của bạn có được tiếp tục không?",
    generic: "Trợ lý của bạn cần quyết định của bạn để tiếp tục. Bạn muốn tiếp tục không?",
    yesTerms: "Có, đồng ý điều kiện này", noDeal: "Không, từ chối giao dịch", yesTime: "Có, được", yesGo: "Có, tiếp tục", noStop: "Không, dừng lại",
  },
};

export const hasPack = (language: string) => language in PACKS;

const fmt = (w: { from: string; to: string }) => `${w.from.slice(0, 16).replace("T", " ")} - ${w.to.slice(11, 16)} UTC`;

/** Question wording and one-tap answers (OWN-02) in the owner's language when a fixed pack exists, English otherwise. */
export function questionContent(f: QuestionFacts, language = "en"): { text: string; answers: SuggestedAnswer[]; language: string } {
  const lang = hasPack(language) ? language : "en";
  const p = PACKS[lang]!;
  const terms = !f.terms || f.terms.kind === "unknown" ? p.unknown : f.terms.kind === "free" ? p.free : f.terms.kind === "swap" ? p.swap(f.terms.swapFor) : p.price(f.terms.amount, f.terms.currency);
  switch (f.topic) {
    case "price_terms":
      return { language: lang, text: p.priceQ(terms), answers: [{ id: "yes", label: p.yesTerms }, { id: "no", label: p.noDeal }] };
    case "pickup_time_window":
      return {
        language: lang,
        text: f.window ? (f.weAreProposing ? p.windowOurs(fmt(f.window)) : p.windowTheirs(fmt(f.window))) : p.windowNone,
        answers: [{ id: "yes", label: p.yesTime }, { id: "no", label: p.noDeal }],
      };
    default:
      return { language: lang, text: p.generic, answers: [{ id: "yes", label: p.yesGo }, { id: "no", label: p.noStop }] };
  }
}
