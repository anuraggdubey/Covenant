# Adversarial Cold-Run Report v1

Date: 30 Aug 2026
Revision tested: `a7c3a35`
Result: `BLOCKED_FOR_SUBMISSION`

Two independent clean working directories were created with `git clone --no-local`. Each installed exactly from `package-lock.json` using the existing npm cache. This tests checkout cleanliness and lockfile setup, but it is not equivalent to a new machine with a cold network cache; that limitation remains a final release gate.

## Cold Run 1

Directory: `Covenant-cold-run-20260830-1`
Elapsed: 106.01 seconds

Commands:

```powershell
git clone --no-local C:\Users\dell\Desktop\Covenant C:\Users\dell\Desktop\Covenant-cold-run-20260830-1
npm ci --offline
npm run typecheck
npm test
npm run build
$env:ALPACA_MOCK_MODE='true'
$env:ALPACA_PAPER='true'
npm run tick
npm run verify -- demo/run_manifest.json
```

Observed results:

- `npm ci --offline`: 93 packages installed, 0 vulnerabilities.
- Typecheck: passed.
- Tests: 10 files, 50 tests passed.
- Production build: passed; 10 static pages and 3 dynamic API routes.
- Tick: passed in explicit `SYNTHETIC_MOCK` mode and labelled its output before displaying intents.
- Verify: failed with `Missing script: "verify"`; exit code 1.

## Cold Run 2

Directory: `Covenant-cold-run-20260830-2`
Elapsed: 92.04 seconds

Commands:

```powershell
git clone --no-local C:\Users\dell\Desktop\Covenant C:\Users\dell\Desktop\Covenant-cold-run-20260830-2
npm ci --offline
npm run typecheck
npm test
npm run build
npm run tick
$env:ALPACA_MOCK_MODE='true'
$env:ALPACA_PAPER='true'
npm run dev -- -p 3102
```

Observed results:

- `npm ci --offline`: 93 packages installed, 0 vulnerabilities.
- Typecheck: passed.
- Tests: 10 files, 50 tests passed.
- Production build: passed.
- Tick without credentials and without explicit mock mode: failed closed with `Alpaca credentials are required unless ALPACA_MOCK_MODE=true`; exit code 1. This is correct behavior.
- Local server became ready and `/mandates` returned HTTP 200.
- Selecting the corpus's contradictory forced-trade mandate and pressing **Compile & Echo Policy** still displayed `ACTIVE`, a fixed policy hash, no contradictions, and all eight invariants bound.

## Bugs

### COLD-001 - P0 - Mandate Studio fabricates activation and contradiction success

Owner: Lane A UI plus Lane B mandate service
State: `OPEN - SUBMISSION BLOCKER`

Reproduction:

1. Start the app in explicit mock mode.
2. Open `/mandates`.
3. Select **Contradictory Mandate (Caught by Compiler)**.
4. Press **Compile & Echo Policy**.

Actual:

- Page remains `VERSION 1.0 - ACTIVE` and `ACTIVE`.
- Fixed hash `8f7a9d3e5b1c...9c0d` is displayed without a compiler or persisted policy.
- Page claims no contradictions and all eight executable invariants are bound.

Expected:

- Until Lane B exists, the page must display `NOT IMPLEMENTED` and no hash or activation result.
- After Lane B exists, this corpus case must remain `BLOCKED` with `FORCED_TRADE_CONFLICT`.
- No policy can become `ACTIVE` before schema validation, contradiction checks, deterministic and randomized Break Me coverage, versioning, hashing, and explicit activation.

Acceptance criterion:

An automated browser test selects M-09, submits it, and observes `BLOCKED` plus `FORCED_TRADE_CONFLICT`; no `ACTIVE` badge or success audit is present.

### COLD-002 - P0 - Required replay command does not exist

Owner: Lane B `T-B9`
State: `OPEN - SUBMISSION BLOCKER`

Reproduction:

```bash
npm run verify -- demo/run_manifest.json
```

Actual: npm reports a missing `verify` script.

Expected: TypeScript verifier exits 0 for the committed valid manifest, prints separate `RECORDED` and `REPRODUCED` facts, and names exact event IDs on mismatch.

Acceptance criterion:

The command succeeds twice from clean clones and fails deterministically for a one-byte manifest mutation.

### COLD-003 - P0 - No real execution evidence exists for the demo path

Owner: All for account evidence; Lane B for permit execution and journal
State: `OPEN - SUBMISSION BLOCKER`

Actual: no verified Level 3 account record, real competition-window permit-bound order ID, request ID, consumed nonce, complete event chain, or replay manifest is present.

Expected: all identifiers refer to one internally consistent Alpaca paper run and satisfy G-01 through G-07 in `release-gates.md`.

Acceptance criterion:

Record the evidence fields without secrets, run the four tamper attacks before-provider, and reproduce the manifest from both clean clones.

## Accepted Findings

- Explicit mock mode is clearly labelled and does not silently activate when credentials are absent.
- Missing Alpaca credentials fail closed.
- Lockfile installation, typecheck, tests, and production build complete well within the ten-minute setup target on this host with a warm npm cache.

## Required Disposition

None of the three open bugs is accepted for submission. They must be fixed or explicitly accepted by both leads before recording the demo. Lane C does not own the affected implementation paths and has not modified them.
