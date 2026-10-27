import type { DealEventBus } from "@/hubs/DealEvents/command";
import { sha256Hex } from "@/lib/crypto";
import type { Gatekeeper } from "@/features/gatekeeper/public-api/types";
import type { LanguageService } from "@/features/language/public-api/types";
import type { EvidenceInput, Report, Trust } from "@/features/trust/public-api/types";
import type { Deal } from "../../../deal-state/public-api/types";
import { isFaithful } from "../core/faithful-relay";
import type { RelayMessage, RelayView } from "../core/relay-message.schema";
import { createRelayStore, type RelayStore } from "./relay.repository";
import { tracked } from "@/lib/state";

export class RelayError extends Error {
  constructor(readonly code: "not_found" | "not_a_party" | "closed" | "invalid" | "rate_limited" | "restricted", message: string) {
    super(message);
  }
}

/** What relay needs from negotiation. */
export interface RelayDeals {
  get(dealId: string): Promise<Deal | null>;
  markReported(dealId: string): Promise<Deal>;
}

export interface RelayAudit {
  kind: "relay";
  dealId: string;
  fromFamilyId: string;
  status: RelayMessage["status"];
  kinds: string[];
  at: string;
}

const MAX_CHARS = 1000;
const MAX_PER_HOUR = 30;
const OPEN_FOR_CHAT = ["proposed", "countered", "agreed_by_agents", "awaiting_owner_input", "awaiting_owners", "confirmed", "handoff"];
const TERMS_TOPICS = new Set(["price_terms", "commitment", "location_reveal", "identity_reveal", "shipping_choice"]);

/**
 * Human to own agent to other agent to other human (NEG-REL-01). Owners only ever talk to their own agent: every message is
 * screened, translated faithfully, screened again, and delivered by the other owner's agent. There is no direct channel.
 */
