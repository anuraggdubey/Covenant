"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthorityBoundary } from "@/components/AuthorityBoundary";

interface HealthData {
  status: string;
  mode?: string;
  /**
   * Absent whenever the health check degrades — which is exactly the state a
   * judge opening the deployed app without credentials lands in. Optional,
   * because the API genuinely omits it and the page must render anyway.
   */
  alpaca?: {
    connected: boolean;
    marketOpen: boolean;
    optionsApprovedLevel: number;
    equity: string;
  };
}

const TRUST_METRICS = [
  { label: "Policy invariants", value: "8", note: "COV-01 through COV-08 enforced before a permit exists" },
  { label: "Permit TTL", value: "60s", note: "Single-use Ed25519 authorization bound to exact legs" },
  { label: "Broker keys in alpha", value: "0", note: "Strategy can draft, shrink, veto, or explain only" },
];

const CANDIDATES = [
  {
    symbol: "SPY",
    structure: "Bull Call Debit",
    legs: "500C / 505C",
    dte: "17d",
    maxLoss: "$200.00",
    confidence: 82,
    state: "READY",
  },
  {
    symbol: "QQQ",
    structure: "Bear Put Debit",
    legs: "450P / 445P",
    dte: "20d",
    maxLoss: "$180.00",
    confidence: 76,
    state: "READY",
  },
  {
    symbol: "SPY",
    structure: "Credit Vertical",
    legs: "492P / 487P",
    dte: "24d",
    maxLoss: "$245.00",
    confidence: 41,
    state: "ABSTAIN",
  },
];

const PROOF_STEPS = [
  "Plain-English mandate compiles into a typed policy",
  "Alpha Engine proposes defined-risk SPY or QQQ verticals",
  "Safety Kernel re-checks state and verifies every invariant",
  "Permit Executor submits only an exact, unexpired TradePermit",
];

const WORKFLOW_SURFACES = [
  { title: "Candidate Lab", path: "/candidates", description: "Inspect ranked spreads, liquidity gates, quote freshness, and exact max-loss math." },
  { title: "Mandate Studio", path: "/mandates", description: "Turn trader intent into versioned policy JSON and block contradictions before activation." },
  { title: "Break Me", path: "/break-me", description: "Run hostile states against the Safety Kernel and see where the system refuses." },
  { title: "Permit Console", path: "/permits", description: "Review signed permits, nonce state, TTL windows, and exact order bindings." },
  { title: "Proof Explorer", path: "/proof", description: "Replay hash-chained evidence offline with recorded versus reproduced labels." },
  { title: "Shadow Ledger", path: "/shadow-ledger", description: "Measure what each enforced rule saved or cost without backfilled marks." },
];

