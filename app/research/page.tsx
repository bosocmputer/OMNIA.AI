"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { showToast } from "../components/Toast";
import Modal from "../components/Modal";
import Tooltip from "../components/Tooltip";
import { GLOSSARY } from "@/lib/glossary";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Building2, Settings, Users, FileText, MessageSquare, History,
  Brain, Paperclip, Lightbulb, Send, Square, SkipForward,
  ChevronDown, ChevronRight, X, Download, Search, Check,
  AlertTriangle, Edit3, Clock, Coins,
  BarChart3, File, Trash2, RefreshCw, UserCircle, Plus,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  provider: string;
  model: string;
  role: string;
  active: boolean;
  hasApiKey: boolean;
  useWebSearch?: boolean;
  seniority?: number;
  isSystem?: boolean;
}

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

interface AgentTokenState {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

interface ConversationRound {
  question: string;
  messages: ResearchMessage[];
  finalAnswer: string;
  agentTokens: Record<string, AgentTokenState>;
  suggestions: string[];
  chartData?: ChartData;
  chairmanId?: string;
  isSynthesis?: boolean;
  isQA?: boolean;
  webSources?: WebSource[];
  clarificationAnswers?: { question: string; answer: string }[];
}

interface ConversationTurn {
  question: string;
  answer: string;
}

interface ClarificationQuestion {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
}

interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

interface BirthProfile {
  id?: string;
  label?: string | null;
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
  timezone?: string | null;
  isDefault?: boolean;
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

interface AttachedFile {
  filename: string;
  meta: string;
  context: string;
  chars: number;
  size: number;
  sheets?: string[]; // available sheets for Excel
  selectedSheets?: string[]; // sheets to inject
}

const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".docx", ".doc",
  ".json",
  ".txt", ".md", ".log",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STORAGE_KEY_PREFIX = "research_conversation_v2";

const ROLE_LABEL: Record<string, string> = {
  user_question: "คำถามจากผู้ใช้",
  thinking: "กำลังคิด",
  finding: "คำทำนาย",
  analysis: "วิเคราะห์",
  synthesis: "สรุปรวม",
  chat: "มุมมองเพิ่มเติม",
};

const ROLE_COLOR: Record<string, string> = {
  user_question: "border-amber-500/40 bg-amber-500/10",
  thinking: "border-yellow-500/30 bg-yellow-500/5",
  finding: "border-blue-500/30 bg-blue-500/5",
  analysis: "border-green-500/30 bg-green-500/5",
  synthesis: "border-purple-500/40 bg-purple-500/10 ring-1 ring-purple-500/20",
  chat: "border-slate-400/40 bg-slate-500/8",
};

// Optional context attachments for oracle readings.

const HISTORY_MODES = [
  { id: "full", label: "จำทั้งหมด — จำทุกรอบ" },
  { id: "last3", label: "จำ 3 รอบล่าสุด" },
  { id: "summary", label: "สรุปย่อ (ประหยัด)" },
  { id: "none", label: "ไม่จำ (ประหยัดสุด)" },
];

// Simple bar chart renderer (no external lib)
function SimpleBarChart({ data }: { data: ChartData }) {
  const allValues = data.datasets.flatMap((d) => d.data);
  const max = Math.max(...allValues, 1);
  const colors = ["var(--accent)", "#60a5fa", "#34d399", "#f472b6", "#fb923c"];

  return (
    <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-xs font-bold mb-3 flex items-center gap-1" style={{ color: "var(--accent)" }}><BarChart3 size={12} /> {data.title}</div>
      {data.type === "pie" ? (
        // Simple pie-like display as percentage bars
        <div className="space-y-2">
          {data.labels.map((label, i) => {
            const val = data.datasets[0]?.data[i] ?? 0;
            const pct = Math.round((val / (allValues.reduce((a, b) => a + b, 0) || 1)) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="text-xs w-24 truncate" style={{ color: "var(--text-muted)" }}>{label}</div>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                </div>
                <div className="text-xs w-10 text-right" style={{ color: "var(--text)" }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      ) : (
        // Bar/Line chart
        <div className="space-y-1">
          {data.datasets.map((dataset, di) => (
            <div key={di} className="space-y-1.5">
              {dataset.label && (
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{dataset.label}</div>
              )}
              {data.labels.map((label, i) => {
                const val = dataset.data[i] ?? 0;
                const pct = Math.round((val / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-xs w-28 truncate text-right" style={{ color: "var(--text-muted)" }}>{label}</div>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded flex items-center px-2 transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: colors[di % colors.length] }}>
                        <span className="text-[11px] text-white truncate">{val.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Render message content — Markdown with collapsible long content
const COLLAPSE_LINE_LIMIT = 8;

function MessageContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const stripped = content.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim();
  const lines = stripped.split("\n");
  const isLong = lines.length > COLLAPSE_LINE_LIMIT;
  const displayText = !expanded && isLong ? lines.slice(0, COLLAPSE_LINE_LIMIT).join("\n") : stripped;

  return (
    <div>
      <div className="prose-container text-sm leading-relaxed relative break-anywhere" style={{ color: "var(--text)" }}>
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
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>{children}</a>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="w-full text-xs border-collapse" style={{ borderColor: "var(--border)" }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead style={{ background: "var(--accent-10)" }}>{children}</thead>,
            th: ({ children }) => <th className="px-2 py-1.5 text-left border font-semibold text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{children}</th>,
            td: ({ children }) => <td className="px-2 py-1.5 border text-xs" style={{ borderColor: "var(--border)", color: "var(--text)" }}>{children}</td>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-3 pl-3 my-2 italic" style={{ borderColor: "var(--accent)", color: "var(--text-muted)" }}>{children}</blockquote>
            ),
            code: ({ className, children }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return <pre className="text-xs p-3 rounded-lg my-2 overflow-x-auto" style={{ background: "var(--bg)", color: "var(--text)" }}><code>{children}</code></pre>;
              }
              return <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--accent-12)", color: "var(--accent)" }}>{children}</code>;
            },
            hr: () => <hr className="my-3" style={{ borderColor: "var(--border)" }} />,
          }}
        >
          {displayText}
        </ReactMarkdown>
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none" style={{ background: "linear-gradient(transparent, var(--surface))" }} />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs mt-1 px-2 py-0.5 rounded transition-all hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          {expanded ? "▲ ย่อข้อความ" : `▼ อ่านเพิ่ม (${lines.length} บรรทัด)`}
        </button>
      )}
    </div>
  );
}

function ReadingFeedback({ scope }: { scope: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = [
    { id: "accurate", label: "แม่น", icon: "✓" },
    { id: "easy", label: "อ่านง่าย", icon: "✦" },
    { id: "too_broad", label: "กว้างไป", icon: "?" },
    { id: "too_long", label: "ยาวไป", icon: "!" },
  ];

  const saveFeedback = (value: string) => {
    setSelected(value);
    try {
      const key = "omnia_reading_feedback";
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([
        ...prev.slice(-49),
        { scope, value, timestamp: new Date().toISOString() },
      ]));
    } catch { /* ignore */ }
    showToast("success", "ขอบคุณครับ รับ feedback แล้ว");
  };

  return (
    <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row sm:items-center gap-2" style={{ borderColor: "var(--accent-20)" }}>
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>คำตอบนี้เป็นยังไงบ้าง?</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => saveFeedback(opt.id)}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all hover:opacity-85"
            style={{
              borderColor: selected === opt.id ? "var(--accent)" : "var(--border)",
              background: selected === opt.id ? "var(--accent-12)" : "var(--surface)",
              color: selected === opt.id ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <span>{opt.icon}</span> {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Oracle reading export
function buildMinutesMarkdown(rounds: ConversationRound[], agents: Agent[]): string {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));
  const isAllQA = rounds.every((r) => r.isQA);
  const lines: string[] = [
    isAllQA ? "# สรุปการถามตอบ" : "# บันทึกคำทำนาย",
    `> วันที่: ${new Date().toLocaleString("th-TH")}`,
    "",
  ];

  // Attendees (unique agents across all rounds)
  const attendeeIds = new Set<string>();
  rounds.forEach((r) => r.messages.forEach((m) => attendeeIds.add(m.agentId)));
  if (attendeeIds.size > 0) {
    lines.push(isAllQA ? "## ผู้ตอบ" : "## ผู้เข้าร่วมดูดวง", "");
    attendeeIds.forEach((id) => {
      const a = agentMap[id];
      if (a) lines.push(`- ${a.emoji} **${a.name}** (${a.role})`);
    });
    lines.push("");
  }

  rounds.forEach((round, i) => {
    lines.push(`---`, round.isQA ? `## คำถามที่ ${i + 1}: ${round.question}` : `## คำถามที่ ${i + 1}: ${round.question}`, "");

    // Clarification Q&A
    if (round.clarificationAnswers && round.clarificationAnswers.length > 0) {
      lines.push("### ข้อมูลเพิ่มเติมจากผู้ถาม", "");
      round.clarificationAnswers.forEach((qa) => {
        lines.push(`- **ถาม:** ${qa.question}`, `  **ตอบ:** ${qa.answer}`, "");
      });
    }

    // Phase 1 — presentations
    const findings = round.messages.filter((m) => m.role === "finding");
    if (findings.length > 0) {
      lines.push("### คำทำนายจากหมอดู", "");
      findings.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, "");
      });
    }

    // Phase 2 — discussion
    const chats = round.messages.filter((m) => m.role === "chat");
    if (chats.length > 0) {
      lines.push("### มุมมองเพิ่มเติม", "");
      chats.forEach((m) => {
        lines.push(`#### ${m.agentEmoji} ${m.agentName}`, m.content, "");
      });
    }

    // Phase 3 — synthesis/resolution
    if (round.finalAnswer) {
      lines.push(round.isQA ? "### คำตอบ" : "### สรุปคำทำนายรวม", round.finalAnswer.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim(), "");
    }

    // Web Sources
    if (round.webSources && round.webSources.length > 0) {
      lines.push("### แหล่งอ้างอิง", "");
      round.webSources.forEach((src, si) => {
        lines.push(`${si + 1}. [${src.title}](${src.url}) — ${src.domain}`);
      });
      lines.push("");
    }

    // Token summary
    if (round.agentTokens && Object.keys(round.agentTokens).length > 0) {
      const totalTokens = Object.values(round.agentTokens).reduce((sum, t) => sum + t.totalTokens, 0);
      lines.push(`> Token ที่ใช้ในวาระนี้: ${totalTokens.toLocaleString()}`, "");
    }
  });

  return lines.join("\n");
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

  if (groups.length === 0) {
    groups.push({ question: session.question, messages: [] });
  }

  return groups;
}

export default function ResearchPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [birthProfile, setBirthProfile] = useState<BirthProfile | null>(null);
  const [birthProfiles, setBirthProfiles] = useState<BirthProfile[]>([]);
  const [selectedBirthProfileId, setSelectedBirthProfileId] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState("");
  const [historyMode, setHistoryMode] = useState<"full" | "last3" | "summary" | "none">("none");
  const [useFileContext, setUseFileContext] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [running, setRunning] = useState(false);
  const [agentTokens, setAgentTokens] = useState<Record<string, AgentTokenState>>({});
  const [status, setStatus] = useState("");
  const [chairmanId, setChairmanId] = useState<string | null>(null);
  const [searchingAgents, setSearchingAgents] = useState<Set<string>>(new Set());
  const [activeAgentIds, setActiveAgentIds] = useState<Set<string>>(new Set());
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2 | 3>(0);
  const [phase1DoneCount, setPhase1DoneCount] = useState<Set<string>>(new Set());

  // Clarification state
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [pendingClarification, setPendingClarification] = useState(false);
  const [clarificationMode, setClarificationMode] = useState<"chat" | "birth">("chat");
  const pendingClarificationQuestionRef = useRef<string>("");
  const lastClarificationAnswersRef = useRef<{ question: string; answer: string }[] | undefined>(undefined);

  // Web sources state
  const [currentWebSources, setCurrentWebSources] = useState<WebSource[]>([]);
  const currentWebSourcesRef = useRef<WebSource[]>([]);

  // Meeting timer
  const [meetingStartTime, setMeetingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Conversation state (persisted in localStorage)
  const [rounds, setRounds] = useState<ConversationRound[]>([]);
  const [meetingSessionId, setMeetingSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ResearchMessage[]>([]);
  const [currentFinalAnswer, setCurrentFinalAnswer] = useState("");
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [currentChartData, setCurrentChartData] = useState<ChartData | null>(null);
  const [isCurrentQA, setIsCurrentQA] = useState(false);
  const [isCurrentClosing, setIsCurrentClosing] = useState(false);

  // File attachments
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server history
  const [serverSessions, setServerSessions] = useState<ServerSession[]>([]);
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [viewingSession, setViewingSession] = useState<ServerSession | null>(null);
  const [historyTab, setHistoryTab] = useState<"current" | "history">("current");

  const [autoScroll, setAutoScroll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentFinalAnswerRef = useRef("");
  const streamFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentMessagesRef = useRef<ResearchMessage[]>([]);
  const currentSuggestionsRef = useRef<string[]>([]);
  const currentChartDataRef = useRef<ChartData | null>(null);
  const chairmanIdRef = useRef<string | null>(null);
  const meetingSessionIdRef = useRef<string | null>(null);

  // Smart mode (auto-detect QA vs meeting based on agent count)
  const [forceMode, setForceMode] = useState<"auto" | "meeting" | "qa">("auto");
  const skipToSummaryRef = useRef(false);
  const [pendingSkipToSummary, setPendingSkipToSummary] = useState(false);
  const handleCloseRef = useRef<() => void>(() => {});

  useEffect(() => { currentFinalAnswerRef.current = currentFinalAnswer; }, [currentFinalAnswer]);
  useEffect(() => { currentMessagesRef.current = currentMessages; }, [currentMessages]);
  useEffect(() => { currentSuggestionsRef.current = currentSuggestions; }, [currentSuggestions]);
  useEffect(() => { currentChartDataRef.current = currentChartData; }, [currentChartData]);
  useEffect(() => { chairmanIdRef.current = chairmanId; }, [chairmanId]);
  useEffect(() => { meetingSessionIdRef.current = meetingSessionId; }, [meetingSessionId]);
  useEffect(() => { currentWebSourcesRef.current = currentWebSources; }, [currentWebSources]);

  // Load from localStorage when userId is ready
  useEffect(() => {
    if (!currentUserId) return;
    const storageKey = `${STORAGE_KEY_PREFIX}_${currentUserId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rounds) setRounds(parsed.rounds);
        if (parsed.meetingSessionId) {
          setMeetingSessionId(parsed.meetingSessionId);
          meetingSessionIdRef.current = parsed.meetingSessionId;
        }
      }
    } catch { /* ignore */ }
  }, [currentUserId]);

  // Save to localStorage when rounds change (only when userId is known)
  useEffect(() => {
    if (!currentUserId) return;
    const storageKey = `${STORAGE_KEY_PREFIX}_${currentUserId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ rounds, meetingSessionId }));
    } catch { /* ignore */ }
  }, [rounds, meetingSessionId, currentUserId]);

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/team-agents");
    const data = await res.json();
    const activeAgents = (data.agents ?? []).filter((a: Agent) => a.active && !a.isSystem);
    setAgents(activeAgents);
    setSelectedIds((prev) => prev.size > 0 ? prev : new Set(activeAgents.map((agent: Agent) => agent.id)));
  }, []);

  const fetchServerHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/team-research");
      const data = await res.json();
      const filtered = (data.sessions ?? []).filter((s: ServerSession) =>
        !s.agentIds?.some((id: string) => id.startsWith("system-"))
      );
      setTotalSessionCount(filtered.length);
      setServerSessions(filtered.slice(0, 20));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchServerHistory();
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.id) setCurrentUserId(d.id); }).catch(() => {});
    fetch("/api/birth-profile").then(r => r.json()).then(d => {
      const profiles = d.profiles ?? (d.profile ? [d.profile] : []);
      setBirthProfiles(profiles);
      const requestedProfileId = new URLSearchParams(window.location.search).get("profileId");
      const active = profiles.find((p: BirthProfile) => p.id === requestedProfileId) ?? profiles.find((p: BirthProfile) => p.isDefault) ?? profiles[0] ?? null;
      setBirthProfile(active);
      setSelectedBirthProfileId(active?.id ?? "");
    }).catch(() => {});
  }, [fetchAgents, fetchServerHistory]);

  // Handle ?q=, ?teamId=, ?sessionId= from dashboard/teams page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuestion(q);
    const profileId = params.get("profileId");
    if (profileId) setSelectedBirthProfileId(profileId);

    const agentId = params.get("agentId");
    if (agentId) setSelectedIds(new Set([agentId]));

    const teamId = params.get("teamId");
    if (teamId) {
      fetch(`/api/teams/${teamId}`)
        .then(r => r.json())
        .then(data => {
          if (data.team?.agentIds?.length) {
            setSelectedIds(new Set(data.team.agentIds));
          }
        })
        .catch(() => {});
    }

    const sessionId = params.get("sessionId");
    if (sessionId) {
      fetch(`/api/team-research/${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data.session) {
            setViewingSession(data.session);
            setHistoryTab("history");
            if (data.session.agentIds?.length) {
              setSelectedIds(new Set(data.session.agentIds));
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Meeting timer
  useEffect(() => {
    if (!meetingStartTime) return;
    const interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - meetingStartTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [meetingStartTime]);

  // Force-complete running session when user closes/navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = meetingSessionIdRef.current;
      if (sid) {
        const payload = JSON.stringify({ action: "force-complete", reason: "📡 การเชื่อมต่อถูกตัด" });
        navigator.sendBeacon(`/api/team-research/${sid}`, new Blob([payload], { type: "application/json" }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages, rounds, autoScroll]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // ถ้าอยู่ห่างจากล่างสุดไม่เกิน 80px ถือว่าอยู่ล่างสุด
    setAutoScroll(distFromBottom < 80);
  };

  useEffect(() => {
    if (!selectedBirthProfileId) return;
    const profile = birthProfiles.find((p) => p.id === selectedBirthProfileId);
    if (profile) setBirthProfile(profile);
  }, [selectedBirthProfileId, birthProfiles]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setAutoScroll(true);
  };

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uploadFile = async (file: File) => {
    setUploadError("");
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setUploadError(`ไม่รองรับไฟล์ประเภท ${ext}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`ไฟล์ใหญ่เกิน 10MB (${formatBytes(file.size)})`);
      return;
    }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/team-research/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      // Parse available sheets for Excel files
      const sheets: string[] = [];
      if (data.meta && data.meta.includes("sheets:")) {
        const match = data.meta.match(/sheets: (.+)$/);
        if (match) sheets.push(...match[1].split(", ").map((s: string) => s.trim()));
      }
      setAttachedFiles((prev) => [...prev, {
        filename: data.filename,
        meta: data.meta,
        context: data.context,
        chars: data.chars,
        size: file.size,
        sheets: sheets.length > 0 ? sheets : undefined,
        selectedSheets: sheets.length > 0 ? sheets : undefined,
      }]);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(uploadFile);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  };

  const toggleSheet = (fileIdx: number, sheet: string) => {
    setAttachedFiles((prev) => prev.map((f, i) => {
      if (i !== fileIdx) return f;
      const sel = f.selectedSheets ?? [];
      return {
        ...f,
        selectedSheets: sel.includes(sheet) ? sel.filter((s) => s !== sheet) : [...sel, sheet],
      };
    }));
  };

  // Smart mode: auto = 1 agent→QA, 2+→meeting; user can override
  const effectiveMode = forceMode !== "auto" ? forceMode : selectedIds.size <= 1 ? "qa" : "meeting";

  const buildHistory = (): ConversationTurn[] =>
    rounds.filter(r => !r.isSynthesis).map((r) => ({
      question: r.question,
      answer: r.finalAnswer || r.messages
        .filter(m => m.role === "finding" || m.role === "chat" || m.role === "synthesis")
        .map(m => `${m.agentEmoji} ${m.agentName}: ${m.content.slice(0, 500)}`)
        .join("\n---\n"),
    }));

  const buildFileContexts = () =>
    attachedFiles.length > 0
      ? attachedFiles.map((f) => ({
          filename: f.filename,
          meta: f.meta,
          context: f.context,
          sheets: f.selectedSheets,
        }))
      : undefined;

  const isAstrologyPrompt = (text: string) => {
    const q = text.toLowerCase();
    const keywords = ["ดูดวง", "ดวง", "โหราศาสตร์", "ทำนาย", "พยากรณ์", "ชะตา", "ราศี", "บาจี", "bazi", "ไพ่", "ฮวงจุ้ย"];
    return keywords.some((kw) => q.includes(kw)) || agents.some((agent) => selectedIds.has(agent.id) && agent.id.startsWith("astro-"));
  };

  const getAstrologyConcerns = (text: string) => {
    const q = text.toLowerCase();
    const concerns: string[] = [];
    if (q.includes("งาน") || q.includes("อาชีพ") || q.includes("ธุรกิจ")) concerns.push("การงาน/อาชีพ");
    if (q.includes("เงิน") || q.includes("ทรัพย์") || q.includes("ลงทุน")) concerns.push("การเงิน/ทรัพย์สิน");
    if (q.includes("รัก") || q.includes("คู่") || q.includes("ครอบครัว")) concerns.push("ความรัก/ครอบครัว");
    if (q.includes("สุขภาพ")) concerns.push("สุขภาพ");
    if (q.includes("โชค") || q.includes("ลาภ")) concerns.push("โชคลาภ");
    if (q.includes("ภาพรวม") || q.includes("รวม") || q.includes("ทั้งปี") || q.includes("12 เดือน")) concerns.push("ภาพรวมชีวิต");
    if (q.includes("เดือนหน้า") || q.includes("สัปดาห์หน้า") || q.includes("ช่วงนี้") || q.includes("ปีหน้า")) concerns.push("ภาพรวมชีวิต");
    return concerns;
  };

  const buildBirthProfileAnswers = (text: string): { question: string; answer: string }[] | undefined => {
    if (!birthProfile?.name || !birthProfile?.birthDate || !isAstrologyPrompt(text)) return undefined;
    const concerns = getAstrologyConcerns(text);

    return [
      { question: "เจ้าชะตาที่เลือกในระบบ", answer: birthProfile.id || birthProfile.name },
      { question: "ชื่อ-นามสกุล ของผู้ต้องการดูดวง", answer: birthProfile.name },
      { question: "วันเดือนปีเกิด", answer: birthProfile.birthDate },
      { question: "เวลาเกิด", answer: birthProfile.birthTime || "ไม่ทราบ" },
      { question: "จังหวัด/ประเทศเกิด", answer: birthProfile.birthPlace || "ไม่ระบุ" },
      { question: "ประเด็นหลักที่ต้องการทราบ", answer: concerns.length > 0 ? concerns.join(", ") : "ต่อเนื่องจากคำถามล่าสุด/ภาพรวมชีวิต" },
      { question: "กฎการใช้ข้อมูลเจ้าชะตา", answer: "ใช้เฉพาะข้อมูลเจ้าชะตานี้ในการดูดวง ห้ามนำชื่อหรือวันเกิดของบุคคลอื่นจากประวัติเดิมมาปน" },
    ];
  };

  const hasFinalReading = () => rounds.some((r) => !r.isQA && (!!r.finalAnswer || r.messages.some((m) => m.role === "synthesis")));

  const handleRun = async (overrideQuestion?: string, closeMode = false, withClarificationAnswers?: { question: string; answer: string }[]) => {
    const q = closeMode
      ? (rounds[0]?.question ?? "สรุปคำทำนายรวม")
      : (overrideQuestion ?? question).trim();
    if (!closeMode && selectedIds.size === 0) {
      showToast("warning", "กำลังเตรียมห้องหมอดู กรุณาเลือกหมอดูอย่างน้อย 1 ท่าน");
      return;
    }
    // Warn if any selected agent has no API key
    if (!closeMode) {
      const noKey = agents.filter(a => selectedIds.has(a.id) && !a.hasApiKey);
      if (noKey.length > 0) {
        showToast("warning", `⚠️ ${noKey.map(a => a.name).join(", ")} ยังไม่มี API Key — ไปตั้งค่าที่หน้า Agent ก่อน`);
        return;
      }
    }
    if (!closeMode && (!q || running)) return;
    if (closeMode && (rounds.length === 0 || running)) return;
    if (closeMode && hasFinalReading()) {
      showToast("info", "มีสรุปคำทำนายรวมแล้ว — ถามต่อได้เลยโดยไม่ต้องสรุปซ้ำ");
      return;
    }

    const isQA = !closeMode && effectiveMode === "qa";
    const effectiveClarificationAnswers = withClarificationAnswers ?? buildBirthProfileAnswers(q);

    setViewingSession(null);
    setHistoryTab("current");
    setAutoScroll(true);
    setRunning(true);
    setCurrentMessages([]);
    setCurrentFinalAnswer("");
    setIsCurrentQA(isQA);
    setIsCurrentClosing(!!closeMode);
    if (!meetingStartTime && !isQA) setMeetingStartTime(Date.now());
    setCurrentSuggestions([]);
    setCurrentChartData(null);
    setAgentTokens({});
    setCurrentWebSources([]);
    currentWebSourcesRef.current = [];
    lastClarificationAnswersRef.current = effectiveClarificationAnswers;
    setStatus(closeMode ? "OMNIA.AI กำลังสรุปคำทำนายรวม..." : isQA ? "กำลังดูดวง..." : "");
    setChairmanId(null);
    setSearchingAgents(new Set());
    setPendingClarification(false);
    setClarificationMode("chat");
    setClarificationQuestions([]);
    setClarificationAnswers({});
    pendingClarificationQuestionRef.current = q;
    setActiveAgentIds(new Set());
    setCurrentPhase(0);
    setPhase1DoneCount(new Set());
    setIsSynthesizing(false);
    if (!overrideQuestion && !closeMode) setQuestion("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);

    abortRef.current = new AbortController();
    const roundTokens: Record<string, AgentTokenState> = {};

    try {
      const body: Record<string, unknown> = {
        question: q,
        agentIds: Array.from(selectedIds),
        mode: closeMode ? "close" : isQA ? "qa" : "full",
        sessionId: meetingSessionIdRef.current || undefined,
        conversationHistory: buildHistory(),
        fileContexts: useFileContext ? buildFileContexts() : [],
        historyMode,
        disableMcp: true,
        includeCompanyInfo: false,
        clarificationAnswers: effectiveClarificationAnswers || undefined,
      };

      if (closeMode) {
        const ALL_ROUNDS_MSG_CAP = 1500; // cap per message before sending to keep body < 500KB
        body.allRounds = rounds.filter(r => !r.isSynthesis).map(r => ({
          question: r.question,
          messages: r.messages.filter(m => m.role !== "thinking" && m.role !== "user_question").map(m => ({
            ...m,
            content: m.content.length > ALL_ROUNDS_MSG_CAP
              ? m.content.slice(0, Math.floor(ALL_ROUNDS_MSG_CAP * 0.7)) + "\n[...]\n" + m.content.slice(-Math.floor(ALL_ROUNDS_MSG_CAP * 0.3))
              : m.content,
          })),
        }));
      }

      const res = await fetch("/api/team-research/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));

            if (currentEvent === "session") {
              if (!meetingSessionIdRef.current) {
                meetingSessionIdRef.current = payload.sessionId;
                setMeetingSessionId(payload.sessionId);
              }
            } else if (currentEvent === "status" || ("message" in payload && typeof payload.message === "string")) {
              setStatus(payload.message);
              // Track current phase from status messages
              const msg = payload.message as string;
              if (msg.includes("Phase 1")) setCurrentPhase(1);
              else if (msg.includes("Phase 2") || msg.includes("มุมมองเพิ่มเติม")) setCurrentPhase(2);
              else if (msg.includes("Phase 3") || msg.includes("สรุปรวม")) { setCurrentPhase(3); setIsSynthesizing(true); }
            } else if (currentEvent === "chairman") {
              setChairmanId(payload.agentId);
              chairmanIdRef.current = payload.agentId;
            } else if (currentEvent === "agent_start" || currentEvent === "agent_searching") {
              setActiveAgentIds((prev) => new Set([...prev, payload.agentId]));
              if (currentEvent === "agent_searching") {
                setSearchingAgents((prev) => new Set([...prev, payload.agentId]));
              }
            } else if (currentEvent === "message" || ("content" in payload && "agentId" in payload)) {
              setSearchingAgents((prev) => { const n = new Set(prev); n.delete(payload.agentId); return n; });
              if ((payload as ResearchMessage).role !== "thinking") {
                setActiveAgentIds((prev) => { const n = new Set(prev); n.delete(payload.agentId); return n; });
                if ((payload as ResearchMessage).role === "finding") setPhase1DoneCount((prev) => new Set([...prev, (payload as ResearchMessage).agentId]));
              }
              setCurrentMessages((prev) => [...prev, payload as ResearchMessage]);
            } else if (currentEvent === "final_answer_delta") {
              // Streaming: accumulate in ref, debounce state updates for performance
              currentFinalAnswerRef.current = (currentFinalAnswerRef.current || "") + payload.content;
              if (!streamFlushRef.current) {
                streamFlushRef.current = setTimeout(() => {
                  setCurrentFinalAnswer(currentFinalAnswerRef.current);
                  streamFlushRef.current = null;
                }, 80);
              }
            } else if (currentEvent === "final_answer" || ("content" in payload && !("agentId" in payload))) {
              // Final complete answer — flush any pending stream
              if (streamFlushRef.current) { clearTimeout(streamFlushRef.current); streamFlushRef.current = null; }
              currentFinalAnswerRef.current = payload.content;
              setCurrentFinalAnswer(payload.content);
              setIsSynthesizing(false);
            } else if (currentEvent === "agent_tokens" || ("inputTokens" in payload)) {
              const t = { inputTokens: payload.inputTokens, outputTokens: payload.outputTokens, totalTokens: payload.totalTokens };
              roundTokens[payload.agentId] = t;
              setAgentTokens((prev) => ({ ...prev, [payload.agentId]: t }));
            } else if (currentEvent === "follow_up_suggestions" || "suggestions" in payload) {
              setCurrentSuggestions(payload.suggestions);
            } else if (currentEvent === "chart_data") {
              setCurrentChartData(payload);
            } else if (currentEvent === "error") {
              setStatus(`⚠️ ${payload.message || "เกิดข้อผิดพลาด"}`);
            } else if (currentEvent === "clarification_needed") {
              const questions = payload.questions ?? [];
              const isBirthClarification = questions.some((q: ClarificationQuestion) =>
                q.id.startsWith("astro_") || q.question.includes("เกิด") || q.question.includes("ดูดวง")
              );
              setClarificationMode(isBirthClarification ? "birth" : "chat");
              setClarificationQuestions(questions);
              const prefill: Record<string, string> = {};
              if (isBirthClarification && birthProfile) {
                questions.forEach((q: ClarificationQuestion) => {
                  if (q.id === "astro_name" && birthProfile.name) prefill[q.id] = birthProfile.name;
                  if (q.id === "astro_dob" && birthProfile.birthDate) prefill[q.id] = birthProfile.birthDate;
                  if (q.id === "astro_tob") prefill[q.id] = birthProfile.birthTime || "ไม่ทราบ";
                  if (q.id === "astro_birthplace") prefill[q.id] = birthProfile.birthPlace || "";
                });
              }
              setClarificationAnswers(prefill);
              setPendingClarification(true);
              // Auto-scroll to show clarification form
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
            } else if (currentEvent === "web_sources") {
              const newSources: WebSource[] = payload.sources ?? [];
              setCurrentWebSources((prev) => {
                const seen = new Set(prev.map((s) => s.url));
                const fresh = newSources.filter((s: WebSource) => !seen.has(s.url));
                const merged = [...prev, ...fresh];
                currentWebSourcesRef.current = merged;
                return merged;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setStatus(`Error: ${e.message}`);
      }
    } finally {
      setRunning(false);
      setSearchingAgents(new Set());
      setActiveAgentIds(new Set());
      setCurrentPhase(0);
      setPhase1DoneCount(new Set());

      // Fallback recovery: if stream ended with no data but we have a session, check the API
      if (
        currentMessagesRef.current.length === 0 &&
        !currentFinalAnswerRef.current &&
        meetingSessionIdRef.current
      ) {
        try {
          const fallbackRes = await fetch(`/api/team-research/${meetingSessionIdRef.current}`);
          if (fallbackRes.ok) {
            const session = await fallbackRes.json();
            if (session.status === "completed" && (session.messages?.length > 0 || session.finalAnswer)) {
              // Recover messages from the API
              if (session.messages?.length > 0) {
                currentMessagesRef.current = session.messages.map((m: any) => ({
                  id: m.id,
                  agentId: m.agentId,
                  agentName: m.agentName,
                  agentEmoji: m.agentEmoji,
                  role: m.role,
                  content: m.content,
                  tokensUsed: m.tokensUsed,
                  timestamp: m.timestamp || new Date().toISOString(),
                }));
              }
              if (session.finalAnswer) {
                currentFinalAnswerRef.current = session.finalAnswer;
              }
            }
          }
        } catch { /* fallback recovery failed, proceed normally */ }
      }

      // Only add a round if there are messages (close mode may have only synthesis)
      if (currentMessagesRef.current.length > 0 || currentFinalAnswerRef.current) {
        const visibleMessages = currentFinalAnswerRef.current
          ? currentMessagesRef.current.filter((m) => m.role !== "synthesis")
          : currentMessagesRef.current;
        setRounds((prev) => [
          ...prev,
          {
            question: closeMode ? "🏛️ สรุปคำทำนายรวม" : q,
            messages: visibleMessages,
            finalAnswer: currentFinalAnswerRef.current,
            agentTokens: roundTokens,
            suggestions: currentSuggestionsRef.current,
            chartData: currentChartDataRef.current ?? undefined,
            chairmanId: chairmanIdRef.current ?? undefined,
            isSynthesis: closeMode,
            isQA,
            webSources: currentWebSourcesRef.current.length > 0 ? currentWebSourcesRef.current : undefined,
            clarificationAnswers: lastClarificationAnswersRef.current?.length ? lastClarificationAnswersRef.current : undefined,
          },
        ]);
      }
      if (skipToSummaryRef.current && !closeMode) {
        skipToSummaryRef.current = false;
        setTimeout(() => handleCloseRef.current(), 300);
      }
      if (closeMode) {
        // Meeting closed — clear session
        setMeetingSessionId(null);
        meetingSessionIdRef.current = null;
        setMeetingStartTime(null);
        setElapsedTime(0);
        showToast("success", "ปิดดูดวงแล้ว — บันทึกสรุปรวมแล้ว ✓");
      }
      setCurrentMessages([]);
      setCurrentFinalAnswer("");
      if (streamFlushRef.current) { clearTimeout(streamFlushRef.current); streamFlushRef.current = null; }
      setCurrentSuggestions([]);
      setCurrentChartData(null);
      setCurrentWebSources([]);
      currentWebSourcesRef.current = [];
      setChairmanId(null);
      setIsCurrentClosing(false);
      fetchServerHistory();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Handle clarification submit
  const handleClarificationSubmit = () => {
    let answers = clarificationQuestions.map((q) => ({
      question: q.question,
      answer: clarificationAnswers[q.id] || "(ไม่ระบุ)",
    }));
    const profileAnswers = buildBirthProfileAnswers(`${pendingClarificationQuestionRef.current} ${answers.map((a) => a.answer).join(" ")}`);
    if (profileAnswers) {
      const seen = new Set(answers.map((a) => a.question));
      answers = [...answers, ...profileAnswers.filter((a) => !seen.has(a.question))];
    }
    setPendingClarification(false);
    setClarificationQuestions([]);
    handleRun(pendingClarificationQuestionRef.current || undefined, false, answers);
  };

  const handleSkipClarification = () => {
    setPendingClarification(false);
    setClarificationMode("chat");
    setClarificationQuestions([]);
    handleRun(pendingClarificationQuestionRef.current || undefined, false, buildBirthProfileAnswers(pendingClarificationQuestionRef.current) ?? []);
  };

  const handleCloseMeeting = () => handleRun(undefined, true);
  handleCloseRef.current = handleCloseMeeting;

  const handleSkipToSummary = () => {
    const hasData = currentMessagesRef.current.some(m =>
      m.role === "finding" || m.role === "chat" || m.role === "analysis" || m.role === "synthesis"
    );
    if (!hasData && rounds.length === 0) {
      showToast("warning", "ยังไม่มีข้อมูลเพียงพอ — รอให้ agent นำเสนอก่อน");
      return;
    }
    skipToSummaryRef.current = true;
    abortRef.current?.abort();
  };

  // Auto-trigger close meeting after skip-to-summary abort settles
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pendingSkipToSummary && !running && rounds.length > 0) {
      setPendingSkipToSummary(false);
      handleCloseMeeting();
    }
  }, [pendingSkipToSummary, running, rounds]);

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
    setStatus("หยุดแล้ว — พิมพ์คำถามใหม่ หรือกดสรุปรวม");
    // Force-complete session on the server
    const sid = meetingSessionIdRef.current;
    if (sid) {
      fetch(`/api/team-research/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force-complete", reason: "🔒 ปิดดูดวงโดยผู้ใช้" }),
      }).catch(() => {});
    }
  };

  const loadServerSession = async (session: ServerSession) => {
    try {
      const res = await fetch(`/api/team-research/${session.id}`);
      const data = await res.json();
      if (data.session) {
        setViewingSession(data.session);
        setHistoryTab("history");
      }
    } catch { /* ignore */ }
  };

  const clearSession = () => {
    setRounds([]);
    setMeetingSessionId(null);
    meetingSessionIdRef.current = null;
    setCurrentMessages([]);
    setCurrentFinalAnswer("");
    setCurrentSuggestions([]);
    if (currentUserId) localStorage.removeItem(`${STORAGE_KEY_PREFIX}_${currentUserId}`);
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const confirmClearSession = () => {
    if (rounds.length === 0) { clearSession(); return; }
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    clearSession();
    showToast("info", "เริ่มดูดวงใหม่เรียบร้อย");
  };

  const exportMinutes = () => {
    let exportRounds: ConversationRound[];
    if (viewingSession) {
      // Convert server session to ConversationRound format for unified export
      const historyGroups = groupSessionHistory(viewingSession);
      exportRounds = historyGroups.map((group, index) => ({
        question: group.question,
        messages: group.messages.map((m) => ({
          id: m.id,
          agentId: m.agentId,
          agentName: m.agentName,
          agentEmoji: m.agentEmoji,
          role: m.role,
          content: m.content,
          tokensUsed: m.tokensUsed,
          timestamp: m.timestamp || new Date().toISOString(),
        })),
        finalAnswer: index === historyGroups.length - 1 ? viewingSession.finalAnswer || "" : "",
        agentTokens: {},
        suggestions: [],
      }));
    } else {
      if (rounds.length === 0) return;
      exportRounds = rounds;
    }
    const md = buildMinutesMarkdown(exportRounds, agents);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const firstQ = exportRounds[0]?.question ?? "";
    const shortTitle = firstQ.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]+/g, "-").slice(0, 40).replace(/-+$/, "");
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a"); a.href = url; a.download = `omnia-reading-${shortTitle || "reading"}-${dateStr}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const displayRounds = rounds;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      {/* Birth profile selector */}
      <div className="border rounded-xl p-3" style={{ borderColor: "var(--accent-30)", background: "var(--accent-5)" }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
            <UserCircle size={13} /> เจ้าชะตา
          </div>
          <a href="/profile" className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "var(--accent)", color: "var(--accent)" }} onClick={onNavigate}>
            <Plus size={11} /> เพิ่ม
          </a>
        </div>
        {birthProfiles.length > 0 ? (
          <div className="space-y-2">
            <select
              value={selectedBirthProfileId}
              onChange={(e) => setSelectedBirthProfileId(e.target.value)}
              className="w-full rounded-lg border px-2 py-2 text-xs outline-none"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
              title="เลือกเจ้าชะตา"
            >
              {birthProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {(profile.label ? `${profile.label}: ` : "") + (profile.name || "ไม่ระบุชื่อ")}
                </option>
              ))}
            </select>
            {birthProfile && (
              <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                ใช้ข้อมูลของ <strong style={{ color: "var(--text)" }}>{birthProfile.name}</strong>
                {birthProfile.birthDate ? ` · ${birthProfile.birthDate}` : ""}
                {birthProfile.birthTime ? ` · ${birthProfile.birthTime}` : " · ไม่ระบุเวลาเกิด"}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>ยังไม่มีข้อมูลเกิด เพิ่มเจ้าชะตาก่อนเพื่อให้คำทำนายละเอียดขึ้น</p>
            <a href="/profile" className="inline-flex items-center justify-center w-full gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }} onClick={onNavigate}>
              เพิ่มเจ้าชะตา
            </a>
          </div>
        )}
      </div>

      {/* Agent selector */}
      <div className="border rounded-xl p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <div className="text-xs mb-2 font-bold" style={{ color: "var(--text-muted)" }}>
            หมอดูในห้อง ({selectedIds.size}/{agents.length})
          </div>
          {agents.length > 0 && (
            <button
              onClick={() => {
                if (selectedIds.size === agents.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(agents.map(a => a.id)));
              }}
              className="text-[11px] px-2 py-0.5 rounded border transition-all mb-2"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {selectedIds.size === agents.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
            </button>
          )}
        </div>
        {agents.length === 0 ? (
          <div className="text-center py-6 px-3">
                  <div className="text-2xl mb-2"><Building2 size={28} style={{ color: "var(--accent)" }} /></div>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>ยังไม่มีหมอดูพร้อมใช้งาน — เพิ่มโหราจารย์ก่อนเริ่มดูดวง</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {agents.map((agent) => {
              const tokens = agentTokens[agent.id];
              const isSearching = searchingAgents.has(agent.id);
              const isSpeaking = activeAgentIds.has(agent.id);
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`w-full text-left p-2 rounded-lg border transition-all ${isSpeaking ? "ring-1 ring-[var(--accent)]" : ""}`}
                  style={{
                    borderColor: isSpeaking ? "var(--accent)" : selectedIds.has(agent.id) ? "var(--accent)" : "var(--border)",
                    background: isSpeaking ? "var(--accent-15)" : selectedIds.has(agent.id) ? "var(--accent-8)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{agent.name}</div>
                        {agent.useWebSearch && <span className="text-[10px]" title="Web Search"><Search size={10} /></span>}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                        {isSpeaking ? (
                          <span style={{ color: "var(--accent)" }}>กำลังดูให้...</span>
                        ) : agent.role}
                      </div>
                    </div>
                    {isSearching ? (
                      <span className="text-[10px] animate-pulse" style={{ color: "var(--accent)" }}>ค้นหา...</span>
                    ) : isSpeaking ? (
                      <span className="inline-block w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--accent)" }} />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: selectedIds.has(agent.id) ? "var(--accent)" : "var(--border)" }} />
                    )}
                  </div>
                  {tokens && (
                    <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {tokens.totalTokens.toLocaleString()} tokens
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Oracle options */}
      <button
        onClick={() => setShowAdvanced(v => !v)}
        className="w-full text-left text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-1"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}
      >
        {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />} <Settings size={11} /> ตัวเลือกห้องหมอดู
      </button>
      {showAdvanced && (
      <div className="border rounded-xl p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-xs mb-1 font-bold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Brain size={12} /> ความจำคำทำนาย
          <Tooltip content={`${GLOSSARY.contextWindow?.short ?? ""} · เลือกว่าจะให้ AI จำคำถามก่อน ๆ มากน้อยแค่ไหน — ยิ่งจำเยอะยิ่งเปลือง Token`}>
            <span className="text-[10px] px-1 rounded border cursor-help font-normal" style={{ borderColor: "var(--border)" }}>?</span>
          </Tooltip>
        </div>
        <select
          value={historyMode}
          onChange={(e) => setHistoryMode(e.target.value as typeof historyMode)}
          className="w-full px-2 py-1.5 rounded-lg border text-xs mb-2"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          {HISTORY_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>

        <div className="text-xs mb-1.5 font-bold" style={{ color: "var(--text-muted)" }}>สิ่งประกอบคำถาม</div>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer select-none" style={{ borderColor: useFileContext ? "var(--accent)" : "var(--border)", background: "var(--bg)" }}>
            <span className="text-xs flex items-center gap-1" style={{ color: useFileContext ? "var(--text)" : "var(--text-muted)" }}><Paperclip size={11} /> ใช้ไฟล์ที่แนบประกอบคำทำนาย</span>
            <div onClick={() => setUseFileContext(v => !v)} className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0" style={{ background: useFileContext ? "var(--accent)" : "var(--border)" }}>
              <span className="absolute top-0.5 transition-all duration-200 w-3 h-3 rounded-full bg-white shadow" style={{ left: useFileContext ? "17px" : "2px" }} />
            </div>
          </label>
        </div>
      </div>
      )}
      {showAdvanced && (
      <div
        className="border rounded-xl p-3"
        style={{ borderColor: isDragOver ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
            <Paperclip size={12} /> สิ่งที่อยากให้หมอดูดูประกอบ ({attachedFiles.length})
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="text-xs px-2 py-1 rounded-lg border transition-all disabled:opacity-40"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            {uploadingFile ? "⏳" : "+ แนบ"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={SUPPORTED_EXTENSIONS.join(",")}
            onChange={handleFileInput}
            className="hidden"
            aria-label="แนบไฟล์ประกอบคำถาม"
          />
        </div>

        {attachedFiles.length === 0 && !uploadingFile && (
          <div
            className="border-2 border-dashed rounded-lg p-3 text-center text-xs transition-all"
            style={{ borderColor: isDragOver ? "var(--accent)" : "var(--border)", color: "var(--text-muted)", background: isDragOver ? "var(--accent-5)" : "transparent" }}
          >
            {isDragOver ? "ปล่อยไฟล์เลย!" : "ลากไฟล์มาวาง หรือกด + แนบ"}
            <div className="mt-1 opacity-60">pdf · docx · txt · md · json</div>
          </div>
        )}

        {uploadError && <div className="mt-1 text-xs text-red-400">{uploadError}</div>}

        {attachedFiles.length > 0 && (
          <div className="space-y-2 mt-1">
            {attachedFiles.map((f, i) => (
              <div key={i} className="p-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--accent-5)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">
                    {f.filename.endsWith(".pdf") ? <FileText size={14} /> :
                     <File size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{f.filename}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {formatBytes(f.size)} · {f.chars.toLocaleString()} chars
                    </div>
                  </div>
                  <button
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-xs opacity-40 hover:opacity-100 flex-shrink-0"
                    aria-label="ลบไฟล์"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>
                {/* Sheet selector for Excel */}
                {f.sheets && f.sheets.length > 1 && (
                  <div className="mt-2">
                    <div className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>เลือก Sheet:</div>
                    <div className="flex flex-wrap gap-1">
                      {f.sheets.map((sheet) => {
                        const selected = f.selectedSheets?.includes(sheet) ?? true;
                        return (
                          <button
                            key={sheet}
                            onClick={() => toggleSheet(i, sheet)}
                            className="text-[11px] px-1.5 py-0.5 rounded border transition-all"
                            style={{
                              borderColor: selected ? "var(--accent)" : "var(--border)",
                              background: selected ? "var(--accent-15)" : "transparent",
                              color: selected ? "var(--accent)" : "var(--text-muted)",
                            }}
                          >
                            {sheet}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => setAttachedFiles([])}
              className="w-full text-[11px] py-1 rounded border"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              ลบทั้งหมด
            </button>
          </div>
        )}
      </div>
      )}

      {/* History panel */}
      <div className="border rounded-xl flex-1 flex flex-col overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => { setHistoryTab("current"); setViewingSession(null); }}
            className="flex-1 py-2 text-xs transition-all"
            style={{ color: historyTab === "current" ? "var(--accent)" : "var(--text-muted)", borderBottom: historyTab === "current" ? "2px solid var(--accent)" : "2px solid transparent" }}
          >
            <MessageSquare size={12} className="inline" /> คำถาม ({rounds.length})
          </button>
          <button
            onClick={() => setHistoryTab("history")}
            className="flex-1 py-2 text-xs transition-all"
            style={{ color: historyTab === "history" ? "var(--accent)" : "var(--text-muted)", borderBottom: historyTab === "history" ? "2px solid var(--accent)" : "2px solid transparent" }}
          >
            <History size={12} className="inline" /> ประวัติ ({totalSessionCount})
          </button>
        </div>

        {historyTab === "current" ? (
          <div className="p-3 flex-1 overflow-y-auto">
            {rounds.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>ยังยังไม่มีคำถาม</div>
            ) : (
              <div className="space-y-2">
                {rounds.map((r, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <div className="font-bold mb-0.5" style={{ color: "var(--text)" }}>คำถามที่ {i + 1}</div>
                    <div className="line-clamp-2" style={{ color: "var(--text-muted)" }}>{r.question}</div>
                  </div>
                ))}
                <button onClick={confirmClearSession} className="w-full text-xs px-2 py-1.5 rounded-lg border mt-1 flex items-center justify-center gap-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <Trash2 size={12} /> เริ่มดูดวงใหม่
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 flex-1 overflow-y-auto">
            {serverSessions.length === 0 ? (
              <div className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>ไม่มีประวัติ</div>
            ) : (
              <div className="space-y-2">
                {totalSessionCount > 20 && (
                  <div className="text-[11px] text-center py-1 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--accent-8)" }}>แสดง 20 ล่าสุด จากทั้งหมด {totalSessionCount} รายการ</div>
                )}
                {serverSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { loadServerSession(s); onNavigate?.(); }}
                    className="w-full text-left p-2 rounded-lg border transition-all"
                    style={{
                      borderColor: viewingSession?.id === s.id ? "var(--accent)" : "var(--border)",
                      background: viewingSession?.id === s.id ? "var(--accent-8)" : "transparent",
                    }}
                  >
                    <div className="text-xs line-clamp-2" style={{ color: "var(--text)" }}>{s.question}</div>
                    <div className="text-[11px] mt-1 flex items-center gap-1 flex-wrap" style={{ color: "var(--text-muted)" }}>
                      {s.status === "completed" ? <Check size={10} className="inline text-green-500" /> : s.status === "error" ? <X size={10} className="inline text-red-500" /> : (
                        Date.now() - new Date(s.startedAt).getTime() > 30 * 60 * 1000
                          ? <span className="text-amber-500 font-bold">⚠️ ค้าง</span>
                          : <span className="text-blue-500 font-bold">🔵 กำลังดูดวง</span>
                      )}{" "}
                      {new Date(s.startedAt).toLocaleDateString("th")}
                      {s.totalTokens > 0 && ` · ${s.totalTokens.toLocaleString()} tokens`}
                      {s.ownerUsername && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: "var(--accent-8)", color: "var(--accent)" }}>
                          @{s.ownerUsername}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "transparent" }}>
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col p-3 sm:p-6 gap-3 sm:gap-4 min-h-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}><Building2 size={22} style={{ color: "var(--accent)" }} /><span>ห้องอ่านดวง OMNIA.AI</span></h1>
            <p className="text-xs sm:text-sm mt-1 hidden sm:block" style={{ color: "var(--text-muted)" }}>
              พิมพ์คำถามได้ทันที ระบบเลือกสภาโหราจารย์ให้พร้อมแล้ว และยังปรับหมอดูได้จากแผงตั้งค่า
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden px-3 py-2 rounded-lg text-xs border flex items-center gap-1.5"
              style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-8)" }}
            >
              <Settings size={14} /> สภา ({selectedIds.size})
            </button>
            {(rounds.length > 0 || viewingSession) && (
              <button onClick={exportMinutes} className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} title="บันทึกคำทำนายเป็น Markdown">
                <Download size={14} /> บันทึกคำทำนาย
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile quick-info strip ── */}
        <div className="flex md:hidden items-center gap-2 px-3 py-2 rounded-xl border text-[11px] flex-wrap" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}>
          <button onClick={() => setMobileSidebarOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ borderColor: selectedIds.size > 0 ? "var(--accent)" : "var(--border)", color: selectedIds.size > 0 ? "var(--accent)" : "var(--text-muted)" }}>
            <Users size={12} /> {selectedIds.size} หมอดู
          </button>
          {useFileContext && attachedFiles.length > 0 && <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "var(--accent-10)", color: "var(--accent)" }}><Paperclip size={10} /> {attachedFiles.length} ไฟล์</span>}
          {(!useFileContext || attachedFiles.length === 0) && selectedIds.size > 0 && <span className="opacity-60">พร้อมถามคำถามแรก</span>}
          {selectedIds.size === 0 && <span className="opacity-60">กำลังเตรียมสภาโหราจารย์</span>}
        </div>

        <div className="rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--card), var(--surface))" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold mb-1" style={{ color: "var(--accent)" }}>ORACLE ROOM</div>
              <div className="text-sm font-bold" style={{ color: "var(--text)" }}>ห้องหมอดูพร้อมเปิดคำทำนาย</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                แต่ละศาสตร์จะดูอดีต ปัจจุบัน อนาคต แล้ว OMNIA.AI จะสรุปรวมให้อ่านง่าย
              </div>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {birthProfile && (
                <div
                  className="h-9 min-w-[150px] rounded-lg border px-2 text-xs flex items-center gap-1.5"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
                  title="เจ้าชะตาปัจจุบัน"
                >
                  <UserCircle size={13} style={{ color: "var(--accent)" }} />
                  <span className="truncate">{birthProfile.name || "เจ้าชะตา"}</span>
                </div>
              )}
              {agents.filter((agent) => selectedIds.has(agent.id)).slice(0, 6).map((agent) => (
                <div
                  key={agent.id}
                  className="w-9 h-9 rounded-full border flex items-center justify-center text-lg flex-shrink-0"
                  title={agent.name}
                  style={{ borderColor: "var(--accent-30)", background: "var(--accent-8)" }}
                >
                  {agent.emoji}
                </div>
              ))}
              {selectedIds.size > 6 && (
                <div className="w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  +{selectedIds.size - 6}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

          {/* ── Mobile sidebar overlay ── */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-[55] md:hidden">
              <button
                className="absolute inset-0 bg-black/45"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close panel"
              />
              <aside className="absolute top-0 left-0 bottom-0 w-[300px] max-w-[88vw] border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div className="h-14 px-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                  <div className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text)" }}><Settings size={14} /> ตั้งค่าสภา</div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="w-8 h-8 rounded-lg border text-base" style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  >×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                  {renderSidebarContent(() => setMobileSidebarOpen(false))}
                </div>
              </aside>
            </div>
          )}

          {/* ── Left sidebar (desktop) ── */}
          <div className="hidden md:flex flex-col gap-3 w-64 flex-shrink-0">
            {renderSidebarContent()}
          </div>

          {/* ── Main panel ── */}
          <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-w-0">

            {/* Viewing server session banner */}
            {viewingSession && (
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs" style={{ borderColor: "var(--accent-35)", background: "var(--accent-7)", color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1" style={{ color: "var(--accent)" }}><History size={12} /> ดูประวัติ</span>
                <span className="flex-1 truncate">{viewingSession.question}</span>
                <button
                  onClick={() => { setViewingSession(null); setHistoryTab("current"); }}
                  className="ml-2 px-2 py-0.5 rounded border opacity-60 hover:opacity-100 flex items-center gap-1"
                  style={{ borderColor: "var(--border)" }}
                >
                  <X size={12} /> ปิด
                </button>
              </div>
            )}

            {/* Messages area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 min-h-[200px] sm:min-h-[300px] relative"
            >
              {/* Persistent meeting state badge — always visible when session active or completed */}
              {!running && (rounds.length > 0 || meetingSessionId) && (
                <div className="sticky top-0 z-10 mx-1">
                  <div className="rounded-lg px-3 py-2 border flex items-center gap-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    {meetingSessionId && !hasFinalReading() ? (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>ถามต่อได้เลย หรือกด <strong style={{ color: "var(--accent)" }}>สรุปรวม</strong> เมื่ออยากปิดคำทำนายนี้</span>
                      </>
                    ) : hasFinalReading() ? (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--green)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--green)" }}>✅ ดูดวงเสร็จสิ้น — มีสรุปคำทำนายรวมแล้ว</span>
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>มีข้อมูลการดูดวง {rounds.filter(r => !r.isSynthesis).length} คำถาม</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Sticky status bar — minimal progress indicator */}
              {running && status && (
                <div className="sticky top-0 z-10 mx-1">
                  <div className="rounded-lg px-3 py-2 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3">
                      {/* Live dot + status */}
                      <span className="inline-block w-2 h-2 rounded-full bg-[var(--green)] animate-pulse flex-shrink-0" />
                      <span className="text-xs flex-1 min-w-0 truncate" style={{ color: "var(--text-muted)" }}>{status}</span>

                      {/* Phase pills — meeting mode only */}
                      {effectiveMode !== "qa" && currentPhase > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {[
                            { phase: 1 as const, label: "เปิดคำทำนาย", icon: "🔮" },
                            { phase: 2 as const, label: "อ่านหลายศาสตร์", icon: "✦" },
                            { phase: 3 as const, label: "สรุปรวม", icon: "🏛️" },
                          ].map((step) => {
                            const isDone = currentPhase > step.phase;
                            const isActive = currentPhase === step.phase;
                            return (
                              <span
                                key={step.phase}
                                className="text-[11px] px-2 py-0.5 rounded-full transition-all"
                                style={{
                                  background: isDone ? "var(--green)" : isActive ? "var(--accent)" : "var(--bg)",
                                  color: isDone || isActive ? "var(--accent-contrast)" : "var(--text-muted)",
                                  fontWeight: isActive ? 700 : 400,
                                  opacity: !isDone && !isActive ? 0.5 : 1,
                                }}
                              >
                                {isDone ? "✓" : step.icon} <span className="hidden sm:inline">{step.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Progress bar — Phase 1 only */}
                    {currentPhase === 1 && selectedIds.size > 1 && (
                      <div className="mt-2">
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((phase1DoneCount.size / selectedIds.size) * 100)}%`, background: "var(--accent)" }}
                          />
                        </div>
                        <div className="text-[10px] mt-0.5 text-right" style={{ color: "var(--text-muted)" }}>
                          {phase1DoneCount.size}/{selectedIds.size}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Synthesis Loading Banner — Phase 3 waiting for chairman summary */}
              {isSynthesizing && !currentFinalAnswer && (
                <div className="mx-1 rounded-xl border-2 p-4 flex items-center gap-3" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                  <div>
                    <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>✨ OMNIA.AI กำลังสรุปรวม...</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>กรุณารอสักครู่ ประมาณ 15–30 วินาที</div>
                  </div>
                </div>
              )}

              {/* Clarification Questions UI */}
              {pendingClarification && clarificationQuestions.length > 0 && (
                <div className="mx-1 space-y-3">
                  <div className="border-2 rounded-xl p-4 sm:p-5" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={18} style={{ color: "var(--accent)" }} />
                      <div>
                        <div className="font-bold text-sm" style={{ color: "var(--accent)" }}>
                          {clarificationMode === "birth" ? "ข้อมูลเจ้าชะตา" : "ขอถามเพิ่มนิดเดียว"}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {clarificationMode === "birth"
                            ? "ตรวจข้อมูลก่อนเปิดคำทำนาย แก้เฉพาะช่องที่ไม่ตรงได้เลย"
                            : "หมอดูต้องการรายละเอียดเพิ่มเพื่อทักให้ตรงกว่าเดิม"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {clarificationQuestions.map((q, qi) => (
                        <div key={q.id} className="border rounded-lg p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                          <div className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                            {qi + 1}. {q.question}
                          </div>
                          {q.id === "astro_focus" && (
                            <div className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>เลือกได้สูงสุด 3 เรื่อง</div>
                          )}
                          {q.type === "choice" && q.options ? (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1.5">
                                {q.options.map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => setClarificationAnswers((prev) => {
                                      if (q.id === "astro_focus") {
                                        const selected = (prev[q.id] ?? "").split(", ").filter(Boolean);
                                        const next = selected.includes(opt)
                                          ? selected.filter((item) => item !== opt)
                                          : selected.length >= 3 ? selected : [...selected, opt];
                                        return { ...prev, [q.id]: next.join(", ") };
                                      }
                                      return { ...prev, [q.id]: opt };
                                    })}
                                    className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                                    style={{
                                      borderColor: (clarificationAnswers[q.id] ?? "").split(", ").includes(opt) ? "var(--accent)" : "var(--border)",
                                      background: (clarificationAnswers[q.id] ?? "").split(", ").includes(opt) ? "var(--accent-15)" : "transparent",
                                      color: (clarificationAnswers[q.id] ?? "").split(", ").includes(opt) ? "var(--accent)" : "var(--text)",
                                      fontWeight: (clarificationAnswers[q.id] ?? "").split(", ").includes(opt) ? 600 : 400,
                                    }}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder={q.id === "astro_focus" ? "หรือพิมพ์เรื่องอื่นเพิ่ม..." : "หรือพิมพ์คำตอบเอง..."}
                                value={q.id !== "astro_focus" && q.options.includes(clarificationAnswers[q.id] ?? "") ? "" : (clarificationAnswers[q.id] ?? "")}
                                onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                className="w-full text-xs px-3 py-1.5 rounded-lg border outline-none mt-1"
                                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder={clarificationMode === "birth" ? "กรอกข้อมูลนี้..." : "ตอบสั้น ๆ เหมือนคุยกันได้เลย..."}
                              value={clarificationAnswers[q.id] ?? ""}
                              onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleClarificationSubmit}
                        className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                      >
                        {clarificationMode === "birth" ? "ใช้ข้อมูลนี้ดูดวง" : "ตอบแล้วให้หมอดูอ่านต่อ"}
                      </button>
                      <button
                        onClick={handleSkipClarification}
                        className="px-4 py-2 rounded-lg text-xs border transition-all hover:opacity-80"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >
                        ข้ามไป →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state — guide + examples */}
              {!viewingSession && displayRounds.length === 0 && currentMessages.length === 0 && !running && !pendingClarification && (
                <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-4">
                  {/* Step guide */}
                  <div className="flex items-center gap-2 sm:gap-4 mb-6">
                    {[
                      { step: "1", icon: "users", label: "สภาพร้อม" },
                      { step: "2", icon: "edit", label: "พิมพ์คำถาม" },
                      { step: "3", icon: "check", label: "อ่านคำตอบ" },
                    ].map((s, i) => (
                      <div key={s.step} className="flex items-center gap-2 sm:gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: i === 0 && selectedIds.size > 0 ? "var(--accent)" : i === 0 ? "var(--danger-15)" : "var(--accent-10)", color: i === 0 && selectedIds.size > 0 ? "var(--accent-contrast)" : "var(--text)" }}>
                            {i === 0 && selectedIds.size > 0 ? <Check size={18} /> : s.icon === "users" ? <Users size={18} /> : s.icon === "edit" ? <Edit3 size={18} /> : <Check size={18} />}
                          </div>
                          <span className="text-[11px] sm:text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                        </div>
                        {i < 2 && <div className="w-6 sm:w-10 h-px mb-4" style={{ background: "var(--border)" }} />}
                      </div>
                    ))}
                  </div>

                  {selectedIds.size === 0 && agents.length === 0 && (
                    <div className="text-xs px-3 py-1.5 rounded-full border mb-4 flex items-center gap-1.5" style={{ borderColor: "var(--danger-40)", color: "var(--danger)", background: "var(--danger-8)" }}>
                      <AlertTriangle size={12} /> ยังไม่มีโหราจารย์พร้อมใช้งาน
                    </div>
                  )}

                  <div className="text-sm mb-1 font-bold flex items-center gap-1.5 justify-center" style={{ color: "var(--text)" }}><Building2 size={16} style={{ color: "var(--accent)" }} /> ถามเรื่องที่อยากรู้ได้เลย</div>
                  <div className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                    สภาโหราจารย์ถูกเลือกไว้ให้อัตโนมัติ ปรับหมอดูหรือแนบไฟล์เพิ่มเติมได้จากปุ่มตั้งค่า
                  </div>

                  {selectedIds.size > 0 && (
                    <div className="w-full max-w-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}><Lightbulb size={12} /> ลองถามเรื่องเหล่านี้</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          "ดูดวงภาพรวม 12 เดือนข้างหน้า",
                          "ปีนี้การงานและการเงินควรวางแผนอย่างไร",
                          "ช่วงไหนเหมาะเริ่มงานใหม่หรือขยายธุรกิจ",
                          "วิเคราะห์ความรักและความสัมพันธ์ในปีนี้",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => handleRun(q)}
                            className="text-xs px-3 py-2.5 rounded-lg border transition-all hover:opacity-80 text-left"
                            style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Viewing server session */}
              {viewingSession && (
                <div className="space-y-3">
                  {groupSessionHistory(viewingSession).map((group, groupIndex) => (
                    <div key={`${viewingSession.id}-${groupIndex}`} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                        <span className="text-[11px] font-bold px-2 py-1 rounded-full border" style={{ color: "var(--text-muted)", borderColor: "var(--border)", background: "var(--surface)" }}>
                          คำถามที่ {groupIndex + 1}
                        </span>
                        <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-xl px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tr-sm text-sm" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                          {group.question}
                        </div>
                      </div>
                      {group.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`border rounded-xl p-3 sm:p-4 ${ROLE_COLOR[msg.role] ?? ""}`}
                          style={msg.role === "finding" ? { background: "var(--card)", borderColor: "var(--border)" } : undefined}
                        >
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-lg">{msg.agentEmoji}</span>
                            <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                            {msg.role === "finding" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--accent-30)" }}>คำทำนายจากหมอดู</span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                              {ROLE_LABEL[msg.role] ?? msg.role}
                            </span>
                          </div>
                          <MessageContent content={msg.content} />
                        </div>
                      ))}
                    </div>
                  ))}
                  {/* Stuck running session — show force-close / resume buttons */}
                  {viewingSession.status === "running" && !viewingSession.finalAnswer && (
                    <div className="border-2 border-dashed rounded-xl p-4 text-center space-y-3" style={{ borderColor: "var(--warning, #f59e0b)", background: "var(--surface)" }}>
                      <div className="flex items-center justify-center gap-2 text-sm font-bold" style={{ color: "var(--warning, #f59e0b)" }}>
                        <AlertTriangle size={16} /> ดูดวงค้าง — ไม่ได้ปิดดูดวง
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        เซสชันนี้ยังค้างสถานะ &quot;กำลังดูดวง&quot; — เลือกดำเนินการ
                      </p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={async () => {
                            await fetch(`/api/team-research/${viewingSession.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "force-complete", reason: "🔒 ปิดดูดวงโดยผู้ใช้" }),
                            });
                            setViewingSession({ ...viewingSession, status: "completed", finalAnswer: "🔒 ปิดดูดวงโดยผู้ใช้" });
                            fetchServerHistory();
                          }}
                          className="text-xs px-4 py-2 rounded-lg border font-bold"
                          style={{ borderColor: "var(--error, #ef4444)", color: "var(--error, #ef4444)" }}
                        >
                          <X size={12} className="inline mr-1" /> ปิดดูดวง
                        </button>
                        <button
                          onClick={() => {
                            if (viewingSession.agentIds && viewingSession.agentIds.length > 0) {
                              setSelectedIds(new Set(viewingSession.agentIds));
                            }
                            const priorRound: ConversationRound = {
                              question: viewingSession.question,
                              messages: viewingSession.messages.filter((m: any) => m.role !== "user_question").map((m: any) => ({
                                id: m.id, agentId: m.agentId, agentName: m.agentName, agentEmoji: m.agentEmoji,
                                role: m.role, content: m.content, tokensUsed: m.tokensUsed,
                                timestamp: m.timestamp || new Date().toISOString(),
                              })),
                              finalAnswer: "",
                              agentTokens: {},
                              suggestions: [],
                              chairmanId: undefined,
                            };
                            // Force-complete the old session first
                            fetch(`/api/team-research/${viewingSession.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "force-complete", reason: "🔄 ย้ายไปเซสชันใหม่" }),
                            }).catch(() => {});
                            clearSession();
                            setRounds([priorRound]);
                            setMeetingSessionId(null);
                            meetingSessionIdRef.current = null;
                            setQuestion("");
                            setViewingSession(null);
                            setHistoryTab("current");
                            fetchServerHistory();
                          }}
                          className="text-xs px-4 py-2 rounded-lg border font-bold"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                        >
                          <RefreshCw size={12} className="inline mr-1" /> ถามต่อในเซสชันใหม่
                        </button>
                      </div>
                    </div>
                  )}
                  {viewingSession.finalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
                      <div className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>{(viewingSession.agentIds?.length ?? 0) <= 1 ? <MessageSquare size={16} /> : <Building2 size={16} />} {(viewingSession.agentIds?.length ?? 0) <= 1 ? "คำตอบจากหมอดู" : "สรุปจาก OMNIA.AI"}</div>
                      <MessageContent content={viewingSession.finalAnswer} />
                      <ReadingFeedback scope={`history:${viewingSession.id}`} />
                      <button
                        onClick={() => {
                          // Restore agents from original session
                          if (viewingSession.agentIds && viewingSession.agentIds.length > 0) {
                            setSelectedIds(new Set(viewingSession.agentIds));
                          }
                          // Build prior context from the original session's messages into a round
                          const priorRound: ConversationRound = {
                            question: viewingSession.question,
                            messages: viewingSession.messages.filter((m: any) => m.role !== "user_question").map((m: any) => ({
                              id: m.id,
                              agentId: m.agentId,
                              agentName: m.agentName,
                              agentEmoji: m.agentEmoji,
                              role: m.role,
                              content: m.content,
                              tokensUsed: m.tokensUsed,
                              timestamp: m.timestamp || new Date().toISOString(),
                            })),
                            finalAnswer: viewingSession.finalAnswer || "",
                            agentTokens: {},
                            suggestions: [],
                            chairmanId: undefined,
                          };
                          // Set up as a new multi-turn session with prior context
                          clearSession();
                          setRounds([priorRound]);
                          setMeetingSessionId(null);
                          meetingSessionIdRef.current = null;
                          setQuestion("");
                          setViewingSession(null);
                          setHistoryTab("current");
                          // Restore clarification answers so astrology sessions don't re-ask birth info
                          if (viewingSession.messages) {
                            const clarAnswers = viewingSession.messages
                              .filter((m: any) => m.role === "clarification")
                              .map((m: any) => ({ question: m.agentName || "", answer: m.content || "" }))
                              .filter((qa: any) => qa.question && qa.answer);
                            if (clarAnswers.length > 0) lastClarificationAnswersRef.current = clarAnswers;
                          }
                        }}
                        className="mt-3 text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1"
                        style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                      >
                        <RefreshCw size={12} /> นำคำถามนี้กลับมาดูดวงอีกครั้ง
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Current session rounds */}
              {!viewingSession && displayRounds.map((round, roundIndex) => (
                <div key={roundIndex} className="space-y-3">
                  {(round.isSynthesis || displayRounds.filter(r => !r.isSynthesis).length > 1) && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t" style={{ borderColor: round.isSynthesis ? "var(--accent)" : "var(--border)" }} />
                    <div className="text-xs px-3 py-1 rounded-full border" style={{
                      borderColor: "var(--accent)",
                      color: round.isSynthesis ? "var(--accent-contrast)" : "var(--accent)",
                      background: round.isSynthesis ? "var(--accent)" : "var(--accent-8)",
                      fontWeight: round.isSynthesis ? 700 : 400,
                    }}>
                      {round.isSynthesis ? "สรุปคำทำนายรวม" : round.isQA ? `คำถามที่ ${roundIndex + 1}` : `คำถามที่ ${roundIndex + 1}`}
                    </div>
                    <div className="flex-1 border-t" style={{ borderColor: round.isSynthesis ? "var(--accent)" : "var(--border)" }} />
                  </div>
                  )}

                  {!round.isSynthesis && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-xl px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-tr-sm text-sm" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                        {round.question}
                      </div>
                    </div>
                  )}

                  {(() => {
                    let lastPhaseRole = "";
                    return round.messages.filter((msg) => msg.role !== "thinking" && !(round.finalAnswer && msg.role === "synthesis")).map((msg) => {
                      const elements: React.ReactNode[] = [];
                      if (msg.role !== lastPhaseRole && lastPhaseRole !== "") {
                        const phaseLabels: Record<string, { icon: string; label: string; color: string }> = {
                          chat: { icon: "✦", label: "มุมมองเพิ่มเติม", color: "var(--orange)" },
                          synthesis: { icon: "✨", label: "OMNIA.AI สรุปรวม", color: "var(--accent)" },
                        };
                        const separator = phaseLabels[msg.role];
                        if (separator) {
                          elements.push(
                            <div key={`sep-${msg.id}`} className="flex items-center gap-3 py-2">
                              <div className="flex-1 h-px" style={{ background: separator.color }} />
                              <div className="text-xs px-3 py-1.5 rounded-full border font-bold" style={{ borderColor: separator.color, color: separator.color, background: "var(--surface)" }}>
                                {separator.icon} {separator.label}
                              </div>
                              <div className="flex-1 h-px" style={{ background: separator.color }} />
                            </div>
                          );
                        }
                      }
                      lastPhaseRole = msg.role;

                      elements.push(
                          <div
                            key={msg.id}
                            className={`border rounded-xl p-3 sm:p-4 ${ROLE_COLOR[msg.role] ?? ""}`}
                            style={msg.role === "finding" ? { background: "var(--card)", borderColor: "var(--border)" } : undefined}
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-lg">{msg.agentEmoji}</span>
                              <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                              {msg.role === "finding" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--accent-30)" }}>คำทำนายจากหมอดู</span>
                              )}
                              {false && round.chairmanId === msg.agentId && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>OMNIA.AI</span>
                              )}
                              <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                                {ROLE_LABEL[msg.role] ?? msg.role}
                              </span>
                            </div>
                            <MessageContent content={msg.content} />
                          </div>
                        );
                      return elements;
                    });
                  })()}

                  {round.finalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
                      <div className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>{round.isQA ? <MessageSquare size={16} /> : <Building2 size={16} />} {round.isQA ? "คำตอบจากหมอดู" : "สรุปจาก OMNIA.AI"}</div>
                      <MessageContent content={round.finalAnswer} />
                      {round.chartData && <SimpleBarChart data={round.chartData} />}

                      {/* Web Sources */}
                      {round.webSources && round.webSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--accent-20)" }}>
                          <div className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}><Paperclip size={11} /> แหล่งอ้างอิง</div>
                          <div className="flex flex-wrap gap-1.5">
                            {round.webSources.map((src, si) => (
                              <a
                                key={si}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)" }}
                                title={src.snippet}
                              >
                                <span className="font-medium truncate max-w-[180px]">{src.title}</span>
                                <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--accent-12)", color: "var(--accent)" }}>{src.domain}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t text-[11px] leading-relaxed flex items-start gap-1" style={{ borderColor: "var(--accent-20)", color: "var(--text-muted)" }}>
                        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" /> คำทำนายจาก AI เป็นแนวทางประกอบการตัดสินใจ ควรใช้วิจารณญาณและดูบริบทชีวิตจริงร่วมด้วย
                      </div>
                      <ReadingFeedback scope={`round:${roundIndex}:${round.question}`} />
                    </div>
                  )}

                  {roundIndex === displayRounds.length - 1 && round.suggestions.length > 0 && !running && currentMessages.length === 0 && (
                    <div className="space-y-2">
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>คำถามต่อเนื่องที่แนะนำ:</div>
                      <div className="flex flex-col gap-1.5">
                        {round.suggestions.map((s, i) => (
                          <button key={i} onClick={() => handleRun(s)} disabled={running} className="text-left px-3 py-2 rounded-lg border text-xs transition-all hover:opacity-80 disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}>
                            → {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Current round in progress */}
              {!viewingSession && (currentMessages.length > 0 || running) && (
                <div className="space-y-3">
                  {(isCurrentClosing || displayRounds.filter(r => !r.isSynthesis).length > 0) && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t" style={{ borderColor: isCurrentClosing ? "var(--accent)" : "var(--border)" }} />
                      <div className="text-xs px-3 py-1 rounded-full border" style={{
                        borderColor: "var(--accent)",
                        color: isCurrentClosing ? "var(--accent-contrast)" : "var(--accent)",
                        background: isCurrentClosing ? "var(--accent)" : "var(--accent-8)",
                        fontWeight: isCurrentClosing ? 700 : 400,
                      }}>
                        {isCurrentClosing ? "สรุปคำทำนายรวม" : `คำถามที่ ${displayRounds.filter(r => !r.isSynthesis).length + 1}`}
                      </div>
                      <div className="flex-1 border-t" style={{ borderColor: isCurrentClosing ? "var(--accent)" : "var(--border)" }} />
                    </div>
                  )}
                  {(() => {
                    let lastPhaseRole = "";
                    let thinkingIdx = 0;
                    return currentMessages.filter((msg) => !(currentFinalAnswer && msg.role === "synthesis")).map((msg) => {
                      const elements: React.ReactNode[] = [];
                      // Phase separator: detect transition between finding→chat→synthesis
                      if (msg.role !== "thinking" && msg.role !== lastPhaseRole && lastPhaseRole !== "") {
                        // Show Phase 1 completion when entering Phase 2
                        if (msg.role === "chat" && lastPhaseRole === "finding") {
                          const findingCount = currentMessages.filter(m => m.role === "finding").length;
                          elements.push(
                            <div key={`phase1-done-${msg.id}`} className="flex items-center justify-center py-1.5 animate-phase-reveal">
                              <span className="text-[11px] px-3 py-1 rounded-full font-medium" style={{ color: "var(--accent)", background: "var(--accent-8)" }}>
                                ✓ หมอดู {findingCount} ท่านอ่านครบแล้ว
                              </span>
                            </div>
                          );
                        }
                        const phaseLabels: Record<string, { icon: string; label: string; color: string }> = {
                          chat: { icon: "✦", label: "มุมมองเพิ่มเติม", color: "var(--orange)" },
                          synthesis: { icon: "✨", label: "OMNIA.AI สรุปรวม", color: "var(--accent)" },
                        };
                        const separator = phaseLabels[msg.role];
                        if (separator) {
                          elements.push(
                            <div key={`sep-${msg.id}`} className="flex items-center gap-3 py-2 animate-phase-reveal">
                              <div className="flex-1 h-px" style={{ background: separator.color }} />
                              <div className="text-xs px-3 py-1.5 rounded-full border font-bold" style={{ borderColor: separator.color, color: separator.color, background: "var(--surface)" }}>
                                {separator.icon} {separator.label}
                              </div>
                              <div className="flex-1 h-px" style={{ background: separator.color }} />
                            </div>
                          );
                        }
                      }
                      if (msg.role !== "thinking") lastPhaseRole = msg.role;

                      if (msg.role === "thinking") {
                        if (thinkingIdx === 0) {
                          const allThinking = currentMessages.filter(m => m.role === "thinking");
                          if (allThinking.length > 1) {
                            elements.push(
                              <div key="thinking-group" className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border animate-message-in" style={{ borderColor: "var(--accent-20)", background: "var(--accent-3)" }}>
                                {allThinking.map((t, i) => (
                                  <span key={t.id} className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--text)" }}>
                                    <span>{(t as any).agentEmoji}</span>
                                    <span className="font-medium">{(t as any).agentName}</span>
                                    {i < allThinking.length - 1 && <span style={{ color: "var(--text-muted)" }}>,</span>}
                                  </span>
                                ))}
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>กำลังวิเคราะห์</span>
                                <span className="thinking-dots text-base font-bold" style={{ color: "var(--accent)" }}><span>.</span><span>.</span><span>.</span></span>
                              </div>
                            );
                          } else {
                            elements.push(
                              <div key={msg.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border animate-message-in" style={{ borderColor: "var(--accent-20)", background: "var(--accent-3)" }}>
                                <span className="text-lg">{msg.agentEmoji}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>กำลังวิเคราะห์</span>
                                </div>
                                <span className="thinking-dots text-base font-bold" style={{ color: "var(--accent)" }}><span>.</span><span>.</span><span>.</span></span>
                              </div>
                            );
                          }
                        }
                        thinkingIdx++;
                      } else {
                        elements.push(
                          <div
                            key={msg.id}
                            className={`border rounded-xl p-3 sm:p-4 animate-message-in ${ROLE_COLOR[msg.role] ?? ""}`}
                            style={msg.role === "finding" ? { background: "var(--card)", borderColor: "var(--border)" } : undefined}
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-lg">{msg.agentEmoji}</span>
                              <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{msg.agentName}</span>
                              {msg.role === "finding" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--accent-30)" }}>คำทำนายจากหมอดู</span>
                              )}
                              {false && chairmanId === msg.agentId && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>OMNIA.AI</span>
                              )}
                              <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                                {ROLE_LABEL[msg.role] ?? msg.role}
                              </span>
                            </div>
                            <MessageContent content={msg.content} />
                          </div>
                        );
                      }
                      return elements;
                    });
                  })()}
                  {currentFinalAnswer && (
                    <div className="border-2 rounded-xl p-3 sm:p-5" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
                      <div className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>{isCurrentQA ? <MessageSquare size={16} /> : <Building2 size={16} />} {isCurrentQA ? "คำตอบจากหมอดู" : "สรุปจาก OMNIA.AI"}</div>
                      <MessageContent content={currentFinalAnswer} />
                      {currentChartData && <SimpleBarChart data={currentChartData} />}

                      {/* Web Sources for current round */}
                      {currentWebSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--accent-20)" }}>
                          <div className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}><Paperclip size={11} /> แหล่งอ้างอิง</div>
                          <div className="flex flex-wrap gap-1.5">
                            {currentWebSources.map((src, si) => (
                              <a
                                key={si}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                                style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--bg)" }}
                                title={src.snippet}
                              >
                                <span className="font-medium truncate max-w-[180px]">{src.title}</span>
                                <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--accent-12)", color: "var(--accent)" }}>{src.domain}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <ReadingFeedback scope={`current:${question || "reading"}`} />
                    </div>
                  )}
                </div>
              )}

              {/* Sticky jump-to-summary button */}
              {currentFinalAnswer && !autoScroll && (
                <div className="sticky bottom-3 flex justify-center z-10 pointer-events-none">
                  <button
                    onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="pointer-events-auto px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all hover:scale-105 animate-message-in"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                  >
                    ↓ ดูผลสรุป
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input box — ChatGPT-style sticky bottom */}
            {!viewingSession && (
              <div className="sticky bottom-0 flex-shrink-0 pt-2" style={{ background: "color-mix(in srgb, var(--bg) 78%, transparent)", backdropFilter: "blur(10px)" }}>
                <div
                  className="border rounded-xl overflow-hidden transition-colors"
                  style={{ borderColor: running ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
                >
                  <textarea
                    ref={textareaRef}
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      // Auto-resize
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleRun(); } }}
                    disabled={running}
                    rows={1}
                    placeholder={meetingSessionId && !hasFinalReading() ? "ถามต่อได้เลย หรือกด 'สรุปรวม' เมื่อพร้อม..." : rounds.length > 0 ? "พิมพ์คำถามต่อไป..." : "พิมพ์เรื่องที่อยากดูดวง..."}
                    className="w-full bg-transparent text-sm resize-none outline-none px-4 pt-3 pb-1"
                    style={{ color: "var(--text)", minHeight: 36, maxHeight: 160 }}
                  />
                  <div className="flex items-center justify-between px-3 pb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => setShowAdvanced(v => !v)}
                        className="text-xs px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg)]"
                        style={{ color: showAdvanced ? "var(--accent)" : "var(--text-muted)" }}
                        title="ตั้งค่าขั้นสูง"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={() => setForceMode(prev => prev === "auto" ? (effectiveMode === "qa" ? "meeting" : "qa") : "auto")}
                        className="text-[11px] sm:text-xs px-1.5 py-0.5 rounded transition-all"
                        style={{ background: forceMode !== "auto" ? "var(--accent-18)" : "var(--accent-8)", color: "var(--accent)" }}
                        title={effectiveMode === "qa" ? "โหมดถามตอบ — คลิกเพื่อสลับ" : "โหมดดูดวง — คลิกเพื่อสลับ"}
                        disabled={running}
                      >
                        {effectiveMode === "qa" ? <MessageSquare size={12} /> : <Building2 size={12} />}
                      </button>
                      <div className="text-[11px] sm:text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {meetingSessionId && effectiveMode !== "qa" && <span className="inline-flex items-center gap-1 mr-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />ดูดวงอยู่ {elapsedTime > 0 && <span className="font-mono">{Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, "0")}</span>} · </span>}
                        {rounds.length > 0 && <span style={{ color: "var(--accent)" }}>{rounds.length} คำถาม · </span>}
                        หมอดู {selectedIds.size}/{agents.length} ท่าน
                        {attachedFiles.length > 0 && <span className="inline-flex items-center gap-0.5"> · <Paperclip size={10} /> {attachedFiles.length}</span>}
                        {(() => {
                          const totalTk = rounds.reduce((s, r) => s + Object.values(r.agentTokens).reduce((a, t) => a + t.totalTokens, 0), 0);
                          if (totalTk > 0) {
                            const costEst = totalTk * 0.000003; // rough average $/token
                            return <span className="inline-flex items-center gap-0.5"> · <Coins size={10} /> {totalTk > 1000 ? (totalTk / 1000).toFixed(1) + "K" : totalTk} tk {costEst > 0.001 && `(~$${costEst.toFixed(3)})`}</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rounds.length > 0 && !running && meetingSessionId && effectiveMode !== "qa" && !hasFinalReading() && (
                        <button
                          onClick={handleCloseMeeting}
                          className="h-8 px-3 rounded-lg flex items-center gap-1 justify-center text-xs font-bold transition-all hover:opacity-80"
                          style={{ color: "var(--accent-contrast)", background: "var(--accent)" }}
                          title="ให้ OMNIA.AI สรุปคำทำนายรวม"
                        >
                          <Building2 size={14} /> สรุปรวม
                        </button>
                      )}
                      {running ? (
                        <>
                          {effectiveMode !== "qa" && (
                            <button
                              onClick={handleSkipToSummary}
                              className="h-8 px-3 rounded-lg flex items-center gap-1 justify-center border text-xs font-bold transition-all hover:opacity-80"
                              style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-10)" }}
                              title="ข้ามไปสรุปรวมเลย"
                            >
                              <SkipForward size={14} /> สรุปเลย
                            </button>
                          )}
                          <button
                            onClick={handleStop}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                            title="หยุด"
                          >
                            <Square size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRun()}
                          disabled={!question.trim() || selectedIds.size === 0}
                          className="h-8 px-3 rounded-lg flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-30 transition-all"
                          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                          title="ส่งคำถาม (⌘+Enter)"
                        >
                          <Send size={14} /> ส่ง
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm clear session modal */}
      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="เริ่มดูดวงใหม่?" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            ล้างข้อมูลการดูดวง {rounds.filter(r => !r.isSynthesis).length} คำถาม จากหน้าจอ
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            ประวัติการดูดวงบน server ยังคงอยู่ — สามารถดูย้อนหลังได้ในแท็บประวัติ
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-[var(--surface)]"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmClear}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
            >
              <span className="flex items-center gap-1.5"><Trash2 size={14} /> เริ่มใหม่</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
