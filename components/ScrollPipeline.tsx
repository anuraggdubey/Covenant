"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { Check, ShieldCheck, FileCode2, FlaskConical, FileKey2 } from "lucide-react";

const STEPS = [
  { id: 1, label: "MANDATE", icon: FileCode2, text: "Plain-English mandate compiles into a typed policy" },
  { id: 2, label: "ALPHA ENGINE", icon: FlaskConical, text: "Alpha Engine proposes defined-risk SPY or QQQ verticals" },
  { id: 3, label: "SAFETY KERNEL", icon: ShieldCheck, text: "Safety Kernel re-checks state and verifies every invariant" },
  { id: 4, label: "EXECUTOR", icon: FileKey2, text: "Permit Executor submits only an exact, unexpired TradePermit" },
];

export function ScrollPipeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.15) setActiveStep(0);
    else if (latest < 0.35) setActiveStep(1);
    else if (latest < 0.55) setActiveStep(2);
    else if (latest < 0.75) setActiveStep(3);
    else setActiveStep(4);
  });

  const lineProgress = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);

  return (
    // Outer scroll container — height drives the scroll range.
    // Background matches the page's beige so there's no jarring white block.
    <section ref={containerRef} className="relative h-[250vh]" style={{ backgroundColor: "#F0EFE3" }}>
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden" style={{ backgroundColor: "#F0EFE3" }}>
        <div className="w-full max-w-[1300px] mx-auto px-8 md:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* ───────── LEFT: Heading + Steps ───────── */}
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-[#0B4FFF] mb-4">HOW IT WORKS</h2>
                <p className="text-[40px] md:text-[50px] lg:text-[58px] font-medium tracking-tight text-[#232323] leading-[1.05]">
                  The proof-carrying<br />execution pipeline.
                </p>
              </div>

              <div className="flex flex-col gap-6 mt-4">
                {STEPS.map((step, idx) => {
                  const isActive = activeStep === idx + 1;
                  const isPast  = activeStep > idx + 1;
                  const isFuture = activeStep < idx + 1;

                  return (
                    <motion.div
                      key={step.id}
                      animate={{
                        opacity: isFuture ? 0.25 : 1,
                        x: isActive ? 12 : 0,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="flex items-start gap-5"
                    >
                      {/* Number / Check circle */}
                      <div
                        className={`flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-500
                          ${isActive
                            ? "border-[#0B4FFF] bg-[#0B4FFF] text-white shadow-[0_0_20px_rgba(11,79,255,0.45)]"
                            : isPast
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-black/10 bg-white text-[#A1A1AA]"
                          }`}
                      >
                        {isPast ? <Check className="w-5 h-5" strokeWidth={3} /> : step.id}
                      </div>

                      <p
                        className={`text-lg md:text-xl lg:text-[22px] leading-snug pt-2 transition-colors duration-500
                          ${isActive ? "text-[#232323] font-semibold" : isPast ? "text-[#232323]" : "text-[#A1A1AA]"}`}
                      >
                        {step.text}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Final status badge */}
              <motion.div
                animate={{
                  opacity: activeStep >= 4 ? 1 : 0,
                  y: activeStep >= 4 ? 0 : 10,
                }}
                transition={{ duration: 0.4 }}
                className="mt-2 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-full px-5 py-2 text-sm font-bold tracking-wide w-fit"
              >
                <Check className="w-4 h-4" strokeWidth={3} /> PERMIT SIGNED — READY TO EXECUTE
              </motion.div>
            </div>

            {/* ───────── RIGHT: Visual Pipeline ───────── */}
            <div className="hidden lg:flex justify-center items-center">
              <div className="relative w-[200px] h-[520px]">
                {/* Background track */}
                <div className="absolute left-1/2 top-[30px] bottom-[30px] w-[3px] -translate-x-1/2 bg-black/[0.06] rounded-full" />

                {/* Active track (blue fill) */}
                <motion.div
                  className="absolute left-1/2 top-[30px] bottom-[30px] w-[3px] -translate-x-1/2 rounded-full origin-top"
                  style={{
                    scaleY: lineProgress,
                    background: "linear-gradient(180deg, #0B4FFF 0%, #3B82F6 60%, #22C55E 100%)",
                    boxShadow: "0 0 12px rgba(11,79,255,0.4)",
                  }}
                />

                {/* 4 Nodes */}
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isReached = activeStep >= idx + 1;
                  const isCurrent = activeStep === idx + 1;
                  const isLast = idx === 3;
                  const yPos = idx * (460 / 3); // Evenly distribute from 0 to 460

                  return (
                    <div
                      key={step.id}
                      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                      style={{ top: `${yPos}px` }}
                    >
                      {/* Node circle */}
                      <motion.div
                        animate={{
                          scale: isCurrent ? 1.15 : 1,
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center transition-all duration-500
                          ${isReached
                            ? isLast && activeStep >= 4
                              ? "bg-emerald-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                              : "bg-[#0B4FFF] text-white shadow-[0_0_30px_rgba(11,79,255,0.4)]"
                            : "bg-white border-2 border-black/10 text-black/25"
                          }`}
                      >
                        {isLast && activeStep >= 4 ? (
                          <Check className="w-7 h-7" strokeWidth={3} />
                        ) : (
                          <Icon className="w-7 h-7" strokeWidth={1.5} />
                        )}
                      </motion.div>

                      {/* Label */}
                      <span
                        className={`text-[10px] font-bold tracking-[0.15em] transition-colors duration-500 whitespace-nowrap
                          ${isReached
                            ? isLast && activeStep >= 4
                              ? "text-emerald-600"
                              : "text-[#0B4FFF]"
                            : "text-black/25"
                          }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}

                {/* Traveling token (glowing dot) */}
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 z-20"
                  style={{
                    top: useTransform(scrollYProgress, [0.1, 0.35, 0.55, 0.8], [0, 153, 307, 460]),
                  }}
                >
                  <div className="w-4 h-4 -translate-y-1/2 rounded-full bg-white border-[3px] border-[#0B4FFF] shadow-[0_0_16px_rgba(11,79,255,0.8)]" />
                </motion.div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
