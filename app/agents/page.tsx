"use client";

import { useEffect, useState, useCallback } from "react";
import { showToast } from "../components/Toast";
import Tooltip from "../components/Tooltip";
import { GLOSSARY } from "@/lib/glossary";

type Provider = "anthropic" | "openai" | "gemini" | "ollama" | "openrouter" | "custom";

// ─── Emoji Picker data ────────────────────────────────────────────────────────
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "👤 คน", emojis: ["👨‍💼", "👩‍💼", "🧑‍💻", "👨‍⚖️", "👩‍⚖️", "👨‍🔬", "👩‍🔬", "👨‍🏫", "👩‍🏫", "🧑‍🎓", "👨‍💻", "👩‍💻", "🧑‍💼", "🤵", "💂", "🕵️", "👷", "🦸", "🧙", "🤖"] },
  { label: "💼 ธุรกิจ", emojis: ["📊", "📈", "📉", "💰", "💵", "🏦", "🧮", "📋", "📑", "🗂️", "💡", "🎯", "🏆", "⚡", "🔥", "💎", "🛡️", "🔑", "🏛️", "🌟"] },
  { label: "🔍 วิเคราะห์", emojis: ["🔍", "🔎", "📐", "🧪", "⚗️", "🔬", "📏", "🧩", "🎲", "📊", "🗃️", "📂", "🗄️", "💻", "🖥️", "⌨️", "🖨️", "📡", "🌐", "🔌"] },
  { label: "⚖️ กฎหมาย", emojis: ["⚖️", "📜", "🔏", "📝", "✍️", "🏛️", "🪧", "📌", "🔒", "🗝️", "🎖️", "🏅", "👨‍⚖️", "👩‍⚖️", "📚", "🗳️", "📒", "📕", "📖", "🧾"] },
];

interface Agent {
  id: string;
  name: string;
  emoji: string;
  provider: Provider;
  model: string;
  soul: string;
  role: string;
  active: boolean;
  hasApiKey: boolean;
  baseUrl?: string;
  skills?: string[];
  useWebSearch: boolean;
  seniority?: number;
  mcpEndpoint?: string;
  mcpAccessMode?: string;
  trustedUrls?: string[];
  knowledge?: { id: string; filename: string; tokens?: number }[];
  isSystem?: boolean;
  systemAgentType?: string;
  createdAt: string;
  updatedAt: string;
}

