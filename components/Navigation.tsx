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

/**
 * The mark: a ring with a gap. A boundary that is deliberately not closed —
 * the agent can act, but only through the opening. Cheaper than a logo and it
 * actually means something.
 */
function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="33 11"
        transform="rotate(-45 9 9)"
      />
    </svg>
  );
}

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}
        aria-label="Covenant home"
      >
        <Mark />
        <span style={{ fontWeight: 650, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
          Covenant
        </span>
      </Link>

      <div className="nav-links">
        {NAV_ROUTES.map((route) => {
          const isActive = pathname === route.path;
          return (
            <Link
              key={route.path}
              href={route.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {route.label}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        <span className="badge badge-cyan">Paper only</span>
        <span className="badge badge-amber">Account unverified</span>
      </div>
    </nav>
  );
}
