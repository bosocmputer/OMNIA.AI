"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, BookOpen } from "lucide-react";
import { GLOSSARY, type GlossaryEntry } from "@/lib/glossary";
import Card from "../components/Card";

const CATEGORY_LABEL: Record<GlossaryEntry["category"], string> = {
  ai: "AI / LLM",
  cost: "ค่าใช้จ่าย / Token",
  accounting: "บัญชี / ภาษี",
  ui: "การใช้งาน",
};

const CATEGORY_ORDER: GlossaryEntry["category"][] = ["ai", "cost", "accounting", "ui"];

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GlossaryEntry["category"] | "all">("all");

  const filtered = useMemo(() => {
    const entries = Object.values(GLOSSARY);
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (activeCategory !== "all" && e.category !== activeCategory) return false;
      if (!q) return true;
      return (
        e.term.toLowerCase().includes(q) ||
        e.short.toLowerCase().includes(q) ||
        (e.long?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const groups: Record<GlossaryEntry["category"], GlossaryEntry[]> = {
      ai: [], cost: [], accounting: [], ui: [],
    };
    for (const e of filtered) groups[e.category].push(e);
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <BookOpen size={24} style={{ color: "var(--accent)" }} />
          คำศัพท์ (Glossary)
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          คำอธิบายศัพท์ AI และมาตรฐานบัญชีที่ใช้ในระบบนี้
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute top-1/2 -translate-y-1/2 left-3"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาคำศัพท์..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          aria-label="ค้นหาคำศัพท์"
        />
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap flex-shrink-0 transition-colors"
          style={{
            background: activeCategory === "all" ? "var(--accent)" : "transparent",
            color: activeCategory === "all" ? "var(--bg)" : "var(--text-muted)",
            borderColor: activeCategory === "all" ? "var(--accent)" : "var(--border)",
          }}
        >
          ทั้งหมด
        </button>
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap flex-shrink-0 transition-colors"
            style={{
              background: activeCategory === c ? "var(--accent)" : "transparent",
              color: activeCategory === c ? "var(--bg)" : "var(--text-muted)",
              borderColor: activeCategory === c ? "var(--accent)" : "var(--border)",
            }}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              ไม่พบคำศัพท์ที่ค้นหา
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const entries = grouped[cat];
            if (entries.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <span className="w-1 h-4 rounded" style={{ background: "var(--accent)" }} />
                  {CATEGORY_LABEL[cat]}
                  <span className="text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>
                    ({entries.length})
                  </span>
                </h2>
                <div className="space-y-2">
                  {entries.map((e) => (
                    <Card key={e.term} padding="md">
                      <h3 className="text-base font-bold mb-1" style={{ color: "var(--text)" }}>
                        {e.term}
                      </h3>
                      <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                        {e.short}
                      </p>
                      {e.long && (
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                          {e.long}
                        </p>
                      )}
                      {e.example && (
                        <div className="mt-2 px-3 py-2 rounded-lg text-xs border-l-2" style={{ background: "var(--surface)", borderColor: "var(--accent)", color: "var(--text-muted)" }}>
                          <span className="font-semibold" style={{ color: "var(--accent)" }}>ตัวอย่าง: </span>
                          {e.example}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
