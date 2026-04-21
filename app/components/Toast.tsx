"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

const colors: Record<ToastType, string> = {
  success: "border-[var(--green)]/40 text-[var(--green)]",
  error: "border-red-500/40 text-red-400",
  info: "border-[var(--accent)]/40 text-[var(--accent)]",
  warning: "border-[var(--orange)]/40 text-[var(--orange)]",
};

let toastId = 0;
let addToastFn: ((type: ToastType, message: string) => void) | null = null;

export function showToast(type: ToastType, message: string) {
  addToastFn?.(type, message);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-[var(--card)] shadow-lg animate-in ${colors[t.type]}`}
        >
          {icons[t.type]}
          <span className="flex-1 text-sm" style={{ color: "var(--text)" }}>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
