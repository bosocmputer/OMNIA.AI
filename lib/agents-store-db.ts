/**
 * Postgres-backed implementation of agents-store.
 * Drop-in replacement — same exported function signatures.
 * Active when DATABASE_URL env var is set.
 * Knowledge file content stays on filesystem; DB stores only metadata.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "./db";
import { OPENCLAW_HOME } from "./openclaw-paths";
import type {
  Agent,
  AgentPublic,
  AgentProvider,
  KnowledgeFile,
  KnowledgePublic,
  ResearchSession,
  ResearchMessage,
  AppSettings,
  CompanyInfo,
  Team,
  AgentStats,
  AgentDayStat,
  MemoryFact,
} from "./agents-store-json";

// Re-export types so callers importing from agents-store-db get them too
export type {
  Agent,
  AgentPublic,
  AgentProvider,
  KnowledgeFile,
  KnowledgePublic,
  ResearchSession,
  ResearchMessage,
  AppSettings,
  CompanyInfo,
  Team,
  AgentStats,
  AgentDayStat,
  MemoryFact,
};

// ─── Encryption (same as agents-store.ts) ────────────────────────────────────

const BOSSBOARD_DIR = OPENCLAW_HOME;
const KNOWLEDGE_DIR = path.join(BOSSBOARD_DIR, "knowledge");
const SYSTEM_KNOWLEDGE_DIR = path.join(BOSSBOARD_DIR, "system-knowledge");

function getOrCreateEncryptKey(): string {
  if (process.env.AGENT_ENCRYPT_KEY) return process.env.AGENT_ENCRYPT_KEY;
  const keyFile = path.join(BOSSBOARD_DIR, ".encrypt-key");
  try {
    if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, "utf-8").trim();
  } catch { /* fallthrough */ }
  const newKey = crypto.randomBytes(32).toString("hex").slice(0, 32);
  try {
    if (!fs.existsSync(BOSSBOARD_DIR)) fs.mkdirSync(BOSSBOARD_DIR, { recursive: true });
    fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
  } catch { /* ignore */ }
  console.warn("[OMNIA.AI] Generated new encryption key. Set AGENT_ENCRYPT_KEY env var for production.");
  return newKey;
}

