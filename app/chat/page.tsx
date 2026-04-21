"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  role: string;
  model: string;
  provider: string;
  hasApiKey: boolean;
  isSystem?: boolean;
  isActive?: boolean;
}

export default function ChatSelectorPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team-agents")
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const systemAgents = agents.filter((a) => a.isSystem);
  const userAgents = agents.filter((a) => !a.isSystem && a.isActive !== false);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
            💬 ถามด่วน
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            เลือกที่ปรึกษา AI ที่ต้องการสนทนา 1-ต่อ-1 — เร็วกว่าห้องประชุม เหมาะสำหรับคำถามด่วน
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--card)" }} />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-4xl mb-3">🤖</div>
            <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>ยังไม่มีที่ปรึกษา AI</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>สร้างที่ปรึกษาก่อนเพื่อเริ่มสนทนา</p>
            <Link
              href="/agents"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              + สร้างที่ปรึกษา AI
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* System Agents */}
            {systemAgents.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2 px-1" style={{ color: "var(--text-muted)" }}>
                  หน่วยงานราชการ
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {systemAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} onClick={() => router.push(`/chat/${agent.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* User Agents */}
            {userAgents.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2 px-1" style={{ color: "var(--text-muted)" }}>
                  ทีมที่ปรึกษา
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} onClick={() => router.push(`/chat/${agent.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hint */}
        {agents.length > 0 && (
          <p className="mt-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            ต้องการวิเคราะห์เชิงลึกหลายมุมมอง?{" "}
            <Link href="/research" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
              เปิดห้องประชุม AI
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent, onClick }: { agent: AgentInfo; onClick: () => void }) {
  const shortModel = agent.model
    ? agent.model.split("/").pop()?.replace(/-\d{8}$/, "") ?? agent.model
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all hover:border-[var(--accent)] hover:shadow-md group"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <span className="text-2xl flex-shrink-0">{agent.emoji || "🤖"}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{agent.name}</p>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{agent.role}</p>
        {shortModel && (
          <span
            className="inline-block text-[10px] px-1.5 py-0.5 rounded mt-1"
            style={{ background: "var(--accent-8)", color: "var(--accent)" }}
          >
            {shortModel}
          </span>
        )}
      </div>
      <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: "var(--accent)" }}>
        →
      </span>
    </button>
  );
}
