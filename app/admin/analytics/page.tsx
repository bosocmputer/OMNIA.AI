"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bot, MessageSquare, RefreshCw, Sparkles, ThumbsUp, Clock3 } from "lucide-react";

interface AnalyticsData {
  totals: {
    sessions: number;
    completed: number;
    running: number;
    errored: number;
    totalTokens: number;
    averageTokens: number;
    multiQuestionSessions: number;
    feedback: number;
  };
  agentPopularity: { agentId: string; name: string; emoji: string; role: string; count: number }[];
  topics: { key: string; label: string; count: number; examples: string[] }[];
  feedbackCounts: Record<string, number>;
  dailySessions: { date: string; count: number }[];
  recentQuestions: { id: string; question: string; username: string; startedAt: string; status: string; agentCount: number; topic: string }[];
}

const FEEDBACK_LABELS: Record<string, string> = {
  accurate: "แม่น",
  easy: "อ่านง่าย",
  too_broad: "กว้างไป",
  too_long: "ยาวไป",
};

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        {icon} {label}
      </div>
      <div className="text-2xl font-bold mt-2" style={{ color: "var(--text)" }}>{value}</div>
      {hint && <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{hint}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/analytics");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setData(json);
    else setError(json.error || "โหลด analytics ไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { loadAnalytics(); }, []);

  const maxAgentCount = useMemo(() => Math.max(1, ...(data?.agentPopularity ?? []).map((agent) => agent.count)), [data]);
  const maxTopicCount = useMemo(() => Math.max(1, ...(data?.topics ?? []).map((topic) => topic.count)), [data]);
  const maxDailyCount = useMemo(() => Math.max(1, ...(data?.dailySessions ?? []).map((day) => day.count)), [data]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div
        className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--card), var(--surface))" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-10)", color: "var(--accent)" }}
          >
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Analytics</h1>
            <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--text-muted)" }}>
              ภาพรวมการใช้งาน OMNIA.AI เพื่อดูว่า user ถามอะไร เลือกหมอดูไหน และ feedback ไปทางไหน
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}
        >
          <RefreshCw size={14} /> โหลดใหม่
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--card)" }}>กำลังโหลด...</div>
      ) : error ? (
        <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--danger-8)" }}>{error}</div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<MessageSquare size={14} />} label="คำทำนายทั้งหมด" value={data.totals.sessions} hint={`${data.totals.completed} completed`} />
            <StatCard icon={<Sparkles size={14} />} label="ถามต่อหลายรอบ" value={data.totals.multiQuestionSessions} hint="session ที่มีมากกว่า 1 คำถาม" />
            <StatCard icon={<ThumbsUp size={14} />} label="Feedback" value={data.totals.feedback} hint="จำนวน feedback ที่เก็บได้" />
            <StatCard icon={<Clock3 size={14} />} label="Token เฉลี่ย" value={data.totals.averageTokens.toLocaleString()} hint={`${data.totals.totalTokens.toLocaleString()} tokens รวม`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <Bot size={16} /> หมอดูที่ถูกเลือกบ่อย
              </h2>
              <div className="space-y-3">
                {data.agentPopularity.length === 0 ? (
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูล</div>
                ) : data.agentPopularity.map((agent) => (
                  <div key={agent.agentId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{agent.emoji} {agent.name}</div>
                        <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{agent.role}</div>
                      </div>
                      <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>{agent.count}</div>
                    </div>
                    <ProgressBar value={agent.count} max={maxAgentCount} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>หัวข้อที่ user ถามเยอะ</h2>
              <div className="space-y-3">
                {data.topics.map((topic) => (
                  <div key={topic.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{topic.label}</div>
                      <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>{topic.count}</div>
                    </div>
                    <ProgressBar value={topic.count} max={maxTopicCount} color="var(--orange)" />
                    {topic.examples[0] && <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>เช่น {topic.examples[0]}</div>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Feedback รวม</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(FEEDBACK_LABELS).map(([key, label]) => (
                  <div key={key} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
                    <div className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{data.feedbackCounts[key] ?? 0}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h2 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>คำทำนายรายวัน 14 วันล่าสุด</h2>
              <div className="flex items-end gap-2 h-32">
                {data.dailySessions.length === 0 ? (
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูล</div>
                ) : data.dailySessions.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md min-h-1" style={{ height: `${Math.max(6, (day.count / maxDailyCount) * 100)}%`, background: "var(--accent)" }} />
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{new Date(day.date).getDate()}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="px-4 py-3 border-b text-sm font-bold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              คำถามล่าสุด
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {data.recentQuestions.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{item.question}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {item.username || "unknown"} · {new Date(item.startedAt).toLocaleString("th-TH")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] px-2 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>{item.topic}</span>
                    <span className="text-[11px] px-2 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>หมอดู {item.agentCount}</span>
                    <span className="text-[11px] px-2 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
