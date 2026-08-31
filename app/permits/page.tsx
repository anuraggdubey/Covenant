import { AuthorityBoundary } from "@/components/AuthorityBoundary";

export const metadata = {
  title: "Permit Console — Covenant"
};

type StepStatus = "IMPLEMENTED" | "BLOCKED";

const PERMIT_FLOW: {
  step: number;
  name: string;
  owner: string;
  description: string;
  status: StepStatus;
  evidence: string;
}[] = [
  {
    step: 1,
    name: "TradeIntent created",
    owner: "Alpha Engine",
    description:
      "Proposes a defined-risk vertical spread with a canonical intentHash. Holds no broker credential and cannot submit anything.",
    status: "IMPLEMENTED",
    evidence: "lib/alpha/engine.ts"
  },
  {
    step: 2,
    name: "Safety Kernel evaluation",
    owner: "Safety Kernel",
    description:
      "Re-fetches account and market state rather than trusting the caller. Evaluates COV-01 through COV-08 and returns APPROVE, SHRINK, VETO or ABSTAIN.",
    status: "IMPLEMENTED",
    evidence: "lib/safety/kernel.ts"
  },
  {
    step: 3,
    name: "Ed25519 permit signing",
    owner: "Permit Signer",
    description:
      "Signs a TradePermit with a 60-second TTL, single-use nonce, exact legs, quantity ceiling and price band. The only file in the repository that reads the private key.",
    status: "IMPLEMENTED",
    evidence: "lib/permits/sign.ts"
  },
  {
    step: 4,
    name: "Permit verification",
    owner: "Permit Executor",
    description:
      "Recomputes the intent hash and re-verifies the signature rather than trusting the kernel. Fourteen checks, every one of them before any network call.",
    status: "IMPLEMENTED",
    evidence: "lib/execution/executor.ts"
  },
  {
    step: 5,
    name: "Alpaca order submission",
    owner: "Permit Executor",
    description:
      "Submits order_class: 'mleg' to Alpaca paper and records order_id and X-Request-ID. The code path is written and tested against a recording transport.",
    status: "BLOCKED",
    evidence: "Blocked on paper credentials and Level 3 options approval"
  }
];

/** Each of these is an actual test in tests/execution/executor.attacks.test.ts. */
const ATTACKS = [
  {
    attack: "Swap a contract for a different strike",
    rejection: "INTENT_TAMPERED / INTENT_HASH_MISMATCH",
    note: "Caught whether or not the attacker recomputes the intent hash."
  },
  {
    attack: "Edit the permit's legs directly",
    rejection: "SIGNATURE_INVALID",
    note: "The signature covers the permit body."
  },
  {
    attack: "Submit 3 lots against a permit shrunk to 1",
    rejection: "QUANTITY_EXCEEDS_PERMIT",
    note: "A shrink can never be undone."
  },
  {
    attack: "Replay a permit that already traded",
    rejection: "NONCE_REPLAYED",
    note: "The nonce is consumed immediately before the network call."
  },
  {
    attack: "Wait past the 60-second TTL",
    rejection: "PERMIT_EXPIRED",
    note: "Authority is not durable. The nonce is not burned on rejection."
  },
  {
    attack: "Present a permit this kernel never issued",
    rejection: "NONCE_UNKNOWN",
    note: "A forged permit has no registered nonce."
  }
];

const PERMIT_FIELDS = [
  { field: "permitId", type: "string", description: "Unique permit identifier" },
  { field: "policyId + policyVersion + policyHash", type: "string", description: "Bound to one exact policy version" },
  { field: "intentHash", type: "string", description: "SHA-256 of the TradeIntent — tamper-evident" },
  { field: "accountSnapshotHash", type: "string", description: "Account state at evaluation time" },
  { field: "marketSnapshotHash", type: "string", description: "Market state at evaluation time" },
  { field: "exactLegs[]", type: "Leg[]", description: "Immutable contract symbols, sides, ratios" },
  { field: "maxQuantity", type: "number", description: "A SHRINK may only reduce, never increase" },
  { field: "limitPriceBand", type: "{ min, max }", description: "Submitted price must fall inside it" },
  { field: "expiresAt", type: "ISO string", description: "60-second TTL — a permit cannot outlive its freshness" },
  { field: "nonce", type: "string", description: "Single-use. A replayed nonce is rejected" },
  { field: "signature", type: "Ed25519", description: "Over canonical JSON, excluding this field" }
];

