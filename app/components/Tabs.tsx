"use client";

import { ReactNode, useRef, KeyboardEvent } from "react";

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKey(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    const enabled = tabs.filter((t) => !t.disabled);
    if (enabled.length === 0) return;
    const currentEnabledIdx = enabled.findIndex((t) => t.key === tabs[idx].key);
    let nextIdx = currentEnabledIdx;
    if (e.key === "ArrowRight") nextIdx = (currentEnabledIdx + 1) % enabled.length;
    else if (e.key === "ArrowLeft") nextIdx = (currentEnabledIdx - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = enabled.length - 1;
    else return;
    e.preventDefault();
    const nextKey = enabled[nextIdx].key;
    onChange(nextKey);
    const btn = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-key="${nextKey}"]`);
    btn?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      className={`flex items-center gap-1 overflow-x-auto ${className}`}
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            data-tab-key={tab.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            onKeyDown={(e) => handleKey(e, idx)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
