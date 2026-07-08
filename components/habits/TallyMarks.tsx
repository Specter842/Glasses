"use client";

// Real tally marks: groups of five drawn as four uprights struck through by a
// diagonal, then the remainder as loose uprights. Purely a rendering of the
// count — the count itself comes from the store.

function Group({
  strokes,
  struck,
  color,
}: {
  strokes: number;
  struck?: boolean;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 22 20"
      className="h-5 w-[22px] shrink-0"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {Array.from({ length: strokes }).map((_, i) => (
        <line key={i} x1={2 + i * 5} y1={2} x2={2 + i * 5} y2={18} />
      ))}
      {struck && <line x1={0} y1={16} x2={21} y2={4} />}
    </svg>
  );
}

export function TallyMarks({ count, color }: { count: number; color: string }) {
  if (count <= 0) {
    return <span className="font-mono text-xs text-text-secondary">—</span>;
  }
  const fives = Math.floor(count / 5);
  const remainder = count % 5;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="img"
      aria-label={`${count} days completed`}
    >
      {Array.from({ length: fives }).map((_, i) => (
        <Group key={`g${i}`} strokes={4} struck color={color} />
      ))}
      {remainder > 0 && <Group strokes={remainder} color={color} />}
    </div>
  );
}
