/**
 * The Covenant mark.
 *
 * Covenant / covalent. A covalent bond is the one kind of bond where neither
 * atom owns the electrons — both hold them, and the structure only exists
 * because of what is shared. That is exactly the relationship this product
 * encodes: the trader declares the mandate, the agent executes inside it, and
 * the permit is the shared thing neither side can unilaterally change.
 *
 * So: two rings, and the lens where they overlap is the bond. The overlap is
 * the only filled shape in the mark, because the shared region IS the product.
 *
 * Geometric rather than illustrative on purpose — a Bohr-diagram clip art
 * reads as a science fair, and this has to survive being 16px in a tab.
 * Two electrons sit on the bond axis; at small sizes they fall away.
 */

interface CovenantMarkProps {
  size?: number;
  /** Hides the orbiting electrons below ~24px, where they turn to mud. */
  detail?: boolean;
  title?: string;
}

export function CovenantMark({ size = 28, detail = true, title }: CovenantMarkProps) {
  const showDetail = detail && size >= 24;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        {/* The lens: everything inside BOTH rings. */}
        <clipPath id="cov-lens">
          <circle cx="18" cy="24" r="12.5" />
        </clipPath>
      </defs>

      {/* The shared bond — the only filled region in the mark. */}
      <g clipPath="url(#cov-lens)">
        <circle cx="30" cy="24" r="12.5" fill="currentColor" opacity="0.9" />
      </g>

      {/* The two nuclei. */}
      <circle
        cx="18"
        cy="24"
        r="12.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.55"
      />
      <circle
        cx="30"
        cy="24"
        r="12.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.55"
      />

      {showDetail && (
        <>
          <circle cx="24" cy="17.6" r="1.7" fill="currentColor" />
          <circle cx="24" cy="30.4" r="1.7" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** Mark plus wordmark, for the nav and the hero. */
export function CovenantLogo({ size = 26 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        color: "var(--accent)"
      }}
    >
      <CovenantMark size={size} title="Covenant" />
      <span
        style={{
          color: "var(--text)",
          fontWeight: 600,
          fontSize: `${Math.round(size * 0.62)}px`,
          // Tight tracking is most of what separates a wordmark from a <span>.
          letterSpacing: "-0.02em"
        }}
      >
        Covenant
      </span>
    </span>
  );
}
