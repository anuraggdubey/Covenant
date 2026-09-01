"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CovenantMark } from "@/components/CovenantMark";

const PRIMARY_ROUTES = [
  { label: "Overview", path: "/" },
  { label: "Candidates", path: "/candidates" },
  { label: "Mandates", path: "/mandates" },
  { label: "Break Me", path: "/break-me" },
];

const SECONDARY_ROUTES = [
  { label: "Permits", path: "/permits" },
  { label: "Execution", path: "/execution" },
  { label: "Proof", path: "/proof" },
  { label: "Shadow", path: "/shadow-ledger" },
];

function Mark() {
  // The covalent mark: two nuclei, and the lens they share is the bond.
  return (
    <span className="brand-mark" style={{ color: "var(--accent)" }}>
      <CovenantMark size={26} />
    </span>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [health, setHealth] = useState<{ connected: boolean; mode: string } | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => {
        setHealth({
          connected: data?.alpaca?.connected ?? false,
          mode: data?.mode ?? "PAPER_TRADING",
        });
      })
      .catch(() => setHealth(null));
  }, []);

  return (
    <header className="site-header">
      <div className="site-announcement">
        <span className="announcement-track">
          Paper trading only / Proof-carrying vertical spreads / Signed permits / Replayable decisions
        </span>
      </div>

      <nav className="top-nav" aria-label="Main navigation">
        <Link href="/" className="brand-link" aria-label="Covenant home">
          <Mark />
          <span>Covenant</span>
        </Link>

        <div className="nav-center" aria-label="Core product areas">
          {PRIMARY_ROUTES.map((route) => {
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

        <div className="nav-actions">
          <div className="nav-more" aria-label="Audit tools">
            {SECONDARY_ROUTES.map((route) => {
              const isActive = pathname === route.path;
              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className={`nav-item compact ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {route.label}
                </Link>
              );
            })}
          </div>
          <span className="nav-status">
            <span className={health?.connected ? "status-light connected" : "status-light"} />
            {health?.connected ? "Connected" : health?.mode ?? "Paper mode"}
          </span>
          <Link href="/mandates" className="nav-cta">
            Start
          </Link>
        </div>
      </nav>
    </header>
  );
}
