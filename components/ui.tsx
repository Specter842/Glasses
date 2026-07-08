import { clsx } from "./clsx";

// Shared, palette-pure styling. Base is strict black/white; the only colours
// are royal blue (primary), green (safe), red (danger) and their neon shades.

export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none",
  primary: "bg-accent text-white hover:bg-blue-neon px-3.5 py-2",
  outline:
    "border border-border text-text-primary hover:border-text-secondary px-3.5 py-2",
  ghost:
    "text-text-secondary hover:text-text-primary hover:bg-surface px-2.5 py-1.5",
  subtle:
    "text-[11px] uppercase tracking-wide text-text-secondary hover:text-text-primary px-2 py-1 rounded",
};

export function cx(...args: Parameters<typeof clsx>) {
  return clsx(...args);
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-lg border border-border bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
      {children}
    </h2>
  );
}