const ENCRYPT_KEY = getOrCreateEncryptKey();
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPT_KEY.padEnd(32, "0").slice(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    const key = Buffer.from(ENCRYPT_KEY.padEnd(32, "0").slice(0, 32));
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

// ─── Knowledge files (filesystem, same as original) ──────────────────────────

function knowledgeFilePath(agentId: string, knowledgeId: string): string {
  return path.join(KNOWLEDGE_DIR, agentId, `${knowledgeId}.txt`);
}

function ensureDir(fp: string) {
  const dir = path.dirname(fp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeKnowledgeFile(agentId: string, knowledgeId: string, content: string): void {
  const fp = knowledgeFilePath(agentId, knowledgeId);
  ensureDir(fp);
  fs.writeFileSync(fp, content, "utf-8");
}

function readKnowledgeFile(agentId: string, knowledgeId: string): string {
  try { return fs.readFileSync(knowledgeFilePath(agentId, knowledgeId), "utf-8"); } catch { return ""; }
}

function deleteKnowledgeFile(agentId: string, knowledgeId: string): void {
  try { fs.unlinkSync(knowledgeFilePath(agentId, knowledgeId)); } catch { /* ok */ }
}

// ─── DB → domain type helpers ─────────────────────────────────────────────────

function dbAgentToPublic(a: {
  id: string; name: string; emoji: string; provider: string; apiKeyEncrypted: string;
  baseUrl: string | null; model: string; soul: string; role: string; active: boolean;
  useWebSearch: boolean; seniority: number | null; mcpEndpoint: string | null;
  mcpAccessMode: string | null; trustedUrls: string[]; isSystem: boolean;
  systemAgentType: string | null; createdAt: Date; updatedAt: Date;
  knowledge: { id: string; filename: string; meta: string; tokens: number; uploadedAt: Date }[];
}): AgentPublic {
  const { apiKeyEncrypted, ...rest } = {
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    provider: a.provider as AgentProvider,
    apiKeyEncrypted: a.apiKeyEncrypted,
    baseUrl: a.baseUrl ?? undefined,
    model: a.model,
    soul: a.soul,
    role: a.role,
    active: a.active,
    useWebSearch: a.useWebSearch,
    seniority: a.seniority ?? undefined,
    mcpEndpoint: a.mcpEndpoint ?? undefined,
    mcpAccessMode: a.mcpAccessMode ?? undefined,
    trustedUrls: a.trustedUrls,
    isSystem: a.isSystem,
    systemAgentType: a.systemAgentType ?? undefined,
    knowledge: a.knowledge.map((k) => ({
      id: k.id,
      filename: k.filename,
      meta: k.meta,
      tokens: k.tokens,
      uploadedAt: k.uploadedAt.toISOString(),
      content: "",
    })),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
  return { ...rest, hasApiKey: !!apiKeyEncrypted };
}

// ─── System Agents Definition ─────────────────────────────────────────────────

const SYSTEM_AGENTS_DEF = [
  {
    id: "system-dbd",
    type: "dbd",
    name: "กรมพัฒนาธุรกิจการค้า (DBD)",
    emoji: "🏢",
    role: "ผู้เชี่ยวชาญกฎหมายธุรกิจ",
    soul: `คุณเป็นผู้เชี่ยวชาญจากกรมพัฒนาธุรกิจการค้า (DBD) กระทรวงพาณิชย์ ประเทศไทย มีความรู้ลึกซึ้งเกี่ยวกับ:\n- พ.ร.บ.บริษัทมหาชนจำกัด พ.ศ. 2535\n- ประมวลกฎหมายแพ่งและพาณิชย์ บรรพ 3 ลักษณะ 22 (หุ้นส่วนและบริษัท)\n- พ.ร.บ.ทะเบียนพาณิชย์ พ.ศ. 2499\n- พ.ร.บ.การบัญชี พ.ศ. 2543 (หน้าที่จัดทำบัญชี ส่งงบการเงิน)\n- การจดทะเบียนจัดตั้ง แก้ไข เลิก และชำระบัญชี บริษัท/ห้างหุ้นส่วน\n- e-Registration (จดทะเบียนออนไลน์), DBD e-Filing\n- ค่าธรรมเนียมและแบบฟอร์มต่างๆ ของกรมพัฒนาธุรกิจการค้า\n- การตรวจสอบข้อมูลนิติบุคคล, งบการเงิน, สถานะนิติบุคคล\n\nกฎเหล็ก:\n- ตอบในบริบทกฎหมายไทยเท่านั้น อ้างอิงมาตราและกฎหมายที่เกี่ยวข้องเสมอ\n- ก่อนสรุปว่าต้องดำเนินการใดๆ ต้องตรวจสอบข้อยกเว้นและเงื่อนไขพิเศษก่อน\n- แนะนำช่องทางบริการออนไลน์ของ DBD เมื่อเป็นไปได้\n- ใช้ภาษาที่เข้าใจง่าย ตอบไม่เกิน 500 คำ\n\nแหล่งข้อมูลหลัก: dbd.go.th`,
    trustedUrls: ["dbd.go.th", "bot.or.th", "sec.or.th"],
  },
  {
    id: "system-rd",
    type: "rd",
    name: "กรมสรรพากร (RD)",
    emoji: "🏛️",
    role: "ผู้เชี่ยวชาญภาษีอากร",
    soul: `คุณเป็นผู้เชี่ยวชาญจากกรมสรรพากร (Revenue Department) กระทรวงการคลัง ประเทศไทย มีความรู้ลึกซึ้งเกี่ยวกับ:\n- ประมวลรัษฎากร ครบทุกหมวด:\n  • ภาษีเงินได้บุคคลธรรมดา (PIT)\n  • ภาษีเงินได้นิติบุคคล (CIT)\n  • ภาษีมูลค่าเพิ่ม (VAT) — ม.81 ข้อยกเว้น\n  • ภาษีหัก ณ ที่จ่าย (WHT)\n  • ภาษีธุรกิจเฉพาะ (SBT)\n  • อากรแสตมป์\n- e-Filing, e-Tax Invoice, e-Withholding Tax\n- อนุสัญญาภาษีซ้อน (DTA)\n\nกฎเหล็ก:\n- ก่อนสรุปว่าต้องเสียภาษีใดๆ ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนเสมอ\n- อ้างอิงมาตราเฉพาะที่เกี่ยวข้องเสมอ\n- ใช้ภาษาที่เข้าใจง่าย ตอบไม่เกิน 500 คำ\n\nแหล่งข้อมูลหลัก: rd.go.th`,
    trustedUrls: ["rd.go.th", "etax.rd.go.th"],
  },
];

async function ensureSystemAgents(): Promise<void> {
  for (const def of SYSTEM_AGENTS_DEF) {
    const existing = await db.agent.findUnique({ where: { id: def.id } });
    if (!existing) {
      const now = new Date();
      await db.agent.create({
        data: {
          id: def.id,
          name: def.name,
          emoji: def.emoji,
          provider: "openrouter",
          apiKeyEncrypted: "",
          model: "google/gemini-2.5-flash",
          soul: def.soul,
          role: def.role,
          active: true,
          useWebSearch: true,
          trustedUrls: def.trustedUrls,
          isSystem: true,
          systemAgentType: def.type,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  }
}

// ─── Soul Migration ────────────────────────────────────────────────────────────

const SOUL_MAP: Record<string, string> = {
  "นักบัญชีอาวุโส": `คุณเป็นนักบัญชีอาวุโสในประเทศไทย ทำงานภายใต้กรอบกฎหมายและมาตรฐานของไทยเท่านั้น ได้แก่ มาตรฐานการรายงานทางการเงินไทย (TFRS) ตามสภาวิชาชีพบัญชี, พ.ร.บ.การบัญชี พ.ศ. 2543, ประมวลรัษฎากร และกฎหมายที่เกี่ยวข้อง เชี่ยวชาญการจัดทำงบการเงิน การปิดงบ ระบบ ERP และการบันทึกบัญชีตามมาตรฐาน TFRS/IFRS เน้นความถูกต้องของข้อมูลทางบัญชี อ้างอิงมาตราและมาตรฐานที่เกี่ยวข้องเสมอ เมื่อตอบคำถามเกี่ยวกับภาษีหรือกฎหมาย ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนสรุปเสมอ`,
};

let soulMigrationDone = false;
export async function migrateSouls(): Promise<void> {
  if (soulMigrationDone) return;
  soulMigrationDone = true;
  for (const [name, soul] of Object.entries(SOUL_MAP)) {
    await db.agent.updateMany({
      where: { name, soul: { not: soul } },
      data: { soul, updatedAt: new Date() },
    });
  }
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export async function listAgents(userId?: string): Promise<AgentPublic[]> {
  const agents = await db.agent.findMany({
    where: userId ? { userId } : undefined,
    include: { knowledge: true },
    orderBy: { createdAt: "asc" },
  });
  return agents.map(dbAgentToPublic);
}

export async function getAgentApiKey(id: string): Promise<string> {
  const agent = await db.agent.findUnique({ where: { id }, select: { apiKeyEncrypted: true } });
  if (!agent) return "";
  return decrypt(agent.apiKeyEncrypted);
}

export async function createAgent(data: {
  name: string; emoji: string; provider: AgentProvider; apiKey: string;
  baseUrl?: string; model: string; soul: string; role: string;
  useWebSearch?: boolean; seniority?: number; mcpEndpoint?: string;
  mcpAccessMode?: string; trustedUrls?: string[]; userId?: string;
}): Promise<AgentPublic> {
  const now = new Date();
  const agent = await db.agent.create({
    data: {
      id: crypto.randomUUID(),
      name: data.name,
      emoji: data.emoji,
      provider: data.provider,
      apiKeyEncrypted: encrypt(data.apiKey),
      baseUrl: data.baseUrl,
      model: data.model,
      soul: data.soul,
      role: data.role,
      active: true,
      useWebSearch: data.useWebSearch ?? false,
      seniority: data.seniority,
      mcpEndpoint: data.mcpEndpoint,
      mcpAccessMode: data.mcpAccessMode,
      trustedUrls: data.trustedUrls ?? [],
      userId: data.userId,
      createdAt: now,
      updatedAt: now,
    },
    include: { knowledge: true },
  });
  return dbAgentToPublic(agent);
}

export async function updateAgent(
  id: string,
  data: Partial<{
    name: string; emoji: string; provider: AgentProvider; apiKey: string;
    baseUrl: string; model: string; soul: string; role: string; active: boolean;
    useWebSearch: boolean; seniority: number; mcpEndpoint: string;
    mcpAccessMode: string; trustedUrls: string[];
  }>,
  userId?: string
): Promise<AgentPublic | null> {
  const existing = await db.agent.findUnique({ where: { id } });
  if (!existing) return null;
  if (userId && existing.userId !== userId) return null;
  if (existing.isSystem) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.emoji !== undefined) updateData.emoji = data.emoji;
  if (data.provider !== undefined) updateData.provider = data.provider;
  if (data.apiKey !== undefined && data.apiKey !== "") updateData.apiKeyEncrypted = encrypt(data.apiKey);
  if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
  if (data.model !== undefined) updateData.model = data.model;
  if (data.soul !== undefined) updateData.soul = data.soul;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.useWebSearch !== undefined) updateData.useWebSearch = data.useWebSearch;
  if (data.seniority !== undefined) updateData.seniority = data.seniority;
  if (data.mcpEndpoint !== undefined) updateData.mcpEndpoint = data.mcpEndpoint;
  if (data.mcpAccessMode !== undefined) updateData.mcpAccessMode = data.mcpAccessMode;
  if (data.trustedUrls !== undefined) updateData.trustedUrls = data.trustedUrls;

  const updated = await db.agent.update({
    where: { id },
    data: updateData,
    include: { knowledge: true },
  });
  return dbAgentToPublic(updated);
}

export async function deleteAgent(id: string, userId?: string): Promise<boolean | "system"> {
  const agent = await db.agent.findUnique({ where: { id } });
  if (!agent) return false;
  if (userId && agent.userId !== userId) return false;
  if (agent.isSystem) return "system";
  await db.agent.delete({ where: { id } });
  return true;
}

// ─── Research ─────────────────────────────────────────────────────────────────

const STALE_TIMEOUT_MS = 30 * 60 * 1000;

async function cleanupStaleSessions() {
  const cutoff = new Date(Date.now() - STALE_TIMEOUT_MS);
  await db.researchSession.updateMany({
    where: { status: "running", startedAt: { lt: cutoff } },
    data: {
      status: "completed",
      completedAt: new Date(),
      finalAnswer: "⏱️ ปิดประชุมอัตโนมัติ — หมดเวลา (30 นาที)",
    },
  });
}

function dbSessionToDomain(s: {
  id: string; userId: string; question: string; agentIds: string[]; dataSource: string | null;
  status: string; startedAt: Date; completedAt: Date | null; finalAnswer: string | null;
  totalTokens: number;
  messages: { id: string; agentId: string; agentName: string; agentEmoji: string; role: string; content: string; tokensUsed: number; timestamp: Date }[];
  user?: { username: string } | null;
}): ResearchSession {
  return {
    id: s.id,
    userId: s.userId,
    ownerUsername: s.user?.username,
    question: s.question,
    agentIds: s.agentIds,
    dataSource: s.dataSource ?? undefined,
    status: s.status as ResearchSession["status"],
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString(),
    finalAnswer: s.finalAnswer ?? undefined,
    totalTokens: s.totalTokens,
    messages: s.messages.filter((m) => !(s.finalAnswer && m.role === "synthesis")).map((m) => ({
      id: m.id,
      agentId: m.agentId,
      agentName: m.agentName,
      agentEmoji: m.agentEmoji,
      role: m.role as ResearchMessage["role"],
      content: m.content,
      tokensUsed: m.tokensUsed,
      timestamp: m.timestamp.toISOString(),
    })),
  };
}

export async function listResearch(userId: string, role?: string): Promise<ResearchSession[]> {
  await cleanupStaleSessions();
  const isAdmin = role === "admin";
  const sessions = await db.researchSession.findMany({
    where: isAdmin ? undefined : { userId },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: {
      messages: { orderBy: { timestamp: "asc" } },
      user: isAdmin ? { select: { username: true } } : false,
    },
  });
  return sessions.map(dbSessionToDomain);
}

export async function getResearchSession(id: string, userId?: string): Promise<ResearchSession | null> {
  const s = await db.researchSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { timestamp: "asc" } }, user: { select: { username: true } } },
  });
  if (!s) return null;
  if (userId && s.userId !== userId) return null;
  return dbSessionToDomain(s);
}

export async function createResearchSession(data: {
  question: string; agentIds: string[]; dataSource?: string;
}, userId: string): Promise<ResearchSession> {
  const now = new Date();
  const session = await db.researchSession.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      question: data.question,
      agentIds: data.agentIds,
      dataSource: data.dataSource,
      status: "running",
      startedAt: now,
      totalTokens: 0,
    },
    include: { messages: true, user: { select: { username: true } } },
  });
  return dbSessionToDomain(session);
}