const PROPERTIES = [
  {
    title: "Tamper-evident",
    desc: "Ed25519 over canonical JSON. Any mutation of legs, quantity or price invalidates the permit."
  },
  {
    title: "Time-bounded",
    desc: "A 60-second TTL. A permit cannot outlive the market state it was evaluated against."
  },
  {
    title: "Single-use",
    desc: "The nonce is consumed after validation and immediately before submission, so a rejected permit never burns it and a replay has no window."
  },
  {
    title: "Credential-isolated",
    desc: "The signing key lives only in lib/permits/sign.ts. The executor holds the public half — it can verify a permit, never mint one."
  }
];

export default function PermitsPage() {
  const implemented = PERMIT_FLOW.filter((s) => s.status === "IMPLEMENTED").length;

  return (
    <main className="page-container">
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge badge-cyan">Permit Console</span>
          <span className="badge badge-emerald">
            {implemented}/{PERMIT_FLOW.length} stages implemented
          </span>
          <span className="badge badge-amber">Live submission blocked</span>
        </div>
        <h1>Authority, issued one trade at a time</h1>
        <p style={{ maxWidth: "68ch" }}>
          Every order requires a cryptographically signed, short-lived permit bound to exact legs, a
          price band, and the account and market snapshots the decision was made on. The strategy
          cannot reach Alpaca; only the executor can, and only with a permit. That is the
          &ldquo;powerless by construction&rdquo; guarantee, and the attacks below are the test suite
          that keeps it honest.
        </p>
      </header>

      <section className="glass-panel-glow">
        <AuthorityBoundary />
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>Permit lifecycle</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {PERMIT_FLOW.map((step) => (
            <div
              key={step.step}
              className="glass-panel"
              style={{
                borderLeft: `3px solid ${
                  step.status === "IMPLEMENTED" ? "var(--success)" : "var(--warning)"
                }`,
                display: "grid",
                gridTemplateColumns: "28px 1fr auto",
                gap: 16,
                alignItems: "start"
              }}
            >
              <div
                className="mono"
                style={{ fontWeight: 600, color: "var(--text-muted)", paddingTop: 2 }}
              >
                {step.step}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>{step.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{step.owner}</div>
                <p style={{ marginTop: 6 }}>{step.description}</p>
                <div className="mono" style={{ marginTop: 6, color: "var(--text-muted)" }}>
                  {step.evidence}
                </div>
              </div>
              <span
                className={`badge ${step.status === "IMPLEMENTED" ? "badge-emerald" : "badge-amber"}`}
              >
                {step.status === "IMPLEMENTED" ? "Implemented" : "Blocked"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel-glow">
        <h2>Try to break it</h2>
        <small>
          Each row is a test. Every one asserts the broker was never contacted — a gate that rejects
          after calling the broker is not a gate.
        </small>
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Attack</th>
                <th style={{ width: 260 }}>Rejected as</th>
                <th>Why it cannot work</th>
              </tr>
            </thead>
            <tbody>
              {ATTACKS.map((row) => (
                <tr key={row.attack}>
                  <td style={{ color: "var(--text)" }}>{row.attack}</td>
                  <td>
                    <span className="mono" style={{ color: "var(--danger)" }}>
                      {row.rejection}
                    </span>
                  </td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel">
        <h2>TradePermit schema</h2>
        <small>Frozen. See IMPLEMENTATION.md §6.</small>
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 300 }}>Field</th>
                <th style={{ width: 130 }}>Type</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {PERMIT_FIELDS.map((f) => (
                <tr key={f.field}>
                  <td className="mono" style={{ color: "var(--accent)" }}>
                    {f.field}
                  </td>
                  <td className="mono">{f.type}</td>
                  <td>{f.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>Security properties</h2>
        <div className="grid-2">
          {PROPERTIES.map((prop) => (
            <div key={prop.title} className="glass-panel">
              <h3>{prop.title}</h3>
              <p style={{ marginTop: 6 }}>{prop.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <small>Paper trading only. Not investment advice. Options involve significant risk.</small>
    </main>
  );
}
