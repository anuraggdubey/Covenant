"use client";

import { useState, useEffect } from "react";

export function TelemetryHeader() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    setTime(new Date().toISOString());
    const interval = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="telemetry-bar">
      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>POLICY HASH:</span>
        <span className="mono" style={{ color: "var(--cyan)", fontSize: "0.74rem" }}>
          8f7a9d3e5b1c4e6a...c0d
        </span>
      </div>

      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>UNDERLYINGS:</span>
        <span className="badge badge-cyan" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>SPY</span>
        <span className="badge badge-cyan" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>QQQ</span>
      </div>

      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>AUTHORITY:</span>
        <span style={{ color: "var(--amber)", fontWeight: 700 }}>VETO_OR_SHRINK</span>
      </div>

      <div className="telemetry-item">
        <span style={{ color: "var(--text-muted)" }}>CLOCK:</span>
        <span className="mono" style={{ color: "var(--emerald)" }}>
          {time || "2026-08-30T14:30:00.000Z"}
        </span>
      </div>
    </div>
  );
}
