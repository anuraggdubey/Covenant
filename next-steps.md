# Covenant Next Steps

This document is the build blueprint for turning the current Next.js + TypeScript scaffold into the Covenant product described in `Covenant_Concept_Lock_v2.pdf`.

Current repo state:

- Next.js App Router project using TypeScript.
- One public page at `/`.
- Static Covenant domain data in `lib/covenant.ts`.
- Shared domain types in `types/covenant.ts`.
- Global styling in `app/globals.css`.
- Project setup docs in `README.md`.

Important Next.js 16 notes for this repo:

- Use the App Router under `app/`.
- Public pages are created with `page.tsx`.
- API endpoints are Route Handlers created with `route.ts`.
- A `page.tsx` and `route.ts` cannot live at the same route segment.
- Dynamic `params` and `searchParams` are async in Next.js 16.
- `next lint` is removed, so linting should use ESLint or the current `tsc --noEmit` script.
- Keep secrets in `.env.local` or deployment secrets. Do not expose broker credentials to Client Components.

## Product Goal

Covenant is a proof-carrying options agent. The product promise is:

1. A user writes a trading mandate in plain English.
2. Covenant converts it into typed policy.
3. Covenant tries to break the policy before it can become active.
4. The Alpha Engine can propose trades but cannot execute them.
5. The Safety Kernel evaluates every candidate against the active policy.
6. The Permit Executor submits only exact Alpaca paper orders that match a signed short-lived TradePermit.
7. Proof Explorer replays the full decision trace.
8. Shadow Ledger tracks what safety rules saved or cost.

The system must be paper trading only until every invariant, permit, replay, and kill switch is implemented and tested.

## User Flow

1. User opens the app and lands on the Covenant overview.
2. User connects or configures an Alpaca paper account.
3. User goes to Mandate Studio and writes a mandate.
4. Mandate Draft Agent produces a typed policy draft plus a plain-English echo.
5. User reviews the policy and runs Break Me.
6. Break Me Agent generates hostile test cases and either returns counterexamples or a passing coverage report.
7. User repairs contradictions and activates only a passing policy.
8. Alpha Agent fetches market/account data and proposes SPY/QQQ defined-risk vertical spreads or abstains.
9. Safety Kernel re-fetches state and either rejects, shrinks, abstains, or signs a TradePermit.
10. Permit Executor validates the permit and submits an exact Alpaca paper order.
11. Position Monitor watches order/position state and starts exits before policy deadlines.
12. Proof Explorer shows the hash-chained event log and replay verification result.
13. Shadow Ledger shows governed P&L, shadow P&L, missed upside, loss avoided, and rule attribution.

## Pages

Build 8 product pages plus API routes.

| Page | Route | Purpose | Main Users |
| --- | --- | --- | --- |
| Overview | `/` | Product status, demo path, current policy, active account health, latest proof status. | Judges, operators |
| Mandate Studio | `/mandates` | Draft, validate, compare, activate, archive mandates. | Trader/operator |
| Break Me | `/break-me` | Run adversarial policy tests, show coverage and minimized counterexamples. | Judges, safety lead |
| Candidate Lab | `/candidates` | Show option chains, ranked SPY/QQQ vertical spreads, abstentions, and alpha rationale. | Alpha lead, judges |
| Permit Console | `/permits` | Inspect permits, tamper tests, TTL/replay failures, exact intent binding. | Safety lead, judges |
| Execution | `/execution` | Alpaca paper order status, fills, cancellations, close workflow, kill switch. | Operator |
| Proof Explorer | `/proof` | Run manifest, hash chain, signature verification, recorded vs reproduced checks. | Judges, auditors |
| Shadow Ledger | `/shadow-ledger` | Governed vs shadow outcomes and rule-level attribution. | Judges, operator |

Recommended route structure:

```txt
app/
  page.tsx
  mandates/page.tsx
  break-me/page.tsx
  candidates/page.tsx
  permits/page.tsx
  execution/page.tsx
  proof/page.tsx
  shadow-ledger/page.tsx
  api/
    health/route.ts
    mandates/route.ts
    mandates/[policyId]/route.ts
    mandates/[policyId]/activate/route.ts
    break-me/route.ts
    candidates/route.ts
    permits/route.ts
    permits/[permitId]/route.ts
    execution/orders/route.ts
    execution/orders/[orderId]/route.ts
    execution/kill-switch/route.ts
    proof/runs/route.ts
    proof/runs/[runId]/route.ts
    proof/runs/[runId]/verify/route.ts
    shadow-ledger/route.ts
```

