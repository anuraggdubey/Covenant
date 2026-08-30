# Covenant — Implementation Contract

**Status:** authoritative · **Locked:** 30 Aug 2026 · **Applies to:** all three builders and every AI coding agent operating in this repository.

This file is the single source of truth for *who builds what, in what order, against which interfaces, and what "done" means*. It does not restate the pitch — that lives in `Covenant_Concept_Lock_v2.pdf`. It exists so three people (and their agents) can work in parallel for five days without colliding, drifting, or rebuilding each other's assumptions.

---

## 0. Authority order — read this before you believe anything else

When two documents disagree, the higher one wins. No exceptions, no "but the PDF said."

| Rank | Document | Role |
| --- | --- | --- |
| 1 | **`IMPLEMENTATION.md`** (this file) | Execution contract: ownership, interfaces, order of work, done-criteria. |
| 2 | `Covenant_Concept_Lock_v2.pdf` | Product truth: what Covenant is, why it wins, the scope fence, kill criteria. |
| 3 | `next-steps.md` | Technical blueprint: schemas, endpoint maps, Alpaca surface, test plan. Deep reference, not a plan of record. |
| 4 | `README.md` | Public face. Must be rewritten Day 7; treat current content as draft copy. |
| — | `Covenant_Concept_Lock_v1.pdf` | **SUPERSEDED. Do not build from it.** Anything sourced from v1 — `INV-1…INV-6`, LTL formulas as the headline, the five-symbol universe, cash-secured puts, the name "Bellatrix" — is dead. If you see it in a prompt, a branch, or a teammate's message, correct it. |

**Cold-start read order for a new agent or a new pair of hands:** §1 → §3 → §5 → §6 → your lane in §4 → your tasks in §8 → §9. That is roughly ten minutes, and it is mandatory before the first line of code.

---

## 1. The spine, in one paragraph

A trader declares a mandate in plain English. Covenant compiles it into a versioned typed policy, attacks that policy with generated hostile states before it is allowed to go live, and thereafter lets an alpha engine propose defined-risk SPY/QQQ vertical spreads that it **cannot execute**. Only a separate Permit Executor holds Alpaca credentials, and it submits nothing without a signed, short-lived TradePermit bound to the exact legs, quantity, price band, account snapshot, market snapshot, and policy version. Every approve / shrink / veto / abstain is hash-chained and replayable from one command, and a shadow ledger measures what each rule saved or cost.

**Five non-negotiables.** Break any of these and the submission stops being Covenant:

1. **Powerless by construction.** The strategy code and the model never touch a broker credential. Exactly one module can call Alpaca's order endpoints.
2. **Fail closed.** Missing, stale, inconsistent, or unverifiable state returns `ABSTAIN`. Always. There is no "probably fine" path.
3. **Model authority is `draft | veto | shrink | explain`.** A model may never activate a policy, sign a permit, submit an order, widen a position, or author a contract symbol.
4. **Paper only.** Live endpoints are not configured, not allowlisted, not reachable.
5. **No unlabelled synthetic data, ever.** Simulated option payoffs are labelled `SYNTHETIC`. Shadow marks are never backfilled or retroactively selected.

---

## 2. Where we actually are — 30 Aug 2026

**Hackathon window:** 28 Aug – 4 Sep 2026. **Today is Day 3.**

| Day | Date | v2 plan expected | Actual |
| --- | --- | --- | --- |
| 1 | Fri 28 Aug | Paper account, Level 3, one manual multi-leg order, frozen schemas | Repo scaffolded |
| 2 | Sat 29 Aug | Chain ingestion, candidate engine, filters, sizing | Concept re-lock to v2, `next-steps.md` written |
| 3 | **Sun 30 Aug** | Safety kernel, permits, executor isolation | **Static marketing page. No backend exists.** |
| 4 | Mon 31 Aug | Autonomous loop live on paper | — |
| 5 | Tue 1 Sep | Mandate Studio, Break Me | — |
| 6 | Wed 2 Sep | Proof Explorer, verifier, Shadow Ledger, deploy | — |
| 7 | Thu 3 Sep | Walk-forward report, README, video, write-up | — |
| — | Fri 4 Sep | Submission | — |

**Honest repo audit.** What exists: a Next.js App Router scaffold, one static page at `/`, hard-coded display copy in `lib/covenant.ts`, UI-only types in `types/covenant.ts`, global CSS, and two planning documents. What does not exist: any Alpaca client, any API route, any schema validation, any test, any database, any permit, any event log, any `.env.example`, and any dependency discipline — `package.json` pins everything to `latest`, which quietly breaks the "fresh machine reproduces this" claim we are selling.

