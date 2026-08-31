import Link from "next/link";

interface UnavailableCapabilityProps {
  title: string;
  owner: string;
  dependency: string;
  description: string;
}

export function UnavailableCapability({
  title,
  owner,
  dependency,
  description,
}: UnavailableCapabilityProps) {
  return (
    <div className="page-container">
      <span className="badge badge-amber">NOT IMPLEMENTED</span>
      <h1 style={{ fontSize: "2.4rem", fontWeight: 900, marginTop: "14px" }}>{title}</h1>
      <p style={{ color: "var(--text-secondary)", maxWidth: "720px", lineHeight: 1.6 }}>
        {description}
      </p>
      <div className="glass-panel" style={{ padding: "20px", marginTop: "24px", maxWidth: "720px" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <div><strong>Owner:</strong> {owner}</div>
          <div><strong>Required dependency:</strong> {dependency}</div>
          <div style={{ color: "var(--text-secondary)" }}>
            No permits, orders, proof events, test coverage, or performance metrics are displayed until persisted evidence exists.
          </div>
        </div>
      </div>
      <Link href="/candidates" className="btn-secondary" style={{ display: "inline-flex", marginTop: "24px" }}>
        Open Candidate Lab
      </Link>
    </div>
  );
}
