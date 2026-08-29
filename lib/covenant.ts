import type { CovenantComponent, DemoStep, Invariant, RiskProfile } from "@/types/covenant";

export const components: CovenantComponent[] = [
  {
    name: "Mandate Studio",
    authority: "Drafts typed policy from plain English, then waits for explicit activation.",
    output: "Versioned Policy JSON and plain-English echo",
    status: "draft"
  },
  {
    name: "Break Me Engine",
    authority: "Attacks policy invariants with generated hostile orders and portfolio states.",
    output: "Coverage report or minimized counterexample",
    status: "testing"
  },
  {
    name: "Alpha Engine",
    authority: "Ranks pre-approved SPY and QQQ defined-risk vertical spreads only.",
    output: "TradeIntent with contracts, thesis, limit, quantity, and expiry",
    status: "active"
  },
  {
    name: "Safety Kernel + Permit Executor",
    authority: "Signs exact short-lived TradePermits and submits only matching Alpaca paper orders.",
    output: "Decision Certificate and Alpaca order ID",
    status: "verified"
  }
];

export const invariants: Invariant[] = [
  {
    id: "COV-01",
    rule: "Every order exactly matches one unexpired, unused permit.",
    owner: "Executor"
  },
  {
    id: "COV-02",
    rule: "Every structure has finite standalone max loss within the per-trade cap.",
    owner: "Candidate factory + kernel"
  },
  {
    id: "COV-03",
    rule: "Conservative sum of standalone max losses stays under portfolio heat cap.",
    owner: "Kernel"
  },
  {
    id: "COV-04",
    rule: "No entry after daily halt until a verified new session.",
    owner: "State machine + executor"
  },
  {
    id: "COV-05",
    rule: "Quote age, spread width, DTE, delta, and liquidity remain inside mandate bands.",
    owner: "Kernel"
  },
  {
    id: "COV-06",
    rule: "No duplicate or economically equivalent exposure inside the cooldown window.",
    owner: "Kernel + nonce store"
  },
  {
    id: "COV-07",
    rule: "Exit workflow starts before deadline; failed closes escalate and disable entries.",
    owner: "Position monitor"
  },
  {
    id: "COV-08",
    rule: "Missing, stale, inconsistent, or unverified state returns ABSTAIN.",
    owner: "All stages"
  }
];

export const riskProfiles: RiskProfile[] = [
  {
    name: "Conservative",
    perTrade: "0.35%",
    portfolioHeat: "1.50%",
    dailyHalt: "-0.75%"
  },
  {
    name: "Balanced",
    perTrade: "0.60%",
    portfolioHeat: "2.50%",
    dailyHalt: "-1.25%"
  },
  {
    name: "Aggressive",
    perTrade: "1.00%",
    portfolioHeat: "4.00%",
    dailyHalt: "-2.00%"
  }
];

export const demoSteps: DemoStep[] = [
  {
    timebox: "0-12s",
    screen: "Mandate Studio",
    action: "Judge enters a mandate. Compiler flags forced trading versus abstention safety."
  },
  {
    timebox: "12-42s",
    screen: "Break Me",
    action: "Run hostile tests for oversized orders, stale quotes, replayed permits, and duplicate exposure."
  },
  {
    timebox: "42-70s",
    screen: "Live Candidate",
    action: "Rank legal SPY/QQQ spreads. The model may veto or shrink confidence, never widen."
  },
  {
    timebox: "70-90s",
    screen: "Proof Explorer",
    action: "Submit exact paper order, verify the trace, and compare governed versus shadow results."
  }
];