export function createRelay(deps: {
  deals: RelayDeals;
  trust: Trust;
  gatekeeper: Gatekeeper;
  languageOf: (familyId: string) => string;
  language?: LanguageService;
  bus?: DealEventBus;
  store?: RelayStore;
  audit?: (entry: RelayAudit) => void;
  now?: () => Date;
  newId?: () => string;
}) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const store = deps.store ?? createRelayStore();
  const raised = tracked("relay.raised", new Set<string>());

  async function party(dealId: string, familyId: string) {
    const deal = await deps.deals.get(dealId);
    if (!deal) throw new RelayError("not_found", "deal not found");
    if (familyId !== deal.offerFamilyId && familyId !== deal.wantFamilyId) throw new RelayError("not_a_party", "not an owner in this deal");
    return { deal, other: familyId === deal.offerFamilyId ? deal.wantFamilyId : deal.offerFamilyId };
  }

  /** Recompute scam signals for a sender and lower their score once per deal and level. */
  function updateSignals(dealId: string, senderId: string) {
    const msgs = store.forDeal(dealId).filter((m) => m.fromFamilyId === senderId);
    const report = deps.trust.signals({ messages: msgs.map((m) => ({ text: m.original, kinds: m.screening.kinds })) });
    if (report.level !== "none") {
      const key = `${dealId}:${senderId}:${report.level}`;
      if (!raised.has(key)) {
        raised.add(key);
        deps.trust.reputation.record(senderId, { type: "scam_signals", level: report.level });
      }
    }
    return report;
  }

  const service = {
    /** An owner says something to their own agent, which relays it (NEG-REL-01..03). */
    async ownerSays(dealId: string, fromFamilyId: string, rawText: string) {
      const { deal, other } = await party(dealId, fromFamilyId);
      if (!OPEN_FOR_CHAT.includes(deal.state)) throw new RelayError("closed", "this deal is closed");
      if (!deps.trust.reputation.canRelay(fromFamilyId)) throw new RelayError("restricted", "this account can no longer send messages");
      const text = rawText.trim();
      if (!text || text.length > MAX_CHARS) throw new RelayError("invalid", `a message needs 1 to ${MAX_CHARS} characters`);
      if (store.fromInLastHour(dealId, fromFamilyId, now()) >= MAX_PER_HOUR) throw new RelayError("rate_limited", "too many messages; try again later");

      const fromLang = deps.languageOf(fromFamilyId);
      const toLang = deps.languageOf(other);
      const base = { id: newId(), dealId, fromFamilyId, toFamilyId: other, original: text, originalLang: fromLang, relayedLang: toLang, hash: sha256Hex(text), at: now().toISOString() };

      // 1. Screen what the owner typed.
      const s1 = deps.trust.screen(text, { familyId: fromFamilyId, dealId });
      const block = (screening: RelayMessage["screening"], reason: string | null): RelayMessage => ({
        ...base, screenedOriginal: "", relayed: "", status: "blocked", senderNotice: reason, screening,
        topics: [], chatDoesNotChangeTerms: false, uncertain: false, translationFailed: false,
      });
      let msg: RelayMessage;
      if (s1.decision === "block") {
        msg = block({ decision: "block", kinds: s1.kinds }, s1.reason);
      } else {
        // 2. Translate the screened text faithfully; on any doubt deliver the original and say so.
        let relayed = s1.redacted;
        let uncertain = false;
        let translationFailed = false;
        if (fromLang !== toLang) {
          const r = deps.language ? await deps.language.translate({ text: s1.redacted, from: fromLang, to: toLang, participantId: fromFamilyId }) : null;
          if (r?.ok && isFaithful(s1.redacted, r.text)) {
            relayed = r.text;
            uncertain = r.uncertain;
          } else {
            translationFailed = true;
          }
        }
        // 3. Screen again: translator output is untrusted and must not introduce contact details.
        const s2 = relayed === s1.redacted ? s1 : deps.trust.screen(relayed, { familyId: fromFamilyId, dealId });
        // The text was already screened, so anything found in the translation was added by the translator: hold it.
        if (s2.decision !== "allow" && relayed !== s1.redacted) {
          msg = block({ decision: "block", kinds: [...new Set([...s1.kinds, ...s2.kinds])] }, "Held: the translation contained something that cannot be shared in chat.");
        } else {
          relayed = s2.redacted;
          // 4. The gatekeeper labels topics only to tell the receiver that chat cannot change the deal.
          const english = deps.language ? await deps.language.toEnglish(s1.redacted, fromLang, fromFamilyId) : null;
          const v = deps.gatekeeper.evaluateIncoming({ familyId: other, dealId, text: s1.redacted, translated: english });
          const kinds = [...new Set([...s1.kinds, ...s2.kinds])];
          msg = {
            ...base, screenedOriginal: s1.redacted, relayed, status: s1.decision === "redact" || s2.decision === "redact" ? "redacted" : "delivered",
            senderNotice: s1.reason ?? s2.reason, screening: { decision: s1.decision === "allow" ? s2.decision : s1.decision, kinds },
            topics: v.topics, chatDoesNotChangeTerms: v.topics.some((t) => TERMS_TOPICS.has(t)), uncertain, translationFailed,
          };
        }
      }
      store.rows.push(msg);
      deps.audit?.({ kind: "relay", dealId, fromFamilyId, status: msg.status, kinds: msg.screening.kinds, at: msg.at });
      const signals = updateSignals(dealId, fromFamilyId);
      return { status: msg.status, notice: msg.senderNotice, messageId: msg.id, signals };
    },

    /** The conversation as one owner sees it: their own words, and what reached them (original and relayed, NEG-REL-04). */
    async conversationFor(dealId: string, viewerFamilyId: string): Promise<RelayView[]> {
      await party(dealId, viewerFamilyId);
      const out: RelayView[] = [];
      for (const m of store.forDeal(dealId)) {
        if (m.fromFamilyId === viewerFamilyId) {
          out.push({ id: m.id, direction: "sent", at: m.at, original: m.original, status: m.status, notice: m.senderNotice, deliveredAs: m.relayed });
        } else if (m.status !== "blocked") {
          out.push({
            id: m.id, direction: "received", at: m.at, text: m.relayed, textLang: m.translationFailed ? m.originalLang : m.relayedLang,
            originalFromSender: m.screenedOriginal, originalLang: m.originalLang, uncertain: m.uncertain, translationFailed: m.translationFailed,
            notice: m.chatDoesNotChangeTerms ? "Nothing agreed in chat counts. Terms and commitments change only through your agent's cards." : null,
          });
        }
      }
      return out;
    },

    /** Signals about the other party, shown to an owner as a short explanation (TRU-SIG-02). */
    async signalsAbout(dealId: string, viewerFamilyId: string) {
      const { other } = await party(dealId, viewerFamilyId);
      const msgs = store.forDeal(dealId).filter((m) => m.fromFamilyId === other);
      return deps.trust.signals({ messages: msgs.map((m) => ({ text: m.original, kinds: m.screening.kinds })) });
    },

    /** Two taps: the deal and a reason. Builds the evidence bundle from message hashes and flags, files the report, stops the deal. */
    async reportDeal(dealId: string, reporterFamilyId: string, reason: string, note?: string): Promise<Report> {
      const { other } = await party(dealId, reporterFamilyId);
      const evidence: EvidenceInput[] = store.forDeal(dealId).map((m) => ({
        messageHash: m.hash, at: m.at, role: m.fromFamilyId === reporterFamilyId ? "reporter" : "reported",
        flags: [...m.screening.kinds, ...(m.status === "blocked" ? ["blocked"] : []), ...(m.chatDoesNotChangeTerms ? ["terms_in_chat"] : [])],
      }));
      const sig = deps.trust.signals({ messages: store.forDeal(dealId).filter((m) => m.fromFamilyId === other).map((m) => ({ text: m.original, kinds: m.screening.kinds })) });
      const report = deps.trust.fileReport({ dealId, reporterFamilyId, reportedFamilyId: other, reason, note, evidence, signals: sig.signals.map((s) => ({ id: s.id, weight: s.weight })) });
      await deps.deals.markReported(dealId).catch(() => undefined);
      deps.bus?.publish({ type: "ReportFiled", dealId, reason });
      return report;
    },

    eraseFamily: (familyId: string) => store.removeFamily(familyId),
  };
  return service;
}

export type Relay = ReturnType<typeof createRelay>;
