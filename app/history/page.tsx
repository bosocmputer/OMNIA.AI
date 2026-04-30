"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, CalendarDays, CheckCircle2, Download, History, MessageSquare, RefreshCw, Search, User } from "lucide-react";

interface ResearchMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  role: "user_question" | "thinking" | "finding" | "analysis" | "synthesis" | "chat";
  content: string;
  tokensUsed: number;
  timestamp: string;
}

interface ServerSession {
  id: string;
  question: string;
  agentIds?: string[];
  status: string;
  startedAt: string;
  totalTokens: number;
  messages: ResearchMessage[];
  finalAnswer?: string;
  ownerUsername?: string;
}

const roleLabel: Record<ResearchMessage["role"], string> = {
  user_question: "คำถาม",
  thinking: "กำลังคิด",
  finding: "คำทำนาย",
  analysis: "วิเคราะห์",
  synthesis: "สรุปรวม",
  chat: "ถามต่อ",
};

function stripHiddenBlocks(content: string) {
  return content.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim();
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="prose-container text-sm leading-relaxed break-anywhere" style={{ color: "var(--text)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1.5" style={{ color: "var(--text)" }}>{children}</h3>,
          h2: ({ children }) => <h4 className="text-sm font-bold mt-2.5 mb-1" style={{ color: "var(--text)" }}>{children}</h4>,
          h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--text)" }}>{children}</h5>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold" style={{ color: "var(--accent)" }}>{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>{children}</a>,
          hr: () => <hr className="my-3" style={{ borderColor: "var(--border)" }} />,
        }}
      >
        {stripHiddenBlocks(content)}
      </ReactMarkdown>
    </div>
  );
}

function groupSessionHistory(session: ServerSession): { question: string; messages: ResearchMessage[] }[] {
  const groups: { question: string; messages: ResearchMessage[] }[] = [];
  let current: { question: string; messages: ResearchMessage[] } | null = null;

  for (const msg of session.messages ?? []) {
    if (msg.role === "user_question") {
      current = { question: msg.content, messages: [] };
      groups.push(current);
      continue;
    }
    if (msg.role === "thinking" || (session.finalAnswer && msg.role === "synthesis")) continue;
    if (!current) {
      current = { question: session.question, messages: [] };
      groups.push(current);
    }
    current.messages.push(msg);
  }

  if (groups.length === 0) groups.push({ question: session.question, messages: [] });
  return groups;
}

function buildExportText(session: ServerSession) {
  const lines = [`# ${session.question}`, "", `วันที่: ${new Date(session.startedAt).toLocaleString("th-TH")}`, ""];
  groupSessionHistory(session).forEach((group, index) => {
    lines.push(`## คำถามที่ ${index + 1}: ${group.question}`, "");
    group.messages.forEach((msg) => {
      lines.push(`### ${msg.agentEmoji || ""} ${msg.agentName || roleLabel[msg.role]}`, stripHiddenBlocks(msg.content), "");
    });
  });
  if (session.finalAnswer) lines.push("## สรุปจาก OMNIA.AI", "", stripHiddenBlocks(session.finalAnswer), "");
  return lines.join("\n");
}

