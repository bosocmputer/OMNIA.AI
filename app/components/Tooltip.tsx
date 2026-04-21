"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

type Placement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: Placement;
  maxWidth?: number;
  delay?: number;
}

export default function Tooltip({ content, children, placement = "top", maxWidth = 260, delay = 150 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [actualPlacement, setActualPlacement] = useState<Placement>(placement);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (!triggerRef.current?.contains(e.target as Node) && !tooltipRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !tooltipRef.current || !triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let next = placement;
    if (placement === "top" && trigger.top - tip.height < 8) next = "bottom";
    else if (placement === "bottom" && trigger.bottom + tip.height > vh - 8) next = "top";
    else if (placement === "left" && trigger.left - tip.width < 8) next = "right";
    else if (placement === "right" && trigger.right + tip.width > vw - 8) next = "left";
    setActualPlacement(next);
  }, [open, placement]);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  }
  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  }
  function toggle() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen((v) => !v);
  }

  const positionStyles: Record<Placement, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={(e) => {
        if ("ontouchstart" in window) {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {children}
      {open && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 px-3 py-2 rounded-lg text-xs leading-relaxed shadow-xl pointer-events-auto ${positionStyles[actualPlacement]}`}
          style={{
            background: "var(--card)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            maxWidth,
            width: "max-content",
          }}
        >
          {content}
        </div>
      )}
    </span>
  );
}
