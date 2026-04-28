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
      className={`rounded-lg border border-[var(--border)] bg-[var(--card)] ${paddings[padding]} transition-colors ${
        hover ? "hover:border-[var(--accent)]/50 hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
