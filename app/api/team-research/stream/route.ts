import { NextRequest } from "next/server";
import {
  listAgents,
  getAgentApiKey,
  getSettings,
  createResearchSession,
  appendResearchMessage,
  completeResearchSession,
  getResearchSession,
  ResearchMessage,
  AgentPublic,
  updateAgentStats,
  incrementAgentSessionCount,
  getCompanyInfoContext,
  getAgentKnowledgeContent,
  getMemoryContext,
  upsertMemoryFact,
} from "@/lib/agents-store";
import { getDomainKnowledge, isDomainQuestion } from "@/lib/domain-knowledge";
import { rateLimit, getClientIp } from "@/lib/rate-limit-redis";
import crypto from "crypto";

// Max request body size (100KB — questions + history + file contexts)
const MAX_BODY_SIZE = 500 * 1024;

interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function callLLMWithRetry(
  provider: string, model: string, apiKey: string, baseUrl: string | undefined,
  messages: LLMMessage[], signal?: AbortSignal, retries = 1
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callLLM(provider, model, apiKey, baseUrl, messages, signal);
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && (err.message.includes("429") || err.message.includes("rate"));
      if (isRateLimit && attempt < retries) {
        await delay(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error("callLLMWithRetry: exhausted retries");
}

async function callLLM(
  provider: string,
  model: string,
  apiKey: string,
  baseUrl: string | undefined,
  messages: LLMMessage[],
  signal?: AbortSignal
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  if (provider === "anthropic") {
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.3,
        system: systemMsg ? [{ type: "text", text: systemMsg.content, cache_control: { type: "ephemeral" } }] : undefined,
        messages: userMsgs,
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.content?.[0]?.text ?? "",
      inputTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.cache_read_input_tokens ?? 0),
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }

  if (provider === "openrouter") {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "HTTP-Referer": "https://omnia.ai",
      "X-Title": "OMNIA.AI",
    };
    let res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.3 }),
      signal,
    });
    // Fallback to gpt-4o-mini if model is invalid (400/404)
    if (!res.ok && (res.status === 400 || res.status === 404)) {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: "openai/gpt-4o-mini", messages, max_tokens: 2048, temperature: 0.3 }),
        signal,
      });
    }
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  if (provider === "openai" || provider === "custom") {
    const url = baseUrl ? `${baseUrl}/chat/completions` : "https://api.openai.com/v1/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.3 }),
      signal,
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  if (provider === "gemini") {
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role !== "system");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
        contents: userMsgs.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  if (provider === "ollama") {
    const url = baseUrl ? `${baseUrl}/api/chat` : "http://localhost:11434/api/chat";
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.3 } }),
      signal,
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.message?.content ?? "",
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// Streaming LLM call — sends tokens to onDelta callback as they arrive
async function callLLMStream(
  provider: string, model: string, apiKey: string, baseUrl: string | undefined,
  messages: LLMMessage[], signal?: AbortSignal,
  onDelta?: (text: string) => void
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  // Only OpenAI-compatible APIs support streaming easily
  if (provider !== "openrouter" && provider !== "openai" && provider !== "custom") {
    const result = await callLLM(provider, model, apiKey, baseUrl, messages, signal);
    onDelta?.(result.content);
    return result;
  }

  const url = provider === "openrouter"
    ? "https://openrouter.ai/api/v1/chat/completions"
    : baseUrl ? `${baseUrl}/chat/completions` : "https://api.openai.com/v1/chat/completions";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://omnia.ai";
    headers["X-Title"] = "OMNIA.AI";
  }

  let res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.3, stream: true }),
    signal,
  });
  // Fallback to gpt-4o-mini if model is invalid
  if (!res.ok && provider === "openrouter" && (res.status === 400 || res.status === 404)) {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages, max_tokens: 2048, temperature: 0.3, stream: true }),
      signal,
    });
  }
  if (!res.ok) throw new Error(`LLM stream error: ${res.status} ${await res.text()}`);
  if (!res.body) throw new Error("No response body for stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onDelta?.(delta);
        }
        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
          outputTokens = parsed.usage.completion_tokens ?? outputTokens;
        }
      } catch { /* ignore parse errors */ }
    }
  }

  return { content: fullContent, inputTokens, outputTokens };
}

// Fetch MCP tools and call relevant ones for context
interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

// Infer arguments for a tool from its name + description when no inputSchema available
function buildToolArguments(tool: McpTool, question: string): Record<string, unknown> {
  const name = tool.name;

  // Tools that need keyword/search param
  if (["search_product", "search_customer", "search_supplier"].includes(name)) {
    return { keyword: question };
  }

  // Sales analytics tools — use date range (last 1 year) + optional question as keyword
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  if (["get_sales_summary", "get_sales_item_detail", "get_sales_by_item",
       "get_new_customer_trend", "get_dso_analysis", "get_sales_conversion_rate",
       "get_customer_purchase_frequency", "get_salesman_crm_kpi",
       "get_sales_by_area"].includes(name)) {
    return { start_date: startOfYear, end_date: todayStr, response_format: "markdown" };
  }

  if (["get_sales_by_customer", "get_sales_by_salesman", "get_sales_by_branch",
       "get_sales_by_dimension"].includes(name)) {
    return { start_date: startOfYear, end_date: todayStr, response_format: "markdown" };
  }

  if (["get_customer_rfm", "get_customer_activity_status"].includes(name)) {
    return { months: 12, response_format: "markdown" };
  }

  if (["get_customer_profitability", "get_item_top_buyers", "get_customer_top_items"].includes(name)) {
    return { start_date: startOfYear, end_date: todayStr, limit: 10, response_format: "markdown" };
  }

  if (["get_customer_segment_summary"].includes(name)) {
    return { period_months: 12, response_format: "markdown" };
  }

  if (["get_ar_aging", "get_customer_credit_status"].includes(name)) {
    return { response_format: "markdown" };
  }

  // stock/inventory tools
  if (["get_stock_balance", "get_product_price",
       "get_account_incoming", "get_account_outstanding", "get_bookout_balance"].includes(name)) {
    return { keyword: question };
  }

  // Use inputSchema if available
  const props = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];
  const paramNames = required.length > 0 ? required : Object.keys(props);
  const args: Record<string, unknown> = {};
  for (const key of paramNames) {
    const prop = props[key];
    if (!prop) continue;
    if (prop.type === "string") { args[key] = question; break; }
  }
  if (Object.keys(args).length === 0) {
    for (const k of ["keyword", "query", "search", "q", "text"]) {
      if (k in props) { args[k] = question; break; }
    }
  }
  return args;
}

async function fetchMcpContext(mcpEndpoint: string, mcpAccessMode: string, question: string): Promise<string> {
  // Normalize endpoint — strip trailing slash and known MCP paths
  const base = mcpEndpoint.replace(/\/(health|tools|call|mcp|sse)\/?$/, "").replace(/\/$/, "");
  try {
    // Get available tools with full schema
    const toolsRes = await fetch(`${base}/tools`, {
      headers: { "mcp-access-mode": mcpAccessMode },
      signal: AbortSignal.timeout(6000),
    });
    if (!toolsRes.ok) return "";
    const toolsData = await toolsRes.json();
    const tools: McpTool[] = Array.isArray(toolsData) ? toolsData : (toolsData.tools ?? []);
    if (tools.length === 0) return "";

    // Skip write/create tools and fallback — only use read/search tools
    const SKIP_TOOLS = ["create_sale_reserve", "fallback_response"];
    const READ_TOOL_PREFIXES = ["get_", "search_", "list_", "find_", "fetch_", "query_"];
    const readTools = tools.filter((t) =>
      !SKIP_TOOLS.includes(t.name) &&
      READ_TOOL_PREFIXES.some((p) => t.name.startsWith(p))
    );
    if (readTools.length === 0) return "";

    // Score tools by relevance: match question words against tool name + description
    const q = question.toLowerCase();
    const qWords = q.split(/[\s,]+/).filter((w) => w.length > 1);

    // Keyword groups → preferred tool prefixes/names
    const SALES_KEYWORDS = ["ยอดขาย", "sales", "ขาย", "revenue", "วิเคราะห์ยอด", "รายได้", "sale"];
    const CUSTOMER_KEYWORDS = ["ลูกค้า", "customer", "rfm", "crm", "debt", "ar", "aging"];
    const STOCK_KEYWORDS = ["สต็อก", "สินค้า", "stock", "inventory", "product", "item", "คงเหลือ"];

    const hasSalesIntent = SALES_KEYWORDS.some((k) => q.includes(k));
    const hasCustomerIntent = CUSTOMER_KEYWORDS.some((k) => q.includes(k));
    const hasStockIntent = STOCK_KEYWORDS.some((k) => q.includes(k));

    const scored = readTools.map((t) => {
      const text = `${t.name.replace(/_/g, " ")} ${t.description ?? ""}`.toLowerCase();
      let score = qWords.filter((w) => text.includes(w)).length;

      // Boost analytical/summary tools when question has clear intent
      if (hasSalesIntent && t.name.startsWith("get_sales")) score += 5;
      if (hasCustomerIntent && (t.name.startsWith("get_customer") || t.name.startsWith("get_ar") || t.name.startsWith("get_dso"))) score += 5;
      if (hasStockIntent && t.name.startsWith("get_stock")) score += 5;

      // Penalize generic search tools when intent is clearly analytics
      if ((hasSalesIntent || hasCustomerIntent || hasStockIntent) &&
          ["search_product", "search_customer", "search_supplier"].includes(t.name)) {
        score = Math.max(0, score - 3);
      }

      return { tool: t, score };
    }).sort((a, b) => b.score - a.score);

    // Take top 3 tools — always include at least 1 even if score=0
    const topTools = scored.slice(0, 3).map((s) => s.tool);

    const results: string[] = [];
    for (const tool of topTools) {
      try {
        const args = buildToolArguments(tool, question);
        const callRes = await fetch(`${base}/call`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "mcp-access-mode": mcpAccessMode,
          },
          body: JSON.stringify({ name: tool.name, arguments: args }),
          signal: AbortSignal.timeout(8000),
        });
        if (!callRes.ok) continue;
        const callData = await callRes.json();
        // MCP /call returns { content: [{ type: "text", text: "..." }] }
        let text = "";
        if (callData?.content && Array.isArray(callData.content)) {
          text = callData.content.map((c: { text?: string }) => c.text ?? "").join("\n");
        } else {
          text = typeof callData === "string" ? callData : JSON.stringify(callData);
        }
        if (text && text.trim().length > 10) {
          results.push(`[${tool.name}]\n${text.slice(0, 2000)}`);
        }
      } catch { /* skip failed tool */ }
    }

    return results.length > 0
      ? `\n\n---\n🔌 ข้อมูลจาก MCP Server (${base}) — role: ${mcpAccessMode}:\n${results.join("\n\n")}\n---\n`
      : "";
  } catch {
    return "";
  }
}

