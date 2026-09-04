"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CovenantMark } from "@/components/CovenantMark";
import { Menu, X } from "lucide-react";

const PRIMARY_ROUTES = [
  { label: "Candidates", path: "/candidates" },
  { label: "Mandates", path: "/mandates" },
  { label: "Break Me", path: "/break-me" },
  { label: "Permits", path: "/permits" },
  { label: "Execution", path: "/execution" },
  { label: "Proof", path: "/proof" },
  { label: "Shadow Ledger", path: "/shadow-ledger" },
  { label: "Write-Up", path: "/writeup" },
];

export function Navigation() {
  const pathname = usePathname();
  const [health, setHealth] = useState<{ connected: boolean; mode: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="relative z-50 bg-[#F0EFE3] border-t-4 border-[#0B4FFF]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 flex items-center justify-between h-[76px]">
        
        {/* Left: Boxed Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2 px-2.5 py-1 border border-[#232323] hover:bg-black/[0.03] transition-colors shrink-0" 
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
        <div className="flex items-center gap-4 md:gap-7">
          
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

          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/mandates"
              className="bg-[#0B4FFF] hover:bg-[#093ED9] text-white text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors hidden sm:inline-flex items-center justify-center whitespace-nowrap shadow-none"
            >
              Start Studio
            </Link>

            <div className="hidden sm:block w-[1px] h-3.5 bg-black/20" />

            <div className="flex items-center gap-1.5 text-[12px] text-[#525252]">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  health?.connected ? "bg-emerald-600" : "bg-amber-600"
                }`}
              />
              <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-wider whitespace-nowrap">
                {health?.connected ? "LIVE PAPER" : health?.mode === "PAPER_TRADING" ? "PAPER" : "LOCAL"}
              </span>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden ml-1 p-1.5 text-[#232323] hover:bg-black/5 rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-[76px] left-0 right-0 bg-[#F0EFE3] border-b border-black/15 shadow-xl flex flex-col px-4 py-2">
          {PRIMARY_ROUTES.map((route) => {
            const isActive = pathname === route.path;
            return (
              <Link
                key={route.path}
                href={route.path}
                className={`px-4 py-3 border-b border-black/5 last:border-0 text-[14px] transition-colors ${
                  isActive
                    ? "text-[#0B4FFF] font-medium"
                    : "text-[#525252] hover:text-[#232323]"
                }`}
              >
                {route.label}
              </Link>
            );
          })}
          <Link
            href="/mandates"
            className="mx-4 my-4 bg-[#0B4FFF] hover:bg-[#093ED9] text-white text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors text-center shadow-none sm:hidden"
          >
            Start Studio
          </Link>
        </div>
      )}
    </header>
  );
}
