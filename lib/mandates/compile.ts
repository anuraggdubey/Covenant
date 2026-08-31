/**
 * Mandate compiler and contradiction checks — Lane B, T-B7.
 *
 * A model DRAFTS a mandate; this file is what makes it live. Everything here
 * is deterministic and testable, because "the model said it was fine" is not
 * a safety property. The Featherless draft path feeds text in; nothing about
 * activation depends on the model's judgement.
 *
 * Activation is fail-closed: a mandate with any unresolved contradiction
 * compiles to BLOCKED and can never be activated. That is the demo beat — a
 * judge types something reasonable-sounding and watches it get refused with a
 * reason, before a single order exists.
 *
 * Contradiction codes and expected outcomes are pinned by Lane C's corpus in
 * docs/mandates/corpus-v1.json, which tests/mandates/corpus.test.ts runs.
 */

import {
  EQUITY_RATIO_FIELDS,
  profileLimits,
  toPolicyUnits,
  type ProfileLimits
} from "@/lib/mandates/profiles";
import { computePolicyHash } from "@/lib/hashes";
import { ALL_INVARIANTS, type Policy, type RiskProfile, type Structure, type Underlying } from "@/types/domain";

export type ContradictionCode =
  | "FORCED_TRADE_CONFLICT"
  | "UNDEFINED_RISK_SCOPE"
  | "RANGE_INVERSION"
  | "RISK_CAP_CONTRADICTION";

export interface Contradiction {
  code: ContradictionCode;
  fields: string[];
  /** Written for the person who typed the mandate, not for us. */
  explanation: string;
}

export type DraftStatus = "READY" | "BLOCKED";

export interface PolicyDraft {
  status: DraftStatus;
  riskProfile: RiskProfile;
  allowedUnderlyings: Underlying[];
  allowedStructures: Structure[];
  riskSettingsRef: RiskProfile;
  /** Fraction units, and only fields that differ from the profile default. */
  riskOverrides: Partial<ProfileLimits>;
  missingStateAction: "ABSTAIN";
  modelAuthority: "VETO_OR_SHRINK";
  invariants: string[];
}

export interface CompileResult {
  draft: PolicyDraft;
  contradictions: Contradiction[];
  /** Plain-English echo, so the author can check we understood them. */
  echo: string;
}

// ---------------------------------------------------------------------------
// Parsing. Narrow and literal on purpose — see the scope fence in
// IMPLEMENTATION.md §3: this is not a natural-language policy language.
// ---------------------------------------------------------------------------

function detectUnderlyings(text: string): Underlying[] {
  const found: Underlying[] = [];
  if (/\bSPY\b/i.test(text)) found.push("SPY");
  if (/\bQQQ\b/i.test(text)) found.push("QQQ");
  return found.length > 0 ? found : ["SPY", "QQQ"];
}

function detectProfile(text: string): RiskProfile {
  if (/\bconservative\b/i.test(text)) return "CONSERVATIVE";
  if (/\baggressive\b/i.test(text)) return "AGGRESSIVE";
  return "BALANCED";
}