Use route groups later if the app needs separate layouts:

```txt
app/
  (public)/page.tsx
  (operator)/mandates/page.tsx
  (operator)/execution/page.tsx
  (proof)/proof/page.tsx
```

## Agents

Use 4 agents. The PDF explicitly rejects a fourth trading/intelligence agent, but it allows one model with narrow roles and separate authority boundaries. In the repo, keep the “agents” as backend modules, queues, and decision roles, not autonomous browser-visible personalities.

| Agent | Authority | Inputs | Outputs | Forbidden |
| --- | --- | --- | --- | --- |
| Mandate Draft Agent | Draft typed policy from user text. Ask clarifying questions. | Plain-English mandate, risk profile, account mode. | Draft Policy JSON, natural-language echo, contradiction warnings. | Activating policy, signing permits, calling Alpaca order endpoints. |
| Break Me Agent | Generate adversarial states and run policy tests. | Draft/active policy, invariant registry, seeds. | Coverage report, failing seed, minimized counterexample. | Repairing policy without user approval, calling Alpaca. |
| Alpha Agent | Generate/rank SPY/QQQ vertical spread intents. | Option chain, quotes, Greeks, account snapshot, active policy. | TradeIntent or ABSTAIN, score, thesis, confidence. | Broker credentials, order submission, widening after approval. |
| Execution Agent | Deterministic safety kernel plus permit executor. | TradeIntent, re-fetched market/account state, active policy. | Rejection, shrink, ABSTAIN, signed TradePermit, Alpaca order ID. | Free-form strategy generation, model override of safety rules. |

The Execution Agent should be split in code:

- Safety Kernel: deterministic policy evaluation and permit signing.
- Permit Executor: permit validation and Alpaca order submission.
- Position Monitor: order lifecycle, close attempts, escalation, halt state.

## How Agents Work

### Mandate Draft Agent

Step-by-step:

1. Accept plain English mandate.
2. Normalize risk words into constrained enums.
3. Draft `PolicyDraft`.
4. Validate schema.
5. Run contradiction checks.
6. Return DRAFT status.
7. Require explicit user activation.

Example contradiction checks:

- “Trade at least once daily” conflicts with `missing_state_returns_abstain`.
- “Grow account” cannot be encoded as a guaranteed rule.
- “Never lose money” cannot be guaranteed.
- “Close before max DTE” can only guarantee close attempts and escalation, not fills.

### Break Me Agent

Step-by-step:

1. Load policy draft and invariant registry.
2. Generate hostile orders, stale quotes, session transitions, P&L states, nonce replays, mutated permits, and duplicate exposure.
3. Run deterministic seed first.
4. Run randomized seeds after deterministic tests pass.
5. Minimize failing examples.
6. Pin coverage report to `policy_hash` and `code_revision`.
7. Keep policy in DRAFT if any invariant is failing or untested.

### Alpha Agent

Step-by-step:

1. Fetch Alpaca market clock.
2. Fetch account and positions.
3. Fetch SPY/QQQ assets and option chains.
4. Filter contracts by DTE, delta, liquidity, quote age, and spread width.
5. Build legal vertical spreads only.
6. Calculate standalone max loss and payoff distribution.
7. Apply volatility and direction signals.
8. Rank after-cost expected value.
9. Ask model for veto/shrink only, constrained to confidence multiplier `[0,1]`.
10. Emit `TradeIntent` or ABSTAIN.

Allowed structures:

- Bull call debit vertical.
- Bear put debit vertical.
- Single-side credit vertical aligned away from trend risk.
- ABSTAIN.

### Safety Kernel and Permit Executor

Step-by-step:

1. Receive a `TradeIntent`.
2. Re-fetch account, positions, quotes, and clock.
3. Hash account and market snapshots.
4. Evaluate all 8 invariants.
5. Reject, shrink, or abstain if any check fails.
6. Sign a short-lived `TradePermit` for the exact order.
7. Store nonce as unused.
8. Executor validates signature, TTL, nonce, policy hash, snapshot hashes, intent hash, legs, quantity, and price band.
9. Executor submits the exact multi-leg order to Alpaca paper.
10. Mark nonce used only after accepted submission attempt.
11. Record Alpaca `order_id` and `X-Request-ID`.

