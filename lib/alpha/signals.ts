import Decimal from "decimal.js";
import type { AlpacaBar } from "@/lib/alpaca/types";

export interface SignalAnalysis {
  usable: boolean;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  sma5: string;
  sma20: string;
  realizedVol20d: number;
  rangeVol20d: number;
  ivPremium?: number;
  dailyLogReturns: number[];
  summary: string;
}

function invalidSignals(reason: string): SignalAnalysis {
  return {
    usable: false,
    trend: "NEUTRAL",
    sma5: "0.00",
    sma20: "0.00",
    realizedVol20d: 0,
    rangeVol20d: 0,
    dailyLogReturns: [],
    summary: `[ABSTAIN] ${reason}`,
  };
}

/** Computes deterministic 5/20 trend and blended EWMA/range realized volatility. */
export function analyzeMarketSignals(
  bars: AlpacaBar[],
  chainIvAverage?: number
): SignalAnalysis {
  if (bars.length < 21) {
    return invalidSignals(`At least 21 daily bars are required; received ${bars.length}.`);
  }

  const ordered = [...bars].sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  const recent = ordered.slice(-21);
  if (ordered.some((bar) =>
    !Number.isFinite(bar.c) ||
    !Number.isFinite(bar.h) ||
    !Number.isFinite(bar.l) ||
    bar.c <= 0 ||
    bar.h <= 0 ||
    bar.l <= 0 ||
    bar.h < bar.l
  )) {
    return invalidSignals("Historical bars contain invalid OHLC values.");
  }

  const allCloses = ordered.map((bar) => bar.c);
  const closes = recent.map((bar) => bar.c);
  const sma5 = closes.slice(-5).reduce((sum, close) => sum + close, 0) / 5;
  const sma20 = closes.slice(-20).reduce((sum, close) => sum + close, 0) / 20;
  const dailyLogReturns = allCloses.slice(1).map((close, index) => Math.log(close / allCloses[index]));

  const recentReturns = dailyLogReturns.slice(-20);
  let ewmaVariance = recentReturns[0] ** 2;
  const lambda = 0.94;
  for (const dailyReturn of recentReturns.slice(1)) {
    ewmaVariance = lambda * ewmaVariance + (1 - lambda) * dailyReturn ** 2;
  }
  const ewmaVol = Math.sqrt(ewmaVariance * 252);

  const rangeVariance = recent.slice(-20).reduce(
    (sum, bar) => sum + Math.log(bar.h / bar.l) ** 2,
    0
  ) / (4 * Math.log(2) * 20);
  const rangeVol = Math.sqrt(rangeVariance * 252);
  const realizedVol = (ewmaVol + rangeVol) / 2;

  let trend: SignalAnalysis["trend"] = "NEUTRAL";
  if (sma5 > sma20 * 1.002) trend = "BULLISH";
  if (sma5 < sma20 * 0.998) trend = "BEARISH";

  const validIv = chainIvAverage !== undefined && Number.isFinite(chainIvAverage) && chainIvAverage > 0;
  const ivPremium = validIv ? chainIvAverage - realizedVol : undefined;

  return {
    usable: true,
    trend,
    sma5: new Decimal(sma5).toFixed(2),
    sma20: new Decimal(sma20).toFixed(2),
    realizedVol20d: Number(realizedVol.toFixed(4)),
    rangeVol20d: Number(rangeVol.toFixed(4)),
    ivPremium: ivPremium === undefined ? undefined : Number(ivPremium.toFixed(4)),
    dailyLogReturns,
    summary: `5/20 trend ${trend}; blended realized volatility ${(realizedVol * 100).toFixed(1)}%.`,
  };
}