**So we are two days behind the plan of record, and the two days we lost are the two that matter most.** §7 is the compressed recovery plan. The compression is real: Days 2 and 3 of the v2 plan get executed in parallel across two lanes today and tomorrow, and the frontend does not get touched until a paper order is real.

**One rule dominates the next 48 hours:** *no work on pages, styling, or copy until a permit-bound multi-leg paper order has been accepted by Alpaca.* This is the v2 kill criterion, and it is now the schedule.

---

## 3. Ground rules that never bend

These are enforced in review. An agent that violates one has produced a defect regardless of whether tests pass.

**Authority boundaries**

- `ALPACA_API_SECRET_KEY` / `ALPACA_API_KEY_ID` are read in exactly two files: `lib/execution/executor.ts` (the order write path) and `lib/alpaca/client.ts` (read-only observation). Nothing under `lib/alpha/**` imports either.
- `PERMIT_SIGNING_PRIVATE_KEY` is read in exactly one file: `lib/permits/sign.ts`. The executor holds the **public** key only and verifies.
- The browser receives no credential, no signing key, and no path to submit an order. There is no `/api/alpaca/proxy`. Ever.
- Every Route Handler validates content-type, body size, and a Zod schema before touching a service. Provider errors are sanitised before they reach the client.

**Decision semantics**

- The decision enum is `APPROVE | SHRINK | VETO | ABSTAIN | EXECUTE | ESCALATE`. Do not invent a seventh.
- `SHRINK` may only reduce quantity or narrow the price band. A shrink that increases either is a bug, not a policy choice.
- A halt is a state-machine transition `ACTIVE → HALTED`, reset only on a *verified new market session* from `/v2/clock`. Not a timestamp comparison, not a date change.

**Naming lock** — these words are load-bearing for judging; use no synonyms:

Covenant · Mandate Studio · Break Me Engine · Alpha Engine · Safety Kernel · Permit Executor · TradePermit · Position Monitor · Proof Explorer · Shadow Ledger · Decision Certificate.

Retired: **Bellatrix** (internal history only — never in code, UI, README, commits, or social). The invariant IDs are `COV-01` … `COV-08` and nothing else.

**Scope fence** — building any of these is an automatic revert: a fifth-plus symbol, naked or undefined-risk structures, calendars, condors, an agent council or debate swarm, a general policy language, a theorem prover, blockchain or ZK anything, a second dashboard, or a fourth autonomous agent. Our four components are *roles with authority boundaries*, not four agents — say it that way to judges too.

**Changing anything in §6, or adding an invariant, symbol, structure, page, or dependency, requires a Decision Log entry in §12 and a ping to both leads.** Silent scope growth is the failure mode that kills this build.

---

## 4. The three lanes

One spine, three layers, one owner each. The lane boundary is also the *authority* boundary — which is the whole product thesis, so respecting it buys architectural integrity for free.

| Lane | Owner | Owns | Cannot |
| --- | --- | --- | --- |
| **A — Alpha & Market Data** | **Anurag** | Alpaca read path, chain ingestion, candidate factory, payoff and max-loss math, signals, ranking, `TradeIntent` emission, position monitoring, autonomous loop wiring, dashboard pages | Hold broker write credentials in alpha code; author contract symbols from a model; submit orders |
| **B — Safety, Permits & Proof** | **Demilade** | Policy schema and compiler, contradiction checks, Safety Kernel, all eight invariant evaluators, session state machine, permit sign/verify/TTL/nonce, Permit Executor, event journal, hash chain, replay verifier, kill switch | Generate strategy; override an abstain; change candidate ranking |
| **C — Mandate, Product & Edge Validation** | **Trading advisor** *(fill in the real name before submission — it goes on the credit line)* | The mandate corpus, risk-profile calibration, the judge-facing narrative, walk-forward signal validation, demo script and timing, the "Can you break our trader?" challenge, cold-run QA | Merge to `main` unreviewed; change invariants or risk caps unilaterally |

### Lane A — Anurag · Alpha & Market Data

**You are done when:** a scheduled run pulls fresh SPY/QQQ chains, filters them by mandate bands, builds legal vertical spreads with exact standalone max loss, ranks them after costs, and emits a `TradeIntent` or a logged `ABSTAIN` — with no manual code change between runs, and no broker write credential anywhere in the call graph.

Your critical outputs, in order: read-path client → snapshot persistence with hashes → candidate factory → payoff and max-loss → signal and ranking → intent emission → position monitor → dashboard.

