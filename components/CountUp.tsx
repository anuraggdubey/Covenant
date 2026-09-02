"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

export function CountUp({ end, duration = 2, className = "", suffix = "" }: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, end, {
      duration,
      onUpdate(value) {
        setDisplayValue(Math.round(value));
      },
    });
    return controls.stop;
  }, [end, duration]);

  return (
    <span className={className}>
      {displayValue}
      {suffix}
    </span>
  );
}
