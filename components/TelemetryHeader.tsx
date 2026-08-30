export function TelemetryHeader() {
  return (
    <div className="telemetry-bar">
      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>LANE A SCOPE:</span>
        <span className="mono" style={{ color: "var(--cyan)", fontSize: "0.74rem" }}>
          READ PATH ONLY
        </span>
      </div>

      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>UNDERLYINGS:</span>
        <span className="badge badge-cyan" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>SPY</span>
        <span className="badge badge-cyan" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>QQQ</span>
      </div>

      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>WRITE PATH:</span>
        <span style={{ color: "var(--amber)", fontWeight: 700 }}>DISABLED</span>
      </div>

      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>ENFORCEMENT:</span>
        <span style={{ color: "var(--amber)", fontWeight: 700 }}>NOT IMPLEMENTED</span>
      </div>
    </div>
  );
}