interface ModelOption {
  id: string;
  name: string;
  contextWindow: number;
  desc?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

// ─── Skills ───────────────────────────────────────────────────────────────────

const ALL_SKILLS = [
  { id: "web_search", label: "ค้นข้อมูลออนไลน์", desc: "ค้นข้อมูลจากอินเทอร์เน็ต กฎหมาย ข่าวสาร" },
  { id: "data_analysis", label: "วิเคราะห์ข้อมูล", desc: "วิเคราะห์ข้อมูลเชิงสถิติ ตัวเลข กราฟ" },
  { id: "financial_modeling", label: "งบการเงิน", desc: "วิเคราะห์งบ สร้าง model ทางการเงิน" },
  { id: "legal_research", label: "กฎหมาย/ภาษี", desc: "ค้นคว้ากฎหมาย สรรพากร ฎีกา และบรรทัดฐาน" },
  { id: "case_analysis", label: "วิเคราะห์เคส", desc: "วิเคราะห์กรณีศึกษา จุดแข็ง/จุดอ่อน" },
  { id: "contract_review", label: "ตรวจสัญญา", desc: "ตรวจสอบและร่างสัญญา" },
  { id: "risk_assessment", label: "ประเมินความเสี่ยง", desc: "ประเมินความเสี่ยงทางธุรกิจและการเงิน" },
  { id: "market_research", label: "วิเคราะห์ตลาด", desc: "วิเคราะห์ตลาดและคู่แข่ง" },
  { id: "summarization", label: "สรุปเอกสาร", desc: "สรุปเอกสารและรายงานให้กระชับ" },
  { id: "translation", label: "แปลภาษา", desc: "แปลภาษาหลายภาษา" },
];

// ─── Templates ────────────────────────────────────────────────────────────────

interface AgentTemplate {
  category: string;
  emoji: string;
  role: string;
  name: string;
  soul: string;
  skills: string[];
  recommendedModel: string;
  recommendedReason: string;
  trustedUrls: string[];
}

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  accounting: { label: "สำนักงานบัญชี", color: "border-[var(--accent)]/40 bg-[var(--accent)]/5 text-[var(--accent)]" },
  custom: { label: "Custom", color: "border-[var(--text-muted)]/30 bg-[var(--surface)] text-[var(--text-muted)]" },
};

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    category: "accounting",
    emoji: "📊",
    role: "นักบัญชีอาวุโส / Senior Accountant",
    name: "นักบัญชีอาวุโส",
    recommendedModel: "google/gemini-2.5-flash-lite",
    recommendedReason: "⚡ เร็วสุด · ถูกสุด ค่าพิมพ์ ฿3.6 / ตอบ ฿14.4 ต่อ 1 ล้านคำ · เหมาะงานบัญชีทั่วไป",
    skills: ["financial_modeling", "data_analysis", "risk_assessment"],
    trustedUrls: ["tfac.or.th", "rd.go.th", "dbd.go.th"],
    soul: `คุณเป็นนักบัญชีอาวุโสในประเทศไทย ทำงานภายใต้กรอบกฎหมายและมาตรฐานของไทยเท่านั้น ได้แก่ มาตรฐานการรายงานทางการเงินไทย (TFRS) ตามสภาวิชาชีพบัญชี, พ.ร.บ.การบัญชี พ.ศ. 2543, ประมวลรัษฎากร และกฎหมายที่เกี่ยวข้อง เชี่ยวชาญการจัดทำงบการเงิน การปิดงบ ระบบ ERP และการบันทึกบัญชีตามมาตรฐาน TFRS/IFRS เน้นความถูกต้องของข้อมูลทางบัญชี อ้างอิงมาตราและมาตรฐานที่เกี่ยวข้องเสมอ เมื่อตอบคำถามเกี่ยวกับภาษีหรือกฎหมาย ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนสรุปเสมอ`,
  },
  {
    category: "accounting",
    emoji: "🔍",
    role: "ผู้สอบบัญชี CPA / Certified Public Accountant",
    name: "ผู้สอบบัญชี CPA",
    recommendedModel: "google/gemini-2.5-flash",
    recommendedReason: "⚡ เร็ว+แม่นยำ · ค่าพิมพ์ ฿10.8 / ตอบ ฿90 ต่อ 1 ล้านคำ · มีโหมดคิดลึก เหมาะงานตรวจสอบที่ต้องอ้างอิงมาตรฐาน",
    skills: ["financial_modeling", "risk_assessment", "data_analysis", "summarization"],
    trustedUrls: ["tfac.or.th", "sec.or.th", "rd.go.th"],
    soul: `คุณเป็นผู้สอบบัญชีรับอนุญาต (CPA) ที่ขึ้นทะเบียนกับสภาวิชาชีพบัญชีในประเทศไทย ปฏิบัติงานภายใต้ พ.ร.บ.วิชาชีพบัญชี พ.ศ. 2547 และกฎหมายไทยที่เกี่ยวข้อง เชี่ยวชาญมาตรฐานการสอบบัญชีไทย (TSQC/TSA), การตรวจสอบงบการเงินตาม TFRS, การประเมินระบบควบคุมภายใน และการปฏิบัติตามประมวลรัษฎากร เน้นความเป็นอิสระ ชี้จุดอ่อนตรงไปตรงมา อ้างอิง TSA, TFRS และกฎหมายไทยที่เกี่ยวข้องเสมอ เมื่อพบประเด็นภาษี ต้องตรวจสอบทั้งหลักเกณฑ์ทั่วไปและข้อยกเว้นตามกฎหมาย`,
  },
  {
    category: "accounting",
    emoji: "💰",
    role: "ที่ปรึกษาภาษี / Tax Consultant",
    name: "ที่ปรึกษาภาษี",
    recommendedModel: "google/gemini-2.5-flash",
    recommendedReason: "⚡ เร็ว+แม่นยำ · ค่าพิมพ์ ฿10.8 / ตอบ ฿90 ต่อ 1 ล้านคำ · มีโหมดคิดลึก เหมาะอ้างอิงประมวลรัษฎากร",
    skills: ["legal_research", "financial_modeling", "risk_assessment"],
    trustedUrls: ["rd.go.th", "tfac.or.th"],
    soul: `คุณเป็นที่ปรึกษาภาษีในประเทศไทย เชี่ยวชาญประมวลรัษฎากรอย่างลึกซึ้ง ครอบคลุม ภาษีเงินได้บุคคลธรรมดา PIT (ม.40 เงินได้ 8 ประเภท, ม.42 ยกเว้น, ม.47 ลดหย่อน, ม.48 อัตรา 5-35%), ภาษีเงินได้นิติบุคคล CIT (ม.65 กำไรสุทธิ, ม.65 ทวิ/ตรี เงื่อนไข+รายจ่ายต้องห้าม, อัตรา 20%), ภาษีมูลค่าเพิ่ม VAT หมวด 4 (ม.80 อัตรา 7%, ม.81 ข้อยกเว้นสำคัญ), ภาษีหัก ณ ที่จ่าย WHT (ม.50), ภาษีธุรกิจเฉพาะ SBT หมวด 5 (ม.91/2 ธนาคาร/เงินทุน/ประกันชีวิต/โรงรับจำนำ/ขายอสังหาฯทางค้า, อัตรา 0.1-3.0%), อากรแสตมป์ หมวด 6 (ม.104 ตราสาร 28 ลำดับ, ม.118 ไม่ปิดแสตมป์ใช้เป็นพยานหลักฐานไม่ได้) และอนุสัญญาภาษีซ้อน รวมถึง พ.ร.ฎ. ประกาศอธิบดีฯ คำสั่งกรมสรรพากร คำวินิจฉัยฯ กฎเหล็ก: ก่อนสรุปว่าต้องเสียภาษีใดๆ ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนเสมอ — VAT ตรวจ ม.81, SBT ตรวจ ม.91/3, PIT ตรวจ ม.42+กฎกระทรวง 126 หากมีข้อยกเว้นที่เข้าเงื่อนไข ต้องระบุเป็นประเด็นหลัก ไม่ใช่แค่หมายเหตุ อ้างอิงมาตราเฉพาะที่เกี่ยวข้องเสมอ แหล่งข้อมูล: rd.go.th/284.html`,
  },
  {
    category: "accounting",
    emoji: "📈",
    role: "นักวิเคราะห์งบการเงิน / Financial Analyst",
    name: "นักวิเคราะห์งบการเงิน",
    recommendedModel: "google/gemini-2.5-flash-lite",
    recommendedReason: "⚡ เร็วสุด · วิเคราะห์ตัวเลขเก่ง ถูกสุด ค่าพิมพ์ ฿3.6 / ตอบ ฿14.4 ต่อ 1 ล้านคำ",
    skills: ["financial_modeling", "data_analysis", "market_research"],
    trustedUrls: ["set.or.th", "sec.or.th", "tfac.or.th"],
    soul: `คุณเป็นนักวิเคราะห์งบการเงินที่เชี่ยวชาญบริบทธุรกิจไทย วิเคราะห์ตามมาตรฐานการรายงานทางการเงินไทย (TFRS) ครอบคลุมบริษัทจดทะเบียนใน SET/mai และ SMEs ไทย เชี่ยวชาญการอ่านและตีความงบการเงิน (Balance Sheet, P&L, Cash Flow) วิเคราะห์อัตราส่วนทางการเงิน, Trend Analysis, เปรียบเทียบกับอุตสาหกรรมไทย ชี้ Red Flag ในงบและให้ข้อเสนอแนะที่เป็นรูปธรรม คำนึงถึงข้อกำหนดของ ก.ล.ต., ตลาดหลักทรัพย์แห่งประเทศไทย, ประมวลรัษฎากร และกฎหมายไทยที่เกี่ยวข้อง`,
  },
  {
    category: "accounting",
    emoji: "🛡️",
    role: "ผู้ตรวจสอบภายใน / Internal Auditor",
    name: "ผู้ตรวจสอบภายใน",
    recommendedModel: "google/gemini-2.5-flash-lite",
    recommendedReason: "⚡ เร็วสุด · ถูกสุด ค่าพิมพ์ ฿3.6 / ตอบ ฿14.4 ต่อ 1 ล้านคำ · เหมาะงาน checklist/audit ที่ต้องการความละเอียด",
    skills: ["risk_assessment", "data_analysis", "financial_modeling"],
    trustedUrls: ["sec.or.th", "rd.go.th", "tfac.or.th", "pdpc.or.th"],
    soul: `คุณเป็นผู้ตรวจสอบภายในที่ทำงานในประเทศไทย ปฏิบัติงานตามกรอบ COSO, มาตรฐาน IIA (Institute of Internal Auditors) และกฎหมายไทยที่เกี่ยวข้อง เชี่ยวชาญการประเมินระบบควบคุมภายใน, การบริหารความเสี่ยง, Segregation of Duties, IT Controls และการปฏิบัติตามกฎระเบียบ (Compliance) คำนึงถึง พ.ร.บ.หลักทรัพย์และตลาดหลักทรัพย์, ประมวลรัษฎากร, พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562 พร้อมเสนอแนวทางแก้ไขที่ปฏิบัติได้จริงในบริบทธุรกิจไทย`,
  },
  {
    category: "custom",
    emoji: "🤖",
    role: "Custom",
    name: "",
    recommendedModel: "",
    recommendedReason: "",
    skills: [],
    trustedUrls: [],
    soul: "",
  },
];

