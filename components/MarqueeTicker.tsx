"use client";

import React from "react";

const items = [
  "PAPER TRADING ONLY",
  "COV-01…COV-08 ENFORCED",
  "ED25519 PERMITS",
  "DEFINED-RISK ONLY",
  "FAIL-CLOSED STATE",
  "60s PERMIT TTL",
];

export function MarqueeTicker() {
  return (
    <div className="bg-zinc-950 py-2.5 border-y border-white/5 overflow-hidden">
      <div
        className="flex w-max items-center animate-marquee"
        style={{ "--marquee-duration": "40s" } as React.CSSProperties}
      >
        {/* Render twice for seamless loop */}
        {[0, 1].map((groupIndex) => (
          <div
            key={groupIndex}
            className="flex w-max items-center"
            aria-hidden={groupIndex === 1 ? "true" : undefined}
          >
            {items.map((item, i) => (
              <React.Fragment key={`${groupIndex}-${i}`}>
                <span className="font-mono text-[11px] tracking-widest uppercase text-white/70 mx-4 whitespace-nowrap">
                  {item}
                </span>
                <span className="font-mono text-[11px] text-purple-500/50">
                  •
                </span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
