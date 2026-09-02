"use client";

import { useEffect } from "react";
import { useAnimate, stagger } from "framer-motion";
import { Check, Loader2, ShieldCheck, Zap, ArrowUp } from "lucide-react";

export function PipelineVisual() {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    let isCancelled = false;

    // Safe wrapper: framer-motion's animate() throws when querySelectorAll
    // returns null (element not in DOM). This silently swallows that error.
    const safeAnimate = async (...args: any[]) => {
      try {
        return await (animate as any)(...args);
      } catch {
        // Element not mounted yet or already unmounted — skip gracefully
      }
    };

    const runSequence = async () => {
      if (isCancelled) return;
      // 1. Initial State (reset)
      await safeAnimate([
        [".blue-line-mask", { clipPath: "inset(0% 100% 0% 0%)" }, { duration: 0 }],
        [".tag-wrap", { width: 0, opacity: 0 }, { duration: 0 }],
        [".tag-pill", { backgroundColor: "#F0EFE3", borderColor: "#E2E1D3" }, { duration: 0 }],
        [".tag-icon", { color: "#a1a1aa" }, { duration: 0 }],
        [".tag-text", { color: "#a1a1aa" }, { duration: 0 }],
        [".step-card", { y: 32, opacity: 0, filter: "blur(10px)" }, { duration: 0 }],
        [".card-inner-item", { y: 10, opacity: 0, color: "#a1a1aa" }, { duration: 0 }],
        [".spinner-icon", { opacity: 1, display: "block" }, { duration: 0 }],
        [".check-icon", { opacity: 0, display: "none" }, { duration: 0 }],
        [".execute-flash", { opacity: 0, scale: 0.95 }, { duration: 0 }],
        [".execute-text", { opacity: 0, y: 10 }, { duration: 0 }],
      ]);

      if (isCancelled) return;

      // 2. Phase 1: Draw Line & Expand Tags Synced
      // The line wipes from 100% inset to 0% inset taking 1.6s
      safeAnimate(".blue-line-mask", { clipPath: "inset(0% 0% 0% 0%)" }, { duration: 1.6, ease: "linear" });
      
      // Expand the pills exactly as the line passes them (staggered by 0.4s)
      safeAnimate(".tag-pill", { 
        backgroundColor: "#DCE1EB", // Solid grey/blue bg like Auxia
        borderColor: "#DCE1EB" // Remove border effect
      }, { duration: 0.4, delay: stagger(0.4) });
      safeAnimate(".tag-icon", { color: "#0B4FFF" }, { duration: 0.4, delay: stagger(0.4) });
      safeAnimate(".tag-text", { color: "#232323" }, { duration: 0.4, delay: stagger(0.4) });
      
      await safeAnimate(".tag-wrap", { width: "auto", opacity: 1 }, { duration: 0.4, delay: stagger(0.4), ease: "easeOut" });

      if (isCancelled) return;

      // 4. Phase 3: Reveal Cards
      await safeAnimate(".step-card", { y: 0, opacity: 1, filter: "blur(0px)" }, { duration: 0.8, delay: stagger(0.15), ease: "easeOut" });

      if (isCancelled) return;

      // 5. Phase 4: Inner Content Sequence
      await safeAnimate(".card-inner-item", { y: 0, opacity: 1 }, { duration: 0.4, delay: stagger(0.1) });

      if (isCancelled) return;

      // Card 2 Sequence (Alpha)
      await safeAnimate(".alpha-item-1", { color: "#232323" }, { duration: 0.3 });
      safeAnimate(".alpha-spin-1", { opacity: 0, display: "none" }, { duration: 0.1 });
      await safeAnimate(".alpha-check-1", { opacity: 1, display: "block", color: "#0B4FFF" }, { duration: 0.2 });

      await safeAnimate(".alpha-item-2", { color: "#232323" }, { duration: 0.3 });
      safeAnimate(".alpha-spin-2", { opacity: 0, display: "none" }, { duration: 0.1 });
      await safeAnimate(".alpha-check-2", { opacity: 1, display: "block", color: "#0B4FFF" }, { duration: 0.2 });

      await safeAnimate(".alpha-item-3", { color: "#232323" }, { duration: 0.3 });
      safeAnimate(".alpha-spin-3", { opacity: 0, display: "none" }, { duration: 0.1 });
      await safeAnimate(".alpha-check-3", { opacity: 1, display: "block", color: "#0B4FFF" }, { duration: 0.2 });

      if (isCancelled) return;

      // Card 3 Sequence (Kernel)
      await safeAnimate(".verify-item-1", { color: "#232323" }, { duration: 0.3, delay: 0.2 });
      await safeAnimate(".verify-item-2", { color: "#0B4FFF" }, { duration: 0.3, delay: 0.2 });

      if (isCancelled) return;

      // Card 4 Sequence (Executor Flash)
      await safeAnimate(".execute-flash", { opacity: 1, scale: 1 }, { duration: 0.6, ease: "easeOut" });
      await safeAnimate(".execute-text", { opacity: 1, y: 0 }, { duration: 0.4, ease: "easeOut" });

      if (isCancelled) return;

      // 6. Phase 5: Hold
      await new Promise((r) => setTimeout(r, 3500));

      if (isCancelled) return;

      // 7. Phase 6: Outro (Reverse)
      safeAnimate(".step-card", { y: 32, opacity: 0, filter: "blur(5px)" }, { duration: 0.5, delay: stagger(0.1) });
      safeAnimate(".tag-pill", { backgroundColor: "#F0EFE3", borderColor: "#E2E1D3" }, { duration: 0.5 });
      safeAnimate(".tag-icon", { color: "#a1a1aa" }, { duration: 0.5 });
      safeAnimate(".tag-text", { color: "#a1a1aa" }, { duration: 0.5 });
      safeAnimate(".tag-wrap", { width: 0, opacity: 0 }, { duration: 0.5 });
      await safeAnimate(".blue-line-mask", { clipPath: "inset(0% 100% 0% 0%)" }, { duration: 0.6, delay: 0.3, ease: "easeIn" });

      if (!isCancelled) {
        runSequence(); // Loop
      }
    };

    runSequence();

    return () => {
      isCancelled = true;
    };
  }, [animate]);

  return (
    <div ref={scope} className="w-full py-6 relative overflow-hidden">
      
      {/* DESKTOP INFINITE LINE TRACK & TAGS */}
      <div className="absolute top-[28px] left-0 w-full h-[71px] z-0 pointer-events-none hidden md:block">
        
        {/* Grey Track (Base) */}
        <div className="absolute inset-0 max-w-[1500px] mx-auto px-4 lg:px-0">
          <div className="relative w-full h-full">
            <div className="absolute right-[100%] top-[1px] w-[50vw] h-[2px] bg-[#E2E1D3]" />
            <svg className="w-full h-full" viewBox="0 0 1231 71" fill="none" preserveAspectRatio="none">
              <path d="M0 1H248.5C261.755 1 272.5 11.7452 272.5 25V45.416C272.5 58.6708 283.245 69.416 296.5 69.416H1230.5" stroke="#E2E1D3" strokeWidth="2" />
            </svg>
            <div className="absolute left-[100%] top-[69.4px] w-[50vw] h-[2px] bg-[#E2E1D3]" />
          </div>
        </div>

        {/* Blue Track (Clipped Mask) */}
        <div className="blue-line-mask absolute inset-0 max-w-[1500px] mx-auto px-4 lg:px-0" style={{ clipPath: "inset(0% 100% 0% 0%)" }}>
          <div className="relative w-full h-full">
            <div className="absolute right-[100%] top-[1px] w-[50vw] h-[2px] bg-[#0B4FFF]" />
            <svg className="w-full h-full" viewBox="0 0 1231 71" fill="none" preserveAspectRatio="none">
              <path d="M0 1H248.5C261.755 1 272.5 11.7452 272.5 25V45.416C272.5 58.6708 283.245 69.416 296.5 69.416H1230.5" stroke="#0B4FFF" strokeWidth="2" />
            </svg>
            <div className="absolute left-[100%] top-[69.4px] w-[50vw] h-[2px] bg-[#0B4FFF]" />
          </div>
        </div>

        {/* Desktop Tags (Perfectly aligned to line coordinates) */}
        <div className="absolute inset-0 max-w-[1500px] mx-auto px-6 lg:px-0">
          <div className="w-full h-full relative grid grid-cols-4 gap-6">
            
            <div className="relative">
              <div className="tag-pill absolute top-[1px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 z-20 pointer-events-auto shadow-sm">
                <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
                <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
                  <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">COMPILE</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="tag-pill absolute top-[69.4px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 z-20 pointer-events-auto shadow-sm">
                <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
                <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
                  <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">PROPOSE</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="tag-pill absolute top-[69.4px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 z-20 pointer-events-auto shadow-sm">
                <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
                <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
                  <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">VERIFY</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="tag-pill absolute top-[69.4px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 z-20 pointer-events-auto shadow-sm">
                <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
                <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
                  <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">EXECUTE</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="relative max-w-[1500px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 px-6 lg:px-0 mt-8 md:mt-0">
        
        {/* Step 1: Compile (Prompt Card) */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Mobile Tag only */}
          <div className="tag-pill md:hidden flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 mb-4 z-20 shadow-sm">
            <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
            <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
              <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">COMPILE</div>
            </div>
          </div>
          
          <div className="step-card w-full max-w-[300px] bg-[#F9F9F8] rounded-[24px] p-7 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] md:mt-[64px] relative border border-white/50">
            <h3 className="text-[18px] font-medium text-[#232323] leading-[1.3] tracking-tight">
              Trade only defined-risk SPY and QQQ options, capped at 5% maximum allocation.
            </h3>
            <div className="mt-6 flex justify-end">
              <div className="card-inner-item w-10 h-10 rounded-[10px] bg-[#0B4FFF] flex items-center justify-center text-white shadow-lg shadow-[#0B4FFF]/30 transition-transform hover:scale-105 cursor-pointer">
                <ArrowUp size={18} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Propose (Floating Data) */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Mobile Tag only */}
          <div className="tag-pill md:hidden flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 mb-4 z-20 shadow-sm">
            <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
            <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
              <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">PROPOSE</div>
            </div>
          </div>
          
          <div className="step-card w-full md:mt-[136px]">
            <div className="space-y-4 text-[13px] uppercase tracking-widest font-bold">
              <div className="card-inner-item alpha-item-1 flex items-center gap-3">
                <Loader2 size={16} className="spinner-icon alpha-spin-1 animate-spin text-[#0B4FFF] flex-shrink-0" />
                <Check size={16} className="check-icon alpha-check-1 hidden text-[#0B4FFF] flex-shrink-0" />
                <span>Scan Market Data</span>
              </div>
              <div className="card-inner-item alpha-item-2 flex items-center gap-3">
                <Loader2 size={16} className="spinner-icon alpha-spin-2 animate-spin text-[#0B4FFF] flex-shrink-0" />
                <Check size={16} className="check-icon alpha-check-2 hidden text-[#0B4FFF] flex-shrink-0" />
                <span>Price Option Strikes</span>
              </div>
              <div className="card-inner-item alpha-item-3 flex items-center gap-3">
                <Loader2 size={16} className="spinner-icon alpha-spin-3 animate-spin text-[#0B4FFF] flex-shrink-0" />
                <Check size={16} className="check-icon alpha-check-3 hidden text-[#0B4FFF] flex-shrink-0" />
                <span>Draft TradePermit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Verify (Floating Data) */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Mobile Tag only */}
          <div className="tag-pill md:hidden flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 mb-4 z-20 shadow-sm">
            <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
            <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
              <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">VERIFY</div>
            </div>
          </div>
          
          <div className="step-card w-full md:mt-[136px]">
            <div className="space-y-7 text-[12px] font-mono font-bold tracking-wider uppercase text-[#74736A]">
              <div className="card-inner-item verify-item-1 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[#a1a1aa] mb-0.5">
                  <ShieldCheck size={16} /> Hash Payload
                </div>
                <span className="text-sm">e3b0c44298fc</span>
              </div>
              <div className="card-inner-item verify-item-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[#a1a1aa] mb-0.5">
                  <ShieldCheck size={16} /> Cryptography
                </div>
                <span className="text-sm">Ed25519 OK</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Execute (Graphic Variant) */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Mobile Tag only */}
          <div className="tag-pill md:hidden flex items-center justify-center h-[28px] rounded-full border bg-[#F0EFE3] border-[#E2E1D3] px-3 mb-4 z-20 shadow-sm">
            <Zap size={12} className="tag-icon flex-shrink-0 text-[#a1a1aa]" />
            <div className="tag-wrap overflow-hidden flex-shrink-0" style={{ width: 0, opacity: 0 }}>
              <div className="tag-text whitespace-nowrap pl-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">EXECUTE</div>
            </div>
          </div>
          
          <div className="step-card w-full md:mt-[136px] h-[300px] relative overflow-hidden rounded-[32px] shadow-2xl shadow-black/5">
            <div className="execute-flash absolute inset-0 bg-[url('/variant-bg.jpg')] bg-cover bg-center scale-105" />
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center relative z-10">
              <div className="execute-text flex flex-col items-center gap-3">
                <Zap size={36} className="text-white drop-shadow-md" />
                <span className="text-[13px] font-mono font-bold tracking-[0.3em] text-white drop-shadow-md">
                  ORDER SENT
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