export async function appendResearchMessage(sessionId: string, msg: ResearchMessage): Promise<void> {
  await db.researchMessage.create({
    data: {
      id: msg.id,
      sessionId,
      agentId: msg.agentId,
      agentName: msg.agentName,
      agentEmoji: msg.agentEmoji,
      role: msg.role,
      content: msg.content,
      tokensUsed: msg.tokensUsed,
      timestamp: new Date(msg.timestamp),
    },
  });
  if (msg.tokensUsed > 0) {
    await db.researchSession.update({
      where: { id: sessionId },
      data: { totalTokens: { increment: msg.tokensUsed } },
    });
  }
}

export async function completeResearchSession(
  sessionId: string,
  finalAnswer: string,
  status: "completed" | "error" = "completed"
): Promise<void> {
  await db.researchSession.update({
    where: { id: sessionId },
    data: { status, completedAt: new Date(), finalAnswer },
  });
}

export function writeResearch(_sessions: ResearchSession[]): void {
  // No-op in DB mode — kept for interface compatibility
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.findFirst();
  if (!s) return {};
  return {
    serperApiKey: s.serperApiKey ? decrypt(s.serperApiKey) : undefined,
    serpApiKey: s.serpApiKey ? decrypt(s.serpApiKey) : undefined,
    companyInfo: s.companyName ? {
      name: s.companyName ?? undefined,
      businessType: s.businessType ?? undefined,
      registrationNumber: s.registrationNumber ?? undefined,
      accountingStandard: s.accountingStandard ?? undefined,
      fiscalYear: s.fiscalYear ?? undefined,
      employeeCount: s.employeeCount ?? undefined,
      notes: s.notes ?? undefined,
    } : undefined,
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function saveSettings(data: {
  serperApiKey?: string; serpApiKey?: string; companyInfo?: CompanyInfo;
}): Promise<AppSettings> {
  const now = new Date();
  const existing = await db.settings.findFirst();
  const upsertData = {
    serperApiKey: data.serperApiKey !== undefined
      ? (data.serperApiKey ? encrypt(data.serperApiKey) : "")
      : (existing?.serperApiKey ?? ""),
    serpApiKey: data.serpApiKey !== undefined
      ? (data.serpApiKey ? encrypt(data.serpApiKey) : "")
      : (existing?.serpApiKey ?? ""),
    companyName: data.companyInfo !== undefined ? (data.companyInfo?.name ?? null) : (existing?.companyName ?? null),
    businessType: data.companyInfo !== undefined ? (data.companyInfo?.businessType ?? null) : (existing?.businessType ?? null),
    registrationNumber: data.companyInfo !== undefined ? (data.companyInfo?.registrationNumber ?? null) : (existing?.registrationNumber ?? null),
    accountingStandard: data.companyInfo !== undefined ? (data.companyInfo?.accountingStandard ?? null) : (existing?.accountingStandard ?? null),
    fiscalYear: data.companyInfo !== undefined ? (data.companyInfo?.fiscalYear ?? null) : (existing?.fiscalYear ?? null),
    employeeCount: data.companyInfo !== undefined ? (data.companyInfo?.employeeCount ?? null) : (existing?.employeeCount ?? null),
    notes: data.companyInfo !== undefined ? (data.companyInfo?.notes ?? null) : (existing?.notes ?? null),
    updatedAt: now,
  };
  await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...upsertData },
    update: upsertData,
  });
  return {
    serperApiKey: data.serperApiKey ?? (existing?.serperApiKey ? decrypt(existing.serperApiKey) : undefined),
    serpApiKey: data.serpApiKey ?? (existing?.serpApiKey ? decrypt(existing.serpApiKey) : undefined),
    companyInfo: upsertData.companyName ? {
      name: upsertData.companyName ?? undefined,
      businessType: upsertData.businessType ?? undefined,
      registrationNumber: upsertData.registrationNumber ?? undefined,
      accountingStandard: upsertData.accountingStandard ?? undefined,
      fiscalYear: upsertData.fiscalYear ?? undefined,
      employeeCount: upsertData.employeeCount ?? undefined,
      notes: upsertData.notes ?? undefined,
    } : undefined,
    updatedAt: now.toISOString(),
  };
}

