"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ChevronRight, ShieldCheck, Zap, Layers, Lock, Key } from "lucide-react";

import { AuthorityBoundary } from "@/components/AuthorityBoundary";
import { AnimatedHeadline } from "@/components/AnimatedHeadline";
import { PipelineVisual } from "@/components/PipelineVisual";
import { CountUp } from "@/components/CountUp";
import { InteractiveGrid } from "@/components/InteractiveGrid";
import { PlatformAccordion } from "@/components/PlatformAccordion";
import { FaqSection } from "@/components/FaqSection";

interface HealthData {
  status: string;
  mode?: string;
  alpaca?: {
    connected: boolean;
    marketOpen: boolean;
    optionsApprovedLevel: number;
    equity: string;
  };
}

const PROOF_STEPS = [
  "Plain-English mandate compiles into a typed policy",
  "Alpha Engine proposes defined-risk SPY or QQQ verticals",
  "Safety Kernel re-checks state and verifies every invariant",
  "Permit Executor submits only an exact, unexpired TradePermit",
];

const WORKFLOW_SURFACES = [
  { title: "Candidate Lab", path: "/candidates", description: "Inspect ranked spreads, liquidity gates, quote freshness, and exact max-loss math." },
  { title: "Mandate Studio", path: "/mandates", description: "Turn trader intent into versioned policy JSON and block contradictions before activation." },
  { title: "Break Me", path: "/break-me", description: "Run hostile states against the Safety Kernel and see where the system refuses." },
  { title: "Permit Console", path: "/permits", description: "Review signed permits, nonce state, TTL windows, and exact order bindings." },
  { title: "Proof Explorer", path: "/proof", description: "Replay hash-chained evidence offline with recorded versus reproduced labels." },
  { title: "Shadow Ledger", path: "/shadow-ledger", description: "Measure what each enforced rule saved or cost without backfilled marks." },
];

