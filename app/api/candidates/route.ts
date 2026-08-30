import { NextResponse } from "next/server";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { buildMarketSnapshot, buildAccountSnapshot } from "@/lib/alpha/snapshots";
import { generateCandidates } from "@/lib/alpha/factory";
import { analyzeMarketSignals } from "@/lib/alpha/signals";
import { rankAndSizeCandidates } from "@/lib/alpha/ranking";
import { defaultActivePolicy } from "@/lib/alpha/loop";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleCandidates();
}

export async function POST() {
  return handleCandidates();
}

async function handleCandidates() {
  try {
    const readClient = new AlpacaReadClient();
    const rawAccount = await readClient.getAccount();
    const accountSnapshot = buildAccountSnapshot(rawAccount);

    const results = [];

    for (const sym of ["SPY", "QQQ"] as const) {
      const stockSnap = await readClient.getStockSnapshot(sym);
      const rawOptions = await readClient.getOptionSnapshots(sym);
      const barsResp = await readClient.getStockBars(sym, "1Day", 25);
      const bars = barsResp.bars[sym] ?? [];

      const price =
        stockSnap.latestTrade?.p?.toFixed(2) ??
        stockSnap.latestQuote?.ap?.toFixed(2) ??
        "500.00";

      const marketSnapshot = buildMarketSnapshot(sym, price, rawOptions);
      const candidates = generateCandidates(marketSnapshot, defaultActivePolicy, 1);
      const signals = analyzeMarketSignals(bars);
      const ranked = rankAndSizeCandidates(
        candidates,
        defaultActivePolicy,
        accountSnapshot,
        signals,
        1.0
      );

      results.push({
        underlying: sym,
        underlyingPrice: price,
        marketSnapshotHash: marketSnapshot.snapshotHash,
        totalContractsInChain: Object.keys(marketSnapshot.contracts).length,
        signals,
        candidatesCount: candidates.length,
        rankedCandidates: ranked.map((r) => ({
          id: r.candidate.id,
          structure: r.candidate.structure,
          expiry: r.candidate.expiry,
          dte: r.candidate.dte,
          legs: r.candidate.legs,
          quantity: r.quantity,
          limitPrice: r.finalPayoff.limitPrice,
          standaloneMaxLoss: r.finalPayoff.standaloneMaxLoss,
          standaloneMaxGain: r.finalPayoff.standaloneMaxGain,
          riskRewardRatio: r.finalPayoff.riskRewardRatio,
          alphaScore: r.alphaScore,
          portfolioHeatAfterTrade: r.portfolioHeatAfterTrade,
          thesis: r.thesis,
        })),
      });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      account: {
        id: accountSnapshot.accountId,
        equity: accountSnapshot.equity,
        buyingPower: accountSnapshot.buyingPower,
        optionsLevel: accountSnapshot.optionsLevel,
        snapshotHash: accountSnapshot.snapshotHash,
      },
      underlyings: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Failed to generate candidates",
        details: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