### Lane B — Demilade · Safety, Permits & Proof

**You are done when:** four judge attacks — mutated contract, increased quantity, replayed nonce, expired TTL — each fail *before* any Alpaca call, and one command replays a committed run manifest on a machine that has never seen this repo, reporting signature validity, chain validity, and reproduced deterministic checks with `RECORDED` vs `REPRODUCED` labels.

Your critical outputs, in order: frozen schemas → policy compiler and contradiction checks → invariant evaluators → session state machine → permit sign/verify → executor with credential isolation → event journal → Break Me → verifier → Shadow Ledger.

### Lane C — Trading advisor · Mandate, Product & Edge Validation

This lane is deliberately off the critical path so it never blocks execution, and it owns the two things that decide the room: whether the demo lands, and whether the edge is credible.

**You are done when:** we have (a) a mandate corpus of at least 12 plain-English mandates, four of which *must* be caught as contradictory, with the expected compiled policy for each; (b) risk profiles calibrated to a $100k paper account with a written rationale per number; (c) a walk-forward validation summary over at least two years of SPY/QQQ underlying data across volatility regimes, with no in-sample headline metrics; (d) a 90-second demo script timed to the second with the exact keystrokes; (e) two cold runs executed as an adversarial judge and written up as bugs.

**Fallback (decide by Mon 31 Aug):** if this lane's owner is not writing code, items (a), (b), (d), and (e) stay theirs as written artefacts — they are documents, not commits — and item (c) transfers to Anurag as `T-A9`. Record it in the Decision Log; do not let it silently rot.

---

## 5. File ownership map

Do not edit outside your lane without a ping. This is what keeps five days of parallel work from becoming a merge war.

| Path | Owner | Note |
| --- | --- | --- |
| `lib/alpaca/**` | A | Read-path client; the write path is B's file only |
| `lib/alpha/**` | A | Candidate factory, signals, payoff math |
| `lib/monitor/**` | A | Position monitor, exit workflow |
| `lib/mandates/**` | B | Policy schema, compiler, contradiction checks |
| `lib/safety/**` | B | Invariant evaluators, session state machine |
| `lib/permits/**` | B | Sign, verify, TTL, nonce store |
| `lib/execution/**` | B | **Permit Executor. The only order-write path in the repo.** |
| `lib/audit/**` | B | Event journal, hash chain, manifests |
| `lib/break-me/**` | B | Generators, coverage, minimisation |
| `lib/shadow-ledger/**` | B | Marks and attribution |
| `lib/storage/**` | B | Schema and migrations; A reads through repositories |
| `types/domain.ts` | **shared — frozen** | §6. Changes require both leads |
| `types/covenant.ts` | A | Existing UI display types. Leave them alone; domain types go in `types/domain.ts` |
| `app/api/**` | owner of the service it calls | Thin handler: validate → call service → sanitise |
| `app/(pages)/**`, `components/**`, `app/globals.css` | A | Frontend, after execution is real |
| `tests/**` | owner of the code under test | B additionally owns all property tests |
| `docs/mandates/**`, `docs/demo/**`, `docs/validation/**` | C | |
| `package.json`, `next.config.ts`, `tsconfig.json`, this file | **shared — ping first** | |

---

## 6. Frozen interfaces

**These land first, today, before either lane writes a service.** They are the contract that lets Lane A and Lane B build simultaneously against something real instead of against each other's imagination. Once committed they are frozen: a change needs both leads and a Decision Log entry.

Put them in `types/domain.ts` (new file — do not touch `types/covenant.ts`, the page imports it), with Zod schemas mirrored in `lib/mandates/schema.ts` and `lib/permits/schema.ts`.

