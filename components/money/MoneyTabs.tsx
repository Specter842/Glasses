"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "../ui";

/** Segmented switch between the spending ledger and the wishlist. */
export function MoneyTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/money", label: "Spending" },
    { href: "/money/wishlist", label: "Wishlist" },
  ];
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cx(
              "flex-1 rounded px-3 py-1.5 text-center text-sm transition-colors",
              active
                ? "bg-surface text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
