# Covenant

Covenant is a proof-carrying options agent concept for the Alpaca AI Trading Agents Hackathon.
It is framed as a mandate operating system: a trader declares a mandate, Covenant compiles it into executable policy, attacks that policy before activation, permits only exact approved trades, and records replayable proof for every broker action.

This repository is initialized as a Next.js + TypeScript app for the product surface described in `Covenant_Concept_Lock_v2.pdf`.

## Product Shape

- Mandate Studio: plain-English mandate drafting, typed policy output, contradiction checks, and explicit activation.
- Break Me Engine: property-style hostile testing against orders, positions, quotes, P&L states, sessions, and stale data.
- Alpha Engine: constrained SPY/QQQ options candidate generation for defined-risk vertical spreads.
- Safety Kernel + Permit Executor: short-lived TradePermits, exact order binding, nonce/replay prevention, and paper Alpaca execution.
- Proof Explorer: hash-chained event log, replay verifier, recorded-versus-reproduced labels, and decision certificates.
- Shadow Ledger: synchronized marks for approved, shrunk, vetoed, and abstained candidates.

## Tech Stack

- Next.js App Router
- TypeScript
- Plain CSS modules through `app/globals.css`

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build.
- `npm run start`: run the production build.
- `npm run lint`: run the Next.js lint command.
- `npm run typecheck`: run TypeScript without emitting files.

## Initial Scope

The current scaffold creates the front-end foundation and domain copy/data for the 90-second demo path. The next implementation layer should add:

- Policy JSON schema and contradiction checks.
- Property tests for the eight Covenant invariants.
- TradeIntent and TradePermit schemas.
- Permit signing, TTL, exact-intent binding, and nonce storage.
- Alpaca paper-trading integration behind an executor boundary.
- Replay verifier and hash-chained event journal.

## Safety Boundary

Paper trading only. Not investment advice. Options involve significant risk. Paper results do not represent live execution and may omit slippage, liquidity constraints, or delays.
