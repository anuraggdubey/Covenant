"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Row {
  candidateId: string;
  underlying: string;
  structure: string;
  decision: string;
  failedInvariants: string[];
  requestedQuantity: number;
  governedQuantity: number;
  markPerContract: string;
  governedPnl: string;
  shadowPnl: string;
  delta: string;
  markedAt: string;
}

interface LedgerResponse {
  candidates: number;
  empty: boolean;
  emptyReason: string | null;
  report: {
    candidates: number;
    governedPnl: string;
    shadowPnl: string;
    safetyDelta: string;
    lossAvoided: string;
    missedUpside: string;
    attribution: { invariant: string; interventions: number; lossAvoided: string; upsideForgone: string }[];
    caveat: string;
  };
  rows: Row[];
}

function money(value: string): string {
  const parsed = Number(value);
  const sign = parsed > 0 ? "+" : "";
  return `${sign}$${value}`;
}

function toneFor(value: string): string | undefined {
  const parsed = Number(value);
  if (parsed > 0) return "success-text";
  if (parsed < 0) return "warning-text";
  return undefined;
}

export default function ShadowLedgerPage() {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [runningTick, setRunningTick] = useState(false);
  const [tickError, setTickError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/shadow-ledger");
      setData((await response.json()) as LedgerResponse);
    } catch {
      /* keep the last good state */
    }
  }, []);

  const runTick = useCallback(async () => {
    setRunningTick(true);
    setTickError(null);
    try {
      const response = await fetch("/api/tick/run", { method: "POST" });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!body.ok) setTickError(body.error ?? "Tick failed.");
      await load();
    } catch (error) {
      setTickError(error instanceof Error ? error.message : "Tick request failed.");
    } finally {
      setRunningTick(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [load]);

  const report = data?.report;

  return (
    <div className="page-container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Shadow Ledger</p>
          <h1>What the rules cost, and what they saved</h1>
          <p style={{ maxWidth: 700, color: "var(--text-secondary)" }}>
            Every candidate the kernel saw is marked here — approved, shrunk, vetoed or abstained —
            on the same schedule, so the comparison is like-for-like. Marking only the approvals
            would be the selection bias this page exists to measure.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/execution" className="btn-secondary" style={{ textDecoration: "none" }}>
            Execution →
          </Link>
          <button className="btn-primary" disabled={runningTick} onClick={() => void runTick()}>
            {runningTick ? "Running…" : "Run tick"}
          </button>
        </div>
      </header>

      {tickError !== null && (
        <div className="glass-panel" style={{ borderColor: "var(--danger)" }}>
          <p className="mono" style={{ margin: 0 }}>{tickError}</p>
        </div>
      )}

      {data?.empty === true ? (
        <section className="glass-panel-glow">
          <p className="eyebrow">Nothing marked yet</p>
          <p style={{ marginBottom: 12 }}>{data.emptyReason}</p>
          <button className="btn-primary" disabled={runningTick} onClick={() => void runTick()}>
            {runningTick ? "Running tick…" : "Run a tick to populate the ledger"}
          </button>
        </section>
      ) : (
        report !== undefined && (
          <>
            <section className="grid-2">
              <article className="glass-panel-glow" style={{ borderLeft: "3px solid var(--success)" }}>
                <p className="eyebrow">Column A — What actually happened</p>
                <h2 style={{ margin: "4px 0 2px" }}>Governed</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: "0.8125rem" }}>
                  The size the kernel allowed, at the current mark.
                </p>
                <strong className={toneFor(report.governedPnl)} style={{ fontSize: "2.25rem", letterSpacing: "-0.02em" }}>
                  {money(report.governedPnl)}
                </strong>
                <p style={{ marginTop: 12, marginBottom: 0, color: "var(--text-secondary)" }}>
                  Loss avoided by refusing or shrinking:{" "}
                  <strong className="mono">${report.lossAvoided}</strong>
                </p>
              </article>

              <article className="glass-panel" style={{ borderLeft: "3px solid var(--warning)" }}>
                <p className="eyebrow">Column B — What would have happened</p>
                <h2 style={{ margin: "4px 0 2px" }}>Ungoverned</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: "0.8125rem" }}>
                  Every candidate taken at the full requested size.
                </p>
                <strong className={toneFor(report.shadowPnl)} style={{ fontSize: "2.25rem", letterSpacing: "-0.02em" }}>
                  {money(report.shadowPnl)}
                </strong>
                <p style={{ marginTop: 12, marginBottom: 0, color: "var(--text-secondary)" }}>
                  Upside given up:{" "}
                  <strong className="mono">${report.missedUpside}</strong>
                </p>
              </article>
            </section>

            <section className="glass-panel" style={{ textAlign: "center" }}>
              <p className="eyebrow">Safety delta — governed minus ungoverned</p>
              <strong
                className={toneFor(report.safetyDelta)}
                style={{ fontSize: "2.75rem", letterSpacing: "-0.03em", display: "block" }}
              >
                {money(report.safetyDelta)}
              </strong>
              <p style={{ color: "var(--text-secondary)", marginBottom: 0 }}>
                across {report.candidates} marked candidate{report.candidates === 1 ? "" : "s"}.
                A delta of zero means governance never had to intervene — not that it did nothing.
              </p>
            </section>

            {report.attribution.length > 0 && (
              <section>
                <h2 style={{ marginBottom: 12 }}>Which rule did it</h2>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Invariant</th>
                        <th>Interventions</th>
                        <th>Loss avoided</th>
                        <th>Upside forgone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.attribution.map((row) => (
                        <tr key={row.invariant}>
                          <td className="mono">{row.invariant}</td>
                          <td className="mono">{row.interventions}</td>
                          <td className="mono success-text">${row.lossAvoided}</td>
                          <td className="mono warning-text">${row.upsideForgone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                  A candidate stopped by two rules credits both. We are not pretending to know
                  which one really did it.
                </p>
              </section>
            )}

            <section>
              <h2 style={{ marginBottom: 12 }}>Candidate by candidate</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Decision</th>
                      <th>Underlying</th>
                      <th>Requested</th>
                      <th>Allowed</th>
                      <th>Mark / contract</th>
                      <th>Governed P&amp;L</th>
                      <th>Ungoverned P&amp;L</th>
                      <th>VS delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows.map((row) => (
                      <tr key={row.candidateId}>
                        <td>
                          <span
                            className={
                              row.decision === "APPROVE"
                                ? "badge badge-emerald"
                                : row.decision === "VETO"
                                  ? "badge badge-rose"
                                  : "badge badge-amber"
                            }
                          >
                            {row.decision}
                          </span>
                        </td>
                        <td>{row.underlying}</td>
                        <td className="mono">{row.requestedQuantity}</td>
                        <td className="mono">{row.governedQuantity}</td>
                        <td className="mono">${row.markPerContract}</td>
                        <td className={`mono ${toneFor(row.governedPnl) ?? ""}`}>{money(row.governedPnl)}</td>
                        <td className={`mono ${toneFor(row.shadowPnl) ?? ""}`}>{money(row.shadowPnl)}</td>
                        <td className={`mono ${toneFor(row.delta) ?? ""}`}>{money(row.delta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-panel">
              <p className="eyebrow">Read this before quoting the number</p>
              <p style={{ marginBottom: 0, color: "var(--text-secondary)" }}>{report.caveat}</p>
            </section>
          </>
        )
      )}
    </div>
  );
}
