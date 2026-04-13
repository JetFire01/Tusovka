"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  label: string;
  href: string;
  icon?: ReactNode;
}

import { ReactNode } from "react";

interface TabsProps {
  tabs: Tab[];
}

export function Tabs({ tabs }: TabsProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop tabs */}
      <nav className="hidden sm:flex gap-1 bg-surface rounded-[var(--radius-apple)] p-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                px-4 py-2 text-sm font-medium rounded-[10px]
                transition-all duration-200
                ${
                  isActive
                    ? "bg-surface-card text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom tabs */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-card/90 backdrop-blur-xl border-t border-border-light safe-area-bottom">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex-1 flex flex-col items-center gap-0.5 py-2 px-1
                  text-xs font-medium transition-colors
                  ${isActive ? "text-accent" : "text-text-secondary"}
                `}
              >
                {tab.icon && <span className="text-xl">{tab.icon}</span>}
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
