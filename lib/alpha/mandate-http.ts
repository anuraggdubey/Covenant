import type { RiskProfile } from "@/types/domain";
import type { StudioLimitInput } from "@/lib/alpha/mandate-caps";

const MAX_BODY_BYTES = 16_384;

export async function readJsonObject(
  request: Request
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, error: "content-type must be application/json." };
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "Request body exceeds 16 KiB." };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: "JSON body must be an object." };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: "JSON body is invalid." };
  }
}

export function mandateTextFromBody(body: Record<string, unknown>): string | null {
  const mandateText = body.mandateText;
  if (typeof mandateText !== "string" || mandateText.trim().length === 0) return null;
  return mandateText.trim();
}

const PROFILES = new Set(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"]);

function optionalNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

export function studioLimitsFromBody(body: Record<string, unknown>): StudioLimitInput | undefined {
  const raw = body.limits;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const limits = raw as Record<string, unknown>;
  const riskProfile = limits.riskProfile;
  const input: StudioLimitInput = {
    perTradeMaxLossUsd: optionalNumber(limits.perTradeMaxLossUsd),
    portfolioHeatMaxLossUsd: optionalNumber(limits.portfolioHeatMaxLossUsd),
    dailyHaltUsd: optionalNumber(limits.dailyHaltUsd),
    minDte: optionalNumber(limits.minDte),
    maxDte: optionalNumber(limits.maxDte)
  };
  if (typeof riskProfile === "string" && PROFILES.has(riskProfile)) {
    input.riskProfile = riskProfile as RiskProfile;
  }
  return input;
}
