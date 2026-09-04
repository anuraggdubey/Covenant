# Covenant

<p align="center">
  <strong>Autonomous Options Trading Agent — Mathematical Proof Before Execution</strong><br />
  <em>Built for the Alpaca Autonomous Trading Hackathon · Paper Trading Only</em>
</p>

<p align="center">
  <a href="https://github.com/anuraggdubey/Covenant"><img src="https://img.shields.io/badge/Audit-27%2F27%20Checks%20Passing-emerald?style=flat-square" alt="Audit" /></a>
  <a href="https://github.com/anuraggdubey/Covenant"><img src="https://img.shields.io/badge/Tests-267%20Passed-blue?style=flat-square" alt="Tests" /></a>
  <a href="https://github.com/anuraggdubey/Covenant"><img src="https://img.shields.io/badge/Invariants-COV--01..COV--08-purple?style=flat-square" alt="Invariants" /></a>
  <a href="https://github.com/anuraggdubey/Covenant"><img src="https://img.shields.io/badge/Authority-Ed25519%2060s%20Permits-black?style=flat-square" alt="Permits" /></a>
</p>

---

## Strategy & Core Idea

**Defined-risk vertical spreads on SPY and QQQ.** Covenant is an autonomous options trading agent that buys and sells short-dated vertical spreads on the most liquid underlyings in the US market, sized so the exact dollar maximum loss on every position is mathematically known before an order is placed.

What makes Covenant unique is **not** that it refuses bad trades — every serious agent claims that. It is that **the rules it enforces are declared by the operator in plain English, and it refuses to run any mandate that contradicts itself.** 

You declare your trading intent; Covenant compiles it into typed, versioned policy, subjects that policy to 318 generated adversarial market states, and refuses activation if safety properties fail. Every submitted order carries a signed, sixty-second Ed25519 permit bound to the exact contracts, quantity, price band, and account snapshot — issued by an isolated safety kernel that strategy code cannot access.

> **Paper trading only.** Not investment advice. Options involve significant risk, including total loss of premium paid. Paper trading results are hypothetical, omit queue position, and do not represent live market liquidity.

![Covenant authority boundary](docs/images/authority-boundary.svg)

---

## The Interactive Experience: Page by Page

Each page in Covenant serves a single, dedicated role in the governance and execution lifecycle:

