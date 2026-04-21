"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  label: string;
  action: () => void;
  group: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = [
    // Navigation
    { key: "1", meta: true, label: "หน้าหลัก", action: () => router.push("/"), group: "นำทาง" },
    { key: "2", meta: true, label: "ห้องประชุม", action: () => router.push("/research"), group: "นำทาง" },
    { key: "3", meta: true, label: "เอเจนต์", action: () => router.push("/agents"), group: "นำทาง" },
    { key: "4", meta: true, label: "ทีม", action: () => router.push("/teams"), group: "นำทาง" },
    { key: "5", meta: true, label: "ตั้งค่า", action: () => router.push("/settings"), group: "นำทาง" },
    // Actions
    { key: "n", meta: true, shift: true, label: "ประชุมใหม่", action: () => router.push("/research"), group: "การกระทำ" },
    // Help
    { key: "?", meta: false, label: "แสดง/ซ่อน Shortcuts", action: () => setShowHelp((v) => !v), group: "ทั่วไป" },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        // Allow Escape to blur
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        if (e.key === shortcut.key && metaMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }

      // Escape closes help
      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
      }
    },
    [shortcuts, showHelp],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp, shortcuts };
}

export function ShortcutsHelp({
  show,
  onClose,
  shortcuts,
}: {
  show: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}) {
  if (!show) return null;

  const groups = shortcuts.reduce(
    (acc, s) => {
      (acc[s.group] ??= []).push(s);
      return acc;
    },
    {} as Record<string, Shortcut[]>,
  );

  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
  const metaKey = isMac ? "⌘" : "Ctrl";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl border shadow-xl overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>⌨️ Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-colors text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                {group}
              </div>
              <div className="space-y-1.5">
                {items.map((s) => (
                  <div key={s.key + s.group} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text)" }}>
                      {s.label}
                    </span>
                    <kbd
                      className="text-[10px] px-1.5 py-0.5 rounded border font-mono"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      {s.meta && `${metaKey}+`}
                      {s.shift && "Shift+"}
                      {s.key.toUpperCase()}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            กด <kbd className="px-1 py-0.5 rounded border text-[10px] font-mono" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>?</kbd> เพื่อเปิด/ปิด
          </span>
        </div>
      </div>
    </div>
  );
}
