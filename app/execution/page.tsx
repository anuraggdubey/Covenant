"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Governance {
  decision: string;
  reason: string;
  failedInvariants: string[];
  shrunkQuantity?: number;
  heldForOperator?: boolean;
  permit?: { permitId: string; expiresAt: string };
  execution?:
    | { submitted: true; orderId: string; requestId: string }
    | { submitted: false; code: string; reason: string };
}

interface TickUnderlying {
  symbol: string;
  marketSnapshotHash?: string;
  proposal: { intent?: { quantity: number; structure: string; standaloneMaxLoss: string } } & {
    abstain?: true;
    reason?: string;
  };
  governance?: Governance;
}

interface Tick {
  timestamp: string;
  dataMode: string;
  submissionMode: string;
  shadowMarksUpdated?: number;
  clock: { isOpen: boolean; nextOpen: string; nextClose: string };
  account: { id: string; equity: string; optionsLevel: number };
  session?: { state: string; sessionDate: string; haltReason: string | null };
  underlyings: TickUnderlying[];
  events?: { eventId: string; eventType: string }[];
}

interface History {
  totalTicks: number;
  summary: { intentsGenerated: number; abstainDecisions: number };
  recentTicks: Tick[];
}

interface Health {
  mode: "SYNTHETIC_MOCK" | "PAPER_TRADING";
  alpaca?: { marketOpen: boolean; equity: string };
}

const REFRESH_MS = 10_000;

function decisionClass(decision: string | undefined): string {
  switch (decision) {
    case "APPROVE":
      return "badge badge-emerald";
    case "SHRINK":
    case "ABSTAIN":
      return "badge badge-amber";
    case "VETO":
      return "badge badge-rose";
    default:
      return "badge";
  }
}