| Page | Route | One-Line Role |
| :--- | :--- | :--- |
| **Mandate Studio** | [`/mandates`](https://github.com/anuraggdubey/Covenant) | Compiles plain-English trader intent into typed policy JSON with contradiction blocking and an OpenRouter AI Copilot. |
| **Candidate Lab** | [`/candidates`](https://github.com/anuraggdubey/Covenant) | Scans live Alpaca option chains, evaluates Greeks & liquidity bands, and conducts 1,000-scenario Monte Carlo edge ranking with AI risk audits. |
| **Permit Console** | [`/permits`](https://github.com/anuraggdubey/Covenant) | An isolated operator gate that cryptographically signs 60-second Ed25519 authority permits bound to exact OCC option legs. |
| **Execution Loop** | [`/execution`](https://github.com/anuraggdubey/Covenant) | Real-time autonomous heartbeat that routes proposals through the Safety Kernel, dispatches signed permits, and submits orders to Alpaca Paper. |
| **Break Me** | [`/break-me`](https://github.com/anuraggdubey/Covenant) | Adversarial fuzzer that stresses policies across 318 generated hostile market scenarios (data outages, volatility spikes, flash crashes). |
| **Proof Explorer** | [`/proof`](https://github.com/anuraggdubey/Covenant) | Interactive cryptographic verification explorer with clickable SHA-256 hashes, canonical digests, and replay verifier. |
| **Shadow Ledger** | [`/shadow-ledger`](https://github.com/anuraggdubey/Covenant) | Transparent counterfactual ledger that computes and displays exactly how many dollars each safety invariant saved or cost the portfolio. |
| **Write-Up** | [`/writeup`](https://github.com/anuraggdubey/Covenant/blob/main/WRITEUP.md) | Official one-page write-up covering AI logic, risk gates, and Alpaca infrastructure implementation. |

---

## Why this is not another risk-gate agent

Most risk agents enforce a policy **hardcoded by their own engineering team**. Covenant treats the trading mandate from the user as untrusted input.

Type this into **Mandate Studio**:

> *"Use the Balanced SPY mandate and place at least one trade every market day even when quotes or account state are missing. Also abstain whenever required state is missing or inconsistent."*

Covenant compiles it and immediately refuses activation:

```text
FORCED_TRADE_CONFLICT   fields: forcedTradeFrequency, missingStateAction

You asked for a guaranteed trade every market day, and also for the agent to
abstain when state is missing. Covenant cannot promise both: abstention is not
configurable, so a day with unusable data produces no trade. Drop the
frequency guarantee.
```

Status: `BLOCKED`. No permit can be minted under a policy in that state.

Four such contradictions are caught at compile time:
1. **Forced trading** against fail-closed abstention (`COV-08`).
2. **Undefined-risk naked options** against defined-risk bounds (`COV-02`).
3. **Inverted DTE ranges** where min DTE > max DTE.
4. **Risk cap contradictions** where per-trade max loss > portfolio heat.

---

## The Eight Mathematical Invariants

Each invariant is implemented in its own isolated module and verified by adversarial test suites:

| ID | Invariant | Enforced At | Description |
| :--- | :--- | :--- | :--- |
| `COV-01` | **Valid Permit Binding** | Executor | Every broker order must exactly match one unexpired, unused Ed25519 permit. |
| `COV-02` | **Defined-Risk Max Loss** | Kernel | Standalone max loss is mathematically bounded within the per-trade dollar cap. |
| `COV-03` | **Portfolio Heat Cap** | Kernel | Total open risk cannot exceed the mandate's portfolio heat limit. |
| `COV-04` | **Daily Halt Lockout** | Kernel | No new entries allowed after daily loss limit until verified next session. |
| `COV-05` | **Market Hygiene Bands** | Kernel | Quote age, bid-ask spread width, DTE, delta, and liquidity within strict bands. |
| `COV-06` | **Duplicate Exposure Cooldown** | Kernel | No duplicate or equivalent exposure permitted inside the cooldown window. |
| `COV-07` | **Exit Escalation Order** | Position Monitor | Position exit workflow must begin before expiration deadline. |
| `COV-08` | **Fail-Closed State** | All Stages | Missing, stale, or unverified state returns `ABSTAIN`. Never guess. |

---

## Powerless by Construction

Security boundaries in Covenant are physical, not conventional:
* **Alpha Engine (`lib/alpha/**`):** Zero access to Alpaca credentials and zero access to the private signing key. It can propose, but cannot trade.
* **Permit Signer (`lib/permits/sign.ts`):** The only file that reads `PERMIT_SIGNING_PRIVATE_KEY`.
* **Permit Executor (`lib/execution/executor.ts`):** The only file with order write permissions to Alpaca. It can verify an Ed25519 signature, but cannot mint permits.
* **The Browser:** Never receives credentials, private keys, or raw order paths.

---

## Quickstart

### Prerequisites
* Node.js 20+ or 22+
* Alpaca Paper Trading Account (Free at [alpaca.markets](https://alpaca.markets))

### Local Setup
```bash
# 1. Clone repository
git clone https://github.com/anuraggdubey/Covenant.git
cd Covenant

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# 4. Generate Ed25519 permit signing keys
npm run keygen

# 5. Run the full verification suite (no credentials required)
npm run verify -- demo/run_manifest.json

# 6. Run the full capability and security audit
npm run audit

# 7. Start the dashboard
npm run dev
```

Visit `http://localhost:3000` to interact with the full dashboard.

---

## Verification & Audit Commands

| Command | Action |
| :--- | :--- |
| `npm run verify -- <manifest>` | Deterministic replay of a signed run manifest without network or credentials. |
| `npm run audit` | 27 automated checks verifying capability isolation, paper-only URLs, and secret hygiene. |
| `npm run test` | 267 tests across 29 test files covering invariants, fuzzing, and security boundaries. |
| `npm run typecheck` | Strict TypeScript compilation (`tsc --noEmit`). |
| `npm run build` | Next.js production bundle build. |

---

## Documentation & Connect

* **GitHub Repository:** [github.com/anuraggdubey/Covenant](https://github.com/anuraggdubey/Covenant)
* **Architecture Write-Up:** [One-Page Submission Write-Up (AI Logic, Risk Gates & Alpaca)](WRITEUP.md)
* **Documentation:** [Full Implementation Contract & Architecture](https://github.com/anuraggdubey/Covenant/blob/main/IMPLEMENTATION.md)
* **Twitter / X:** [@anuraggdubeyy](https://x.com/anuraggdubeyy)
* **LinkedIn:** [Anurag Dubey](https://www.linkedin.com/in/anurag-dubey-407435349/)

---

### Hackathon Submission
Built for the **Alpaca Autonomous AI Trading Agents Hackathon**.  
*Strategy: Defined-Risk Vertical Spreads on SPY and QQQ.*