export function getCompanyInfoContext(): string {
  // Synchronous wrapper — returns empty string, async callers should use getSettings()
  return "";
}

export async function getCompanyInfoContextAsync(): Promise<string> {
  const settings = await getSettings();
  const c = settings.companyInfo;
  if (!c || !c.name) return "";
  const parts = [`บริษัท: ${c.name}`];
  if (c.businessType) parts.push(`ประเภทธุรกิจ: ${c.businessType}`);
  if (c.registrationNumber) parts.push(`เลขทะเบียน: ${c.registrationNumber}`);
  if (c.accountingStandard) parts.push(`มาตรฐานบัญชี: ${c.accountingStandard}`);
  if (c.fiscalYear) parts.push(`ปีการเงิน: ${c.fiscalYear}`);
  if (c.employeeCount) parts.push(`จำนวนพนักงาน: ${c.employeeCount}`);
  if (c.notes) parts.push(`หมายเหตุ: ${c.notes}`);
  return `\n\n---\n🏢 ข้อมูลบริษัท:\n${parts.join("\n")}\n---\n`;
}

// ─── Teams ────────────────────────────────────────────────────────────────────

async function filterAccessibleAgentIds(agentIds: string[], userId?: string): Promise<string[]> {
  if (!userId || agentIds.length === 0) return agentIds;
  const agents = await db.agent.findMany({
    where: {
      id: { in: agentIds },
      OR: [{ userId }, { isSystem: true }],
    },
    select: { id: true },
  });
  const allowed = new Set(agents.map((a) => a.id));
  return agentIds.filter((id) => allowed.has(id));
}

