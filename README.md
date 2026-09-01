# Covenant

**Strategy: defined-risk vertical spreads on SPY and QQQ.** Covenant is an autonomous options agent that sells or buys short-dated vertical spreads — bull call debits, bear put debits, and single-side credit verticals — on two of the most liquid underlyings in the US market, sized so that the maximum loss on every position is known in dollars before the order is sent. The thesis is that in a field where every agent now advertises "risk gates", the scarce thing is not refusal but *evidence*: a trader declares a mandate in plain English, Covenant compiles it into executable policy, attacks that policy with generated hostile market and account states before it is allowed to go live, and thereafter issues a signed, sixty-second permit for each order that survives. The strategy code cannot reach the broker. Only a separate executor can, and only with a permit bound to the exact contracts, quantity, price band, account snapshot and mandate version. Every approve, shrink, veto and abstain is hash-chained and replayable from one command.

> **Paper trading only.** Not investment advice. Options involve significant risk, including total loss of premium paid. Paper results are hypothetical, do not represent live execution, and omit slippage, liquidity constraints and queue position.

![Covenant authority boundary](docs/images/authority-boundary.svg)

---

## Why this shape

Options are a good fit for an autonomous agent for one specific reason: with a **vertical spread**, the worst case is arithmetic, not a forecast. Buy the SPY 560 call and sell the 565 against it for a $2.40 debit, and the most you can lose is $240 per contract — at any price, on any gap, through any halt. You do not need a stop-loss to be filled, a broker to be reachable, or a model to be right.

That is what makes the safety claim checkable instead of aspirational. `COV-02` is not "we try to limit losses"; it is a number the kernel computes from the legs and compares against the mandate before signing anything.

![Defined-risk payoff](docs/images/defined-risk-payoff.svg)

This is also why cash-secured puts and covered calls are deliberately **not** in scope. Their loss is not bounded by construction, which would quietly break the one claim the whole system is built around.

**Universe and bands.** SPY and QQQ only. 7–21 DTE. Delta, open interest, volume, bid/ask width and quote age all filtered against the active mandate. If nothing clears, the agent takes no trade — abstention is a logged decision, not a failure.

---

## How one trade works

![Trade lifecycle](docs/images/trade-lifecycle.svg)

The alpha engine reads the chain, builds only legal defined-risk structures, and ranks them on after-cost expected value. It produces a `TradeIntent` — a proposal. It has no broker credential and no order path, and a test walks the source tree to prove it.

The Safety Kernel then **re-fetches** account and market state rather than trusting what it was handed, evaluates all eight invariants, and does one of four things: approve, shrink, veto, or abstain. A shrink can only ever reduce quantity — and because a shrink rebuilds the intent at the smaller size, it gets a new hash, so the permit issued for it cannot be replayed against the original request.

The Permit Executor re-verifies the signature and every hash again before submitting. It holds the only Alpaca credentials in the process.

---

## The eight invariants

Each maps to exactly one enforced check, in one file, with at least one test that makes it fail for the reason it exists.

| ID | Invariant | Enforced at |
| --- | --- | --- |
| `COV-01` | Every order exactly matches one unexpired, unused permit | Permit Executor |
| `COV-02` | Finite standalone max loss within the per-trade cap | Safety Kernel |
| `COV-03` | Portfolio heat stays under the mandate cap | Safety Kernel |
| `COV-04` | No entry after a daily halt until a verified new session | Safety Kernel |
| `COV-05` | Quote age, spread width, DTE, delta and liquidity inside mandate bands | Safety Kernel |
| `COV-06` | No duplicate or equivalent exposure inside the cooldown window | Safety Kernel |
| `COV-07` | Exit workflow starts before deadline; failures disable new entries | Position Monitor |
| `COV-08` | Missing, stale, inconsistent or unverified state returns `ABSTAIN` | All stages |

`COV-03` sums standalone defined-risk envelopes rather than modelling true portfolio risk across overlapping positions. That is a conservative upper bound: it can overstate risk, never understate it, and it is easy to verify — which we prefer to a number nobody can check.