// Structured web source for frontend display
interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

// Web search via Serper → SerpApi fallback (with trusted URL scoping)
async function webSearch(query: string, serperKey?: string, serpApiKey?: string, trustedUrls?: string[]): Promise<{ text: string; sources: WebSource[] }> {
  // Scope search to trusted domains if provided
  let searchQuery = query;
  if (trustedUrls && trustedUrls.length > 0) {
    const siteFilter = trustedUrls.map((u) => `site:${u}`).join(" OR ");
    searchQuery = `${query} (${siteFilter})`;
  }

  const parseSources = (items: { title: string; link: string; snippet: string }[]): WebSource[] =>
    items.map((r) => ({
      title: r.title,
      url: r.link,
      domain: new URL(r.link).hostname.replace(/^www\./, ""),
      snippet: r.snippet,
    }));

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "content-type": "application/json" },
        body: JSON.stringify({ q: searchQuery, num: 5 }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = (data.organic ?? []).slice(0, 5);
        const sources = parseSources(items);
        const text = items.map((r: { title: string; link: string; snippet: string }, i: number) =>
          `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}`
        ).join("\n\n");
        return { text, sources };
      }
    } catch (e) { console.error("[WebSearch] Serper failed:", e instanceof Error ? e.message : e); }
  }

  if (serpApiKey) {
    try {
      const params = new URLSearchParams({ q: searchQuery, api_key: serpApiKey, engine: "google", num: "5" });
      const res = await fetch(`https://serpapi.com/search?${params}`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const items = (data.organic_results ?? []).slice(0, 5);
        const sources = parseSources(items);
        const text = items.map((r: { title: string; link: string; snippet: string }, i: number) =>
          `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}`
        ).join("\n\n");
        return { text, sources };
      }
    } catch (e) { console.error("[WebSearch] SerpApi failed:", e instanceof Error ? e.message : e); }
  }

  if (serperKey || serpApiKey) {
    console.error("[WebSearch] ค้นหาไม่สำเร็จ — ทั้ง Serper และ SerpApi ล้มเหลว, query:", query.slice(0, 80));
  }
  return { text: "", sources: [] };
}

// Rewrite user question into optimized search query
async function rewriteSearchQuery(
  question: string,
  provider: string,
  model: string,
  apiKey: string,
  baseUrl: string | undefined,
  signal?: AbortSignal,
): Promise<string> {
  try {
    // Use a fast lightweight model for query rewriting instead of the main (slow) model
    const fastModel = provider === "openrouter" ? "openai/gpt-4o-mini" : model;
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), 15_000);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;
    const result = await callLLM(provider, fastModel, apiKey, baseUrl, [
      {
        role: "system",
        content: "แปลงคำถามภาษาไทยเป็น search query สำหรับ Google ที่จะได้ผลลัพธ์ดีที่สุด ตอบเฉพาะ query เท่านั้น ไม่ต้องมีคำอธิบาย ใช้ keywords ภาษาไทยผสมอังกฤษ ถ้าเป็นเรื่องกฎหมาย/ภาษี ให้ใส่ keyword เช่น กรมสรรพากร พ.ร.บ. ประมวลรัษฎากร ตามความเหมาะสม",
      },
      { role: "user", content: question },
    ], combinedSignal);
    clearTimeout(timeout);
    const rewritten = result.content.trim().replace(/^["']|["']$/g, "");
    return rewritten.length > 5 ? rewritten : question;
  } catch {
    return question; // fallback to original
  }
}

// Detect chairman from role seniority
const CHAIRMAN_ROLES = [
  // English
  "ceo", "chief executive", "president", "md", "managing director", "chairman",
  "director", "vp", "vice president", "cfo", "coo", "cto", "cmo", "chro",
  // Thai accounting firm roles (ordered by seniority)
  "ผู้สอบบัญชี", "cpa", "ประธาน", "หัวหน้า", "ผู้อำนวยการ", "กรรมการ",
  "อาวุโส", "senior", "ที่ปรึกษา", "consultant", "ผู้จัดการ", "manager",
];

function detectChairman(agents: AgentPublic[]): AgentPublic {
  // Use explicit seniority if set — highest seniority = chairman
  const sorted = [...agents].sort((a, b) => {
    const sa = a.seniority ?? 0;
    const sb = b.seniority ?? 0;
    if (sa !== sb) return sb - sa; // descending: highest seniority first
    // Fall back to role keyword matching
    const ra = a.role.toLowerCase();
    const rb = b.role.toLowerCase();
    const ia = CHAIRMAN_ROLES.findIndex((k) => ra.includes(k));
    const ib = CHAIRMAN_ROLES.findIndex((k) => rb.includes(k));
    const scoreA = ia === -1 ? 999 : ia;
    const scoreB = ib === -1 ? 999 : ib;
    return scoreA - scoreB;
  });
  return sorted[0];
}

