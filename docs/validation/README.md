# Walk-Forward Validation

This directory contains Lane C's independent evidence for the Alpha Engine's 5/20 underlying trend feature. It does not validate options prices, Greeks, spread construction, execution, fills, or profitability.

## Reproduce

```bash
node docs/validation/walk-forward.mjs
```

The command first verifies each committed source file against `source-manifest-v2.json`. Any changed byte, malformed normalized row, non-positive price, unsorted session, insufficient calibration history, or less than two years of scored coverage fails the run.

The reproduced metrics must exactly equal `recorded-results-v2.json` unless `--print-unrecorded` is explicitly supplied while preparing a new version.

## Walk-Forward Design

- Source: independently published CC0 Kaggle datasets for SPY and QQQ, normalized to a fixed overlapping period.
- Provenance: URLs, retrieval time, date coverage, bar counts, and SHA-256 hashes are committed.
- Calibration: the first 252 sessions are never scored.
- Signal: the same fixed 5/20 threshold used by Lane A, with a 0.2% neutral band.
- Outcomes: forward five-session adjusted-close returns sampled every five sessions, so scored outcomes do not overlap.
- Regimes: low, medium, and high realized-volatility bands are recalculated from the trailing 252 sessions available before each signal.
- Cost stress: 10 basis points deducted from every active five-session signal outcome.
- Selection: no parameter search, symbol selection, favourable period selection, or in-sample headline metric.

## Important Limitations

The CC0 datasets are not the execution venue and are not Alpaca evidence. Adjusted closing prices are suitable for this underlying trend check but cannot reproduce tradable option premiums or intraday fills. The test ignores bid/ask dynamics, early assignment, option volatility surfaces, order latency, taxes, and account constraints. Results must be described as signal evidence, never as strategy P&L, win rate, Sharpe ratio, or live performance.
