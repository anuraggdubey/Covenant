"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowDown, ShieldCheck } from "lucide-react";

const FAQS = [
  {
    question: "What is Covenant?",
    answer: "Covenant is an agentic trading platform that uses AI models to propose trades and a cryptographic Safety Kernel to verify every execution against your risk invariants before a single order is placed."
  },
  {
    question: "How does the Safety Kernel work?",
    answer: "Every trade proposed by the Alpha Engine is validated against 8 policy invariants (COV-01 through COV-08). If any invariant fails, the system returns ABSTAIN — no permit is signed, no order is placed."
  },
  {
    question: "Can Covenant access my brokerage credentials?",
    answer: "No. Covenant enforces a strict authority boundary. The Alpha Engine (strategy layer) has zero access to broker keys. Only the isolated Permit Executor can submit orders, and only with a cryptographically signed, unexpired permit."
  },
  {
    question: "Is this live trading or paper trading?",
    answer: "Covenant is currently paper-trading only. All executions run against Alpaca's paper trading environment. No live endpoints are enabled."
  },
  {
    question: "What instruments does Covenant trade?",
    answer: "Covenant focuses exclusively on defined-risk SPY and QQQ vertical spreads — both calls and puts. Every position has a mathematically bounded max loss."
  },
  {
    question: "What happens if a trade violates my risk limits?",
    answer: "The Safety Kernel blocks it instantly. The permit is never signed. The system logs the violation, records the invariant that failed, and the Alpha Engine is notified to adjust."
  }
];

export function FaqSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <section className="w-full bg-[#F0EFE3] pt-20 pb-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        
        {/* Massive Headline */}
        <div className="w-full text-center mb-12 md:mb-16 flex flex-col items-center">
          <h2 className="text-[32px] sm:text-[45px] md:text-[75px] lg:text-[95px] font-serif tracking-tighter leading-[1.1] text-[#232323]">
            <span className="italic">YOU HAVE QUESTIONS.</span>
            <br />
            WE HAVE{" "}
            <span className="inline-flex items-center justify-center bg-[#0B4FFF] text-white p-1.5 md:p-3 rounded-lg md:rounded-2xl mx-1 md:mx-3 align-middle md:-translate-y-1 shadow-[0_4px_20px_rgba(11,79,255,0.3)]">
              <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-14 lg:h-14" strokeWidth={1.5} />
            </span>
            {" "}ANSWERS.
          </h2>
        </div>

        {/* Scroll Indicator */}
        <div className="flex justify-between items-end border-b border-black/10 pb-4 mb-16">
          <span className="text-sm font-medium text-[#74736A]">Scroll to explore</span>
          <ArrowDown className="w-5 h-5 text-[#74736A]" strokeWidth={1.5} />
        </div>

        {/* Main Content: 2 Columns */}
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12">
          
          {/* Left: Tagline */}
          <div className="lg:col-span-4">
            <h3 className="text-[24px] md:text-[32px] font-medium leading-[1.2] text-[#232323] sticky top-32 tracking-tight">
              Whatever you need to know about verified trading, we got you covered.
            </h3>
          </div>

          {/* Right: Accordion */}
          <div className="lg:col-span-8 flex flex-col">
            {FAQS.map((faq, idx) => {
              const isActive = activeIndex === idx;

              return (
                <div key={idx} className="border-b border-black/10">
                  <div 
                    className="w-full py-8 flex items-center justify-between cursor-pointer group"
                    onClick={() => setActiveIndex(isActive ? null : idx)}
                  >
                    <h4 className={`text-xl md:text-[22px] font-medium transition-colors ${isActive ? 'text-[#0B4FFF]' : 'text-[#232323] group-hover:text-black/70'}`}>
                      {faq.question}
                    </h4>
                    
                    <div className={`ml-8 flex-shrink-0 transition-transform duration-300 ${isActive ? 'rotate-180 text-[#0B4FFF]' : 'text-[#232323]'}`}>
                      {isActive ? <Minus className="w-6 h-6" strokeWidth={1.5} /> : <Plus className="w-6 h-6" strokeWidth={1.5} />}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                          open: { opacity: 1, height: "auto", paddingBottom: "2.5rem" },
                          collapsed: { opacity: 0, height: 0, paddingBottom: 0 }
                        }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-[17px] leading-relaxed text-[#74736A] max-w-2xl">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
