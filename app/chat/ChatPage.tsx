"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { showToast } from "../components/Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Square, Paperclip, Lightbulb, ExternalLink,
  AlertTriangle, X, FileSpreadsheet, File, Trash2, RefreshCw,
} from "lucide-react";
import Link from "next/link";

/** crypto.randomUUID() requires secure context (HTTPS). Fallback for HTTP. */
function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---- Types ----

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  role: string;
  model: string;
  provider: string;
  hasApiKey: boolean;
  isSystem?: boolean;
  systemAgentType?: string;
  knowledge?: { id: string; filename: string; tokens: number }[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  webSources?: { url: string; title: string; domain: string }[];
}

interface AttachedFile {
  filename: string;
  meta: string;
  context: string;
  chars: number;
  size: number;
}

// ---- Markdown renderer ----

function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose-container text-sm leading-relaxed" style={{ color: "var(--text)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1.5" style={{ color: "var(--text)" }}>{children}</h3>,
          h2: ({ children }) => <h4 className="text-sm font-bold mt-2.5 mb-1" style={{ color: "var(--text)" }}>{children}</h4>,
          h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--text)" }}>{children}</h5>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold" style={{ color: "var(--accent)" }}>{children}</strong>,
          ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-0.5">{children}</ol>,
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
            if (className?.includes("language-")) {
              return <pre className="text-xs p-3 rounded-lg my-2 overflow-x-auto" style={{ background: "var(--bg)", color: "var(--text)" }}><code>{children}</code></pre>;
            }
            return <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--accent-12)", color: "var(--accent)" }}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ---- Format file size ----
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---- Main component ----