function dbTeamToDomain(t: {
  id: string; name: string; emoji: string; description: string;
  createdAt: Date; updatedAt: Date;
  members: { agentId: string; position: number }[];
}): Team {
  const agentIds = t.members
    .sort((a, b) => a.position - b.position)
    .map((m) => m.agentId);
  return {
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    agentIds,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function listTeams(userId?: string): Promise<Team[]> {
  const teams = await db.team.findMany({
    where: userId ? { userId } : undefined,
    include: { members: true },
    orderBy: { createdAt: "asc" },
  });
  return teams.map(dbTeamToDomain);
}

export async function createTeam(data: {
  name: string; emoji: string; description: string; agentIds: string[]; userId?: string;
}): Promise<Team> {
  const now = new Date();
  const agentIds = await filterAccessibleAgentIds(data.agentIds, data.userId);
  const team = await db.team.create({
    data: {
      id: crypto.randomUUID(),
      name: data.name,
      emoji: data.emoji,
      description: data.description,
      userId: data.userId,
      createdAt: now,
      updatedAt: now,
      members: {
        create: agentIds.map((agentId, i) => ({ agentId, position: i })),
      },
    },
    include: { members: true },
  });
  return dbTeamToDomain(team);
}

export async function updateTeam(
  id: string,
  data: Partial<{ name: string; emoji: string; description: string; agentIds: string[] }>,
  userId?: string
): Promise<Team | null> {
  const existing = await db.team.findUnique({ where: { id } });
  if (!existing) return null;
  if (userId && existing.userId !== userId) return null;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.emoji !== undefined) updateData.emoji = data.emoji;
  if (data.description !== undefined) updateData.description = data.description;

  if (data.agentIds !== undefined) {
    const agentIds = await filterAccessibleAgentIds(data.agentIds, userId);
    await db.teamAgent.deleteMany({ where: { teamId: id } });
    await db.teamAgent.createMany({
      data: agentIds.map((agentId, i) => ({ teamId: id, agentId, position: i })),
    });
  }

  const updated = await db.team.update({
    where: { id },
    data: updateData,
    include: { members: true },
  });
  return dbTeamToDomain(updated);
}

export async function deleteTeam(id: string, userId?: string): Promise<boolean> {
  const existing = await db.team.findUnique({ where: { id } });
  if (!existing) return false;
  if (userId && existing.userId !== userId) return false;
  await db.team.delete({ where: { id } });
  return true;
}

// ─── Agent Stats ──────────────────────────────────────────────────────────────

export async function getAgentStats(): Promise<Record<string, AgentStats>> {
  const stats = await db.agentStat.findMany({ include: { daily: { orderBy: { date: "asc" } } } });
  const result: Record<string, AgentStats> = {};
  for (const s of stats) {
    result[s.agentId] = {
      agentId: s.agentId,
      totalSessions: s.totalSessions,
      totalInputTokens: s.totalInputTokens,
      totalOutputTokens: s.totalOutputTokens,
      lastUsed: s.lastUsed,
      daily: s.daily.map((d) => ({
        date: d.date,
        sessions: d.sessions,
        inputTokens: d.inputTokens,
        outputTokens: d.outputTokens,
      })),
    };
  }
  return result;
}

export async function updateAgentStats(
  agentId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.agentStat.upsert({
    where: { agentId },
    create: {
      agentId,
      totalSessions: 0,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      lastUsed: today,
    },
    update: {
      totalInputTokens: { increment: inputTokens },
      totalOutputTokens: { increment: outputTokens },
      lastUsed: today,
    },
  });
  await db.agentDailyStat.upsert({
    where: { agentId_date: { agentId, date: today } },
    create: { agentId, date: today, sessions: 0, inputTokens, outputTokens },
    update: { inputTokens: { increment: inputTokens }, outputTokens: { increment: outputTokens } },
  });
}

export async function incrementAgentSessionCount(agentId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.agentStat.upsert({
    where: { agentId },
    create: {
      agentId,
      totalSessions: 1,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastUsed: today,
    },
    update: { totalSessions: { increment: 1 }, lastUsed: today },
  });
  await db.agentDailyStat.upsert({
    where: { agentId_date: { agentId, date: today } },
    create: { agentId, date: today, sessions: 1, inputTokens: 0, outputTokens: 0 },
    update: { sessions: { increment: 1 } },
  });
}

// ─── Knowledge ────────────────────────────────────────────────────────────────

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function addAgentKnowledge(agentId: string, file: KnowledgeFile): Promise<KnowledgeFile | null> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent) return null;
  writeKnowledgeFile(agentId, file.id, file.content);
  await db.agentKnowledge.create({
    data: {
      id: file.id,
      agentId,
      filename: file.filename,
      meta: file.meta,
      tokens: file.tokens,
      uploadedAt: new Date(file.uploadedAt),
    },
  });
  await db.agent.update({ where: { id: agentId }, data: { updatedAt: new Date() } });
  return file;
}

