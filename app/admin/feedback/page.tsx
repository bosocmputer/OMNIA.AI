"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MessageSquareText, RefreshCw, ThumbsUp, BookOpenCheck, Gauge, AlignLeft } from "lucide-react";

interface FeedbackRow {
  id: string;
  username: string | null;
  sessionId: string | null;
  question: string | null;
  value: string;
  scope: string;
  agentIds: string[];
  answerExcerpt: string | null;
  createdAt: string;
}

const VALUE_META: Record<string, { label: string; icon: ReactNode; color: string }> = {
  accurate: { label: "แม่น", icon: <ThumbsUp size={13} />, color: "var(--success)" },
  easy: { label: "อ่านง่าย", icon: <BookOpenCheck size={13} />, color: "var(--accent)" },
  too_broad: { label: "กว้างไป", icon: <Gauge size={13} />, color: "var(--orange)" },
  too_long: { label: "ยาวไป", icon: <AlignLeft size={13} />, color: "var(--danger)" },
};

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFeedback() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/reading-feedback?limit=150");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows(data.feedback ?? []);
    } else {
      setError(data.error || "โหลด feedback ไม่สำเร็จ");
    }
    setLoading(false);
  }

  useEffect(() => { loadFeedback(); }, []);

  const counts = useMemo(() => {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.value] = (acc[row.value] ?? 0) + 1;
      return acc;
    }, {});
  }, [rows]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div
        className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--card), var(--surface))" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-10)", color: "var(--accent)" }}
          >
            <MessageSquareText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Feedback คำทำนาย</h1>
            <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--text-muted)" }}>
              ดูว่าผู้ใช้รู้สึกว่าคำตอบแม่น อ่านง่าย กว้างไป หรือยาวไป เพื่อปรับ prompt ต่อได้ตรงจุด
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadFeedback}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}
        >
          <RefreshCw size={14} /> โหลดใหม่
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(VALUE_META).map(([key, meta]) => (
          <div key={key} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: meta.color }}>
              {meta.icon} {meta.label}
            </div>
            <div className="text-2xl font-bold mt-2" style={{ color: "var(--text)" }}>{counts[key] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          รายการล่าสุด ({rows.length})
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>กำลังโหลด...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--danger)" }}>{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มี feedback</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((row) => {
              const meta = VALUE_META[row.value] ?? { label: row.value, icon: null, color: "var(--text-muted)" };
              return (
                <div key={row.id} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border" style={{ borderColor: meta.color, color: meta.color, background: "var(--surface)" }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(row.createdAt).toLocaleString("th-TH")}
                    </span>
                    {row.username && <span className="text-xs" style={{ color: "var(--text-muted)" }}>โดย {row.username}</span>}
                    {row.sessionId && (
                      <span className="text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                        session {row.sessionId.slice(0, 8)}
                      </span>
                    )}
                    {row.agentIds.length > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                        หมอดู {row.agentIds.length} คน
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {row.question || "(ไม่มีคำถามแนบ)"}
                  </div>
                  {row.answerExcerpt && (
                    <div className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>
                      {row.answerExcerpt}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
