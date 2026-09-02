"use client";

/**
 * BackgroundOrbs — Animated radial gradient orbs for depth.
 * 
 * Three large, blurred circles positioned absolutely behind all content.
 * They pulse slowly to create a living, breathing dark canvas —
 * preventing the "flat black" look of a plain bg-black body.
 */
export function BackgroundOrbs() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Top-left purple orb */}
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, rgba(124,92,255,1) 0%, rgba(124,92,255,0) 70%)",
          animation: "orbPulse 8s ease-in-out infinite",
        }}
      />
      {/* Center-right indigo orb */}
      <div
        className="absolute top-1/3 -right-48 w-[700px] h-[700px] rounded-full opacity-[0.05]"
        style={{
          background:
            "radial-gradient(circle, rgba(99,56,245,1) 0%, rgba(99,56,245,0) 70%)",
          animation: "orbPulse 10s ease-in-out 2s infinite",
        }}
      />
      {/* Bottom-center cyan orb */}
      <div
        className="absolute -bottom-48 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.06]"
        style={{
          background:
            "radial-gradient(circle, rgba(34,184,207,1) 0%, rgba(34,184,207,0) 70%)",
          animation: "orbPulse 12s ease-in-out 4s infinite",
        }}
      />
    </div>
  );
}