```ts
// types/domain.ts — FROZEN. Changes require both leads + Decision Log entry.

export type PolicyStatus = "DRAFT" | "TESTING" | "READY" | "ACTIVE" | "BLOCKED" | "ARCHIVED";
export type Decision = "APPROVE" | "SHRINK" | "VETO" | "ABSTAIN" | "EXECUTE" | "ESCALATE";
export type Structure = "BULL_CALL_DEBIT" | "BEAR_PUT_DEBIT" | "CREDIT_VERTICAL";
export type Underlying = "SPY" | "QQQ";
export type SessionState = "ACTIVE" | "HALTED";

export interface Policy {
  id: string;
  version: number;
  status: PolicyStatus;
  policyHash: string;                // sha256 of canonical JSON, excluding this field
  createdAt: string;
  activatedAt: string | null;
  plainEnglishEcho: string;
  allowedUnderlyings: Underlying[];  // default ["SPY","QQQ"]
  allowedStructures: Structure[];
  riskProfile: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  perTradeMaxLossPct: number;        // of equity
  portfolioHeatMaxLossPct: number;
  dailyHaltPct: number;              // negative
  minDte: number; maxDte: number;
  minDelta: number; maxDelta: number;
  maxQuoteAgeMs: number;
  maxBidAskWidthPct: number;
  minOpenInterest: number; minVolume: number;
  duplicateExposureCooldownMinutes: number;
  exitAttemptDeadlineMinutes: number;
  missingStateAction: "ABSTAIN";     // literal — not configurable
  modelAuthority: "VETO_OR_SHRINK";  // literal — not configurable
  invariants: string[];              // ["COV-01", ..., "COV-08"]
}

export interface Leg {
  symbol: string;                    // OCC contract symbol, e.g. SPY260116C00500000
  ratioQty: number;
  side: "buy" | "sell";
  positionIntent: "buy_to_open" | "sell_to_open" | "buy_to_close" | "sell_to_close";
}

export interface TradeIntent {
  id: string;
  policyId: string; policyHash: string;
  underlying: Underlying;
  structure: Structure;
  legs: Leg[];
  quantity: number;
  limitPrice: string;                // decimal string, never a float
  limitPriceBand: { min: string; max: string };
  timeInForce: "day";
  expiry: string;                    // contract expiry (ISO date)
  dte: number;
  standaloneMaxLoss: string;         // absolute dollars, decimal string
  portfolioHeatAfterTrade: string;
  alphaScore: number;
  modelConfidenceMultiplier: number; // [0,1] — may only shrink
  thesis: string;
  marketSnapshotHash: string;
  accountSnapshotHash: string;
  intentHash: string;                // sha256 of canonical JSON, excluding this field
  createdAt: string; expiresAt: string;
}

export interface TradePermit {
  permitId: string;
  policyId: string; policyVersion: number; policyHash: string;
  intentHash: string;
  accountSnapshotHash: string;
  marketSnapshotHash: string;
  exactLegs: Leg[];
  maxQuantity: number;
  limitPriceBand: { min: string; max: string };
  expiresAt: string;                 // TTL, default 60s
  nonce: string;
  createdAt: string;
  signingKeyId: string;
  signature: string;                 // Ed25519 over canonical JSON, excluding this field
}

export interface KernelResult {
  decision: Decision;
  permit?: TradePermit;
  finalIntent?: TradeIntent;   // the intent the permit is bound to (rebuilt on SHRINK)
  shrunkQuantity?: number;
  failedInvariants: string[];        // e.g. ["COV-03"]
  reason: string;                    // human-readable, shown on the dashboard
  evaluatedAt: string;
}
```

**Module boundary signatures** — implement exactly these, nothing wider:

```ts
// lib/alpha/engine.ts        (Lane A) — no credentials in this call graph
propose(policy: Policy, market: MarketSnapshot, account: AccountSnapshot):
  Promise<{ intent: TradeIntent } | { abstain: true; reason: string }>;

// lib/safety/kernel.ts       (Lane B) — re-fetches state itself; never trusts the caller's snapshots
evaluate(intent: TradeIntent, policy: Policy): Promise<KernelResult>;

// lib/execution/executor.ts  (Lane B) — the ONLY module that may write orders to Alpaca
submit(permit: TradePermit, intent: TradeIntent):
  Promise<{ orderId: string; requestId: string } | { rejected: true; reason: string }>;
```

Three properties make this contract do its job, and every review checks them: `propose` returns a value and has no broker side effects; `evaluate` re-fetches account and market state rather than trusting what it was handed; `submit` recomputes the intent hash and re-verifies the signature rather than trusting the kernel.

---

## 7. Compressed build order — the five days we have left

Each day has a hard exit test. If the exit test fails, the day is not over — cut scope from the *next* day, never from the current exit test.

### Day 3 — Sun 30 Aug · "Foundations and the read path" *(today)*

| Owner | Must ship |
| --- | --- |
| All (first 60 min, together) | `T-00` verify the paper account: fresh, $100k, **Level 3 options approved**, one manual multi-leg order placed by hand, order ID and account ID recorded in `docs/day1-evidence.md`. If Level 3 is not confirmed today, fire kill criterion K1 (§12) immediately. |
| A + B | `T-01` foundations: pin every dependency to an exact version, add Zod, Vitest, Drizzle, Neon Postgres, `.env.example`, server env validation that fails closed, and the `lib/` folder skeleton. |
| B | `T-02` commit `types/domain.ts` and the Zod mirrors. **Announce the freeze in the team channel.** |
| A | `T-A1` server-only Alpaca read client: account, clock, assets, SPY/QQQ option chain snapshots. `T-A2` persist account and market snapshots with canonical-JSON sha256 hashes. |
| C | `T-C1` mandate corpus v1 — 12 mandates, four of them contradictory, expected compiled policy for each. |