export default function ExecutionPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [historyResponse, healthResponse] = await Promise.all([
        fetch("/api/tick/history"),
        fetch("/api/health")
      ]);
      setHistory((await historyResponse.json()) as History);
      setHealth((await healthResponse.json()) as Health);
    } catch {
      /* leave the last good state on screen rather than blanking it */
    }
  }, []);

  const runTick = useCallback(async () => {
    setRunning(true);
    setLastError(null);
    try {
      const response = await fetch("/api/tick/run", { method: "POST" });
      const body = (await response.json()) as { ok: boolean; error?: string; durationMs?: number };
      setLastDurationMs(body.durationMs ?? null);
      if (!body.ok) setLastError(body.error ?? "Tick failed.");
      else setLastError(null);
      await load();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Tick request failed.");
    } finally {
      setRunning(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (timer.current !== null) clearInterval(timer.current);
    if (!autoRefresh) return;
    timer.current = setInterval(() => void load(), REFRESH_MS);
    return () => {
      if (timer.current !== null) clearInterval(timer.current);
    };
  }, [autoRefresh, load]);

  const latest = history?.recentTicks[0];

  return (
    <div className="page-container">
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Execution</p>
          <h1>The autonomous loop</h1>
          <p style={{ maxWidth: 620, color: "var(--text-secondary)" }}>
            One tick fetches the chain, proposes a candidate, runs all eight invariants, and either
            issues a signed permit or refuses. Submission to the broker stays gated behind{" "}
            <code className="mono">COVENANT_LIVE_SUBMIT</code>, so a tick is safe to run from here.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {health?.mode === "SYNTHETIC_MOCK" && (
            <span className="badge badge-amber">SYNTHETIC MOCK</span>
          )}
          <Link href="/shadow-ledger" className="btn-secondary" style={{ textDecoration: "none" }}>
            Shadow ledger →
          </Link>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Auto-refresh
          </label>
          <button className="btn-primary" onClick={() => void runTick()} disabled={running}>
            {running ? "Running…" : "Run tick"}
          </button>
        </div>
      </header>

      {lastDurationMs !== null && lastError === null && (
        <div className="glass-panel">
          <p className="eyebrow success-text">Tick completed</p>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Full cycle finished in <strong className="mono">{lastDurationMs}ms</strong>.
            {latest?.shadowMarksUpdated !== undefined && latest.shadowMarksUpdated > 0 ? (
              <>
                {" "}
                Shadow ledger updated <strong className="mono">{latest.shadowMarksUpdated}</strong>{" "}
                candidate mark{latest.shadowMarksUpdated === 1 ? "" : "s"}.
              </>
            ) : null}
          </p>
        </div>
      )}

      {lastError !== null && (
        <div className="glass-panel" style={{ borderColor: "var(--danger)" }}>
          <p className="eyebrow" style={{ color: "var(--danger)" }}>Tick failed</p>
          <p className="mono" style={{ margin: 0 }}>{lastError}</p>
        </div>
      )}

      <section className="grid-4">
        <div className="glass-panel">
          <span className="eyebrow">Ticks run</span>
          <strong style={{ fontSize: "1.5rem" }}>{history?.totalTicks ?? 0}</strong>
        </div>
        <div className="glass-panel">
          <span className="eyebrow">Intents generated</span>
          <strong style={{ fontSize: "1.5rem" }}>{history?.summary.intentsGenerated ?? 0}</strong>
        </div>
        <div className="glass-panel">
          <span className="eyebrow">Abstentions</span>
          <strong style={{ fontSize: "1.5rem" }}>{history?.summary.abstainDecisions ?? 0}</strong>
        </div>
        <div className="glass-panel">
          <span className="eyebrow">Submission</span>
          <strong style={{ fontSize: "1.5rem" }} className={latest?.submissionMode === "LIVE" ? "success-text" : "warning-text"}>
            {latest?.submissionMode ?? "—"}
          </strong>
        </div>
      </section>

      {latest === undefined ? (
        <section className="glass-panel-glow">
          <p className="eyebrow">No ticks yet</p>
          <p style={{ marginBottom: 12 }}>
            Nothing has run in this process. Press <strong>Run tick</strong> to execute one full
            cycle — chain fetch, candidate proposal, invariant evaluation, permit signing.
            {health?.mode === "SYNTHETIC_MOCK"
              ? " Mock mode is on, so this works even when the market is closed."
              : health?.alpaca?.marketOpen === false
                ? " The market is closed; set ALPACA_MOCK_MODE=true in .env.local for offline ticks."
                : null}
          </p>
          <button className="btn-primary" onClick={() => void runTick()} disabled={running}>
            {running ? "Running…" : "Run first tick"}
          </button>
        </section>
      ) : (
        <section className="glass-panel-glow">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p className="eyebrow">Latest tick</p>
              <h2 style={{ margin: 0 }}>{new Date(latest.timestamp).toLocaleTimeString()}</h2>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "0.8125rem" }}>
              <span><span className="eyebrow">Data</span><br /><strong>{latest.dataMode}</strong></span>
              <span><span className="eyebrow">Market</span><br /><strong className={latest.clock.isOpen ? "success-text" : "warning-text"}>{latest.clock.isOpen ? "Open" : "Closed"}</strong></span>
              <span><span className="eyebrow">Session</span><br /><strong>{latest.session?.state ?? "—"}</strong></span>
              <span><span className="eyebrow">Events</span><br /><strong className="mono">{latest.events?.length ?? 0}</strong></span>
              <span><span className="eyebrow">Shadow marks</span><br /><strong className="mono">{latest.shadowMarksUpdated ?? 0}</strong></span>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            {latest.underlyings.map((underlying) => {
              const governance = underlying.governance;
              return (
                <article key={underlying.symbol} className="glass-panel" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "1.05rem" }}>{underlying.symbol}</strong>
                    <span className={decisionClass(governance?.decision)}>
                      {governance?.decision ?? "NO CANDIDATE"}
                    </span>
                  </div>
                  <p style={{ color: "var(--text-secondary)", margin: "8px 0 0" }}>
                    {governance?.reason ?? underlying.proposal.reason ?? "The engine produced no candidate."}
                  </p>
                  {governance?.failedInvariants.length ? (
                    <p className="mono" style={{ margin: "8px 0 0", color: "var(--warning)" }}>
                      {governance.failedInvariants.join(" · ")}
                    </p>
                  ) : null}
                  {governance?.permit ? (
                    <p className="mono" style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>
                      permit {governance.permit.permitId} · expires{" "}
                      {new Date(governance.permit.expiresAt).toLocaleTimeString()}
                    </p>
                  ) : null}
                  {governance?.execution?.submitted === true ? (
                    <p className="mono success-text" style={{ margin: "8px 0 0" }}>
                      order {governance.execution.orderId}
                    </p>
                  ) : null}
                  {"intent" in underlying.proposal && underlying.proposal.intent ? (
                    <p className="mono" style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>
                      {underlying.proposal.intent.quantity} × {underlying.proposal.intent.structure} · max
                      loss ${underlying.proposal.intent.standaloneMaxLoss}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {history !== null && history.recentTicks.length > 1 && (
        <section>
          <h2 style={{ marginBottom: 12 }}>Tick history</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Session</th>
                  <th>Decisions</th>
                  <th>Events</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {history.recentTicks.map((tick) => (
                  <tr key={tick.timestamp}>
                    <td className="mono">{new Date(tick.timestamp).toLocaleTimeString()}</td>
                    <td>{tick.session?.state ?? "—"}</td>
                    <td>
                      {tick.underlyings
                        .map((u) => `${u.symbol} ${u.governance?.decision ?? "—"}`)
                        .join(", ")}
                    </td>
                    <td className="mono">{tick.events?.length ?? 0}</td>
                    <td>{tick.submissionMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
