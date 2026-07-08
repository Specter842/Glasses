"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  isActive: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Calendar",
    isActive: (p) => p === "/",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
        <line x1="3" y1="9.5" x2="21" y2="9.5" />
        <line x1="8" y1="2.5" x2="8" y2="6" />
        <line x1="16" y1="2.5" x2="16" y2="6" />
      </svg>
    ),
  },
  {
    href: "/attendance",
    label: "Attendance",
    isActive: (p) => p.startsWith("/attendance"),
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M4 16a8 8 0 0 1 16 0" />
        <line x1="12" y1="16" x2="15.5" y2="10.5" />
        <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/habits",
    label: "Habits",
    isActive: (p) => p.startsWith("/habits"),
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        <path d="M8 12.5 L11 15.5 L16.5 9" />
      </svg>
    ),
  },
  {
    href: "/learning",
    label: "Learning",
    isActive: (p) => p.startsWith("/learning"),
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="13.5" y2="11" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-accent" : "text-text-secondary",
              )}
            >
              {tab.icon(active)}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