**Exit test:** `npm run typecheck` and `npm run build` pass; with real paper keys the app prints account equity, clock state, SPY/QQQ chain freshness, and two snapshot hashes; a real manual multi-leg order ID exists.

### Day 4 — Mon 31 Aug · "The irreversible path" *(the day that decides the submission)*

| Owner | Must ship |
| --- | --- |
| A | `T-A3` candidate factory: DTE, delta, liquidity, quote-age, and width filters; legal verticals only. `T-A4` exact standalone max-loss and payoff math. `T-A5` deterministic sizing and ranking; emit `TradeIntent` or `ABSTAIN`. |
| B | `T-B1` invariant evaluators COV-01…COV-08. `T-B2` session state machine. `T-B3` permit sign/verify, TTL, nonce store. `T-B4` Permit Executor with credential isolation and exact-order binding. |
| C | `T-C2` risk-profile calibration with a written rationale per number. |

**Exit test — both halves must hold before anyone sleeps:** four attacks (mutated contract, increased quantity, replayed nonce, expired TTL) each fail before any Alpaca call, proven by test; **and one permit-bound multi-leg order is accepted by Alpaca paper with a real order ID.**

*If the second half fails, all frontend work stays frozen on Day 5 and both leads work execution until it passes.*

### Day 5 — Tue 1 Sep · "Autonomy and the audit trail"

| Owner | Must ship |
| --- | --- |
| A | `T-A6` autonomous loop: `/api/cron/tick` (guarded by `CRON_SECRET`) and `npm run tick`, one code path. `T-A7` position monitor, exit workflow, escalation. |
| B | `T-B5` hash-chained append-only event journal covering every event type in `next-steps.md`. `T-B6` kill switch, fail-closed. `T-B7` mandate compiler and contradiction checks against C's corpus. |
| C | `T-C3` walk-forward validation summary — two years or more, regime-split, out-of-sample only. |

**Exit test:** a scheduled tick places or abstains with zero manual intervention and writes a complete verifiable event chain; all four of C's contradictory mandates are caught.

### Day 6 — Wed 2 Sep · "Proof surface"

| Owner | Must ship |
| --- | --- |
| B | `T-B8` Break Me: property generators, deterministic seed then randomised, counterexample minimisation, coverage pinned to `policyHash` and code revision. `T-B9` `npm run verify -- demo/run_manifest.json`. `T-B10` Shadow Ledger marks and attribution. |
| A | `T-A8` the pages: Overview, Mandate Studio, Break Me, Candidate Lab, Permit Console, Execution, Proof Explorer, Shadow Ledger. Deploy to Vercel. |
| C | `T-C4` demo script, timed to the second, with exact keystrokes. |

**Exit test:** a machine that has never seen this repo clones it and reproduces the committed run manifest; the deployed dashboard is reachable by URL.

### Day 7 — Thu 3 Sep · "Submission"

| Owner | Must ship |
| --- | --- |
| All | README rewritten (strategy name and thesis in paragraph one), one-page write-up, 90-second video opening on the live veto, deck, and every line of §11 green. |
| C | `T-C5` two cold runs as an adversarial judge, written up as bugs. Both fixed or explicitly accepted before submit. |

**Exit test:** cold demo succeeds twice, back to back, on a fresh clone, in under ten minutes of setup.

### Fri 4 Sep — submit early. Buffer only. No new code.

---

## 8. Task board

Format: `ID · owner · depends-on · exit test`. Claim a task by putting your initials and the date next to it in a PR that touches only that task.

**Shared — today, first**

- `T-00` · All · — · Paper account fresh, $100k, Level 3 confirmed, manual multi-leg order ID and account ID recorded in `docs/day1-evidence.md`.
- `T-01` · A+B · T-00 · 🟡 **PARTIAL (DA, 30 Aug)** — done: exact-pinned deps, Zod, Vitest, fast-check, tsx, `.env.example`, fail-closed env validation (`lib/env.ts`, paper-host allowlist), `lib/` skeleton, TS target ES2022. **Not done: Drizzle + Neon Postgres.** `npm run typecheck && npm run build` green.
- `T-02` · B · — · ✅ **DONE (DA, 30 Aug)** — `types/domain.ts` committed and frozen, including `MarketSnapshot` / `AccountSnapshot` / `OptionContract` / `OpenPosition` that Lane A needs. One amendment logged (`KernelResult.finalIntent`). Zod mirrors still to land with the route handlers.

