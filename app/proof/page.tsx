import manifest from "@/demo/run_manifest.json";
import { verifyManifest } from "@/lib/audit/verify";
import type { RunManifest } from "@/types/domain";

export const metadata = {
  title: "Proof Explorer — Covenant"
};

const report = verifyManifest(manifest as unknown as RunManifest);
const run = manifest as unknown as RunManifest;

function shortHash(hash: string | null): string {
  if (hash === null || hash === "") return "—";
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

const EVENT_TONE: Record<string, string> = {
  PERMIT_SIGNED: "badge-emerald",
  ORDER_SUBMITTED: "badge-emerald",
  ORDER_ACCEPTED: "badge-emerald",
  POLICY_ACTIVATED: "badge-cyan",
  MARKET_SNAPSHOT_RECORDED: "badge-cyan",
  ACCOUNT_SNAPSHOT_RECORDED: "badge-cyan",
  TRADE_INTENT_CREATED: "badge-cyan",
  KERNEL_REJECTED: "badge-rose",
  KERNEL_ABSTAINED: "badge-amber",
  PERMIT_REPLAY_REJECTED: "badge-rose",
  HALT_TRIGGERED: "badge-amber"
};

function decisionSummary(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.reason === "string") return p.reason;
  if (typeof p.orderId === "string") return `Alpaca order ${p.orderId}`;
  return null;
}

export default function ProofExplorerPage() {
  const reproduced = report.checks.filter((c) => c.label === "REPRODUCED");
  const recorded = report.checks.filter((c) => c.label === "RECORDED");

  return (
    <main className="page-container">
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge badge-cyan">Proof Explorer</span>
          <span className={`badge ${report.ok ? "badge-emerald" : "badge-rose"}`}>
            {report.ok ? "Verified" : "Verification failed"}
          </span>
        </div>
        <h1>Every decision, replayable</h1>
        <p style={{ maxWidth: "68ch" }}>
          This page is the output of <code>npm run verify -- demo/run_manifest.json</code>, run
          against the manifest committed to the repository. No credentials, no network. Anyone can
          reproduce it from a fresh clone.
        </p>
      </header>

      {/* The distinction that keeps the claim honest. */}
      <section className="glass-panel-glow">
        <p className="eyebrow">How to read this</p>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <div>
            <span className="badge badge-cyan">Reproduced</span>
            <p style={{ marginTop: 6 }}>
              A deterministic check we re-ran here, now, from the recorded inputs — and got the same
              answer. All eight invariants are re-evaluated against the recorded snapshots and
              compared to the verdict that was stored at the time.
            </p>
          </div>
          <div>
            <span className="badge">Recorded</span>
            <p style={{ marginTop: 6 }}>
              A market or broker fact we captured. We can prove it has not been altered since. We
              cannot prove it was true. Calling a quote &ldquo;verified&rdquo; would be a lie, so we
              do not.
            </p>
          </div>
        </div>
      </section>

      <div className="telemetry-bar">
        <div className="telemetry-item">
          <span>Run</span>
          <span className="mono">{report.runId}</span>
        </div>
        <div className="telemetry-item">
          <span>Events</span>
          <span>{run.events.length}</span>
        </div>
        <div className="telemetry-item">
          <span>Checks passing</span>
          <span style={{ color: report.ok ? "var(--success)" : "var(--danger)" }}>
            {report.counts.passed}/{report.checks.length}
          </span>
        </div>
        <div className="telemetry-item">
          <span>Reproduced</span>
          <span>{report.counts.reproduced}</span>
        </div>
        <div className="telemetry-item">
          <span>Signing key</span>
          <span className="mono">{run.signingKeyId || "—"}</span>
        </div>
      </div>

      <section className="glass-panel">
        <h2>Verification report</h2>
        <small>
          {report.counts.failed === 0
            ? "Every check passed. A failure would be listed first."
            : `${report.counts.failed} check(s) failed.`}
        </small>
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Result</th>
                <th style={{ width: 108 }}>Label</th>
                <th style={{ width: 92 }}>Event</th>
                <th>Check</th>
              </tr>
            </thead>
            <tbody>
              {[...report.checks]
                .sort((a, b) => Number(a.ok) - Number(b.ok))
                .map((check, index) => (
                  <tr key={`${check.id}-${check.eventId ?? "global"}-${index}`}>
                    <td>
                      <span className={`badge ${check.ok ? "badge-emerald" : "badge-rose"}`}>
                        {check.ok ? "Pass" : "Fail"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${check.label === "RECORDED" ? "" : "badge-cyan"}`}>
                        {check.label === "RECORDED" ? "Recorded" : "Reproduced"}
                      </span>
                    </td>
                    <td className="mono">{check.eventId ?? "—"}</td>
                    <td>
                      <strong style={{ color: "var(--text)", fontWeight: 600 }}>{check.id}</strong>
                      <div style={{ color: "var(--text-secondary)" }}>{check.detail}</div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel">
        <h2>Hash chain</h2>
        <small>
          Each event commits to the hash of the one before it. Editing or removing any event breaks
          every hash after it — which is what stops an inconvenient veto being quietly dropped.
        </small>
        <div className="table-scroll" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 78 }}>Event</th>
                <th style={{ width: 210 }}>Type</th>
                <th style={{ width: 150 }}>Hash</th>
                <th style={{ width: 150 }}>Links to</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {run.events.map((event) => (
                <tr key={event.eventId}>
                  <td className="mono">{event.eventId}</td>
                  <td>
                    <span className={`badge ${EVENT_TONE[event.eventType] ?? ""}`}>
                      {event.eventType.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="mono">{shortHash(event.eventHash)}</td>
                  <td className="mono">{shortHash(event.previousEventHash)}</td>
                  <td>{decisionSummary(event.payload) ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel">
        <h2>Reproduce it yourself</h2>
        <small>From a fresh clone. Neither command needs a credential.</small>
        <pre style={{ marginTop: 12 }}>
          {`npm install
npm run verify -- demo/run_manifest.json
npm run audit`}
        </pre>
        <p style={{ marginTop: 12 }}>
          {reproduced.length} deterministic checks and {recorded.length} recorded-integrity checks.
          The manifest carries the public signing key only — never the half that could mint a new
          permit.
        </p>
      </section>

      <small>
        Paper trading only. Not investment advice. Recorded market facts are hypothetical and do not
        represent live execution.
      </small>
    </main>
  );
}
