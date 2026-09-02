"use client";

import { useCallback, useEffect, useState } from "react";

interface Verdict {
  id: string;
  title: string;
  enforcedAt: string;
  ok: boolean;
  action: string;
  reason: string;
  shrinkTo?: number;
}

interface CoverageRow {
  invariant: string;
  title: string;
  triggered: number;
  covered: boolean;
}

interface BreakMeResponse {
  scenario: {
    outcome: string;
    quantity: number;
    standaloneMaxLoss: string;
    dte: number;
    equity: string;
    perTradeMaxLossPct: number;
    sessionState: string;
    intentHash: string;
  };
  attack?: { id: string; label: string; description: string } | null;
  verdicts: Verdict[];
  report: {
    cases: number;
    runs: number;
    seed: number;
    passed: boolean;
    fullyCovered: boolean;
    coverage: CoverageRow[];
    counterexamples: { invariant: string; description: string; seed: number }[];
  };
  activation: { ok: boolean; reason: string };
}

interface AttackOption {
  id: string;
  label: string;
}

const PRESETS = [
  { label: "A legal trade", overrides: {} },
  { label: "Nine lots (over the cap)", overrides: { quantity: 9 } },
  { label: "Expiry too far out", overrides: { dte: 45 } },
  { label: "Down 4% on the day", overrides: { dayPnlPct: -4 } },
  { label: "Session already halted", overrides: { sessionHalted: true } },
  { label: "Tiny account, same trade", overrides: { equity: "10000.00" } },
  { label: "Stale quotes attack", overrides: { attack: "STALE_QUOTE" } },
  { label: "Crossed market attack", overrides: { attack: "CROSSED_MARKET" } }
];

function outcomeClass(outcome: string): string {
  if (outcome === "APPROVE") return "badge badge-emerald";
  if (outcome === "VETO") return "badge badge-rose";
  return "badge badge-amber";
}