**Lane A — Anurag**

- `T-A1` · T-01 · Read-only Alpaca client: `/v2/account`, `/v2/clock`, `/v2/assets`, `/v1beta1/options/snapshots/{underlying}`. Zero write methods on the type.
- `T-A2` · T-A1 · Snapshot persistence with canonical-JSON sha256; `feed` recorded on every market snapshot.
- `T-A3` · T-A2, T-02 · Candidate factory. Property test: never emits an undefined-risk structure, never a symbol absent from the fetched chain.
- `T-A4` · T-A3 · Standalone max loss and payoff after conservative spread and slippage assumptions. Unit-tested against hand-computed cases.
- `T-A5` · T-A4 · Signals (EWMA/range realised vol vs chain IV; 5/20-day trend), ranking on after-cost expected value, confidence gate. Emits `TradeIntent` or a logged `ABSTAIN`.
- `T-A6` · T-B4 · Autonomous loop, one code path for cron and CLI.
- `T-A7` · T-A6 · Position monitor: fills, exit attempts before deadline, escalation on failed close.
- `T-A8` · T-B5 · Eight pages plus Vercel deploy. **Blocked until Day 4's exit test passes.**
- `T-A9` · conditional · Absorb C's walk-forward validation if Lane C is non-coding. Decide 31 Aug.

**Lane B — Demilade**

- `T-B1` · T-02 · ✅ **DONE (DA, 30 Aug)** — eight evaluators in `lib/safety/invariants/cov-0n.ts`, registry in `index.ts` (COV-08 first), tested in `tests/safety/invariants.test.ts`. COV-03 sums standalone envelopes as a conservative upper bound.
- `T-B2` · T-B1 · ✅ **DONE (DA, 30 Aug)** — `lib/safety/session.ts`. Reset requires a different `sessionDate` from the broker clock; a mismatch between stored session state and clock abstains rather than resetting.
- `T-B3` · T-02 · ✅ **DONE (DA, 30 Aug)** — `lib/permits/{sign,verify,nonce}.ts`. Private key read in `sign.ts` only; executor holds the public half. Nonce is consumed after validation and immediately before the network call, so a rejected permit never burns its nonce.
- `T-B4` · T-B3 · 🟡 **PARTIAL (DA, 30 Aug)** — `lib/execution/executor.ts` written and all fourteen checks tested; the four judge attacks each reject with **zero transport calls** (`tests/execution/executor.attacks.test.ts`). **Still open: no real Alpaca paper order has been submitted** — blocked on `T-00` credentials and Level 3 approval. The second half of Day 4's exit test is not met until that order ID exists.
- `T-B5` · T-B4 · Hash-chained event journal, every event type from `next-steps.md`, append-only.
- `T-B6` · T-B5 · Kill switch: halt entries, optionally cancel open orders, fail closed on error.
- `T-B7` · T-C1 · Mandate compiler and contradiction checks. The model drafts; schema validation and explicit activation make it live.
- `T-B8` · T-B7 · Break Me: generators over orders, quotes, positions, P&L states, session transitions, and stale data; fixed seed first, then randomised; minimised counterexamples; fail-closed activation.
- `T-B9` · T-B5 · `npm run verify -- demo/run_manifest.json`. `RECORDED` vs `REPRODUCED` labels, exact mismatch event IDs.
- `T-B10` · T-B5 · Shadow Ledger: synchronised marks on the same schedule for approved, shrunk, vetoed, and abstained candidates; rule-level attribution; no backfill.

**Lane C — Trading advisor**

- `T-C1` · — · Mandate corpus: 12 mandates, at least 4 contradictory, expected compiled policy for each. `docs/mandates/`.
- `T-C2` · T-C1 · Risk profiles calibrated to $100k with a one-line rationale per number.
- `T-C3` · — · Walk-forward summary, two years or more of SPY/QQQ, regime-split, out-of-sample only, no in-sample headline metrics.
- `T-C4` · Day 5 exit · 90-second demo script, timed, with exact keystrokes. `docs/demo/`.
- `T-C5` · T-A8 · Two adversarial cold runs, written up as bugs.

---

## 9. Agent operating manual

Read this before you act. It applies to Claude Code, Codex, Cursor, and anything else generating code in this repository.

**Before writing anything**

