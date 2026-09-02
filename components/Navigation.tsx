"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CovenantMark } from "@/components/CovenantMark";

const PRIMARY_ROUTES = [
  { label: "Candidates", path: "/candidates" },
  { label: "Mandates", path: "/mandates" },
  { label: "Break Me", path: "/break-me" },
  { label: "Permits", path: "/permits" },
  { label: "Proof", path: "/proof" },
  { label: "Shadow Ledger", path: "/shadow-ledger" },
];

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
    <header className="relative w-full bg-[#F0EFE3] border-b border-black/10">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-[56px]">
        
        {/* Left: Boxed Logo (matching reference style) */}
        <Link 
          href="/" 
          className="flex items-center gap-2 px-2.5 py-1 border border-[#232323] hover:bg-black/[0.03] transition-colors" 
          aria-label="Covenant home"
        >
          <span className="text-[#0B4FFF]">
            <CovenantMark size={18} />
          </span>
          <span className="text-[14px] font-semibold text-[#232323] tracking-tight leading-none lowercase">
            covenant
          </span>
        </Link>

        {/* Right: Nav Links + CTA Button + Status Indicator */}
        <div className="flex items-center gap-6 md:gap-7">
          
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
            {PRIMARY_ROUTES.map((route) => {
              const isActive = pathname === route.path;
              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className={`text-[13px] font-normal transition-colors ${
                    isActive
                      ? "text-[#232323] font-medium"
                      : "text-[#525252] hover:text-[#232323]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {route.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/mandates"
              className="bg-[#0B4FFF] hover:bg-[#093ED9] text-white text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors inline-flex items-center justify-center whitespace-nowrap shadow-none"
            >
              Start Studio
            </Link>

            <div className="hidden sm:block w-[1px] h-3.5 bg-black/20" />

            <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-[#525252]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  health?.connected ? "bg-emerald-600" : "bg-amber-600"
                }`}
              />
              <span className="font-mono text-[11px] uppercase tracking-wider">
                {health?.connected ? "LIVE PAPER" : health?.mode === "PAPER_TRADING" ? "PAPER" : "LOCAL"}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
