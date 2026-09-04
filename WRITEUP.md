# Covenant — Autonomous Options Trading Agent
### One-Page Architecture Write-Up: AI Logic, Risk Gates & Alpaca Infrastructure

**Covenant** is an autonomous options trading agent that trades defined-risk SPY and QQQ vertical spreads. Built for the Alpaca Autonomous AI Trading Hackathon, Covenant replaces unconstrained LLM execution with mathematical proofs, compile-time policy validation, and cryptographic authority boundaries.

---

### 1. AI Logic Implementation

Covenant treats AI models as untrusted analytical components operating under a strict capability boundary: **`draft | veto | shrink | explain`**. Models can never activate policy, sign permits, submit orders, widen risk, or author contract symbols.

* **Natural Language Mandate Compilation & Copilot (`lib/ai/client.ts`, `lib/mandates/compile.ts`):**  
  Operators specify investment objectives in plain English (e.g., target underlyings, DTE horizon, risk limits). An LLM Copilot drafts a structured mandate statement, which Covenant’s deterministic compiler transforms into a typed, versioned `Policy` JSON with canonical SHA-256 digests. Contradictions (e.g., guaranteed trade frequency vs. fail-closed abstention) are blocked at compile time.
* **Algorithmic Alpha & Candidate Ranking (`lib/alpha/`):**  
  Rather than letting an LLM hallucinate option legs, a deterministic factory scans live Alpaca option chains to construct valid vertical spreads (bull call, bear put debit/credit spreads). Spreads are evaluated using Black-Scholes Greeks, liquidity bands, and a 1,000-scenario Monte Carlo simulator to rank candidates by risk-adjusted expectancy net of slippage and exchange fees.
* **AI Multi-Factor Risk Auditing & Explanation:**  
  Candidate spreads are subjected to secondary LLM risk audits (`auditCandidateRisk`) that evaluate macroeconomic catalysts and regime risks, while an explanation generator (`explainCandidate`) translates quantitative trade rationale into transparent English for the operator.
* **Adversarial Self-Fuzzing (`Break Me` Engine, `lib/break-me/`):**  
  Prior to mandate activation, a fuzzing engine bombards policies with 318 generated hostile market scenarios (flash crashes, stale quotes, zero-bid anomalies, volatility spikes) to mathematically verify that invariant boundaries cannot be breached.

---

### 2. Risk Gates & Mathematical Invariants

Every trading decision must pass through an isolated **Safety Kernel** (`lib/safety/kernel.ts`) that re-fetches authoritative state. Covenant enforces eight formal invariants (**`COV-01` through `COV-08`**):

| Invariant | Name | Scope & Enforcement |
| :--- | :--- | :--- |
| **`COV-01`** | **Valid Permit Binding** | Every broker order must match an unexpired, unused Ed25519 cryptographic permit. |
| **`COV-02`** | **Defined-Risk Max Loss** | Max loss is mathematically bounded before entry; undefined-risk naked legs are rejected. |
| **`COV-03`** | **Portfolio Heat Cap** | Aggregate open dollar risk across all positions cannot exceed the mandate's portfolio heat limit. |
| **`COV-04`** | **Daily Halt Lockout** | Reaching daily loss limits triggers an irreversible halt (`ACTIVE` → `HALTED`), cleared only on a verified new session. |
| **`COV-05`** | **Market Hygiene Bands** | Rejects executions when quotes are stale (>15s), spreads exceed max width, or delta falls outside 0.15–0.45. |
| **`COV-06`** | **Duplicate Cooldown** | Blocks duplicate or correlated spread entries within specified cooldown intervals. |
| **`COV-07`** | **Exit Escalation Order** | Initiates automated exit workflows prior to expiration deadlines to eliminate assignment risk. |
| **`COV-08`** | **Fail-Closed State** | Any missing, stale, or inconsistent state deterministically triggers `ABSTAIN`. Never guess. |

* **Cryptographic Trade Permits (`TradePermit`, `lib/permits/`):**  
  Approved trades receive an ephemeral (60s TTL) Ed25519-signed permit bound to exact OCC option legs, quantities, limit price bands, account equity snapshot hash, and policy hash. Single-use nonces prevent replay attacks; any mutation to order parameters invalidates the signature.

---

### 3. Alpaca Infrastructure Implementation

Covenant interfaces with Alpaca via a strictly decoupled, capability-isolated architecture:

* **Physical Separation of Duties (Powerless by Construction):**  
  - **`lib/alpha/**`:** Operates with **zero** broker credentials and **zero** signing keys. Proposes intents only.
  - **`lib/permits/sign.ts`:** The **sole** module with access to `PERMIT_SIGNING_PRIVATE_KEY`.
  - **`lib/execution/executor.ts`:** The **sole** module with order-write access (`ALPACA_API_SECRET_KEY`). It holds only the permit *public* key and independently validates signatures, nonces, and price bands before network transmission.
  - **Browser UI:** Never receives credentials, private keys, or raw order endpoints. Verified by 27 automated audit checks (`npm run audit`).
* **Paper-Trading Only by Construction:**  
  Transport URLs are strictly locked to `https://paper-api.alpaca.markets` and `https://data.alpaca.markets`. Any non-paper endpoint triggers immediate runtime termination.
* **Market Data & Multi-Leg Execution (`POST /v2/orders`):**  
  - **Market Data v2:** Ingests real-time SPY/QQQ option chain snapshots, quotes, and bars via Alpaca REST and WebSocket streams.
  - **Multi-Leg Orders:** Executes spreads atomically using Alpaca’s `order_class: "mleg"` with exact OCC leg ratios, limit prices, `day` time-in-force, and unique `client_order_id` values derived from permit nonces.
* **Deterministic Replay & Shadow Ledger:**  
  Every quote, intent, permit, and Alpaca fill is SHA-256 hash-chained into an append-only event journal, enabling zero-credential offline verification (`npm run verify`). A counterfactual Shadow Ledger tracks vetoed intents to quantify the exact dollar P&L saved or foregone by each safety invariant.
