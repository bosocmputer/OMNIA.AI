"use client";

type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]",
  accent: "bg-[var(--accent)]/12 text-[var(--accent)] border-[var(--accent)]/30",
  success: "bg-[var(--green)]/12 text-[var(--green)] border-[var(--green)]/30",
  warning: "bg-[var(--orange)]/12 text-[var(--orange)] border-[var(--orange)]/30",
  danger: "bg-red-500/12 text-red-400 border-red-500/30",
  info: "bg-blue-500/12 text-blue-400 border-blue-500/30",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
