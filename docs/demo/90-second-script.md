# Covenant 90-Second Demo Script v1

Status: `BLOCKED_FOR_RECORDING`. The timing and narration are ready; the evidence gates in `release-gates.md` are not yet satisfied.

## Pre-Roll State

- Browser is signed out of unrelated services and set to 100% zoom.
- Deployed Covenant tab is open at `/break-me?fixture=mutated-quantity` with the mutated-quantity fixture selected.
- Terminal is open in the repository root with a clean prompt.
- A real competition-window paper run is selected. Account ID may be masked, but the Alpaca order ID, request ID, permit ID, and run ID must be real and internally consistent.
- Screen recording captures browser and terminal without exposing credentials.

For a local rehearsal, `BASE_URL` means `http://localhost:3000`. Replace it with the deployed URL before recording.

## Timed Run

| Time | Exact operator action | Exact narration | Required visible evidence |
| --- | --- | --- | --- |
| 00-04 | Press `Tab`, then `Enter` on **Run Mutated Quantity Attack**. | "Covenant starts with the attack, not the trade." | Attack changes quantity above the signed permit ceiling. |
| 04-12 | Do not touch input. Let the result settle. | "The Permit Executor rejects the changed order before Alpaca is called: signature valid, quantity binding failed, decision VETO." | `VETO`, failed binding name, zero provider calls, permit ID, intent hash prefix. |
| 12-18 | Press `Ctrl+L`; type `BASE_URL/mandates`; press `Enter`. | "A trader writes the mandate in plain English." | Mandate Studio loads with one corpus mandate selected. |
| 18-27 | Press `Tab` until **Compile Draft** is focused; press `Enter`. | "The model may draft, but deterministic checks own activation. Contradictions stay blocked." | Plain-English echo, typed policy candidate, blocker list, `DRAFT` or `BLOCKED`; never fake `ACTIVE`. |
| 27-33 | Press `Ctrl+L`; type `BASE_URL/candidates`; press `Enter`. | "The Alpha Engine reads Alpaca and emits only defined-risk SPY or QQQ verticals, or abstains." | Data provenance badge, exact OCC legs, quote age, max loss, confidence lower bound. |
| 33-41 | Press `Tab` until the first candidate row is focused; press `Enter`. | "Every candidate carries the account and market snapshot hashes used to calculate it." | Candidate detail with exact legs, quantity, price band, snapshot hashes. |
| 41-47 | Press `Ctrl+L`; type `BASE_URL/permits`; press `Enter`. | "The Safety Kernel can veto or shrink. Approval produces a short-lived, single-use TradePermit." | Real signed permit, policy hash, nonce state, TTL, exact intent binding. |
| 47-55 | Press `Ctrl+L`; type `BASE_URL/execution`; press `Enter`. | "Only the isolated Permit Executor holds the write credential, and it submits exactly the permitted multi-leg order." | Real Alpaca paper order ID and request ID; `mleg`; permit consumed once. |
| 55-61 | Press `Ctrl+L`; type `BASE_URL/proof`; press `Enter`. | "Each decision and provider response is appended to a hash-chained run." | Event chain with no gaps; selected run ID matches execution. |
| 61-66 | Press `Alt+Tab` to the prepared terminal. | "Now reproduce it outside the dashboard." | Clean repository-root terminal prompt. |
| 66-72 | Type `npm run verify -- demo/run_manifest.json`; press `Enter`. | "One command replays deterministic checks from the committed manifest." | Command is visible exactly as typed. |
| 72-82 | Wait for completion; do not scroll. | "Recorded facts stay recorded; reproduced checks are labelled separately. Signature, nonce, policy, snapshots, intent, and chain all verify." | Exit code 0; explicit `RECORDED` and `REPRODUCED` labels; no synthetic evidence. |
| 82-87 | Press `Alt+Tab` back to Proof Explorer. | "The agent proposes. The covenant decides. The executor cannot improvise." | Matching run ID and green verification state. |
| 87-90 | No input. Hold on the verification result. | "Covenant: paper trading with proof before power." | Paper-trading disclaimer remains visible. |

## Exact Keystroke Sequence

```text
Tab Enter
Ctrl+L BASE_URL/mandates Enter
Tab... Enter
Ctrl+L BASE_URL/candidates Enter
Tab... Enter
Ctrl+L BASE_URL/permits Enter
Ctrl+L BASE_URL/execution Enter
Ctrl+L BASE_URL/proof Enter
Alt+Tab
npm run verify -- demo/run_manifest.json Enter
Alt+Tab
```

The two `Tab...` sequences must be replaced with counted presses after the final deployed DOM is frozen. Recording is blocked until `release-gates.md` records those counts from two cold runs.

## Cut Rules

- If no real permit-bound paper order exists, remove the execution claim and do not record this script.
- If `npm run verify` is absent or fails, do not substitute screenshots or narrated expected output.
- If the Break Me implementation is a fixed conformance suite rather than generated attacks, call it that.
- If any displayed source is synthetic, keep `SYNTHETIC` visible and do not show it adjacent to real execution evidence without explanation.
- Never say the current trend feature is a proven alpha source; Lane C validation does not support that claim.
