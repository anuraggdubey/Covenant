# Covenant — Proof-Carrying Options Agent

> **Status:** Active Development · **Paper Trading Only** · **Alpaca AI Trading Agents Hackathon**

Covenant is a proof-carrying options agent that compiles plain-English trader mandates into versioned, typed policies, stress-tests those policies before activation, and lets an Alpha Engine propose defined-risk SPY/QQQ vertical spreads that it **cannot execute**. Only a separate, isolated Permit Executor holding paper credentials can submit orders matching short-lived, signed `TradePermit`s.

---

## 🏛️ Architecture & The Three Lanes

| Lane | Owner | Scope | Boundary Constraint |
| :--- | :--- | :--- | :--- |
| **Lane A — Alpha & Market Data** | **Anurag** | Alpaca read client, snapshot ingestion & canonical hashing, candidate factory, payoff & max-loss engine, signals, ranking, `TradeIntent` emission, position monitor, autonomous loop (`npm run tick`), and dashboard pages. | **Powerless by construction.** Strategy and alpha code never touch broker write credentials. |
| **Lane B — Safety, Permits & Proof** | **Demilade** | Policy compiler, contradiction checks, Safety Kernel (`COV-01`…`COV-08`), permit signing/verification, Permit Executor (the **only** order write path), event journal, replay verifier, Break Me engine, and Shadow Ledger. | Strategy-blind. Evaluates invariants deterministically; cannot widen trades or generate strategies. |
| **Lane C — Product & Validation** | **Trading Advisor** | Mandate corpus, risk profiles calibration, walk-forward validation summary, demo script, and adversarial cold-run QA. | Narrative & validation anchor. |

---

## 🚀 Lane A: Alpha & Market Data (Deep Dive)

Lane A provides the complete market intelligence, options candidate generation, risk modeling, and autonomous tick loop.

### 1. The Alpha Pipeline

```txt
   Alpaca Paper REST API / Mock Feed
                  │
                  ▼
         [AlpacaReadClient] ──────────> Read-only (/v2/clock, /v2/account, options snapshots)
                  │
                  ▼
         [Snapshot Ingestion] ────────> Parse OCC contracts & compute SHA-256 canonical hashes
                  │
                  ▼
         [Candidate Factory] ─────────> Filter DTE, delta, liquidity, quotes (≤60s), width;
                                        assemble legal defined-risk spreads
                  │
                  ▼
         [Payoff & Max-Loss] ─────────> Decimal-exact standalone max loss, max gain, & limit price
                  │
                  ▼
         [Signals & Sizing] ──────────> 5d/20d SMA trend & 20d realized vol; size within 2% risk cap
                  │
                  ▼
     [Alpha Engine: propose()] ───────> Emit verifiable TradeIntent (with canonical intentHash)
                                        OR fail-closed ABSTAIN
                  │
                  ▼
         [Position Monitor] ──────────> Track open positions for 50% profit, 100% loss, or expiry
```

---

### 2. Module Guide for Contributors

All Lane A code is organized under `lib/` and is fully typed against `types/domain.ts`:

