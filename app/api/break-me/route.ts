import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { NextResponse } from "next/server";

import { mayActivate, runBreakMe, applyAttack, ATTACK_TYPES, ATTACK_LABELS, describeAttack, type Attack } from "@/lib/break-me";
import {
  computeAccountSnapshotHash,
  computeIntentHash,
  computeMarketSnapshotHash,
  computePolicyHash
} from "@/lib/hashes";
import { INVARIANT_REGISTRY } from "@/lib/safety/invariants";
import type { InvariantContext } from "@/lib/safety/types";
import * as money from "@/lib/money";
import type {
  AccountSnapshot,
  MarketSnapshot,
  Policy,
  RunManifest,
  SessionStatus,
  TradeIntent
} from "@/types/domain";

export const dynamic = "force-dynamic";

interface Overrides {
  quantity?: number;
  standaloneMaxLoss?: string;
  dte?: number;
  equity?: string;
  perTradeMaxLossPct?: number;
  portfolioHeatMaxLossPct?: number;
  dayPnlPct?: number;
  sessionHalted?: boolean;
  runs?: number;
  seed?: number;
  /** Run one specific attack against the scenario instead of fuzzing. */
  attack?: Attack;
  attackMagnitude?: number;
}

interface World {
  policy: Policy;
  intent: TradeIntent;
  account: AccountSnapshot;
  market: MarketSnapshot;
  session: SessionStatus;
  now: Date;
}

/**
 * The base world comes from the committed run manifest, so a scenario the
 * user builds here starts from a decision that actually happened rather than
 * from a fixture invented for the demo.
 */
function baseWorld(): World | null {
  try {
    const path = resolve(process.cwd(), "demo/run_manifest.json");
    const manifest = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
    const signed = manifest.events.find((event) => event.eventType === "PERMIT_SIGNED");
    if (signed === undefined) return null;

    const payload = signed.payload as {
      policy: Policy;
      intent: TradeIntent;
      account: AccountSnapshot;
      market: MarketSnapshot;
      session: SessionStatus;
      now: string;
    };
    return { ...payload, now: new Date(payload.now) };
  } catch {
    return null;
  }
}

/**
 * Apply the operator's changes and re-derive every hash.
 *
 * This matters more than it looks: COV-08 checks that the intent references
 * the snapshots it was built on and that each snapshot matches its own hash.
 * Editing a field without rehashing would make every scenario abstain on
 * COV-08 and tell the user nothing about the rule they were actually probing.
 */
