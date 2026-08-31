"use client";

const PERMIT_FLOW = [
  { step: 1, name: "TradeIntent Created", owner: "Alpha Engine (Lane A)", description: "Engine proposes a defined-risk vertical spread with canonical intentHash.", status: "ACTIVE", color: "var(--emerald)" },
  { step: 2, name: "Safety Kernel Evaluation", owner: "Safety Kernel (Lane B)", description: "Re-fetches account and market state independently. Evaluates COV-01 through COV-08. Returns APPROVE, SHRINK, VETO, or ABSTAIN.", status: "PENDING", color: "var(--amber)" },
  { step: 3, name: "Ed25519 Permit Signing", owner: "Permit Signer (Lane B)", description: "Signs a TradePermit with 60-second TTL, single-use nonce, exact legs, quantity ceiling, and price band.", status: "PENDING", color: "var(--amber)" },
  { step: 4, name: "Permit Verification", owner: "Permit Executor (Lane B)", description: "Re-verifies signature, TTL, nonce, policy hash, snapshot hashes, intent hash, legs, quantity, and price band.", status: "PENDING", color: "var(--amber)" },
  { step: 5, name: "Alpaca Order Submission", owner: "Permit Executor (Lane B)", description: "Submits order_class: 'mleg' to Alpaca paper. Records order_id and X-Request-ID.", status: "PENDING", color: "var(--amber)" },
];

const PERMIT_FIELDS = [
  { field: "permitId", type: "string", description: "Unique permit identifier" },
  { field: "policyId + policyVersion + policyHash", type: "string", description: "Bound to exact policy version" },
  { field: "intentHash", type: "string", description: "SHA-256 of the TradeIntent — tamper-evident" },
  { field: "accountSnapshotHash", type: "string", description: "Hash of the account state at evaluation time" },
  { field: "marketSnapshotHash", type: "string", description: "Hash of the market state at evaluation time" },
  { field: "exactLegs[]", type: "Leg[]", description: "Immutable contract symbols, sides, quantities" },
  { field: "maxQuantity", type: "number", description: "SHRINK may only reduce, never increase" },
  { field: "limitPriceBand", type: "{ min, max }", description: "+/- 5% of the proposed limit price" },
  { field: "expiresAt", type: "ISO string", description: "60-second TTL — permit cannot outlive freshness" },
  { field: "nonce", type: "string", description: "Single-use — replayed nonce is rejected" },
  { field: "signature", type: "Ed25519", description: "Over canonical JSON excluding this field" },
];

export default function PermitsPage() {
  return (
    <div className="page-container">
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-cyan">PERMIT CONSOLE</span>
          <span className="badge badge-amber">AWAITING LANE B IMPLEMENTATION</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Permit Console</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "720px" }}>
          Every trade requires a cryptographically signed, short-lived permit bound to exact legs, price bands,
          and snapshot hashes. This is the &quot;powerless by construction&quot; guarantee.
        </p>
      </div>

      {/* Permit Flow Pipeline */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Permit Lifecycle</h2>
      <div style={{ display: "grid", gap: "12px", marginBottom: "32px" }}>
        {PERMIT_FLOW.map((step) => (
          <div key={step.step} className="glass-panel" style={{ padding: "18px", borderLeft: `4px solid ${step.color}`, display: "grid", gridTemplateColumns: "40px 1fr auto", gap: "16px", alignItems: "center" }}>
            <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 900, color: step.color, textAlign: "center" }}>{step.step}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "4px" }}>{step.name}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{step.owner}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>{step.description}</div>
            </div>
            <span className={`badge ${step.status === "ACTIVE" ? "badge-emerald" : "badge-amber"}`}>{step.status}</span>
          </div>
        ))}
      </div>

      {/* TradePermit Schema */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>TradePermit Schema (Frozen)</h2>
      <div className="glass-panel" style={{ padding: "20px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.74rem", textTransform: "uppercase" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>Field</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Type</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {PERMIT_FIELDS.map((f) => (
              <tr key={f.field} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="mono" style={{ padding: "10px", color: "var(--cyan)", fontWeight: 700 }}>{f.field}</td>
                <td className="mono" style={{ padding: "10px", color: "var(--text-muted)" }}>{f.type}</td>
                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security Properties */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px", marginTop: "32px" }}>Security Properties</h2>
      <div className="grid-2">
        {[
          { title: "Tamper-Evident", desc: "Ed25519 signature over canonical JSON. Any mutation of legs, quantity, or price invalidates the permit.", icon: "🔐" },
          { title: "Time-Bounded", desc: "60-second TTL. A permit cannot outlive the market state it was evaluated against.", icon: "⏱" },
          { title: "Single-Use", desc: "Atomic nonce store marks permits as consumed after the first submission attempt.", icon: "🎫" },
          { title: "Credential Isolated", desc: "The signing key lives only in lib/permits/sign.ts. The executor holds only the public key.", icon: "🛡" },
        ].map((prop) => (
          <div key={prop.title} className="glass-panel" style={{ padding: "18px" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "8px" }}>{prop.icon}</div>
            <div style={{ fontWeight: 800, marginBottom: "6px" }}>{prop.title}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{prop.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
