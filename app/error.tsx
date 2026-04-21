"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-5xl">⚠️</span>
      <h2 className="text-xl font-bold">เกิดข้อผิดพลาด</h2>
      <p className="max-w-md text-sm text-[var(--muted)]">
        {error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง"}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        ลองใหม่
      </button>
    </div>
  );
}
