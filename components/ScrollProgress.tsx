"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * ScrollProgress — Fixed 2px progress bar at the very top of the viewport.
 * Inspired by Kimia's scroll indicator.
 * 
 * Uses Framer Motion's useScroll + useSpring for buttery smooth tracking.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400"
      style={{ scaleX }}
    />
  );
}
