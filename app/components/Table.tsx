"use client";

import { ReactNode, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  align?: "left" | "center" | "right";
  width?: string;
  hideOnMobile?: boolean;
  mobileLabel?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  className?: string;
}

export default function Table<T>({ columns, data, rowKey, onRowClick, emptyState, className = "" }: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = (() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const getter = col.sortValue;
    return [...data].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  })();

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (data.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10" style={{ background: "var(--surface)" }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                  style={{ color: "var(--text-muted)", width: col.width }}
                >
                  {col.sortable && col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      ) : (
                        <ChevronDown size={12} style={{ opacity: 0.3 }} />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                style={{ borderTop: "1px solid var(--border)" }}
                onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={(e) => { if (onRowClick) e.currentTarget.style.background = "transparent"; }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                    style={{ color: "var(--text)" }}
                  >
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-3">
        {sorted.map((row, i) => (
          <div
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`rounded-xl p-4 ${onRowClick ? "cursor-pointer active:brightness-110" : ""}`}
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex flex-col gap-2">
              {columns.filter((c) => !c.hideOnMobile).map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {col.mobileLabel ?? col.header}
                  </span>
                  <span className="text-sm text-right min-w-0" style={{ color: "var(--text)" }}>
                    {col.render(row, i)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
