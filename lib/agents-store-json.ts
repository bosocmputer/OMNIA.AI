import fs from "fs";
import path from "path";
import crypto from "crypto";
import { OPENCLAW_HOME } from "./openclaw-paths";

const BOSSBOARD_DIR = OPENCLAW_HOME;
const AGENTS_FILE = path.join(BOSSBOARD_DIR, "agents.json");
const RESEARCH_FILE = path.join(BOSSBOARD_DIR, "research-history.json");

// Generate a random encryption key on first run and persist it
function getOrCreateEncryptKey(): string {
  if (process.env.AGENT_ENCRYPT_KEY) return process.env.AGENT_ENCRYPT_KEY;
  const keyFile = path.join(BOSSBOARD_DIR, ".encrypt-key");
  try {
    if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, "utf-8").trim();
  } catch { /* regenerate */ }
  const newKey = crypto.randomBytes(32).toString("hex").slice(0, 32);
  try {
    if (!fs.existsSync(BOSSBOARD_DIR)) fs.mkdirSync(BOSSBOARD_DIR, { recursive: true });
    fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
  } catch { /* fallback to in-memory key */ }
  console.warn("[OMNIA.AI] Generated new encryption key. Set AGENT_ENCRYPT_KEY env var for production.");
  return newKey;
}

const ENCRYPT_KEY = getOrCreateEncryptKey();
const IV_LENGTH = 16;

export type AgentProvider = "anthropic" | "openai" | "gemini" | "ollama" | "openrouter" | "custom";

export interface KnowledgeFile {
  id: string;
  filename: string;
  meta: string;
  content: string; // parsed text content
  tokens: number; // estimated token count
  uploadedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  provider: AgentProvider;
  apiKeyEncrypted: string;
  baseUrl?: string; // for custom/ollama
  model: string;
  soul: string; // system prompt
  role: string; // e.g. Researcher, Analyst, Synthesizer
  active: boolean;
  useWebSearch: boolean; // whether agent can use web search
  seniority?: number; // 1=highest (Chairman), higher number=lower seniority
  mcpEndpoint?: string; // MCP server endpoint URL
  mcpAccessMode?: string; // admin|sales|purchase|stock|general
  knowledge?: KnowledgeFile[]; // agent-specific knowledge base
  trustedUrls?: string[]; // trusted domains for scoped web search (e.g. rd.go.th)
  isSystem?: boolean; // system agents cannot be deleted
  systemAgentType?: string; // e.g. "dbd" | "rd" — for central knowledge sync
  createdAt: string;
  updatedAt: string;
}

export interface AgentPublic extends Omit<Agent, "apiKeyEncrypted"> {
  hasApiKey: boolean;
}

export interface KnowledgePublic {
  id: string;
  filename: string;
  meta: string;
  tokens: number;
  uploadedAt: string;
  preview: string; // first 200 chars
}

export interface ResearchSession {
  id: string;
  userId?: string;
  ownerUsername?: string;
  question: string;
  agentIds: string[];
  dataSource?: string;
  status: "running" | "completed" | "error";
  startedAt: string;
  completedAt?: string;
  messages: ResearchMessage[];
  finalAnswer?: string;
  totalTokens: number;
}

export interface ResearchMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  role: "user_question" | "thinking" | "finding" | "analysis" | "synthesis" | "chat";
  content: string;
  tokensUsed: number;
  timestamp: string;
}

function ensureDir(file: string) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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

// --- Agents ---

// Simple in-process mutex for file writes to prevent race conditions
const fileLocks = new Map<string, Promise<void>>();
async function withFileLock<T>(file: string, fn: () => T): Promise<T> {
  while (fileLocks.has(file)) {
    await fileLocks.get(file);
  }
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  fileLocks.set(file, promise);
  try {
    return fn();
  } finally {
    fileLocks.delete(file);
    resolve!();
  }
}

