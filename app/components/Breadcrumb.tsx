"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { ReactNode } from "react";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  className?: string;
}

export default function Breadcrumb({ items, homeHref = "/", className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 flex-wrap text-xs" style={{ color: "var(--text-muted)" }}>
        <li>
          <Link href={homeHref} className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors" aria-label="หน้าแรก">
            <Home size={12} />
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="inline-flex items-center gap-1.5">
              <ChevronRight size={12} style={{ color: "var(--border)" }} />
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-[var(--text)] transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} style={{ color: isLast ? "var(--text)" : undefined }}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