1. Identify your task ID from §8. If the request does not map to a task ID, stop and ask which task it belongs to — do not invent scope.
2. Read §3 (ground rules), §5 (may I touch this path?), and §6 (frozen interfaces).
3. Check `Covenant_Concept_Lock_v2.pdf` for product intent and `next-steps.md` for the detailed schema or endpoint you need. Never build from `Covenant_Concept_Lock_v1.pdf`.

**While writing**

- One task per branch: `lane-<a|b|c>/<task-id>-<slug>`, e.g. `lane-b/T-B4-permit-executor`. One task per PR.
- Stay inside your lane's paths (§5). If a change genuinely requires a file you do not own, stop and say so in the PR description rather than editing it.
- Match the existing style: TypeScript strict, no `any`, the `@/` path alias, decimal strings for money (never floats), named exports, no default exports outside `app/`.
- Every money calculation gets a unit test with a hand-computed expected value. Every invariant gets a property test that tries to violate it.
- New dependency? Decision Log entry first (§12), pinned to an exact version, with a one-line justification.

**Before claiming done**

Run all four, and paste the real output — not a summary of what you expect:

```bash
npm run typecheck
npm run build
npm run test
npm run verify -- demo/run_manifest.json
```

If any of them fails, it is not done. Report the failure with its output rather than describing the change as complete.

**Never do these**

Move a credential read outside `lib/execution/**`, `lib/alpaca/client.ts`, or `lib/permits/sign.ts` · give the browser any path to submit an order · add a live-trading base URL · edit `types/domain.ts` without both leads · widen a trade in a `SHRINK` path · let a model author a contract symbol, activate a policy, or sign a permit · replace an `ABSTAIN` with a default · backfill or retroactively select a shadow mark · present synthetic option data without the `SYNTHETIC` label · use "Bellatrix" or `INV-1…6` anywhere · force-push, rewrite history, or commit `.env.local` · claim a test passed without running it.

**When you are blocked or uncertain**

Implement the fail-closed branch, write the assumption into the PR description under `Assumptions`, and flag it. Do not guess broker semantics — check `next-steps.md`'s endpoint table, then the live API against the paper account, then ask. A wrong guess about order semantics costs more than an hour of waiting.

**Handing a task to an agent — use this template**

> Repo: Covenant. Read `IMPLEMENTATION.md` §3, §5, and §6, then your task. You are working `T-B4` in Lane B (Demilade). You may edit only `lib/execution/**`, `lib/permits/**`, and `tests/**`. `types/domain.ts` is frozen — build against it, do not change it. Exit test: four attacks (mutated contract, increased quantity, replayed nonce, expired TTL) each fail before any Alpaca call, proven by test, plus one real permit-bound `mleg` paper order accepted with a recorded order ID. Run typecheck, build, and test, and paste the output.

---

## 10. Locked infrastructure decisions

Decided now so nobody spends Day 4 re-litigating them.

| Decision | Choice | Why |
| --- | --- | --- |
| Database | Neon Postgres + Drizzle from the start | Vercel's filesystem is ephemeral; SQLite would force a migration mid-week, and the judges must reach a deployed dashboard. |
| Validation | Zod, mirrored from `types/domain.ts` | One schema language across route handlers, policies, and permits. |
| Tests | Vitest plus fast-check for property tests | Property tests are the Break Me Engine's substrate, not an extra. |
| Signing | Ed25519 via `node:crypto` | No new dependency; keys in env; the kernel holds the private key, the executor holds the public one. |
| Money | Decimal strings end to end | Float drift in a max-loss calculation would falsify COV-02. |
| Scheduling | Vercel Cron → `/api/cron/tick` guarded by `CRON_SECRET`; identical path via `npm run tick` | One code path means the demo and production behave identically. |
| Verifier | **TypeScript**: `npm run verify -- demo/run_manifest.json` | The v2 PDF's `python -m covenant.verify` is superseded — this repo is TypeScript, and a second runtime would break "setup in under 10 minutes". Fix this line in the README and the deck. |
| Dependencies | Exact pins, committed lockfile | `"next": "latest"` in the current `package.json` makes a fresh clone unreproducible, which directly contradicts the claim we are selling. Fixed in `T-01`. |
| Data feed | `indicative` by default; `feed` stored on every snapshot | Replay must be able to label the provenance of every fact. |

---

## 11. Submission checklist — with an owner on every line