## Architecture

Use this separation:

```txt
Browser UI
  |
Next.js Route Handlers
  |
Application Services
  |
Domain Modules
  |
External Providers
```

Recommended folders:

```txt
app/                         Next.js pages and Route Handlers
components/                  Shared UI components
lib/
  alpaca/                    Alpaca clients and typed provider wrappers
  alpha/                     Candidate factory, signals, payoff math
  audit/                     Hash chain, manifests, event journal
  break-me/                  Property generators and coverage reports
  env/                       Server env validation
  mandates/                  Policy schema, compiler, contradiction checks
  permits/                   Permit schema, signing, verification, nonce store
  safety/                    Invariant evaluators and session state machine
  shadow-ledger/             Counterfactual marking and attribution
  storage/                   Database access
types/                       Shared TypeScript types
tests/                       Unit, property, API, and replay tests
scripts/                     CLI utilities and scheduled jobs
```

Backend services:

- `mandateService`: draft, validate, activate, version policies.
- `breakMeService`: run invariant property tests.
- `marketDataService`: fetch chains, snapshots, quotes, historical bars.
- `alphaService`: generate TradeIntent candidates.
- `safetyKernel`: evaluate invariants and issue permits.
- `permitService`: sign, verify, expire, and consume permits.
- `executionService`: submit/cancel/replace/read Alpaca paper orders.
- `positionMonitor`: monitor fills, exits, escalation, daily halt.
- `proofService`: build manifests and verify hash chains.
- `shadowLedgerService`: mark governed/shadow candidates and attribute deltas.

## Data Model

Start with Postgres plus Prisma or Drizzle. SQLite is acceptable for a hackathon demo, but Postgres is better for deployment.

Core tables:

- `users`: auth identity and role.
- `alpaca_accounts`: paper account metadata, account ID, options level, status.
- `policies`: versioned Policy JSON, policy hash, status, activated timestamp.
- `policy_tests`: seed, coverage, pass/fail, counterexample, code revision.
- `trade_intents`: candidate legs, thesis, alpha score, confidence, expiry.
- `market_snapshots`: chain/quote/greek snapshots, stale flags, hash.
- `account_snapshots`: buying power, equity, positions, daily P&L, hash.
- `permits`: signed permit, nonce, TTL, status, intent hash.
- `orders`: Alpaca order ID, status, request ID, permit ID, submitted payload.
- `positions`: normalized position state and exit workflow state.
- `events`: append-only hash-chained event log.
- `run_manifests`: replay manifest for one demo or scheduled run.
- `shadow_marks`: governed/shadow candidate marks and later valuation.
- `rule_attributions`: rule-level saved/lost estimates.

Policy status enum:

- `DRAFT`
- `TESTING`
- `READY`
- `ACTIVE`
- `BLOCKED`
- `ARCHIVED`

Decision enum:

- `APPROVE`
- `SHRINK`
- `VETO`
- `ABSTAIN`
- `EXECUTE`
- `ESCALATE`

## Internal API Endpoints

All internal endpoints live under `app/api/**/route.ts`. Validate every request body before use. Do not leak secrets or raw provider errors to the browser.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | `GET` | App, database, Alpaca connectivity, model connectivity, build revision. |
| `/api/mandates` | `GET` | List policies and status. |
| `/api/mandates` | `POST` | Create a policy draft from user mandate text. |
| `/api/mandates/[policyId]` | `GET` | Read one policy, echo, checks, and versions. |
| `/api/mandates/[policyId]` | `PATCH` | Update draft policy before activation. |
| `/api/mandates/[policyId]/activate` | `POST` | Activate only if schema, contradictions, and Break Me coverage pass. |
| `/api/break-me` | `POST` | Run property/adversarial checks for a policy. |
| `/api/candidates` | `GET` | List latest ranked candidates and abstentions. |
| `/api/candidates` | `POST` | Trigger one Alpha Engine candidate generation run. |
| `/api/permits` | `GET` | List permits and statuses. |
| `/api/permits` | `POST` | Evaluate a TradeIntent through the Safety Kernel and maybe issue permit. |
| `/api/permits/[permitId]` | `GET` | Inspect permit payload, hashes, TTL, nonce state. |
| `/api/execution/orders` | `GET` | List local and Alpaca order states. |
| `/api/execution/orders` | `POST` | Submit exact permit-bound paper order. |
| `/api/execution/orders/[orderId]` | `GET` | Read one order and Alpaca status. |
| `/api/execution/orders/[orderId]` | `DELETE` | Cancel one open order through executor. |
| `/api/execution/kill-switch` | `POST` | Halt new entries and optionally cancel open orders. |
| `/api/proof/runs` | `GET` | List run manifests. |
| `/api/proof/runs/[runId]` | `GET` | Fetch run manifest and event chain. |
| `/api/proof/runs/[runId]/verify` | `POST` | Replay deterministic checks and signature validation. |
| `/api/shadow-ledger` | `GET` | Governed/shadow P&L, rule attribution, missed upside, loss avoided. |

