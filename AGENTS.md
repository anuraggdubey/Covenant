<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# Covenant — agent entry point

**Read `IMPLEMENTATION.md` before writing any code in this repository.** It is the execution contract: authority order between documents, the five non-negotiables, lane ownership for the three builders, the frozen interfaces in `types/domain.ts`, the numbered task board, and the agent operating manual (§9) that governs branches, forbidden actions, and what "done" means.

The short version, so a cold start cannot go wrong:

- **Never build from `Covenant_Concept_Lock_v1.pdf`.** It is superseded. `INV-1…INV-6`, LTL-as-headline, the five-symbol universe, cash-secured puts, and the name "Bellatrix" are all dead. The invariants are `COV-01`…`COV-08`.
- **Powerless by construction.** Only `lib/execution/executor.ts` may write orders to Alpaca; only `lib/permits/sign.ts` reads the signing key; nothing under `lib/alpha/**` may import a broker credential. The browser never gets a credential or an order path.
- **Fail closed.** Missing, stale, inconsistent, or unverifiable state returns `ABSTAIN`. A model may only draft, veto, shrink, or explain — never activate, sign, submit, or widen.
- **Paper trading only.** No live endpoint, ever.
- **Stay in your lane.** Check the file ownership map in `IMPLEMENTATION.md` §5 before editing. Work one task ID per branch, named `lane-<a|b|c>/<task-id>-<slug>`.
- **Before claiming done,** run `npm run typecheck`, `npm run build`, `npm run test`, and `npm run verify -- demo/run_manifest.json`, and paste the real output.