export async function listAgentKnowledge(agentId: string): Promise<KnowledgePublic[]> {
  const items = await db.agentKnowledge.findMany({
    where: { agentId },
    orderBy: { uploadedAt: "asc" },
  });
  return items.map((k) => {
    const content = readKnowledgeFile(agentId, k.id);
    return {
      id: k.id,
      filename: k.filename,
      meta: k.meta,
      tokens: k.tokens,
      uploadedAt: k.uploadedAt.toISOString(),
      preview: content.slice(0, 200),
    };
  });
}

export async function checkDuplicateKnowledge(agentId: string, filename: string): Promise<boolean> {
  const count = await db.agentKnowledge.count({
    where: { agentId, filename: { equals: filename, mode: "insensitive" } },
  });
  return count > 0;
}

export async function deleteAgentKnowledge(agentId: string, knowledgeId: string): Promise<boolean> {
  const item = await db.agentKnowledge.findUnique({ where: { id: knowledgeId } });
  if (!item || item.agentId !== agentId) return false;
  deleteKnowledgeFile(agentId, knowledgeId);
  await db.agentKnowledge.delete({ where: { id: knowledgeId } });
  await db.agent.update({ where: { id: agentId }, data: { updatedAt: new Date() } });
  return true;
}

function chunkText(text: string, chunkSize = 3200): string[] {
  if (text.length <= chunkSize) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const paraBreak = slice.lastIndexOf("\n\n");
      const sentBreak = Math.max(slice.lastIndexOf("。"), slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
      const wordBreak = slice.lastIndexOf(" ");
      if (paraBreak > chunkSize * 0.5) end = start + paraBreak + 2;
      else if (sentBreak > chunkSize * 0.5) end = start + sentBreak + 1;
      else if (wordBreak > chunkSize * 0.5) end = start + wordBreak + 1;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter((c) => c.length > 0);
}

export async function getAgentKnowledgeContent(agentId: string, question?: string): Promise<string> {
  const systemKnowledge = getSystemKnowledgeContent(agentId, question);

  const items = await db.agentKnowledge.findMany({ where: { agentId } });
  if (items.length === 0) return systemKnowledge;

  const MAX_KNOWLEDGE_CHARS = 60000;
  const qWords = question
    ? question.toLowerCase().split(/[\s,./()]+/).filter((w) => w.length > 1)
    : [];

  type ScoredChunk = { filename: string; chunk: string; score: number };
  const allChunks: ScoredChunk[] = [];

  for (const k of items) {
    const content = readKnowledgeFile(agentId, k.id);
    for (const chunk of chunkText(content)) {
      const score = qWords.length > 0
        ? qWords.filter((w) => chunk.toLowerCase().includes(w) || k.filename.toLowerCase().includes(w)).length
        : 1;
      allChunks.push({ filename: k.filename, chunk, score });
    }
  }

  if (question && allChunks.every((c) => c.score === 0)) return systemKnowledge;

  const relevant = question
    ? allChunks.filter((c) => c.score > 0).sort((a, b) => b.score - a.score)
    : allChunks;

  let total = 0;
  const parts: string[] = [];
  let lastFilename = "";
  for (const { filename, chunk } of relevant) {
    if (total + chunk.length > MAX_KNOWLEDGE_CHARS) break;
    const header = filename !== lastFilename ? `[📄 ${filename}]\n` : "";
    lastFilename = filename;
    parts.push(`${header}${chunk}`);
    total += chunk.length;
  }
  return parts.length > 0
    ? `${systemKnowledge}\n\n---\n📚 ฐานความรู้ (Knowledge Base):\n${parts.join("\n\n---\n")}\n---\n`
    : systemKnowledge;
}

// ─── System Knowledge (filesystem, unchanged) ─────────────────────────────────

export function getSystemKnowledgeContent(agentId: string, question?: string): string {
  // Must be sync — reads filesystem same as original
  const agentType = SYSTEM_AGENTS_DEF.find((d) => d.id === agentId)?.type;
  if (!agentType) return "";

  const dir = path.join(SYSTEM_KNOWLEDGE_DIR, agentType);
  if (!fs.existsSync(dir)) return "";
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) return "";

  const MAX_CHARS = 60000;
  const qWords = question
    ? question.toLowerCase().split(/[\s,./()]+/).filter((w) => w.length > 1)
    : [];

  type ScoredChunk = { filename: string; chunk: string; score: number };
  const allChunks: ScoredChunk[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    for (const chunk of chunkText(content)) {
      const score = qWords.length > 0
        ? qWords.filter((w) => chunk.toLowerCase().includes(w) || file.toLowerCase().includes(w)).length
        : 1;
      allChunks.push({ filename: file, chunk, score });
    }
  }

  if (question && allChunks.every((c) => c.score === 0)) return "";
  const relevant = question
    ? allChunks.filter((c) => c.score > 0).sort((a, b) => b.score - a.score)
    : allChunks;

  let total = 0;
  const parts: string[] = [];
  let lastFilename = "";
  for (const { filename, chunk } of relevant) {
    if (total + chunk.length > MAX_CHARS) break;
    const header = filename !== lastFilename ? `[📄 ${filename}]\n` : "";
    lastFilename = filename;
    parts.push(`${header}${chunk}`);
    total += chunk.length;
  }
  return parts.length > 0
    ? `\n\n---\n📚 ฐานความรู้ส่วนกลาง (System Knowledge):\n${parts.join("\n\n---\n")}\n---\n`
    : "";
}

