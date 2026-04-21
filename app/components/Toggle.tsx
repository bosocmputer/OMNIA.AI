"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, size = "md", disabled }: ToggleProps) {
  const w = size === "sm" ? "w-8 h-4" : "w-10 h-5";
  const dot = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const translate = size === "sm" ? (checked ? "translate-x-4" : "translate-x-0.5") : (checked ? "translate-x-5" : "translate-x-0.5");

  return (
    <label className={`inline-flex items-center gap-2 select-none ${disabled ? "opacity-40 pointer-events-none" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative ${w} rounded-full transition-colors duration-200 flex-shrink-0`}
        style={{ background: checked ? "var(--accent)" : "var(--border)" }}
      >
        <span className={`absolute top-0.5 ${dot} rounded-full bg-white shadow-sm transition-transform duration-200 ${translate}`} />
      </button>
      {label && <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>}
    </label>
  );
}
