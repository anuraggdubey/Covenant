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
          PAPER-ONLY BUILD
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

      <span className="badge badge-amber" style={{ fontSize: "0.68rem" }}>
        ACCOUNT UNVERIFIED
      </span>
    </nav>
  );
}
