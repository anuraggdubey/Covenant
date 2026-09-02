"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FlaskConical, FileCode2, ShieldAlert, FileKey2, Fingerprint, Calculator } from "lucide-react";

interface Surface {
  title: string;
  path: string;
  description: string;
}

const ICONS = [FlaskConical, FileCode2, ShieldAlert, FileKey2, Fingerprint, Calculator];

export function PlatformAccordion({ surfaces }: { surfaces: Surface[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
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
    <div ref={containerRef} className="w-full flex flex-col border-t border-black/10">
      {surfaces.map((surface, idx) => {
        const isActive = activeIndex === idx;
        const Icon = ICONS[idx % ICONS.length];

        return (
          <div 
            key={idx}
            className={`border-b border-black/10 transition-colors duration-500 overflow-hidden relative ${isActive ? 'bg-[#F4F7FF]' : 'bg-transparent hover:bg-black/[0.02]'}`}
          >
            {/* The Animated Bottom Blue Line when active */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute bottom-0 left-0 h-[2px] bg-[#0B4FFF] z-10"
                />
              )}
            </AnimatePresence>

            {/* Row Header */}
            <div 
              className="w-full py-8 px-6 md:px-12 flex items-center justify-between cursor-pointer"
              onClick={() => setActiveIndex(isActive ? null : idx)}
            >
              <div className="flex items-center gap-8 md:gap-16">
                <span className={`font-mono text-sm md:text-base tracking-widest transition-colors duration-300 ${isActive ? 'text-[#0B4FFF] font-bold' : 'text-[#A1A1AA]'}`}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h3 className={`text-3xl md:text-[50px] font-medium tracking-tight transition-colors duration-300 ${isActive ? 'text-[#0B4FFF]' : 'text-[#232323]'}`}>
                  {surface.title}
                </h3>
              </div>
              
              <div className="flex items-center">
                <motion.div 
                  animate={{ rotate: isActive ? 0 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link 
                    href={surface.path} 
                    onClick={(e) => {
                      if (!isActive) {
                         // if it's not active, let the click bubble up to open the accordion rather than navigating immediately,
                         // actually wait, if they click the arrow specifically, they probably want to navigate.
                         // Let's just let it navigate if they click the arrow.
                      }
                      e.stopPropagation();
                    }} 
                    className="p-4 bg-transparent hover:bg-black/5 rounded-full transition-colors flex items-center justify-center group"
                    title={`Go to ${surface.title}`}
                  >
                    <ArrowRight className={`w-8 h-8 transition-colors ${isActive ? 'text-[#0B4FFF] group-hover:translate-x-1' : 'text-black/20 group-hover:text-black/50'} transition-all`} strokeWidth={1.5} />
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Expandable Content */}
            <AnimatePresence initial={false}>
              {isActive && (
                <motion.section
                  key="content"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: "auto", paddingBottom: "3rem" },
                    collapsed: { opacity: 0, height: 0, paddingBottom: 0 }
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="px-6 md:px-12 flex flex-col md:flex-row justify-between items-start gap-12 mt-4 md:mt-0">
                    <div className="max-w-xl md:ml-24">
                      <motion.p 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl md:text-[22px] leading-relaxed text-[#74736A]"
                      >
                        {surface.description}
                      </motion.p>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                      >
                        <Link href={surface.path} className="inline-flex items-center gap-2 mt-8 text-[#0B4FFF] font-medium hover:opacity-80 transition-opacity">
                          Explore {surface.title} <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </motion.div>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                      className="hidden md:block pr-12"
                    >
                      <Icon className="w-40 h-40 text-[#0B4FFF]/10" strokeWidth={1} />
                    </motion.div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