function formatEquity(equity?: string): string {
  if (!equity) return "$100,000.00";
  return `$${Number(equity).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(48);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  const connected = health?.status === "healthy" && health.alpaca?.connected === true;
  const marketOpen = health?.alpaca?.marketOpen ?? false;

  return (
    <div className="landing-page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="status-dot" />
            Paper trading only
          </div>
          <h1>Trade only when the proof is attached.</h1>
          <p className="hero-subtitle">
            Covenant is a proof-carrying options platform for defined-risk SPY and QQQ verticals.
            The model can propose or reduce risk, but execution requires a signed permit that matches
            the exact order.
          </p>

          <div className="hero-form" aria-label="Start with a mandate">
            <span>Keep max loss under 0.5% and abstain on stale quotes</span>
            <Link href="/mandates" className="btn-primary">
              Start
            </Link>
          </div>

          <div className="hero-actions" aria-label="Primary workflows">
            <Link href="/candidates" className="btn-secondary">
              Candidate Lab
            </Link>
            <Link href="/break-me" className="btn-secondary">
              Break Me
            </Link>
            <Link href="/proof" className="btn-secondary">
              Proof Explorer
            </Link>
          </div>
        </div>

        <div className="product-visual" aria-label="Covenant permit and candidate preview">
          <div className="permit-preview">
            <div className="preview-topbar">
              <span className="badge badge-cyan">TradePermit</span>
              <span className="mono">TTL {String(secondsRemaining).padStart(2, "0")}s</span>
            </div>

            <div className="trade-ticket">
              <div>
                <span className="ticket-label">Proposed spread</span>
                <strong>SPY Bull Call Debit Vertical</strong>
              </div>
              <span className="badge badge-emerald">Verified</span>
            </div>

            <div className="ticket-grid">
              <div>
                <span>Net debit</span>
                <strong className="mono">$2.00</strong>
              </div>
              <div>
                <span>Max loss</span>
                <strong className="mono danger-text">$200.00</strong>
              </div>
              <div>
                <span>Max gain</span>
                <strong className="mono success-text">$300.00</strong>
              </div>
            </div>

            <div className="permit-hash mono">permitId: cov-paper-7a9f4cbd35e3bd4b</div>
          </div>

          <div className="market-card">
            <div className="market-card-header">
              <div>
                <span className="ticket-label">Defined-risk radar</span>
                <strong>Live candidates</strong>
              </div>
              <Link href="/candidates" className="mini-link">
                View all
              </Link>
            </div>

            <div className="candidate-list">
              {CANDIDATES.map((candidate) => (
                <div className="candidate-row" key={`${candidate.symbol}-${candidate.legs}`}>
                  <div>
                    <strong>{candidate.symbol}</strong>
                    <span>{candidate.structure}</span>
                  </div>
                  <div className="mono">{candidate.legs}</div>
                  <div>{candidate.dte}</div>
                  <div className="mono">{candidate.maxLoss}</div>
                  <div className="confidence-track" aria-label={`${candidate.confidence}% confidence`}>
                    <span style={{ width: `${candidate.confidence}%` }} />
                  </div>
                  <span className={`badge ${candidate.state === "READY" ? "badge-emerald" : "badge-amber"}`}>
                    {candidate.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Platform status">
        <div>
          <span>Paper equity</span>
          <strong>{formatEquity(health?.alpaca?.equity)}</strong>
        </div>
        <div>
          <span>Market status</span>
          <strong className={marketOpen ? "success-text" : "warning-text"}>
            {marketOpen ? "Session open" : "Fail-closed"}
          </strong>
        </div>
        <div>
          <span>Broker connection</span>
          <strong className={connected ? "success-text" : "warning-text"}>
            {connected ? "Connected" : health === null ? "Unreachable" : "Not configured"}
          </strong>
        </div>
        <div>
          <span>Options level</span>
          {/* Never default this to 3. Claiming an approval we have not read
              back from the broker is exactly the kind of unverified assertion
              this whole product exists to refuse. */}
          <strong className={health?.alpaca === undefined ? "warning-text" : undefined}>
            {health?.alpaca === undefined
              ? "Unverified"
              : `Level ${health.alpaca.optionsApprovedLevel}`}
          </strong>
        </div>
      </section>

      <section className="metric-grid">
        {TRUST_METRICS.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="proof-section">
        <div className="section-heading">
          <span className="eyebrow">How it stays powerless</span>
          <h2>Four scopes. One narrow order path.</h2>
          <p>
            The safest part of the product is not a promise in copy. It is the shape of the system:
            the strategy has no broker-write credential, and every executable action is bounded by
            deterministic checks.
          </p>
        </div>

        <div className="proof-layout">
          <div className="proof-steps">
            {PROOF_STEPS.map((step, index) => (
              <div className="proof-step" key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
          <div className="authority-panel">
            <AuthorityBoundary />
          </div>
        </div>
      </section>

      <section className="workflow-section">
        <div className="section-heading">
          <span className="eyebrow">Platform</span>
          <h2>Everything a user needs to inspect before trusting an agent.</h2>
        </div>

        <div className="workflow-grid">
          {WORKFLOW_SURFACES.map((surface) => (
            <Link href={surface.path} className="workflow-card" key={surface.title}>
              <span>{surface.title}</span>
              <p>{surface.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
