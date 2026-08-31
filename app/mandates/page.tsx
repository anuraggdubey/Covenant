"use client";

import { useState, useEffect } from "react";

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
  expectedContradictions: string[];
}

interface CorpusData {
  schemaVersion: number;
  profileSource: string;
  cases: MandateCase[];
}

export default function MandateStudioPage() {
  const [corpus, setCorpus] = useState<CorpusData | null>(null);
  const [selectedMandate, setSelectedMandate] = useState<MandateCase | null>(null);
  const [mandateText, setMandateText] = useState("");

  useEffect(() => {
    fetch("/docs/mandates/corpus-v1.json")
      .then((r) => r.json())
      .then((data: CorpusData) => {
        setCorpus(data);
        if (data.cases.length > 0) {
          setSelectedMandate(data.cases[0]);
          setMandateText(data.cases[0].mandateText);
        }
      })
      .catch(() => {
        // Fallback if static file isn't accessible
        setCorpus(null);
      });
  }, []);

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
        {/* Mandate Input + Corpus */}
        <div>
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "14px" }}>Plain-English Mandate</h3>
            <textarea
              value={mandateText}
              onChange={(e) => setMandateText(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "14px",
                color: "#fff",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => {
                const match = corpus?.cases.find((c) => c.mandateText === mandateText);
                if (match) setSelectedMandate(match);
              }}>
                Compile & Echo Policy
              </button>
              <button className="btn-secondary" disabled>
                Save as Draft (Lane B)
              </button>
            </div>
          </div>

          {/* Valid Mandates */}
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px" }}>
            Valid Mandates ({valid.length})
          </h3>
          <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
            {valid.map((m) => (
              <div
                key={m.id}
                className="glass-panel"
                style={{ padding: "14px", cursor: "pointer", borderLeft: "3px solid var(--cyan)", opacity: selectedMandate?.id === m.id ? 1 : 0.75 }}
                onClick={() => { setSelectedMandate(m); setMandateText(m.mandateText); }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="mono" style={{ fontWeight: 800, color: "var(--cyan)", fontSize: "0.78rem" }}>{m.id}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{m.title}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{m.mandateText}</div>
              </div>
            ))}
          </div>

          {/* Contradictory Mandates */}
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
                    onClick={() => { setSelectedMandate(m); setMandateText(m.mandateText); }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="mono" style={{ fontWeight: 800, color: "var(--rose)", fontSize: "0.78rem" }}>{m.id}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{m.title}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{m.mandateText}</div>
                    <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                      {m.expectedContradictions.map((c) => (
                        <span key={c} className="badge badge-rose" style={{ fontSize: "0.64rem" }}>{c}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Compiled Policy Echo */}
        <div className="glass-panel" style={{ padding: "24px", alignSelf: "start", position: "sticky", top: "80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Compiled Policy Echo</h3>
            {selectedMandate && (
              <span className={`badge ${selectedMandate.expectedContradictions.length > 0 ? "badge-rose" : "badge-emerald"}`}>
                {selectedMandate.expectedContradictions.length > 0 ? "BLOCKED" : selectedMandate.expectedCompiledPolicy.status}
              </span>
            )}
          </div>

          {selectedMandate ? (
            <>
              {selectedMandate.expectedContradictions.length > 0 && (
                <div style={{ padding: "12px", background: "rgba(244,63,94,0.1)", border: "1px solid var(--rose)", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, color: "var(--rose)", marginBottom: "6px", fontSize: "0.85rem" }}>Contradictions Detected</div>
                  {selectedMandate.expectedContradictions.map((c) => (
                    <div key={c} style={{ fontSize: "0.8rem", color: "var(--rose)", padding: "2px 0" }}>✗ {c}</div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gap: "10px", fontSize: "0.84rem" }}>
                {[
                  { label: "Mandate ID", value: selectedMandate.id },
                  { label: "Risk Profile", value: selectedMandate.expectedCompiledPolicy.riskProfile },
                  { label: "Underlyings", value: selectedMandate.expectedCompiledPolicy.allowedUnderlyings.join(", ") },
                  { label: "Structures", value: selectedMandate.expectedCompiledPolicy.allowedStructures.join(", ") },
                  { label: "Missing State", value: selectedMandate.expectedCompiledPolicy.missingStateAction },
                  { label: "Model Authority", value: selectedMandate.expectedCompiledPolicy.modelAuthority },
                  { label: "Invariants", value: `${selectedMandate.expectedCompiledPolicy.invariants.length} bound` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>{label}:</span>
                    <span className="mono" style={{ color: "var(--cyan)", fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              {selectedMandate.expectedCompiledPolicy.riskOverrides && Object.keys(selectedMandate.expectedCompiledPolicy.riskOverrides).length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px", fontWeight: 700 }}>Risk Overrides</div>
                  <pre className="mono" style={{ fontSize: "0.72rem", color: "var(--amber)", background: "rgba(0,0,0,0.4)", padding: "10px", borderRadius: "6px", whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(selectedMandate.expectedCompiledPolicy.riskOverrides, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
              Select a mandate to see its compiled policy echo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
