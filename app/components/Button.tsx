"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const styles: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-[var(--accent-contrast)] hover:brightness-110 shadow-sm",
  secondary: "border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  ghost: "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]",
  danger: "border border-red-500/30 text-red-400 hover:bg-red-500/10",
};

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", icon, children, className = "", ...rest }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${styles[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  ),
);

Button.displayName = "Button";
export default Button;
