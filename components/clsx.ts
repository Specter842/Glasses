// Tiny classnames helper (no dependency).
type ClassValue = string | number | null | false | undefined | ClassValue[];

export function clsx(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i) continue;
    if (Array.isArray(i)) {
      const r = clsx(...i);
      if (r) out.push(r);
    } else {
      out.push(String(i));
    }
  }
  return out.join(" ");
}
