"use client";

/**
 * VerticalGuides — Two faint 1px vertical lines at the edges of the content area.
 * Inspired by Kimia's editorial grid aesthetic.
 * 
 * Creates a sense of invisible structure, like the margins of a printed page.
 */
export function VerticalGuides() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 left-0 right-0 z-[2] flex justify-center"
    >
      <div className="relative h-full w-full max-w-[1400px]">
        <div className="absolute inset-y-0 left-6 w-px bg-white/[0.04]" />
        <div className="absolute inset-y-0 right-6 w-px bg-white/[0.04]" />
      </div>
    </div>
  );
}
