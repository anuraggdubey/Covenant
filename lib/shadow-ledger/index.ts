/**
 * Shadow Ledger — Lane B, T-B10.
 *
 * Every candidate the kernel saw gets a mark, whatever the kernel decided:
 * approved, shrunk, vetoed, abstained. Marks are taken on the SAME schedule
 * for all of them, so the comparison is like-for-like.
 *
 * Two rules that make the number honest, and both are enforced here rather
 * than left to discipline:
 *
 *   1. No backfill. A mark whose timestamp precedes the decision is refused.
 *      You cannot decide today what yesterday's veto "would have" made.
 *   2. No selection. Marking is all-or-nothing per cycle: you cannot drop the
 *      vetoes that turned out well and keep the ones that turned out badly.
 *
 * The output is a counterfactual estimate, not causal proof, and the report
 * says so. That caveat is the difference between a measurement and a boast.
 */

import * as money from "@/lib/money";
import type { Decision, TradeIntent } from "@/types/domain";

export interface ShadowMark {
  candidateId: string;
  decision: Decision;
  /** Invariants that fired, for rule-level attribution. */
  failedInvariants: string[];
  /** Size the agent actually took. Zero for VETO and ABSTAIN. */
  governedQuantity: number;
  /** Size an ungoverned agent would have taken — always the full request. */
  shadowQuantity: number;
  /** Per-contract P&L at the mark, decimal string. Negative for a loss. */
  markPerContract: string;
  decidedAt: string;
  markedAt: string;
}

export interface RuleAttribution {
  invariant: string;
  /** Times this rule blocked or shrank a candidate. */
  interventions: number;
  /** Positive: the rule avoided a loss. Negative: it cost upside. */
  netEffect: string;
  lossAvoided: string;
  upsideForgone: string;
}

export interface ShadowReport {
  candidates: number;
  governedPnl: string;
  shadowPnl: string;
  /** governed - shadow. Positive means governance helped. */
  safetyDelta: string;
  lossAvoided: string;
  missedUpside: string;
  attribution: RuleAttribution[];
  caveat: string;
}

const CAVEAT =
  "Shadow results are a counterfactual estimate on synchronised marks, not causal proof. " +
  "They assume the shadow book could have filled at the same prices, which is generous to " +
  "the shadow side.";

export class BackfillRefused extends Error {}

export function createMark(input: {
  candidateId: string;
  intent: TradeIntent;
  decision: Decision;
  failedInvariants: string[];
  governedQuantity: number;
  markPerContract: string;
  decidedAt: string;
  markedAt: string;
}): ShadowMark {
  const decided = Date.parse(input.decidedAt);
  const marked = Date.parse(input.markedAt);
  if (!Number.isFinite(decided) || !Number.isFinite(marked)) {
    throw new BackfillRefused("Shadow mark has an unreadable timestamp.");
  }
  if (marked < decided) {
    throw new BackfillRefused(
      `Shadow mark at ${input.markedAt} predates the decision at ${input.decidedAt}. ` +
        "Marks are never backfilled."
    );
  }
  if (input.governedQuantity > input.intent.quantity) {
    throw new Error("Governed quantity exceeds the requested quantity; a shrink cannot widen.");
  }

  return {
    candidateId: input.candidateId,
    decision: input.decision,
    failedInvariants: [...input.failedInvariants],
    governedQuantity: input.governedQuantity,
    // The ungoverned counterfactual always takes the full requested size.
    shadowQuantity: input.intent.quantity,
    markPerContract: input.markPerContract,
    decidedAt: input.decidedAt,
    markedAt: input.markedAt
  };
}

function pnl(quantity: number, markPerContract: string): bigint {
  return money.mulInt(money.parse(markPerContract), quantity);
}

export function buildReport(marks: readonly ShadowMark[]): ShadowReport {
  let governed = 0n;
  let shadow = 0n;
  let lossAvoided = 0n;
  let missedUpside = 0n;

  const byRule = new Map<string, { interventions: number; avoided: bigint; forgone: bigint }>();

  for (const mark of marks) {
    const governedPnl = pnl(mark.governedQuantity, mark.markPerContract);
    const shadowPnl = pnl(mark.shadowQuantity, mark.markPerContract);

    governed += governedPnl;
    shadow += shadowPnl;

    // The part of the shadow position governance prevented.
    const blocked = shadowPnl - governedPnl;
    if (blocked < 0n) lossAvoided += -blocked;
    else missedUpside += blocked;

    // Attribute to every rule that fired. A candidate stopped by two rules
    // credits both — we are not pretending to know which one "really" did it.
    if (mark.failedInvariants.length > 0 && blocked !== 0n) {
      const share = blocked / BigInt(mark.failedInvariants.length);
      for (const invariant of mark.failedInvariants) {
        const entry = byRule.get(invariant) ?? { interventions: 0, avoided: 0n, forgone: 0n };
        entry.interventions += 1;
        if (share < 0n) entry.avoided += -share;
        else entry.forgone += share;
        byRule.set(invariant, entry);
      }
    }
  }

  const attribution: RuleAttribution[] = [...byRule.entries()]
    .map(([invariant, entry]) => ({
      invariant,
      interventions: entry.interventions,
      netEffect: money.format(entry.avoided - entry.forgone),
      lossAvoided: money.format(entry.avoided),
      upsideForgone: money.format(entry.forgone)
    }))
    .sort((a, b) => a.invariant.localeCompare(b.invariant));

  return {
    candidates: marks.length,
    governedPnl: money.format(governed),
    shadowPnl: money.format(shadow),
    safetyDelta: money.format(governed - shadow),
    lossAvoided: money.format(lossAvoided),
    missedUpside: money.format(missedUpside),
    attribution,
    caveat: CAVEAT
  };
}