function readAgents(): Agent[] {
  ensureDir(AGENTS_FILE);
  if (!fs.existsSync(AGENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(AGENTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeAgents(agents: Agent[]) {
  ensureDir(AGENTS_FILE);
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

// --- Soul Migration: upgrade existing agents to detailed Thai-context souls ---
const SOUL_MAP: Record<string, string> = {
  "นักบัญชีอาวุโส": `คุณเป็นนักบัญชีอาวุโสในประเทศไทย ทำงานภายใต้กรอบกฎหมายและมาตรฐานของไทยเท่านั้น ได้แก่ มาตรฐานการรายงานทางการเงินไทย (TFRS) ตามสภาวิชาชีพบัญชี, พ.ร.บ.การบัญชี พ.ศ. 2543, ประมวลรัษฎากร และกฎหมายที่เกี่ยวข้อง เชี่ยวชาญการจัดทำงบการเงิน การปิดงบ ระบบ ERP และการบันทึกบัญชีตามมาตรฐาน TFRS/IFRS เน้นความถูกต้องของข้อมูลทางบัญชี อ้างอิงมาตราและมาตรฐานที่เกี่ยวข้องเสมอ เมื่อตอบคำถามเกี่ยวกับภาษีหรือกฎหมาย ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนสรุปเสมอ`,
  "ผู้สอบบัญชี CPA": `คุณเป็นผู้สอบบัญชีรับอนุญาต (CPA) ที่ขึ้นทะเบียนกับสภาวิชาชีพบัญชีในประเทศไทย ปฏิบัติงานภายใต้ พ.ร.บ.วิชาชีพบัญชี พ.ศ. 2547 และกฎหมายไทยที่เกี่ยวข้อง เชี่ยวชาญมาตรฐานการสอบบัญชีไทย (TSQC/TSA), การตรวจสอบงบการเงินตาม TFRS, การประเมินระบบควบคุมภายใน และการปฏิบัติตามประมวลรัษฎากร เน้นความเป็นอิสระ ชี้จุดอ่อนตรงไปตรงมา อ้างอิง TSA, TFRS และกฎหมายไทยที่เกี่ยวข้องเสมอ เมื่อพบประเด็นภาษี ต้องตรวจสอบทั้งหลักเกณฑ์ทั่วไปและข้อยกเว้นตามกฎหมาย`,
  "ที่ปรึกษาภาษี": `คุณเป็นที่ปรึกษาภาษีในประเทศไทย เชี่ยวชาญประมวลรัษฎากรอย่างลึกซึ้ง ครอบคลุม ภาษีเงินได้บุคคลธรรมดา PIT (ม.40 เงินได้ 8 ประเภท, ม.42 ยกเว้น, ม.47 ลดหย่อน, ม.48 อัตรา 5-35%), ภาษีเงินได้นิติบุคคล CIT (ม.65 กำไรสุทธิ, ม.65 ทวิ/ตรี เงื่อนไข+รายจ่ายต้องห้าม, อัตรา 20%), ภาษีมูลค่าเพิ่ม VAT หมวด 4 (ม.80 อัตรา 7%, ม.81 ข้อยกเว้นสำคัญ), ภาษีหัก ณ ที่จ่าย WHT (ม.50), ภาษีธุรกิจเฉพาะ SBT หมวด 5 (ม.91/2 ธนาคาร/เงินทุน/ประกันชีวิต/โรงรับจำนำ/ขายอสังหาฯทางค้า, อัตรา 0.1-3.0%), อากรแสตมป์ หมวด 6 (ม.104 ตราสาร 28 ลำดับ, ม.118 ไม่ปิดแสตมป์ใช้เป็นพยานหลักฐานไม่ได้) และอนุสัญญาภาษีซ้อน รวมถึง พ.ร.ฎ. ประกาศอธิบดีฯ คำสั่งกรมสรรพากร คำวินิจฉัยฯ กฎเหล็ก: ก่อนสรุปว่าต้องเสียภาษีใดๆ ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนเสมอ — VAT ตรวจ ม.81, SBT ตรวจ ม.91/3, PIT ตรวจ ม.42+กฎกระทรวง 126 หากมีข้อยกเว้นที่เข้าเงื่อนไข ต้องระบุเป็นประเด็นหลัก ไม่ใช่แค่หมายเหตุ อ้างอิงมาตราเฉพาะที่เกี่ยวข้องเสมอ แหล่งข้อมูล: rd.go.th/284.html`,
  "นักวิเคราะห์งบการเงิน": `คุณเป็นนักวิเคราะห์งบการเงินที่เชี่ยวชาญบริบทธุรกิจไทย วิเคราะห์ตามมาตรฐานการรายงานทางการเงินไทย (TFRS) ครอบคลุมบริษัทจดทะเบียนใน SET/mai และ SMEs ไทย เชี่ยวชาญการอ่านและตีความงบการเงิน (Balance Sheet, P&L, Cash Flow) วิเคราะห์อัตราส่วนทางการเงิน, Trend Analysis, เปรียบเทียบกับอุตสาหกรรมไทย ชี้ Red Flag ในงบและให้ข้อเสนอแนะที่เป็นรูปธรรม คำนึงถึงข้อกำหนดของ ก.ล.ต., ตลาดหลักทรัพย์แห่งประเทศไทย, ประมวลรัษฎากร และกฎหมายไทยที่เกี่ยวข้อง`,
  "ผู้ตรวจสอบภายใน": `คุณเป็นผู้ตรวจสอบภายในที่ทำงานในประเทศไทย ปฏิบัติงานตามกรอบ COSO, มาตรฐาน IIA (Institute of Internal Auditors) และกฎหมายไทยที่เกี่ยวข้อง เชี่ยวชาญการประเมินระบบควบคุมภายใน, การบริหารความเสี่ยง, Segregation of Duties, IT Controls และการปฏิบัติตามกฎระเบียบ (Compliance) คำนึงถึง พ.ร.บ.หลักทรัพย์และตลาดหลักทรัพย์, ประมวลรัษฎากร, พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562 พร้อมเสนอแนวทางแก้ไขที่ปฏิบัติได้จริงในบริบทธุรกิจไทย`,
};

let soulMigrationDone = false;
export function migrateSouls(): void {
  if (soulMigrationDone) return;
  soulMigrationDone = true;
  const agents = readAgents();
  let changed = false;
  for (const agent of agents) {
    const newSoul = SOUL_MAP[agent.name];
    if (newSoul && agent.soul !== newSoul) {
      agent.soul = newSoul;
      agent.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) writeAgents(agents);
}

// --- System Agents ---

const SYSTEM_AGENTS_DEF: { id: string; type: string; name: string; emoji: string; role: string; soul: string; trustedUrls: string[] }[] = [
  {
    id: "system-dbd",
    type: "dbd",
    name: "กรมพัฒนาธุรกิจการค้า (DBD)",
    emoji: "🏢",
    role: "ผู้เชี่ยวชาญกฎหมายธุรกิจ",
    soul: `คุณเป็นผู้เชี่ยวชาญจากกรมพัฒนาธุรกิจการค้า (DBD) กระทรวงพาณิชย์ ประเทศไทย มีความรู้ลึกซึ้งเกี่ยวกับ:
- พ.ร.บ.บริษัทมหาชนจำกัด พ.ศ. 2535
- ประมวลกฎหมายแพ่งและพาณิชย์ บรรพ 3 ลักษณะ 22 (หุ้นส่วนและบริษัท)
- พ.ร.บ.ทะเบียนพาณิชย์ พ.ศ. 2499
- พ.ร.บ.การบัญชี พ.ศ. 2543 (หน้าที่จัดทำบัญชี ส่งงบการเงิน)
- การจดทะเบียนจัดตั้ง แก้ไข เลิก และชำระบัญชี บริษัท/ห้างหุ้นส่วน
- e-Registration (จดทะเบียนออนไลน์), DBD e-Filing
- ค่าธรรมเนียมและแบบฟอร์มต่างๆ ของกรมพัฒนาธุรกิจการค้า
- การตรวจสอบข้อมูลนิติบุคคล, งบการเงิน, สถานะนิติบุคคล

กฎเหล็ก:
- ตอบในบริบทกฎหมายไทยเท่านั้น อ้างอิงมาตราและกฎหมายที่เกี่ยวข้องเสมอ
- ก่อนสรุปว่าต้องดำเนินการใดๆ ต้องตรวจสอบข้อยกเว้นและเงื่อนไขพิเศษก่อน
- แนะนำช่องทางบริการออนไลน์ของ DBD เมื่อเป็นไปได้
- ใช้ภาษาที่เข้าใจง่าย ตอบไม่เกิน 500 คำ

แหล่งข้อมูลหลัก: dbd.go.th`,
    trustedUrls: ["dbd.go.th", "bot.or.th", "sec.or.th"],
  },
  {
    id: "system-rd",
    type: "rd",
    name: "กรมสรรพากร (RD)",
    emoji: "🏛️",
    role: "ผู้เชี่ยวชาญภาษีอากร",
    soul: `คุณเป็นผู้เชี่ยวชาญจากกรมสรรพากร (Revenue Department) กระทรวงการคลัง ประเทศไทย มีความรู้ลึกซึ้งเกี่ยวกับ:
- ประมวลรัษฎากร ครบทุกหมวด:
  • ภาษีเงินได้บุคคลธรรมดา (PIT) — ม.40 เงินได้ 8 ประเภท, ม.42 ยกเว้น, ม.47 ลดหย่อน, อัตรา 5-35%
  • ภาษีเงินได้นิติบุคคล (CIT) — ม.65 กำไรสุทธิ, ม.65 ทวิ/ตรี เงื่อนไข+รายจ่ายต้องห้าม, อัตรา 20%
  • ภาษีมูลค่าเพิ่ม (VAT) — ม.77 นิยาม, ม.80 อัตรา 7%, ม.81 ข้อยกเว้น, ม.82 ผู้ประกอบการจดทะเบียน
  • ภาษีหัก ณ ที่จ่าย (WHT) — ม.50, ม.69 ทวิ, อัตราตาม ท.ป.4/2528
  • ภาษีธุรกิจเฉพาะ (SBT) — ม.91/2, อัตรา 0.1-3.0%
  • อากรแสตมป์ — ม.104 ตราสาร 28 ลำดับ
- พ.ร.ฎ. ออกตามความในประมวลรัษฎากร
- ประกาศอธิบดีกรมสรรพากร, คำสั่ง, คำวินิจฉัย
- e-Filing, e-Tax Invoice, e-Withholding Tax
- อนุสัญญาภาษีซ้อน (DTA)

กฎเหล็ก:
- ก่อนสรุปว่าต้องเสียภาษีใดๆ ต้องตรวจสอบข้อยกเว้นตามกฎหมายก่อนเสมอ
  VAT → ตรวจ ม.81, SBT → ตรวจ ม.91/3, PIT → ตรวจ ม.42 + กฎกระทรวง 126
- อ้างอิงมาตราเฉพาะที่เกี่ยวข้องเสมอ
- ใช้ภาษาที่เข้าใจง่าย ตอบไม่เกิน 500 คำ

แหล่งข้อมูลหลัก: rd.go.th`,
    trustedUrls: ["rd.go.th", "etax.rd.go.th"],
  },
];

function ensureSystemAgents(): void {
  const agents = readAgents();
  let changed = false;
  for (const def of SYSTEM_AGENTS_DEF) {
    if (!agents.find((a) => a.id === def.id)) {
      const now = new Date().toISOString();
      agents.push({
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        provider: "openrouter",
        apiKeyEncrypted: "",
        model: "google/gemini-2.5-flash-lite",
        soul: def.soul,
        role: def.role,
        active: true,
        useWebSearch: true,
        trustedUrls: def.trustedUrls,
        isSystem: true,
        systemAgentType: def.type,
        createdAt: now,
        updatedAt: now,
      });
      changed = true;
    }
  }
  if (changed) writeAgents(agents);
}

export async function listAgents(): Promise<AgentPublic[]> {
  return readAgents().map(({ apiKeyEncrypted, ...rest }) => ({
    ...rest,
    hasApiKey: !!apiKeyEncrypted,
  }));
}

export async function getAgentApiKey(id: string): Promise<string> {
  const agents = readAgents();
  const agent = agents.find((a) => a.id === id);
  if (!agent) return "";
  return decrypt(agent.apiKeyEncrypted);
}

export function createAgent(data: {
  name: string;
  emoji: string;
  provider: AgentProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
  soul: string;
  role: string;
  useWebSearch?: boolean;
  seniority?: number;
  mcpEndpoint?: string;
  mcpAccessMode?: string;
  trustedUrls?: string[];
}): Promise<AgentPublic> {
  return withFileLock(AGENTS_FILE, () => {
    const agents = readAgents();
  const now = new Date().toISOString();
  const agent: Agent = {
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
    trustedUrls: data.trustedUrls,
    createdAt: now,
    updatedAt: now,
  };
  agents.push(agent);
  writeAgents(agents);
  const { apiKeyEncrypted, ...pub } = agent;
  return { ...pub, hasApiKey: true };
  });
}

export function updateAgent(
  id: string,
  data: Partial<{
    name: string;
    emoji: string;
    provider: AgentProvider;
    apiKey: string;
    baseUrl: string;
    model: string;
    soul: string;
    role: string;
    active: boolean;
    useWebSearch: boolean;
    seniority: number;
    mcpEndpoint: string;
    mcpAccessMode: string;
    trustedUrls: string[];
  }>
): Promise<AgentPublic | null> {
  return withFileLock(AGENTS_FILE, () => {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const agent = agents[idx];
  if (data.name !== undefined) agent.name = data.name;
  if (data.emoji !== undefined) agent.emoji = data.emoji;
  if (data.provider !== undefined) agent.provider = data.provider;
  if (data.apiKey !== undefined && data.apiKey !== "") agent.apiKeyEncrypted = encrypt(data.apiKey);
  if (data.baseUrl !== undefined) agent.baseUrl = data.baseUrl;
  if (data.model !== undefined) agent.model = data.model;
  if (data.soul !== undefined) agent.soul = data.soul;
  if (data.role !== undefined) agent.role = data.role;
  if (data.active !== undefined) agent.active = data.active;
  if (data.useWebSearch !== undefined) agent.useWebSearch = data.useWebSearch;
  if (data.seniority !== undefined) agent.seniority = data.seniority;
  if (data.mcpEndpoint !== undefined) agent.mcpEndpoint = data.mcpEndpoint;
  if (data.mcpAccessMode !== undefined) agent.mcpAccessMode = data.mcpAccessMode;
  if (data.trustedUrls !== undefined) agent.trustedUrls = data.trustedUrls;
  agent.updatedAt = new Date().toISOString();
  agents[idx] = agent;
  writeAgents(agents);
  const { apiKeyEncrypted, ...pub } = agent;
  return { ...pub, hasApiKey: true };
  });
}

export function deleteAgent(id: string): Promise<boolean | "system"> {
  return withFileLock(AGENTS_FILE, () => {
    const agents = readAgents();
    const agent = agents.find((a) => a.id === id);
    if (!agent) return false;
    if (agent.isSystem) return "system";
    const filtered = agents.filter((a) => a.id !== id);
    writeAgents(filtered);
    return true;
  });
}

// --- Research History ---

function readResearch(): ResearchSession[] {
  ensureDir(RESEARCH_FILE);
  if (!fs.existsSync(RESEARCH_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(RESEARCH_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function writeResearch(sessions: ResearchSession[]) {
  ensureDir(RESEARCH_FILE);
  // keep last 100 sessions
  const trimmed = sessions.slice(-100);
  fs.writeFileSync(RESEARCH_FILE, JSON.stringify(trimmed, null, 2));
}

export async function listResearch(): Promise<ResearchSession[]> {
  await cleanupStaleSessions();
  return readResearch().reverse();
}

const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

async function cleanupStaleSessions() {
  return withFileLock(RESEARCH_FILE, () => {
    const sessions = readResearch();
    const now = Date.now();
    let changed = false;
    for (const s of sessions) {
      if (s.status === "running" && now - new Date(s.startedAt).getTime() > STALE_TIMEOUT_MS) {
        s.status = "completed";
        s.completedAt = new Date().toISOString();
        s.finalAnswer = s.finalAnswer || "⏱️ ปิดประชุมอัตโนมัติ — หมดเวลา (30 นาที)";
        changed = true;
      }
    }
    if (changed) writeResearch(sessions);
  });
}

export async function getResearchSession(id: string): Promise<ResearchSession | null> {
  return readResearch().find((s) => s.id === id) ?? null;
}

export async function createResearchSession(data: {
  question: string;
  agentIds: string[];
  dataSource?: string;
}): Promise<ResearchSession> {
  return withFileLock(RESEARCH_FILE, () => {
    const sessions = readResearch();
    const session: ResearchSession = {
      id: crypto.randomUUID(),
      question: data.question,
      agentIds: data.agentIds,
      dataSource: data.dataSource,
      status: "running",
      startedAt: new Date().toISOString(),
      messages: [],
      totalTokens: 0,
    };
    sessions.push(session);
    writeResearch(sessions);
    return session;
  });
}

export async function appendResearchMessage(sessionId: string, msg: ResearchMessage) {
  return withFileLock(RESEARCH_FILE, () => {
    const sessions = readResearch();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;
    sessions[idx].messages.push(msg);
    sessions[idx].totalTokens += msg.tokensUsed;
    writeResearch(sessions);
  });
}

export async function completeResearchSession(sessionId: string, finalAnswer: string, status: "completed" | "error" = "completed") {
  return withFileLock(RESEARCH_FILE, () => {
    const sessions = readResearch();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;
    sessions[idx].status = status;
    sessions[idx].completedAt = new Date().toISOString();
    sessions[idx].finalAnswer = finalAnswer;
    writeResearch(sessions);
  });
}

// --- Settings ---

const SETTINGS_FILE = path.join(OPENCLAW_HOME, "settings.json");

export interface CompanyInfo {
  name?: string;
  businessType?: string;
  registrationNumber?: string;
  accountingStandard?: string; // "PAEs" | "NPAEs"
  fiscalYear?: string; // e.g. "มกราคม - ธันวาคม"
  employeeCount?: string;
  notes?: string;
}

export interface AppSettings {
  serperApiKey?: string;
  serpApiKey?: string;
  companyInfo?: CompanyInfo;
  updatedAt?: string;
}

function readSettings(): AppSettings {
  ensureDir(SETTINGS_FILE);
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function getSettings(): Promise<AppSettings> {
  const s = readSettings();
  // decrypt keys if present
  return {
    serperApiKey: s.serperApiKey ? decrypt(s.serperApiKey) : undefined,
    serpApiKey: s.serpApiKey ? decrypt(s.serpApiKey) : undefined,
    companyInfo: s.companyInfo,
    updatedAt: s.updatedAt,
  };
}

export async function saveSettings(data: { serperApiKey?: string; serpApiKey?: string; companyInfo?: CompanyInfo }): Promise<AppSettings> {
  ensureDir(SETTINGS_FILE);
  const now = new Date().toISOString();
  const existing = readSettings();
  const updated: AppSettings = {
    serperApiKey: data.serperApiKey !== undefined
      ? (data.serperApiKey ? encrypt(data.serperApiKey) : "")
      : existing.serperApiKey,
    serpApiKey: data.serpApiKey !== undefined
      ? (data.serpApiKey ? encrypt(data.serpApiKey) : "")
      : existing.serpApiKey,
    companyInfo: data.companyInfo !== undefined ? data.companyInfo : existing.companyInfo,
    updatedAt: now,
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return {
    serperApiKey: data.serperApiKey !== undefined ? data.serperApiKey : (existing.serperApiKey ? decrypt(existing.serperApiKey) : undefined),
    serpApiKey: data.serpApiKey !== undefined ? data.serpApiKey : (existing.serpApiKey ? decrypt(existing.serpApiKey) : undefined),
    companyInfo: updated.companyInfo,
    updatedAt: now,
  };
}

// --- Teams ---

const TEAMS_FILE = path.join(OPENCLAW_HOME, "teams.json");

export interface Team {
  id: string;
  name: string;
  emoji: string;
  description: string;
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
}

function readTeams(): Team[] {
  ensureDir(TEAMS_FILE);
  if (!fs.existsSync(TEAMS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TEAMS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeTeams(teams: Team[]) {
  ensureDir(TEAMS_FILE);
  fs.writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2));
}

export async function listTeams(): Promise<Team[]> {
  return readTeams();
}

export async function createTeam(data: { name: string; emoji: string; description: string; agentIds: string[] }): Promise<Team> {
  const teams = readTeams();
  const now = new Date().toISOString();
  const team: Team = {
    id: crypto.randomUUID(),
    name: data.name,
    emoji: data.emoji,
    description: data.description,
    agentIds: data.agentIds,
    createdAt: now,
    updatedAt: now,
  };
  teams.push(team);
  writeTeams(teams);
  return team;
}

export async function updateTeam(
  id: string,
  data: Partial<{ name: string; emoji: string; description: string; agentIds: string[] }>
): Promise<Team | null> {
  const teams = readTeams();
  const idx = teams.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const team = teams[idx];
  if (data.name !== undefined) team.name = data.name;
  if (data.emoji !== undefined) team.emoji = data.emoji;
  if (data.description !== undefined) team.description = data.description;
  if (data.agentIds !== undefined) team.agentIds = data.agentIds;
  team.updatedAt = new Date().toISOString();
  teams[idx] = team;
  writeTeams(teams);
  return team;
}

export async function deleteTeam(id: string): Promise<boolean> {
  const teams = readTeams();
  const filtered = teams.filter((t) => t.id !== id);
  if (filtered.length === teams.length) return false;
  writeTeams(filtered);
  return true;
}

// --- Agent Stats ---

const STATS_FILE = path.join(OPENCLAW_HOME, "agent-stats.json");

export interface AgentDayStat {
  date: string; // YYYY-MM-DD
  sessions: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AgentStats {
  agentId: string;
  totalSessions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastUsed: string;
  daily: AgentDayStat[];
}

function readAllStats(): Record<string, AgentStats> {
  ensureDir(STATS_FILE);
  if (!fs.existsSync(STATS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeAllStats(stats: Record<string, AgentStats>) {
  ensureDir(STATS_FILE);
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

export async function getAgentStats(): Promise<Record<string, AgentStats>> {
  return readAllStats();
}

export async function updateAgentStats(agentId: string, inputTokens: number, outputTokens: number) {
  const all = readAllStats();
  const today = new Date().toISOString().slice(0, 10);
  if (!all[agentId]) {
    all[agentId] = {
      agentId,
      totalSessions: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastUsed: today,
      daily: [],
    };
  }
  const stat = all[agentId];
  stat.totalInputTokens += inputTokens;
  stat.totalOutputTokens += outputTokens;
  stat.lastUsed = today;

  let dayStat = stat.daily.find((d) => d.date === today);
  if (!dayStat) {
    dayStat = { date: today, sessions: 0, inputTokens: 0, outputTokens: 0 };
    stat.daily.push(dayStat);
  }
  dayStat.inputTokens += inputTokens;
  dayStat.outputTokens += outputTokens;

  // keep last 90 days
  stat.daily = stat.daily.slice(-90);

  writeAllStats(all);
}

export async function incrementAgentSessionCount(agentId: string) {
  const all = readAllStats();
  const today = new Date().toISOString().slice(0, 10);
  if (!all[agentId]) {
    all[agentId] = {
      agentId,
      totalSessions: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastUsed: today,
      daily: [],
    };
  }
  all[agentId].totalSessions += 1;
  all[agentId].lastUsed = today;

  let dayStat = all[agentId].daily.find((d) => d.date === today);
  if (!dayStat) {
    dayStat = { date: today, sessions: 0, inputTokens: 0, outputTokens: 0 };
    all[agentId].daily.push(dayStat);
  }
  dayStat.sessions += 1;

  writeAllStats(all);
}

// --- Agent Knowledge Base ---
// Knowledge content is stored in separate files under ~/.omnia-ai/knowledge/{agentId}/{knowledgeId}.txt
// agents.json only stores metadata (filename, tokens, meta, etc.) — NOT content.

const KNOWLEDGE_DIR = path.join(BOSSBOARD_DIR, "knowledge");
const SYSTEM_KNOWLEDGE_DIR = path.join(BOSSBOARD_DIR, "system-knowledge");

function knowledgeFilePath(agentId: string, knowledgeId: string): string {
  return path.join(KNOWLEDGE_DIR, agentId, `${knowledgeId}.txt`);
}

function writeKnowledgeFile(agentId: string, knowledgeId: string, content: string): void {
  const fp = knowledgeFilePath(agentId, knowledgeId);
  ensureDir(fp);
  fs.writeFileSync(fp, content, "utf-8");
}

function readKnowledgeFile(agentId: string, knowledgeId: string): string {
  const fp = knowledgeFilePath(agentId, knowledgeId);
  try { return fs.readFileSync(fp, "utf-8"); } catch { return ""; }
}

function deleteKnowledgeFile(agentId: string, knowledgeId: string): void {
  const fp = knowledgeFilePath(agentId, knowledgeId);
  try { fs.unlinkSync(fp); } catch { /* ok */ }
}

/** Migrate inline knowledge content from agents.json to separate files (one-time) */
let knowledgeMigrated = false;
function migrateKnowledgeToFiles(): void {
  if (knowledgeMigrated) return;
  knowledgeMigrated = true;
  const agents = readAgents();
  let changed = false;
  for (const agent of agents) {
    if (!agent.knowledge) continue;
    for (const k of agent.knowledge) {
      if (k.content && k.content.length > 0) {
        // Has inline content — migrate to file
        writeKnowledgeFile(agent.id, k.id, k.content);
        k.content = ""; // clear inline content
        changed = true;
      }
    }
  }
  if (changed) writeAgents(agents);
}

/** Get agent with knowledge content loaded from files */
function getAgentWithKnowledge(agentId: string): (Agent & { knowledge: KnowledgeFile[] }) | null {
  migrateKnowledgeToFiles();
  const agents = readAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent?.knowledge || agent.knowledge.length === 0) return null;
  // Load content from files
  const knowledge = agent.knowledge.map((k) => ({
    ...k,
    content: k.content || readKnowledgeFile(agentId, k.id),
  }));
  return { ...agent, knowledge };
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for mixed Thai/English
  return Math.ceil(text.length / 4);
}

export async function addAgentKnowledge(agentId: string, file: KnowledgeFile): Promise<KnowledgeFile | null> {
  migrateKnowledgeToFiles();
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === agentId);
  if (idx === -1) return null;
  // Write content to separate file
  writeKnowledgeFile(agentId, file.id, file.content);
  // Store only metadata in agents.json
  const meta: KnowledgeFile = { ...file, content: "" };
  if (!agents[idx].knowledge) agents[idx].knowledge = [];
  agents[idx].knowledge!.push(meta);
  agents[idx].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return file;
}

export async function listAgentKnowledge(agentId: string): Promise<KnowledgePublic[]> {
  migrateKnowledgeToFiles();
  const agents = readAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent?.knowledge) return [];
  return agent.knowledge.map((k) => {
    const content = k.content || readKnowledgeFile(agentId, k.id);
    return {
      id: k.id,
      filename: k.filename,
      meta: k.meta,
      tokens: k.tokens,
      uploadedAt: k.uploadedAt,
      preview: content.slice(0, 200),
    };
  });
}

export async function checkDuplicateKnowledge(agentId: string, filename: string): Promise<boolean> {
  const agents = readAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent?.knowledge) return false;
  return agent.knowledge.some((k) => k.filename.toLowerCase() === filename.toLowerCase());
}

/** Split text into chunks of ~CHUNK_SIZE chars at paragraph/sentence boundaries */
function chunkText(text: string, chunkSize = 3200): string[] {
  // ~800 tokens per chunk (3200 chars / 4 chars per token)
  if (text.length <= chunkSize) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      // Try to break at paragraph, then sentence, then word
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
  // For system agents, also include system knowledge
  const systemKnowledge = getSystemKnowledgeContent(agentId, question);

  const agent = getAgentWithKnowledge(agentId);
  if (!agent?.knowledge || agent.knowledge.length === 0) return systemKnowledge;
  const MAX_KNOWLEDGE_CHARS = 60000; // ~15,000 tokens

  const qWords = question
    ? question.toLowerCase().split(/[\s,./()]+/).filter((w) => w.length > 1)
    : [];

  // Build scored chunks across all knowledge files
  type ScoredChunk = { filename: string; chunk: string; score: number };
  const allChunks: ScoredChunk[] = [];

  for (const k of agent.knowledge) {
    const chunks = chunkText(k.content);
    for (const chunk of chunks) {
      const chunkLower = chunk.toLowerCase();
      const filenameLower = k.filename.toLowerCase();
      const score = qWords.length > 0
        ? qWords.filter((w) => chunkLower.includes(w) || filenameLower.includes(w)).length
        : 1; // no question → include all
      allChunks.push({ filename: k.filename, chunk, score });
    }
  }

  // Skip entirely if no keyword matches at all
  if (question && allChunks.every((c) => c.score === 0)) return systemKnowledge;

  // Sort by relevance (highest first) and filter zero-score chunks when question provided
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

export async function deleteAgentKnowledge(agentId: string, knowledgeId: string): Promise<boolean> {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === agentId);
  if (idx === -1 || !agents[idx].knowledge) return false;
  const before = agents[idx].knowledge!.length;
  agents[idx].knowledge = agents[idx].knowledge!.filter((k) => k.id !== knowledgeId);
  if (agents[idx].knowledge!.length === before) return false;
  // Delete content file
  deleteKnowledgeFile(agentId, knowledgeId);
  agents[idx].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return true;
}

export async function getCompanyInfoContext(): Promise<string> {
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

// === Cross-session memory ===
export interface MemoryFact {
  id: string;
  key: string;       // e.g. "vat_status", "company_type"
  value: string;      // e.g. "จดทะเบียน VAT", "บริษัทจำกัด"
  source: string;     // which session extracted this
  createdAt: string;
  updatedAt: string;
}

const MEMORY_FILE = path.join(BOSSBOARD_DIR, "client-memory.json");

function readMemory(): MemoryFact[] {
  try {
    if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
  } catch { /* corrupted */ }
  return [];
}

function writeMemory(facts: MemoryFact[]) {
  ensureDir(MEMORY_FILE);
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(facts, null, 2));
}

export async function getMemoryFacts(): Promise<MemoryFact[]> {
  return readMemory();
}

export async function upsertMemoryFact(key: string, value: string, source: string): Promise<MemoryFact> {
  const facts = readMemory();
  const existing = facts.find((f) => f.key === key);
  if (existing) {
    existing.value = value;
    existing.source = source;
    existing.updatedAt = new Date().toISOString();
    writeMemory(facts);
    return existing;
  }
  const newFact: MemoryFact = {
    id: crypto.randomBytes(4).toString("hex"),
    key,
    value,
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  facts.push(newFact);
  writeMemory(facts);
  return newFact;
}

export async function deleteMemoryFact(id: string): Promise<boolean> {
  const facts = readMemory();
  const filtered = facts.filter((f) => f.id !== id);
  if (filtered.length === facts.length) return false;
  writeMemory(filtered);
  return true;
}

export async function getMemoryContext(): Promise<string> {
  const facts = readMemory();
  if (facts.length === 0) return "";
  const lines = facts.map((f) => `- ${f.key}: ${f.value}`).join("\n");
  return `\n\n---\n🧠 ข้อมูลจากการประชุมครั้งก่อน (Cross-Session Memory):\n${lines}\n---\n`;
}

// --- System Knowledge Sync ---

/** Read system knowledge files for a system agent from ~/.omnia-ai/system-knowledge/{agentType}/ */
export function getSystemKnowledgeContent(agentId: string, question?: string): string {
  const agents = readAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent?.isSystem || !agent.systemAgentType) return "";

  const dir = path.join(SYSTEM_KNOWLEDGE_DIR, agent.systemAgentType);
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
    const chunks = chunkText(content);
    for (const chunk of chunks) {
      const chunkLower = chunk.toLowerCase();
      const filenameLower = file.toLowerCase();
      const score = qWords.length > 0
        ? qWords.filter((w) => chunkLower.includes(w) || filenameLower.includes(w)).length
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

const KNOWLEDGE_REPO_RAW = "https://raw.githubusercontent.com/bosocmputer/system-knowledge-ledgio-ai/main";

/** Sync system knowledge from GitHub repo to ~/.omnia-ai/system-knowledge/ */
export async function syncSystemKnowledge(): Promise<{ synced: number; version: string }> {
  // Fetch manifest from GitHub
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
      const filename = path.basename(relPath);
      const destPath = path.join(targetDir, filename);
      fs.writeFileSync(destPath, content, "utf-8");
      synced++;
    }
  }

  return { synced, version: manifest.version || "unknown" };
}
