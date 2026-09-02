"use client";

import { motion } from "framer-motion";

interface AnimatedHeadlineProps {
  lines: string[];
  className?: string;
  staggerDelay?: number;
}

export function AnimatedHeadline({
  lines,
  className = "",
  staggerDelay = 0.1,
}: AnimatedHeadlineProps) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const lineVariants: any = {
    hidden: { y: "110%", rotate: 3 },
    visible: {
      y: 0,
      rotate: 0,
      transition: {
        ease: [0.175, 0.885, 0.32, 1],
        duration: 0.8,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {lines.map((line, index) => (
        <span key={index} className="block overflow-hidden pb-[0.15em]">
          <motion.span className="block origin-top-left" variants={lineVariants}>
            {line}
          </motion.span>
        </span>
      ))}
    </motion.div>
  );
}
