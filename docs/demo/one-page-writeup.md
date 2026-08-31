# Covenant: Proof Before Power for AI Trading

Status: submission draft. Replace blocked evidence fields only after the release gates pass.

Covenant is a paper-trading options agent for SPY and QQQ defined-risk vertical spreads. Its thesis is that an AI trading system should not receive broad brokerage authority and then be monitored after the fact. Instead, strategy generation, risk authority, and broker execution are separate roles. The Alpha Engine may propose a trade. The Safety Kernel may approve, shrink, veto, or abstain. Only the Permit Executor can write to Alpaca, and it should accept only an exact order authorized by a signed, short-lived, single-use TradePermit.

## AI Logic

The Alpha Engine reads Alpaca account, market-clock, stock-bar, and option-chain snapshots. It filters contracts by underlying, structure, DTE, delta, quote freshness, bid/ask width, open interest, and volume. It constructs legal two-leg vertical spreads, calculates exact standalone maximum loss and gain, and sizes candidates against the active risk profile. A deterministic 5/20 trend feature, realized volatility, chain implied volatility, and after-cost bootstrap scenarios influence ranking. Missing or inconsistent required state returns ABSTAIN; the engine does not insert neutral defaults.

AI authority is intentionally narrow. A model may help draft a plain-English mandate and may veto or reduce confidence in a candidate. It cannot author an OCC contract symbol, activate a policy, increase quantity, widen the permitted price band, sign a permit, or submit an order.

## Risk Gates

Mandates compile into typed, versioned policy candidates. Covenant's locked scope is SPY and QQQ defined-risk verticals only. The Balanced profile for a $100,000 paper account caps exact standalone loss at $600 per trade, conservative portfolio heat at $2,500, and the daily halt at -$1,250. It requires 7-21 DTE, delta from 0.20 to 0.80, quotes no older than 60 seconds, bid/ask width no greater than 25% of midpoint, open interest of at least 100, and volume of at least 10.

The target Safety Kernel evaluates eight named invariants: exact permit binding, finite loss, portfolio heat, verified-session daily halt, mandate bands and liquidity, duplicate exposure, exit escalation, and fail-closed missing state. An approved intent receives an Ed25519-signed 60-second TradePermit bound to the policy hash, account and market snapshot hashes, intent hash, exact legs, quantity ceiling, price band, and nonce. The isolated executor verifies every binding before any Alpaca call and atomically consumes the nonce after an accepted submission attempt.

## Alpaca Infrastructure and Proof

The read adapter is restricted to Alpaca's paper trading and market-data hosts and has no order-writing methods. Stock and option feeds are configured separately, provider responses are schema-validated, option-chain pagination is complete, and synthetic mode must be explicitly enabled and visibly labelled.

The final proof path requires a real Alpaca paper `mleg` order ID and request ID, a complete hash-chained event run, and `npm run verify -- demo/run_manifest.json`. The verifier must distinguish recorded provider facts from reproduced deterministic checks and identify exact event mismatches. These execution and replay components are release gates, not completed claims in the current draft.

## Edge Validation

Lane C evaluated the fixed 5/20 underlying trend feature over 3.967 out-of-sample years for both SPY and QQQ. The test used non-overlapping five-session outcomes, trailing-only volatility regimes, and a 10 bp cost stress. Mean after-cost signed outcomes were modestly positive, but downside tails were large and results varied by regime. Therefore, Covenant does not convert this underlying signal evidence into an options-profitability claim. Trend remains a deterministic candidate input, while the product's demonstrated innovation is constrained authority and inspectable evidence.

Paper trading only. Not investment advice. Paper fills and historical signal evidence do not represent live execution or future results.
