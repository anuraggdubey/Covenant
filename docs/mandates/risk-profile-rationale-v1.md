# Risk Profile Calibration v1

Status: Lane C recommendation for a fresh $100,000 Alpaca paper account. Lane B must compile, validate, and explicitly activate any policy before these values can govern execution.

These profiles cap loss by the exact standalone spread envelope, not premium paid, buying power, or a model estimate. Portfolio heat is the conservative sum of standalone maximum losses. All percentages are decimal fractions of current equity.

## Dollar Guardrails

| Profile | Per-trade maximum | Portfolio heat | Daily halt |
| --- | ---: | ---: | ---: |
| Conservative | 0.35% = $350 | 1.50% = $1,500 | -0.75% = -$750 |
| Balanced | 0.60% = $600 | 2.50% = $2,500 | -1.25% = -$1,250 |
| Aggressive | 1.00% = $1,000 | 4.00% = $4,000 | -2.00% = -$2,000 |

The Aggressive profile is still bounded: one worst-case spread cannot lose more than 1% of equity, total worst-case heat cannot exceed 4%, and the daily halt fires at half the heat ceiling. These are paper-account settings, not a recommendation for live capital.

## Rationale Per Number

| Field | Conservative | Balanced | Aggressive | Rationale |
| --- | ---: | ---: | ---: | --- |
| `perTradeMaxLossPct` | 0.0035 | 0.0060 | 0.0100 | Keeps a single defined-risk failure small enough that several independent failures do not dominate the account. Dollar caps are $350, $600, and $1,000. |
| `portfolioHeatMaxLossPct` | 0.015 | 0.025 | 0.040 | Allows roughly four simultaneous full-risk positions while bounding the conservative sum of maximum losses. |
| `dailyHaltPct` | -0.0075 | -0.0125 | -0.0200 | Stops new entries at half the portfolio-heat ceiling so the system cannot refill risk after a damaging session. Reset requires a verified new Alpaca market session. |
| `minDte` | 14 | 7 | 7 | Conservative avoids the steepest near-expiry gamma; Balanced and Aggressive permit one-week structures for a broader candidate set. |
| `maxDte` | 30 | 21 | 30 | Caps capital duration and limits thesis drift; Conservative and Aggressive receive a wider selection window for different reasons. |
| `minDelta` | 0.20 | 0.20 | 0.15 | Excludes very low-delta contracts where sparse quotes and tiny premiums can dominate the signal. |
| `maxDelta` | 0.65 | 0.80 | 0.85 | Prevents near-stock-replacement exposure; Conservative stays farther from high intrinsic exposure. |
| `maxQuoteAgeMs` | 45,000 | 60,000 | 45,000 | The default indicative feed may be delayed and modified, but locally stale snapshots must still fail closed. Aggressive does not receive a freshness exemption. |
| `maxBidAskWidthPct` | 0.18 | 0.25 | 0.30 | Width is measured against midpoint. Looser profiles accept more execution uncertainty but never omit the filter. |
| `minOpenInterest` | 250 | 100 | 75 | Higher open interest reduces dependence on a single displayed quote and improves the chance of orderly exits. |
| `minVolume` | 25 | 10 | 5 | Same-session activity complements open interest; both thresholds must pass. |
| `duplicateExposureCooldownMinutes` | 60 | 30 | 20 | Slows repeated equivalent exposure after a veto, fill, or recent intent; shorter windows increase activity without removing deduplication. |
| `exitAttemptDeadlineMinutes` | 10 | 15 | 10 | A failed close escalates quickly. Conservative prioritizes risk removal; Aggressive gets no extra tolerance for a failed exit. |

## Locked Values

Every profile keeps these values unchanged:

- `missingStateAction`: `ABSTAIN`
- `modelAuthority`: `VETO_OR_SHRINK`
- `invariants`: exactly `COV-01` through `COV-08`
- `allowedUnderlyings`: a subset of `SPY` and `QQQ`
- `allowedStructures`: defined-risk verticals only

## Calibration Limits

This is risk-budget calibration, not evidence of profitability. It does not establish expected return, fill quality, options-level approval, or live suitability. Recalibration requires a documented decision and must never use favourable backfilled outcomes.
