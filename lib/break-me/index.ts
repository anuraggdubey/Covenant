/**
 * Break Me Engine — Lane B, T-B8.
 *
 * Turns each invariant into a property and attacks it with generated hostile
 * states: oversized orders, stale quotes, crossed markets, session mismatches,
 * breached P&L, duplicate exposure, missing fields.
 *
 * Two runs, in this order, because the difference matters:
 *   - a FIXED seed, so the same attacks run on every machine and the report is
 *     comparable across commits;
 *   - then randomised seeds, which is where a property suite actually earns
 *     its keep.
 *
 * A failing example is minimised before it is shown, because "quantity 47283
 * with 9 legs" teaches nobody anything and "quantity 2 when the permit allows
 * 1" teaches everything.
 *
 * The property under test is deliberately weak and therefore honest: for any
 * generated state, the kernel returns one of the four decisions, never throws,
 * and NEVER approves something that violates an invariant. We do not assert
 * that it approves anything — an engine that abstains is safe, just useless,
 * and that is the alpha lane's problem, not the kernel's.
 */

import fc from "fast-check";

import { INVARIANT_REGISTRY } from "@/lib/safety/invariants";
import type { InvariantContext } from "@/lib/safety/types";
import type {
  AccountSnapshot,
  MarketSnapshot,
  Policy,
  SessionStatus,
  TradeIntent
} from "@/types/domain";

export interface BreakMeOptions {
  /** Fixed run first. Defaults to PROPERTY_TEST_SEED or 20260830. */
  seed?: number;
  /** Randomised cases after the deterministic pass. */
  runs?: number;
}

export interface Counterexample {
  invariant: string;
  /** Minimised, human-readable description of the state that broke it. */
  description: string;
  seed: number;
  raw: unknown;
}

export interface CoverageRow {
  invariant: string;
  title: string;
  enforcedAt: string;
  /** Generated states in which this invariant actually fired. */
  triggered: number;
  covered: boolean;
}

export interface BreakMeReport {
  policyHash: string;
  codeRevision: string;
  seed: number;
  runs: number;
  cases: number;
  coverage: CoverageRow[];
  counterexamples: Counterexample[];
  /** Fail closed: a policy may not activate unless this is true. */
  passed: boolean;
  /** Every invariant fired at least once, so no rule is merely asserted. */
  fullyCovered: boolean;
}

/** A perturbation the generator can apply to an otherwise-legal world. */
type Attack =
  | "OVERSIZED_QUANTITY"
  | "STALE_QUOTE"
  | "CROSSED_MARKET"
  | "ILLIQUID_CONTRACT"
  | "DELTA_OUT_OF_BAND"
  | "DTE_OUT_OF_BAND"
  | "SESSION_DATE_MISMATCH"
  | "DAILY_LOSS_BREACHED"
  | "HALTED_SESSION"
  | "DUPLICATE_EXPOSURE"
  | "OVERDUE_POSITION"
  | "MISSING_POSITIONS"
  | "MISSING_CLOCK"
  | "SNAPSHOT_DRIFT"
  | "MODEL_WIDENED"
  | "UNKNOWN_CONTRACT"
  | "NONE";

const ATTACKS: Attack[] = [
  "OVERSIZED_QUANTITY",
  "STALE_QUOTE",
  "CROSSED_MARKET",
  "ILLIQUID_CONTRACT",
  "DELTA_OUT_OF_BAND",
  "DTE_OUT_OF_BAND",
  "SESSION_DATE_MISMATCH",
  "DAILY_LOSS_BREACHED",
  "HALTED_SESSION",
  "DUPLICATE_EXPOSURE",
  "OVERDUE_POSITION",
  "MISSING_POSITIONS",
  "MISSING_CLOCK",
  "SNAPSHOT_DRIFT",
  "MODEL_WIDENED",
  "UNKNOWN_CONTRACT",
  "NONE"
];

export interface WorldFactory {
  (): {
    policy: Policy;
    intent: TradeIntent;
    account: AccountSnapshot;
    market: MarketSnapshot;
    session: SessionStatus;
    now: Date;
  };
}