Public endpoints to avoid:

- Do not create a generic `/api/alpaca/proxy` endpoint.
- Do not expose raw Alpaca credentials to the client.
- Do not let the browser submit Alpaca orders directly.

## Alpaca API Endpoints

Use Alpaca paper trading only.

Base URLs:

- Trading paper API: `https://paper-api.alpaca.markets`
- Market data API: `https://data.alpaca.markets`
- Optional sandbox data stream: `wss://stream.data.sandbox.alpaca.markets`
- Live options stream when allowed: `wss://stream.data.alpaca.markets/v1beta1/{feed}`

Headers for Trading API and Market Data API:

```txt
APCA-API-KEY-ID: <paper key>
APCA-API-SECRET-KEY: <paper secret>
accept: application/json
content-type: application/json
```

Trading endpoints:

| Alpaca Endpoint | Method | Covenant Use |
| --- | --- | --- |
| `/v2/account` | `GET` | Account snapshot, buying power, options status, restrictions. |
| `/v2/clock` | `GET` | Market open/close, session state, daily halt reset logic. |
| `/v2/calendar` | `GET` | Trading days and session planning. |
| `/v2/assets` | `GET` | Validate tradable assets and `has_options` for SPY/QQQ. |
| `/v2/assets/{symbol_or_asset_id}` | `GET` | Validate SPY/QQQ details or contract symbols. |
| `/v2/orders` | `GET` | Sync open/closed/all order state. Use `nested=true` for multi-leg rollups. |
| `/v2/orders` | `POST` | Submit exact permit-bound order. For multi-leg options use `order_class: "mleg"`. |
| `/v2/orders/{order_id}` | `GET` | Read submitted order status. |
| `/v2/orders/{order_id}` | `PATCH` | Replace only if a fresh permit authorizes the replacement. |
| `/v2/orders/{order_id}` | `DELETE` | Cancel one order during exit or kill-switch flow. |
| `/v2/orders` | `DELETE` | Cancel all orders only in kill-switch flow. |
| `/v2/positions` | `GET` | Position snapshot for invariant checks and exit workflow. |
| `/v2/positions/{symbol_or_asset_id}` | `GET` | Read one position. |
| `/v2/positions/{symbol_or_asset_id}` | `DELETE` | Close one position when exit policy triggers. |
| `/v2/positions` | `DELETE` | Close all positions only for emergency halt after explicit operator action. |
| `/v2/account/activities` | `GET` | Fill/activity history for proof and P&L reconciliation. |

Multi-leg order shape:

```json
{
  "order_class": "mleg",
  "qty": "1",
  "type": "limit",
  "limit_price": "0.60",
  "time_in_force": "day",
  "client_order_id": "cov_<permit_nonce>",
  "legs": [
    {
      "symbol": "SPY260116C00500000",
      "ratio_qty": "1",
      "side": "buy",
      "position_intent": "buy_to_open"
    },
    {
      "symbol": "SPY260116C00505000",
      "ratio_qty": "1",
      "side": "sell",
      "position_intent": "sell_to_open"
    }
  ]
}
```

Market data endpoints:

