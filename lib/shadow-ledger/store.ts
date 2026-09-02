/**
 * Shadow ledger store — turns live kernel decisions into marked counterfactuals.
 *
 * The ledger answers one question: what did governance cost, and what did it
 * save? To answer it honestly you need the SAME mark applied to the size the
 * agent actually took and the size an ungoverned agent would have taken.
 *
 * We do not have fills, so the mark is derived from the live chain: the net
 * value of the exact legs now, against the limit price the intent asked for.
 * That is a real number from real quotes, and it is generous to the shadow
 * side — it assumes the ungoverned agent could have filled at our limit.
 * `buildReport` carries that caveat into the output rather than burying it.
 *
 * In-memory, like the rest of the demo surface. It resets on restart, which
 * the page says out loud instead of pretending to be a database.
 */

import * as money from "@/lib/money";
import { buildReport, createMark, type ShadowMark, type ShadowReport } from "@/lib/shadow-ledger";
import type { Decision, MarketSnapshot, TradeIntent, Underlying } from "@/types/domain";

interface PendingDecision {
  candidateId: string;
  intent: TradeIntent;
  decision: Decision;
  failedInvariants: string[];
  governedQuantity: number;
  decidedAt: string;
  underlying: Underlying;
  /** Net price the intent asked for. Negative for a credit structure. */
  entryNet: string;
  /** Latest mark, recomputed whenever a fresh chain arrives. */
  markPerContract: string;
  markedAt: string;
}

const decisions: PendingDecision[] = [];
const MAX_DECISIONS = 200;

/** Net value of the exact legs at the current mid, per contract. */
export function netMidValue(intent: TradeIntent, market: MarketSnapshot): string | null {
  let total = 0n;
  for (const leg of intent.legs) {
    const contract = market.contracts[leg.symbol];
    if (contract === undefined) return null;
    let bid: bigint;
    let ask: bigint;
    try {
      bid = money.parse(contract.bid);
      ask = money.parse(contract.ask);
    } catch {
      return null;
    }
    if (ask <= 0n) return null;
    const mid = (bid + ask) / 2n;
    const signed = leg.side === "buy" ? mid : -mid;
    total += money.mulInt(signed, leg.ratioQty);
  }
  return money.format(total);
}

/**
 * P&L per contract if the position were opened at `entryNet` and valued at
 * `currentNet` now. Works for debit and credit alike: you paid entryNet
 * (negative means you received it), so the change in value is the P&L.
 */
export function markFromNet(entryNet: string, currentNet: string): string {
  const delta = money.parse(currentNet) - money.parse(entryNet);
  return money.format(money.mulInt(delta, 100));
}

export function recordDecision(input: {
  intent: TradeIntent;
  decision: Decision;
  failedInvariants: string[];
  governedQuantity: number;
  decidedAt: string;
  market?: MarketSnapshot;
}): void {
  const candidateId = input.intent.intentHash.slice(0, 16);
  if (decisions.some((d) => d.candidateId === candidateId)) return;

  decisions.push({
    candidateId,
    intent: input.intent,
    decision: input.decision,
    failedInvariants: input.failedInvariants,
    governedQuantity: input.governedQuantity,
    decidedAt: input.decidedAt,
    underlying: input.intent.underlying,
    entryNet: input.intent.limitPrice,
    // No time has passed at the moment of the decision, so the mark is flat.
    markPerContract: "0.00",
    markedAt: input.decidedAt
  });

  if (decisions.length > MAX_DECISIONS) decisions.splice(0, decisions.length - MAX_DECISIONS);
}

/**
 * Re-mark every decision whose legs appear in a fresh chain.
 *
 * Decisions we cannot price are left at their previous mark rather than
 * dropped — silently removing them would be exactly the selection bias the
 * ledger exists to avoid.
 */
export function remark(markets: readonly MarketSnapshot[], now: string): number {
  let updated = 0;
  for (const decision of decisions) {
    const market = markets.find((m) => m.underlying === decision.underlying);
    if (market === undefined) continue;
    const currentNet = netMidValue(decision.intent, market);
    if (currentNet === null) continue;

    decision.markPerContract = markFromNet(decision.entryNet, currentNet);
    decision.markedAt = now;
    updated += 1;
  }
  return updated;
}

function toMarks(): ShadowMark[] {
  const marks: ShadowMark[] = [];
  for (const decision of decisions) {
    try {
      marks.push(
        createMark({
          candidateId: decision.candidateId,
          intent: decision.intent,
          decision: decision.decision,
          failedInvariants: decision.failedInvariants,
          governedQuantity: decision.governedQuantity,
          markPerContract: decision.markPerContract,
          decidedAt: decision.decidedAt,
          markedAt: decision.markedAt
        })
      );
    } catch {
      // createMark refuses backfilled or widened marks. Skipping one is
      // correct; it never silently becomes a favourable number.
    }
  }
  return marks;
}

export interface ShadowRow {
  candidateId: string;
  underlying: Underlying;
  structure: string;
  decision: Decision;
  failedInvariants: string[];
  requestedQuantity: number;
  governedQuantity: number;
  markPerContract: string;
  governedPnl: string;
  shadowPnl: string;
  delta: string;
  decidedAt: string;
  markedAt: string;
}

export function rows(): ShadowRow[] {
  return decisions.map((d) => {
    const mark = money.parse(d.markPerContract);
    const governed = money.mulInt(mark, d.governedQuantity);
    const shadow = money.mulInt(mark, d.intent.quantity);
    return {
      candidateId: d.candidateId,
      underlying: d.underlying,
      structure: d.intent.structure,
      decision: d.decision,
      failedInvariants: d.failedInvariants,
      requestedQuantity: d.intent.quantity,
      governedQuantity: d.governedQuantity,
      markPerContract: d.markPerContract,
      governedPnl: money.format(governed),
      shadowPnl: money.format(shadow),
      delta: money.format(governed - shadow),
      decidedAt: d.decidedAt,
      markedAt: d.markedAt
    };
  });
}

export function report(): ShadowReport {
  return buildReport(toMarks());
}

export function count(): number {
  return decisions.length;
}

/** Tests only. */
export function resetShadowStore(): void {
  decisions.length = 0;
}