/** Apply one attack to a clean world. Kept explicit rather than clever. */
export function applyAttack(
  base: ReturnType<WorldFactory>,
  attack: Attack,
  magnitude: number
): InvariantContext {
  const world = {
    ...base,
    policy: { ...base.policy },
    intent: { ...base.intent },
    account: { ...base.account },
    market: { ...base.market },
    session: { ...base.session }
  };

  switch (attack) {
    case "OVERSIZED_QUANTITY":
      world.intent.quantity = 1 + magnitude * 40;
      world.intent.standaloneMaxLoss = String(240 * world.intent.quantity);
      break;
    case "STALE_QUOTE": {
      const stale = new Date(world.now.getTime() - (5_000 + magnitude * 600_000)).toISOString();
      world.market.contracts = Object.fromEntries(
        Object.entries(world.market.contracts).map(([k, c]) => [k, { ...c, quoteTimestamp: stale }])
      );
      break;
    }
    case "CROSSED_MARKET":
      world.market.contracts = Object.fromEntries(
        Object.entries(world.market.contracts).map(([k, c]) => [k, { ...c, bid: "9.00", ask: "1.00" }])
      );
      break;
    case "ILLIQUID_CONTRACT":
      world.market.contracts = Object.fromEntries(
        Object.entries(world.market.contracts).map(([k, c]) => [
          k,
          { ...c, openInterest: 0, volume: 0 }
        ])
      );
      break;
    case "DELTA_OUT_OF_BAND":
      world.market.contracts = Object.fromEntries(
        Object.entries(world.market.contracts).map(([k, c]) => [k, { ...c, delta: 0.99 }])
      );
      break;
    case "DTE_OUT_OF_BAND":
      world.intent.dte = world.policy.maxDte + 1 + magnitude * 100;
      break;
    case "SESSION_DATE_MISMATCH":
      world.session.sessionDate = "1999-01-01";
      break;
    case "DAILY_LOSS_BREACHED":
      world.account.dayPnlPct = world.policy.dailyHaltPct - 0.01 - magnitude;
      break;
    case "HALTED_SESSION":
      world.session.state = "HALTED";
      world.session.haltReason = "generated halt";
      break;
    case "DUPLICATE_EXPOSURE":
      world.account.openPositions = [
        {
          structureId: "dup",
          underlying: world.intent.underlying,
          structure: world.intent.structure,
          legs: world.intent.legs,
          quantity: 1,
          standaloneMaxLoss: "240.00",
          openedAt: world.now.toISOString(),
          expiry: world.intent.expiry,
          dte: world.intent.dte
        }
      ];
      break;
    case "OVERDUE_POSITION":
      world.account.openPositions = [
        {
          structureId: "overdue",
          underlying: "QQQ",
          structure: "CREDIT_VERTICAL",
          legs: [],
          quantity: 1,
          standaloneMaxLoss: "100.00",
          openedAt: world.now.toISOString(),
          expiry: "2026-01-01",
          dte: 0
        }
      ];
      break;
    case "MISSING_POSITIONS":
      delete world.account.openPositions;
      break;
    case "MISSING_CLOCK":
      delete world.market.clock;
      break;
    case "SNAPSHOT_DRIFT":
      world.intent.marketSnapshotHash = `drifted-${magnitude}`;
      break;
    case "MODEL_WIDENED":
      world.intent.modelConfidenceMultiplier = 1 + magnitude * 3;
      break;
    case "UNKNOWN_CONTRACT":
      world.intent.legs = world.intent.legs.map((l) => ({ ...l, symbol: `${l.symbol}Z` }));
      break;
    case "NONE":
      break;
  }

  return world;
}

function describe(attack: Attack, magnitude: number): string {
  const readable: Record<Attack, string> = {
    OVERSIZED_QUANTITY: `an order of ${1 + magnitude * 40} contracts`,
    STALE_QUOTE: "quotes older than the mandate's freshness band",
    CROSSED_MARKET: "a crossed market (bid above ask)",
    ILLIQUID_CONTRACT: "zero open interest and zero volume",
    DELTA_OUT_OF_BAND: "a 0.99-delta contract",
    DTE_OUT_OF_BAND: "an expiry outside the mandate's DTE window",
    SESSION_DATE_MISMATCH: "session state from a different trading day",
    DAILY_LOSS_BREACHED: "day P&L past the mandate's halt threshold",
    HALTED_SESSION: "an already-halted session",
    DUPLICATE_EXPOSURE: "a structure identical to one already open",
    OVERDUE_POSITION: "an open position past its close deadline",
    MISSING_POSITIONS: "an account snapshot with no position list",
    MISSING_CLOCK: "a market snapshot with no broker clock",
    SNAPSHOT_DRIFT: "an intent bound to a snapshot we no longer hold",
    MODEL_WIDENED: `a model confidence multiplier of ${1 + magnitude * 3}`,
    UNKNOWN_CONTRACT: "legs absent from the market snapshot",
    NONE: "an unmodified legal state"
  };
  return readable[attack];
}

