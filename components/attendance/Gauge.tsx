"use client";

// Signature element: a 180° arc gauge. The threshold is a hard tick, the
// current attendance a coloured marker, and the safe-to-skip count the dominant
// centre number. The fill sweeps on update (disabled under reduced-motion by
// the global stylesheet).

const CX = 100;
const CY = 100;
const R = 84;
const ARC_LEN = Math.PI * R;

const TONE = {
  safe: "#17C964",
  danger: "#FF2D55",
  none: "#9A9A9A",
} as const;

function pointAt(p: number): { x: number; y: number } {
  const theta = Math.PI * (1 - Math.min(1, Math.max(0, p)));
  return { x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta) };
}

export function Gauge({
  pct,
  threshold,
  tone,
  bigValue,
  label,
}: {
  pct: number | null;
  threshold: number;
  tone: "safe" | "danger" | "none";
  bigValue: string;
  label: string;
}) {
  const color = TONE[tone];
  const p = pct === null ? 0 : Math.min(1, Math.max(0, pct / 100));
  const marker = pointAt(p);

  // Threshold tick geometry.
  const tp = Math.min(1, Math.max(0, threshold / 100));
  const theta = Math.PI * (1 - tp);
  const ux = Math.cos(theta);
  const uy = -Math.sin(theta);
  const tickInner = { x: CX + (R - 10) * ux, y: CY + (R - 10) * uy };
  const tickOuter = { x: CX + (R + 8) * ux, y: CY + (R + 8) * uy };

  const start = pointAt(0);
  const end = pointAt(1);
  const arcPath = `M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`;

  return (
    <svg viewBox="0 0 200 118" className="w-full max-w-[240px]">
      {/* track */}
      <path
        d={arcPath}
        fill="none"
        stroke="#242424"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* fill up to current percentage */}
      {pct !== null && (
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={ARC_LEN * (1 - p)}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      )}
      {/* hard threshold tick */}
      <line
        x1={tickInner.x}
        y1={tickInner.y}
        x2={tickOuter.x}
        y2={tickOuter.y}
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* current-position marker */}
      {pct !== null && (
        <g
          style={{
            transform: `translate(${marker.x - CX}px, ${marker.y - CY}px)`,
            transition: "transform 0.5s ease",
          }}
        >
          <circle cx={CX} cy={CY} r="7" fill="#000000" />
          <circle cx={CX} cy={CY} r="7" fill="none" stroke={color} strokeWidth="3" />
        </g>
      )}
      {/* dominant centre number + label */}
      <text
        x={CX}
        y="80"
        textAnchor="middle"
        className="font-mono"
        fontSize="34"
        fontWeight="600"
        fill={color}
      >
        {bigValue}
      </text>
      <text
        x={CX}
        y="102"
        textAnchor="middle"
        fontSize="11"
        fill="#9A9A9A"
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        {label}
      </text>
    </svg>
  );
}