---

## Verify it yourself

No credentials. No network. From a fresh clone:

```bash
npm install
npm run verify -- demo/run_manifest.json
```

```text
Covenant replay verification
manifest demo/run_manifest.json
run      covenant-demo-run-1

  PASS  [REPRODUCED] chain.integrity — Every event hash re-derives and links.
  PASS  [RECORDED]   snapshot.market — Market snapshot matches its recorded hash.
  PASS  [REPRODUCED] invariants.reproduce — Failing invariants reproduce exactly: [COV-02].
  PASS  [REPRODUCED] permit.binding — Permit binds the SHRUNK intent (qty 2), not the 3-lot request.
  PASS  [REPRODUCED] order.matches-permit — Submitted order legs and quantity match the permit exactly.

24 passed, 0 failed (18 reproduced, 6 recorded)
Verified. Every deterministic check reproduced.
```

The two labels are the honest part, and the report never blurs them:

- **`RECORDED`** — a captured market or broker fact. We can prove it has not been altered since. We cannot prove it was true.
- **`REPRODUCED`** — a deterministic check re-run here, now, from the recorded inputs, producing the same answer.

Calling a market price "verified" would be a lie. Re-running all eight invariants on the recorded snapshot and getting the recorded verdict is not.

### The full audit

```bash
npm run audit
```

Checks every claim on this page that a machine can check — the capability boundary, paper-only endpoints, invariant coverage, the mandate corpus, the adversarial suite, replay, and secret hygiene. It exits non-zero the moment any of it stops being true.

```text
capability
  ok   The alpha lane holds no broker credential and no signing key.
  ok   The executor can verify a permit but cannot mint one.
paper-only
  ok   No live Alpaca endpoint appears in shipped code.
invariants
  ok   Registered: COV-01 … COV-08
  ok   Every invariant is named by at least one test.
replay
  ok   24 checks reproduced from 11 recorded events.
mandates
  ok   All 12 corpus mandates compile to the expected status and contradictions.
  ok   4 mandates are expected to be BLOCKED and every one of them is.
break-me
  ok   318 generated hostile states, no counterexample.
  ok   Every invariant fired at least once — none is merely asserted.
secrets
  ok   No real .env file is tracked by git.

23/23 checks passing
Audit clean.
```

---

## Quickstart

Requires Node 22+.

```bash
npm install
cp .env.example .env.local
npm run keygen        # prints the Ed25519 permit signing pair; paste into .env.local
```

Add your Alpaca **paper** credentials to `.env.local`, then:

```bash
npm run preflight     # checks the account is fresh, funded, and options level 3
npm run dev           # dashboard on http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dashboard: mandates, candidates, permits, execution, proof, shadow ledger |
| `npm run preflight` | T-00 readiness: account, equity, options level, multi-leg capability |
| `npm run tick` | One full cycle: snapshot, propose, evaluate all eight invariants, issue a permit or refuse |
| `npm run verify -- <manifest>` | Replay a run manifest. No credentials, no network |
| `npm run audit` | Every mechanically checkable claim in this README |
| `npm run test` | 231 tests across 22 files |
| `npm run typecheck` / `npm run build` | Types and production build |

---

## Layout

```text
lib/
  alpaca/          Read-only client: account, clock, assets, option chains
  alpha/           Candidate factory, payoff math, signals, ranking  ← no credentials
  mandates/        Plain English → typed policy, contradiction checks
  safety/          Eight invariant evaluators, session state machine, kernel
  permits/         Ed25519 sign / verify, TTL, nonce store
  execution/       Permit Executor  ← the only order-write path in the repo
  monitor/         Fills, exits, escalation
  break-me/        Property generators over hostile market and account states
  audit/           Hash-chained journal, run manifests, replay verifier
  shadow-ledger/   What each rule saved or cost
