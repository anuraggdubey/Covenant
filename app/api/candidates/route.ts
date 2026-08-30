import { NextResponse } from "next/server";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { buildMarketSnapshot, buildAccountSnapshot } from "@/lib/alpha/snapshots";
import { generateCandidates } from "@/lib/alpha/factory";
import { analyzeMarketSignals } from "@/lib/alpha/signals";
import { rankAndSizeCandidates } from "@/lib/alpha/ranking";
import { defaultActivePolicy } from "@/lib/alpha/loop";
import type { OptionContractSnapshot } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleCandidates();
}

async function handleCandidates() {
  try {
    const readClient = new AlpacaReadClient();
    const clock = await readClient.getClock();
    if (!clock.is_open) {
      return NextResponse.json(
        { error: "Market is closed", timestamp: clock.timestamp, nextOpen: clock.next_open },
        { status: 409 }
      );
    }
    const rawAccount = await readClient.getAccount();
    const accountSnapshot = buildAccountSnapshot(rawAccount);

    const results = [];

    for (const sym of ["SPY", "QQQ"] as const) {
      const stockSnap = await readClient.getStockSnapshot(sym);
      const rawOptions = await readClient.getOptionSnapshots(sym);
      const asset = await readClient.getAsset(sym);
      if (!asset.tradable || !asset.has_options) {
        throw new Error(`${sym} is not tradable with options.`);
      }
      const barsResp = await readClient.getStockBars(sym, "1Day", 60);
      const bars = barsResp.bars[sym] ?? [];

      const price =
        stockSnap.latestTrade?.p?.toFixed(2) ??
        stockSnap.latestQuote?.ap?.toFixed(2);
      if (!price) throw new Error(`Missing underlying price for ${sym}.`);

      const marketSnapshot = buildMarketSnapshot(
        sym,
        price,
        rawOptions,
        readClient.isMockMode() ? "synthetic" : readClient.getOptionFeed()
      );
      const candidates = generateCandidates(marketSnapshot, defaultActivePolicy, 1);
      const impliedVolatilities = Object.values(marketSnapshot.contracts)
        .map((contract) => contract.impliedVolatility)
        .filter((value): value is number => value !== undefined && Number.isFinite(value));
      const chainIvAverage = impliedVolatilities.length > 0
        ? impliedVolatilities.reduce((sum, value) => sum + value, 0) / impliedVolatilities.length
        : undefined;
      const signals = analyzeMarketSignals(bars, chainIvAverage);
      const ranked = rankAndSizeCandidates(
        candidates,
        defaultActivePolicy,
        accountSnapshot,
        signals,
        price,
        1.0
      );

      // Build real option chain strike ladder grouped by expiration
      const expirationsSet = new Set<string>();
      const ladderByExpiry: Record<string, Record<string, { call?: OptionContractSnapshot; put?: OptionContractSnapshot }>> = {};

      for (const contract of Object.values(marketSnapshot.contracts)) {
        expirationsSet.add(contract.expiration);
        if (!ladderByExpiry[contract.expiration]) {
          ladderByExpiry[contract.expiration] = {};
        }
        if (!ladderByExpiry[contract.expiration][contract.strike]) {
          ladderByExpiry[contract.expiration][contract.strike] = {};
        }

        if (contract.type === "call") {
          ladderByExpiry[contract.expiration][contract.strike].call = contract;
        } else {
          ladderByExpiry[contract.expiration][contract.strike].put = contract;
        }
      }

      // Convert ladderByExpiry into sorted arrays
      const formattedLadders: Record<string, Array<{ strike: string; call?: OptionContractSnapshot; put?: OptionContractSnapshot }>> = {};
      for (const [exp, strikesMap] of Object.entries(ladderByExpiry)) {
        const sortedStrikes = Object.keys(strikesMap).sort((a, b) => Number(a) - Number(b));
        formattedLadders[exp] = sortedStrikes.map((strike) => ({
          strike,
          call: strikesMap[strike].call,
          put: strikesMap[strike].put,
        }));
      }

      results.push({
        underlying: sym,
        underlyingPrice: price,
        feed: marketSnapshot.feed,
        marketSnapshotHash: marketSnapshot.snapshotHash,
        totalContractsInChain: Object.keys(marketSnapshot.contracts).length,
        expirations: Array.from(expirationsSet).sort(),
        ladderByExpiry: formattedLadders,
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
          breakevenUnderlying: r.finalPayoff.breakevenUnderlying,
          riskRewardRatio: r.finalPayoff.riskRewardRatio,
          alphaScore: r.alphaScore,
          expectedPnl: r.expectedPnl,
          lowerConfidenceBoundPnl: r.lowerConfidenceBoundPnl,
          scenarioCount: r.scenarioCount,
          portfolioHeatAfterTrade: r.portfolioHeatAfterTrade,
          thesis: r.thesis,
        })),
      });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      dataMode: readClient.isMockMode() ? "SYNTHETIC_MOCK" : "PAPER",
      account: {
        id: `...${accountSnapshot.accountId.slice(-4)}`,
        equity: accountSnapshot.equity,
        buyingPower: accountSnapshot.buyingPower,
        optionsLevel: accountSnapshot.optionsLevel,
        snapshotHash: accountSnapshot.snapshotHash,
      },
      underlyings: results,
    });
  } catch (err: unknown) {
    console.error("Candidate generation failed", err);
    return NextResponse.json(
      {
        error: "Failed to generate candidates",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
