"use client";

import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && <Icon size={48} className="mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />}
      {emoji && !Icon && <div className="text-5xl mb-4">{emoji}</div>}
      <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>{title}</h3>
      {description && <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
