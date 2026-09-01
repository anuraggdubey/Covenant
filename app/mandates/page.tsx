"use client";

import { useEffect, useState } from "react";

interface Contradiction {
  code: string;
  fields: string[];
  reason: string;
}

interface MandateCase {
  id: string;
  title: string;
  mandateText: string;
  expectedCompiledPolicy: {
    status: string;
    riskProfile: string;
    allowedUnderlyings: string[];
    allowedStructures: string[];
    missingStateAction: string;
    modelAuthority: string;
    invariants: string[];
    riskOverrides?: Record<string, unknown>;
  };
  expectedContradictions: Contradiction[];
}

interface CorpusData {
  schemaVersion: number;
  profileSource: string;
  cases: MandateCase[];
}

interface CompiledResult {
  status: string;
  echo: string;
  draft: {
    riskProfile: string;
    allowedUnderlyings: string[];
    allowedStructures: string[];
    missingStateAction: string;
    modelAuthority: string;
    invariants: string[];
    riskOverrides?: Record<string, unknown>;
  };
  contradictions: Contradiction[];
}

export default function MandateStudioPage() {
  const [corpus, setCorpus] = useState<CorpusData | null>(null);
  const [selectedMandate, setSelectedMandate] = useState<MandateCase | null>(null);
  const [mandateText, setMandateText] = useState("");
  const [compiled, setCompiled] = useState<CompiledResult | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<Array<{ text: string; result: CompiledResult; savedAt: string }>>([]);

  useEffect(() => {
    fetch("/api/mandates/corpus")
      .then((r) => r.json())
      .then((data: CorpusData) => {
        setCorpus(data);
        if (data.cases.length > 0) {
          setSelectedMandate(data.cases[0]!);
          setMandateText(data.cases[0]!.mandateText);
        }
      })
      .catch(() => {
        setCorpus(null);
      });
  }, []);

  async function handleCompile() {
    if (!mandateText.trim()) return;
    setCompiling(true);
    setCompiled(null);
    try {
      const res = await fetch("/api/mandates/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandateText: mandateText.trim() }),
      });
      const data: CompiledResult = await res.json();
      setCompiled(data);
      setSelectedMandate(null);
    } catch {
      setCompiled(null);
    } finally {
      setCompiling(false);
    }
  }

  function handleSaveDraft() {
    if (!compiled) return;
    setSavedDrafts((prev) => [
      { text: mandateText.trim(), result: compiled, savedAt: new Date().toISOString() },
      ...prev,
    ]);
  }

  // The active display: either a live compile result or the selected corpus entry
  const displayPolicy = compiled
    ? compiled.draft
    : selectedMandate?.expectedCompiledPolicy ?? null;
  const displayContradictions = compiled
    ? compiled.contradictions
    : selectedMandate?.expectedContradictions ?? [];
  const displayStatus = compiled
    ? compiled.status
    : displayContradictions.length > 0
      ? "BLOCKED"
      : selectedMandate?.expectedCompiledPolicy.status ?? null;
  const displayEcho = compiled?.echo ?? null;

  const contradictory = corpus?.cases.filter((c) => c.expectedContradictions.length > 0) ?? [];
  const valid = corpus?.cases.filter((c) => c.expectedContradictions.length === 0) ?? [];

  return (
    <div className="page-container">
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-cyan">MANDATE STUDIO</span>
          <span className="badge badge-emerald">{corpus?.cases.length ?? 0} MANDATES IN CORPUS</span>
          {contradictory.length > 0 && (
            <span className="badge badge-rose">{contradictory.length} CONTRADICTORY</span>
          )}
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Mandate Studio</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Draft plain-English trading mandates. Covenant compiles them into typed, executable policy JSON with contradiction checks.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)", gap: "24px" }}>
        <div>
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "14px" }}>Plain-English Mandate</h3>
            <textarea
              value={mandateText}
              onChange={(e) => { setMandateText(e.target.value); setCompiled(null); }}
              rows={6}
              placeholder="Type a trading mandate in plain English, e.g.: Trade SPY and QQQ defined-risk vertical spreads with a balanced profile. Risk at most 0.6% per trade."
              style={{
                width: "100%",
                background: "var(--surface-sunken)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "14px",
                color: "var(--text)",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                lineHeight: 1.5,
                resize: "vertical"
              }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                onClick={handleCompile}
                disabled={compiling || !mandateText.trim()}
              >
                {compiling ? "Compiling…" : "Compile & Echo Policy"}
              </button>
              <button
                className="btn-secondary"
                onClick={handleSaveDraft}
                disabled={!compiled}
              >
                Save as Draft
              </button>
            </div>
          </div>

          {/* Live compile echo banner */}
          {displayEcho && (
            <div className="glass-panel" style={{ padding: "16px", marginBottom: "24px", borderLeft: "3px solid var(--emerald)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>
                Compiler Echo (what Covenant understood)
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;{displayEcho}&rdquo;
              </div>
            </div>
          )}

          {/* Saved Drafts */}
          {savedDrafts.length > 0 && (
            <>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px", color: "var(--amber)" }}>
                Saved Drafts ({savedDrafts.length})
              </h3>
              <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
                {savedDrafts.map((d, i) => (
                  <div
                    key={i}
                    className="glass-panel"
                    style={{ padding: "14px", cursor: "pointer", borderLeft: `3px solid ${d.result.status === "READY" ? "var(--emerald)" : "var(--rose)"}` }}
                    onClick={() => { setMandateText(d.text); setCompiled(d.result); setSelectedMandate(null); }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className={`badge ${d.result.status === "READY" ? "badge-emerald" : "badge-rose"}`} style={{ fontSize: "0.64rem" }}>
                        {d.result.status}
                      </span>
                      <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                        {new Date(d.savedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{d.text}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px" }}>
            Valid Mandates ({valid.length})
          </h3>
          <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
            {valid.map((m) => (
              <div
                key={m.id}
                className="glass-panel"
                style={{ padding: "14px", cursor: "pointer", borderLeft: "3px solid var(--cyan)", opacity: selectedMandate?.id === m.id ? 1 : 0.75 }}
                onClick={() => {
                  setSelectedMandate(m);
                  setMandateText(m.mandateText);
                  setCompiled(null);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="mono" style={{ fontWeight: 800, color: "var(--cyan)", fontSize: "0.78rem" }}>{m.id}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{m.title}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{m.mandateText}</div>
              </div>
            ))}
          </div>

          {contradictory.length > 0 && (
            <>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px", color: "var(--rose)" }}>
                Contradictory Mandates ({contradictory.length})
              </h3>
              <div style={{ display: "grid", gap: "10px" }}>
                {contradictory.map((m) => (
                  <div
                    key={m.id}
                    className="glass-panel"
                    style={{ padding: "14px", cursor: "pointer", borderLeft: "3px solid var(--rose)", opacity: selectedMandate?.id === m.id ? 1 : 0.75 }}
                    onClick={() => {
                      setSelectedMandate(m);
                      setMandateText(m.mandateText);
                      setCompiled(null);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="mono" style={{ fontWeight: 800, color: "var(--rose)", fontSize: "0.78rem" }}>{m.id}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{m.title}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{m.mandateText}</div>
                    <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                      {m.expectedContradictions.map((c) => (
                        <span key={c.code} className="badge badge-rose" style={{ fontSize: "0.64rem" }}>{c.code}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="glass-panel" style={{ padding: "24px", alignSelf: "start", position: "sticky", top: "80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Compiled Policy Echo</h3>
            {displayStatus && (
              <span className={`badge ${displayContradictions.length > 0 ? "badge-rose" : "badge-emerald"}`}>
                {displayStatus}
              </span>
            )}
          </div>

          {displayPolicy ? (
            <>
              {displayContradictions.length > 0 && (
                <div style={{ padding: "12px", background: "var(--danger-subtle)", border: "1px solid var(--rose)", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, color: "var(--rose)", marginBottom: "6px", fontSize: "0.85rem" }}>Contradictions Detected</div>
                  {displayContradictions.map((c) => (
                    <div key={c.code} style={{ fontSize: "0.8rem", color: "var(--rose)", padding: "6px 0" }}>
                      <div className="mono" style={{ fontWeight: 700 }}>{c.code}</div>
                      <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>{c.reason}</div>
                      <div className="mono" style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                        {c.fields.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gap: "10px", fontSize: "0.84rem" }}>
                {[
                  { label: "Risk Profile", value: displayPolicy.riskProfile },
                  { label: "Underlyings", value: displayPolicy.allowedUnderlyings.join(", ") },
                  { label: "Structures", value: displayPolicy.allowedStructures.join(", ") },
                  { label: "Missing State", value: displayPolicy.missingStateAction },
                  { label: "Model Authority", value: displayPolicy.modelAuthority },
                  { label: "Invariants", value: `${displayPolicy.invariants.length} bound` }
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>{label}:</span>
                    <span className="mono" style={{ color: "var(--cyan)", fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              {displayPolicy.riskOverrides && Object.keys(displayPolicy.riskOverrides).length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Risk Overrides</div>
                  <pre className="mono" style={{ fontSize: "0.72rem", color: "var(--amber)", background: "var(--surface-sunken)", padding: "10px", borderRadius: "6px", whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(displayPolicy.riskOverrides, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
              Type a mandate and click &ldquo;Compile &amp; Echo Policy&rdquo; to see the result.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
