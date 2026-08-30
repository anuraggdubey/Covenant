import Decimal from "decimal.js";
import type { AlpacaBar } from "@/lib/alpaca/types";

export interface SignalAnalysis {
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  sma5: string;
  sma20: string;
  realizedVol20d: number;
  ivPremium?: number; // chainIV - realizedVol20d
  summary: string;
}

/**
 * Computes trend and realized volatility from historical bars.
 */
export function analyzeMarketSignals(
  bars: AlpacaBar[],
  chainIvAverage?: number
): SignalAnalysis {
  if (bars.length < 5) {
    return {
      trend: "NEUTRAL",
      sma5: "0.00",
      sma20: "0.00",
      realizedVol20d: 0.15,
      summary: "Insufficient historical bars; defaulting to neutral signals",
    };
  }

  // 1. Moving Averages
  const closes = bars.map((b) => b.c);
  const last5 = closes.slice(-5);
  const sum5 = last5.reduce((acc, c) => acc + c, 0);
  const sma5 = sum5 / 5;

  const count20 = Math.min(closes.length, 20);
  const last20 = closes.slice(-count20);
  const sum20 = last20.reduce((acc, c) => acc + c, 0);
  const sma20 = sum20 / count20;

  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (sma5 > sma20 * 1.002) {
    trend = "BULLISH";
  } else if (sma5 < sma20 * 0.998) {
    trend = "BEARISH";
  }

  // 2. Realized Volatility (20-day log returns)
  let realizedVol = 0.15;
  if (closes.length >= 6) {
    const logReturns: number[] = [];
    for (let i = 1; i < last20.length; i++) {
      logReturns.push(Math.log(last20[i] / last20[i - 1]));
    }
    const mean = logReturns.reduce((acc, r) => acc + r, 0) / logReturns.length;
    const variance =
      logReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) /
      (logReturns.length - 1);
    const dailyStd = Math.sqrt(variance);
    realizedVol = dailyStd * Math.sqrt(252);
  }

  const ivPremium =
    chainIvAverage !== undefined ? chainIvAverage - realizedVol : undefined;

  return {
    trend,
    sma5: new Decimal(sma5).toFixed(2),
    sma20: new Decimal(sma20).toFixed(2),
    realizedVol20d: Number(realizedVol.toFixed(4)),
    ivPremium: ivPremium !== undefined ? Number(ivPremium.toFixed(4)) : undefined,
    summary: `5d SMA ${sma5.toFixed(2)} vs 20d SMA ${sma20.toFixed(2)} (${trend}). Realized Vol: ${(realizedVol * 100).toFixed(1)}%`,
  };
}