export default function ChatPage({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [webSources, setWebSources] = useState<{ url: string; title: string; domain: string }[]>([]);
  const [status, setStatus] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef("");
  const streamFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load agent info
  useEffect(() => {
    fetch("/api/team-agents")
      .then((r) => r.json())
      .then((data) => {
        const a = (data.agents ?? []).find((ag: AgentInfo) => ag.id === agentId);
        if (a) setAgent(a);
      })
      .catch(() => {});
  }, [agentId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Build conversation history for context
  const buildHistory = useCallback(() => {
    return messages.slice(-10).map((m) => ({
      question: m.role === "user" ? m.content : "",
      answer: m.role === "assistant" ? m.content : "",
    })).reduce((acc, cur) => {
      if (cur.question) acc.push({ question: cur.question, finalAnswer: "" });
      else if (cur.answer && acc.length > 0) acc[acc.length - 1].finalAnswer = cur.answer;
      return acc;
    }, [] as { question: string; finalAnswer: string }[]);
  }, [messages]);

  // Send message
  const handleSend = async (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? input).trim();
    if (!q || running) return;
    if (!agent?.hasApiKey) {
      showToast("warning", "⚠️ กรุณาตั้งค่า API Key ก่อนใช้งาน → ไปที่หน้า ทีมที่ปรึกษา");
      return;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: q,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideQuestion) setInput("");

    setRunning(true);
    setStreamingContent("");
    streamRef.current = "";
    setSuggestions([]);
    setWebSources([]);
    setStatus(`${agent.emoji} กำลังวิเคราะห์...`);

    abortRef.current = new AbortController();

    try {
      const fileContexts = attachedFiles.map((f) => ({
        filename: f.filename,
        context: f.context,
        meta: f.meta,
      }));

      const res = await fetch("/api/team-research/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q,
          agentIds: [agentId],
          mode: "qa",
          conversationHistory: buildHistory(),
          fileContexts: fileContexts.length > 0 ? fileContexts : [],
          historyMode: "full",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      const collectedSources: { url: string; title: string; domain: string }[] = [];

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

            if (currentEvent === "status") {
              setStatus(payload.message);
            } else if (currentEvent === "final_answer_delta") {
              streamRef.current += payload.content;
              if (!streamFlushRef.current) {
                streamFlushRef.current = setTimeout(() => {
                  setStreamingContent(streamRef.current);
                  streamFlushRef.current = null;
                }, 60);
              }
            } else if (currentEvent === "final_answer") {
              if (streamFlushRef.current) { clearTimeout(streamFlushRef.current); streamFlushRef.current = null; }
              streamRef.current = payload.content;
              setStreamingContent(payload.content);
            } else if (currentEvent === "follow_up_suggestions") {
              setSuggestions(payload.suggestions?.slice(0, 3) ?? []);
            } else if (currentEvent === "web_sources") {
              const newSrc = payload.sources ?? [];
              collectedSources.push(...newSrc);
              setWebSources([...collectedSources]);
            } else if (currentEvent === "error") {
              setStatus(`⚠️ ${payload.message || "เกิดข้อผิดพลาด"}`);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setStatus(`❌ ${e.message}`);
      }
    } finally {
      setRunning(false);
      setStatus("");
      // Save assistant message
      const finalContent = streamRef.current;
      if (finalContent) {
        const assistantMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: finalContent,
          timestamp: new Date().toISOString(),
          webSources: webSources.length > 0 ? [...webSources] : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
      setStreamingContent("");
      streamRef.current = "";
      // Clear attached files after sending
      setAttachedFiles([]);
      // Focus input
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
    setStatus("");
  };

  const clearHistory = () => {
    setMessages([]);
    setSuggestions([]);
    showToast("success", "ล้างประวัติแล้ว");
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast("error", "ไฟล์ใหญ่เกิน 10 MB");
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/team-research/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setAttachedFiles((prev) => [...prev, {
        filename: data.filename,
        meta: data.meta,
        context: data.context,
        chars: data.chars,
        size: file.size,
      }]);
      showToast("success", `แนบ ${data.filename} แล้ว`);
    } catch (err) {
      showToast("error", `อัพโหลดไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // ---- Render ----

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <div className="text-sm">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-3.5rem)] md:h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between gap-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{agent.emoji}</span>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{agent.name}</div>
            <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{agent.role} · {agent.model}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agent.knowledge && agent.knowledge.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              📚 {agent.knowledge.length} ไฟล์ · {(agent.knowledge.reduce((s, f) => s + (f.tokens || 0), 0) / 1000).toFixed(1)}k tok
            </span>
          )}
          <button
            onClick={clearHistory}
            className="p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="ล้างประวัติ"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* No API key warning */}
      {!agent.hasApiKey && (
        <div className="flex-shrink-0 mx-4 mt-3 p-3 rounded-xl border flex items-center gap-2" style={{ borderColor: "rgb(234 179 8 / 0.3)", background: "rgb(234 179 8 / 0.08)" }}>
          <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0" />
          <div className="text-xs" style={{ color: "var(--text)" }}>
            ⚠️ Agent นี้ยังไม่มี API Key — กรุณา{" "}
            <Link href="/agents" className="underline font-bold" style={{ color: "var(--accent)" }}>ตั้งค่าที่หน้าทีมที่ปรึกษา</Link>
            {" "}ก่อนเริ่มใช้งาน
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="md:flex-1 overflow-visible md:overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-sm">
              <div className="text-5xl mb-4">{agent.emoji}</div>
              <div className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>{agent.name}</div>
              <div className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{agent.role}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                พิมพ์คำถามเพื่อเริ่มสนทนา
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "order-1" : "order-1"}`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{agent.emoji}</span>
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{agent.name}</span>
                </div>
              )}
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "rounded-tr-sm"
                    : "rounded-tl-sm border"
                }`}
                style={
                  msg.role === "user"
                    ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                    : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }
                }
              >
                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <MessageContent content={msg.content} />
                )}
              </div>

              {/* Web sources */}
              {msg.webSources && msg.webSources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.webSources.slice(0, 5).map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 hover:bg-[var(--surface)] transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      <ExternalLink size={9} />
                      {src.domain}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[75%]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{agent.emoji}</span>
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{agent.name}</span>
                <span className="text-[10px] animate-pulse" style={{ color: "var(--accent)" }}>กำลังพิมพ์...</span>
              </div>
              <div
                className="rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-sm"
                style={{ borderColor: "var(--accent)", background: "var(--surface)", color: "var(--text)" }}
              >
                <MessageContent content={streamingContent} />
              </div>
              {/* Live web sources */}
              {webSources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {webSources.slice(0, 5).map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      <ExternalLink size={9} />
                      {src.domain}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status indicator */}
        {running && !streamingContent && status && (
          <div className="flex justify-start">
            <div className="text-xs px-3 py-1.5 rounded-full border animate-pulse" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-8)" }}>
              {status}
            </div>
          </div>
        )}

        {/* Suggestion chips */}
        {!running && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all hover:scale-[1.02]"
                style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-8)" }}
              >
                <Lightbulb size={11} className="inline mr-1" />
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-2 flex flex-wrap gap-2">
          {attachedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              {f.filename.match(/\.xlsx?$/i) ? <FileSpreadsheet size={12} /> : <File size={12} />}
              <span className="truncate max-w-[120px]" style={{ color: "var(--text)" }}>{f.filename}</span>
              <span style={{ color: "var(--text-muted)" }}>{formatSize(f.size)}</span>
              <button type="button" title="ลบไฟล์" onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))} style={{ color: "var(--text-muted)" }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 p-3 sm:p-4 pt-2">
        <div
          className="border rounded-xl overflow-hidden transition-colors"
          style={{ borderColor: running ? "var(--accent)" : "var(--border)", background: "var(--surface)" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={running}
            rows={1}
            placeholder="พิมพ์คำถาม... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
            className="w-full bg-transparent text-sm resize-none outline-none px-4 pt-3 pb-1"
            style={{ color: "var(--text)", minHeight: 36, maxHeight: 160 }}
          />
          <div className="flex items-center justify-between px-3 pb-2 gap-2">
            <div className="flex items-center gap-2">
              {/* File attach */}
              <label className="cursor-pointer p-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors" style={{ color: "var(--text-muted)" }}>
                {uploadingFile ? <RefreshCw size={14} className="animate-spin" /> : <Paperclip size={14} />}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.json,.txt,.md,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploadingFile || running}
                />
              </label>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Enter ส่ง · Shift+Enter ขึ้นบรรทัด
              </span>
            </div>
            {running ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
              >
                <Square size={12} fill="currentColor" /> หยุด
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || !agent.hasApiKey}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
              >
                <Send size={12} /> ส่ง
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
