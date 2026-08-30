# Covenant — Proof-Carrying Options Agent

> **Status:** Active · **Paper Trading Only** · **Alpaca AI Trading Agents Hackathon**

Covenant compiles plain-English trader mandates into versioned, typed policies, stress-tests them with adversarial counterexamples, and lets an Alpha Engine propose defined-risk SPY/QQQ vertical spreads that it **cannot execute** without a signed, short-lived `TradePermit`.

---

## 🏛️ Lane Ownership & System Boundaries

| Lane | Owner | Scope | Authority Invariant |
| :--- | :--- | :--- | :--- |
| **Lane A — Alpha & Market Data** | **Anurag** | Alpaca read client, snapshot hashing, candidate factory, payoff/max-loss math, ranking, `TradeIntent` emission, position monitor, autonomous loop (`npm run tick`), and all 8 frontend pages. | **Powerless by construction:** Never holds broker write credentials. |
| **Lane B — Safety, Permits & Proof** | **Demilade** | Safety Kernel (`COV-01`…`COV-08`), permit signing, Permit Executor (the **only** order write path), replay verifier, Break Me engine, and Shadow Ledger. | Strategy-blind deterministic gatekeeper. |
| **Lane C — Product & Validation** | **Trading Advisor** | Mandate corpus, risk calibration, 90s demo script, adversarial QA. | Narrative & validation anchor. |

---

## 🧭 System Navigation (The 8 Product Pages)

The app is accessible locally at `http://localhost:3000`:

1. **Overview (`/`):** Real-time system telemetry, $100k paper account health, the 8 enforced invariants (`COV-01`…`COV-08`), and a 1-click **"⚡ Run Autonomous Tick"** console.
2. **Candidate Lab (`/candidates`):** Real-time SPY & QQQ option chain browser, ranked vertical spreads, payoff distributions, and OCC leg breakdowns.
3. **Mandate Studio (`/mandates`):** Plain-English mandate editor, contradiction checks, and compiled policy JSON echo.
4. **Break Me (`/break-me`):** Property testing coverage viewer across 5 adversarial attack vectors.
5. **Permit Console (`/permits`):** Cryptographic TradePermit inspector showing live TTLs, nonces, exact legs, and Ed25519 signatures.
6. **Execution Blotter (`/execution`):** Alpaca paper multi-leg order blotter, open positions with 50% profit target / stop loss monitors, and emergency kill-switch.
7. **Proof Explorer (`/proof`):** Append-only hash-chained event timeline with 1-click run manifest replay verification.
8. **Shadow Ledger (`/shadow-ledger`):** Governed vs unconstrained shadow P&L comparison with exact rule-level dollar attribution.

---

## ⚡ How Lane A Works (The Alpha Pipeline)

```txt
1. Alpaca Read Client ──> Fetches /v2/clock, /v2/account, and SPY/QQQ option chains (Zero write methods).
           │
2. Snapshot Hashing   ──> Normalizes OCC contracts and generates SHA-256 canonical hashes for tamper detection.
           │
3. Candidate Factory  ──> Filters chains by DTE (7-45d), delta (0.2-0.8), quote freshness (≤60s), and spread width.
                          Assembles defined-risk spreads: Bull Call Debit, Bear Put Debit, and Credit Verticals.
           │
4. Payoff Engine      ──> Computes standalone max loss, max gain, and limit price via exact Decimal arithmetic.
           │
5. Signals & Sizing   ──> Computes 5d/20d SMA trends & 20d realized vol. Sizes trade within 2% equity risk cap ($2k).
                          Applies model confidence multiplier [0, 1] (veto or shrink only).
           │
6. propose() Emission ──> Emits a verifiable TradeIntent with canonical intentHash OR returns fail-closed ABSTAIN.
           │
7. Position Monitor   ──> Tracks open positions for +50% profit target, -100% stop loss, or expiration exit.
```

---

## 🔌 How Contributors Interact with Lane A

Lane B and testing scripts consume Lane A through clean, frozen interfaces:

```ts
import { AlpacaReadClient } from "@/lib/alpaca";
import { propose, buildMarketSnapshot, buildAccountSnapshot } from "@/lib/alpha";

// 1. Fetch read-only market state
const client = new AlpacaReadClient();
const accountSnapshot = buildAccountSnapshot(await client.getAccount());
const marketSnapshot = buildMarketSnapshot("SPY", "500.00", await client.getOptionSnapshots("SPY"));

// 2. Propose TradeIntent or Abstain
const result = await propose(activePolicy, marketSnapshot, accountSnapshot);

if ("intent" in result) {
  // Pass result.intent to Lane B Safety Kernel
  console.log("Intent proposed:", result.intent.id, result.intent.intentHash);
} else {
  console.log("Abstained:", result.reason);
}
```

---

## 💻 Essential Commands

```bash
# 1. Start Web Dashboard (all 8 interactive pages)
npm run dev

# 2. Run Autonomous Tick Loop (CLI output of clock, snapshots, ranking & TradeIntents)
npm run tick

# 3. Run Test Suite (32 tests across 9 suites, including fast-check property tests)
npm run test

# 4. Run 2-Year Walk-Forward Signal Validation
npm run validate:walk-forward

# 5. Typecheck & Production Build
npm run typecheck
npm run build
```

---

## ⚙️ Environment Configuration

- **Mock Mode (Default):** If no `.env.local` is provided, the app automatically runs in **Mock Mode** (`ALPACA_MOCK_MODE=true`), allowing full offline and weekend testing without API keys.
- **Live Paper Trading:** Create `.env.local` with:
  ```env
  ALPACA_API_KEY_ID=your_paper_key
  ALPACA_API_SECRET_KEY=your_paper_secret
  ALPACA_TRADING_BASE_URL=https://paper-api.alpaca.markets
  ALPACA_DATA_BASE_URL=https://data.alpaca.markets
  ALPACA_MOCK_MODE=false
  ```

---

## ⚠️ Safety Boundary
Paper trading only. Not investment advice. Options involve significant risk. Paper results do not represent live execution and may omit slippage, liquidity constraints, or delays.