app/               Next.js App Router — eight pages and the API routes
docs/              Mandate corpus, walk-forward validation, demo script
demo/              The committed run manifest that `npm run verify` replays
```

Boundaries worth knowing before you edit: `lib/alpha/**` must never import a broker credential, `lib/permits/sign.ts` is the only reader of the signing key, and `lib/execution/executor.ts` is the only module that writes orders. All three are asserted by tests, not convention.

See **[IMPLEMENTATION.md](IMPLEMENTATION.md)** for lane ownership and the task board, and **[DESIGN.md](DESIGN.md)** for the design system — its colour tokens are checked against `app/globals.css` by a test, so the two cannot drift.

---

## Status

Covenant is a hackathon prototype. This table is the honest state of it, and `npm run audit` mechanically checks most of these rows.

| Capability | State |
| --- | --- |
| Read-only Alpaca adapter | **Implemented** — exact paper hosts, typed responses, option chain pagination, separate stock/options feeds |
| Canonical snapshot hashing | **Implemented** — one implementation shared by both lanes, so hashes cannot diverge |
| Candidate filters and payoff math | **Implemented** — fail-closed on Greeks and liquidity, signed debit/credit prices |
| Signals and ranking | **Implemented** — 5/20 trend, EWMA/range volatility, deterministic after-cost lower bound |
| Mandate compiler | **Implemented** — the 12-case corpus compiles to the expected status; all 4 contradictory mandates are blocked |
| Safety Kernel and the eight invariants | **Implemented** — COV-01…COV-08, fail-closed |
| Permit signing and executor | **Implemented** — Ed25519, 60s TTL, single-use nonce, exact-intent binding |
| Position exit evaluation | **Implemented** — exit monitoring and escalation |
| Break Me, replay verifier, Shadow Ledger | **Implemented** — 318 generated hostile states, 24 deterministic checks replayed |
| Live paper order | **Not done** — see below |
| Autonomous loop, end to end | **Implemented** — the tick routes every proposal through the kernel and issues a signed permit; the broker call is opt-in |
| Walk-forward performance validation | **Not available** — `npm run validate:walk-forward` reports `NOT_AVAILABLE` by design and prints no P&L, Sharpe or win rate until a verified dataset and split manifest are committed |

Two gaps we would rather name than paper over:

1. **No order has been placed against a live Alpaca paper account.** The execution path is complete and exercised end to end against a recording transport, but stage 5 of the permit lifecycle stays `BLOCKED` on the dashboard until a real broker order ID exists. `npm run preflight` reports exactly what is missing.
2. **Broker submission is opt-in, by choice.** The tick now runs the whole governance path — snapshot, propose, evaluate, sign — and then stops, holding a valid permit, unless `COVENANT_LIVE_SUBMIT=true`. A scheduled job that starts trading the moment a credential appears in its environment is not an agent anyone should run, so turning it on is a deliberate act. Governance runs either way, and the refusals are recorded either way.

3. **Open positions are only mapped when the book is empty.** An empty broker position list is a fact we can assert, so it maps to `[]`. Reconstructing `structure` and `standaloneMaxLoss` from raw legs is not implemented, so a non-empty book leaves it unset and COV-03, COV-06 and COV-07 abstain. That is the correct failure — guessing would understate portfolio risk — but it does mean the agent stops entering once it holds anything.

Passing typecheck and tests does not imply that paper execution exists. Where a claim is not yet true, the dashboard and this README say so.

---

## Ownership

**Lane A — Anurag.** Alpaca read path, candidate factory, payoff math, signals, ranking, position monitor, dashboard.
**Lane B — Demilade.** Mandate compiler, Safety Kernel and invariants, permits, executor, Break Me, event journal, verifier, Shadow Ledger.
**Lane C — Trading advisor.** Mandate corpus, risk calibration, walk-forward validation, demo script, submission QA.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the file ownership map and task board.

---

## Team

Built by Anurag, Demilade, and our trading advisor for the Alpaca AI Trading
Agents Hackathon, 28 Aug – 4 Sep 2026.