function applyOverrides(base: World, overrides: Overrides): World {
  const policyBody: Policy = {
    ...base.policy,
    perTradeMaxLossPct: overrides.perTradeMaxLossPct ?? base.policy.perTradeMaxLossPct,
    portfolioHeatMaxLossPct:
      overrides.portfolioHeatMaxLossPct ?? base.policy.portfolioHeatMaxLossPct,
    policyHash: ""
  };
  const policy: Policy = { ...policyBody, policyHash: computePolicyHash(policyBody) };

  const accountBody: AccountSnapshot = {
    ...base.account,
    equity: overrides.equity ?? base.account.equity,
    dayPnlPct: overrides.dayPnlPct ?? base.account.dayPnlPct,
    snapshotHash: ""
  };
  const account: AccountSnapshot = {
    ...accountBody,
    snapshotHash: computeAccountSnapshotHash(accountBody)
  };

  const marketBody: MarketSnapshot = { ...base.market, snapshotHash: "" };
  const market: MarketSnapshot = {
    ...marketBody,
    snapshotHash: computeMarketSnapshotHash(marketBody)
  };

  const baseQty = base.intent.quantity;
  const newQty = overrides.quantity ?? baseQty;
  const perContractLoss =
    baseQty > 0
      ? money.format(money.parse(base.intent.standaloneMaxLoss) / BigInt(baseQty))
      : base.intent.standaloneMaxLoss;
  const scaledMaxLoss =
    overrides.standaloneMaxLoss ??
    money.format(money.parse(perContractLoss) * BigInt(Math.max(1, newQty)));

  const intentBody: TradeIntent = {
    ...base.intent,
    quantity: newQty,
    standaloneMaxLoss: scaledMaxLoss,
    dte: overrides.dte ?? base.intent.dte,
    policyId: policy.id,
    policyHash: policy.policyHash,
    accountSnapshotHash: account.snapshotHash,
    marketSnapshotHash: market.snapshotHash,
    intentHash: ""
  };
  const intent: TradeIntent = { ...intentBody, intentHash: computeIntentHash(intentBody) };

  const session: SessionStatus =
    overrides.sessionHalted === true
      ? { ...base.session, state: "HALTED", haltReason: "Halted in this scenario." }
      : { ...base.session, state: "ACTIVE", haltReason: null };

  return { policy, intent, account, market, session, now: base.now };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? Math.floor(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function evaluateContext(context: InvariantContext) {
  const verdicts = INVARIANT_REGISTRY.map((evaluator) => {
    const verdict = evaluator.evaluate(context);
    return {
      id: evaluator.id,
      title: evaluator.title,
      enforcedAt: evaluator.enforcedAt,
      ok: verdict.ok,
      action: verdict.ok ? "PASS" : verdict.action,
      reason: verdict.ok ? "Satisfied." : verdict.reason,
      shrinkTo: verdict.ok ? undefined : verdict.shrinkTo
    };
  });

  const blocking = verdicts.filter((v) => !v.ok);
  const outcome =
    blocking.length === 0
      ? "APPROVE"
      : blocking.some((v) => v.action === "ABSTAIN")
        ? "ABSTAIN"
        : blocking.some((v) => v.action === "VETO")
          ? "VETO"
          : "SHRINK";

  return { verdicts, outcome, blocking };
}

export async function GET() {
  return NextResponse.json({
    attacks: ATTACK_TYPES.map((id) => ({ id, label: ATTACK_LABELS[id] }))
  });
}

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.includes("application/json") !== true) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }

  let overrides: Overrides = {};
  try {
    const raw: unknown = await request.json();
    if (typeof raw === "object" && raw !== null) overrides = raw as Overrides;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  }

  const base = baseWorld();
  if (base === null) {
    return NextResponse.json(
      { error: "No run manifest available to source a world from." },
      { status: 503 }
    );
  }

  const world = applyOverrides(base, overrides);

  // Optional: apply one named attack so the operator can probe a specific failure mode.
  const attackId =
    typeof overrides.attack === "string" && ATTACK_TYPES.includes(overrides.attack as Attack)
      ? (overrides.attack as Attack)
      : undefined;
  const attackMagnitude =
    typeof overrides.attackMagnitude === "number" && Number.isFinite(overrides.attackMagnitude)
      ? Math.min(1, Math.max(0, overrides.attackMagnitude))
      : 0.5;

  const context: InvariantContext =
    attackId !== undefined
      ? applyAttack(world, attackId, attackMagnitude)
      : {
          policy: world.policy,
          intent: world.intent,
          account: world.account,
          market: world.market,
          session: world.session,
          now: world.now
        };

  const { verdicts, outcome } = evaluateContext(context);

  // 2. The fuzz run: hundreds of hostile variants of this same world.
  const runs = clampInt(overrides.runs, 25, 500, 200);
  const seed = clampInt(overrides.seed, 1, 2 ** 31 - 1, 20260830);
  const report = runBreakMe(() => world, world.policy.policyHash, { runs, seed });
  const gate = mayActivate(report);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    attack:
      attackId !== undefined
        ? { id: attackId, label: ATTACK_LABELS[attackId], description: describeAttack(attackId, attackMagnitude) }
        : null,
    scenario: {
      outcome,
      quantity: context.intent.quantity,
      standaloneMaxLoss: context.intent.standaloneMaxLoss,
      dte: context.intent.dte,
      equity: context.account.equity,
      perTradeMaxLossPct: context.policy.perTradeMaxLossPct,
      portfolioHeatMaxLossPct: context.policy.portfolioHeatMaxLossPct,
      sessionState: context.session.state,
      intentHash: context.intent.intentHash,
      policyHash: context.policy.policyHash
    },
    verdicts,
    report,
    activation: gate
  });
}
