"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterGroup {
  title: string;
  links: FooterLink[];
}

const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Candidate Lab", href: "/candidates" },
      { label: "Mandate Studio", href: "/mandates" },
      { label: "Break Me", href: "/break-me" },
    ],
  },
  {
    title: "Proof",
    links: [
      { label: "Permit Console", href: "/permits" },
      { label: "Execution", href: "/execution" },
      { label: "Proof Explorer", href: "/proof" },
      { label: "Shadow Ledger", href: "/shadow-ledger" },
    ],
  },
  {
    title: "Connect & Docs",
    links: [
      { label: "Documentation", href: "https://github.com/anuraggdubey/Covenant", external: true },
      { label: "GitHub", href: "https://github.com/anuraggdubey/Covenant", external: true },
      { label: "Twitter (X)", href: "https://x.com/anuraggdubeyy", external: true },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/anurag-dubey-407435349/", external: true },
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="bg-[#F0EFE3] border-t border-black/5 mt-32">
      <div className="max-w-[1400px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12">
          <div>
            <Link href="/" className="text-2xl font-extrabold text-[#232323] tracking-tight" aria-label="Covenant home">
              Covenant
            </Link>
            <h2 className="mt-4 text-lg font-semibold text-[#232323]">Proof before permission.</h2>
            <p className="mt-3 text-sm text-[#74736A] leading-relaxed max-w-sm">
              A paper-trading options agent where strategy can propose, but only a signed,
              exact-match TradePermit can execute.
            </p>
            <div className="mt-6 bg-black/5 border border-black/5 rounded-lg p-4">
              <span className="block text-xs text-[#74736A] uppercase tracking-widest font-mono">Verify locally</span>
              <code className="block mt-2 font-mono text-sm text-[#0B4FFF]">npm run verify -- demo/run_manifest.json</code>
            </div>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#232323] mb-4 font-mono">{group.title}</h3>
              <nav className="flex flex-col">
                {group.links.map((link) =>
                  link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={`${group.title}-${link.href}-${link.label}`}
                      className="block text-sm text-[#74736A] hover:text-[#0B4FFF] transition-colors py-1.5"
                    >
                      {link.label} ↗
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      key={`${group.title}-${link.href}-${link.label}`}
                      className="block text-sm text-[#74736A] hover:text-[#0B4FFF] transition-colors py-1.5"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-black/5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[#74736A] font-mono">
          <span>Paper trading only. Not investment advice. Built for the Alpaca Autonomous Trading Hackathon.</span>
          <div className="flex items-center gap-4">
            <a href="https://x.com/anuraggdubeyy" target="_blank" rel="noopener noreferrer" className="hover:text-[#0B4FFF]">@anuraggdubeyy</a>
            <span>·</span>
            <a href="https://github.com/anuraggdubey/Covenant" target="_blank" rel="noopener noreferrer" className="hover:text-[#0B4FFF]">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