| Alpaca Endpoint | Method | Covenant Use |
| --- | --- | --- |
| `/v2/stocks/{symbol}/snapshot` | `GET` | Underlying snapshot for SPY/QQQ. |
| `/v2/stocks/snapshots?symbols=SPY,QQQ` | `GET` | Batch underlying snapshots if enabled. |
| `/v2/stocks/bars` | `GET` | Historical bars for EWMA/range realized volatility and trend signals. |
| `/v2/stocks/trades/latest?symbols=SPY,QQQ` | `GET` | Latest underlying trade checks. |
| `/v2/stocks/quotes/latest?symbols=SPY,QQQ` | `GET` | Latest underlying quote checks. |
| `/v1beta1/options/snapshots/{underlying_symbol}` | `GET` | Option chain with latest trade, latest quote, IV, and Greeks. |
| `/v1beta1/options/snapshots?symbols=<contracts>` | `GET` | Batch snapshots for selected contracts. |
| `/v1beta1/options/quotes/latest?symbols=<contracts>` | `GET` | Latest bid/ask for selected contracts. |
| `/v1beta1/options/trades/latest?symbols=<contracts>` | `GET` | Latest trades for selected contracts. |
| `/v1beta1/options/trades?symbols=<contracts>&start=<time>&end=<time>` | `GET` | Historical option trades for validation and replay context. |
| `/v1beta1/options/bars?symbols=<contracts>&start=<time>&end=<time>` | `GET` | Historical option bars if needed for analysis. |

Market data feed config:

- Use `indicative` by default during free/paper development.
- Use `opra` when the account has the required subscription.
- Store `feed` in every market snapshot so replay can label facts accurately.

Alpaca MCP and CLI:

- Use Alpaca MCP for development/operator tools if available: account, clock, assets, option chain, snapshots, quotes, orders.
- Use Alpaca CLI for reproducibility and raw endpoint checks.
- The production app should still use typed server-side provider wrappers instead of calling shell commands.

## Environment Variables

Create `.env.example` and keep real values in `.env.local`.

Required for app runtime:

```txt
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/covenant

ALPACA_TRADING_BASE_URL=https://paper-api.alpaca.markets
ALPACA_DATA_BASE_URL=https://data.alpaca.markets
ALPACA_API_KEY_ID=
ALPACA_API_SECRET_KEY=
ALPACA_PAPER=true
ALPACA_DATA_FEED=indicative
ALPACA_ALLOWED_UNDERLYINGS=SPY,QQQ
ALPACA_OPTIONS_LEVEL_REQUIRED=3

PERMIT_SIGNING_PRIVATE_KEY=
PERMIT_SIGNING_PUBLIC_KEY=
PERMIT_TTL_SECONDS=60
PERMIT_NONCE_NAMESPACE=covenant-paper

MODEL_PROVIDER=
MODEL_API_KEY=
MODEL_NAME=
MODEL_TIMEOUT_MS=30000

APP_AUTH_SECRET=
CRON_SECRET=
KILL_SWITCH_CONFIRMATION=COVENANT_HALT
```

Optional for deployment/observability:

```txt
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
LOG_LEVEL=info
VERCEL_ENV=
VERCEL_GIT_COMMIT_SHA=
```

Optional for tests:

```txt
TEST_DATABASE_URL=
ALPACA_MOCK_MODE=true
PROPERTY_TEST_SEED=20260829
```

Rules:

- Never prefix Alpaca secrets with `NEXT_PUBLIC_`.
- Only expose non-secret public config with `NEXT_PUBLIC_`.
- Read runtime secrets only on the server.
- Validate env on server startup or first server request.
- Fail closed if any required Alpaca or permit env var is missing.

## Policy Schema

Initial `Policy` should include:

- `id`
- `version`
- `status`
- `created_at`
- `activated_at`
- `plain_english_echo`
- `allowed_underlyings`: default `["SPY", "QQQ"]`
- `allowed_structures`
- `risk_profile`
- `per_trade_max_loss_pct`
- `portfolio_heat_max_loss_pct`
- `daily_halt_pct`
- `min_dte`
- `max_dte`
- `min_delta`
- `max_delta`
- `max_quote_age_ms`
- `max_bid_ask_width_pct`
- `min_open_interest`
- `min_volume`
- `duplicate_exposure_cooldown_minutes`
- `exit_attempt_deadline`
- `missing_state_action`: always `ABSTAIN`
- `model_authority`: always `VETO_OR_SHRINK`
- `invariants`

Policy activation requirements:

1. Schema valid.
2. No unresolved contradictions.
3. All 8 invariants implemented.
4. Break Me deterministic seed passing.
5. Randomized seed run passing.
6. Policy hash pinned.
7. User explicitly activates.

## TradeIntent Schema

Fields:

