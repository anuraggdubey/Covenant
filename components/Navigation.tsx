"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ROUTES = [
  { label: "Overview", path: "/" },
  { label: "Candidate Lab", path: "/candidates" },
  { label: "Mandate Studio", path: "/mandates" },
  { label: "Break Me", path: "/break-me" },
  { label: "Permit Console", path: "/permits" },
  { label: "Execution", path: "/execution" },
  { label: "Proof Explorer", path: "/proof" },
  { label: "Shadow Ledger", path: "/shadow-ledger" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "var(--cyan)",
              boxShadow: "0 0 10px var(--cyan)",
            }}
          />
          <span style={{ fontWeight: 900, fontSize: "1.15rem", letterSpacing: "0.02em" }}>
            COVENANT
          </span>
        </Link>
        <span className="badge badge-cyan" style={{ fontSize: "0.68rem" }}>
          PAPER TRADING
        </span>
      </div>

      <div className="nav-links">
        {NAV_ROUTES.map((route) => {
          const isActive = pathname === route.path;
          return (
            <Link
              key={route.path}
              href={route.path}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              {route.label}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
            Paper Equity
          </div>
          <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--emerald)" }}>
            $100,000.00
          </div>
        </div>
        <span className="badge badge-emerald" style={{ fontSize: "0.68rem" }}>
          LEVEL 3 APPROVED
        </span>
      </div>
    </nav>
  );
}