#### A. Alpaca Read Client (`lib/alpaca/`)
- [`lib/alpaca/client.ts`](file:///c:/Projects/Covenant/lib/alpaca/client.ts): Server-only client accessing `/v2/account`, `/v2/clock`, `/v2/assets`, `/v2/stocks/snapshot`, `/v2/stocks/bars`, and `/v1beta1/options/snapshots/{underlying}`.
- **Guaranteed:** Contains **zero** order-submitting or mutating methods.
- **Mock Mode:** Built-in `ALPACA_MOCK_MODE=true` generates realistic synthetic option chains and account snapshots for offline and weekend testing without API keys.

#### B. Alpha Engine & Sizing (`lib/alpha/`)
- [`lib/alpha/occ.ts`](file:///c:/Projects/Covenant/lib/alpha/occ.ts): OCC contract symbol parser (`parseOccSymbol`) and round-trip formatter (`formatOccSymbol`).
- [`lib/alpha/canonical.ts`](file:///c:/Projects/Covenant/lib/alpha/canonical.ts): Key-sorted canonical JSON serializer and SHA-256 hasher.
- [`lib/alpha/snapshots.ts`](file:///c:/Projects/Covenant/lib/alpha/snapshots.ts): Builds and cryptographically hashes `MarketSnapshot` and `AccountSnapshot` with point-in-time tamper detection (`verifySnapshotHash`).
- [`lib/alpha/payoff.ts`](file:///c:/Projects/Covenant/lib/alpha/payoff.ts): Standalone max loss, max gain, and limit price calculations using `Decimal` math.
- [`lib/alpha/factory.ts`](file:///c:/Projects/Covenant/lib/alpha/factory.ts): Filters option chains into valid defined-risk vertical spreads (**Bull Call Debit**, **Bear Put Debit**, and **Credit Verticals**).
- [`lib/alpha/signals.ts`](file:///c:/Projects/Covenant/lib/alpha/signals.ts): 5d/20d SMA trend detection and 20-day annualized realized volatility.
- [`lib/alpha/ranking.ts`](file:///c:/Projects/Covenant/lib/alpha/ranking.ts): Sizes trades to stay under `perTradeMaxLossPct` (e.g. 2%) and portfolio heat caps (e.g. 6%); applies model confidence multiplier $\in [0, 1]$ (veto/shrink only).
- [`lib/alpha/engine.ts`](file:///c:/Projects/Covenant/lib/alpha/engine.ts): Implements the frozen domain interface:
  ```ts
  propose(policy: Policy, market: MarketSnapshot, account: AccountSnapshot):
    Promise<{ intent: TradeIntent } | { abstain: true; reason: string }>;
  ```
- [`lib/alpha/loop.ts`](file:///c:/Projects/Covenant/lib/alpha/loop.ts): Unified autonomous tick orchestrator.

#### C. Position Monitor (`lib/monitor/`)
- [`lib/monitor/position-monitor.ts`](file:///c:/Projects/Covenant/lib/monitor/position-monitor.ts): Rule-based position monitor:
  - Harvests profit at $+50\%$ (`EXIT_PROFIT_TARGET`)
  - Enforces stop loss at $-100\%$ (`EXIT_STOP_LOSS`)
  - Forces close when DTE $\le 0$ before expiration (`EXIT_EXPIRATION_DEADLINE`)

---

### 3. How Other Lanes Consume Lane A

#### For Lane B (Safety Kernel & Executor):
```ts
import { propose, buildMarketSnapshot, buildAccountSnapshot } from "@/lib/alpha";
import { AlpacaReadClient } from "@/lib/alpaca";

// 1. Ingest read-only market state
const readClient = new AlpacaReadClient();
const rawAccount = await readClient.getAccount();
const accountSnapshot = buildAccountSnapshot(rawAccount);

const rawOptions = await readClient.getOptionSnapshots("SPY");
const marketSnapshot = buildMarketSnapshot("SPY", "500.00", rawOptions);

// 2. Alpha Engine proposes TradeIntent or ABSTAIN
const proposal = await propose(activePolicy, marketSnapshot, accountSnapshot);

if ("intent" in proposal) {
  // Pass proposal.intent to Lane B's Safety Kernel (evaluate(intent, policy))
  const kernelResult = await evaluate(proposal.intent, activePolicy);
}
```

---

## 🛠️ Getting Started & Commands

### 1. Installation
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*Note: If no API keys are provided in `.env.local`, Covenant runs automatically in **Mock Mode**, allowing complete testing and demonstration.*

### 3. Key Commands

| Command | Description |
| :--- | :--- |
| **`npm run tick`** | Runs the autonomous tick loop (`scripts/tick.ts`), logging clock, snapshots, ranking, max loss, and generated `TradeIntent`s. |
| **`npm run test`** | Executes the full Vitest suite (8 test suites, 30 tests including `fast-check` property tests). |
| **`npm run typecheck`** | Validates strict TypeScript compilation (`tsc --noEmit`). |
| **`npm run build`** | Builds the Next.js production app. |
| **`npm run dev`** | Starts the local Next.js development server at `http://localhost:3000`. |

---

## 🧪 Testing & Property Invariants

Lane A is thoroughly tested across 8 test suites:
- **Property-based tests (`tests/alpha/factory.test.ts`):** Proves mathematically via `fast-check` that candidate factory *never* emits undefined-risk spreads, *never* emits unknown symbols, and *always* outputs finite positive max loss.
- **Payoff exactness (`tests/alpha/payoff.test.ts`):** Validated against hand-computed values with zero floating-point drift.
- **Cryptographic integrity (`tests/alpha/snapshots.test.ts`):** Validates deterministic key-sorted JSON hashing and tamper detection.
- **Fail-closed checks (`tests/alpha/engine.test.ts`):** Verifies `ABSTAIN` returns when state is missing, stale, tampered, or below Level 3 options.

---

## ⚠️ Safety Boundary
Paper trading only. Not investment advice. Options involve significant risk. Paper results do not represent live execution and may omit slippage, liquidity constraints, or delays.
