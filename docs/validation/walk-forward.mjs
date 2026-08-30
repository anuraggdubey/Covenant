import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(join(directory, "source-manifest-v2.json"), "utf8"));
const horizonSessions = 5;
const calibrationSessions = 252;
const roundTripCost = 0.001;
const trendThreshold = 0.002;

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStd(values) {
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function quantile(values, probability) {
  const ordered = [...values].sort((a, b) => a - b);
  const index = (ordered.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return ordered[lower];
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower);
}

function rounded(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function summarize(rows) {
  const active = rows.filter((row) => row.signal !== 0);
  return {
    observations: rows.length,
    activeSignals: active.length,
    neutralSignals: rows.length - active.length,
    directionalAccuracy: active.length ? rounded(active.filter((row) => row.grossSignedReturn > 0).length / active.length) : null,
    meanGrossSignedFiveSessionReturn: active.length ? rounded(mean(active.map((row) => row.grossSignedReturn))) : null,
    meanAfterCostSignedFiveSessionReturn: active.length ? rounded(mean(active.map((row) => row.afterCostSignedReturn))) : null,
    medianAfterCostSignedFiveSessionReturn: active.length ? rounded(quantile(active.map((row) => row.afterCostSignedReturn), 0.5)) : null,
    tenthPercentileAfterCostSignedReturn: active.length ? rounded(quantile(active.map((row) => row.afterCostSignedReturn), 0.1)) : null,
  };
}

function parseSeries(text, expectedSymbol) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  assert.equal(headerLine, "date,adjustedClose", `${expectedSymbol} normalized headers are incompatible`);
  const rows = lines.map((line) => {
    const [date, adjustedClose] = line.split(",");
    return { date, close: Number(adjustedClose) };
  });
  assert.ok(rows.length >= calibrationSessions + 504, `${expectedSymbol} lacks two OOS years after calibration`);
  assert.ok(rows.every((row) => Number.isFinite(row.close) && row.close > 0));
  assert.ok(rows.every((row, index) => index === 0 || row.date > rows[index - 1].date));
  return rows;
}

function realizedVolatilityAt(rows, index) {
  const returns = [];
  for (let cursor = index - 19; cursor <= index; cursor += 1) {
    returns.push(Math.log(rows[cursor].close / rows[cursor - 1].close));
  }
  return sampleStd(returns) * Math.sqrt(252);
}

function evaluateSymbol(symbol, bars) {
  const evaluations = [];
  for (let index = calibrationSessions; index + horizonSessions < bars.length; index += horizonSessions) {
    const sma5 = mean(bars.slice(index - 4, index + 1).map((bar) => bar.close));
    const sma20 = mean(bars.slice(index - 19, index + 1).map((bar) => bar.close));
    const ratio = sma5 / sma20 - 1;
    const signal = ratio > trendThreshold ? 1 : ratio < -trendThreshold ? -1 : 0;

    const historicalVolatility = [];
    for (let cursor = Math.max(20, index - calibrationSessions); cursor < index; cursor += 1) {
      historicalVolatility.push(realizedVolatilityAt(bars, cursor));
    }
    assert.ok(historicalVolatility.length >= 200);
    const currentVolatility = realizedVolatilityAt(bars, index);
    const lowCutoff = quantile(historicalVolatility, 1 / 3);
    const highCutoff = quantile(historicalVolatility, 2 / 3);
    const regime = currentVolatility <= lowCutoff ? "LOW" : currentVolatility >= highCutoff ? "HIGH" : "MEDIUM";

    const forwardReturn = bars[index + horizonSessions].close / bars[index].close - 1;
    const grossSignedReturn = signal * forwardReturn;
    evaluations.push({
      date: bars[index].date,
      outcomeDate: bars[index + horizonSessions].date,
      regime,
      signal,
      grossSignedReturn,
      afterCostSignedReturn: signal === 0 ? 0 : grossSignedReturn - roundTripCost,
    });
  }

  const firstDate = evaluations[0].date;
  const lastOutcomeDate = evaluations.at(-1).outcomeDate;
  const coverageYears = (Date.parse(lastOutcomeDate) - Date.parse(firstDate)) / (365.25 * 24 * 60 * 60 * 1000);
  assert.ok(coverageYears >= 2, `${symbol} OOS coverage is below two years`);

  return {
    symbol,
    sourceSessions: bars.length,
    calibrationStart: bars[0].date,
    firstOosSignalDate: firstDate,
    lastOosOutcomeDate: lastOutcomeDate,
    oosCoverageYears: rounded(coverageYears, 3),
    overall: summarize(evaluations),
    byRegime: Object.fromEntries(["LOW", "MEDIUM", "HIGH"].map((regime) => [
      regime,
      summarize(evaluations.filter((row) => row.regime === regime)),
    ])),
  };
}

const reports = [];
for (const source of manifest.series) {
  const bytes = await readFile(join(directory, source.file));
  const digest = createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest, source.sha256, `${source.symbol} source hash mismatch`);
  const bars = parseSeries(bytes.toString("utf8"), source.symbol);
  assert.equal(bars.length, source.sessions);
  assert.equal(bars[0].date, source.firstSession);
  assert.equal(bars.at(-1).date, source.lastSession);
  reports.push(evaluateSymbol(source.symbol, bars));
}

const result = {
  status: "RECORDED",
  claimScope: "Underlying 5/20 trend signal evidence only; not options strategy, fill, or Alpaca performance",
  methodology: {
    calibrationSessions,
    horizonSessions,
    nonOverlappingOutcomes: true,
    trendRule: "BULLISH when SMA5 > SMA20 * 1.002; BEARISH when SMA5 < SMA20 * 0.998; otherwise NEUTRAL",
    regimeRule: "Current 20-session close-to-close volatility versus trailing 252-session 33rd/67th percentiles, using prior observations only",
    roundTripCost,
    optimizedParameters: false,
  },
  reports,
};

const recorded = JSON.parse(await readFile(join(directory, "recorded-results-v2.json"), "utf8"));
if (!process.argv.includes("--print-unrecorded")) {
  assert.deepEqual(result, recorded, "Reproduced metrics differ from recorded-results-v2.json");
}
console.log(JSON.stringify(result, null, 2));
