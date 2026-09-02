"use client";

/**
 * NoiseBg — Full-screen noise texture overlay (inspired by Kimia).
 * 
 * Uses a tiling noise pattern with mix-blend-mode to give the dark canvas
 * a subtle printed/textured feel, preventing that "flat CSS" look.
 */
export function NoiseBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px",
        mixBlendMode: "overlay",
      }}
    />
  );
}