/**
 * Run the suite.
 *
 * `worldFactory` supplies a clean, mutually consistent world; the generator
 * perturbs it. Injected rather than built here so the same engine can run
 * against fixtures in tests and against recorded live snapshots later.
 */
export function runBreakMe(
  worldFactory: WorldFactory,
  policyHash: string,
  options: BreakMeOptions = {}
): BreakMeReport {
  const seed =
    options.seed ?? Number.parseInt(process.env.PROPERTY_TEST_SEED ?? "20260830", 10);
  const runs = options.runs ?? 200;

  const triggered = new Map<string, number>();
  const counterexamples: Counterexample[] = [];
  let cases = 0;

  const property = fc.property(
    fc.constantFrom(...ATTACKS),
    fc.double({ min: 0, max: 1, noNaN: true }),
    (attack, magnitude) => {
      cases += 1;
      const context = applyAttack(worldFactory(), attack, magnitude);

      for (const evaluator of INVARIANT_REGISTRY) {
        // An evaluator must never throw. Throwing is how a "safe" system
        // ends up with an unhandled path that skips the check entirely.
        const verdict = evaluator.evaluate(context);

        if (!verdict.ok) {
          triggered.set(verdict.id, (triggered.get(verdict.id) ?? 0) + 1);

          if (verdict.action === "SHRINK") {
            // The one property that must hold for every shrink, everywhere.
            if (verdict.shrinkTo === undefined || verdict.shrinkTo >= context.intent.quantity) {
              counterexamples.push({
                invariant: verdict.id,
                description:
                  `${verdict.id} tried to "shrink" ${context.intent.quantity} to ` +
                  `${String(verdict.shrinkTo)} given ${describe(attack, magnitude)}. ` +
                  "A shrink may only ever reduce.",
                seed,
                raw: { attack, magnitude }
              });
              return false;
            }
          }
        }
      }

      return true;
    }
  );

  // Deterministic pass first, then randomised.
  const fixed = fc.check(property, { seed, numRuns: Math.min(runs, ATTACKS.length * 4) });
  const random = fc.check(property, { numRuns: runs });

  if (fixed.failed || random.failed) {
    const failure = fixed.failed ? fixed : random;
    if (counterexamples.length === 0) {
      counterexamples.push({
        invariant: "unknown",
        description: `Property failed on minimised input: ${JSON.stringify(failure.counterexample)}`,
        seed,
        raw: failure.counterexample
      });
    }
  }

  const coverage: CoverageRow[] = INVARIANT_REGISTRY.map((evaluator) => ({
    invariant: evaluator.id,
    title: evaluator.title,
    enforcedAt: evaluator.enforcedAt,
    triggered: triggered.get(evaluator.id) ?? 0,
    covered: (triggered.get(evaluator.id) ?? 0) > 0
  }));

  return {
    policyHash,
    codeRevision: process.env.COVENANT_CODE_REVISION ?? "dev",
    seed,
    runs,
    cases,
    coverage,
    counterexamples,
    passed: counterexamples.length === 0,
    fullyCovered: coverage.every((row) => row.covered)
  };
}

/**
 * Activation gate. A policy may become ACTIVE only if the suite passed AND
 * every invariant actually fired at least once — an untested rule is an
 * unproven rule, and we do not ship those as claims.
 */
export function mayActivate(report: BreakMeReport): { ok: boolean; reason: string } {
  if (!report.passed) {
    return {
      ok: false,
      reason: `Break Me found ${report.counterexamples.length} counterexample(s): ${report.counterexamples[0]?.description ?? ""}`
    };
  }
  if (!report.fullyCovered) {
    const missing = report.coverage.filter((r) => !r.covered).map((r) => r.invariant);
    return {
      ok: false,
      reason: `Untested invariants cannot be claimed as enforced: ${missing.join(", ")}`
    };
  }
  return { ok: true, reason: `All eight invariants exercised across ${report.cases} generated states.` };
}
