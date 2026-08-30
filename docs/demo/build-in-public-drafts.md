# Build-in-Public Drafts

Status: drafts only. Posting is a representational action and requires team approval plus a final evidence check.

## Post 1 - The Thesis

Most AI trading demos ask: how smart is the agent? We are asking a different question: what is it physically allowed to do?

Covenant separates proposal, deterministic risk authority, and Alpaca paper execution. The strategy can propose. A signed short-lived permit must authorize the exact order. The executor cannot improvise.

Building for the @lablabai Alpaca AI Trading Agents Hackathon with @AlpacaHQ.

## Post 2 - Fail Closed

Today we hardened Covenant's Alpaca read path:

- paper and data host allowlists
- explicit synthetic mode
- schema-validated provider responses
- complete option-chain pagination
- separate stock and options feeds
- ABSTAIN when required market state is missing

Synthetic fixtures are useful for development, but they are now labelled before any candidate is shown. @lablabai @AlpacaHQ

## Post 3 - Mandates as Tests

Plain English is not the policy engine.

We built a 12-case mandate corpus for Covenant: eight coherent policy candidates and four mandatory blockers covering forced-trade conflict, undefined risk, inverted DTE bounds, and per-trade risk above total heat.

The model may draft. Deterministic validation decides whether the draft can progress. @lablabai @AlpacaHQ

## Post 4 - Required Self-Correction

Public correction from our build: underlying trend evidence is not options-strategy profitability.

Across 3.967 out-of-sample years for SPY and QQQ, mean signed five-session outcomes were modestly positive after a 10 bp stress, but downside tails were large and results varied materially by volatility regime.

So we are not presenting those numbers as options P&L or a guaranteed edge. Trend is one deterministic ranking input. Covenant's real contribution is enforceable authority boundaries and reproducible evidence. @lablabai @AlpacaHQ

## Post 5 - Demo Gate

Our submission rule: no green screenshot without reproducible evidence.

The 90-second Covenant demo is blocked until one real Alpaca paper multi-leg order, its signed single-use permit, the complete event chain, and the TypeScript replay command all agree on the same run.

The attack opens the demo: mutate quantity after permit issuance and prove rejection before the broker call. @lablabai @AlpacaHQ

## Publication Checklist

- Confirm every completed-tense statement against the current revision.
- Do not publish an order ID, request ID, account ID, or dashboard screenshot until secrets and personal data are masked.
- Keep the paper-trading disclaimer in the linked submission.
- Do not call fixed conformance tests self-fuzzing.
- Do not claim profitability, Sharpe ratio, win rate, or live performance.
- Obtain team approval immediately before posting.
