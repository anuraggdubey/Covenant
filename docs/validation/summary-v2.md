# Walk-Forward Signal Summary v2

Status: recorded, reproducible, CC0-sourced, and out-of-sample. This is underlying trend evidence only.

## Main Finding

The fixed 5/20 trend feature produced modest positive mean signed outcomes after a 10 bp five-session cost stress: +0.053% for SPY and +0.044% for QQQ. Directional accuracy was 58.2% and 53.6%, respectively. These are underlying signal-direction statistics, not option-trade returns or win rates.

The evidence is regime-dependent and has meaningful downside tails. SPY's medium-volatility mean was -0.235%; QQQ's medium-volatility mean was -0.571%. Tenth-percentile active outcomes were -3.442% for SPY and -4.174% for QQQ overall. The signal therefore supports ranking research, not a standalone profitability claim.

## Out-of-Sample Results

| Symbol | Scored coverage | Observations | Active | Directional accuracy | Mean after-cost signed 5-session return | 10th percentile |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| SPY | 3.967 years | 200 | 182 | 58.24% | +0.053% | -3.442% |
| QQQ | 3.967 years | 200 | 192 | 53.65% | +0.044% | -4.174% |

| Symbol | Low volatility | Medium volatility | High volatility |
| --- | ---: | ---: | ---: |
| SPY mean after-cost signed return | +0.132% | -0.235% | +0.175% |
| QQQ mean after-cost signed return | +0.147% | -0.571% | +0.362% |

## Product Decision

Do not describe these numbers as options-strategy P&L. Keep trend alignment as one deterministic candidate-ranking input, retain the after-cost confidence gate, and present Covenant's primary innovation as enforceable trading authority boundaries: mandate compilation, deterministic safety checks, signed short-lived permits, exact-order binding, replay resistance, and evidence.

No regime-specific production change should be selected from this report alone. Choosing favourable slices after observing them would be post-selection and requires a new untouched holdout.

## What This Does Not Prove

- No options chain, implied volatility, Greeks, spread payoff, assignment, or fill was replayed.
- The 10 bp stress is an underlying-signal convention, not an estimate of option spread execution cost.
- The CC0 adjusted-close datasets are not Alpaca market data and are not broker evidence.
- No Sharpe ratio, options P&L, strategy win rate, or live result should be derived from this report.
- The sample includes the 2020 crash and recovery, 2022 tightening, and 2023 conditions, but historical regime coverage cannot guarantee future behavior.

## Reproduction

Run `node docs/validation/walk-forward.mjs` and compare its output with `recorded-results-v2.json`. The source hashes, row counts, and session bounds must match before metrics are considered reproduced.