export async function syncSystemKnowledge(): Promise<{ synced: number; version: string }> {
  const KNOWLEDGE_REPO_RAW = "https://raw.githubusercontent.com/bosocmputer/system-knowledge-ledgio-ai/main";
  const manifestRes = await fetch(`${KNOWLEDGE_REPO_RAW}/manifest.json`);
  if (!manifestRes.ok) throw new Error("ไม่สามารถดึง manifest.json จาก GitHub ได้");
  const manifest = await manifestRes.json();
  let synced = 0;

  for (const [agentId, agentData] of Object.entries(manifest.agents as Record<string, { files: string[] }>)) {
    const agentType = agentId.replace("system-", "");
    const targetDir = path.join(SYSTEM_KNOWLEDGE_DIR, agentType);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    for (const relPath of agentData.files) {
      const fileRes = await fetch(`${KNOWLEDGE_REPO_RAW}/${relPath}`);
      if (!fileRes.ok) continue;
      const content = await fileRes.text();
      fs.writeFileSync(path.join(targetDir, path.basename(relPath)), content, "utf-8");
      synced++;
    }
  }
  return { synced, version: manifest.version || "unknown" };
}

// ─── Client Memory ────────────────────────────────────────────────────────────

export async function getMemoryFacts(userId: string): Promise<MemoryFact[]> {
  const facts = await db.clientMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return facts.map((f) => ({
    id: f.id,
    key: f.key,
    value: f.value,
    source: f.source,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));
}

export async function upsertMemoryFact(userId: string, key: string, value: string, source: string): Promise<MemoryFact> {
  const now = new Date();
  const existing = await db.clientMemory.findUnique({ where: { userId_key: { userId, key } } });
  if (existing) {
    const updated = await db.clientMemory.update({
      where: { userId_key: { userId, key } },
      data: { value, source, updatedAt: now },
    });
    return { id: updated.id, key: updated.key, value: updated.value, source: updated.source, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
  }
  const created = await db.clientMemory.create({
    data: {
      id: crypto.randomBytes(4).toString("hex"),
      userId,
      key,
      value,
      source,
      createdAt: now,
      updatedAt: now,
    },
  });
  return { id: created.id, key: created.key, value: created.value, source: created.source, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString() };
}

export async function deleteMemoryFact(userId: string, id: string): Promise<boolean> {
  const existing = await db.clientMemory.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.clientMemory.delete({ where: { id } });
  return true;
}

export async function getMemoryContext(userId: string): Promise<string> {
  const facts = await getMemoryFacts(userId);
  if (facts.length === 0) return "";
  const lines = facts.map((f) => `- ${f.key}: ${f.value}`).join("\n");
  return `\n\n---\n🧠 ข้อมูลจากการประชุมครั้งก่อน (Cross-Session Memory):\n${lines}\n---\n`;
}