function formatEquity(equity?: string): string {
  if (!equity) return "$100,000.00";
  return `$${Number(equity).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  const connected = health?.status === "healthy" && health.alpaca?.connected === true;
  const marketOpen = health?.alpaca?.marketOpen ?? false;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="flex-1 w-full overflow-hidden bg-[#F0EFE3]">
      
      {/* 1. PIPELINE VISUAL (First section, exactly like Auxia) */}
      <section className="pt-4 pb-0 w-full bg-[#F0EFE3]">
        <PipelineVisual />
      </section>

      {/* 2. HERO HEADLINE (Underneath pipeline) */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1500px] mx-auto px-6 pt-0 pb-8 md:pt-4 md:pb-12 flex flex-col items-start text-left"
      >
        <motion.h1 
          variants={itemVariants}
          className="text-[72px] md:text-[110px] lg:text-[130px] font-medium text-[#232323] leading-[0.9] tracking-[-0.04em] mb-10 max-w-5xl"
        >
          The trader,<br/>multiplied
        </motion.h1>
        
        <motion.p 
          variants={itemVariants} 
          className="text-[20px] md:text-[24px] text-[#232323] max-w-[700px] leading-[1.4] mb-12 font-normal"
        >
          Covenant is the agentic trading platform that runs the work across your brokerage and delivers risk-defined, mathematically proven execution for every mandate.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-8">
          <Link href="/mandates" className="inline-flex items-center justify-center px-8 py-4 bg-[#0B4FFF] hover:bg-[#093ED9] text-white text-[17px] font-medium rounded-xl transition-all hover:shadow-[0_4px_14px_0_rgba(11,79,255,0.39)] w-full sm:w-auto">
            Start Compilation
          </Link>
          
          <Link href="/break-me" className="text-[#232323] hover:text-[#0B4FFF] text-[17px] font-medium transition-colors">
            See how it works
          </Link>
        </motion.div>
      </motion.section>

      {/* 3. LOGO FARM (Infinite Marquee) */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="max-w-[1400px] mx-auto px-6 mb-24 md:mb-32 flex flex-col items-start gap-8 overflow-hidden"
      >
        <span className="text-[15px] text-[#74736A] whitespace-nowrap font-medium">
          Executing securely across trusted brokerages
        </span>
        
        <div 
          className="relative w-full overflow-hidden"
          style={{ maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}
        >
          <motion.div 
            className="flex items-center w-max opacity-80 hover:opacity-100 transition-opacity"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 35, repeat: Infinity }}
          >
            {[1, 2].map((set) => (
              <div key={set} className="flex items-center gap-12 md:gap-20 pr-12 md:pr-20">
                
                {/* Alpaca */}
                <div className="flex items-center gap-2.5 text-[#232323] cursor-default">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                  <span className="font-sans font-bold tracking-tight text-[22px]">alpaca</span>
                </div>
                
                {/* Interactive Brokers */}
                <div className="flex items-center gap-2.5 text-[#232323] cursor-default">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                  <span className="font-serif italic font-medium text-[20px] whitespace-nowrap">Interactive Brokers</span>
                </div>
                
                {/* TradeStation */}
                <div className="flex items-center gap-2.5 text-[#232323] cursor-default">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  <span className="font-mono font-bold tracking-tighter text-[19px]">TradeStation</span>
                </div>

                {/* Charles Schwab */}
                <div className="flex items-center gap-2 text-[#232323] cursor-default">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  <span className="font-sans font-light tracking-[0.2em] text-[16px] uppercase whitespace-nowrap">CHARLES SCHWAB</span>
                </div>

                {/* Robinhood */}
                <div className="flex items-center gap-2.5 text-[#232323] cursor-default">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="6.5"/></svg>
                  <span className="font-sans font-semibold tracking-tight text-[21px]">Robinhood</span>
                </div>

              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* 4. PROBLEM STATEMENT (Dark Section) */}
      <section className="w-full bg-[#1A1A1A] text-white py-32 md:py-48 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-start relative">
          
          {/* Left Column: Sticky Headline */}
          <div className="md:sticky md:top-48 h-fit">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-[50px] md:text-[70px] lg:text-[85px] font-medium leading-[0.95] tracking-[-0.03em]"
            >
              <span className="text-[#74736A]">Trading didn't<br/>get harder.</span><br/>
              <span className="text-white">It got reckless.</span>
            </motion.h2>
          </div>

          {/* Right Column: Spaced out paragraphs to force scrolling */}
          <div className="flex flex-col gap-12 md:gap-16 mt-0 md:mt-2">
            <motion.p 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-10%" }}
              transition={{ duration: 0.8 }}
              className="text-[20px] md:text-[24px] leading-[1.5] text-[#D1D1D1] font-normal"
            >
              Retail algorithmic traders are drowning in fragmented scripts, manual oversight, and brittle broker integrations just to execute simple strategies. Meanwhile, portfolios are pushed through chaotic, unverified logic built for backtests, not live markets.
            </motion.p>
            
            <motion.p 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-10%" }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-[20px] md:text-[24px] leading-[1.5] text-white font-normal"
            >
              Covenant’s agents work across your brokerage and create a mathematically verified execution path for every mandate, while continuously enforcing invariant risk limits. Trading stops being a liability and capital compounds over time.
            </motion.p>
          </div>
          
        </div>
      </section>

      {/* 5. ARCHITECTURE CARD */}
      <section className="w-full bg-[#F0EFE3] py-24 md:py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="max-w-[1400px] mx-auto bg-white border border-black/15 p-8 md:p-16 lg:p-24 shadow-none"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            
            {/* Left Column */}
            <div className="flex flex-col gap-12">
              <h2 className="text-[45px] md:text-[60px] lg:text-[70px] leading-[0.95] tracking-[-0.03em] font-medium text-[#232323]">
                The trading stack,<br/>modernized
              </h2>
              
              {/* 3D Isometric Image */}
              <div className="w-full aspect-square bg-[#F9F9F6] border border-black/10 flex items-center justify-center overflow-hidden relative group">
                 <div className="absolute inset-0 bg-gradient-to-br from-black/[0.02] to-transparent pointer-events-none" />
                 
                 {/* The Image */}
                 <motion.img 
                   src="/covenant-stack-figma.png" 
                   alt="Covenant 3-Layer Architecture" 
                   className="relative z-10 w-[110%] h-auto max-w-none transform -rotate-2 group-hover:rotate-0 transition-transform duration-700 ease-out"
                   initial={{ opacity: 0, scale: 0.9 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: false }}
                   transition={{ duration: 0.8, delay: 0.2 }}
                 />
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col">
              <p className="text-[20px] md:text-[22px] lg:text-[24px] leading-[1.5] text-[#74736A] font-normal mb-16 lg:mb-24 mt-2">
                Covenant’s Alpha Engine and Safety Kernel replace manual execution, connect your strategy to your brokerage, and replace recklessness with mathematical proof, all while continuously enforcing your exact risk limits.
              </p>

              <div className="text-[11px] md:text-[12px] font-mono uppercase tracking-[0.1em] text-[#74736A] mb-8 font-bold">
                ONE PLATFORM, THREE LAYERS<br/>— BUILT FOR THE AGENTIC TRADER
              </div>

              <div className="flex flex-col gap-10">
                {/* Layer 1 */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 bg-[#232323]" />
                    <h4 className="text-[20px] md:text-[22px] font-medium text-[#232323]">Alpha Engine</h4>
                  </div>
                  <p className="text-[15px] md:text-[16px] leading-[1.6] text-[#74736A] ml-6 md:ml-[26px]">
                    Agentic trading models that research, plan, structure, and propose defined-risk SPY and QQQ spreads, orchestrating market data across your brokerage integrations.
                  </p>
                </div>

                {/* Layer 2 */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 bg-[#0B4FFF]" />
                    <h4 className="text-[20px] md:text-[22px] font-medium text-[#232323]">Safety Kernel</h4>
                  </div>
                  <p className="text-[15px] md:text-[16px] leading-[1.6] text-[#74736A] ml-6 md:ml-[26px]">
                    Real-time cryptographic validation evaluates every proposed trade against your invariants, ensuring every execution is mathematically proven before a permit is signed.
                  </p>
                </div>

                {/* Layer 3 */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 bg-[#A1A1AA]" />
                    <h4 className="text-[20px] md:text-[22px] font-medium text-[#232323]">Data & State</h4>
                  </div>
                  <p className="text-[15px] md:text-[16px] leading-[1.6] text-[#74736A] ml-6 md:ml-[26px]">
                    Real-time market feeds and account state unified into a living context graph that knows your exact portfolio margin, buying power, and positions on every tick.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* 6. METRICS & SCALE (Customer Stories) */}
      <section className="w-full bg-[#F0EFE3] pb-24 md:pb-32 px-6">
        <div className="max-w-[1400px] mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            className="mb-12 md:mb-16"
          >
            <span className="text-[#74736A] text-[15px] mb-4 block">Performance Metrics</span>
            <h2 className="text-[45px] md:text-[60px] lg:text-[70px] font-medium tracking-tight text-[#232323] leading-none max-w-2xl">
              Mathematically proven at scale
            </h2>
          </motion.div>

          {/* The Scrolling Marquee Container */}
          <div 
            className="relative w-full overflow-hidden"
            style={{ maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}
          >
            <motion.div 
              className="flex items-stretch w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ ease: "linear", duration: 50, repeat: Infinity }}
            >
              {[1, 2].map((set) => (
                <div key={set} className="flex items-stretch gap-6 pr-6">
                  
                  {/* Card 1 */}
                  <div className="w-[350px] md:w-[450px] lg:w-[600px] shrink-0 bg-white border border-black/15 p-8 md:p-12 flex flex-col justify-between group hover:bg-[#EAEEDD] transition-colors duration-300 min-h-[420px]">
                    <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                      {/* Logo-styled typography */}
                      <div className="text-[32px] font-serif italic font-bold text-[#232323] leading-none lg:w-[40%]">
                        Quant<br/>Fund
                      </div>
                      <p className="text-[15px] lg:text-[16px] leading-relaxed text-[#74736A] lg:w-[60%]">
                        Automating delta-neutral derivatives strategies while enforcing strict margin invariants across fragmented execution venues.
                      </p>
                    </div>
                    <div className="mt-16">
                      <h3 className="text-[70px] lg:text-[100px] font-medium leading-[0.9] text-[#232323] tracking-[-0.04em]">
                        $4.2B+
                      </h3>
                      <p className="text-[17px] text-[#232323] font-medium mt-3">
                        monthly executed volume
                      </p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="w-[350px] md:w-[450px] lg:w-[600px] shrink-0 bg-white border border-black/15 p-8 md:p-12 flex flex-col justify-between group hover:bg-[#EAEEDD] transition-colors duration-300 min-h-[420px]">
                    <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                      {/* Logo-styled typography */}
                      <div className="text-[28px] font-mono font-black tracking-tighter text-[#232323] leading-none lg:w-[40%]">
                        [PROP.DESK]
                      </div>
                      <p className="text-[15px] lg:text-[16px] leading-relaxed text-[#74736A] lg:w-[60%]">
                        Deploying high-frequency statistical arbitrage models where every execution leg is proven against account constraints before routing.
                      </p>
                    </div>
                    <div className="mt-16">
                      <h3 className="text-[70px] lg:text-[100px] font-medium leading-[0.9] text-[#232323] tracking-[-0.04em]">
                        250M+
                      </h3>
                      <p className="text-[17px] text-[#232323] font-medium mt-3">
                        invariants verified daily
                      </p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="w-[350px] md:w-[450px] lg:w-[600px] shrink-0 bg-white border border-black/15 p-8 md:p-12 flex flex-col justify-between group hover:bg-[#EAEEDD] transition-colors duration-300 min-h-[420px]">
                    <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                      {/* Logo-styled typography */}
                      <div className="text-[24px] font-sans font-black tracking-[0.1em] uppercase text-[#232323] leading-none lg:w-[40%] flex items-start gap-2">
                        <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        RETAIL<br/>SYND.
                      </div>
                      <p className="text-[15px] lg:text-[16px] leading-relaxed text-[#74736A] lg:w-[60%]">
                        Retail developers safely deploying complex multi-leg options strategies through Covenant's cryptographic permit architecture.
                      </p>
                    </div>
                    <div className="mt-16">
                      <h3 className="text-[70px] lg:text-[100px] font-medium leading-[0.9] text-[#232323] tracking-[-0.04em]">
                        0
                      </h3>
                      <p className="text-[17px] text-[#232323] font-medium mt-3">
                        margin call liquidations
                      </p>
                    </div>
                  </div>

                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: false }}
        className="max-w-[1400px] mx-auto px-6 mb-32"
      >
        <div className="bg-[#EAEEDD] border border-black/15 p-12">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12"
          >
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
              }}
              className="flex flex-col gap-4"
            >
              <ShieldCheck className="w-8 h-8 text-[#0B4FFF]" />
              <h4 className="text-[#74736A] text-xs font-mono uppercase tracking-widest font-bold">Policy invariants</h4>
              <p className="text-5xl font-bold text-[#232323] tracking-tight flex items-baseline gap-1">
                <CountUp end={8} />
              </p>
              <p className="text-[#74736A] text-sm">COV-01 through COV-08 enforced before a permit exists</p>
            </motion.div>
            
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
              }}
              className="flex flex-col gap-4"
            >
              <Zap className="w-8 h-8 text-[#0B4FFF]" />
              <h4 className="text-[#74736A] text-xs font-mono uppercase tracking-widest font-bold">Permit TTL</h4>
              <p className="text-5xl font-bold text-[#232323] tracking-tight flex items-baseline gap-1">
                <CountUp end={60} suffix="s" />
              </p>
              <p className="text-[#74736A] text-sm">Single-use Ed25519 authorization bound to exact legs</p>
            </motion.div>
            
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
              }}
              className="flex flex-col gap-4"
            >
              <Layers className="w-8 h-8 text-[#0B4FFF]" />
              <h4 className="text-[#74736A] text-xs font-mono uppercase tracking-widest font-bold">Broker keys in alpha</h4>
              <p className="text-5xl font-bold text-[#232323] tracking-tight flex items-baseline gap-1">
                <CountUp end={0} />
              </p>
              <p className="text-[#74736A] text-sm">Strategy can draft, shrink, veto, or explain only</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Workflow Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false }}
        className="max-w-[1400px] mx-auto px-6 mb-32 relative"
      >
        <div className="text-center mb-16 max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-[#0B4FFF] mb-6">THE PLATFORM</h2>
          <p className="text-[45px] md:text-[55px] lg:text-[65px] font-medium tracking-tight text-[#232323] leading-[1.05]">
            Everything a user needs to inspect before trusting an agent.
          </p>
        </div>

        <div className="mt-8">
          <PlatformAccordion surfaces={WORKFLOW_SURFACES} />
        </div>
      </motion.section>

      {/* FAQ Section */}
      <FaqSection />


      {/* 12. INTERACTIVE FOOTER */}
      <footer className="relative w-full bg-[#0B4FFF] overflow-hidden min-h-[800px] flex flex-col justify-between pt-24 pb-8">
        {/* Interactive Canvas Background */}
        <InteractiveGrid />

        {/* Content Container (z-10 to stay above canvas) */}
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 flex-1 flex flex-col justify-between pointer-events-none">
          
          {/* Top: CTA */}
          <div className="max-w-3xl pointer-events-auto">
            <h2 className="text-[50px] md:text-[70px] lg:text-[85px] font-medium leading-[0.95] text-white tracking-tight mb-8">
              Turn every execution into mathematical certainty.
            </h2>
            <div className="flex flex-wrap gap-4">
              <button className="bg-white text-[#0B4FFF] px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/90 transition-colors">
                Start Compilation
              </button>
              <button className="bg-black/20 text-white px-8 py-4 rounded-xl font-medium text-lg backdrop-blur-sm hover:bg-black/30 transition-colors border border-white/10">
                Read the Documentation
              </button>
            </div>
          </div>

          {/* Middle: Massive Logo */}
          <div className="w-full mt-32 mb-16 overflow-hidden flex justify-center">
            <motion.h1 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-10%" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1, delayChildren: 0.2 }
                }
              }}
              className="text-[16vw] leading-none font-bold text-[#F3F1E7] tracking-tighter select-none pointer-events-none flex" 
              style={{ marginLeft: '-0.02em', marginBottom: '-0.15em' }}
            >
              {"covenant".split("").map((char, index) => (
                <motion.span
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 100 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </motion.h1>
          </div>

          {/* Bottom: Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-[#F3F1E7]/80 text-sm pointer-events-auto">
            <div className="flex flex-col gap-8 justify-end h-full">
              <div className="text-xs tracking-widest uppercase font-bold text-white/50">
                © 2026 COVENANT. ALL RIGHTS RESERVED.
              </div>
              <div className="flex gap-4">
                <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                <span>•</span>
                <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <span className="text-xs uppercase tracking-widest font-bold text-white/50">Company</span>
              <div className="flex flex-col gap-4 text-base">
                <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
                <Link href="#" className="hover:text-white transition-colors">Twitter / X</Link>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <span className="text-xs uppercase tracking-widest font-bold text-white/50">Product</span>
              <div className="flex flex-col gap-4 text-base">
                <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
                <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <span className="text-xs uppercase tracking-widest font-bold text-white/50">Resources</span>
              <div className="flex flex-col gap-4 text-base">
                <Link href="#" className="hover:text-white transition-colors">Blog</Link>
                <Link href="#" className="hover:text-white transition-colors">hello@covenant.trade</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
