# Covenant

> Status: in development | Alpaca paper trading only | no verified performance claims

Covenant is a constrained options-agent prototype for the Alpaca AI Trading Agents Hackathon. Lane A builds and ranks defined-risk SPY/QQQ vertical-spread intents. Lane B will provide the deterministic Safety Kernel, signed `TradePermit`, paper-order executor, event journal, and verifier. Lane C owns mandates, validation, demo evidence, and submission QA.

## Current Capability

| Capability | State |
| --- | --- |
| Strict read-only Alpaca adapter | Implemented; exact paper/data hosts, typed responses, option pagination, separate stock/options feeds |
| Canonical market/account snapshot hashing | Implemented in memory |
| Snapshot persistence | Blocked on Lane B storage repositories and migrations |
| Candidate filters and payoff math | Implemented; fail-closed Greeks/liquidity and signed Alpaca debit/credit prices |
| Signals and ranking | Implemented; 5/20 trend, EWMA/range volatility, deterministic after-cost scenario lower bound |
| Position exit evaluation | Implemented; real position/order integration remains blocked |
| Permit executor and broker write path | Not implemented; Lane B owned |
| Break Me, proof verifier, and Shadow Ledger | Not implemented; no placeholder results are presented as real |
| Walk-forward performance validation | Not available until Lane C commits a verified dataset and split manifest |

Passing TypeScript or unit tests does not imply that Lane B capabilities or paper execution exist.

## Lane A Pipeline

1. Fetch and validate Alpaca paper account, clock, assets, SPY/QQQ stock data, and complete option snapshots.
2. Normalize OCC contracts and compute canonical SHA-256 snapshot hashes.
3. Require 7-21 DTE, fresh quotes, valid delta, bid/ask size, open interest, daily volume, and configured spread width.
4. Construct only defined-risk bull-call debit, bear-put debit, bull-put credit, and bear-call credit verticals.
5. Calculate max loss, max gain, breakeven, and signed MLeg limit price using `decimal.js`.
6. Estimate after-cost candidate P&L across deterministic bootstrapped return scenarios.
7. Emit a `TradeIntent` only when its 90% lower confidence bound is positive and risk limits pass; otherwise return `ABSTAIN`.

The default paper profile is 0.60% maximum loss per trade, 2.50% portfolio heat, and a -1.25% daily halt.

## Setup

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Real paper-data mode requires both Alpaca credentials. Offline mock data is never automatic; enable it explicitly in development or tests:

```env
ALPACA_API_KEY_ID=your_paper_key
ALPACA_API_SECRET_KEY=your_paper_secret
ALPACA_TRADING_BASE_URL=https://paper-api.alpaca.markets
ALPACA_DATA_BASE_URL=https://data.alpaca.markets
ALPACA_DATA_FEED=indicative
ALPACA_STOCK_DATA_FEED=iex
ALPACA_PAPER=true
ALPACA_MOCK_MODE=false
```

Set `ALPACA_MOCK_MODE=true` only for local development or tests. Production rejects mock mode.

## Commands

```powershell
npm run typecheck
npm test
npm run build
npm run tick
npm run validate:walk-forward
```

`npm run tick` requires configured paper credentials. `npm run validate:walk-forward` currently reports `NOT_AVAILABLE` and intentionally prints no P&L, Sharpe, or win-rate metrics.

## Ownership Boundary

- Lane A: `lib/alpaca/**`, `lib/alpha/**`, `lib/monitor/**`, candidate APIs, and frontend integration.
- Lane B: `lib/safety/**`, `lib/permits/**`, `lib/execution/**`, `lib/audit/**`, `lib/storage/**`, Break Me, and Shadow Ledger.
- Lane C: mandate corpus, risk rationale, historical validation, demo script, cold-run QA, and submission evidence.

Lane A has no order-writing method. Autonomous execution and proof UI remain blocked until Demilade's Lane B interfaces are merged and tested.

Paper trading only. Not investment advice. Options involve significant risk. Paper results do not represent live execution.
