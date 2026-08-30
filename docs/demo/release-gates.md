# Demo Release Gates

The 90-second script is recordable only when every required gate is checked with actual evidence. A planned or mocked result does not satisfy a gate.

| Gate | Required evidence | Owner | State |
| --- | --- | --- | --- |
| G-01 | Fresh $100k Alpaca paper account, Level 3 confirmed, masked account ID recorded | All | BLOCKED |
| G-02 | Real manual competition-window multi-leg paper order ID | All | BLOCKED |
| G-03 | Four tamper attacks fail before any Alpaca call | Lane B | BLOCKED |
| G-04 | Signed 60-second TradePermit with atomic single-use nonce | Lane B | BLOCKED |
| G-05 | Permit-bound `mleg` accepted by Alpaca paper; order ID and `X-Request-ID` recorded | Lane B + A | BLOCKED |
| G-06 | Complete hash-chained event run for the same order | Lane B | BLOCKED |
| G-07 | `npm run verify -- demo/run_manifest.json` exits 0 on a fresh clone | Lane B | BLOCKED |
| G-08 | Deployed dashboard reachable without local credentials | Lane A | BLOCKED |
| G-09 | Final tab counts measured twice against deployed DOM | Lane C | BLOCKED |
| G-10 | No credentials, private keys, full account ID, or unrelated notifications visible | Lane C | BLOCKED |

## Evidence Record

Complete this table without embedding secrets:

| Field | Value |
| --- | --- |
| Build revision | NOT RECORDED |
| Deployment URL | NOT RECORDED |
| Run ID | NOT RECORDED |
| Permit ID | NOT RECORDED |
| Alpaca order ID | NOT RECORDED |
| Alpaca request ID | NOT RECORDED |
| Manifest SHA-256 | NOT RECORDED |
| First cold-run timestamp | NOT RECORDED |
| Second cold-run timestamp | NOT RECORDED |

## Video Integrity Check

Before export, watch the recording without narration and verify that the visible sequence alone proves: tamper, pre-provider veto, policy status, candidate provenance, signed permit, real paper order, event chain, and successful replay. If a fact exists only in narration, the demo is not ready.