- `id`
- `policy_id`
- `policy_hash`
- `underlying`
- `structure`
- `legs`
- `quantity`
- `limit_price`
- `limit_price_band`
- `time_in_force`
- `expiry`
- `dte`
- `standalone_max_loss`
- `portfolio_heat_after_trade`
- `alpha_score`
- `model_confidence_multiplier`
- `thesis`
- `market_snapshot_hash`
- `account_snapshot_hash`
- `created_at`
- `expires_at`

## TradePermit Schema

Fields:

- `permit_id`
- `mandate_hash`
- `policy_id`
- `policy_version`
- `intent_hash`
- `account_snapshot_hash`
- `market_snapshot_hash`
- `exact_legs`
- `max_quantity`
- `limit_price_band`
- `expires_at`
- `nonce`
- `created_at`
- `signing_key_id`
- `signature`

Permit validation must reject:

- Missing permit.
- Expired permit.
- Replayed nonce.
- Mutated legs.
- Mutated quantity.
- Mutated price outside band.
- Mismatched policy hash.
- Mismatched account snapshot hash.
- Mismatched market snapshot hash.
- Mismatched intent hash.
- Unsupported order type or time-in-force.

## Event Log and Proof

Every meaningful action writes an append-only event:

- `MANDATE_DRAFTED`
- `POLICY_VALIDATED`
- `CONTRADICTION_FOUND`
- `BREAK_ME_STARTED`
- `COUNTEREXAMPLE_FOUND`
- `POLICY_ACTIVATED`
- `MARKET_SNAPSHOT_RECORDED`
- `ACCOUNT_SNAPSHOT_RECORDED`
- `TRADE_INTENT_CREATED`
- `MODEL_VETOED`
- `MODEL_SHRANK`
- `KERNEL_REJECTED`
- `KERNEL_ABSTAINED`
- `PERMIT_SIGNED`
- `PERMIT_VALIDATED`
- `PERMIT_REPLAY_REJECTED`
- `ORDER_SUBMITTED`
- `ORDER_ACCEPTED`
- `ORDER_FILLED`
- `EXIT_ATTEMPTED`
- `HALT_TRIGGERED`
- `SHADOW_MARK_CREATED`
- `REPLAY_VERIFIED`

Hash chain fields:

- `event_id`
- `event_type`
- `payload_hash`
- `previous_event_hash`
- `event_hash`
- `timestamp`
- `code_revision`
- `actor`

One-command verifier target:

```bash
npm run verify -- demo/run_manifest.json
```

The verifier should:

1. Load manifest.
2. Validate schema versions.
3. Recompute policy, intent, snapshot, permit, and event hashes.
4. Verify permit signatures.
5. Re-run deterministic safety checks.
6. Confirm nonce transitions.
7. Confirm local order payload exactly matches permit.
8. Label market facts as `RECORDED`.
9. Label deterministic checks as `REPRODUCED`.
10. Report mismatches with exact event IDs.

## Testing Plan

Unit tests:

- Policy schema validation.
- Contradiction checks.
- Option payoff and max loss.
- Portfolio heat.
- Quote age and spread filters.
- Session state machine.
- TradeIntent hashing.
- Permit signing and verification.
- Nonce replay prevention.

Property tests:

- Oversized orders always fail.
- Expired permits always fail.
- Replayed permits always fail.
- Mutated legs always fail.
- Stale quote states return ABSTAIN.
- Missing account state returns ABSTAIN.
- Duplicate exposure inside cooldown fails.
- Daily halt blocks entries until verified new session.

Integration tests:

- Draft mandate -> Break Me -> activate.
- Generate candidate -> issue permit -> submit mocked Alpaca order.
- Tamper quantity after permit -> executor rejects before provider call.
- Kill switch -> no new entries and open orders canceled.
- Run manifest replay passes.

End-to-end tests:

- 90-second judge flow.
- Cold demo from fresh install.
- Mobile and desktop UI.
- Error states for missing env and Alpaca outage.

## Build Order

### Phase 1: Foundations

1. Add `.env.example`.
2. Add schema validation library.
3. Add test runner.
4. Add database/ORM.
5. Add domain folders under `lib/`.
6. Add shared UI shell and navigation.

Exit test:

- `npm run typecheck`
- `npm run build`
- Empty database migration succeeds.

### Phase 2: Mandate Studio

1. Implement `Policy` schema.
2. Implement mandate draft endpoint.
3. Implement contradiction checks.
4. Implement policy list/detail pages.
5. Implement explicit activation flow.

