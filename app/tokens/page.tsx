"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  Clock,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Card from "../components/Card";
import { Skeleton, SkeletonCard } from "../components/Skeleton";
import Tooltip from "../components/Tooltip";
import { GLOSSARY } from "@/lib/glossary";
import { tokensToTHB, formatTHB } from "@/lib/pricing";

interface AgentBreakdown {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  model: string;
  totalSessions: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  lastUsed: string;
}

interface DailyUsage {
  date: string;
  input: number;
  output: number;
  sessions: number;
}

interface SessionInfo {
  id: string;
  question: string;
  status: string;
  startedAt: string;
  totalTokens: number;
  messageCount: number;
  agentCount: number;
}

interface TokenData {
  totalInput: number;
  totalOutput: number;
  totalTokens: number;
  totalSessions: number;
  agentBreakdown: AgentBreakdown[];
  dailyUsage: DailyUsage[];
  recentSessions: SessionInfo[];
}

export default function TokensPage() {
  const { t } = useI18n();
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem("monthlyBudgetTHB");
      const n = v ? parseFloat(v) : NaN;
      setBudget(!isNaN(n) && n > 0 ? n : null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch("/api/token-usage")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "เมื่อสักครู่";
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ชม.ที่แล้ว`;
    const days = Math.floor(hours / 24);
    return `${days} วันที่แล้ว`;
  };

  const maxDaily = data ? Math.max(...data.dailyUsage.map((d) => d.input + d.output), 1) : 1;

  const visibleAgents = data
    ? showAllAgents
      ? data.agentBreakdown
      : data.agentBreakdown.slice(0, 5)
    : [];

  const visibleSessions = data
    ? showAllSessions
      ? data.recentSessions
      : data.recentSessions.slice(0, 8)
    : [];

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          📊 การใช้งาน Token
          <Tooltip content={GLOSSARY.tokens?.long || ""}>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full border cursor-help" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
              Token คืออะไร?
            </span>
          </Tooltip>
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          รายละเอียดการใช้งาน Token ทั้งหมด
        </p>
      </div>

      {/* Hero: Monthly THB cost */}
      {!loading && data && (() => {
        const totalTHB = data.agentBreakdown.reduce((sum, a) => {
          const thb = tokensToTHB(a.inputTokens, a.outputTokens, a.model);
          return sum + (thb ?? 0);
        }, 0);
        const knownCount = data.agentBreakdown.filter((a) => tokensToTHB(a.inputTokens, a.outputTokens, a.model) !== null).length;
        const unknownCount = data.agentBreakdown.length - knownCount;
        const pctOfBudget = budget ? Math.min(100, (totalTHB / budget) * 100) : null;
        const overBudget = budget ? totalTHB > budget : false;
        const nearBudget = pctOfBudget !== null && pctOfBudget >= 80;
        const barColor = overBudget ? "var(--danger, #ef4444)" : nearBudget ? "#f97316" : "var(--accent)";
        return (
          <Card padding="lg" className="mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>ค่าใช้จ่ายโดยประมาณ (ทั้งหมด)</p>
                <p className="text-3xl md:text-5xl font-bold" style={{ color: "var(--accent)" }}>≈ {formatTHB(totalTHB)}</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                  อัตราแลกเปลี่ยน ฿36/USD {unknownCount > 0 && `· ${unknownCount} ที่ปรึกษายังไม่มีราคา`}
                </p>
              </div>
              <Tooltip content="ค่าใช้จ่ายคำนวณจากจำนวน Token × ราคาต่อ 1 ล้าน Token (USD) × อัตราแลกเปลี่ยน (฿36/USD)">
                <span className="text-[11px] px-2 py-1 rounded border cursor-help" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  ℹ️ คำนวณอย่างไร?
                </span>
              </Tooltip>
            </div>
            {budget && pctOfBudget !== null && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: "var(--text-muted)" }}>
                    ใช้ไป <span className="font-bold" style={{ color: barColor }}>{pctOfBudget.toFixed(0)}%</span> ของงบ {formatTHB(budget)}
                  </span>
                  {overBudget && <span className="font-bold" style={{ color: "var(--danger, #ef4444)" }}>⚠️ เกินงบแล้ว</span>}
                  {!overBudget && nearBudget && <span className="font-bold" style={{ color: "#f97316" }}>⚠️ ใกล้เต็มงบ</span>}
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctOfBudget}%`, background: barColor }} />
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[
            { label: "รวมทั้งหมด", value: fmt(data.totalTokens), sub: "พิมพ์ + ตอบ", icon: TrendingUp, color: "var(--success)", tip: GLOSSARY.tokens?.long },
            { label: "คำถามที่พิมพ์ (Input)", value: fmt(data.totalInput), sub: "จำนวน Token ที่ส่งให้ AI", icon: ArrowUpRight, color: "var(--accent)", tip: GLOSSARY.inputTokens?.long },
            { label: "คำตอบจาก AI (Output)", value: fmt(data.totalOutput), sub: "จำนวน Token ที่ AI ตอบ", icon: ArrowDownLeft, color: "var(--info)", tip: GLOSSARY.outputTokens?.long },
            { label: "การประชุม", value: data.totalSessions.toLocaleString(), sub: "จำนวนการประชุมทั้งหมด", icon: MessageSquare, color: "var(--purple)", tip: GLOSSARY.session?.long },
          ].map((stat) => (
            <Card key={stat.label} padding="md">
              <div className="flex items-start justify-between">
                <div>
                  {stat.tip ? (
                    <Tooltip content={stat.tip}>
                      <p className="text-xs font-medium mb-1 cursor-help inline-block border-b border-dotted" style={{ color: "var(--text-muted)", borderColor: "var(--text-muted)" }}>{stat.label}</p>
                    </Tooltip>
                  ) : (
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                  )}
                  <p className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>{stat.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.sub}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.color + "18" }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Daily usage chart */}
      {loading ? (
        <div className="mb-8">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : data && data.dailyUsage.length > 0 ? (
        <Card padding="md" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              การใช้งานรายวัน (30 วันล่าสุด)
            </h2>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-3">
            <Tooltip content={GLOSSARY.inputTokens?.short || ""}>
              <div className="flex items-center gap-1.5 cursor-help">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--accent)" }} />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>พิมพ์ (Input)</span>
              </div>
            </Tooltip>
            <Tooltip content={GLOSSARY.outputTokens?.short || ""}>
              <div className="flex items-center gap-1.5 cursor-help">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--info)" }} />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>ตอบ (Output)</span>
              </div>
            </Tooltip>
          </div>
          {/* Chart */}
          <div className="flex items-end gap-[2px] h-40 md:h-48">
            {data.dailyUsage.map((day) => {
              const inputH = (day.input / maxDaily) * 100;
              const outputH = (day.output / maxDaily) * 100;
              const total = day.input + day.output;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-0 group relative min-w-0">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                    <div
                      className="px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap shadow-lg"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                      <div className="font-medium mb-0.5">{day.date}</div>
                      <div style={{ color: "var(--accent)" }}>In: {fmt(day.input)}</div>
                      <div style={{ color: "var(--info)" }}>Out: {fmt(day.output)}</div>
                      <div style={{ color: "var(--text-muted)" }}>Total: {fmt(total)}</div>
                    </div>
                  </div>
                  {/* Stacked bars */}
                  <div className="w-full flex flex-col items-stretch justify-end" style={{ height: "100%" }}>
                    <div className="flex flex-col justify-end flex-1">
                      <div
                        className="rounded-t-sm transition-all duration-200 group-hover:opacity-80"
                        style={{ height: `${outputH}%`, background: "var(--info)", minHeight: total > 0 ? 2 : 0 }}
                      />
                      <div
                        className="rounded-b-sm transition-all duration-200 group-hover:opacity-80"
                        style={{ height: `${inputH}%`, background: "var(--accent)", minHeight: total > 0 ? 2 : 0 }}
                      />
                    </div>
                  </div>
                  {/* Date label - show every few days */}
                  <span
                    className="text-[8px] md:text-[9px] mt-1 rotate-0"
                    style={{ color: "var(--text-muted)", opacity: data.dailyUsage.indexOf(day) % Math.ceil(data.dailyUsage.length / 10) === 0 ? 1 : 0 }}
                  >
                    {fmtDate(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Agent breakdown */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Users size={16} style={{ color: "var(--text-muted)" }} />
              Token ตามที่ปรึกษา AI
            </h2>
            {data && data.agentBreakdown.length > 0 && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {data.agentBreakdown.length} ที่ปรึกษา
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : data && data.agentBreakdown.length > 0 ? (
            <>
              <div className="space-y-2">
                {visibleAgents.map((agent) => {
                  const pct = data.totalTokens > 0 ? (agent.totalTokens / data.totalTokens) * 100 : 0;
                  const thb = tokensToTHB(agent.inputTokens, agent.outputTokens, agent.model);
                  return (
                    <div key={agent.agentId} className="px-3 py-3 rounded-xl transition-colors hover:bg-[var(--surface)]">
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">{agent.agentEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{agent.agentName}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {thb !== null && (
                                <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>≈ {formatTHB(thb)}</span>
                              )}
                              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{fmt(agent.totalTokens)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {agent.model ? agent.model.split("/").pop() : "—"}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {agent.totalSessions} การประชุม
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                            <div className="h-full rounded-full flex">
                              <div
                                className="h-full"
                                style={{
                                  width: `${data.totalTokens > 0 ? (agent.inputTokens / data.totalTokens) * 100 : 0}%`,
                                  background: "var(--accent)",
                                }}
                              />
                              <div
                                className="h-full"
                                style={{
                                  width: `${data.totalTokens > 0 ? (agent.outputTokens / data.totalTokens) * 100 : 0}%`,
                                  background: "var(--info)",
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <Tooltip content={GLOSSARY.inputTokens?.short || ""}>
                              <span className="text-[10px] cursor-help" style={{ color: "var(--accent)" }}>
                                พิมพ์ {fmt(agent.inputTokens)}
                              </span>
                            </Tooltip>
                            <Tooltip content={GLOSSARY.outputTokens?.short || ""}>
                              <span className="text-[10px] cursor-help" style={{ color: "var(--info)" }}>
                                ตอบ {fmt(agent.outputTokens)}
                              </span>
                            </Tooltip>
                            <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.agentBreakdown.length > 5 && (
                <button
                  onClick={() => setShowAllAgents(!showAllAgents)}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors hover:bg-[var(--surface)]"
                  style={{ color: "var(--accent)" }}
                >
                  {showAllAgents ? (
                    <>แสดงน้อยลง <ChevronUp size={14} /></>
                  ) : (
                    <>ดูทั้งหมด ({data.agentBreakdown.length}) <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Users size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูล Token</p>
            </div>
          )}
        </Card>

        {/* Recent sessions */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Clock size={16} style={{ color: "var(--text-muted)" }} />
              Token ตามการประชุม
            </h2>
            <Link href="/research" className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>
              ดูการประชุม →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : data && data.recentSessions.length > 0 ? (
            <>
              <div className="space-y-1.5">
                {visibleSessions.map((s) => (
                  <div key={s.id} className="px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--surface)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate flex-1" style={{ color: "var(--text)" }}>
                        {s.question}
                      </p>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--text)" }}>
                        {fmt(s.totalTokens)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(s.startedAt)}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {s.messageCount} ข้อความ
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {s.agentCount} ที่ปรึกษา
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0"
                        style={{
                          background: s.status === "running" ? "var(--success)" + "20" : "var(--surface)",
                          color: s.status === "running" ? "var(--success)" : "var(--text-muted)",
                        }}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {data.recentSessions.length > 8 && (
                <button
                  onClick={() => setShowAllSessions(!showAllSessions)}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors hover:bg-[var(--surface)]"
                  style={{ color: "var(--accent)" }}
                >
                  {showAllSessions ? (
                    <>แสดงน้อยลง <ChevronUp size={14} /></>
                  ) : (
                    <>ดูทั้งหมด ({data.recentSessions.length}) <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <MessageSquare size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>ยังไม่มีการประชุม</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
