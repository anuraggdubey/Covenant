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
    <header className="sticky top-0 z-50 bg-[#F0EFE3] border-t-4 border-[#0B4FFF]">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-[76px]">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5" aria-label="Covenant home">
          <span className="text-[#0B4FFF]"><CovenantMark size={28} /></span>
          <span className="text-[22px] font-medium text-[#232323] tracking-tight leading-none lowercase">covenant</span>
        </Link>

        {/* Right: Links + CTA + Status */}
        <div className="flex items-center gap-8">
          
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {PRIMARY_ROUTES.map((route) => {
              const isActive = pathname === route.path;
              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className={`text-[15px] transition-colors ${
                    isActive
                      ? "text-[#232323] font-medium"
                      : "text-[#74736A] hover:text-[#232323]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {route.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/mandates"
              className="bg-[#0B4FFF] hover:bg-[#093ED9] text-white text-[15px] font-medium px-6 py-2.5 rounded-full transition-all hover:shadow-[0_4px_14px_0_rgba(11,79,255,0.39)]"
            >
              Start
            </Link>

            <div className="w-[1px] h-6 bg-[#D1D5DB]" /> {/* Vertical Separator */}

            <div className="flex items-center gap-2 text-[15px] text-[#74736A]">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.connected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span>{health?.connected ? "Connected" : health?.mode ?? "Paper"}</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