const EMPTY_FORM = {
  name: "",
  emoji: "🤖",
  provider: "openrouter" as Provider,
  apiKey: "",
  baseUrl: "",
  model: "",
  soul: "",
  role: "",
  skills: [] as string[],
  useWebSearch: false,
  seniority: 50,
  mcpEndpoint: "",
  mcpAccessMode: "general",
  trustedUrls: "" as string, // comma or newline separated
  templateIndex: -1,
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIsSystem, setEditingIsSystem] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("accounting");
  const [mcpTesting, setMcpTesting] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [formStep, setFormStep] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [wizardMode, setWizardMode] = useState<"easy" | "expert">("easy");

  // Tiered model map for easy mode: ประหยัด / แนะนำ / คุณภาพสูง
  const MODEL_TIERS = {
    economy: { id: "google/gemini-2.5-flash-lite", label: "ประหยัด", desc: "เร็วสุด ราคาถูก เหมาะงานทั่วไป" },
    recommended: { id: "anthropic/claude-haiku-4-5", label: "แนะนำ", desc: "สมดุลคุณภาพ/ความเร็ว เหมาะงานบัญชีส่วนใหญ่" },
    premium: { id: "anthropic/claude-sonnet-4-6", label: "คุณภาพสูง", desc: "แม่นยำสูง เหมาะงานซับซ้อน ภาษี/ตรวจสอบ" },
  } as const;

  // Knowledge base state
  const [knowledgeAgentId, setKnowledgeAgentId] = useState<string | null>(null);
  const [knowledgeAgentName, setKnowledgeAgentName] = useState("");
  const [knowledgeFiles, setKnowledgeFiles] = useState<{ id: string; filename: string; meta: string; tokens: number; uploadedAt: string; preview: string }[]>([]);
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgePreview, setKnowledgePreview] = useState<{ filename: string; tokens: number; preview?: string } | null>(null);

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/team-agents");
    const data = await res.json();
    setAgents(data.agents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  useEffect(() => {
    fetch("/api/team-models?provider=openrouter")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {});
  }, []);

  const applyTemplate = (idx: number) => {
    const t = AGENT_TEMPLATES[idx];
    if (!t) return;
    setForm((f) => ({
      ...f,
      templateIndex: idx,
      role: t.role || f.role,
      emoji: t.emoji || f.emoji,
      soul: t.soul || f.soul,
      name: t.name || f.name,
      skills: t.skills,
      model: t.recommendedModel || f.model,
      trustedUrls: (t.trustedUrls || []).join("\n"),
      useWebSearch: true, // auto-enable web search from template
    }));
    setModelSearch("");
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setEditingIsSystem(false);
    setError("");
    setShowAdvanced(false);
    setFormStep(0);
    setShowForm(true);
  };

  const openEdit = (agent: Agent) => {
    setForm({
      name: agent.name,
      emoji: agent.emoji,
      provider: agent.provider,
      apiKey: "",
      baseUrl: agent.baseUrl ?? "",
      model: agent.model,
      soul: agent.soul,
      role: agent.role,
      skills: agent.skills ?? [],
      useWebSearch: agent.useWebSearch ?? false,
      seniority: agent.seniority ?? 50,
      mcpEndpoint: agent.mcpEndpoint ?? "",
      mcpAccessMode: agent.mcpAccessMode ?? "general",
      trustedUrls: (agent.trustedUrls || []).join("\n"),
      templateIndex: -1,
    });
    setMcpTestResult(null);
    setEditingId(agent.id);
    setEditingIsSystem(!!agent.isSystem);
    setError("");
    setFormStep(agent.isSystem ? 1 : 0);
    setShowForm(true);
  };

  const handleSave = async () => {
    // System agents: only validate model + optional API key
    if (editingIsSystem) {
      if (!form.model) {
        setError("กรุณาเลือก Model");
        return;
      }
    } else {
      if (!form.name.trim() || !form.provider || !form.model || !form.soul.trim() || !form.role.trim()) {
        setError("กรุณากรอกข้อมูลให้ครบ: ชื่อ, Provider, Model, Role, Soul");
        return;
      }
      if (!editingId && !form.apiKey.trim()) {
        setError("⚠️ กรุณาใส่ API Key — สมัครฟรีที่ openrouter.ai/keys");
        setFormStep(2);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      // System agents: only send model + apiKey
      const payload = editingIsSystem ? {
        model: form.model,
        apiKey: form.apiKey || undefined,
      } : (() => {
        const parsedUrls = form.trustedUrls
          .split(/[\n,]+/)
          .map((u: string) => u.trim())
          .filter((u: string) => u.length > 0);
        return {
          name: form.name,
          emoji: form.emoji,
          provider: form.provider,
          apiKey: form.apiKey,
          baseUrl: form.baseUrl,
          model: form.model,
          soul: form.soul,
          role: form.role,
          skills: form.skills,
          useWebSearch: form.useWebSearch,
          seniority: form.seniority,
          mcpEndpoint: form.mcpEndpoint.trim() || undefined,
          mcpAccessMode: form.mcpEndpoint.trim() ? form.mcpAccessMode : undefined,
          trustedUrls: parsedUrls.length > 0 ? parsedUrls : undefined,
        };
      })();
      if (editingId) {
        const res = await fetch(`/api/team-agents/${editingId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch("/api/team-agents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setShowForm(false);
      setEditingId(null);
      fetchAgents();
      showToast("success", editingId ? "บันทึกแล้ว" : "สร้างที่ปรึกษาแล้ว");
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/team-agents/${id}`, { method: "DELETE" });
    if (res.ok) { setDeleteConfirm(null); fetchAgents(); showToast("success", "ลบ Agent แล้ว"); }
  };

  const handleToggle = async (agent: Agent) => {
    await fetch(`/api/team-agents/${agent.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !agent.active }),
    });
    fetchAgents();
    showToast("info", `${agent.emoji} ${agent.name} — ${agent.active ? "ปิด" : "เปิด"}แล้ว`);
  };

  // Knowledge base functions
  const openKnowledge = async (agent: Agent) => {
    setKnowledgeAgentId(agent.id);
    setKnowledgeAgentName(`${agent.emoji} ${agent.name}`);
    setKnowledgePreview(null);
    try {
      const res = await fetch(`/api/team-agents/${agent.id}/knowledge`);
      const data = await res.json();
      setKnowledgeFiles(data.knowledge ?? []);
    } catch { setKnowledgeFiles([]); }
  };

  const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !knowledgeAgentId) return;
    setKnowledgeUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/team-agents/${knowledgeAgentId}/knowledge`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeFiles((prev) => [...prev, data.knowledge]);
        setKnowledgePreview({ filename: data.knowledge.filename, tokens: data.knowledge.tokens, preview: data.knowledge.preview });
        fetchAgents(); // refresh agent list to update knowledge badge
      } else {
        const err = await res.json();
        showToast("error", err.error || "อัพโหลดไม่สำเร็จ");
      }
    } catch { showToast("error", "อัพโหลดไม่สำเร็จ"); }
    setKnowledgeUploading(false);
    e.target.value = "";
  };

  const handleKnowledgeDelete = async (knowledgeId: string) => {
    if (!knowledgeAgentId) return;
    const res = await fetch(`/api/team-agents/${knowledgeAgentId}/knowledge`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledgeId }),
    });
    if (res.ok) {
      setKnowledgeFiles((prev) => prev.filter((k) => k.id !== knowledgeId));
      setKnowledgePreview(null);
      fetchAgents(); // refresh agent list to update knowledge badge
    }
  };

  const toggleSkill = (skillId: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skillId) ? f.skills.filter((s) => s !== skillId) : [...f.skills, skillId],
    }));
  };

  const testMcp = async () => {
    const endpoint = form.mcpEndpoint.trim();
    if (!endpoint) return;
    setMcpTesting(true);
    setMcpTestResult(null);
    try {
      const res = await fetch(`/api/team-agents/mcp-test?endpoint=${encodeURIComponent(endpoint)}&mode=${form.mcpAccessMode}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const toolCount = data.toolCount ?? 0;
        setMcpTestResult({ ok: true, msg: `✓ เชื่อมต่อสำเร็จ — ${toolCount} tools พร้อมใช้งาน` });
      } else {
        setMcpTestResult({ ok: false, msg: `✗ ${data.error ?? "เชื่อมต่อไม่ได้"}` });
      }
    } catch {
      setMcpTestResult({ ok: false, msg: "✗ Timeout หรือเชื่อมต่อไม่ได้" });
    } finally {
      setMcpTesting(false);
    }
  };

  const [syncLoading, setSyncLoading] = useState(false);

  const handleSyncKnowledge = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch("/api/team-agents/sync-knowledge", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        showToast("success", data.message);
      } else {
        showToast("error", `ซิงค์ไม่สำเร็จ: ${data.error}`);
      }
    } catch {
      showToast("error", "ซิงค์ไม่สำเร็จ");
    } finally {
      setSyncLoading(false);
    }
  };

  const categoriesWithTemplates = Object.entries(TEMPLATE_CATEGORIES).map(([key, cat]) => ({
    key,
    ...cat,
    templates: AGENT_TEMPLATES.map((t, i) => ({ ...t, idx: i })).filter((t) => t.category === key),
  }));

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
              Team Agents
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              สร้างและจัดการ AI agents สำหรับทีม
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncKnowledge}
              disabled={syncLoading}
              className="px-3 py-2 rounded-lg text-xs border transition-all disabled:opacity-50"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              title="อัพเดทข้อมูล Agent ระบบ"
            >
              {syncLoading ? "⏳ กำลังซิงค์..." : "🔄 อัพเดทข้อมูล"}
            </button>
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              + New Agent
            </button>
          </div>
        </div>

        {/* Agent List */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : agents.length === 0 ? (
          <div className="border rounded-xl p-12 text-center" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            <p>ยังไม่มี agents — กด New Agent เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-3 sm:gap-4 transition-all"
                style={{ borderColor: "var(--border)", background: "var(--surface)", opacity: agent.active ? 1 : 0.5 }}
              >
                <div className="text-3xl">{agent.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold" style={{ color: "var(--text)" }}>{agent.name}</span>
                    {agent.isSystem && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: "var(--accent)", color: "#000" }}>ระบบ</span>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      {agent.role}
                    </span>
                    {!agent.hasApiKey && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                        No API Key
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: "var(--text-muted)" }}>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px]" style={{ borderColor: "var(--border)" }}>
                      {agent.model.split("/").pop()}
                    </span>
                    {agent.seniority && (
                      <span className="text-[11px]">#{agent.seniority}</span>
                    )}
                    {agent.useWebSearch && (
                      <Tooltip content="ที่ปรึกษาสามารถค้นข้อมูลจากอินเทอร์เน็ตก่อนตอบได้">
                        <span className="text-[11px] cursor-help">🔍 ค้นเว็บ</span>
                      </Tooltip>
                    )}
                    {agent.trustedUrls && agent.trustedUrls.length > 0 && (
                      <Tooltip content="เว็บไซต์อ้างอิงที่ AI จะใช้ค้นหาข้อมูลเป็นหลัก">
                        <span className="text-[11px] cursor-help">🌐 {agent.trustedUrls.length} เว็บอ้างอิง</span>
                      </Tooltip>
                    )}
                    {agent.mcpEndpoint && (
                      <Tooltip content={GLOSSARY.mcp?.long || ""}>
                        <span className="text-[11px] cursor-help">🔌 MCP</span>
                      </Tooltip>
                    )}
                  </div>
                  {/* Health indicators */}
                  {agent.active && (!agent.useWebSearch || !agent.trustedUrls?.length) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {!agent.useWebSearch && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400">ค้นเว็บปิดอยู่</span>
                      )}
                      {!agent.trustedUrls?.length && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400">ไม่มี Trusted URLs</span>
                      )}
                    </div>
                  )}
                  {agent.skills && agent.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.skills.map((s) => {
                        const skill = ALL_SKILLS.find((sk) => sk.id === s);
                        return skill ? (
                          <span key={s} className="text-[11px] px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                            {skill.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {agent.soul}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <a
                    href={`/chat/${agent.id}`}
                    className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                    title="ถามด่วน"
                  >
                    💬 ถามด่วน
                  </a>
                  <button
                    onClick={() => openKnowledge(agent)}
                    className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                    title="ฐานความรู้"
                  >
                    📚 {agent.knowledge && agent.knowledge.length > 0
                      ? `${agent.knowledge.length} ไฟล์ · ${(agent.knowledge.reduce((s, f) => s + (f.tokens || 0), 0) / 1000).toFixed(1)}k tok`
                      : "Knowledge"}
                  </button>
                  <button
                    onClick={() => handleToggle(agent)}
                    className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                    style={{ borderColor: "var(--border)", color: agent.active ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    {agent.active ? "● On" : "○ Off"}
                  </button>
                  <button
                    onClick={() => openEdit(agent)}
                    className="px-3 py-2 sm:py-1 rounded text-xs border transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    Edit
                  </button>
                  {!agent.isSystem && (
                    deleteConfirm === agent.id ? (
                      <>
                        <button onClick={() => handleDelete(agent.id)} className="px-3 py-2 sm:py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2 sm:py-1 rounded text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteConfirm(agent.id)} className="px-3 py-2 sm:py-1 rounded text-xs border border-red-500/30 text-red-400">Delete</button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Form (Step Wizard) ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-3xl rounded-xl border flex flex-col max-h-[95vh] sm:max-h-[92vh]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {/* Header + Step indicator */}
            <div className="flex-shrink-0 p-4 sm:p-6 pb-0">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="font-bold text-lg" style={{ color: "var(--text)" }}>
                  {editingIsSystem ? `⚙️ ตั้งค่า ${form.name}` : editingId ? "แก้ไขที่ปรึกษา" : "สร้างที่ปรึกษาใหม่"}
                </h2>
                <div className="flex items-center gap-2">
                  {!editingIsSystem && (
                    <div className="inline-flex rounded-lg border text-[11px] overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <button
                        type="button"
                        onClick={() => setWizardMode("easy")}
                        className="px-2.5 py-1 transition-colors"
                        style={{
                          background: wizardMode === "easy" ? "var(--accent)" : "transparent",
                          color: wizardMode === "easy" ? "var(--bg)" : "var(--text-muted)",
                        }}
                        aria-pressed={wizardMode === "easy" ? "true" : "false"}
                      >
                        โหมดง่าย
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardMode("expert")}
                        className="px-2.5 py-1 transition-colors"
                        style={{
                          background: wizardMode === "expert" ? "var(--accent)" : "transparent",
                          color: wizardMode === "expert" ? "var(--bg)" : "var(--text-muted)",
                        }}
                        aria-pressed={wizardMode === "expert" ? "true" : "false"}
                      >
                        ผู้เชี่ยวชาญ
                      </button>
                    </div>
                  )}
                  <button onClick={() => setShowForm(false)} className="text-xl w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "var(--text-muted)" }} aria-label="ปิด">✕</button>
                </div>
              </div>

              {/* Step Tabs — clean, simple */}
              <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
                {(editingIsSystem
                  ? ["Model", "API Key"]
                  : wizardMode === "easy"
                    ? ["ตำแหน่ง", "โมเดล", "ข้อมูล"]
                    : ["ตำแหน่ง", "Model", "ข้อมูล", "ขั้นสูง"]
                ).map((label, i) => {
                  const stepIndex = editingIsSystem ? i + 1 : i; // system: tab 0→step1, tab 1→step2
                  return (
                  <button
                    key={i}
                    onClick={() => setFormStep(stepIndex)}
                    className="flex-1 py-2.5 text-xs font-medium transition-all relative"
                    style={{ color: formStep === stepIndex ? "var(--accent)" : "var(--text-muted)" }}
                  >
                    {label}
                    {formStep === stepIndex && (
                      <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ background: "var(--accent)" }} />
                    )}
                    {formStep > stepIndex && (
                      <span className="absolute top-1 right-1 text-[8px]" style={{ color: "var(--success, #22c55e)" }}>✓</span>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mx-4 sm:mx-6 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}

            {/* Step Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2">

              {/* ── Step 0: Template Picker ── */}
              {formStep === 0 && (
                <div>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>เลือก template สำเร็จรูป หรือข้ามเพื่อสร้างเอง</p>

                  {/* Category tabs */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {categoriesWithTemplates.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                        style={{
                          borderColor: activeCategory === cat.key ? "var(--accent)" : "var(--border)",
                          color: activeCategory === cat.key ? "var(--accent)" : "var(--text-muted)",
                          background: activeCategory === cat.key ? "var(--accent-10)" : "transparent",
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Template cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {categoriesWithTemplates
                      .find((c) => c.key === activeCategory)
                      ?.templates.map((t) => {
                        const recModel = models.find((m) => m.id === t.recommendedModel);
                        return (
                          <button
                            key={t.idx}
                            onClick={() => applyTemplate(t.idx)}
                            className="text-left p-4 rounded-xl border-2 transition-all"
                            style={{
                              borderColor: form.templateIndex === t.idx ? "var(--accent)" : "var(--border)",
                              background: form.templateIndex === t.idx ? "var(--accent-8)" : "var(--border-50)",
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{t.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{t.role.split(" / ")[0]}</div>
                                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{t.role.split(" / ")[1] || ""}</div>
                                {t.recommendedModel && (
                                  <div className="text-[11px] mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "var(--border-50)", color: "var(--text-muted)" }}>
                                    {recModel?.name?.replace(/^[⭐🆓] /, "") || t.recommendedModel.split("/").pop()}
                                  </div>
                                )}
                              </div>
                              {form.templateIndex === t.idx && (
                                <span style={{ color: "var(--accent)" }}>✓</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── Step 1: Model Selector ── */}
              {formStep === 1 && wizardMode === "easy" && !editingIsSystem && (
                <div>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>เลือกระดับ AI ที่ต้องการ — ระบบจะเลือกโมเดลให้อัตโนมัติ</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(["economy", "recommended", "premium"] as const).map((tier) => {
                      const t = MODEL_TIERS[tier];
                      const isSelected: boolean = form.model === t.id;
                      const pressed: "true" | "false" = isSelected ? "true" : "false";
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, model: t.id }))}
                          className="text-left p-4 rounded-xl border-2 transition-all"
                          style={{
                            borderColor: isSelected ? "var(--accent)" : "var(--border)",
                            background: isSelected ? "var(--accent-8)" : "var(--bg)",
                          }}
                          aria-pressed={pressed}
                        >
                          <div className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>
                            {tier === "economy" ? "⚡" : tier === "recommended" ? "⭐" : "💎"} {t.label}
                          </div>
                          <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{t.desc}</div>
                          {isSelected && <div className="text-[11px] mt-2" style={{ color: "var(--accent)" }}>✓ เลือกแล้ว</div>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>
                    ต้องการเลือกโมเดลเฉพาะเจาะจง? สลับเป็น <span className="font-bold">โหมดผู้เชี่ยวชาญ</span> ด้านบน
                  </p>
                </div>
              )}

              {formStep === 1 && (wizardMode === "expert" || editingIsSystem) && (
                <div>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>เลือก AI Model ที่ต้องการ — มีคำแนะนำตาม template</p>

                  {/* Recommendation banner */}
                  {(() => {
                    const tmpl = form.templateIndex >= 0 ? AGENT_TEMPLATES[form.templateIndex] : null;
                    if (!tmpl || !tmpl.recommendedModel) return null;
                    const recModelObj = models.find((m) => m.id === tmpl.recommendedModel);
                    const isUsingRec = form.model === tmpl.recommendedModel;
                    return (
                      <div
                        className="mb-3 p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all"
                        style={{
                          borderColor: isUsingRec ? "var(--accent)" : "var(--accent-40)",
                          background: isUsingRec ? "var(--accent-10)" : "var(--accent-4)",
                        }}
                        onClick={() => setForm((f) => ({ ...f, model: tmpl.recommendedModel }))}
                      >
                        <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>★</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                            แนะนำสำหรับ {tmpl.role.split(" / ")[0]}
                          </div>
                          <div className="text-sm font-bold mt-0.5" style={{ color: "var(--text)" }}>
                            {recModelObj?.name?.replace(/^[⭐🆓] /, "") || tmpl.recommendedModel}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {tmpl.recommendedReason}
                            {recModelObj && <span> · context: {(recModelObj.contextWindow / 1000).toFixed(0)}K</span>}
                          </div>
                        </div>
                        {isUsingRec ? (
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>✓ ใช้อยู่</span>
                        ) : (
                          <span className="text-[11px] px-2 py-1 rounded border flex-shrink-0" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>ใช้ model นี้</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Search input */}
                  <div className="relative mb-2">
                    <input
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="🔍 ค้นหา model... (เช่น claude, gemini, gpt, free)"
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    {modelSearch && (
                      <button
                        onClick={() => setModelSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >✕</button>
                    )}
                  </div>

                  {/* Model list */}
                  <div className="max-h-64 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    {models
                      .filter((m) => {
                        if (!modelSearch.trim()) return true;
                        const q = modelSearch.toLowerCase();
                        return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
                      })
                      .map((m) => {
                        const isSelected = form.model === m.id;
                        const tmpl = form.templateIndex >= 0 ? AGENT_TEMPLATES[form.templateIndex] : null;
                        const isRec = tmpl?.recommendedModel === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => { setForm((f) => ({ ...f, model: m.id })); setModelSearch(""); }}
                            className="w-full text-left px-3 py-2 border-b last:border-b-0 transition-all flex items-center gap-2"
                            style={{
                              borderColor: "var(--border)",
                              background: isSelected ? "var(--accent-10)" : "transparent",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold" style={{ color: isSelected ? "var(--accent)" : "var(--text)" }}>
                                {m.name}
                              </span>
                              <span className="text-[11px] ml-2" style={{ color: "var(--text-muted)" }}>
                                {(m.contextWindow / 1000).toFixed(0)}K
                              </span>
                              {m.desc && (
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                  {m.desc}
                                </div>
                              )}
                            </div>
                            {isRec && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-15)", color: "var(--accent)" }}>
                                แนะนำ
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-xs flex-shrink-0" style={{ color: "var(--accent)" }}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    {models.length === 0 && (
                      <div className="p-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                        กำลังโหลด models...
                      </div>
                    )}
                  </div>

                  {/* Selected model display */}
                  {form.model && (
                    <div className="mt-2 text-xs px-3 py-2 rounded-lg border flex items-center gap-2" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-5)" }}>
                      <span>✓ เลือกแล้ว:</span>
                      <span className="font-bold">{models.find((m) => m.id === form.model)?.name || form.model}</span>
                      {(() => {
                        const tmpl = form.templateIndex >= 0 ? AGENT_TEMPLATES[form.templateIndex] : null;
                        if (tmpl?.recommendedModel && form.model !== tmpl.recommendedModel) {
                          return <span className="text-[11px] ml-auto" style={{ color: "var(--text-muted)" }}>(ไม่ใช่ model ที่แนะนำ)</span>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Basic Info + API Key ── */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>กรอกข้อมูลพื้นฐานของ Agent</p>

                  {/* API Key */}
                  <div className="p-4 rounded-xl border-2" style={{ borderColor: "var(--accent)", background: "var(--accent-5)" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>🔑 API Key</div>
                    <div className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                      สมัครฟรีที่ <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>openrouter.ai/keys</a> — API Key เดียวใช้ได้ทุก model
                      {editingId && <span> (เว้นว่างถ้าไม่ต้องการเปลี่ยน)</span>}
                    </div>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                      placeholder={editingId ? "••••••• (เว้นว่างถ้าไม่เปลี่ยน)" : "sk-or-v1-xxx..."}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "var(--bg)", borderColor: !editingId && !form.apiKey.trim() ? "var(--danger)" : "var(--border)", color: "var(--text)" }}
                    />
                    {!editingId && !form.apiKey.trim() && (
                      <div className="mt-2 text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--danger)", background: "var(--danger-8)", color: "var(--danger)" }}>
                        ⚠️ จำเป็นต้องใส่ API Key — ถ้าไม่มี Agent จะใช้งานไม่ได้
                      </div>
                    )}
                  </div>

                  {/* Name + Emoji + Role */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="w-20 relative">
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Emoji</label>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-full px-3 py-2 rounded-lg border text-center text-xl cursor-pointer"
                          style={{ background: "var(--bg)", borderColor: showEmojiPicker ? "var(--accent)" : "var(--border)", color: "var(--text)" }}
                        >
                          {form.emoji || "😀"}
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-xl border shadow-2xl p-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                            {EMOJI_GROUPS.map((group) => (
                              <div key={group.label} className="mb-2">
                                <div className="text-[11px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>{group.label}</div>
                                <div className="flex flex-wrap gap-1">
                                  {group.emojis.map((e) => (
                                    <button
                                      key={e}
                                      type="button"
                                      onClick={() => { setForm((f) => ({ ...f, emoji: e })); setShowEmojiPicker(false); }}
                                      className="w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all hover:scale-110"
                                      style={{ background: form.emoji === e ? "var(--accent-20)" : "transparent" }}
                                    >
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Name *</label>
                        <input
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="เช่น CEO Advisor"
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Role *</label>
                      <input
                        value={form.role}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                        placeholder="เช่น CEO / Strategic Advisor"
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    </div>
                  </div>

                  {/* Soul */}
                  <div>
                    <label className="text-xs mb-1 flex items-center gap-2 font-bold" style={{ color: "var(--text-muted)" }}>
                      <span>บทบาท (System Prompt) * — บุคลิกและความเชี่ยวชาญ</span>
                      <Tooltip content={GLOSSARY.systemPrompt?.long || ""}>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border cursor-help font-normal" style={{ borderColor: "var(--border)" }}>?</span>
                      </Tooltip>
                    </label>
                    <textarea
                      value={form.soul}
                      onChange={(e) => setForm((f) => ({ ...f, soul: e.target.value }))}
                      rows={5}
                      placeholder="อธิบายบุคลิก ความเชี่ยวชาญ และวิธีการทำงานของ agent นี้..."
                      className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{form.soul.length} ตัวอักษร</div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Advanced Settings ── */}
              {formStep === 3 && wizardMode === "expert" && (
                <div className="space-y-4">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>ตั้งค่าเพิ่มเติม (ไม่บังคับ — ข้ามได้ถ้าไม่ต้องการปรับ)</p>

                  {/* Web Search + Seniority */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 p-3 rounded-lg border flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <div>
                        <div className="text-xs font-bold" style={{ color: "var(--text)" }}>🔍 Web Search</div>
                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>ค้นหาข้อมูลจากอินเทอร์เน็ต</div>
                      </div>
                      <button
                        type="button"
                        title={form.useWebSearch ? "ปิด Web Search" : "เปิด Web Search"}
                        aria-label={form.useWebSearch ? "ปิด Web Search" : "เปิด Web Search"}
                        onClick={() => {
                          setForm((f) => {
                            const next = !f.useWebSearch;
                            if (next) showToast("info", "เปิด Web Search แล้ว — อาจเพิ่มค่าใช้จ่าย Token");
                            return { ...f, useWebSearch: next };
                          });
                        }}
                        className="w-10 h-5 rounded-full transition-all relative"
                        style={{ background: form.useWebSearch ? "var(--accent)" : "var(--border)" }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: form.useWebSearch ? "calc(100% - 18px)" : "2px" }}
                        />
                      </button>
                    </div>
                    <div className="flex-1 p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <label className="text-xs font-bold flex items-center gap-2 mb-1" style={{ color: "var(--text)" }}>
                        <span>🏛️ ลำดับอาวุโส (Seniority)</span>
                        <Tooltip content="กำหนดว่าที่ปรึกษาคนนี้จะพูดเป็นลำดับที่เท่าไหร่ในห้องประชุม · 1 = ประธาน (พูดก่อน), 99 = พูดสรุปท้าย">
                          <span className="text-[10px] px-1.5 py-0.5 rounded border cursor-help font-normal" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>?</span>
                        </Tooltip>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={1}
                          max={99}
                          value={form.seniority}
                          aria-label="ลำดับอาวุโส"
                          title="ลำดับ Seniority — 1 = ประธาน, 99 = พูดท้าย"
                          onChange={(e) => setForm((f) => ({ ...f, seniority: Number(e.target.value) }))}
                          className="flex-1"
                        />
                        <span className="text-xs w-8 text-center" style={{ color: "var(--accent)" }}>{form.seniority}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>1 = ประธาน, 99 = พูดท้าย</div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="text-xs mb-2 block font-bold" style={{ color: "var(--text-muted)" }}>
                      Skills / ความสามารถพิเศษ
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {ALL_SKILLS.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className="flex items-start gap-2 p-2 rounded-lg border text-left transition-all"
                          style={{
                            borderColor: form.skills.includes(skill.id) ? "var(--accent)" : "var(--border)",
                            background: form.skills.includes(skill.id) ? "var(--accent-8)" : "transparent",
                          }}
                        >
                          <span className="text-xs font-bold" style={{ color: form.skills.includes(skill.id) ? "var(--accent)" : "var(--text)" }}>
                            {skill.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trusted URLs */}
                  <div className="p-4 rounded-xl border" style={{ borderColor: form.useWebSearch ? "var(--accent-40)" : "var(--border)", background: form.useWebSearch ? "var(--accent-5)" : "var(--bg)" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: form.useWebSearch ? "var(--accent)" : "var(--text)" }}>
                      🌐 Trusted URLs <span className="font-normal" style={{ color: "var(--text-muted)" }}>(แนะนำ — จำกัดการค้นเฉพาะเว็บที่เชื่อถือได้)</span>
                    </div>
                    <div className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                      ระบุโดเมนที่ Agent จะค้นหาข้อมูล (บรรทัดละ 1 หรือคั่นด้วยจุลภาค) เช่น rd.go.th, tfac.or.th
                    </div>
                    <textarea
                      value={form.trustedUrls}
                      onChange={(e) => setForm((f) => ({ ...f, trustedUrls: e.target.value }))}
                      rows={3}
                      placeholder={"rd.go.th\ntfac.or.th\nsec.or.th"}
                      className="w-full px-3 py-2 rounded-lg border text-xs resize-none font-mono"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                    {!form.useWebSearch && form.trustedUrls.trim() && (
                      <div className="mt-1 text-[11px] px-2 py-1 rounded" style={{ color: "orange", background: "var(--orange-8)" }}>
                        ⚠️ Web Search ปิดอยู่ — Trusted URLs จะยังไม่ถูกใช้จนกว่าจะเปิด Web Search
                      </div>
                    )}
                    {form.useWebSearch && !form.trustedUrls.trim() && (
                      <div className="mt-1 text-[11px] px-2 py-1 rounded" style={{ color: "orange", background: "var(--orange-8)" }}>
                        💡 แนะนำ: ใส่เว็บที่น่าเชื่อถือ เพื่อป้องกัน AI เอาข้อมูลจากแหล่งที่ไม่น่าเชื่อถือ
                      </div>
                    )}
                  </div>

                  {/* MCP Server */}
                  <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <div className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>
                      🔌 MCP Server Connection <span className="font-normal" style={{ color: "var(--text-muted)" }}>(ไม่บังคับ)</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>ERP Endpoint URL <span className="font-normal">(ใส่ base URL เช่น http://ip:3002)</span></label>
                        <input
                          value={form.mcpEndpoint}
                          onChange={(e) => { setForm((f) => ({ ...f, mcpEndpoint: e.target.value })); setMcpTestResult(null); }}
                          placeholder="http://192.168.1.100:3002"
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>
                      {form.mcpEndpoint.trim() && (
                        <div className="flex gap-3 items-start">
                          <div className="flex-1">
                            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Access Mode</label>
                            <select
                              value={form.mcpAccessMode}
                              onChange={(e) => setForm((f) => ({ ...f, mcpAccessMode: e.target.value }))}
                              title="ERP Access Mode"
                              aria-label="ERP Access Mode"
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                            >
                              <option value="general">general — ทั่วไป</option>
                              <option value="admin">admin — ทุก tools</option>
                              <option value="sales">sales — ขาย</option>
                              <option value="purchase">purchase — จัดซื้อ</option>
                              <option value="stock">stock — คลัง</option>
                            </select>
                          </div>
                          <div className="mt-5">
                            <button
                              type="button"
                              onClick={testMcp}
                              disabled={mcpTesting}
                              className="px-4 py-2 rounded-lg text-xs border transition-all disabled:opacity-50"
                              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                            >
                              {mcpTesting ? "กำลังทดสอบ..." : "🔍 ทดสอบ"}
                            </button>
                          </div>
                        </div>
                      )}
                      {mcpTestResult && (
                        <div
                          className="text-xs px-3 py-2 rounded-lg border"
                          style={{
                            borderColor: mcpTestResult.ok ? "var(--success-30)" : "var(--danger-30)",
                            background: mcpTestResult.ok ? "var(--success-8)" : "var(--danger-8)",
                            color: mcpTestResult.ok ? "var(--success)" : "var(--danger)",
                          }}
                        >
                          {mcpTestResult.msg}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer: Navigation Buttons */}
            <div className="flex-shrink-0 p-4 sm:p-6 pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => {
                  const minStep = editingIsSystem ? 1 : 0;
                  formStep <= minStep ? setShowForm(false) : setFormStep(formStep - 1);
                }}
                className="px-4 py-2 rounded-lg text-sm border transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                {formStep <= (editingIsSystem ? 1 : 0) ? "ยกเลิก" : "← ย้อนกลับ"}
              </button>
              <div className="flex gap-2">
                {editingIsSystem ? (
                  formStep === 1 ? (
                    <button
                      onClick={() => setFormStep(2)}
                      className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      ถัดไป →
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      {saving ? "Saving..." : "บันทึก"}
                    </button>
                  )
                ) : formStep < (wizardMode === "easy" ? 2 : 3) ? (
                  <>
                    {formStep === 2 && (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm border transition-all disabled:opacity-50"
                        style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                      >
                        {saving ? "Saving..." : editingId ? "บันทึกเลย" : "สร้างเลย"}
                      </button>
                    )}
                    <button
                      onClick={() => setFormStep(formStep + 1)}
                      className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      ถัดไป →
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    {saving ? "Saving..." : editingId ? "บันทึก" : "สร้างที่ปรึกษา"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Knowledge Modal ─── */}
      {knowledgeAgentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg rounded-xl border shadow-xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>ฐานความรู้ — {knowledgeAgentName}</h3>
              <button onClick={() => { setKnowledgeAgentId(null); setKnowledgePreview(null); }} className="text-xl" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Upload */}
            <div className="mb-4">
              <label
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                <span className="text-sm font-bold">{knowledgeUploading ? "กำลังอัพโหลด..." : "อัพโหลดไฟล์ความรู้"}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.pdf,.docx,.txt,.md,.csv,.json"
                  disabled={knowledgeUploading}
                  onChange={handleKnowledgeUpload}
                />
              </label>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>รองรับ: xlsx, pdf, docx, txt, md, csv, json (สูงสุด 10MB)</p>
            </div>

            {/* Preview after upload */}
            {knowledgePreview && (
              <div className="mb-4 p-3 rounded-lg border text-xs" style={{ borderColor: "var(--accent-30)", background: "var(--accent-5)", color: "var(--text-muted)" }}>
                <div className="font-bold mb-1" style={{ color: "var(--accent)" }}>✅ อัพโหลดสำเร็จ: {knowledgePreview.filename}</div>
                <div>ขนาดโดยประมาณ: ~{knowledgePreview.tokens.toLocaleString()} tokens</div>
                {knowledgePreview.preview && <div className="mt-2 whitespace-pre-wrap line-clamp-4">{knowledgePreview.preview}</div>}
              </div>
            )}

            {/* File List */}
            {knowledgeFiles.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
                ยังไม่มีไฟล์ความรู้ — อัพโหลดไฟล์เพื่อให้ Agent มีบริบทเฉพาะทาง
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                  ไฟล์ทั้งหมด {knowledgeFiles.length} ไฟล์ · ~{knowledgeFiles.reduce((s: number, f: any) => s + (f.tokens || 0), 0).toLocaleString()} tokens
                </div>
                {knowledgeFiles.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{f.filename}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        ~{(f.tokens || 0).toLocaleString()} tokens · {new Date(f.uploadedAt).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleKnowledgeDelete(f.id)}
                      className="ml-3 px-2 py-1 rounded text-xs border transition-all hover:opacity-80"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setKnowledgeAgentId(null); setKnowledgePreview(null); }}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