| ✓ | Requirement | Owner |
| --- | --- | --- |
| ☐ | Dedicated fresh Alpaca paper account, $100,000, **Level 3 confirmed**, account ID in the submission | All (T-00) |
| ☐ | Real multi-leg paper order IDs from the competition window | A |
| ☐ | Paper-only endpoint allowlist; no live URL anywhere in the repo | B |
| ☐ | Autonomous scheduled loop; failure returns ABSTAIN | A |
| ☐ | Strategy code provably has no broker credential | B |
| ☐ | Defined-risk verticals only; exact max loss; fresh quotes; spread and liquidity checks | A |
| ☐ | Versioned policy, plain-English echo, explicit activation, contradiction check | B |
| ☐ | Eight executable invariants, each mapped to one enforced check, each demonstrable | B |
| ☐ | Property coverage report pinned to policy hash and code revision | B |
| ☐ | Signed short-TTL permits; nonce and replay prevention; live tamper demo | B |
| ☐ | Hash-chained events, signed run manifest, one-command replay, RECORDED vs REPRODUCED | B |
| ☐ | At least one public self-correction posted | C |
| ☐ | Shadow Ledger: governed vs shadow, rule attribution, no backfill | B |
| ☐ | Walk-forward signal evidence; conservative costs; no unlabelled synthetic history | C |
| ☐ | Alpaca MCP and CLI each shown doing their intended job in README and demo | A |
| ☐ | Featherless integrated for typed mandate drafting (partner eligibility) | B |
| ☐ | Live dashboard deployed and reachable by judges | A |
| ☐ | README states the strategy name and thesis in paragraph one | All |
| ☐ | One-page write-up: AI logic, risk gates, Alpaca infrastructure | C |
| ☐ | 90-second video opening on the live veto | C |
| ☐ | Setup under 10 minutes from a fresh clone; cold demo twice | All |
| ☐ | Up to 5 build-in-public posts tagging @lablabai and @AlpacaHQ | C |
| ☐ | Paper-trading disclaimer on the live app and in the README | C |

---

## 12. Kill criteria and Decision Log

**Kill criteria — dated to our calendar. Firing one of these is a win, not a failure. Shipping a hollow claim is the failure.**

- **K1 · by noon Sun 30 Aug:** Level 3 multi-leg paper execution unconfirmed → ship one long debit vertical only, and delete every credit-spread claim from all copy.
- **K2 · by end of Mon 31 Aug:** permit isolation not demonstrable → cut "powerless by construction," call it a deterministic pre-trade gate, and say so plainly.
- **K3 · by end of Tue 1 Sep:** no live permit-bound paper order → freeze all frontend work until there is one.
- **K4 · by end of Wed 2 Sep:** Break Me produces no real counterexample → downgrade to a fixed adversarial conformance suite and stop saying "self-fuzzing."
- **K5 · anytime:** shadow marks incomplete → show candidate history without P&L attribution. Never backfill a favourable outcome.

**Decision Log** — append only, never edit a row.

| Date | Decision | Rationale | Decided by |
| --- | --- | --- | --- |
| 29 Aug 2026 | Concept re-lock v1 → v2 | LTL-as-headline cut; permits, Break Me, and Shadow Ledger become the differentiator | All |
| 30 Aug 2026 | Verifier is TypeScript, not Python | A second runtime breaks the 10-minute setup requirement | Both leads |
| 30 Aug 2026 | Neon Postgres + Drizzle; SQLite rejected | Vercel's filesystem is ephemeral; judges need a deployed dashboard | Both leads |
| 30 Aug 2026 | All dependencies pinned exactly | `latest` contradicts our own reproducibility claim | Both leads |
| 30 Aug 2026 | `KernelResult.finalIntent` added to the frozen set | A SHRINK rebuilds the intent (new size, new max loss, new hash). Without returning it the executor cannot submit the intent the permit signed, so SHRINK was unusable. Additive field, no existing consumer breaks. | Demilade |
| 30 Aug 2026 | TS target ES2017 → ES2022 | Money is fixed-point BigInt; BigInt literals need ES2020+ | Demilade |

---

## 13. Daily sync

Twice a day, ten minutes, written rather than spoken so the agents can read it too. Post in the team channel and mirror into `docs/standup.md`.

**Morning (start of day):** the task IDs I am taking today · what I need from the other lane and by when · anything that should fire a kill criterion.

**Evening (before sleep):** task IDs shipped, with the exit-test output pasted · task IDs slipped and their new date · one line on whether today's exit test in §7 actually passed.

If the day's exit test did not pass, the evening post must say so in the first line. We cut from tomorrow, never from the exit test.

---

*Paper trading only. Not investment advice. Options involve significant risk. Paper results are hypothetical, do not represent live execution, and may omit slippage, liquidity constraints, or delays.*