// Sort agents by speaking order (chairman first and last, others by seniority)
function sortBySeniority(agents: AgentPublic[], chairman: AgentPublic): AgentPublic[] {
  const others = agents
    .filter((a) => a.id !== chairman.id)
    .sort((a, b) => {
      const sa = a.seniority ?? 50;
      const sb = b.seniority ?? 50;
      if (sa !== sb) return sa - sb;
      const ra = a.role.toLowerCase();
      const rb = b.role.toLowerCase();
      const ia = CHAIRMAN_ROLES.findIndex((k) => ra.includes(k));
      const ib = CHAIRMAN_ROLES.findIndex((k) => rb.includes(k));
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  return [chairman, ...others];
}

// Agent speaking personality — gives each role a distinct voice
function getAgentVoice(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes("cpa") || lower.includes("ผู้สอบบัญชี"))
    return "\n\n🎯 สไตล์การพูดของคุณ: พูดตรงไปตรงมา กล้าชี้จุดอ่อน ตั้งคำถามเชิงท้าทาย ไม่อ้อมค้อม เหมือนผู้สอบบัญชีที่เน้นความเป็นอิสระ";
  if (lower.includes("ภาษี") || lower.includes("tax"))
    return "\n\n🎯 สไตล์การพูดของคุณ: วิเคราะห์ละเอียด ยกตัวอย่างตัวเลขประกอบเสมอ อ้างอิงมาตราเฉพาะ เปรียบเทียบแต่ละทางเลือกอย่างเป็นระบบ";
  if (lower.includes("วิเคราะห์") || lower.includes("analyst"))
    return "\n\n🎯 สไตล์การพูดของคุณ: เน้นตัวเลข ratio สถิติ พูดน้อยแต่คมชัด ใช้ข้อมูลเชิงปริมาณสนับสนุนทุกประเด็น";
  if (lower.includes("ตรวจสอบภายใน") || lower.includes("internal auditor"))
    return "\n\n🎯 สไตล์การพูดของคุณ: ตั้งคำถามเชิงท้าทาย ชี้ความเสี่ยงที่ซ่อนอยู่ มองหา red flag และ control weakness ที่คนอื่นมองข้าม";
  if (lower.includes("บัญชี") || lower.includes("accountant"))
    return "\n\n🎯 สไตล์การพูดของคุณ: พูดเป็นระบบ ชัดเจน อ้างอิงมาตรฐานบัญชีเสมอ เน้นความถูกต้องของตัวเลขและกระบวนการ";
  return "";
}

function sseEvent(encoder: TextEncoder, event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

interface ConversationTurn {
  question: string;
  answer: string;
}

export async function POST(req: NextRequest) {
  // Rate limit: max 20 stream requests per IP per 60 seconds
  const clientIp = getClientIp(req.headers);
  if (!await rateLimit(clientIp, { maxRequests: 20, windowMs: 60_000 })) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait before starting a new meeting." }), { status: 429 });
  }

  // Body size limit
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return new Response(JSON.stringify({ error: "Request body too large (max 100KB)" }), { status: 413 });
  }

  const body = await req.json();
  const {
    question,
    agentIds,
    dataSource,
    mcpEndpoint,
    dbConnectionString,
    conversationHistory,
    fileContexts,
    historyMode = "full", // "full" | "summary" | "last3" | "none"
    disableMcp = false,
    includeCompanyInfo = true,
    mode = "full", // "full" | "discuss" | "close" | "qa"
    sessionId: existingSessionId,
    allRounds,
    clarificationAnswers,
  } = body as {
    question: string;
    agentIds: string[];
    dataSource?: string;
    mcpEndpoint?: string;
    dbConnectionString?: string;
    conversationHistory?: ConversationTurn[];
    fileContexts?: { filename: string; meta: string; context: string; sheets?: string[] }[];
    historyMode?: "full" | "summary" | "last3" | "none";
    disableMcp?: boolean;
    includeCompanyInfo?: boolean;
    mode?: "full" | "discuss" | "close" | "qa";
    sessionId?: string;
    allRounds?: { question: string; messages: { agentEmoji: string; agentName: string; role: string; content: string }[] }[];
    clarificationAnswers?: { question: string; answer: string }[];
  };

  if (!question || !agentIds?.length) {
    return new Response(JSON.stringify({ error: "Missing question or agentIds" }), { status: 400 });
  }

  const allAgents = await listAgents();
  const selectedAgents = allAgents.filter((a) => agentIds.includes(a.id) && a.active);
  if (!selectedAgents.length) {
    return new Response(JSON.stringify({ error: "No active agents found" }), { status: 400 });
  }

  // Load web search keys from settings
  const settings = await getSettings();
  const serperKey = settings.serperApiKey;
  const serpApiKeyVal = settings.serpApiKey;

  // Auto web search for domain questions (tax/accounting/labor) even if agent hasn't enabled web search
  const hasSearchKeys = !!(serperKey || serpApiKeyVal);
  const isSpecializedQuestion = isDomainQuestion(question);
  const doAutoSearch = isSpecializedQuestion && hasSearchKeys;

  // Get domain knowledge that matches the question (tax, accounting, labor)
  const domainKnowledge = getDomainKnowledge(question);

  // Fetch extra context from data source before streaming
  let dataSourceContext = "";
  if (dataSource === "mcp" && mcpEndpoint) {
    try {
      const mcpRes = await fetch(mcpEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: question }),
        signal: AbortSignal.timeout(8000),
      });
      if (mcpRes.ok) {
        const mcpData = await mcpRes.json();
        const mcpText = typeof mcpData === "string" ? mcpData : JSON.stringify(mcpData).slice(0, 4000);
        dataSourceContext = `\n\n[MCP Context from ${mcpEndpoint}]:\n${mcpText}`;
      }
    } catch {
      dataSourceContext = `\n\n[MCP endpoint ${mcpEndpoint} did not respond — proceeding without context]`;
    }
  } else if (dataSource === "database" && dbConnectionString) {
    const safeConn = dbConnectionString.replace(/:[^:@]+@/, ":***@");
    dataSourceContext = `\n\n[Database Context]: Connection configured at ${safeConn}.`;
  }

  // Build history context based on historyMode
  function buildHistoryContext(history?: ConversationTurn[]): string {
    if (!history || history.length === 0) return "";
    let turns = history;
    if (historyMode === "none") return "";
    if (historyMode === "last3") turns = history.slice(-3);
    if (historyMode === "summary" || (historyMode === "full" && history.length > 5)) {
      // Auto-summarize when many rounds: keep last 2 in full, summarize older
      const older = turns.slice(0, -2);
      const recent = turns.slice(-2);
      const olderText = older.length > 0
        ? older.map((t, i) => `[วาระที่ ${i + 1}] ${t.question} → ${t.answer.slice(0, 150)}...`).join("\n")
        : "";
      const recentText = recent.map((t, i) => `[วาระที่ ${older.length + i + 1}] คำถาม: ${t.question}\nสรุปมติ: ${t.answer}`).join("\n\n");
      return `\n\n---\nสรุปประวัติการประชุมก่อนหน้า:\n${olderText ? olderText + "\n\nรายละเอียดวาระล่าสุด:\n" : ""}${recentText}\n---\n`;
    }
    return `\n\n---\nประวัติการประชุมก่อนหน้า:\n${turns.map((t, i) => `[วาระที่ ${i + 1}] คำถาม: ${t.question}\nสรุปมติ: ${t.answer}`).join("\n\n")}\n---\n`;
  }

  // Build file context (with optional sheet filter)
  function buildFileContext(contexts?: { filename: string; meta: string; context: string; sheets?: string[] }[]): string {
    if (!contexts || contexts.length === 0) return "";
    return `\n\n---\n📎 เอกสารอ้างอิงที่แนบมา (ใช้ข้อมูลเหล่านี้ประกอบการวิเคราะห์):\n${contexts.map((f) => `[${f.meta}]\n${f.context}`).join("\n\n---\n")}\n---\n`;
  }

  const userId = req.headers.get("x-user-id")!;

  let sessionId: string;
  if (existingSessionId) {
    // Reuse existing session (multi-round meeting)
    sessionId = existingSessionId;
  } else {
    const newSession = await createResearchSession({ question, agentIds, dataSource }, userId);
    sessionId = newSession.id;
    // Increment session count only on first round
    for (const aid of agentIds) {
      await incrementAgentSessionCount(aid);
    }
  }

  // Detect chairman
  const chairman = detectChairman(selectedAgents);
  const orderedAgents = sortBySeniority(selectedAgents, chairman);

  // Company & knowledge context
  const [companyContext, memoryContext] = await Promise.all([
    includeCompanyInfo ? getCompanyInfoContext() : Promise.resolve(""),
    getMemoryContext(userId),
  ]);

  // Client disconnect detection — abort LLM calls when client disconnects
  const abortController = new AbortController();
  const clientSignal = abortController.signal;

  const encoder = new TextEncoder();
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (clientSignal.aborted) return;
        try {
          controller.enqueue(sseEvent(encoder, event, data));
        } catch {
          // Client likely disconnected
          abortController.abort();
        }
      };

      // Keepalive — send SSE comment every 15s to prevent proxy/tunnel timeouts (e.g. Cloudflare)
      keepaliveInterval = setInterval(() => {
        if (clientSignal.aborted) { if (keepaliveInterval) clearInterval(keepaliveInterval); return; }
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          if (keepaliveInterval) clearInterval(keepaliveInterval);
        }
      }, 15_000);

      send("session", { sessionId });
      send("chairman", { agentId: chairman.id, name: chairman.name, emoji: chairman.emoji, role: chairman.role });
      send("status", { message: mode === "qa" ? `💬 ${chairman.emoji} ${chairman.name} กำลังตอบ...` : `🏛️ ประธาน: ${chairman.emoji} ${chairman.name} (${chairman.role}) — ${mode === "close" ? "สรุปมติที่ประชุม" : "เปิดการประชุม"}` });

      const agentFindings: { agentId: string; name: string; emoji: string; role: string; content: string; searchResults?: string }[] = [];
      const agentTokens: Record<string, { input: number; output: number }> = {};
      const failedAgents: string[] = [];
      let silentAgents: string[] = [];

      const historyContext = buildHistoryContext(conversationHistory);
      const fileContext = buildFileContext(fileContexts);

      // Build clarification context if user answered clarification questions
      let clarificationContext = "";
      if (clarificationAnswers && clarificationAnswers.length > 0) {
        clarificationContext = `\n\n---\n📋 ข้อมูลเพิ่มเติมจากผู้ถาม (ตอบก่อนเริ่มประชุม):\n${clarificationAnswers.map((a) => `ถาม: ${a.question}\nตอบ: ${a.answer}`).join("\n\n")}\n---\n⚠️ ใช้ข้อมูลเหล่านี้ประกอบการวิเคราะห์ ตอบให้ตรงกับสถานการณ์จริงของผู้ถาม\n`;
      }

      // Detect astrology/fortune-telling session — used to inject ทายทัก section into prompts
      const _astroKw = ["ดูดวง","โหราศาสตร์","ดวงชะตา","ดวง","พยากรณ์","ทำนาย","ฤกษ์","bazi","ba zi","tarot","ไพ่ยิปซี","ชะตา","ชงกับ","ราศี","จักรราศี","เลขศาสตร์","numerology","ฮวงจุ้ย","feng shui","สี่เสา","midpoint","ascendant","ทักษา"];
      const _qLow = question.toLowerCase();
      const _chairLow = (chairman.soul + " " + chairman.role).toLowerCase();
      const isAstrologySession =
        _astroKw.some((kw) => _qLow.includes(kw)) ||
        _astroKw.some((kw) => _chairLow.includes(kw)) ||
        (clarificationAnswers ?? []).some((a) => a.question.toLowerCase().includes("เกิด") || a.question.toLowerCase().includes("ดวง"));

      // Current date context — inject so LLM knows the actual date (avoids wrong year like 2567)
      const _now = new Date();
      const _ceYear = _now.getFullYear();
      const _beYear = _ceYear + 543;
      const _monthTh = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"][_now.getMonth()];
      const dateContext = `\n\n📅 วันที่ปัจจุบัน: ${_now.getDate()} ${_monthTh} พ.ศ. ${_beYear} (ค.ศ. ${_ceYear}) — ใช้ปีนี้เป็นฐานในการวิเคราะห์และพยากรณ์ทุกกรณี ห้ามอ้างอิงปีที่ผ่านมาเป็นปัจจุบัน\n`;

      // Anti-hallucination rules (injected into all prompts)
      const antiHallucinationRules = `\n\n🚫 กฎเหล็กป้องกันข้อมูลเท็จ (Anti-Hallucination):\n- ห้ามสร้างเลขที่คำวินิจฉัย คำพิพากษา หรือคำสั่งที่ไม่แน่ใจ 100% (เช่น "คำวินิจฉัย กค 0811/xxxx") — ถ้าไม่แน่ใจ ให้เขียนว่า "ตามแนวคำวินิจฉัยของกรมสรรพากร" โดยไม่ระบุเลขที่\n- ห้ามสร้างชื่อ พ.ร.บ. พ.ร.ก. ประกาศ หรือกฎกระทรวง ที่ไม่มีอยู่จริง\n- ถ้าอ้างอิงมาตรากฎหมาย ต้องแน่ใจว่าเลขมาตราถูกต้อง — ถ้าไม่แน่ใจ ให้ระบุเป็นหลักการแทน\n- ถ้าข้อมูลจาก Web Search ขัดกับความรู้เดิม ให้เชื่อ Web Search มากกว่า (เพราะอาจมีการแก้ไขกฎหมาย)\n- แยกชัดเจนระหว่าง "ข้อเท็จจริงที่แน่ชัด" กับ "ความเห็น/การตีความ"\n`;

      // Astrology-specific anti-hallucination rules (injected only for astrology sessions)
      const astrologyAntiHallucinationRules = isAstrologySession ? `\n\n🔮 กฎเหล็กเฉพาะโหราศาสตร์:\n- ห้ามระบุ Ascendant/ลัคนา โดยไม่แสดงวิธีคำนวณจากเวลา+สถานที่เกิด — ถ้าไม่มีเวลาเกิดให้ระบุชัดว่า "ไม่สามารถระบุลัคนาได้"\n- ห้ามระบุ Day Master (ธาตุประจำตัว) โดยไม่แสดงตาราง 4 เสาก่อน (ปี เดือน วัน ยาม พร้อม Heavenly Stem + Earthly Branch + ธาตุ)\n- Day Master = Heavenly Stem ของเสาวัน (Day Pillar) เท่านั้น — ไม่ใช่ธาตุรวมหรือธาตุที่มากที่สุดในตาราง\n- ห้ามระบุตำแหน่งดาว (องศา/ราศี) ที่ไม่มีฐานข้อมูลอ้างอิง — ถ้าไม่แน่ใจให้ระบุว่า "ประมาณ ~XX°"\n- ทายทักทุกข้อต้องระบุครบ 5 องค์ประกอบ: ① เรื่องอะไร ② ช่วงเดือน/เวลาไหน ③ กลไก (ดาว/ธาตุ/เลขฐานที่ทำให้เกิด) ④ % ความน่าจะเป็น (ไม่เกิน 75%) ⑤ วิธีรับมือ\n- ถ้าข้อมูลไม่เพียงพอ (เช่น ไม่มีเวลาเกิดสำหรับลัคนา) ห้ามเดา — ระบุชัดว่าต้องการข้อมูลเพิ่ม\n` : "";

      // === QA Mode: Direct single-agent answer (no meeting ceremony) ===
      if (mode === "qa") {
        const agent = orderedAgents[0];
        const apiKey = await getAgentApiKey(agent.id);
        if (!apiKey) {
          send("error", { message: "ไม่มี API key สำหรับ agent นี้" });
          if (keepaliveInterval) clearInterval(keepaliveInterval);
          send("done", { sessionId });
          controller.close();
          return;
        }
        send("agent_start", { agentId: agent.id, name: agent.name, emoji: agent.emoji, role: agent.role, isChairman: true });

        let mcpContext = "";
        if (!disableMcp && agent.mcpEndpoint) {
          send("status", { message: `💬 ${agent.emoji} กำลังเชื่อมต่อระบบ...` });
          mcpContext = await fetchMcpContext(agent.mcpEndpoint, agent.mcpAccessMode ?? "general", question);
        }
        let searchContext = "";
        if ((agent.useWebSearch || doAutoSearch) && (serperKey || serpApiKeyVal)) {
          send("status", { message: `💬 ${agent.emoji} กำลังค้นหาข้อมูล...` });
          // Use original question directly as search query (skip LLM rewrite for speed)
          send("agent_searching", { agentId: agent.id, query: question });
          const { text: searchResults, sources } = await webSearch(question, serperKey, serpApiKeyVal, agent.trustedUrls);
          if (searchResults) searchContext = `\n\n🔍 ผลการค้นหา:\n${searchResults}\n`;
          if (sources.length > 0) send("web_sources", { agentId: agent.id, sources });
        }

        const knowledgeContext = await getAgentKnowledgeContent(agent.id, question);
        try {
          send("status", { message: `💬 ${agent.emoji} กำลังวิเคราะห์และเรียบเรียงคำตอบ...` });
          // Use streaming LLM — user sees tokens appearing in real-time
          const result = await callLLMStream(agent.provider, agent.model, apiKey, agent.baseUrl, [
            { role: "system",
              content: `${companyContext}${memoryContext}${agent.soul}${knowledgeContext}${domainKnowledge}${dataSourceContext}${historyContext}${fileContext}${mcpContext}${searchContext}${clarificationContext}${dateContext}${antiHallucinationRules}\n\nรูปแบบการตอบ:\n1. **ตอบคำตอบหลักให้ชัดเจนก่อนเลยในย่อหน้าแรก** (ใช่/ไม่ใช่/มี/ไม่มี + สรุปสั้น 1-2 ประโยค)\n2. จากนั้นค่อยอธิบายเหตุผล หลักกฎหมาย หรือรายละเอียดสนับสนุน\n3. ถ้ามีเงื่อนไขพิเศษหรือข้อยกเว้น ให้ระบุชัดเจนว่ากรณีของผู้ถามเข้าเงื่อนไขไหน\n\n⚠️ กฎเหล็กด้านความถูกต้อง:\n- ตอบในบริบทกฎหมายและมาตรฐานของประเทศไทยเป็นหลัก\n- ก่อนสรุปว่าต้องเสียภาษีหรือปฏิบัติตามกฎใด ต้องตรวจสอบข้อยกเว้น (exemptions) ที่เกี่ยวข้องก่อนเสมอ\n- คำตอบต้องสอดคล้องกันตลอด — ห้ามเปิดด้วยข้อมูลที่ขัดกับข้อสรุป\n- อ้างอิงมาตรากฎหมาย มาตรฐานบัญชี หรือแนวปฏิบัติที่เกี่ยวข้อง\n- ใช้ภาษาที่เข้าใจง่าย ตอบไม่เกิน 500 คำ`,
            },
            { role: "user", content: question },
          ], clientSignal, (delta) => send("final_answer_delta", { content: delta }));

          const answerMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            role: "synthesis",
            content: result.content,
            tokensUsed: result.inputTokens + result.outputTokens,
            timestamp: new Date().toISOString(),
          };
          await appendResearchMessage(sessionId, answerMsg);
          send("message", answerMsg);
          send("agent_tokens", {
            agentId: agent.id,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            totalTokens: result.inputTokens + result.outputTokens,
          });
          await updateAgentStats(agent.id, result.inputTokens, result.outputTokens);
          send("final_answer", { content: result.content });
          await completeResearchSession(sessionId, result.content, "completed");
        } catch (err) {
          const errorMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            role: "finding",
            content: `⚠️ เกิดข้อผิดพลาดในการประมวลผล`,
            tokensUsed: 0,
            timestamp: new Date().toISOString(),
          };
          console.error("QA mode error:", err);
          await appendResearchMessage(sessionId, errorMsg);
          send("message", errorMsg);
          await completeResearchSession(sessionId, "QA processing error", "error");
        }
        if (keepaliveInterval) clearInterval(keepaliveInterval);
        send("done", { sessionId });
        controller.close();
        return;
      }

      // === Phase 1 + 2: Discussion (skip in "close" mode) ===
      if (mode !== "close") {

      // === Phase 0: Pre-flight Clarification (only if no answers provided yet) ===
      if (!clarificationAnswers) {
        // === Astrology / Fortune-telling detection — always ask personal info ===
        const astrologyKeywords = [
          "ดูดวง", "โหราศาสตร์", "ดวงชะตา", "ดวง", "พยากรณ์", "ทำนาย",
          "ฤกษ์", "บาจี", "bazi", "ba zi", "tarot", "ไพ่ยิปซี",
          "ชะตา", "ชงกับ", "ราศี", "จักรราศี", "ดาวพุธ", "ดาวอังคาร",
          "ดาวเสาร์", "ดาวราหู", "ดาวเกตุ", "ลัคน์", "เลขศาสตร์", "numerology",
          "ฮวงจุ้ย", "feng shui", "สี่เสา", "midpoint", "ascendant", "ทักษา",
        ];
        const questionLower = question.toLowerCase();
        const chairmanRoleLower = (chairman.soul + " " + chairman.role).toLowerCase();
        const isAstrologyTopic =
          astrologyKeywords.some((kw) => questionLower.includes(kw)) ||
          astrologyKeywords.some((kw) => chairmanRoleLower.includes(kw));

        if (isAstrologyTopic) {
          send("status", { message: "🔍 ตรวจสอบความครบถ้วนของคำถาม..." });
          send("clarification_needed", {
            questions: [
              { id: "astro_name", question: "ชื่อ-นามสกุล ของผู้ต้องการดูดวง", type: "text" },
              { id: "astro_dob", question: "วันเดือนปีเกิด (เช่น 15 มกราคม 2530 หรือ 15/01/2530)", type: "text" },
              { id: "astro_tob", question: "เวลาเกิด (เช่น 08:30) — ถ้าไม่ทราบ ใส่ว่า \"ไม่ทราบ\"", type: "text" },
              { id: "astro_birthplace", question: "จังหวัด/ประเทศเกิด (เช่น กรุงเทพฯ, เชียงใหม่, ลอนดอน) — ถ้าไม่ทราบ ใส่ว่า \"กรุงเทพฯ\"", type: "text" },
              { id: "astro_concern", question: "ประเด็นหลักที่ต้องการทราบ (เช่น การงาน การเงิน ความรัก สุขภาพ)", type: "choice", options: ["การงาน/อาชีพ", "การเงิน/ทรัพย์สิน", "ความรัก/ครอบครัว", "สุขภาพ", "โชคลาภ", "ภาพรวมชีวิต"] },
            ],
          });
          if (keepaliveInterval) clearInterval(keepaliveInterval);
          send("done", { sessionId, clarificationPending: true });
          controller.close();
          return;
        }

        const chairApiKeyP0 = await getAgentApiKey(chairman.id);
        if (chairApiKeyP0) {
          try {
            send("status", { message: "🔍 ตรวจสอบความครบถ้วนของคำถาม..." });
            const clarifyResult = await callLLM(chairman.provider, chairman.model, chairApiKeyP0, chairman.baseUrl, [
              {
                role: "system",
                content: `คุณคือ ${chairman.name} (${chairman.role}) ทำหน้าที่ประธานก่อนเริ่มประชุม
ประเมินว่าคำถามต้องการข้อมูลเพิ่มเติมหรือไม่ แล้วตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น:
{
  "needsClarification": true/false,
  "questions": [
    {
      "id": "q1",
      "question": "คำถามภาษาไทย",
      "type": "choice" | "text",
      "options": ["ตัวเลือก1", "ตัวเลือก2"] // เฉพาะ type=choice
    }
  ]
}

กฎ:
- ถ้าคำถามชัดเจนพอที่จะตอบได้แม้ไม่มีข้อมูลเพิ่ม → needsClarification: false
- ถ้าคำตอบจะเปลี่ยนไปมากขึ้นอยู่กับรายละเอียดที่ขาด → needsClarification: true
- ถามไม่เกิน 4 ข้อ เน้นสิ่งที่กระทบคำตอบจริงๆ
- ตัวเลือก choice ควรครอบคลุมกรณีทั่วไป (3-5 ตัวเลือก)

ตัวอย่างตามโดเมน:
- บัญชี/ภาษี: ประเภทนิติบุคคล, ขนาดกิจการ, จดทะเบียนVATหรือไม่, ประเภทสินค้า/บริการ
- โหราศาสตร์/ดูดวง: ชื่อ-นามสกุล, วันเดือนปีเกิด (พ.ศ.), เวลาเกิด (ถ้ามี), ประเด็นที่ต้องการทราบ
- กฎหมาย: ประเภทคดี, คู่กรณี, ข้อเท็จจริงสำคัญ
- อื่นๆ: ใช้บริบทของ soul/role เพื่อกำหนดว่าข้อมูลใดจำเป็น`,
              },
              {
                role: "user",
                content: `ประเมินคำถามนี้: "${question}"${fileContexts?.length ? "\n(มีเอกสารแนบมาด้วย)" : ""}${conversationHistory?.length ? "\n(มีประวัติการประชุมก่อนหน้า)" : ""}`,
              },
            ], clientSignal);

            try {
              const jsonMatch = clarifyResult.content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.needsClarification && parsed.questions?.length > 0) {
                  send("clarification_needed", {
                    questions: parsed.questions.slice(0, 3),
                  });
                  if (keepaliveInterval) clearInterval(keepaliveInterval);
                  send("done", { sessionId, clarificationPending: true });
                  controller.close();
                  return;
                }
              }
            } catch { /* proceed without clarification */ }
          } catch { /* proceed without clarification */ }
        }
      }

      // Chairman opens the meeting
      {
        const apiKey = await getAgentApiKey(chairman.id);
        if (apiKey) {
          try {
            const openingResult = await callLLM(chairman.provider, chairman.model, apiKey, chairman.baseUrl, [
              {
                role: "system",
                content: `${companyContext}${memoryContext}${chairman.soul}${dataSourceContext}${historyContext}${fileContext}${clarificationContext}\n\nคุณเป็นประธานการประชุม มีหน้าที่เปิดประชุม กำหนดวาระ และนำทีมหาข้อสรุป`,
              },
              {
                role: "user",
                content: `กรุณาเปิดการประชุมสำหรับวาระ: "${question}"\n\nชี้แจงวัตถุประสงค์สั้นกระชับ (3-5 ประโยค) และกำหนดประเด็นหลัก 2-3 ข้อที่ต้องการหาคำตอบ เพื่อให้ทีมงานวิเคราะห์ในทิศทางเดียวกัน\n\n⚠️ สำคัญ: พูดกระชับ ไม่ต้องอธิบายรายละเอียดยาว เพราะทีมจะนำเสนอข้อมูลเชิงลึกเอง`,
              },
            ], clientSignal);

            const openingMsg: ResearchMessage = {
              id: crypto.randomUUID(),
              agentId: chairman.id,
              agentName: chairman.name,
              agentEmoji: chairman.emoji,
              role: "finding",
              content: `🏛️ **เปิดการประชุม**\n\n${openingResult.content}`,
              tokensUsed: openingResult.inputTokens + openingResult.outputTokens,
              timestamp: new Date().toISOString(),
            };
            await appendResearchMessage(sessionId, openingMsg);
            send("message", openingMsg);
            agentTokens[chairman.id] = { input: openingResult.inputTokens, output: openingResult.outputTokens };
          } catch { /* skip opening if error */ }
        }
      }

      // Phase 1: Each agent presents their analysis (PARALLEL — all agents analyze simultaneously)
      send("status", { message: "📋 Phase 1 — ผู้เชี่ยวชาญทุกคนวิเคราะห์พร้อมกัน..." });

      // Step 1: Send all "thinking" messages upfront so UI shows all agents working
      for (const agent of orderedAgents) {
        send("agent_start", { agentId: agent.id, name: agent.name, emoji: agent.emoji, role: agent.role, isChairman: agent.id === chairman.id });
        const thinkingMsg: ResearchMessage = {
          id: crypto.randomUUID(),
          agentId: agent.id,
          agentName: agent.name,
          agentEmoji: agent.emoji,
          role: "thinking",
          content: `กำลังวิเคราะห์: "${question.slice(0, 80)}${question.length > 80 ? "..." : ""}"`,
          tokensUsed: 0,
          timestamp: new Date().toISOString(),
        };
        // Don't persist thinking to DB — only send via SSE for live UI
        send("message", thinkingMsg);
      }

      // Step 2: Fire all LLM calls in parallel
      interface Phase1Result {
        agent: typeof orderedAgents[0];
        result?: { content: string; inputTokens: number; outputTokens: number };
        searchContext?: string;
        error?: string;
      }

      const phase1Promises = orderedAgents.map(async (agent): Promise<Phase1Result> => {
        try {
          const apiKey = await getAgentApiKey(agent.id);
          if (!apiKey) return { agent, error: "No API key configured" };

          // MCP context
          let mcpContext = "";
          if (!disableMcp && agent.mcpEndpoint) {
            mcpContext = await fetchMcpContext(agent.mcpEndpoint, agent.mcpAccessMode ?? "general", question);
          }

          // Web search
          let searchContext = "";
          if ((agent.useWebSearch || doAutoSearch) && (serperKey || serpApiKeyVal)) {
            const searchQuery = await rewriteSearchQuery(question, agent.provider, agent.model, apiKey, agent.baseUrl, clientSignal);
            send("agent_searching", { agentId: agent.id, query: searchQuery });
            const { text: searchResults, sources } = await webSearch(searchQuery, serperKey, serpApiKeyVal, agent.trustedUrls);
            if (searchResults) searchContext = `\n\n🔍 ผลการค้นหาเพิ่มเติมจากอินเทอร์เน็ต:\n${searchResults}\n`;
            if (sources.length > 0) send("web_sources", { agentId: agent.id, sources });
          }

          const isChairman = agent.id === chairman.id;
          const roleInstruction = isChairman
            ? `คุณเป็นประธานการประชุม นำเสนอมุมมองจากตำแหน่ง ${agent.role} ของคุณ`
            : `นำเสนอมุมมองจากมุมมองของ ${agent.role} อย่างชัดเจนและตรงประเด็น`;

          const knowledgeContext = await getAgentKnowledgeContent(agent.id, question);
          const agentVoice = getAgentVoice(agent.role);
          const result = await callLLMWithRetry(agent.provider, agent.model, apiKey, agent.baseUrl, [
            {
              role: "system",
              content: `${companyContext}${memoryContext}${agent.soul}${agentVoice}${knowledgeContext}${domainKnowledge}${dataSourceContext}${historyContext}${fileContext}${mcpContext}${searchContext}${clarificationContext}${dateContext}${antiHallucinationRules}${astrologyAntiHallucinationRules}`,
            },
            {
              role: "user",
              content: `วาระการประชุม: ${question}\n\n${roleInstruction}\n\nกรุณาวิเคราะห์เชิงลึกจากมุมมองเฉพาะทางของ ${agent.role} พร้อมระบุ:\n1. ประเด็นสำคัญจากมุมมองเฉพาะบทบาทของคุณ\n2. ความเสี่ยงหรือข้อกังวลจากมุมมองของคุณ\n3. ข้อเสนอแนะเฉพาะทาง${isAstrologySession ? "\n4. ⚠️ ทายทัก — สิ่งที่ควรระวังเป็นพิเศษจากศาสตร์ของ " + agent.role + ":\n   แต่ละทายทักต้องระบุครบ 5 องค์ประกอบ: ① เรื่องอะไร ② ช่วงเดือน/เวลาไหน ③ กลไก (ดาว/ธาตุ/เลขฐานที่ทำให้เกิด) ④ % ความน่าจะเป็น (ไม่เกิน 75%) ⑤ วิธีรับมือ\n   - ระยะสั้น (3 เดือนนี้): อย่างน้อย 2 ทายทัก ระบุเดือนที่ชัดเจน\n   - ระยะยาว (1 ปีข้างหน้า): อย่างน้อย 2 ทายทัก ระบุช่วงเวลา" : ""}${fileContexts?.length ? "\n\nอ้างอิงข้อมูลจากเอกสารที่แนบมาด้วย" : ""}\n\n⚠️ ความยาว: ตอบกระชับไม่เกิน ${isAstrologySession ? "1000" : "800"} คำ เน้นประเด็นสำคัญที่สุด 3-5 ข้อ ไม่ต้องอารัมภบทยาว\n⚠️ วิเคราะห์เฉพาะในขอบเขตบทบาท ${agent.role} ของคุณเท่านั้น ไม่ต้องรุกล้ำบทบาทผู้เชี่ยวชาญคนอื่น\n\n⚠️ กฎเหล็กด้านความถูกต้อง:\n- ตอบในบริบทกฎหมายและมาตรฐานของประเทศไทยเป็นหลัก\n- ตอบเจาะจงกรณีที่ผู้ถามถาม อย่าพูดหลักการทั่วไปที่ไม่ตรงกับกรณีของเขา\n- ก่อนสรุปว่าต้องเสียภาษีหรือปฏิบัติตามกฎใด ต้องตรวจสอบข้อยกเว้น (exemptions) ตามกฎหมายก่อนเสมอ (เช่น ม.81 สำหรับ VAT, ม.65 ทวิ/ตรี สำหรับ CIT)\n- ถ้ามีข้อยกเว้นที่ทำให้กรณีนี้ต่างจากกฎทั่วไป ให้ระบุข้อยกเว้นนั้นเป็นจุดหลัก ไม่ใช่แค่หมายเหตุท้าย\n- อ้างอิงมาตรากฎหมาย พ.ร.ก. คำวินิจฉัย หรือแนวปฏิบัติที่เกี่ยวข้องให้ชัดเจน\n- ห้ามให้ข้อมูลที่ขัดแย้งกันในคำตอบเดียวกัน`,
              // isAstrologySession flag is set above — injects ทายทัก section only for astrology topics
            },
          ], clientSignal);

          return { agent, result, searchContext };
        } catch (err) {
          console.error(`Agent ${agent.id} Phase 1 error:`, err);
          return { agent, error: "LLM connection error" };
        }
      });

      const phase1Results = await Promise.allSettled(phase1Promises);

      // Step 3: Emit results sequentially (staggered) in seniority order for smooth UX
      for (let i = 0; i < orderedAgents.length; i++) {
        const settled = phase1Results[i];
        const agent = orderedAgents[i];

        if (i > 0) await delay(120); // Stagger for natural feel

        send("agent_start", { agentId: agent.id, name: agent.name, emoji: agent.emoji, role: agent.role, isChairman: agent.id === chairman.id });

        if (settled.status === "rejected" || (settled.status === "fulfilled" && settled.value.error)) {
          const errMsg = settled.status === "rejected" ? "LLM connection error" : settled.value.error!;
          send("agent_error", { agentId: agent.id, error: errMsg });
          failedAgents.push(`${agent.emoji} ${agent.name} (${agent.role})`);

          const errorMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            role: "finding",
            content: `⚠️ ไม่สามารถวิเคราะห์ได้ — ${errMsg}`,
            tokensUsed: 0,
            timestamp: new Date().toISOString(),
          };
          await appendResearchMessage(sessionId, errorMsg);
          send("message", errorMsg);
          continue;
        }

        const { result, searchContext } = settled.value;
        if (!result) continue;

        const prevTokens = agentTokens[agent.id] ?? { input: 0, output: 0 };
        agentTokens[agent.id] = {
          input: prevTokens.input + result.inputTokens,
          output: prevTokens.output + result.outputTokens,
        };

        const findingMsg: ResearchMessage = {
          id: crypto.randomUUID(),
          agentId: agent.id,
          agentName: agent.name,
          agentEmoji: agent.emoji,
          role: "finding",
          content: result.content,
          tokensUsed: result.inputTokens + result.outputTokens,
          timestamp: new Date().toISOString(),
        };
        await appendResearchMessage(sessionId, findingMsg);
        send("message", findingMsg);
        send("agent_tokens", {
          agentId: agent.id,
          inputTokens: agentTokens[agent.id].input,
          outputTokens: agentTokens[agent.id].output,
          totalTokens: agentTokens[agent.id].input + agentTokens[agent.id].output,
        });
        await updateAgentStats(agent.id, result.inputTokens, result.outputTokens);

        agentFindings.push({
          agentId: agent.id,
          name: agent.name,
          emoji: agent.emoji,
          role: agent.role,
          content: result.content,
          searchResults: searchContext || undefined,
        });
      }

      // Consensus check: chairman evaluates if agents agree → skip Phase 2
      let skipDiscussion = false;
      if (agentFindings.length > 1) {
        const chairApiKeyCC = await getAgentApiKey(chairman.id);
        if (chairApiKeyCC) {
          try {
            const findingsSummary = agentFindings
              .map((f) => `[${f.emoji} ${f.name}]: ${f.content}`)
              .join("\n\n");
            const consensusResult = await callLLM(chairman.provider, chairman.model, chairApiKeyCC, chairman.baseUrl, [
              {
                role: "system",
                content: 'ประเมินว่าผู้เชี่ยวชาญเห็นตรงกันหรือไม่ ตอบเป็น JSON เท่านั้น: {"consensus": true/false, "reason": "เหตุผลสั้นๆ"}\n\nconsensus=true หมายถึง ทุกคนเห็นตรงกันในสาระสำคัญ เช่น ข้อสรุปเหมือนกัน แม้จะมีรายละเอียดเสริมที่ต่างกัน\nconsensus=false หมายถึง มีความเห็นขัดแย้งจริงๆ เช่น สรุปตรงข้ามกัน ตีความกฎหมายต่างกัน แนะนำวิธีต่างกัน',
              },
              { role: "user", content: `วาระ: ${question}\n\nข้อสรุปของแต่ละคน:\n${findingsSummary}` },
            ], clientSignal);
            try {
              const jsonMatch = consensusResult.content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.consensus === true) {
                  skipDiscussion = true;
                  send("status", { message: `✅ ผู้เชี่ยวชาญเห็นพ้องกัน — ข้ามขั้นอภิปราย (${parsed.reason || "consensus"})` });
                }
              }
            } catch { /* proceed with discussion */ }
          } catch { /* proceed with discussion */ }
        }
      }

      // Phase 2: Cross-discussion — agents respond to each other based on their actual soul/role
      if (agentFindings.length > 1 && !skipDiscussion) {
        send("status", { message: "💬 Phase 2 — อภิปรายแลกเปลี่ยนความเห็น (ตามบทบาทจริง)" });

        for (let i = 0; i < orderedAgents.length; i++) {
          const agent = orderedAgents[i];
          const apiKey = await getAgentApiKey(agent.id);
          if (!apiKey) continue;

          // Summarize other agents' findings (max 500 chars each to reduce tokens)
          const otherFindings = agentFindings
            .filter((f) => f.agentId !== agent.id)
            .map((f) => `[${f.emoji} ${f.name} — ${f.role}]:\n${f.content.slice(0, 500)}${f.content.length > 500 ? "..." : ""}`)
            .join("\n\n---\n\n");

          const myFinding = agentFindings.find((f) => f.agentId === agent.id);
          if (!myFinding) continue;

          try {
            const knowledgeCtx = await getAgentKnowledgeContent(agent.id, question);
            const agentVoice2 = getAgentVoice(agent.role);
            const result = await callLLM(agent.provider, agent.model, apiKey, agent.baseUrl, [
              {
                role: "system",
                content: `${companyContext}${memoryContext}${agent.soul}${agentVoice2}${knowledgeCtx}${domainKnowledge}${clarificationContext}${dateContext}${antiHallucinationRules}\n\nคุณกำลังอยู่ในวงอภิปราย จงแสดงความเห็นตามบทบาท ${agent.role} ของคุณอย่างตรงไปตรงมา\n\n⚠️ กฎเหล็กของการอภิปราย:\n1. ห้ามพูดแค่ "เห็นด้วย" โดยไม่มีเนื้อหาใหม่ — ถ้าเห็นด้วยต้องเสริมมุมมองใหม่ที่คนอื่นยังไม่ได้พูด\n2. คุณต้องระบุอย่างน้อย 1 จุดที่ไม่เห็นด้วยหรือมีข้อกังวล พร้อมเหตุผลจากประสบการณ์ในบทบาท ${agent.role}\n3. คุณต้องชี้อย่างน้อย 1 ความเสี่ยงหรือข้อควรระวังที่คนอื่นอาจมองข้าม\n4. พูดกระชับ เน้นเฉพาะจุดที่ต่างจากคนอื่น ไม่ต้องสรุปซ้ำสิ่งที่ทุกคนเห็นตรงกันแล้ว\n5. ถ้าพบว่าคนอื่นให้ข้อมูลที่ไม่ถูกต้องหรืออ้างกฎหมายผิด ต้องชี้แจงและแก้ไขทันที พร้อมอ้างอิงมาตราที่ถูกต้อง\n6. ถ้าคนอื่นสรุปว่าต้องเสียภาษี/ปฏิบัติตามกฎใด โดยยังไม่ได้ตรวจสอบข้อยกเว้นตามกฎหมาย ต้องชี้ให้ตรวจสอบทันที\n7. ห้ามให้ข้อมูลที่ขัดแย้งกับข้อสรุปของตัวเอง`,
              },
              {
                role: "user",
                content: `วาระ: ${question}\n\nสรุปมุมมองของคุณ:\n${myFinding.content.slice(0, 500)}${myFinding.content.length > 500 ? "..." : ""}\n\n---\nมุมมองจากสมาชิกคนอื่น:\n${otherFindings}\n\n---\nในฐานะ ${agent.role}:\n1. ระบุจุดที่คุณไม่เห็นด้วยกับใคร เพราะอะไร?\n2. มีความเสี่ยงอะไรที่คนอื่นมองข้าม?\n3. มีข้อเสนอเพิ่มเติมจากมุมมอง ${agent.role} ของคุณไหม?\n\n⚠️ ความยาว: ตอบกระชับไม่เกิน 400 คำ เน้นจุดที่เห็นต่างเท่านั้น ไม่ต้องสรุปซ้ำสิ่งที่ทุกคนเห็นตรงกัน`,
              },
            ], clientSignal);

            const tokens = agentTokens[agent.id] ?? { input: 0, output: 0 };
            agentTokens[agent.id] = {
              input: tokens.input + result.inputTokens,
              output: tokens.output + result.outputTokens,
            };

            const chatMsg: ResearchMessage = {
              id: crypto.randomUUID(),
              agentId: agent.id,
              agentName: agent.name,
              agentEmoji: agent.emoji,
              role: "chat",
              content: result.content,
              tokensUsed: result.inputTokens + result.outputTokens,
              timestamp: new Date().toISOString(),
            };
            await appendResearchMessage(sessionId, chatMsg);
            send("message", chatMsg);
            send("agent_tokens", {
              agentId: agent.id,
              inputTokens: agentTokens[agent.id].input,
              outputTokens: agentTokens[agent.id].output,
              totalTokens: agentTokens[agent.id].input + agentTokens[agent.id].output,
            });
            await updateAgentStats(agent.id, result.inputTokens, result.outputTokens);
          } catch (err) {
            console.error(`Agent ${agent.id} Phase 2 error:`, err);
            send("agent_error", { agentId: agent.id, error: "LLM connection error" });
            failedAgents.push(`${agent.emoji} ${agent.name} (${agent.role})`);
          }
        }
      }

      // Track agents that had no findings (failed in Phase 1)
      const respondedAgentIds = new Set(agentFindings.map((f) => f.agentId));
      silentAgents = orderedAgents
        .filter((a) => !respondedAgentIds.has(a.id))
        .map((a) => `${a.emoji} ${a.name} (${a.role})`);

      } // end if (mode !== "close") — Phase 1+2

      // === Phase 1.5: Astrology Consistency Verification (only for astrology sessions with multiple agents) ===
      if (isAstrologySession && agentFindings.length >= 2 && mode !== "close") {
        const chairApiKeyV = await getAgentApiKey(chairman.id);
        if (chairApiKeyV) {
          try {
            send("status", { message: "🔮 Phase 1.5 — ตรวจสอบความสอดคล้องระหว่างผู้เชี่ยวชาญ..." });
            const findingsSummary = agentFindings
              .map((f) => `[${f.emoji} ${f.name} (${f.role})]:\n${f.content.slice(0, 800)}`)
              .join("\n\n---\n\n");
            const verifyResult = await callLLM(chairman.provider, chairman.model, chairApiKeyV, chairman.baseUrl, [
              {
                role: "system",
                content: `คุณเป็นผู้ตรวจสอบความสอดคล้องของการวิเคราะห์โหราศาสตร์ ตรวจสอบว่าผู้เชี่ยวชาญแต่ละคนให้ข้อมูลขัดแย้งกันหรือไม่ในประเด็นเหล่านี้:
1. Ascendant/ลัคนาราศี — ผู้เชี่ยวชาญระบุตรงกันหรือไม่
2. Day Master/ธาตุประจำตัว — ผู้เชี่ยวชาญระบุตรงกันหรือไม่
3. ฐานเลขหรือช่วงอายุ — คำนวณตรงกันหรือไม่
4. ทิศทางชีวิตโดยรวม — สอดคล้องหรือขัดแย้งกัน

ตอบกระชับในรูปแบบนี้:
- ถ้าพบความขัดแย้ง: ระบุว่า "⚠️ ความขัดแย้ง: [ประเด็น] — [ชื่อ A] ระบุว่า [X] แต่ [ชื่อ B] ระบุว่า [Y]"
- ถ้าไม่พบความขัดแย้ง: ระบุว่า "✅ ข้อมูลสอดคล้องกัน"
- จบด้วย: "📌 ข้อสังเกตสำหรับประธาน: [สิ่งที่ประธานควรตรวจสอบหรือระบุให้ชัดเจนในรายงานสรุป]"
ห้ามอธิบายยืดยาว ตอบไม่เกิน 200 คำ`,
              },
              { role: "user", content: `วาระ: ${question}\n\nข้อมูลจากผู้เชี่ยวชาญ:\n${findingsSummary}` },
            ], clientSignal);
            const verifyContent = verifyResult.content.trim();
            if (verifyContent) {
              const verifyMsg: ResearchMessage = {
                id: crypto.randomUUID(),
                agentId: chairman.id,
                agentName: `${chairman.name} (ตรวจสอบความสอดคล้อง)`,
                agentEmoji: "🔍",
                role: "verification" as ResearchMessage["role"],
                content: `**Phase 1.5 — ตรวจสอบความสอดคล้องระหว่างผู้เชี่ยวชาญ**\n\n${verifyContent}`,
                tokensUsed: verifyResult.inputTokens + verifyResult.outputTokens,
                timestamp: new Date().toISOString(),
              };
              await appendResearchMessage(sessionId, verifyMsg);
              send("message", verifyMsg);
              // Pass conflicts into factCheckNote so synthesis chairman is aware
              if (verifyContent.includes("⚠️")) {
                // Will be picked up by factCheckNote below
                (globalThis as Record<string, unknown>)[`_astroConflict_${sessionId}`] = `\n\n🔮 ผลตรวจสอบความสอดคล้องโหราศาสตร์:\n${verifyContent}`;
              }
            }
          } catch { /* skip verification on error */ }
        }
      }

      // === Fact-checking phase: verify cited laws/facts before synthesis ===
      let factCheckNote = "";
      if (agentFindings.length > 0 && mode !== "close") {
        const chairApiKeyFC = await getAgentApiKey(chairman.id);
        if (chairApiKeyFC) {
          try {
            send("status", { message: "🔎 ตรวจสอบความถูกต้องของข้อมูลที่อ้างอิง..." });
            const citedContent = agentFindings
              .map((f) => `[${f.emoji} ${f.name}]: ${f.content.slice(0, 600)}`)
              .join("\n\n");
            const fcResult = await callLLM(chairman.provider, chairman.model, chairApiKeyFC, chairman.baseUrl, [
              {
                role: "system",
                content: `คุณเป็นผู้ตรวจสอบข้อเท็จจริง (Fact Checker) สำหรับการประชุมที่ปรึกษาบัญชี/ภาษีไทย
ตรวจสอบข้อมูลที่ผู้เชี่ยวชาญอ้างอิง:
1. เลขมาตรากฎหมาย/พ.ร.บ. ตรงกับเนื้อหาจริงหรือไม่
2. มีข้อมูลที่ขัดแย้งกันระหว่างผู้เชี่ยวชาญหรือไม่
3. มีการอ้างอิงที่อาจไม่ถูกต้อง (fabricated references) หรือไม่

ตอบกระชับ ระบุเฉพาะข้อที่พบปัญหา ถ้าทุกอย่างถูกต้อง ตอบว่า "ไม่พบข้อผิดพลาด"
ห้ามอธิบายยาว ระบุเป็นข้อๆ สั้นๆ${domainKnowledge}`,
              },
              { role: "user", content: `วาระ: ${question}\n\nข้อมูลจากผู้เชี่ยวชาญ:\n${citedContent}` },
            ], clientSignal);
            const fcContent = fcResult.content.trim();
            if (fcContent && !fcContent.includes("ไม่พบข้อผิดพลาด")) {
              factCheckNote = `\n\n⚠️ ผลการตรวจสอบข้อเท็จจริง (Fact Check):\n${fcContent}\n— กรุณาพิจารณาข้อสังเกตเหล่านี้ในการสรุปมติ`;
              send("status", { message: "⚠️ พบข้อสังเกตจากการตรวจสอบ — ส่งต่อให้ประธานพิจารณา" });
            } else {
              send("status", { message: "✅ ตรวจสอบข้อเท็จจริงแล้ว — ไม่พบข้อผิดพลาด" });
            }
            // Merge astrology conflict note if any
            const _astroConflictKey = `_astroConflict_${sessionId}`;
            const _astroConflict = (globalThis as Record<string, unknown>)[_astroConflictKey] as string | undefined;
            if (_astroConflict) {
              factCheckNote += _astroConflict;
              delete (globalThis as Record<string, unknown>)[_astroConflictKey];
            }
          } catch { /* skip fact-check on error */ }
        }
      }

      // === Phase 3: Chairman synthesis (skip in "discuss" mode) ===
      if (mode !== "discuss") {

      send("status", { message: "🏛️ Phase 3 — ประธานสรุปมติและ Action Items" });

      const chairApiKey = await getAgentApiKey(chairman.id);

      // Build allContext from either current round findings or all rounds (close mode)
      let allContext = "";
      const SYNTHESIS_MSG_CAP = 2000; // per-message cap to prevent synthesis timeout
      if (mode === "close" && allRounds && allRounds.length > 0) {
        // Close mode: cap each message to prevent LLM timeout on large sessions
        allContext = allRounds.map((round: { question: string; messages: { agentEmoji: string; agentName: string; role: string; content: string }[] }, i: number) => {
          const isRecent = i >= allRounds.length - 2;
          const msgs = (round.messages ?? [])
            .filter((m: { role: string }) => m.role !== "thinking")
            .map((m: { agentEmoji: string; agentName: string; role: string; content: string }) => {
              const cap = isRecent ? SYNTHESIS_MSG_CAP : 300;
              const text = m.content.length > cap
                ? m.content.slice(0, Math.floor(cap * 0.7)) + "\n\n[...สรุปย่อ...]\n\n" + m.content.slice(-Math.floor(cap * 0.3))
                : m.content;
              return `[${m.agentEmoji} ${m.agentName} — ${m.role}]:\n${text}`;
            })
            .join("\n\n");
          return `=== วาระที่ ${i + 1}: ${round.question} ${!isRecent ? "(สรุปย่อ)" : ""} ===\n${msgs}`;
        }).join("\n\n---\n\n");
      } else {
        // Full/default mode: use current round findings
        // Cap each finding at 3000 chars to prevent synthesis timeout on large sessions
        const SYNTHESIS_FINDING_CAP = 3000;
        allContext = agentFindings
          .map((f) => {
            const text = f.content.length > SYNTHESIS_FINDING_CAP
              ? f.content.slice(0, 1500) + "\n\n[...สรุปย่อ...]\n\n" + f.content.slice(-1000)
              : f.content;
            return `[${f.emoji} ${f.name} — ${f.role}]:\n${text}`;
          })
          .join("\n\n---\n\n");
      }

      if (chairApiKey && allContext.length > 0) {
        try {
          // Build awareness of agent failures for synthesis
          let failureNote = "";
          if (silentAgents.length > 0 || failedAgents.length > 0) {
            const allFailed = [...new Set([...silentAgents, ...failedAgents])];
            failureNote = `\n\n⚠️ หมายเหตุ: ผู้เชี่ยวชาญต่อไปนี้ไม่สามารถนำเสนอข้อมูลได้ในการประชุมนี้: ${allFailed.join(", ")} — ให้ระบุในรายงานว่ายังขาดมุมมองจากตำแหน่งเหล่านี้ และอาจต้องประชุมเพิ่มเติม`;
          }

          const result = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
            {
              role: "system",
              content: `${companyContext}${memoryContext}คุณเป็นประธานการประชุมในบทบาท ${chairman.role} มีหน้าที่สรุปมติที่ประชุมให้ชัดเจน ถูกต้อง ครบถ้วน ห้ามสรุปผิดจากข้อเท็จจริงที่นำเสนอ${mode === "close" && allRounds && allRounds.length > 1 ? ` (การประชุมนี้มี ${allRounds.length} วาระ สรุปรวมทั้งหมด)` : ""}${failureNote}${factCheckNote}${domainKnowledge}${clarificationContext}${dateContext}${antiHallucinationRules}${astrologyAntiHallucinationRules}`,
            },
            {
              role: "user",
              content: `${mode === "close" && allRounds && allRounds.length > 1 ? `การประชุมครั้งนี้มี ${allRounds.length} วาระที่อภิปราย:\n\n` : `วาระ: ${question}\n\n`}ความเห็นจากทีมที่ปรึกษา:\n\n${allContext}\n\n---\nกรุณาสรุปเป็นรายงานสรุปมติ เข้าเนื้อหาเลยไม่ต้องมี header วันที่/สถานที่/ผู้เข้าร่วม (นี่คือระบบ AI อัตโนมัติ):\n1. **คำตอบหลัก** — ตอบคำถามของผู้ถามให้ชัดเจนตรงประเด็นก่อนเลย (ใช่/ไม่ใช่/มี/ไม่มี + เหตุผลสั้นๆ)\n2. **ประเด็นที่ที่ประชุมเห็นพ้องกัน** — สิ่งที่ทุกฝ่ายเห็นตรงกัน\n3. **ประเด็นที่ยังมีความเห็นต่าง** — ระบุชัดเจนว่าใครเห็นต่างอย่างไร พร้อมเหตุผลแต่ละฝ่าย\n4. **มติที่ประชุม** — ข้อสรุปที่ดีที่สุดพร้อมเหตุผลที่หนักแน่น\n5. **Action Items** — สิ่งที่ต้องดำเนินการต่อ (ระบุผู้รับผิดชอบตาม role)\n${isAstrologySession ? "6. **⚠️ ทายทัก รวมจากทุกศาสตร์** — สรุปคำทำนายเชิง predictive ที่ผู้เชี่ยวชาญระบุไว้ (เฉพาะทายทักที่ระบุครบ 5 องค์ประกอบ: เรื่อง+เดือน+กลไก+%+รับมือ):\n   - **ระยะสั้น (3 เดือนนี้):** ทายทักที่ผู้เชี่ยวชาญ ≥2 คนเห็นตรงกัน ระบุเดือนชัดเจน\n   - **ระยะยาว (1 ปีข้างหน้า):** แนวโน้มสำคัญพร้อมช่วงเวลา\n   - ⚠️ ระบุถ้าผู้เชี่ยวชาญคนใดระบุทายทักไม่ครบ 5 องค์ประกอบ\n7. **ข้อจำกัดและสิ่งที่ต้องตรวจสอบเพิ่มเติม** — ข้อมูลที่ยังขาดหรือต้องยืนยัน" : "6. **ข้อจำกัดและสิ่งที่ต้องตรวจสอบเพิ่มเติม** — ข้อมูลที่ยังขาดหรือต้องยืนยัน"}\n\n⚠️ ความยาว: สรุปไม่เกิน ${isAstrologySession ? "2000" : "1500"} คำ เน้นความชัดเจนและกระชับ\n\n⚠️ กฎเหล็กด้านความถูกต้อง:\n- สรุปในบริบทกฎหมายและมาตรฐานของประเทศไทยเป็นหลัก\n- มติต้องตอบเจาะจงกรณีที่ผู้ถามถาม ไม่ใช่หลักการทั่วไป\n- ถ้ามีข้อยกเว้นตามกฎหมายที่เกี่ยวข้อง ต้องระบุชัดเจนในคำตอบหลักว่าเข้าเงื่อนไขยกเว้นหรือไม่\n- ห้ามมีข้อมูลขัดแย้งกันในรายงาน (เช่น เปิดด้วย \"ยกเว้น\" แต่สรุปว่า \"ต้องเสีย\")\n- ข้อมูลตัวเลข มาตรากฎหมาย ต้องถูกต้องตรงกับข้อมูลต้นฉบับ ห้ามปัดเศษหรือประมาณค่า\n- ถ้าผู้เชี่ยวชาญให้ข้อมูลขัดกัน ต้องวิเคราะห์ว่าฝ่ายไหนถูกต้องกว่า พร้อมอ้างอิงมาตราเฉพาะ\n\nจากนั้นให้เพิ่มบรรทัดสุดท้ายเป็น JSON สำหรับ visualization ในรูปแบบ:\n\`\`\`chart\n{"type":"bar|line|pie|none","title":"...","labels":[...],"datasets":[{"label":"...","data":[...]}]}\n\`\`\`\nถ้าไม่มีข้อมูลตัวเลขที่เหมาะกับกราฟ ให้ใส่ type: "none"`,
            },
          ], clientSignal);

          const synthMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: chairman.id,
            agentName: chairman.name,
            agentEmoji: chairman.emoji,
            role: "synthesis",
            content: result.content.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim(),
            tokensUsed: result.inputTokens + result.outputTokens,
            timestamp: new Date().toISOString(),
          };
          await appendResearchMessage(sessionId, synthMsg);
          send("message", synthMsg);

          // Parse chart data from synthesis (LLM may use ```chart or ```json)
          const chartMatch = result.content.match(/```(?:chart|json)\n([\s\S]*?)\n```/);
          if (chartMatch) {
            try {
              const chartData = JSON.parse(chartMatch[1]);
              if (chartData.type && chartData.type !== "none") {
                send("chart_data", chartData);
              }
            } catch { /* ignore chart parse error */ }
          }

          // Strip chart/json code blocks from final content
          const cleanContent = result.content.replace(/```(?:chart|json)\n[\s\S]*?\n```/g, "").trim();

          send("final_answer", { content: cleanContent });
          await completeResearchSession(sessionId, cleanContent, "completed");

          // Update chairman tokens
          const prevTokens = agentTokens[chairman.id] ?? { input: 0, output: 0 };
          agentTokens[chairman.id] = {
            input: prevTokens.input + result.inputTokens,
            output: prevTokens.output + result.outputTokens,
          };
          send("agent_tokens", {
            agentId: chairman.id,
            inputTokens: agentTokens[chairman.id].input,
            outputTokens: agentTokens[chairman.id].output,
            totalTokens: agentTokens[chairman.id].input + agentTokens[chairman.id].output,
          });
          await updateAgentStats(chairman.id, result.inputTokens, result.outputTokens);

          // Generate follow-up suggestions
          try {
            const historyForFollowup = conversationHistory && conversationHistory.length > 0
              ? `ประวัติก่อนหน้า:\n${conversationHistory.map((t, i) => `${(mode as string) === "qa" ? "คำถาม" : "วาระ"}ที่ ${i + 1}: ${t.question}`).join("\n")}\n\n`
              : "";
            const followupResult = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
              {
                role: "system",
                content: ((mode as string) === "qa")
                  ? "คุณช่วยแนะนำคำถามต่อเนื่องที่น่าสนใจ ตอบในรูปแบบ JSON array เท่านั้น เช่น [\"คำถาม 1\", \"คำถาม 2\", \"คำถาม 3\"]"
                  : "คุณช่วยแนะนำวาระการประชุมต่อเนื่องที่น่าสนใจ ตอบในรูปแบบ JSON array เท่านั้น เช่น [\"วาระ 1\", \"วาระ 2\", \"วาระ 3\"]",
              },
              {
                role: "user",
                content: ((mode as string) === "qa")
                  ? `${historyForFollowup}คำถามล่าสุด: ${question}\n\nคำตอบ: ${result.content.slice(0, 500)}\n\nแนะนำ 3 คำถามต่อเนื่องที่น่าสนใจ ตอบเป็น JSON array เท่านั้น ไม่ต้องมีข้อความอื่น`
                  : `${historyForFollowup}วาระล่าสุด: ${question}\n\nมติที่ประชุม: ${result.content.slice(0, 500)}\n\nแนะนำ 3 วาระต่อเนื่องที่ควรพิจารณาต่อ ตอบเป็น JSON array เท่านั้น ไม่ต้องมีข้อความอื่น`,
              },
            ], clientSignal);
            try {
              const jsonMatch = followupResult.content.match(/\[[\s\S]*\]/);
              const suggestions: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
              if (suggestions.length > 0) {
                send("follow_up_suggestions", { suggestions: suggestions.slice(0, 3) });
              }
            } catch { /* ignore */ }
          } catch { /* ignore */ }

          // Extract key facts for cross-session memory
          try {
            const memResult = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
              {
                role: "system",
                content: 'จากการประชุม ให้ดึงข้อเท็จจริงสำคัญเกี่ยวกับผู้ถาม/บริษัทที่ควรจำไว้ ตอบเป็น JSON array เท่านั้น: [{"key":"ชื่อภาษาอังกฤษสั้นๆ","value":"ค่า"}]\n\nตัวอย่าง key: vat_registered, company_type, business_sector, employee_count, accounting_standard, fiscal_year\nถ้าไม่มีข้อมูลใหม่ที่ควรจำ ตอบ []',
              },
              { role: "user", content: `${(mode as string) === "qa" ? "คำถาม" : "วาระ"}: ${question}\n\nข้อมูลจากผู้ถาม: ${clarificationContext || "ไม่มี"}\n\n${(mode as string) === "qa" ? "คำตอบ" : "มติ"}: ${result.content.slice(0, 500)}` },
            ], clientSignal);
            try {
              const jsonMatch = memResult.content.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const facts: { key: string; value: string }[] = JSON.parse(jsonMatch[0]);
                for (const f of facts.slice(0, 5)) {
                  if (f.key && f.value && typeof f.key === "string" && typeof f.value === "string") {
                    void upsertMemoryFact(userId, f.key, f.value, sessionId);
                  }
                }
              }
            } catch { /* ignore parse error */ }
          } catch { /* ignore memory extraction error */ }

        } catch (err) {
          console.error("Research session error:", err);
          await completeResearchSession(sessionId, "Processing error", "error");
          send("error", { message: "เกิดข้อผิดพลาดในการประมวลผล" });
        }
      } else if (mode !== "close") {
        // Only auto-complete for "full" mode when no chairman API key
        await completeResearchSession(sessionId, agentFindings[0]?.content ?? "", "completed");
        send("final_answer", { content: agentFindings[0]?.content ?? "" });
      }

      } // end if (mode !== "discuss") — Phase 3

      if (keepaliveInterval) clearInterval(keepaliveInterval);
      send("done", { sessionId });
      controller.close();
    },
    cancel() {
      // Client disconnected — abort any in-flight LLM calls and complete session
      if (keepaliveInterval) clearInterval(keepaliveInterval);
      abortController.abort();
      (async () => {
        try {
          const existing = await getResearchSession(sessionId);
          if (existing && existing.status === "running") {
            await completeResearchSession(sessionId, existing.finalAnswer || "📡 การเชื่อมต่อถูกตัด", "completed");
          }
        } catch { /* best-effort */ }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