export default function BreakMePage() {
  const [quantity, setQuantity] = useState(1);
  const [maxLoss, setMaxLoss] = useState("240.00");
  const [dte, setDte] = useState(18);
  const [equity, setEquity] = useState("100000.00");
  const [perTrade, setPerTrade] = useState(0.6);
  const [dayPnl, setDayPnl] = useState(0);
  const [halted, setHalted] = useState(false);
  const [runs, setRuns] = useState(200);
  const [attack, setAttack] = useState("");
  const [attacks, setAttacks] = useState<AttackOption[]>([]);
  const [maxLossManual, setMaxLossManual] = useState(false);

  const [result, setResult] = useState<BreakMeResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (overrides?: Record<string, unknown>) => {
      setRunning(true);
      setError(null);
      const body = overrides ?? {
        quantity,
        standaloneMaxLoss: maxLossManual ? maxLoss : undefined,
        dte,
        equity,
        perTradeMaxLossPct: perTrade,
        dayPnlPct: dayPnl,
        sessionHalted: halted,
        runs,
        ...(attack ? { attack } : {})
      };
      try {
        const response = await fetch("/api/break-me", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        const parsed = (await response.json()) as BreakMeResponse & { error?: string };
        if (parsed.error !== undefined) setError(parsed.error);
        else {
          setResult(parsed);
          if (!maxLossManual && !overrides?.standaloneMaxLoss) {
            setMaxLoss(parsed.scenario.standaloneMaxLoss);
          }
          if (overrides?.attack !== undefined) setAttack(String(overrides.attack));
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Run failed.");
      } finally {
        setRunning(false);
      }
    },
    [quantity, maxLoss, maxLossManual, dte, equity, perTrade, dayPnl, halted, runs, attack]
  );

  useEffect(() => {
    void fetch("/api/break-me")
      .then((r) => r.json())
      .then((parsed: { attacks: AttackOption[] }) => setAttacks(parsed.attacks ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void run({ runs: 200 });
    // Run the clean baseline once on mount so the page is never an empty shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocking = result?.verdicts.filter((verdict) => !verdict.ok) ?? [];
  const passing = result?.verdicts.filter((verdict) => verdict.ok) ?? [];

  return (
    <div className="page-container">
      <header>
        <p className="eyebrow">Break Me</p>
        <h1>Try to get a trade past the kernel</h1>
        <p style={{ maxWidth: 680, color: "var(--text-secondary)" }}>
          Build a scenario and run it against the real invariant registry — the same code the
          autonomous loop uses. You get two answers: what the eight rules say about your exact
          trade, and what happens when the generator throws hundreds of hostile variants of it at
          the same policy.
        </p>
      </header>

      <section className="glass-panel">
        <p className="eyebrow">Presets</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="btn-secondary"
              disabled={running}
              onClick={() => {
                if ("attack" in preset.overrides) setAttack(String(preset.overrides.attack));
                else setAttack("");
                if ("quantity" in preset.overrides) setMaxLossManual(false);
                void run({ ...preset.overrides, runs });
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel">
        <p className="eyebrow">Your scenario</p>
        <div className="grid-4" style={{ marginTop: 12 }}>
          <label>
            <span className="eyebrow">Contracts</span>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                setMaxLossManual(false);
              }}
            />
          </label>
          <label>
            <span className="eyebrow">Max loss ($)</span>
            <input
              value={maxLoss}
              onChange={(e) => {
                setMaxLoss(e.target.value);
                setMaxLossManual(true);
              }}
            />
          </label>
          <label>
            <span className="eyebrow">DTE</span>
            <input type="number" min={0} max={120} value={dte} onChange={(e) => setDte(Number(e.target.value))} />
          </label>
          <label>
            <span className="eyebrow">Equity ($)</span>
            <input value={equity} onChange={(e) => setEquity(e.target.value)} />
          </label>
          <label>
            <span className="eyebrow">Per-trade cap (%)</span>
            <input type="number" step={0.05} min={0.05} max={10} value={perTrade} onChange={(e) => setPerTrade(Number(e.target.value))} />
          </label>
          <label>
            <span className="eyebrow">Day P&amp;L (%)</span>
            <input type="number" step={0.25} min={-20} max={20} value={dayPnl} onChange={(e) => setDayPnl(Number(e.target.value))} />
          </label>
          <label>
            <span className="eyebrow">Fuzz runs</span>
            <input type="number" min={25} max={500} step={25} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
            <input type="checkbox" checked={halted} onChange={(e) => setHalted(e.target.checked)} />
            <span>Session halted</span>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span className="eyebrow">Named attack (optional)</span>
            <select
              value={attack}
              onChange={(e) => setAttack(e.target.value)}
              style={{ width: "100%", marginTop: 6 }}
            >
              <option value="">None — evaluate your scenario as-is</option>
              {attacks.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" disabled={running} onClick={() => void run()}>
            {running ? "Running…" : "Run against the kernel"}
          </button>
        </div>
      </section>

      {error !== null && (
        <div className="glass-panel" style={{ borderColor: "var(--danger)" }}>
          <p className="mono" style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {result !== null && (
        <>
          <section className="glass-panel-glow">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow">Verdict on your trade</p>
                <h2 style={{ margin: 0 }}>
                  {result.scenario.quantity} × contracts, {result.scenario.dte} DTE, max loss $
                  {result.scenario.standaloneMaxLoss}
                </h2>
              </div>
              <span className={outcomeClass(result.scenario.outcome)} style={{ fontSize: "0.95rem" }}>
                {result.scenario.outcome}
              </span>
            </div>
            {result.attack ? (
              <p style={{ color: "var(--warning)", marginTop: 8, marginBottom: 0 }}>
                Attack applied: <strong>{result.attack.label}</strong> — {result.attack.description}
              </p>
            ) : null}
            <p className="mono" style={{ color: "var(--text-muted)", marginTop: 10, marginBottom: 0 }}>
              intent {result.scenario.intentHash.slice(0, 24)}…
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: 4 }}>Rule by rule</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
              Blocking rules first. A rule that passes is not evidence it was tested — that is what
              the coverage table below is for.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Result</th>
                    <th>Invariant</th>
                    <th>Enforced at</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {[...blocking, ...passing].map((verdict) => (
                    <tr key={verdict.id}>
                      <td>
                        <span className={verdict.ok ? "badge badge-emerald" : verdict.action === "VETO" ? "badge badge-rose" : "badge badge-amber"}>
                          {verdict.ok ? "PASS" : verdict.action}
                        </span>
                      </td>
                      <td className="mono">{verdict.id}</td>
                      <td style={{ color: "var(--text-muted)" }}>{verdict.enforcedAt}</td>
                      <td>{verdict.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: 4 }}>Adversarial run</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
              {result.report.cases} generated states from seed{" "}
              <span className="mono">{result.report.seed}</span>. Same seed, same run — this is
              reproducible, not a fresh roll of the dice each visit.
            </p>
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="glass-panel">
                <span className="eyebrow">Counterexamples</span>
                <strong style={{ fontSize: "1.5rem" }} className={result.report.passed ? "success-text" : "warning-text"}>
                  {result.report.counterexamples.length}
                </strong>
              </div>
              <div className="glass-panel">
                <span className="eyebrow">Every rule exercised</span>
                <strong style={{ fontSize: "1.5rem" }} className={result.report.fullyCovered ? "success-text" : "warning-text"}>
                  {result.report.fullyCovered ? "Yes" : "No"}
                </strong>
              </div>
              <div className="glass-panel">
                <span className="eyebrow">Policy may activate</span>
                <strong style={{ fontSize: "1.5rem" }} className={result.activation.ok ? "success-text" : "warning-text"}>
                  {result.activation.ok ? "Yes" : "No"}
                </strong>
              </div>
            </div>

            {result.report.counterexamples.length > 0 && (
              <div className="glass-panel" style={{ borderColor: "var(--danger)", marginBottom: 16 }}>
                <p className="eyebrow" style={{ color: "var(--danger)" }}>Counterexamples</p>
                {result.report.counterexamples.map((counter) => (
                  <p key={`${counter.invariant}-${counter.seed}`} className="mono" style={{ margin: "6px 0" }}>
                    {counter.invariant} — {counter.description}
                  </p>
                ))}
              </div>
            )}

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fired</th>
                    <th>Invariant</th>
                    <th>Times triggered</th>
                    <th>Title</th>
                  </tr>
                </thead>
                <tbody>
                  {result.report.coverage.map((row) => (
                    <tr key={row.invariant}>
                      <td>
                        <span className={row.covered ? "badge badge-emerald" : "badge badge-amber"}>
                          {row.covered ? "YES" : "NEVER"}
                        </span>
                      </td>
                      <td className="mono">{row.invariant}</td>
                      <td className="mono">{row.triggered}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{row.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
              A rule that never fires across hundreds of hostile states is not proven safe — it is
              untested. Activation is refused while any rule sits at NEVER.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