Exit test:

- Contradictory mandate stays DRAFT.
- Valid repaired mandate can become READY only after Break Me passes.

### Phase 3: Break Me

1. Implement invariant registry.
2. Implement deterministic adversarial fixtures.
3. Add property generators.
4. Show coverage and minimized failures.
5. Pin report to policy hash.

Exit test:

- Replayed permit attack fails.
- Mutated order attack fails.
- Stale data attack abstains.

### Phase 4: Alpaca Read Path

1. Add server-only Alpaca client.
2. Fetch account.
3. Fetch clock.
4. Fetch SPY/QQQ assets.
5. Fetch option chains and snapshots.
6. Persist account and market snapshots.

Exit test:

- With valid paper credentials, app shows account, clock, SPY/QQQ chain freshness, and snapshot hashes.

### Phase 5: Alpha Engine

1. Build SPY/QQQ candidate factory.
2. Calculate DTE, spreads, deltas, liquidity, max loss.
3. Implement realized volatility and trend signal.
4. Bootstrap payoff scenarios.
5. Emit TradeIntent or ABSTAIN.

Exit test:

- Candidate factory never emits naked options.
- Every candidate has finite max loss.

### Phase 6: Permits and Execution

1. Implement permit signing keys.
2. Implement nonce store.
3. Implement Safety Kernel.
4. Implement Permit Executor.
5. Submit exact Alpaca paper multi-leg order.
6. Store Alpaca order ID and request ID.

Exit test:

- Four judge attacks fail before Alpaca receives an order: changed contract, increased quantity, replayed permit, expired permit.
- One valid paper order can be submitted.

### Phase 7: Monitoring, Proof, Shadow

1. Implement order and position monitor.
2. Implement exit attempt workflow.
3. Implement hash-chained event journal.
4. Implement replay verifier.
5. Implement shadow ledger marks.
6. Build proof and shadow pages.

Exit test:

- Fresh machine can replay a committed run manifest.
- Governed and shadow rows share timestamps and marks.

### Phase 8: Submission Polish

1. Cold demo twice.
2. Add one-page write-up.
3. Add 90-second video path.
4. Add deployment docs.
5. Add public safety disclaimer.
6. Confirm no live credentials or live trading endpoint.

Exit test:

- Setup under 10 minutes.
- Live app demonstrates mandate -> attack -> veto -> permit -> Alpaca paper order -> replay.

## Security Rules

- Strategy/model code never receives broker credentials.
- Browser never receives broker credentials.
- Alpaca order submission exists only in Permit Executor.
- All Route Handlers validate content type, body size, schema, and auth.
- Provider errors are sanitized before returning to clients.
- Persist Alpaca `X-Request-ID` for support and audit.
- Kill switch must fail closed.
- Missing data must return ABSTAIN.
- A model can draft, veto, shrink, or explain. It cannot activate, sign, submit, or widen.

## Operational Rules

- Default universe: SPY and QQQ only.
- Default structures: defined-risk vertical spreads only.
- Default account: fresh Alpaca paper account.
- Default data feed: `indicative` unless OPRA is available.
- Default risk profile: Balanced unless user selects otherwise.
- Default permit TTL: 60 seconds.
- Daily halt state: `ACTIVE -> HALTED`, reset only at a verified new market session.
- Never present synthetic option simulation as real fills.
- Never backfill favorable shadow results.

## Definition of Done

The full Covenant project is done when:

1. A user can draft a mandate.
2. Contradictions are detected.
3. A policy cannot activate until Break Me passes.
4. Alpha Engine can generate only legal SPY/QQQ defined-risk verticals or abstain.
5. Safety Kernel signs exact permits only after re-fetching state.
6. Executor rejects mutated, expired, replayed, or oversized permits before Alpaca.
7. Executor can submit one valid Alpaca paper multi-leg order.
8. Proof Explorer can replay the run.
9. Shadow Ledger reports governed vs shadow outcomes.
10. The README and `.env.example` let a new developer set up the project quickly.

## Sources Checked

- Local product brief: `Covenant_Concept_Lock_v2.pdf`.
- Local Next.js 16 docs in `node_modules/next/dist/docs/`.
- Alpaca Trading API account, assets, orders, positions, clock, and activities documentation.
- Alpaca options trading, Level 3 multi-leg options, option snapshots, option chains, latest quotes, and option stream documentation.
