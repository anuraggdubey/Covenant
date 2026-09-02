import { NextResponse } from "next/server";

import { dollarCapsFromPolicyUnits, calibratedEquityUsd, studioLimitsToOverrides } from "@/lib/alpha/mandate-caps";
import { mandateTextFromBody, readJsonObject, studioLimitsFromBody } from "@/lib/alpha/mandate-http";
import {
  activateMandateFromText,
  getOperatorActivePolicy
} from "@/lib/alpha/runtime-policy";
import { defaultActivePolicy } from "@/lib/alpha/loop";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import type { Policy } from "@/types/domain";

export const dynamic = "force-dynamic";

async function resolveEquity(): Promise<{ equity: number; source: "CALIBRATED" | "ACCOUNT" }> {
  try {
    const account = await new AlpacaReadClient().getAccount();
    const equity = Number.parseFloat(account.equity);
    if (Number.isFinite(equity) && equity > 0) {
      return { equity, source: "ACCOUNT" };
    }
  } catch {
    // Caps still render against the calibrated $100k paper account.
  }
  return { equity: calibratedEquityUsd(), source: "CALIBRATED" };
}

function policyCaps(policy: Policy, equity: number, source: "CALIBRATED" | "ACCOUNT") {
  return dollarCapsFromPolicyUnits(
    {
      perTradeMaxLossPct: policy.perTradeMaxLossPct,
      portfolioHeatMaxLossPct: policy.portfolioHeatMaxLossPct,
      dailyHaltPct: policy.dailyHaltPct,
      minDte: policy.minDte,
      maxDte: policy.maxDte,
      minDelta: policy.minDelta,
      maxDelta: policy.maxDelta,
      maxQuoteAgeMs: policy.maxQuoteAgeMs,
      maxBidAskWidthPct: policy.maxBidAskWidthPct,
      minOpenInterest: policy.minOpenInterest,
      minVolume: policy.minVolume,
      duplicateExposureCooldownMinutes: policy.duplicateExposureCooldownMinutes,
      exitAttemptDeadlineMinutes: policy.exitAttemptDeadlineMinutes
    },
    equity,
    source
  );
}

function publicPolicy(policy: Policy) {
  return {
    id: policy.id,
    version: policy.version,
    status: policy.status,
    policyHash: policy.policyHash,
    activatedAt: policy.activatedAt,
    plainEnglishEcho: policy.plainEnglishEcho,
    riskProfile: policy.riskProfile,
    allowedUnderlyings: policy.allowedUnderlyings,
    allowedStructures: policy.allowedStructures,
    perTradeMaxLossPct: policy.perTradeMaxLossPct,
    portfolioHeatMaxLossPct: policy.portfolioHeatMaxLossPct,
    dailyHaltPct: policy.dailyHaltPct,
    minDte: policy.minDte,
    maxDte: policy.maxDte,
    missingStateAction: policy.missingStateAction,
    modelAuthority: policy.modelAuthority
  };
}

export async function GET() {
  const { equity, source } = await resolveEquity();
  const operator = getOperatorActivePolicy();
  const policy = operator ?? defaultActivePolicy;
  return NextResponse.json({
    source: operator ? "OPERATOR" : "DEFAULT",
    policy: publicPolicy(policy),
    caps: policyCaps(policy, equity, source)
  });
}

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const mandateText = mandateTextFromBody(parsed.value);
  if (mandateText === null) {
    return NextResponse.json(
      { error: "mandateText is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  try {
    const { equity, source } = await resolveEquity();
    const studio = studioLimitsFromBody(parsed.value);
    const options = studio ? studioLimitsToOverrides(studio, equity) : {};
    const now = new Date().toISOString();
    const policy = activateMandateFromText(mandateText, now, undefined, options);
    return NextResponse.json({
      source: "OPERATOR",
      policy: publicPolicy(policy),
      caps: policyCaps(policy, equity, source)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to activate mandate";
    const blocked = /BLOCKED|Cannot activate/i.test(message);
    return NextResponse.json({ error: message }, { status: blocked ? 409 : 400 });
  }
}
