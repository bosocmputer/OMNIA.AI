"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddings = { sm: "p-3", md: "p-5", lg: "p-6" };

export default function Card({ children, className = "", hover, padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[0_14px_40px_rgba(0,0,0,0.12)] ${paddings[padding]} transition-colors ${
        hover ? "hover:border-[var(--accent)]/50 hover:shadow-[0_18px_48px_rgba(0,0,0,0.18)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