function questionLabel(index: number) {
  return index === 0 ? "คำถามแรก" : `ถามต่อครั้งที่ ${index + 1}`;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ServerSession[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const selected = sessions.find((session) => session.id === selectedId) ?? sessions[0] ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) =>
      `${session.question} ${session.ownerUsername ?? ""} ${session.finalAnswer ?? ""}`.toLowerCase().includes(q)
    );
  }, [query, sessions]);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/team-research");
      const data = await res.json();
      const items: ServerSession[] = data.sessions ?? [];
      setSessions(items);
      setSelectedId((current) => current || items[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  function exportSelected() {
    if (!selected) return;
    const blob = new Blob([buildExportText(selected)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const shortTitle = selected.question.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]+/g, "-").slice(0, 40).replace(/-+$/, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnia-history-${shortTitle || "reading"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-col gap-3 px-3 py-4 md:min-h-[100dvh] md:gap-4 md:px-4 md:py-8">
      <header className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between md:rounded-2xl md:p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: "var(--accent-30)", background: "var(--accent-10)", color: "var(--accent)" }}>
            <History size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>ประวัติคำทำนาย</h1>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              เปิดอ่านคำตอบย้อนหลังแบบเต็มหน้า เหมาะกับมือถือและคำตอบยาว ๆ
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/research" className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-8)" }}>
            กลับห้องดูดวง <ArrowRight size={14} />
          </Link>
          <button onClick={loadHistory} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}>
            <RefreshCw size={14} /> โหลดใหม่
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-3 lg:grid-cols-[360px_1fr] lg:min-h-0 lg:gap-4">
        <aside className={`rounded-xl border p-2.5 lg:min-h-0 lg:rounded-2xl lg:p-3 ${mobileDetailOpen ? "hidden lg:block" : ""}`} style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="mb-3 rounded-xl border px-3 py-2 text-xs leading-relaxed lg:hidden" style={{ borderColor: "var(--accent-20)", background: "var(--accent-5)", color: "var(--text-muted)" }}>
            แตะประวัติหนึ่งรายการเพื่อเปิดอ่านเต็มหน้า
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาคำถามหรือคำตอบ"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text)" }}
            />
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>กำลังโหลดประวัติ...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>ยังไม่มีประวัติคำทำนาย</div>
          ) : (
            <div className="max-h-[48dvh] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-15rem)]">
              {filtered.map((session) => {
                const active = selected?.id === session.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(session.id);
                      setMobileDetailOpen(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full rounded-xl border p-3 text-left transition-all"
                    style={{
                      borderColor: active ? "var(--accent)" : "var(--border)",
                      background: active ? "var(--accent-8)" : "var(--surface)",
                    }}
                  >
                    <div className="line-clamp-2 text-sm font-bold" style={{ color: "var(--text)" }}>{session.question}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {new Date(session.startedAt).toLocaleDateString("th-TH")}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare size={11} /> {groupSessionHistory(session).length} ช่วงคำถาม</span>
                      {session.ownerUsername && <span className="inline-flex items-center gap-1"><User size={11} /> {session.ownerUsername}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className={`rounded-xl border lg:min-h-0 lg:rounded-2xl ${mobileDetailOpen ? "" : "hidden lg:block"}`} style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          {!selected ? (
            <div className="flex min-h-[320px] items-center justify-center p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              เลือกประวัติทางซ้ายเพื่ออ่านรายละเอียด
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b p-3 md:p-4" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setMobileDetailOpen(false)}
                  className="mb-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold lg:hidden"
                  style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
                >
                  ← กลับไปเลือกรายการประวัติ
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} style={{ color: "var(--success)" }} /> {selected.status}</span>
                      <span>{new Date(selected.startedAt).toLocaleString("th-TH")}</span>
                      {selected.totalTokens > 0 && <span>{selected.totalTokens.toLocaleString()} tokens</span>}
                    </div>
                    <h2 className="mt-2 text-lg font-bold leading-snug" style={{ color: "var(--text)" }}>{selected.question}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/research?sessionId=${selected.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                      ถามต่อจากคำทำนายนี้ <ArrowRight size={14} />
                    </Link>
                    <button onClick={exportSelected} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}>
                      <Download size={14} /> บันทึก
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-3 md:space-y-4 md:p-4 lg:max-h-[calc(100dvh-15rem)]">
                {selected.finalAnswer && (
                  <section className="rounded-xl border p-3 md:rounded-2xl md:p-4" style={{ borderColor: "var(--accent-30)", background: "var(--accent-5)" }}>
                    <div className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: "var(--accent)" }}>สรุปจาก OMNIA.AI</div>
                    <MarkdownBlock content={selected.finalAnswer} />
                  </section>
                )}

                {groupSessionHistory(selected).map((group, index) => (
                  <section key={`${selected.id}-${index}`} className="rounded-xl border p-3 md:rounded-2xl md:p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="mb-3 text-sm font-bold" style={{ color: "var(--text)" }}>{questionLabel(index)}: {group.question}</div>
                    <div className="space-y-3">
                      {group.messages.length === 0 ? (
                        <div className="text-sm" style={{ color: "var(--text-muted)" }}>ไม่มีรายละเอียดเพิ่มเติม</div>
                      ) : group.messages.map((msg) => (
                        <article key={msg.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                          <div className="mb-2 flex items-center gap-2 text-xs font-bold" style={{ color: "var(--text)" }}>
                            <span>{msg.agentEmoji}</span>
                            <span>{msg.agentName || roleLabel[msg.role]}</span>
                            <span className="font-normal" style={{ color: "var(--text-muted)" }}>{roleLabel[msg.role]}</span>
                          </div>
                          <MarkdownBlock content={msg.content} />
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
