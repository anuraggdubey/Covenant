/**
 * The authority boundary, drawn.
 *
 * This is the one diagram worth having: it makes "powerless by construction"
 * legible in about three seconds, which is roughly how long a judge spends
 * before deciding whether to keep reading.
 *
 * Inline SVG on purpose — no chart library, no runtime, themes with the rest
 * of the page because every colour is a CSS variable. The blocked path is
 * drawn as prominently as the permitted one: the thing being claimed is what
 * CANNOT happen, so hiding it would defeat the diagram.
 */

interface StageProps {
  x: number;
  label: string;
  sub: string;
  tone?: "neutral" | "accent";
}

const BOX_W = 168;
const BOX_H = 62;
const ROW_Y = 34;

function Stage({ x, label, sub, tone = "neutral" }: StageProps) {
  const stroke = tone === "accent" ? "var(--accent)" : "var(--border-strong)";
  const fill = tone === "accent" ? "var(--accent-subtle)" : "var(--surface)";
  return (
    <g>
      <rect
        x={x}
        y={ROW_Y}
        width={BOX_W}
        height={BOX_H}
        rx={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text
        x={x + BOX_W / 2}
        y={ROW_Y + 26}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill="var(--text)"
      >
        {label}
      </text>
      <text
        x={x + BOX_W / 2}
        y={ROW_Y + 44}
        textAnchor="middle"
        fontSize="10.5"
        fill="var(--text-muted)"
      >
        {sub}
      </text>
    </g>
  );
}

function Arrow({ from, to, label }: { from: number; to: number; label: string }) {
  const mid = (from + to) / 2;
  return (
    <g>
      <line
        x1={from}
        y1={ROW_Y + BOX_H / 2}
        x2={to - 7}
        y2={ROW_Y + BOX_H / 2}
        stroke="var(--border-strong)"
        strokeWidth={1.5}
        markerEnd="url(#cov-arrow)"
      />
      <text x={mid} y={ROW_Y + BOX_H / 2 - 9} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
        {label}
      </text>
    </g>
  );
}

export function AuthorityBoundary() {
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 908 210"
        width="100%"
        style={{ maxWidth: 908, height: "auto", display: "block" }}
        role="img"
        aria-labelledby="cov-boundary-title cov-boundary-desc"
      >
        <title id="cov-boundary-title">Covenant authority boundary</title>
        <desc id="cov-boundary-desc">
          The Alpha Engine proposes a trade intent to the Safety Kernel, which either refuses it or
          signs a short-lived permit. Only the Permit Executor holds Alpaca credentials and submits
          the order. The Alpha Engine has no path to the broker.
        </desc>

        <defs>
          <marker id="cov-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" fill="var(--border-strong)" />
          </marker>
        </defs>

        <Stage x={0} label="Alpha Engine" sub="no credentials" />
        <Arrow from={168} to={244} label="intent" />
        <Stage x={244} label="Safety Kernel" sub="COV-01 … COV-08" tone="accent" />
        <Arrow from={412} to={488} label="signed permit" />
        <Stage x={488} label="Permit Executor" sub="holds the key" tone="accent" />
        <Arrow from={656} to={732} label="mleg order" />
        <Stage x={732} label="Alpaca Paper" sub="paper only" />

        {/* Refusal path: the kernel's other three outcomes. */}
        <path
          d={`M328 ${ROW_Y + BOX_H} L328 148`}
          stroke="var(--danger)"
          strokeWidth={1.5}
          fill="none"
          markerEnd="url(#cov-arrow)"
        />
        <text x={338} y={146} fontSize="10.5" fill="var(--danger)" fontWeight="600">
          VETO · SHRINK · ABSTAIN — no permit is issued
        </text>

        {/* The claim: there is no line from strategy to broker. */}
        <path
          d={`M84 ${ROW_Y + BOX_H} L84 182 L816 182 L816 ${ROW_Y + BOX_H}`}
          stroke="var(--text-muted)"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          fill="none"
          opacity={0.55}
        />
        <g>
          <circle cx={450} cy={182} r={11} fill="var(--danger-subtle)" stroke="var(--danger)" />
          <path
            d="M445 177 L455 187 M455 177 L445 187"
            stroke="var(--danger)"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </g>
        <text x={470} y={186} fontSize="10.5" fill="var(--text-secondary)">
          the strategy has no path to the broker — enforced by test, not convention
        </text>

        <text x={0} y={16} fontSize="10.5" fontWeight="600" fill="var(--text-muted)">
          POWERLESS BY CONSTRUCTION
        </text>
      </svg>
    </figure>
  );
}
