/**
 * AI Model Provider Client — OpenRouter integration.
 *
 * Powerless by construction:
 * The AI model only drafts natural-language mandates or explains candidate
 * spreads in plain English. It has zero broker credentials, zero signing keys,
 * and cannot activate policies, sign permits, or execute trades.
 */

import { getServerEnv } from "@/lib/env/server";

export interface CandidateContext {
  underlying: string;
  underlyingPrice: string;
  structure: string;
  expiry: string;
  dte: number;
  limitPrice: string;
  maxLoss: string;
  maxGain: string;
  riskRewardRatio: string;
  alphaScore: number;
  trend?: string;
  realizedVol?: number;
}

export async function callOpenRouter(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 300
): Promise<string> {
  const env = getServerEnv();
  const apiKey = env.MODEL_API_KEY;
  const modelName = env.MODEL_NAME || "nvidia/nemotron-3.5-lightning:free";

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("MODEL_API_KEY is not configured in environment.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.MODEL_TIMEOUT_MS || 25000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://covenant.local",
        "X-Title": "Covenant Options Trading Agent",
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("OpenRouter returned an empty response.");
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

function cleanAiContent(content: string): string {
  let text = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "");

  // If nemotron-style reasoning is present, extract the final output section
  if (/Final Output|Final Output Generation|Drafted Mandate|Final Answer/i.test(text)) {
    const parts = text.split(/Final Output[^\n]*\n|Drafted Mandate[^\n]*\n|Final Answer[^\n]*\n/i);
    if (parts.length > 1) {
      text = parts[parts.length - 1]!;
    }
  } else if (/Here's a thinking process/i.test(text)) {
    // Look for the final quoted statement or trailing paragraph
    const quoted = text.match(/"([^"]{30,})"/g);
    if (quoted && quoted.length > 0) {
      text = quoted[quoted.length - 1]!.replace(/^"|"$/g, "");
    }
  }

  // Strip introductory filler or wrapper quotes
  text = text.replace(/^["']|["']$/g, "");
  text = text.replace(/^(Trade\s+mandate:\s*|Mandate:\s*|Here is the (drafted\s+)?mandate:\s*|I'll output[^:]*:\s*)/i, "");
  return text.trim();
}

/**
 * AI Mandate Copilot: Drafts a structured trading mandate from natural language instructions.
 */
export async function draftMandateWithAi(prompt: string): Promise<string> {
  const systemPrompt = `You are the Covenant AI Mandate Copilot for an autonomous options trading agent.
Your job is to draft an explicit, structured options trading mandate in natural language based on the operator's prompt.
The mandate must specify:
1. Target underlyings (must be SPY, QQQ, or both).
2. Allowed structures (must be defined-risk verticals: BULL_CALL_DEBIT, BEAR_PUT_DEBIT, or CREDIT_VERTICAL).
3. Risk profile (CONSERVATIVE, MODERATE, or AGGRESSIVE).
4. Concrete per-trade max loss cap in USD (e.g. $500 or $800), portfolio heat cap (e.g. $2500), and daily halt loss (e.g. $1250).
5. Target expiration horizon (between 7 and 45 DTE).
6. State that missing market data must trigger fail-closed ABSTAIN.

CRITICAL INSTRUCTION: Do NOT include any preamble, introduction, or thinking process. Start immediately with the mandate statement: "Trade ..."`;

  const userPrompt = `Operator instruction: "${prompt}". Output the raw mandate text immediately:`;

  const raw = await callOpenRouter(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    500
  );

  return cleanAiContent(raw);
}

/**
 * AI Candidate Explainer: Explains why a specific vertical spread is mathematically attractive and how risk is bounded.
 */
export async function explainCandidateWithAi(cand: CandidateContext): Promise<string> {
  const systemPrompt = `You are the Covenant Autonomous Options Risk Analyst.
Given the quantitative metrics of a proposed options spread, explain in 2 concise sentences:
1. Why this spread structure and strike selection makes sense given current mark and market trend.
2. How the defined-risk bounds protect the portfolio from catastrophic tail risk.
Be analytical, institutional, and direct. Do not use generic disclaimers.`;

  const userPrompt = `Proposed Trade:
Underlying: ${cand.underlying} @ $${cand.underlyingPrice}
Structure: ${cand.structure.replace(/_/g, " ")} (${cand.dte} DTE, expiry: ${cand.expiry})
Entry Limit Price: $${cand.limitPrice}
Max Standalone Loss: $${cand.maxLoss}
Max Standalone Gain: $${cand.maxGain}
Risk/Reward Ratio: ${cand.riskRewardRatio}
Quant Alpha Score: ${cand.alphaScore}/100
Market Trend: ${cand.trend ?? "NEUTRAL"}
Realized Volatility (20d): ${cand.realizedVol ? `${(cand.realizedVol * 100).toFixed(1)}%` : "N/A"}`;

  const raw = await callOpenRouter(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    300
  );

  return cleanAiContent(raw);
}
