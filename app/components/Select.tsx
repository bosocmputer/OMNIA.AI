"use client";

import { ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, HelpCircle, X } from "lucide-react";
import Tooltip from "./Tooltip";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  tooltip?: ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  tooltip?: ReactNode;
  required?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "เลือก...",
  error,
  hint,
  tooltip,
  required,
  searchable = false,
  disabled,
  className = "",
}: SelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q));
  }, [options, query]);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  const triggerStyle = {
    background: "var(--surface)",
    border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
    color: selected ? "var(--text)" : "var(--text-muted)",
    minHeight: 44,
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          <span>
            {label}
            {required && <span style={{ color: "var(--danger)" }}> *</span>}
          </span>
          {tooltip && (
            <Tooltip content={tooltip}>
              <span className="inline-flex cursor-help" aria-label="คำอธิบาย" style={{ color: "var(--text-muted)" }}>
                <HelpCircle size={13} />
              </span>
            </Tooltip>
          )}
        </label>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 rounded-lg text-sm outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={triggerStyle}
      >
        <span className="truncate text-left">{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && isMobile && (
        <div className="fixed inset-0 z-50 flex items-end">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="ปิด" />
          <div
            className="relative w-full rounded-t-2xl max-h-[75vh] flex flex-col"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label ?? "เลือก"}</span>
              <button onClick={() => setOpen(false)} className="p-1" style={{ color: "var(--text-muted)" }} aria-label="ปิด"><X size={18} /></button>
            </div>
            {searchable && (
              <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ค้นหา..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
              </div>
            )}
            <OptionList options={filtered} value={value} onSelect={handleSelect} />
          </div>
        </div>
      )}

      {open && !isMobile && (
        <div
          role="listbox"
          className="absolute z-40 mt-1 rounded-lg shadow-xl overflow-hidden"
          style={{ background: "var(--card)", border: "1px solid var(--border)", minWidth: 200 }}
        >
          <div className="relative w-full" style={{ minWidth: containerRef.current?.offsetWidth ?? 220 }}>
            {searchable && (
              <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ค้นหา..."
                    className="w-full pl-8 pr-2 py-1.5 rounded text-xs outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
              </div>
            )}
            <div className="max-h-72 overflow-y-auto">
              <OptionList options={filtered} value={value} onSelect={handleSelect} />
            </div>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
      ) : hint ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>
      ) : null}
    </div>
  );
}

function OptionList({ options, value, onSelect }: { options: SelectOption[]; value?: string; onSelect: (v: string) => void }) {
  if (options.length === 0) {
    return <div className="p-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>ไม่พบผลลัพธ์</div>;
  }
  return (
    <ul className="py-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <li key={opt.value}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              disabled={opt.disabled}
              onClick={() => onSelect(opt.value)}
              className="w-full flex items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50"
              style={{
                color: "var(--text)",
                background: active ? "var(--accent-10)" : "transparent",
              }}
              onMouseEnter={(e) => { if (!opt.disabled) e.currentTarget.style.background = active ? "var(--accent-15)" : "var(--surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = active ? "var(--accent-10)" : "transparent"; }}
            >
              <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: active ? "var(--accent)" : "transparent" }} />
              <span className="flex-1 min-w-0">
                <span className="block font-medium">{opt.label}</span>
                {opt.description && (
                  <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.description}</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