function detectStructures(text: string): Structure[] {
  const structures = new Set<Structure>();

  if (/bull[-\s]?call/i.test(text)) structures.add("BULL_CALL_DEBIT");
  if (/bear[-\s]?put/i.test(text)) structures.add("BEAR_PUT_DEBIT");

  // "debit verticals", and also "debit and credit verticals", mean both debit
  // families. The words can be separated, so do not require adjacency.
  if (/debit[^.]{0,40}vertical/i.test(text)) {
    structures.add("BULL_CALL_DEBIT");
    structures.add("BEAR_PUT_DEBIT");
  }

  const forbidsCredit = /(do not|don't|never|no)\s+(use\s+)?credit\s+(spread|vertical)/i.test(text);
  if (!forbidsCredit && /credit\s+(spread|vertical)/i.test(text)) {
    structures.add("CREDIT_VERTICAL");
  }

  if (structures.size === 0) {
    // A bare "verticals" mandate means the whole defined-risk set.
    structures.add("BULL_CALL_DEBIT");
    structures.add("BEAR_PUT_DEBIT");
    if (!forbidsCredit) structures.add("CREDIT_VERTICAL");
  }

  const order: Structure[] = ["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT", "CREDIT_VERTICAL"];
  return order.filter((s) => structures.has(s));
}

function firstNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1] !== undefined) {
      const value = Number.parseFloat(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

/** Percent-as-written in the mandate -> fraction, to match the profile file. */
function detectOverrides(text: string, base: ProfileLimits): Partial<ProfileLimits> {
  const overrides: Partial<ProfileLimits> = {};

  const perTrade = firstNumber(text, [
    /(\d+(?:\.\d+)?)\s*%\s*per-trade/i,
    /up to\s*(\d+(?:\.\d+)?)\s*%\s*equity loss on one trade/i
  ]);
  const heat = firstNumber(text, [
    /(\d+(?:\.\d+)?)\s*%\s*portfolio heat/i,
    /heat must never exceed\s*(\d+(?:\.\d+)?)\s*%/i
  ]);
  const halt = firstNumber(text, [/(\d+(?:\.\d+)?)\s*%\s*daily halt/i]);
  const minDte = firstNumber(text, [/at least\s*(\d+)\s*DTE/i]);
  const maxDte = firstNumber(text, [/no more than\s*(\d+)\s*DTE/i]);

  // Only record a value that actually DIFFERS from the profile. "Keep the 1%
  // per-trade maximum" restates the Aggressive default and is not an override.
  if (perTrade !== null && perTrade / 100 !== base.perTradeMaxLossPct) {
    overrides.perTradeMaxLossPct = perTrade / 100;
  }
  if (heat !== null && heat / 100 !== base.portfolioHeatMaxLossPct) {
    overrides.portfolioHeatMaxLossPct = heat / 100;
  }
  if (halt !== null && -(halt / 100) !== base.dailyHaltPct) {
    overrides.dailyHaltPct = -(halt / 100);
  }
  if (minDte !== null && minDte !== base.minDte) overrides.minDte = minDte;
  if (maxDte !== null && maxDte !== base.maxDte) overrides.maxDte = maxDte;

  return overrides;
}

// ---------------------------------------------------------------------------
// Contradictions
// ---------------------------------------------------------------------------

function detectContradictions(text: string, limits: ProfileLimits): Contradiction[] {
  const found: Contradiction[] = [];

  // The classic. Guaranteed trading cannot coexist with fail-closed abstention,
  // and missingStateAction is not configurable, so the mandate has to give.
  const forcesTrade =
    /(at least one trade every market day|at least once (a |per )?(day|daily)|trade at least once daily|must trade every)/i.test(
      text
    );
  if (forcesTrade) {
    found.push({
      code: "FORCED_TRADE_CONFLICT",
      fields: ["forcedTradeFrequency", "missingStateAction"],
      explanation:
        "You asked for a guaranteed trade every market day, and also for the agent to abstain " +
        "when state is missing. Covenant cannot promise both: abstention is not configurable, " +
        "so a day with unusable data produces no trade. Drop the frequency guarantee."
    });
  }

  // Deliberately narrow: match a concrete request for an uncovered short, not
  // the phrase "undefined-risk", which appears far more often inside a
  // PROHIBITION ("no undefined-risk structure is permitted") than a request.
  const wantsUndefinedRisk =
    /(uncovered|naked)\s+(\w+\s+){0,2}(call|put)/i.test(text) ||
    /without a protective long leg/i.test(text);
  if (wantsUndefinedRisk) {
    found.push({
      code: "UNDEFINED_RISK_SCOPE",
      fields: ["allowedStructures"],
      explanation:
        "You asked for an uncovered short option. Its maximum loss is unbounded, which COV-02 " +
        "rejects by construction — every structure must have a finite standalone max loss. " +
        "A credit vertical gives you the premium with a capped tail."
    });
  }

  if (limits.minDte > limits.maxDte) {
    found.push({
      code: "RANGE_INVERSION",
      fields: ["minDte", "maxDte"],
      explanation:
        `The days-to-expiry window is inverted: a minimum of ${limits.minDte} and a maximum of ` +
        `${limits.maxDte} leaves no expiry that qualifies, so the agent could never trade.`
    });
  }

  if (limits.perTradeMaxLossPct > limits.portfolioHeatMaxLossPct) {
    found.push({
      code: "RISK_CAP_CONTRADICTION",
      fields: ["perTradeMaxLossPct", "portfolioHeatMaxLossPct"],
      explanation:
        `A single trade may risk ${(limits.perTradeMaxLossPct * 100).toFixed(2)}% of equity but ` +
        `the whole book is capped at ${(limits.portfolioHeatMaxLossPct * 100).toFixed(2)}%. ` +
        `The per-trade limit can never be reached, so one of the two numbers is not what you meant.`
    });
  }

  return found;
}

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

export function compileMandate(mandateText: string): CompileResult {
  const riskProfile = detectProfile(mandateText);
  const base = profileLimits(riskProfile);
  const riskOverrides = detectOverrides(mandateText, base);
  const effective: ProfileLimits = { ...base, ...riskOverrides };

  const allowedUnderlyings = detectUnderlyings(mandateText);
  const allowedStructures = detectStructures(mandateText);
  const contradictions = detectContradictions(mandateText, effective);

  const draft: PolicyDraft = {
    // Fail closed: any unresolved contradiction and the policy cannot activate.
    status: contradictions.length === 0 ? "READY" : "BLOCKED",
    riskProfile,
    allowedUnderlyings,
    allowedStructures,
    riskSettingsRef: riskProfile,
    riskOverrides,
    missingStateAction: "ABSTAIN",
    modelAuthority: "VETO_OR_SHRINK",
    invariants: [...ALL_INVARIANTS]
  };

  return { draft, contradictions, echo: buildEcho(draft, effective) };
}

function buildEcho(draft: PolicyDraft, limits: ProfileLimits): string {
  const structures = draft.allowedStructures
    .map((s) => s.toLowerCase().replace(/_/g, " "))
    .join(", ");
  return (
    `Trade ${structures} on ${draft.allowedUnderlyings.join(" and ")} under the ` +
    `${draft.riskProfile.toLowerCase()} profile. Risk at most ` +
    `${(limits.perTradeMaxLossPct * 100).toFixed(2)}% of equity on one trade and ` +
    `${(limits.portfolioHeatMaxLossPct * 100).toFixed(2)}% across the book. Halt for the day at ` +
    `${(limits.dailyHaltPct * 100).toFixed(2)}%. Hold ${limits.minDte}-${limits.maxDte} days to ` +
    `expiry. Abstain whenever state is missing, stale or inconsistent. The model may veto or ` +
    `shrink a trade, never widen one.`
  );
}

/**
 * Turn a READY draft into an activatable Policy.
 *
 * Refuses a BLOCKED draft outright — activation is not a place for a
 * "force" flag, and adding one would quietly undo the whole compiler.
 */
export function materialisePolicy(
  result: CompileResult,
  meta: { id: string; version: number; createdAt: string }
): Policy {
  if (result.draft.status !== "READY") {
    throw new Error(
      `Cannot activate a ${result.draft.status} policy. Unresolved: ` +
        result.contradictions.map((c) => c.code).join(", ")
    );
  }

  const limits = toPolicyUnits({
    ...profileLimits(result.draft.riskProfile),
    ...result.draft.riskOverrides
  });

  const base: Policy = {
    id: meta.id,
    version: meta.version,
    status: "DRAFT",
    policyHash: "",
    createdAt: meta.createdAt,
    activatedAt: null,
    plainEnglishEcho: result.echo,
    allowedUnderlyings: result.draft.allowedUnderlyings,
    allowedStructures: result.draft.allowedStructures,
    riskProfile: result.draft.riskProfile,
    perTradeMaxLossPct: limits.perTradeMaxLossPct,
    portfolioHeatMaxLossPct: limits.portfolioHeatMaxLossPct,
    dailyHaltPct: limits.dailyHaltPct,
    minDte: limits.minDte,
    maxDte: limits.maxDte,
    minDelta: limits.minDelta,
    maxDelta: limits.maxDelta,
    maxQuoteAgeMs: limits.maxQuoteAgeMs,
    maxBidAskWidthPct: limits.maxBidAskWidthPct,
    minOpenInterest: limits.minOpenInterest,
    minVolume: limits.minVolume,
    duplicateExposureCooldownMinutes: limits.duplicateExposureCooldownMinutes,
    exitAttemptDeadlineMinutes: limits.exitAttemptDeadlineMinutes,
    missingStateAction: "ABSTAIN",
    modelAuthority: "VETO_OR_SHRINK",
    invariants: [...ALL_INVARIANTS]
  };

  return { ...base, policyHash: computePolicyHash(base) };
}

/** Only a passing Break Me run should call this. */
export function activate(policy: Policy, activatedAt: string): Policy {
  const activated: Policy = { ...policy, status: "ACTIVE", activatedAt, policyHash: "" };
  return { ...activated, policyHash: computePolicyHash(activated) };
}
