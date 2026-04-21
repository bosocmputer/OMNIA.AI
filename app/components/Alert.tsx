"use client";

import { ReactNode, useState } from "react";
import { Info, AlertTriangle, CheckCircle2, XCircle, X } from "lucide-react";

type Variant = "info" | "warning" | "success" | "danger";

interface AlertProps {
  variant?: Variant;
  title?: ReactNode;
  children?: ReactNode;
  dismissible?: boolean;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const variantStyles: Record<Variant, { bg: string; border: string; color: string; defaultIcon: ReactNode }> = {
  info: { bg: "var(--accent-8)", border: "var(--accent-30)", color: "var(--accent)", defaultIcon: <Info size={16} /> },
  warning: { bg: "var(--orange-8)", border: "var(--warning)", color: "var(--warning)", defaultIcon: <AlertTriangle size={16} /> },
  success: { bg: "var(--success-10)", border: "var(--success-30)", color: "var(--success)", defaultIcon: <CheckCircle2 size={16} /> },
  danger: { bg: "var(--danger-10)", border: "var(--danger-30)", color: "var(--danger)", defaultIcon: <XCircle size={16} /> },
};

export default function Alert({ variant = "info", title, children, dismissible, icon, action, className = "" }: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const v = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl px-4 py-3 ${className}`}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: "var(--text)",
      }}
    >
      <span className="flex-shrink-0 mt-0.5" style={{ color: v.color }}>
        {icon ?? v.defaultIcon}
      </span>
      <div className="flex-1 min-w-0">
        {title && <div className="text-sm font-semibold" style={{ color: v.color }}>{title}</div>}
        {children && <div className="text-sm mt-0.5" style={{ color: "var(--text)" }}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label="ปิด"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
