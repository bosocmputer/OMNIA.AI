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
import { buildBirthFacts } from "@/lib/astro-birth-facts";
import { chargeCredits, getCreditBalance, getReadingPrice, isCreditBillingEnabled } from "@/lib/billing";
import {
  checkGuestTrialQuota,
  ensureGuestTrialUser,
  getSuperadminUserId,
  isValidGuestId,
} from "@/lib/guest-trial";
import crypto from "crypto";

// Max request body size (100KB — questions + history + file contexts)
const MAX_BODY_SIZE = 500 * 1024;

interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function getAstrologyConcern(text: string): string {
  const q = text.toLowerCase();
  if (q.includes("งาน") || q.includes("อาชีพ") || q.includes("ธุรกิจ")) return "การงาน/อาชีพ";
  if (q.includes("เงิน") || q.includes("ทรัพย์") || q.includes("ลงทุน")) return "การเงิน/ทรัพย์สิน";
  if (q.includes("รัก") || q.includes("คู่") || q.includes("ครอบครัว")) return "ความรัก/ครอบครัว";
  if (q.includes("สุขภาพ")) return "สุขภาพ";
  if (q.includes("โชค") || q.includes("ลาภ")) return "โชคลาภ";
  if (q.includes("ภาพรวม") || q.includes("รวม") || q.includes("ทั้งปี") || q.includes("12 เดือน")) return "ภาพรวมชีวิต";
  return "";
}

function isBroadAstrologyQuestion(text: string): boolean {
  const q = text.toLowerCase().replace(/\s+/g, "");
  if (getAstrologyConcern(text)) return false;
  return ["ดูดวง", "ดูดวงให้ฉันหน่อย", "ดูดวงให้หน่อย", "ดวงเป็นยังไง", "ช่วยดูดวง"].some((kw) => q.includes(kw.replace(/\s+/g, "")));
}

function isOutcomeQuestion(text: string): boolean {
  const q = text.toLowerCase().replace(/\s+/g, "");
  return [
    "จะผ่านไหม",
    "จะผ่านมั้ย",
    "จะได้ไหม",
    "จะได้มั้ย",
    "จะสำเร็จไหม",
    "จะสำเร็จมั้ย",
    "จะสำเร็จหรือไม่",
    "จะได้หรือไม่",
    "จะผ่านหรือไม่",
    "สอบติด",
    "ติดหรือไม่",
    "ติดไหม",
    "ติดมั้ย",
    "จะตกงาน",
    "จะเลิกไหม",
    "จะเลิกมั้ย",
    "จะขายได้ไหม",
    "จะขายได้มั้ย",
    "เขาจะตอบไหม",
    "เขาจะตอบมั้ย",
    "ใช่ไหม",
    "ใช่มั้ย",
    "ไหม",
    "มั้ย",
  ].some((kw) => q.includes(kw));
}

function isSalesDemoQuestion(text: string): boolean {
  const q = text.toLowerCase();
  const normalized = q.replace(/\s+/g, "");
  const hasSalesMoment = [
    "demo",
    "เดโม",
    "นำเสนอ",
    "พรีเซนต์",
    "present",
    "ขาย",
    "ลูกค้า",
    "proposal",
    "เสนอราคา",
    "ปิดการขาย",
    "นัดคุย",
  ].some((kw) => normalized.includes(kw.replace(/\s+/g, "")));
  const asksOutcome = isOutcomeQuestion(text) || ["สำเร็จ", "ผ่าน", "ได้งาน", "ปิดดีล"].some((kw) => normalized.includes(kw));
  return hasSalesMoment && asksOutcome;
}

function detectTimeFrame(text: string): { label: string; agentInstruction: string; summaryInstruction: string } {
  const q = text.toLowerCase().replace(/\s+/g, "");
  if (
    q.includes("ดูดวงวันนี้") ||
    q.includes("ดวงวันนี้") ||
    q.includes("วันนี้") ||
    q.includes("ประจำวัน") ||
    q.includes("รายวัน") ||
    q.includes("daily")
  ) {
    return {
      label: "วันนี้",
      agentInstruction: "**แนวโน้มวันนี้**\n- แบ่งเป็น เช้า / บ่าย / เย็น-ค่ำ แบบสั้นและชัด\n- ต้องมี: เรื่องเด่นของวันนี้, สิ่งที่ควรระวังวันนี้, จังหวะที่เหมาะกับการตัดสินใจ, และ action เล็ก ๆ ที่ทำได้วันนี้\n- ห้ามลากไปทำนาย 3 เดือนหรือ 12 เดือน เว้นแต่ผู้ใช้ถามเพิ่มเอง\n",
      summaryInstruction: "**แนวโน้มวันนี้**\n- แบ่งเป็น เช้า / บ่าย / เย็น-ค่ำ ให้ชัดเจน\n- ระบุเรื่องเด่นวันนี้ 1 เรื่อง, เรื่องที่ต้องระวังวันนี้ 1 เรื่อง, เวลาหรือจังหวะที่เหมาะกับการลงมือ, และ action เล็ก ๆ ที่ทำได้ในกรอบเวลานี้\n",
    };
  }
  if (q.includes("พรุ่งนี้") || q.includes("วันพรุ่งนี้")) {
    return {
      label: "พรุ่งนี้",
      agentInstruction: "**แนวโน้มพรุ่งนี้**\n- แบ่งเป็น ก่อนเที่ยง / บ่าย / หลังเลิกงานหรือค่ำ แบบสั้นและชัด\n- ต้องมี: เรื่องเด่นพรุ่งนี้, สิ่งที่ควรเตรียมคืนนี้, สิ่งที่ห้ามรีบ, และ action ที่ควรทำพรุ่งนี้\n- ห้ามลากไปทำนาย 3 เดือนหรือ 12 เดือน เว้นแต่ผู้ใช้ถามเพิ่มเอง\n",
      summaryInstruction: "**แนวโน้มพรุ่งนี้**\n- แบ่งก่อนเที่ยง / บ่าย / หลังเลิกงานหรือค่ำ ให้ชัดเจน\n- ระบุสิ่งที่ควรเตรียมตั้งแต่วันนี้, เรื่องเด่นพรุ่งนี้, สิ่งที่ห้ามรีบ, และ action ที่ควรทำพรุ่งนี้\n",
    };
  }
  if (q.includes("สัปดาห์หน้า") || q.includes("อาทิตย์หน้า")) {
    return {
      label: "สัปดาห์หน้า",
      agentInstruction: "**แนวโน้มสัปดาห์หน้า**\n- แบ่งเป็นต้นสัปดาห์ / กลางสัปดาห์ / ปลายสัปดาห์ แบบสั้นและชัด\n",
      summaryInstruction: "**แนวโน้มสัปดาห์หน้า**\n- แบ่งต้นสัปดาห์ / กลางสัปดาห์ / ปลายสัปดาห์ ให้ชัดเจน\n",
    };
  }
  if (q.includes("เดือนหน้า")) {
    return {
      label: "เดือนหน้า",
      agentInstruction: "**แนวโน้มเดือนหน้า**\n- แบ่งเป็นต้นเดือน / กลางเดือน / ปลายเดือน แบบสั้นและชัด\n",
      summaryInstruction: "**แนวโน้มเดือนหน้า**\n- แบ่งต้นเดือน / กลางเดือน / ปลายเดือน ให้ชัดเจน\n",
    };
  }
  if (q.includes("ปีหน้า")) {
    return {
      label: "ปีหน้า",
      agentInstruction: "**แนวโน้มปีหน้า**\n- แบ่งเป็นครึ่งปีแรก / ครึ่งปีหลัง และจุดเปลี่ยนที่ควรจับตา\n",
      summaryInstruction: "**แนวโน้มปีหน้า**\n- แบ่งครึ่งปีแรก / ครึ่งปีหลัง และจุดเปลี่ยนที่ควรจับตา\n",
    };
  }
  if (q.includes("12เดือน") || q.includes("สิบสองเดือน") || q.includes("ทั้งปี") || q.includes("ปีนี้") || q.includes("1ปี") || q.includes("หนึ่งปี")) {
    return {
      label: "12 เดือนข้างหน้า",
      agentInstruction: "**แนวโน้ม 12 เดือนข้างหน้า**\n- แยก 3 เดือนแรก / 4-6 เดือน / 7-12 เดือน โดยแต่ละช่วงต้องมี: เรื่องเด่น 1 เรื่อง, สิ่งที่ควรทำ 1 อย่าง, และสิ่งที่ห้ามรีบ 1 อย่าง\n",
      summaryInstruction: "**แนวโน้ม 12 เดือนข้างหน้า**\n- แยก 3 เดือนแรก / 4-6 เดือน / 7-12 เดือน โดยแต่ละช่วงต้องมี: เรื่องเด่น, สิ่งที่ควรทำ, และสิ่งที่ห้ามรีบ\n\n**ช่วงที่ต้องระวังที่สุด**\n- ระบุช่วงเวลาเดียวที่แรงฉุดเด่นที่สุด พร้อมเรื่องที่ต้องระวังและวิธีรับมือสั้น ๆ\n\n**เรื่องที่ดูไม่ง่ายที่สุด**\n- ระบุ 1 เรื่องที่ยังติดขัดมากที่สุด ห้ามสรุปให้ดีถ้าภาพยังไม่ชัดหรือมีจุดเสี่ยง\n",
    };
  }
  if (q.includes("6เดือน") || q.includes("หกเดือน") || q.includes("ครึ่งปี")) {
    return {
      label: "6 เดือนข้างหน้า",
      agentInstruction: "**แนวโน้ม 6 เดือนข้างหน้า**\n- แบ่งเป็นเดือนที่ 1-2 / 3-4 / 5-6 แบบสั้นและชัด\n",
      summaryInstruction: "**แนวโน้ม 6 เดือนข้างหน้า**\n- แบ่งเป็นเดือนที่ 1-2 / 3-4 / 5-6 โดยแต่ละช่วงมีเรื่องเด่นและสิ่งที่ควรระวัง\n",
    };
  }
  if (q.includes("3เดือน") || q.includes("สามเดือน") || q.includes("ไตรมาส")) {
    return {
      label: "3 เดือนข้างหน้า",
      agentInstruction: "**แนวโน้ม 3 เดือนข้างหน้า**\n- แบ่งเป็นเดือนที่ 1 / เดือนที่ 2 / เดือนที่ 3 แบบสั้นและชัด\n",
      summaryInstruction: "**แนวโน้ม 3 เดือนข้างหน้า**\n- แบ่งเดือนที่ 1 / เดือนที่ 2 / เดือนที่ 3 ให้ชัดเจน พร้อมเดือนที่ควรลุยและเดือนที่ควรระวัง\n",
    };
  }
  if (q.includes("ช่วงนี้") || q.includes("ตอนนี้")) {
    return {
      label: "ช่วงนี้",
      agentInstruction: "**แนวโน้มช่วงนี้**\n- บอกสถานการณ์ตอนนี้ / สิ่งที่กำลังเปิด / สิ่งที่ควรระวังใน 30 วัน\n",
      summaryInstruction: "**แนวโน้มช่วงนี้**\n- บอกสถานการณ์ตอนนี้ / สิ่งที่กำลังเปิด / สิ่งที่ควรระวังใน 30 วัน\n",
    };
  }
  return {
    label: "อนาคตใกล้ ๆ",
    agentInstruction: "**อนาคตใกล้ ๆ**\n- แนวโน้ม 3 เดือน และ 6-12 เดือนแบบเข้าใจง่าย ระบุช่วงเวลาเมื่อพอทำได้\n",
    summaryInstruction: "**แนวโน้มอนาคต**\n- แยก 3 เดือนข้างหน้า และ 6-12 เดือนข้างหน้า ให้ชัดเจน\n",
  };
}

function thaiMonthRoadmapLabels(count: number): string[] {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: "Asia/Bangkok",
    month: "long",
    year: "numeric",
  });
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return formatter.format(date);
  });
}

async function callLLMWithRetry(
  provider: string, model: string, apiKey: string, baseUrl: string | undefined,
  messages: LLMMessage[], signal?: AbortSignal, retries = 1, maxTokens = 1200
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callLLM(provider, model, apiKey, baseUrl, messages, signal, maxTokens);
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
  signal?: AbortSignal,
  maxTokens = 1200
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
        max_tokens: maxTokens,
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
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
      signal,
    });
    // Fallback to gpt-4o-mini if model is invalid (400/404)
    if (!res.ok && (res.status === 400 || res.status === 404)) {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: "openai/gpt-4o-mini", messages, max_tokens: maxTokens, temperature: 0.3 }),
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
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
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
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
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
  onDelta?: (text: string) => void,
  maxTokens = 2048
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  // Only OpenAI-compatible APIs support streaming easily
  if (provider !== "openrouter" && provider !== "openai" && provider !== "custom") {
    const result = await callLLM(provider, model, apiKey, baseUrl, messages, signal, maxTokens);
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
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3, stream: true }),
    signal,
  });
  // Fallback to gpt-4o-mini if model is invalid
  if (!res.ok && provider === "openrouter" && (res.status === 400 || res.status === 404)) {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages, max_tokens: maxTokens, temperature: 0.3, stream: true }),
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

function getAstroRoleFocus(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes("โหรไทย") || lower.includes("จักรทีปนี")) {
    return "\n\n🎯 หน้าที่เฉพาะของศาสตร์นี้: โฟกัสแกนชีวิต จังหวะกดดัน/คลี่คลาย และสิ่งที่ควรรักษาไว้เมื่อชีวิตเริ่มเปลี่ยน ห้ามฟันธงลัคนาหรือดาวเจ้าเรือนถ้าระบบไม่ได้คำนวณให้";
  }
  if (lower.includes("bazi") || lower.includes("สี่เสา") || lower.includes("ธาตุ")) {
    return "\n\n🎯 หน้าที่เฉพาะของศาสตร์นี้: แปลข้อมูลเกิดเป็นพฤติกรรมการตัดสินใจ สมดุลชีวิต และจังหวะที่ควรชะลอหรือเร่งมือในเชิงสัญลักษณ์ ห้ามฟันธง Day Master/ธาตุแข็งอ่อน/ยามจีน ถ้าระบบไม่ได้คำนวณให้";
  }
  if (lower.includes("เลข") || lower.includes("7 ตัว") || lower.includes("ฐาน")) {
    return "\n\n🎯 หน้าที่เฉพาะของศาสตร์นี้: ใช้เลขวันเกิด เลขเส้นชีวิต และเลขปีส่วนตัวเพื่อทำ checklist แบบลงมือได้ เน้น ทำ/เลี่ยง/รอ/เตรียม และให้คำตอบสั้นคมกว่าคนอื่น";
  }
  if (lower.includes("ยูเรเนียน") || lower.includes("midpoint") || lower.includes("ดาว")) {
    return "\n\n🎯 หน้าที่เฉพาะของศาสตร์นี้: จับสัญญาณเปลี่ยนแปลง หน้าต่างเวลา และความเสี่ยงที่ควรเฝ้าดู ห้ามอ้างองศาดาว midpoint หรือ aspect แม่นยำถ้าไม่มีฐานคำนวณ";
  }
  if (lower.includes("ทักษา") || lower.includes("ทักษาจร")) {
    return "\n\n🎯 หน้าที่เฉพาะของศาสตร์นี้: แปลงวันเกิดและอายุจรเป็นแผน 7/30/90 วัน ช่วยผู้ใช้เลือกสิ่งที่ควรเริ่มก่อน และบอกสัญญาณที่ควรกลับมาถามต่อ";
  }
  return "";
}

function getAstroMethodSignature(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes("โหรไทย") || lower.includes("จักรทีปนี")) {
    return `\n\n🧭 ลายเซ็นคำตอบของคุณ:
- ต้องมองผ่าน "วันเกิด + อายุจร + จังหวะใหญ่" เป็นหลัก ไม่ใช้เลขชีวิตหรือธาตุเป็นแกน
- ให้แยกให้เห็น ด้านที่ช่วยให้ไปต่อได้ / จุดที่ต้องระวัง / วิธีประคองจังหวะ อย่างน้อยอย่างละ 1 จุด
- ตัวอย่างที่ยกต้องเกี่ยวกับบทบาท หน้าที่ ผู้ใหญ่ ครอบครัว หรือความมั่นคงตามคำถามจริง`;
  }
  if (lower.includes("bazi") || lower.includes("สี่เสา") || lower.includes("ธาตุ")) {
    return `\n\n🧭 ลายเซ็นคำตอบของคุณ:
- ต้องแปลเป็นสูตร "สมดุลที่เห็น → พฤติกรรมที่เกิด → วิธีปรับ" ไม่ใช่ทำนายลอย ๆ
- ใช้ภาษาธาตุเชิงสัญลักษณ์เท่านั้นถ้าระบบไม่ได้คำนวณเสาเต็ม ห้ามฟันธง Day Master/ธาตุแข็งอ่อน
- ตัวอย่างที่ยกควรเกี่ยวกับสภาพแวดล้อม วิธีทำงาน จังหวะเร่ง/ผ่อน หรือการจัดพลังงานชีวิต`;
  }
  if (lower.includes("เลข") || lower.includes("7 ตัว") || lower.includes("ฐาน")) {
    return `\n\n🧭 ลายเซ็นคำตอบของคุณ:
- ต้องแสดงเลขที่ใช้ทักแบบตรวจสอบได้สั้น ๆ เช่น เลขวันเกิด/เลขเส้นชีวิต/เลขปีส่วนตัวที่ระบบให้
- คำแนะนำต้องออกมาเป็น ทำ / เลี่ยง / รอ / เตรียม อย่างชัดเจน
- ตัวอย่างที่ยกควรเป็นสถานการณ์เฉียด ๆ การตัดสินใจ การเงินรายจ่าย หรือจังหวะลงมือระยะสั้น`;
  }
  if (lower.includes("ยูเรเนียน") || lower.includes("midpoint") || lower.includes("ดาว")) {
    return `\n\n🧭 ลายเซ็นคำตอบของคุณ:
- ต้องตอบแบบจับ "สัญญาณเปลี่ยนแปลง + หน้าต่างเวลา + ความเสี่ยงที่ต้องเฝ้าดู"
- ถ้าไม่มี ephemeris ห้ามใส่องศาดาวหรือ midpoint แม่นยำ ให้ใช้คำว่า "สัญญาณโดยประมาณจากข้อมูลที่มี"
- ตัวอย่างที่ยกควรเป็นข่าว/สัญญาณ/ความเคลื่อนไหวที่เริ่มเกิดก่อนผลจริง`;
  }
  if (lower.includes("ทักษา") || lower.includes("ทักษาจร")) {
    return `\n\n🧭 ลายเซ็นคำตอบของคุณ:
- ต้องใช้ "วันเกิด + อายุจร/ปีจร" แปลเป็นสิ่งที่ควรเริ่มก่อน
- คำแนะนำต้องมีลักษณะ roadmap และตอบว่าขั้นต่อไปควรทำอะไร ไม่ใช่แค่ทาย
- ตัวอย่างที่ยกควรเกี่ยวกับคนช่วย คนติดขัด เอกสาร การติดต่อ หรือจังหวะเริ่มแผนใหม่`;
  }
  return "";
}

function getAstroPrecisionRules(target: "agent" | "summary"): string {
  const owner = target === "summary" ? "สรุปรวม" : "คำตอบของคุณ";
  return `\n\n🎯 กฎทำให้คำทำนายเจาะจงขึ้น:
- เป้าหมายคือให้เหมือนหมอดูจริง ไม่ใช่บทความดวง: ${owner} ต้องกล้าเลือกประเด็นที่แรงที่สุด 1 จุดก่อน แล้วค่อยบอกข้อจำกัด ไม่เขียนครอบจักรวาล
- ทุกคำทักต้องแยกชัดว่า "เห็นค่อนข้างชัด", "เป็นแนวโน้ม", หรือ "ต้องถามเพิ่มถึงจะเจาะได้"; ห้ามเอาแนวโน้มไปเขียนเหมือนข้อเท็จจริงแน่นอน
- ถ้าข้อมูลผู้ใช้มีแค่วันเกิด/เวลาเกิด/โฟกัสกว้าง ๆ ให้บอกในคำตอบว่า "จุดนี้ยังอ่านได้แค่ภาพรวม" แล้วให้คำถามติดตาม 1 ข้อที่หมอดูควรถามเพื่อเจาะ เช่น ตอนนี้มีดีล งาน เงิน คนรัก สุขภาพ หรือคนที่รอคำตอบอยู่ไหม
- ถ้าผู้ใช้เลือกหลายโฟกัส ให้เรียงตามแรงที่เห็นจริง 1-2 เรื่อง ห้ามตอบทุกเรื่องเท่ากันจนบาง
- คำถามล่าสุดคือแกนหลักเสมอ ประวัติเดิมใช้เป็นบริบทเท่านั้น ห้ามเอาคำถามเก่ามาเปลี่ยนประเด็นของคำถามล่าสุด เช่น ผู้ใช้ถามเริ่มงานใหม่ ห้ามสรุปเป็นเรื่องตกงาน เว้นแต่ผู้ใช้ถามต่อเรื่องนั้นชัดเจน
- ก่อนทำนายอนาคต ต้องมี "อดีต/ปัจจุบันที่ตรวจสอบได้" อย่างน้อย 2 จุด เพื่อให้ผู้ใช้เช็กกับชีวิตจริง โดยต้องระบุช่วงเวลาและอาการที่เห็นจริง เช่น 1-3 เดือนที่ผ่านมา, ช่วงนี้, ก่อนวันสอบ, หลังคุยงาน
- ทักอดีตต้องมีคำบอกระดับกำกับ เช่น "ดูค่อนข้างชัด", "พอมีเค้า", หรือ "ยังไม่ชัวร์"; ห้ามใช้คำว่า "ทักแรง", "ทักกลาง", "ทักเบา" เพราะผู้ใช้ไม่เข้าใจ; ถ้าไม่ตรงให้บอกสั้น ๆ ว่าคำอ่านส่วนถัดไปอาจคลาดเคลื่อน
- อดีตที่ตรวจสอบได้ต้องเป็น "ฉากชีวิตจริง" ไม่ใช่ความรู้สึกลอย ๆ: ต้องมีช่วงเวลา + คน/บทบาทหรือเรื่อง + สิ่งที่เกิด/พฤติกรรมที่เห็น + ผลกระทบสั้น ๆ
- ห้ามใช้คำทักอดีตแบบกว้าง เช่น "คิดเยอะ", "อยากเปลี่ยนแปลง", "มีภาระเพิ่มขึ้น", "เหนื่อยล้า" เว้นแต่ต่อด้วยฉากจริง เช่น เอกสารค้าง เงินก้อน คนขอยืม หัวหน้าเร่ง งานแก้ซ้ำ ลูกค้าหาย คนรักตอบช้า บ้าน/รถต้องซ่อม
- สำหรับคำถาม demo/นำเสนอ/ขาย/ลูกค้า ห้ามใช้คำทักอดีตว่า "เหนื่อย/รับผิดชอบเยอะ/คิดมาก" เป็นแกน ต้องทักเป็นฉากงานจริง เช่น เพิ่งแก้ flow ใกล้วันจริง, ลูกค้ายังไม่ล็อก pain point, มีคนตัดสินใจหลายคน, ราคา/ขอบเขต/integration ยังต้องตอบ, หรือเคย follow-up แล้วเงียบ
- ห้ามหยิบชุดเดิม "สื่อสารผิดพลาด / เอกสาร / เดินทาง / เหนื่อย / รับผิดชอบมากขึ้น" มาใช้เป็นคำตอบเริ่มต้น ถ้าข้อมูลหรือคำถามไม่ได้ชี้ไปเรื่องนั้นจริง
- สำหรับคำถามรายวัน ถ้าข้อมูลมีแค่วันเกิด ให้เลือกประเด็นที่เฉพาะกับเจ้าชะตาเพียง 1 เรื่องและบอกเหตุผลจากวันเกิด/อายุ/เลข/เวลาเกิด ห้ามกระจายไปหลายเรื่องแบบครอบจักรวาล
- ห้ามคำนวณเลขวันเกิด/เลขเส้นชีวิต/เลขปีส่วนตัว/อายุจรใหม่เอง ถ้าระบบส่งค่าคำนวณมาแล้ว ให้ใช้ค่าระบบเท่านั้น
- ถ้าจะอธิบายเลข ต้องไม่เขียนสมการที่ขัดกับค่าระบบ; ถ้าไม่แน่ใจให้เขียนว่า "จากค่าที่ระบบคำนวณให้" และไม่แสดงวิธีบวก
- ${owner} ต้องมี "ทักตรงที่สุด 1 เรื่อง" และ "ระวังที่สุด 1 เรื่อง" โดยระบุบริบทชัด เช่น งาน/เงิน/คนรอบตัว/บ้าน/เอกสาร/การเดินทาง/การเรียน/ความรัก ห้ามเขียนกว้าง ๆ ว่า "มีการเปลี่ยนแปลง"
- ให้ bullet แรกของหัวข้อจุดเด่น/จุดที่ทักได้ชัดที่สุดเป็นประเด็นที่เด่นที่สุดจริง ๆ ไม่ใช่นิสัยพื้นฐานทั่วไป
- ทุกตัวอย่างต้องมีบริบทเฉพาะพอให้เห็นภาพ: คน/เรื่องที่เกี่ยวข้อง, ช่วงเวลา, อาการที่จะเห็นจริง, ผลกระทบต่อผู้ใช้ และวิธีรับมือสั้น ๆ แต่ยังต้องใช้คำว่า "อาจ" หรือ "มีแนวโน้ม"
- ห้ามใช้ "งานหรือเงิน", "คนรอบข้าง", "เรื่องสำคัญ", "ข้อมูลไม่ชัด" เป็นคำตอบสุดท้าย ต้องบีบเป็นจุดจับต้องได้ เช่น งานที่ต้องรออนุมัติ, เงินก้อนที่กำลังชั่งใจ, คนที่มีอำนาจตอบรับ, ขอบเขตงาน, ราคา, กำหนดส่ง, เงื่อนไข, หรือ next step
- หลีกเลี่ยงตัวอย่างซ้ำซาก เช่น "ตำแหน่งใหม่", "เรียนทักษะใหม่", "เดินทาง", "ย้ายงาน" เว้นแต่คำถามหรือข้อมูลตั้งต้นชี้ไปทางนั้นจริง และต้องบอกเหตุผลว่าทำไม
- ห้ามใช้คำว่า "โอกาสใหม่", "โปรเจกต์ใหม่", "ทักษะใหม่", "ความเปลี่ยนแปลง" ลอย ๆ ต้องแปลงเป็นบริบทจริง เช่น งานประสานคน, งานเอกสาร, เงินก้อนบ้าน/รถ/ครอบครัว, คำสัญญา, ผู้ใหญ่, ลูกค้า, คู่ค้า หรือคนใกล้ชิด
- คำว่า "เริ่มต้นสิ่งใหม่", "เรียนรู้ทักษะใหม่", "โอกาสเติบโต", "สร้างฐานะ", "สร้างความมั่นคง" ใช้ได้เฉพาะเมื่อระบุสิ่งนั้นเป็นเรื่องจริงทันที เช่น งานเอกสาร/งานประสาน/ผู้ใหญ่/ลูกค้า/เงินก้อน/ครอบครัว/บ้าน/รถ/หนี้/สัญญา ห้ามปล่อยเป็นคำสวย ๆ
- ถ้าเป็นดวงภาพรวม 12 เดือน ให้แต่ละช่วงเวลามี 3 ส่วนสั้น ๆ: เรื่องเด่น, สิ่งที่ควรทำ, สิ่งที่ห้ามรีบ
- ห้ามตอบแค่คำคุณศัพท์ทั่วไป เช่น อดทน รับผิดชอบ คิดมาก กดดัน ถ้าไม่บอกว่าไปออกอาการในเรื่องอะไร
- ถ้าประโยคไหนสามารถเอาไปใช้กับคนเกิดวันอื่นได้โดยไม่ต้องแก้ ให้ถือว่ายังกว้างเกินไป ต้องเติมเหตุผลจากข้อมูลตั้งต้นหรือกรอบเวลาที่ถาม
- ห้ามเอียงบวกอัตโนมัติ: ถ้าสัญญาณอ่อน/ขัดกัน/เสี่ยง ให้พูดว่า "ยังไม่เด่น", "ยังติดขัด", "โอกาสกลางค่อนต่ำ" หรือ "ควรเผื่อใจ" ได้อย่างตรงไปตรงมา
- ทุกคำตอบต้องมีทั้งด้านหนุนและด้านฉุด หากด้านฉุดแรงกว่า ให้สรุปตรง ๆ ว่ายังไม่ชัดหรือโอกาสต่ำ ห้ามกลบด้วยคำปลอบใจ
- ห้ามใส่เปอร์เซ็นต์ 60-75% เป็นค่า default ถ้าหลักฐานไม่พอ ให้ใช้ "ภาพเบื้องต้น" หรือ "ยังไม่เห็นสัญญาณชัด" แทน
- ถ้าเป็นคำถามภาพรวม เช่น ภาพรวม 12 เดือน/ปีนี้/ช่วงนี้ ห้ามใส่เปอร์เซ็นต์ และห้ามใช้ศัพท์ระบบอย่าง "น้ำหนักรวม", "ผสม", "สัญญาณ", "แรงหนุน", "แรงต้าน"; ให้พูดเป็นภาษาคนทั่วไป เช่น "ปีนี้ไปต่อได้ แต่ต้องระวัง...", "ยังไม่ควรรีบ...", "มีลุ้นถ้า..."
- ถ้าเรื่องไม่ดีหรือแรงฉุดเด่นกว่า ให้บอกตรง ๆ แบบไม่ขู่ ไม่ต้องพยายามสรุปให้ดี
- ถ้าพื้นที่คำตอบไม่พอ ให้ลดจำนวน bullet แต่ต้องเขียนให้จบครบทุกหัวข้อ ห้ามตัดท้ายกลางประโยค
- ต้องมี "คำทักที่อาจไม่ถูกใจ" 1 จุดเสมอ โดยพูดเป็นรูปธรรม ไม่ใช่แค่อารมณ์ เช่น งานส่วนไหนกดดัน เงินรั่วจากอะไร คนกลุ่มไหนทำให้ติดขัด เอกสาร/สัญญา/ครอบครัว/สุขภาพพลังงานติดตรงไหน
- ในหัวข้อระวังหรือคำตอบตรง ๆ ต้องมีอย่างน้อย 1 ประโยคที่ครบ 4 ส่วน: เรื่องหรือคนที่เกี่ยวข้อง + อาการที่จะเห็นจริง + ผลกระทบ + วิธีรับมือ
- ห้ามใช้แค่คำว่า "คิดมาก", "อ่อนไหว", "กดดัน", "เหนื่อย" ถ้าไม่บอกว่าไปออกอาการในเหตุการณ์ชีวิตจริงแบบไหน
- ถ้าสัญญาณร้ายยังไม่ชัด ให้พูดว่า "ยังไม่เห็นแรงเสียชัด แต่จุดที่น่าห่วงที่สุดคือ..." แล้วระบุความเสี่ยงที่ใกล้คำถามที่สุด
- ก่อนจบคำตอบ ให้ตรวจตัวเอง: ถ้าเอาชื่อ/วันเกิด/โฟกัสออกแล้วยังอ่านแล้วใช้ได้กับทุกคน ให้แก้ให้เจาะขึ้นหรือบอกว่าต้องถามเพิ่ม
- ${target === "summary" ? "ใน **คำตอบตรง ๆ** ประโยคแรกต้องเป็นภาษาคนทั่วไปที่ตอบได้ทันที เช่น \"ปีนี้งานยังไปต่อได้ แต่เงินก้อนต้องระวัง...\" ห้ามขึ้นด้วยศัพท์ระบบอย่าง \"น้ำหนักรวม\", \"ผสม\", \"จุดที่ช่วยให้ไปต่อได้\", \"จุดติดขัด\"" : "ใน **คำตอบตรง ๆ** ให้เลือกประเด็นที่มั่นใจที่สุด 1 จุดจากศาสตร์ของตัวเองก่อน แล้วพูดเป็นภาษาคนทั่วไปว่าไปต่อได้/ยังไม่ควรรีบ/มีลุ้น/ต้องระวังอะไร"}
- คำแนะนำสายบุญ/สี/ของมงคล/พิธีกรรม ห้ามเป็นคำแนะนำหลัก 7 วัน/30 วัน/3 เดือน เว้นแต่ผู้ใช้ถามเรื่องเสริมดวงโดยตรง ถ้าจะใส่ให้เป็นท้ายสุดแบบ optional และต้องไม่แทน action ที่จับต้องได้
- ห้ามใช้วลีว่า "ธาตุ...เด่น", "ธาตุ...เด่นชัด", "ธาตุ...แรง", "ดาว...โคจร" หรือ "เรือน..." เป็นข้อเท็จจริง ถ้าข้อมูลตั้งต้นไม่ได้ให้ค่าคำนวณนั้นมา ให้พูดได้แค่ "ในเชิงสัญลักษณ์จากข้อมูลพื้นฐาน"
- ถ้าพูดเรื่อง BaZi/ธาตุ/ดาว/ลัคนา/ยามจีนที่ระบบไม่ได้คำนวณให้ ต้องพูดเป็นเชิงสัญลักษณ์หรือจากข้อมูลพื้นฐาน ห้ามฟันธงเป็นข้อเท็จจริง
- ถ้ามี knowledge แนบหรือฐานความรู้ของ agent ให้ใช้ก่อน prompt ทั่วไปเสมอ; ถ้าไม่มีฐานคำนวณจริง ห้ามแต่งตำรา/สูตรขึ้นเอง`;
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
    astroFocus,
    astroContext,
    guestId: bodyGuestId,
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
    astroFocus?: string;
    astroContext?: string;
    guestId?: string;
  };

  if (!question || !agentIds?.length) {
    return new Response(JSON.stringify({ error: "Missing question or agentIds" }), { status: 400 });
  }

  const requesterUserId = req.headers.get("x-user-id");
  const guestId = req.headers.get("x-guest-id") || bodyGuestId || "";
  const isGuest = !requesterUserId;
  if (isGuest && !isValidGuestId(guestId)) {
    return new Response(JSON.stringify({ error: "Missing guest id", code: "GUEST_ID_REQUIRED" }), { status: 401 });
  }

  const userId = requesterUserId ?? await ensureGuestTrialUser();
  const userRole = req.headers.get("x-user-role") || (isGuest ? "guest" : "user");
  const agentOwnerUserId = requesterUserId ?? await getSuperadminUserId() ?? userId;
  const allAgents = await listAgents(agentOwnerUserId);
  const selectedAgents = allAgents.filter((a) => agentIds.includes(a.id) && a.active);
  if (!selectedAgents.length) {
    return new Response(JSON.stringify({ error: "No active agents found" }), { status: 400 });
  }
  if (isGuest) {
    if (mode === "close" || existingSessionId) {
      return new Response(JSON.stringify({
        error: "โหมดต่อเนื่องและสรุปรวมสงวนไว้สำหรับสมาชิก สมัครฟรีเพื่อเก็บประวัติและถามต่อ",
        code: "GUEST_SIGNUP_REQUIRED",
      }), { status: 402 });
    }
    if (selectedAgents.length > 2) {
      return new Response(JSON.stringify({
        error: "ทดลองฟรีเลือกหมอดูได้สูงสุด 2 ท่าน สมัครเพื่อเปิดสภาหมอดูเต็มรูปแบบ",
        code: "GUEST_AGENT_LIMIT",
      }), { status: 402 });
    }
    if (fileContexts?.length) {
      return new Response(JSON.stringify({
        error: "การแนบไฟล์สงวนไว้สำหรับสมาชิก สมัครฟรีเพื่อใช้เอกสารประกอบคำถาม",
        code: "GUEST_SIGNUP_REQUIRED",
      }), { status: 402 });
    }
    const isFreeClarificationProbe = !clarificationAnswers && isBroadAstrologyQuestion(question);
    if (!isFreeClarificationProbe) {
      const quota = await checkGuestTrialQuota(req.headers, guestId);
      if (!quota.ok) {
        return new Response(JSON.stringify({ error: quota.message, code: quota.code }), { status: 402 });
      }
    }
  }
  const missingApiKeyAgents = [];
  for (const agent of selectedAgents) {
    const apiKey = await getAgentApiKey(agent.id);
    if (!apiKey) missingApiKeyAgents.push(agent.name);
  }
  if (missingApiKeyAgents.length > 0) {
    return new Response(JSON.stringify({
      error: `ยังไม่มี API key สำหรับ ${missingApiKeyAgents.join(", ")}`,
    }), { status: 400 });
  }

  const billingEnabled = isCreditBillingEnabled();
  if (!isGuest && billingEnabled && userRole !== "admin" && mode !== "close") {
    const price = getReadingPrice(selectedAgents.length, existingSessionId);
    const charge = await chargeCredits(userId, price.credits, existingSessionId || crypto.randomUUID(), {
      question: question.slice(0, 200),
      agentCount: selectedAgents.length,
      priceLabel: price.label,
      sessionId: existingSessionId || null,
    });
    if (!charge.ok) {
      return new Response(JSON.stringify({
        error: `เครดิตไม่พอสำหรับ${price.label} (${price.credits} เครดิต)`,
        code: "INSUFFICIENT_CREDITS",
        requiredCredits: price.credits,
        balance: charge.balance,
      }), { status: 402 });
    }
  } else if (!isGuest && billingEnabled && userRole !== "admin" && mode === "close") {
    const balance = await getCreditBalance(userId);
    if (balance < 0) {
      return new Response(JSON.stringify({ error: "เครดิตไม่พอ", code: "INSUFFICIENT_CREDITS", balance }), { status: 402 });
    }
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
        ? older.map((t, i) => `[คำถามที่ ${i + 1}] ${t.question} → ${t.answer.slice(0, 150)}...`).join("\n")
        : "";
      const recentText = recent.map((t, i) => `[คำถามที่ ${older.length + i + 1}] คำถาม: ${t.question}\nคำตอบสรุป: ${t.answer}`).join("\n\n");
      return `\n\n---\nสรุปประวัติคำถามก่อนหน้า (ใช้เป็นบริบทเท่านั้น ห้ามเปลี่ยนประเด็นคำถามล่าสุด):\n${olderText ? olderText + "\n\nรายละเอียดคำถามล่าสุดในประวัติ:\n" : ""}${recentText}\n---\n`;
    }
    return `\n\n---\nประวัติคำถามก่อนหน้า (ใช้เป็นบริบทเท่านั้น ห้ามเปลี่ยนประเด็นคำถามล่าสุด):\n${turns.map((t, i) => `[คำถามที่ ${i + 1}] คำถาม: ${t.question}\nคำตอบสรุป: ${t.answer}`).join("\n\n")}\n---\n`;
  }

  // Build file context (with optional sheet filter)
  function buildFileContext(contexts?: { filename: string; meta: string; context: string; sheets?: string[] }[]): string {
    if (!contexts || contexts.length === 0) return "";
    return `\n\n---\n📎 เอกสารอ้างอิงที่แนบมา (ใช้ข้อมูลเหล่านี้ประกอบการวิเคราะห์):\n${contexts.map((f) => `[${f.meta}]\n${f.context}`).join("\n\n---\n")}\n---\n`;
  }

  let sessionId: string;
  if (existingSessionId) {
    const existingSession = await getResearchSession(existingSessionId, userId);
    if (!existingSession) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }
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
    isGuest ? Promise.resolve("") : getMemoryContext(userId),
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
      send("status", { message: mode === "qa" ? `💬 ${chairman.emoji} ${chairman.name} กำลังดูดวง...` : `🔮 เปิดห้องหมอดู — ${mode === "close" ? "กำลังสรุปคำทำนายรวม" : "หมอดูแต่ละศาสตร์กำลังดูให้คุณ"}` });

      const agentFindings: { agentId: string; name: string; emoji: string; role: string; content: string; searchResults?: string }[] = [];
      const agentTokens: Record<string, { input: number; output: number }> = {};
      const failedAgents: string[] = [];
      let silentAgents: string[] = [];

      const historyContext = buildHistoryContext(conversationHistory);
      const fileContext = buildFileContext(fileContexts);

      // Build clarification context if user answered clarification questions
      let clarificationContext = "";
      const subjectName = (clarificationAnswers ?? []).find((a) => a.question.includes("ชื่อ-นามสกุล"))?.answer?.trim();
      const subjectBirthDate = (clarificationAnswers ?? []).find((a) => a.question.includes("วันเดือนปีเกิด"))?.answer?.trim();
      const subjectBirthTime = (clarificationAnswers ?? []).find((a) => a.question.includes("เวลาเกิด"))?.answer?.trim();
      const subjectBirthPlace = (clarificationAnswers ?? []).find((a) => a.question.includes("จังหวัด") || a.question.includes("สถานที่เกิด"))?.answer?.trim();
      const hasSelectedBirthProfile = !!(subjectName && subjectBirthDate);
      const birthFacts = buildBirthFacts({
        name: subjectName,
        birthDate: subjectBirthDate,
        birthTime: subjectBirthTime,
        birthPlace: subjectBirthPlace,
      });
      const birthFactsContext = birthFacts
        ? `\n\n---\n🧮 ข้อมูลดวงตั้งต้นและผลคำนวณที่ระบบทำได้จริง:\n${birthFacts.summaryText}\n---\nกฎการทายให้เจาะจง:\n- ทุก agent ต้องอ้างอิงข้อมูลตั้งต้นหรือผลคำนวณอย่างน้อย 2 จุดในคำทักหรือคำแนะนำ เช่น วันเกิด/อายุ/เลขเส้นชีวิต/เลขปีส่วนตัว/ทักษา/เลข 7 ตัวพื้นฐาน/BaZi Day Master/เวลาเกิด/สถานที่เกิด\n- ให้ใช้ Structured JSON ด้านบนเป็นค่าจริงก่อนความจำของโมเดลเสมอ โดยเฉพาะเลขวันเกิด เลขเส้นชีวิต เลขปีส่วนตัว ทักษา เลข 7 ตัวพื้นฐาน และ BaZi v1\n- ห้ามตอบกว้าง ๆ แบบใช้ได้กับทุกคน ถ้าทักเรื่องใดให้โยงกลับมาที่ข้อมูลตั้งต้น ผลคำนวณ หรือคำถามของผู้ใช้\n- ข้อมูลตั้งต้นนี้ช่วยแยกบุคลิกและจังหวะได้ แต่ยังไม่เท่ากับการมีเหตุการณ์จริงของผู้ใช้ ถ้าไม่มีบริบทชีวิตล่าสุด ให้เขียนว่าเป็นแนวโน้มและถามต่อ 1 ข้อเพื่อเจาะ\n- ระบบคำนวณเลขพื้นฐาน/ทักษา/เลข 7 ตัวพื้นฐาน และ BaZi 4 เสา v1 ได้แล้ว แต่ BaZi v1 ยังใช้ solar-term boundary แบบประมาณ ห้ามขยายเป็น useful god, ten gods หรือ luck pillars ถ้าระบบไม่ได้ส่งค่าเหล่านั้นมา\n- ระบบยังไม่มีองศาดาว ลัคนา เรือนชะตา หรือ midpoint จริง ห้ามแต่งเพิ่ม; ถ้าจะพูดเรื่องที่ระบบยังไม่ได้คำนวณ ให้พูดได้แค่ "ในเชิงสัญลักษณ์จากข้อมูลพื้นฐาน" เท่านั้น\n- ถ้าความรู้เดิมของคุณขัดกับข้อมูลตั้งต้นที่ระบบให้ ให้ยึดข้อมูลตั้งต้นของระบบก่อนเสมอ\n---\n`
        : "";
      const subjectGuardContext = hasSelectedBirthProfile
        ? `\n\n---\n🎯 เจ้าชะตาที่ต้องดูในรอบนี้: ${subjectName} (${subjectBirthDate})\nกฎสำคัญ: ใช้เฉพาะข้อมูลของเจ้าชะตานี้เท่านั้น ห้ามนำชื่อ วันเกิด หรือบริบทของบุคคลอื่นจากความจำ ประวัติคำถามเดิม หรือ profile อื่นมาปนในคำตอบ ถ้าประวัติมีชื่ออื่นให้ถือว่าเป็นคนละบริบทและไม่ต้องกล่าวถึง\n---\n`
        : "";
      if (clarificationAnswers && clarificationAnswers.length > 0) {
        clarificationContext = `${subjectGuardContext}${birthFactsContext}\n\n---\n📋 ข้อมูลเพิ่มเติมจากผู้ถาม:\n${clarificationAnswers.map((a) => `ถาม: ${a.question}\nตอบ: ${a.answer}`).join("\n\n")}\n---\n⚠️ ใช้ข้อมูลเหล่านี้ประกอบการวิเคราะห์ ตอบให้ตรงกับสถานการณ์จริงของผู้ถาม\n`;
      }
      const timeFrame = detectTimeFrame(question);
      const isDailyTimeFrame = timeFrame.label === "วันนี้" || timeFrame.label === "พรุ่งนี้";
      const dailyWord = timeFrame.label === "พรุ่งนี้" ? "พรุ่งนี้" : "วันนี้";
      const dailyBrevityContext = isDailyTimeFrame ? `\n\n🕯️ กฎเฉพาะคำถามรายวัน:\n- คำตอบรายวันต้องสั้น คม และใช้ได้ทันที ห้ามเขียนเหมือนดวง 12 เดือน\n- ใช้หัวข้อวันนี้/พรุ่งนี้เท่านั้น ห้ามใส่คำแนะนำแบบ ภายใน 7 วัน / 30 วัน / 3 เดือน\n- เช็กอดีตให้เหลือ 1 ข้อสั้น ๆ เพื่อสร้างความเชื่อมโยง ไม่ต้องลากประวัติยาว\n- เน้นสิ่งที่ต้องระวัง 1 เรื่อง และสิ่งที่ควรทำ 1-2 อย่างภายในวันนั้น\n- ถ้าไม่มีบริบทชีวิตล่าสุด ห้ามทักเหมือนรู้เหตุการณ์จริง ให้เลือก "จุดเสี่ยงที่ควรเช็ก" 1 จุด และถามต่อ 1 ข้อในท้ายคำตอบเพื่อให้รอบถัดไปแม่นขึ้น\n- ถ้าข้อมูลเจ้าชะตาระบุวันเกิดไว้ ต้องใช้วันเกิดตามข้อมูลตั้งต้นเท่านั้น ห้ามแปลงหรือเดาปีใหม่เอง\n` : "";
      const outcomeQuestion = isOutcomeQuestion(question);
      const timeFrameContext = `\n\n⏱️ กรอบเวลาที่ผู้ใช้ถาม: ${timeFrame.label}\n- รูปแบบคำตอบต้องปรับตามกรอบเวลานี้ ห้ามใช้แพทเทิร์น 3 เดือน/6-12 เดือน ถ้าผู้ใช้ถามแค่ "เดือนหน้า" หรือ "สัปดาห์หน้า"\n`;
      const questionStyleContext = outcomeQuestion
        ? `\n\n⚖️ ประเภทคำถาม: คำถามผลลัพธ์/ใช่หรือไม่\n- ต้องตอบ verdict ก่อนเสมอ เช่น "เอนทางติด", "เอนทางไม่ติด", "เอนทางผ่าน", "เอนทางไม่ผ่าน", "เอนทางได้", "เอนทางไม่ได้" โดยเลือกคำให้ตรงกับคำถาม\n- ถ้าข้อมูลน้อย ให้ใช้ "ถ้าต้องเลือกจากข้อมูลตอนนี้ ผมเอนทาง..." ห้ามเลี่ยงด้วย "ยังไม่ชัด", "ต้องลุ้น", "มีโอกาสแต่..." เป็นคำตอบหลัก\n- ห้ามใส่เปอร์เซ็นต์ เว้นแต่ผู้ใช้ถามหาเปอร์เซ็นต์โดยตรง\n- ห้ามให้กำลังใจ ห้ามปลอบใจ ห้ามคำแนะนำทั่วไป เช่น อ่านหนังสือให้มากขึ้น, พักผ่อนให้พอ, วางแผนให้ดี, พยายามต่อไป, ขึ้นอยู่กับความพยายาม\n- ถ้าต้องบอกเงื่อนไข ให้มีเพียง 1 เงื่อนไขที่ทำให้ผลพลิก และต้องเจาะ เช่น คนตัดสินใจ, คะแนนซ้อม, เอกสาร, เงินก้อน, timing, คำตอบจากอีกฝ่าย\n- แต่ละ agent ต้องเลือกฝั่งของตัวเอง ห้ามตอบกลาง ๆ เพื่อประคอง\n`
        : `\n\n⚖️ ประเภทคำถาม: คำถามภาพรวมหรือคำถามขอแนวโน้ม\n- ห้ามใส่เปอร์เซ็นต์ เช่น 60-70% เพราะผู้ใช้ไม่ได้ถามผลลัพธ์แบบผ่าน/ไม่ผ่านหรือได้/ไม่ได้\n- ห้ามใช้ศัพท์ระบบในคำตอบ เช่น "น้ำหนักรวม", "ผสม", "สัญญาณ", "แรงหนุน", "แรงต้าน"; ให้พูดเป็นภาษาคนทั่วไป เช่น "ปีนี้งานยังไปต่อได้ แต่เงินก้อนต้องระวัง", "มีลุ้นถ้าวางแผนก่อนขยับ", "ยังไม่ควรรีบตัดสินใจ"\n- ใน 2 ประโยคแรกต้องบอกด้วยว่าเรื่องที่ไม่ง่ายที่สุดคืออะไร ถ้าไม่ดีให้พูดตรง ๆ ห้ามกลบด้วยประโยคบวก\n- ต้องบอกช่วงที่ต้องระวังที่สุดและเรื่องที่ควรจับตาอย่างน้อยอย่างละ 1 จุด ด้วยคำธรรมดาที่ user เข้าใจทันที\n- ถ้าภาพรวมมีทั้งดีและไม่ดี ให้พูดเป็นประโยคตรง ๆ ว่า "ไปต่อได้ แต่ต้องระวัง..." หรือ "มีโอกาส แต่..." ห้ามใช้คำว่า "ผสม"\n`;
      const outcomeVerdictContext = outcomeQuestion ? `\n\n🎯 กฎฟันธงสำหรับคำถามผลลัพธ์:\n- กฎนี้สำคัญกว่ารูปแบบหัวข้ออื่นทั้งหมด ถ้าคำสั่งส่วนอื่นบอกให้ใส่คำแนะนำ/แผน 7 วัน/30 วัน/3 เดือน ให้ข้ามได้\n- เปิดคำตอบด้วย verdict เดียวเท่านั้น: "เอนทาง [ผลลัพธ์]" หรือ "ถ้าต้องเลือกจากข้อมูลตอนนี้ เอนทาง [ผลลัพธ์]"\n- ต้องมีเหตุผลหลักไม่เกิน 2 ข้อ และต้องเป็นเหตุผลจากการอ่านดวง/ข้อมูลตั้งต้น/บริบท ไม่ใช่คำแนะนำชีวิตทั่วไป\n- ต้องมี "จุดที่ทำให้พลิกได้" ได้ไม่เกิน 1 ข้อ ถ้าไม่มีให้เขียนว่า "ยังไม่เห็นจุดพลิกที่แรงพอ"\n- ห้ามใช้เปอร์เซ็นต์ถ้าผู้ใช้ไม่ได้ขอ ห้ามใช้คำว่า 40-50%, 60-70%, กลาง ๆ เป็นทางหนี\n- ห้ามปลอบใจหรือให้กำลังใจ เช่น "ยังไม่หมดหวัง", "ถ้าพยายามก็มีโอกาส", "สู้ ๆ", "ตั้งใจให้มากขึ้น"\n- ห้ามคำแนะนำทั่วไป เช่น อ่านหนังสือ, ฝึกข้อสอบ, พักผ่อน, วางแผน, จัดเวลา, ปรึกษาผู้รู้ เว้นแต่เป็น "จุดพลิกเดียว" ที่เจาะกับผลลัพธ์จริง\n- สำหรับสรุปรวมหลายหมอดู ให้สรุปแบบนับเสียง: กี่คนเอนทางได้/ไม่ได้/เฉียด แล้ว OMNIA เลือกฝั่งสุดท้าย ห้ามสรุปแบบรายงานยาว\n- ความยาวรวมของคำตอบผลลัพธ์ควรสั้นและคม ไม่เกิน 260 คำสำหรับสรุปรวม และไม่เกิน 160 คำต่อ agent\n` : "";
      const salesDemoContext = isSalesDemoQuestion(question)
        ? `\n\n🧩 กฎเฉพาะคำถาม demo/นำเสนอ/ขาย/คุยลูกค้า:\n- คำตอบต้องแยก 4 แกนนี้ให้ชัด: (1) ความพร้อมของผู้ถาม (2) ความเข้าใจ/ความกังวลของลูกค้า (3) จุดเสี่ยงระหว่าง demo เช่น flow พัง, use case ไม่ตรง, ราคา/เวลา/integration/security (4) next step หลังจบ demo\n- ห้ามใช้ "สื่อสารไม่ชัด" เป็นคำตอบสุดท้าย ต้องระบุว่าไม่ชัดตรงไหน: pain point ลูกค้า, use case, ROI, scope, budget, decision maker, timeline, integration, data/security, หรือเงื่อนไขทดลองใช้\n- เช็กอดีต/ปัจจุบันต้องโยงกับการเตรียมงานขายหรือการคุยลูกค้าเท่านั้น เช่น เคยแก้ flow demo ใกล้วันจริง, ลูกค้ายังไม่ confirm pain point, มีคนตัดสินใจมากกว่า 1 คน, เคยต้อง follow-up หลายรอบ ห้ามทักกว้างว่าเหนื่อย/รับผิดชอบเยอะ\n- ถ้าให้เปอร์เซ็นต์ ต้องบอกเงื่อนไขที่ทำให้เปอร์เซ็นต์ขยับขึ้น/ลง 1 ข้อ เช่น ถ้า decision maker อยู่ในห้อง, ถ้า demo ตรง use case, ถ้าตอบราคา/integration ได้ชัด\n- แต่ละ agent ต้องมองคนละมุม: โหรไทยเน้นจังหวะเจรจา/ผู้ใหญ่/บทบาทคนตัดสินใจ, BaZi เน้นจังหวะพลังงานและวิธีปรับน้ำเสียง, เลขศาสตร์เน้น checklist ปิดดีล, ยูเรเนียนเน้นจุดพลิก/คำถามเฉียบ, ทักษาเน้น next step หลัง demo\n`
        : "";

      // Detect astrology/fortune-telling session — used to inject ทายทัก section into prompts
      const _astroKw = ["ดูดวง","โหราศาสตร์","ดวงชะตา","ดวง","พยากรณ์","ทำนาย","ฤกษ์","bazi","ba zi","tarot","ไพ่ยิปซี","ชะตา","ชงกับ","ราศี","จักรราศี","เลขศาสตร์","numerology","ฮวงจุ้ย","feng shui","สี่เสา","midpoint","ascendant","ทักษา"];
      const _qLow = question.toLowerCase();
      const _chairLow = (chairman.soul + " " + chairman.role).toLowerCase();
      const isAstrologySession =
        _astroKw.some((kw) => _qLow.includes(kw)) ||
        _astroKw.some((kw) => _chairLow.includes(kw)) ||
        (clarificationAnswers ?? []).some((a) => a.question.toLowerCase().includes("เกิด") || a.question.toLowerCase().includes("ดวง"));
      const normalizedAstroFocus = typeof astroFocus === "string" ? astroFocus.trim() : "";
      const normalizedAstroContext = typeof astroContext === "string" ? astroContext.trim() : "";
      const premiseStatusAnswer = (clarificationAnswers ?? []).find((a) => a.question.includes("ผู้ใช้ยืนยันสถานะของเรื่องนี้"))?.answer?.trim() || "";
      const premiseRuleAnswer = (clarificationAnswers ?? []).find((a) => a.question.includes("กฎสำหรับหมอดู"))?.answer?.trim() || "";
      const premiseGuardContext = isAstrologySession && (premiseStatusAnswer || premiseRuleAnswer)
        ? `\n\n🧷 กฎเช็กพื้นเรื่องก่อนทำนาย:\n- ผู้ใช้ยืนยันสถานะของเรื่องนี้: ${premiseStatusAnswer || "ไม่ได้ระบุ"}\n- กฎที่ต้องทำตาม: ${premiseRuleAnswer || "ห้ามรับสมมติฐานในคำถามเป็นข้อเท็จจริง ถ้ายังไม่ชัดให้พูดแบบมีเงื่อนไข"}\n- ห้ามตอบเหมือนรู้ว่าเหตุการณ์/คน/สถานะนั้นมีอยู่จริง ถ้าผู้ใช้บอกว่ายังไม่มี ถามเป็นแนวโน้ม หรือถามเพื่อทดสอบระบบ\n- ถ้าเป็นการทดสอบระบบ ให้ตอบอย่างมืออาชีพว่าไม่ควรอ่านตรง ๆ จากพื้นเรื่องที่ยังไม่เกิดจริง แล้วเปลี่ยนกรอบไปดูแนวโน้ม รูปแบบ หรือสิ่งที่ควรระวังในอนาคตแทน\n- ห้ามแต่งรายละเอียดเฉพาะเพื่อให้ดูแม่น ถ้าผู้ใช้ไม่ได้ยืนยัน\n`
        : "";
      const astroFocusContext = isAstrologySession && (normalizedAstroFocus || normalizedAstroContext)
        ? `\n\n🎯 โฟกัสที่ผู้ใช้เลือกก่อนดูดวง:\n- โฟกัสหลัก: ${normalizedAstroFocus || "ไม่ได้เลือก"}\n- บริบทเพิ่มเติม: ${normalizedAstroContext || "ไม่มี ผู้ใช้ต้องการดูจากข้อมูลเกิดเท่าที่มี"}\nกฎการใช้โฟกัส:\n- ถ้าโฟกัสไม่ใช่ "ภาพรวม" หรือ "ข้าม" ให้ตอบเฉพาะเรื่องนั้นเป็นหลัก ห้ามไหลไปงาน/เงิน/ความรักพร้อมกันจนกว้าง\n- ถ้าโฟกัสมีหลายเรื่อง ให้เลือกเรื่องที่แรงที่สุดขึ้นก่อน แล้วเรื่องรองสั้น ๆ ห้ามทำเหมือนทุกเรื่องเด่นเท่ากัน\n- ถ้าผู้ใช้เลือก "ภาพรวม" หรือ "ข้าม" ให้บอกข้อจำกัดสั้น ๆ ว่าเป็นภาพรวมจากข้อมูลเกิดและคำถาม ไม่ใช่เหตุการณ์เฉพาะ\n- ถ้ามีบริบทเพิ่มเติม ให้ยึดบริบทนั้นเป็นฉากหลักของตัวอย่างและ action\n- ถ้าไม่มีบริบทเพิ่มเติม ให้ห้ามแต่งฉากเฉพาะเป็นข้อเท็จจริง ให้ใช้คำว่า "จุดที่ควรเช็ก" และปิดด้วยคำถามต่อ 1 ข้อที่ช่วยให้หมอดูเจาะได้ เช่น "เรื่องที่กำลังรอคำตอบอยู่เป็นงาน เงิน หรือคนใกล้ตัว?"\n- ห้ามสรุปความเสี่ยงเป็นคำกว้าง เช่น "การสื่อสาร", "เอกสาร", "ความไม่ชัดเจน" เฉย ๆ ต้องแปลงเป็นจุดที่จับต้องได้จากบริบท เช่น ถ้าเป็นประชุมลูกค้าให้ระบุ scope งาน, ราคา/งบ, timeline, ผู้มีอำนาจตัดสินใจ, next step, หรือเงื่อนไขที่ต้อง confirm\n- คำตอบตรง ๆ และสรุปรวมต้องมีอย่างน้อย 1 จุดที่เป็น "เรื่อง/คนที่เกี่ยวข้อง + จุดเสี่ยงเฉพาะ + วิธีรับมือ" จากบริบทผู้ใช้\n`
        : "";

      // Current date context — inject so LLM knows the actual date (avoids wrong year like 2567)
      const _now = new Date();
      const _bangkokDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        timeZone: "Asia/Bangkok",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(_now);
      const _bangkokTime = new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(_now);
      const dateContext = `\n\n📅 วันที่ปัจจุบันตามเวลาไทย: ${_bangkokDate} เวลา ${_bangkokTime} น. — ใช้วันนี้เป็นฐานในการวิเคราะห์ โดยเฉพาะคำถามรายวัน/วันนี้/พรุ่งนี้ และห้ามอ้างอิงปีที่ผ่านมาเป็นปัจจุบัน\n`;

      // Anti-hallucination rules (injected into all prompts)
      const antiHallucinationRules = `\n\n🚫 กฎเหล็กป้องกันข้อมูลเท็จ (Anti-Hallucination):\n- ห้ามสร้างเลขที่คำวินิจฉัย คำพิพากษา หรือคำสั่งที่ไม่แน่ใจ 100% (เช่น "คำวินิจฉัย กค 0811/xxxx") — ถ้าไม่แน่ใจ ให้เขียนว่า "ตามแนวคำวินิจฉัยของกรมสรรพากร" โดยไม่ระบุเลขที่\n- ห้ามสร้างชื่อ พ.ร.บ. พ.ร.ก. ประกาศ หรือกฎกระทรวง ที่ไม่มีอยู่จริง\n- ถ้าอ้างอิงมาตรากฎหมาย ต้องแน่ใจว่าเลขมาตราถูกต้อง — ถ้าไม่แน่ใจ ให้ระบุเป็นหลักการแทน\n- ถ้าข้อมูลจาก Web Search ขัดกับความรู้เดิม ให้เชื่อ Web Search มากกว่า (เพราะอาจมีการแก้ไขกฎหมาย)\n- แยกชัดเจนระหว่าง "ข้อเท็จจริงที่แน่ชัด" กับ "ความเห็น/การตีความ"\n`;

      const agentCoverageContext = isAstrologySession && selectedAgents.length < 3
        ? `\n\n🧪 ความครอบคลุมของศาสตร์:\n- รอบนี้มีหมอดู ${selectedAgents.length} คน ให้สรุปแบบระมัดระวังและพูดว่าเป็นการอ่านจาก ${selectedAgents.length} ศาสตร์\n- ห้ามขยายข้อสรุปให้เหมือนเห็นครบทุกศาสตร์ ถ้าสัญญาณยังไม่พอให้ใช้คำว่า "จุดที่น่าจับตา" หรือ "ภาพเบื้องต้น"\n`
        : "";
      const agentCoverageUserContext = agentCoverageContext
        ? `${agentCoverageContext}\nให้สะท้อนข้อจำกัดนี้ในหัวข้อ **หลักที่ใช้สรุปดวงนี้** หรือ **ข้อควรรู้ก่อนเชื่อคำทำนายนี้** ด้วย\n\n`
        : "";

      // Astrology-specific anti-hallucination rules (injected only for astrology sessions)
      const astrologyAntiHallucinationRules = isAstrologySession ? `\n\n🔮 กฎเหล็กเฉพาะโหราศาสตร์:\n- ห้ามพูดมั่นเกินฐานข้อมูล: ถ้าไม่ได้คำนวณจริง ให้ใช้คำว่า "แนวโน้ม", "โดยประมาณ", "จากข้อมูลพื้นฐานที่มี", หรือ "ในเชิงสัญลักษณ์"\n- ใช้ "ข้อมูลดวงตั้งต้นที่ระบบคำนวณได้จริง" เป็นแหล่งหลัก ห้ามคำนวณวันเกิด/ราศี/เลขชีวิตใหม่แล้วขัดกับข้อมูลระบบ\n- ห้ามระบุ Ascendant/ลัคนา โดยไม่แสดงวิธีคำนวณจากเวลา+สถานที่เกิด — ถ้าไม่มีเวลาเกิดให้ระบุชัดว่า "ไม่สามารถระบุลัคนาได้"\n- ห้ามระบุ Day Master หรือธาตุประจำตัวแบบฟันธง ถ้าไม่ได้แสดงฐานคำนวณที่พอเชื่อถือได้\n- Day Master = Heavenly Stem ของเสาวัน (Day Pillar) เท่านั้น — ไม่ใช่ธาตุรวมหรือธาตุที่มากที่สุดในตาราง\n- ห้ามระบุธาตุแข็ง/อ่อน ยามจีน ฤกษ์ หรือเรือนดาวเป็นข้อเท็จจริง ถ้าระบบไม่ได้คำนวณให้ ให้พูดเป็นมุมเชิงสัญลักษณ์หรือข้อสังเกตจากข้อมูลพื้นฐานแทน และห้ามใช้เป็นหลักฐานเด็ดขาด\n- ห้ามระบุตำแหน่งดาว องศาดาว midpoint หรือ aspect แบบแม่นยำ ถ้าไม่มี ephemeris/ฐานคำนวณ ให้พูดว่า "สัญญาณดาวโดยประมาณ" หรือเลี่ยงการอ้างดาวเฉพาะ\n- ทายทักทุกข้อต้องระบุเรื่อง ช่วงเวลา เหตุผลจากศาสตร์ของตัวเอง และวิธีรับมือ\n- ใช้เปอร์เซ็นต์เฉพาะคำถามผลลัพธ์เท่านั้น และห้ามเกิน 75%; คำถามภาพรวมห้ามใช้คำว่า "น้ำหนักรวม" หรือ "ผสม" ให้สรุปเป็นประโยคธรรมดา เช่น "ไปต่อได้ แต่ต้องระวัง..." หรือ "ยังไม่ควรรีบ..."\n- ถ้าข้อมูลไม่เพียงพอ ให้บอกข้อจำกัดสั้น ๆ แล้ววิเคราะห์เท่าที่ทำได้ หรือถามเพิ่มถ้าจำเป็นจริง ๆ\n` : "";
      const astrologyElementGuardRules = isAstrologySession ? `\n\n🧱 กฎห้ามอ้างธาตุ/ดาวเกินจริง:\n- ถ้าข้อมูลตั้งต้นไม่ได้ส่งผลคำนวณธาตุจริง ห้ามใช้คำว่า "ธาตุไม้เด่น", "ธาตุไฟเด่น", "ธาตุ...เด่นชัดในพื้นดวง", "ธาตุแข็ง/อ่อน" เป็นข้อเท็จจริง\n- ถ้าจำเป็นต้องใช้ภาษาธาตุ ให้เขียนว่า "ตีความเชิงสัญลักษณ์จากวัน/เดือน/เวลาเกิด" และห้ามใช้เป็นหลักฐานหลักของคำตอบ\n- OMNIA.AI ห้ามสรุปซ้ำคำอ้างธาตุ/ดาวที่ agent พูดเกินฐานข้อมูล ให้แปลงเป็นภาษากลาง เช่น "มีสัญญาณเรื่องพลังงานและการตัดสินใจ" แทน\n` : "";
      const directAnswerOpeningContext = isAstrologySession ? `🎯 กฎประโยคแรกของ **คำตอบตรง ๆ**:
- ถ้าเป็นคำถามภาพรวม ให้ประโยคแรกเป็นภาษาคนทั่วไปที่ตอบได้ทันที เช่น "ปีนี้งานยังไปต่อได้ แต่เงินก้อนต้องระวัง..." หรือ "เรื่องนี้มีลุ้น แต่ยังไม่ควรรีบ..."
- ห้ามใช้ศัพท์ระบบในคำตอบ เช่น "น้ำหนักรวม", "ผสม", "สัญญาณ", "แรงหนุน", "แรงต้าน"
- ห้ามเปิดด้วยคำปลอบใจลอย ๆ ก่อนบอกจุดที่ต้องระวัง

` : "";

      // === QA Mode: Direct single-agent answer (no meeting ceremony) ===
      if (mode === "qa") {
        const questionMarker: ResearchMessage = {
          id: crypto.randomUUID(),
          agentId: "user",
          agentName: "ผู้ใช้",
          agentEmoji: "👤",
          role: "user_question",
          content: question,
          tokensUsed: 0,
          timestamp: new Date().toISOString(),
        };
        await appendResearchMessage(sessionId, questionMarker);

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
          const qaSystemPrompt = isAstrologySession
            ? `${companyContext}${memoryContext}${agent.soul}${getAgentVoice(agent.role)}${getAstroMethodSignature(agent.role)}${getAstroPrecisionRules("agent")}${knowledgeContext}${domainKnowledge}${dataSourceContext}${historyContext}${fileContext}${mcpContext}${searchContext}${clarificationContext}${premiseGuardContext}${astroFocusContext}${timeFrameContext}${questionStyleContext}${outcomeVerdictContext}${salesDemoContext}${dailyBrevityContext}${dateContext}${agentCoverageContext}${antiHallucinationRules}${astrologyAntiHallucinationRules}${astrologyElementGuardRules}`
            : `${companyContext}${memoryContext}${agent.soul}${knowledgeContext}${domainKnowledge}${dataSourceContext}${historyContext}${fileContext}${mcpContext}${searchContext}${clarificationContext}${timeFrameContext}${dateContext}${antiHallucinationRules}\n\nรูปแบบการตอบ:\n1. **ตอบคำตอบหลักให้ชัดเจนก่อนเลยในย่อหน้าแรก** (ใช่/ไม่ใช่/มี/ไม่มี + สรุปสั้น 1-2 ประโยค)\n2. จากนั้นค่อยอธิบายเหตุผล หลักกฎหมาย หรือรายละเอียดสนับสนุน\n3. ถ้ามีเงื่อนไขพิเศษหรือข้อยกเว้น ให้ระบุชัดเจนว่ากรณีของผู้ถามเข้าเงื่อนไขไหน\n\n⚠️ กฎเหล็กด้านความถูกต้อง:\n- ตอบในบริบทกฎหมายและมาตรฐานของประเทศไทยเป็นหลัก\n- ก่อนสรุปว่าต้องเสียภาษีหรือปฏิบัติตามกฎใด ต้องตรวจสอบข้อยกเว้น (exemptions) ที่เกี่ยวข้องก่อนเสมอ\n- คำตอบต้องสอดคล้องกันตลอด — ห้ามเปิดด้วยข้อมูลที่ขัดกับข้อสรุป\n- อ้างอิงมาตรากฎหมาย มาตรฐานบัญชี หรือแนวปฏิบัติที่เกี่ยวข้อง\n- ใช้ภาษาที่เข้าใจง่าย ตอบไม่เกิน 500 คำ`;
          const qaUserPrompt = isAstrologySession
            ? isDailyTimeFrame
              ? `คำถามของผู้ใช้: ${question}\n\nคุณคือหมอดูสาย ${agent.role} กำลังตอบแบบรายวัน 1 ต่อ 1${getAstroRoleFocus(agent.role)}\n\nให้ใช้ข้อมูลเจ้าชะตาที่ระบบให้เท่านั้น และตอบสั้นแบบใช้งานได้ทันที\n\nรูปแบบคำตอบ:\n\n**คำตอบตรง ๆ**\n- เปิดด้วยประโยคธรรมดาที่ user เข้าใจทันที เช่น "วันนี้ไปต่อได้ แต่ต้องระวัง..." แล้วบอกเรื่องที่ควรระวังที่สุด 1 เรื่อง และสิ่งที่ควรทำ 1 เรื่อง\n\n**เช็กให้ตรงก่อน**\n- ทักอดีต/ปัจจุบัน 1 ข้อสั้น ๆ ที่ตรวจได้จริง พร้อมคำธรรมดา เช่น "ดูค่อนข้างชัด", "พอมีเค้า", หรือ "ยังไม่ชัวร์"; ถ้าไม่ตรงให้บอกว่าคำอ่านส่วนถัดไปอาจคลาดเคลื่อน\n\n**จังหวะของวัน**\n- เช้า/ก่อนเที่ยง: 1 ประโยค\n- บ่าย: 1 ประโยค\n- เย็น-ค่ำ: 1 ประโยค\n\n**ควรทำ${dailyWord}**\n- 2 bullet ที่ทำได้ในกรอบเวลานี้\n\n**เลี่ยง${dailyWord}**\n- 1 bullet เท่านั้น\n\nกติกา:\n- ไม่เกิน 170 คำ\n- ถ้ามีโฟกัสจากผู้ใช้ ต้องตอบตามโฟกัสนั้นก่อนทุกหัวข้อ\n- ถ้าข้อมูลยังน้อย ให้มีคำถามต่อ 1 ข้อท้ายคำตอบ ห้ามถามหลายข้อ\n- ห้ามใช้คำว่า ทักแรง ทักกลาง ทักเบา\n- ห้ามใช้ชุดเดิม สื่อสารผิดพลาด/เอกสาร/เดินทาง/เหนื่อย/รับผิดชอบมากขึ้น/คิดเยอะ เป็น default ถ้าคำถาม โฟกัส หรือข้อมูลตั้งต้นไม่ได้ชี้ไปทางนั้นจริง\n- ถ้าต้องพูดเรื่องการสื่อสารหรือเอกสาร ต้องระบุให้แคบว่าเป็นเรื่องใครหรืออะไร เช่น scope งาน ราคา timeline ผู้อนุมัติ ข้อความ follow-up หรือข้อมูลที่ต้อง confirm\n- ห้ามใส่หัวข้อ ภายใน 7 วัน / 30 วัน / 3 เดือน\n- ห้ามลากไปทำนาย 12 เดือน\n- ห้ามเดาวันเกิด ปีเกิด อายุ หรือธาตุเกินจากข้อมูลตั้งต้น`
              : `${directAnswerOpeningContext}คำถามของผู้ใช้: ${question}\n\nคุณคือหมอดูสาย ${agent.role} กำลังตอบแบบถามตรง 1 ต่อ 1${getAstroRoleFocus(agent.role)}\n\nให้ตอบเป็นภาษาไทยแบบคนทั่วไป กระชับ ตรง และใช้ข้อมูลเจ้าชะตาที่มีจริงเท่านั้น\n\nรูปแบบคำตอบต้องเป็นหัวข้อต่อไปนี้:\n\n**คำตอบตรง ๆ**\n- ตอบประเด็นหลักก่อนใน 1-2 ประโยค ถ้าเป็นคำถามรายวันให้พูดตรง ๆ ด้วยภาษาคนทั่วไป เช่น "วันนี้มีลุ้น แต่...", "ควรระวัง...", "ยังไม่ควรรีบ..." ห้ามใช้คำว่า น้ำหนักรวม หรือ ผสม\n\n**เช็กอดีตก่อนเชื่อ**\n- ทักอดีตหรือปัจจุบัน 1-2 ข้อ โดยโยงกับคำถามล่าสุด และต้องเป็นฉากชีวิตจริงที่ตรวจได้ ไม่ใช่ความรู้สึกลอย ๆ พร้อมคำธรรมดา เช่น "ดูค่อนข้างชัด", "พอมีเค้า", หรือ "ยังไม่ชัวร์"\n\n**หลักที่ใช้ทัก**\n- ระบุข้อมูลตั้งต้น 2-3 จุดที่ใช้จริง เช่น วันเกิด อายุ เลขชีวิต เลขปีส่วนตัว เวลาเกิด หรือข้อมูลเหตุการณ์ที่ผู้ใช้ให้มา\n\n**ทำไมหมอดูถึงเห็นแบบนี้**\n- บอกสัญญาณหนุนและสัญญาณฉุดอย่างละ 1 ข้อ ถ้ามีแรงฉุดมาก ให้พูดตรง ๆ\n\n${timeFrame.agentInstruction}\n**ตัวอย่างเรื่องที่อาจเจอ**\n- ยกตัวอย่างสถานการณ์จริง 1 ข้อที่ตรงกับกรอบเวลา เช่น วันนี้/พรุ่งนี้/สัปดาห์หน้า ต้องมีช่วงเวลา + เรื่องที่เกี่ยวข้อง + อาการที่เห็น + วิธีรับมือ\n\n**เรื่องที่ควรระวัง**\n- ระบุ 1-2 เรื่องพร้อมวิธีรับมือสั้น ๆ\n\n**สิ่งที่ควรทำ**\n- ให้ action ที่ทำได้จริงภายในกรอบเวลาที่ถาม เช่น ต้องทำอะไรในกรอบเวลานี้\n\nกติกา:\n- ถ้าถามรายวัน/วันนี้/ประจำวัน ตอบไม่เกิน 220 คำ และห้ามลากไป 3 เดือนหรือ 12 เดือน\n- ถ้าเป็นคำถามพรุ่งนี้ ตอบไม่เกิน 240 คำ และให้สิ่งที่ควรเตรียมคืนนี้\n- ห้ามใช้คำว่า ทักแรง ทักกลาง ทักเบา\n- ห้ามใช้ชุดเดิม สื่อสารผิดพลาด/เอกสาร/เดินทาง/เหนื่อย/รับผิดชอบมากขึ้น/คิดเยอะ เป็น default ถ้าคำถามหรือข้อมูลตั้งต้นไม่ได้ชี้ไปทางนั้นจริง\n- ห้ามฟันธงแรงเกินจริง ห้ามทำให้กลัว ห้ามขายฝัน\n- ห้ามตอบ generic ถ้าประโยคไหนใช้ได้กับทุกคน ให้ตัดทิ้งหรือเติมเหตุผลจากข้อมูลตั้งต้น\n- ถ้าข้อมูลยังน้อย ให้ปิดท้ายด้วยคำถามต่อ 1 ข้อที่ช่วยให้หมอดูเจาะสถานการณ์จริงขึ้น`
            : question;
          // Use streaming LLM — user sees tokens appearing in real-time
          const result = await callLLMStream(agent.provider, agent.model, apiKey, agent.baseUrl, [
            { role: "system", content: qaSystemPrompt },
            { role: "user", content: qaUserPrompt },
          ], clientSignal, (delta) => send("final_answer_delta", { content: delta }), isDailyTimeFrame ? 650 : 2048);

          const answerMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: agent.id,
            agentName: agent.name,
            agentEmoji: agent.emoji,
            role: "finding",
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
        if (isBroadAstrologyQuestion(question)) {
          send("status", { message: "🔍 ขอจับประเด็นก่อนเปิดคำทำนาย..." });
          send("clarification_needed", {
            questions: [
              {
                id: "astro_focus",
                question: "อยากให้ดูเรื่องไหนเป็นหลักครับ",
                type: "choice",
                options: ["การงาน/อาชีพ", "การเงิน/ทรัพย์สิน", "ความรัก/ครอบครัว", "สุขภาพ", "โชคลาภ", "ภาพรวมชีวิต"],
              },
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
                content: `คุณคือ ${chairman.name} (${chairman.role}) กำลังคุยกับผู้ใช้ก่อนเปิดคำทำนาย
ประเมินจากคำถามจริงของผู้ใช้ว่าจำเป็นต้องถามข้อมูลเพิ่มหรือไม่ แล้วตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น:
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
- ถ้าข้อมูลที่ขาดจะเปลี่ยนคำทำนายหรือคำแนะนำอย่างมีนัยสำคัญ → needsClarification: true
- ถามไม่เกิน 3 ข้อ และถามทีละประเด็นสำคัญจริง ๆ เท่านั้น
- ห้ามใช้ชุดคำถามตายตัว ต้องเลือกถามตามคำถามของผู้ใช้และศาสตร์ของคุณ
- ถามเป็นภาษาคน เหมือนหมอดูถามกลับในแชท เช่น "ขอโฟกัสนิดนึง ตอนนี้อยากดูเรื่องงานหรือความรักมากกว่ากัน?"
- ถ้าคำถามเป็นการดูดวงกว้างมากและไม่มีข้อมูลเกิดเลย ให้ถามเฉพาะข้อมูลเกิดที่จำเป็นที่สุดก่อน เช่น วันเกิด/เวลาเกิด/เรื่องที่อยากโฟกัส
- ถ้ามีประวัติหรือข้อมูลเพิ่มเติมใน prompt แล้ว ห้ามถามซ้ำ`,
              },
              {
                role: "user",
                content: `ประเมินคำถามนี้: "${question}"${fileContexts?.length ? "\n(มีเอกสารแนบมาด้วย)" : ""}${conversationHistory?.length ? "\n(มีประวัติการประชุมก่อนหน้า)" : ""}`,
              },
            ], clientSignal, 300);

            try {
              const jsonMatch = clarifyResult.content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch?.[0] ?? "{}");
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

      const questionMarker: ResearchMessage = {
        id: crypto.randomUUID(),
        agentId: "user",
        agentName: "ผู้ใช้",
        agentEmoji: "👤",
        role: "user_question",
        content: question,
        tokensUsed: 0,
        timestamp: new Date().toISOString(),
      };
      await appendResearchMessage(sessionId, questionMarker);

      // Oracle room: each agent gives an independent reading.
      send("status", { message: "🔮 หมอดูแต่ละศาสตร์กำลังเปิดคำทำนาย..." });

      // Step 1: Send all "thinking" messages upfront so UI shows all agents working
      for (const agent of orderedAgents) {
        send("agent_start", { agentId: agent.id, name: agent.name, emoji: agent.emoji, role: agent.role, isChairman: false });
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

          const roleInstruction = `คุณคือหมอดูสาย ${agent.role} กำลังดูดวงให้ผู้ถามแบบตัวต่อตัว ให้ตอบจากศาสตร์ของคุณโดยตรง${getAstroRoleFocus(agent.role)}${getAstroMethodSignature(agent.role)}`;

          const knowledgeContext = await getAgentKnowledgeContent(agent.id, question);
          const agentVoice = getAgentVoice(agent.role);
          const result = await callLLMWithRetry(agent.provider, agent.model, apiKey, agent.baseUrl, [
            {
              role: "system",
              content: `${companyContext}${memoryContext}${agent.soul}${agentVoice}${getAstroMethodSignature(agent.role)}${getAstroPrecisionRules("agent")}${knowledgeContext}${domainKnowledge}${dataSourceContext}${historyContext}${fileContext}${mcpContext}${searchContext}${clarificationContext}${premiseGuardContext}${astroFocusContext}${timeFrameContext}${questionStyleContext}${outcomeVerdictContext}${salesDemoContext}${dailyBrevityContext}${dateContext}${agentCoverageContext}${antiHallucinationRules}${astrologyAntiHallucinationRules}${astrologyElementGuardRules}`,
            },
            {
              role: "user",
              content: `${directAnswerOpeningContext}คำถามของผู้ใช้: ${question}\n\n${roleInstruction}\n\nให้ตอบเป็นภาษาไทยแบบคนทั่วไป กระชับ อบอุ่น และทักให้ตรงใจ ห้ามใช้ศัพท์โหราศาสตร์ยาก ๆ ลอย ๆ ถ้าจำเป็นต้องใช้ศัพท์เฉพาะให้แปลเป็นภาษาคนทันที\n\nรูปแบบคำตอบของคุณต้องเป็นหัวข้อต่อไปนี้เท่านั้น:\n\n**คำตอบตรง ๆ**\n- ตอบประเด็นหลักของผู้ใช้ก่อนใน 1-2 ประโยค ถ้าเป็นคำถามใช่/ไม่ใช่ ให้ให้น้ำหนักแบบ "ยังไม่เห็นชัดว่าใช่", "มีโอกาสแต่ยังไม่สุด", หรือ "ควรจับตา" พร้อมเหตุผลสั้น ๆ ห้ามฟันธง\n- ถ้าเป็นคำถามถามผลลัพธ์ เช่น จะผ่านไหม/จะได้ไหม/จะสำเร็จไหม/จะขายได้ไหม/เขาจะตอบไหม ให้บอกชัด ๆ ว่าโอกาสสูง/กลาง/ต่ำ หรือเอนเอียงไปทางไหน โดยไม่ใส่เปอร์เซ็นต์ เว้นแต่ผู้ใช้ถามหาเปอร์เซ็นต์ตรง ๆ และห้ามตอบแค่ว่า "ต้องลุ้น" โดยไม่มีเหตุผลรองรับ\n- ถ้าเป็นคำถามขอแผน/ทางเลือก ให้บอกสิ่งที่ควรทำก่อนเป็นอันดับแรกทันที\n\n**เช็กอดีตก่อนเชื่อ**\n- ทักอดีตหรือปัจจุบัน 2 ข้อเท่านั้น โดยเลือกให้ตรงกับคำถามล่าสุด เช่น งาน/เงิน/รัก/สอบ/เบอร์/สุขภาพ/ภาพรวมชีวิต\n- แต่ละข้อต้องเป็นฉากชีวิตจริง: ช่วงเวลา + คน/บทบาทหรือเรื่อง + สิ่งที่เกิด/พฤติกรรมที่เห็น + ผลกระทบสั้น ๆ + คำบอกระดับ เช่น "ดูค่อนข้างชัด", "พอมีเค้า", "ยังไม่ชัวร์"\n- ห้ามใช้คำว่า ทักแรง ทักกลาง ทักเบา\n- ห้ามเขียนแค่ความรู้สึกกว้าง ๆ เช่น คิดเยอะ เหนื่อย อยากเปลี่ยน มีภาระ; ถ้าข้อไหนไม่ตรง ให้บอกว่าคำอ่านส่วนถัดไปอาจคลาดเคลื่อน\n\n**หลักที่ใช้ทัก**\n- ระบุข้อมูลตั้งต้น 2-3 จุดที่ใช้จริง เช่น วันเกิด/อายุ/เลขเส้นชีวิต/เลขปีส่วนตัว/เวลาเกิด/สถานที่เกิด หรือวันเกิดเหตุการณ์ที่ผู้ใช้ให้มา และแปลว่ามันทำให้คุณมองอะไร ไม่ต้องยาว\n\n**ทำไมหมอดูถึงเห็นแบบนี้**\n- บอก 2-3 สัญญาณจากศาสตร์ของคุณว่าทำไมจึงตอบแบบนั้น ต้องโยงกับคำถามและข้อมูลตั้งต้น\n- ถ้าเป็นคำถามถามผลลัพธ์ ให้แยกให้เห็นอย่างน้อย 1 จุดที่ทำให้มีลุ้น และ 1 จุดที่ทำให้ต้องระวังหรือทำให้ผลออกมาแบบเฉียด\n\n**จุดเด่นและจุดติดของช่วงนี้**\n- 2-3 bullet ที่โยงกับคำถามและข้อมูลตั้งต้น\n\n${timeFrame.agentInstruction}\n**ตัวอย่างเรื่องที่อาจเจอ**\n- ยกตัวอย่างสถานการณ์ชีวิตจริง 1-2 ข้อ โดยต้องโยงกับข้อมูลตั้งต้นหรือกรอบเวลาที่ถาม\n- แต่ละตัวอย่างต้องมี คน/เรื่องที่เกี่ยวข้อง + ช่วงเวลา + อาการที่เห็นจริง + ผลกระทบ + วิธีรับมือสั้น ๆ\n- ถ้าผู้ใช้ให้วันเกิดเหตุการณ์ เช่น วันสอบ วันสัมภาษณ์ วันคุยงาน วันขายของ ให้ใช้วันนั้นเป็นจังหวะประกอบตัวอย่าง แต่ห้ามแต่งรายละเอียดเฉพาะเกินข้อมูล ให้พูดเป็นภาพที่ "อาจ" เกิดขึ้น\n\n**เรื่องที่ควรระวัง**\n- บอกสิ่งที่ควรระวัง 1-2 ข้อแบบไม่ขู่ และบอกวิธีรับมือสั้น ๆ\n- ถ้าเป็นคำถามถามผลลัพธ์ ต้องบอกด้วยว่า ถ้าผลไม่เป็นตามหวัง สาเหตุน่าจะติดตรงไหน และควรรับมืออย่างไร\n\n**สิ่งที่ควรสังเกตต่อ**\n- บอก 1-2 สิ่งที่เห็นในชีวิตจริงที่ถ้าเริ่มเกิดขึ้น แปลว่าคำทำนายกำลังเดินไปทางนั้น โดยเลือกให้ตรงกับคำถามจริง\n- ถ้าข้อมูลยังน้อย ให้เพิ่มคำถามต่อ 1 ข้อที่ถามแล้วจะทำให้รอบถัดไปเจาะขึ้น ห้ามถามหลายข้อ\n\n**คำแนะนำจากศาสตร์นี้**\n- ให้คำแนะนำที่ทำได้จริง 2-3 ข้อ โดยอย่างน้อย 1 ข้อต้องผูกกับเลข/วัน/อายุ/เวลาเกิดที่ระบบให้\n\nกติกาสำคัญ:\n- ตอบไม่เกิน 220 คำ\n- ใช้คำธรรมดา ประโยคสั้น\n- น้ำเสียงเหมือนหมอดูที่พูดตรง แต่อบอุ่น\n- ห้ามใช้ชุดเดิม สื่อสารผิดพลาด/เอกสาร/เดินทาง/เหนื่อย/รับผิดชอบมากขึ้น/คิดเยอะ เป็น default ถ้าคำถามหรือข้อมูลตั้งต้นไม่ได้ชี้ไปทางนั้นจริง\n- ให้ความหวังแบบมีสติ ไม่ขายฝัน ไม่ทำให้กลัว\n- ห้ามใช้คำฟันธง เช่น "รวยแน่นอน", "เกิดแน่", "เลิกแน่" ให้ใช้ "มีโอกาส", "มีแนวโน้ม", "ถ้าบริหารดี"\n- ห้ามตอบ generic ถ้าประโยคไหนใช้ได้กับทุกคน ให้ตัดทิ้งหรือเติมเหตุผลจากข้อมูลตั้งต้น\n- ห้ามปิดด้วยคำกว้าง ถ้ายังไม่แม่นพอให้พูดตรง ๆ ว่า "จุดนี้ยังอ่านได้แค่ภาพรวม" แล้วถามต่อ 1 ข้อ\n- ตัวอย่างต้องเป็น "แนวโน้มที่อาจเจอ" ไม่ใช่ข้อเท็จจริงเด็ดขาด ห้ามแต่งเหตุการณ์เฉพาะเจาะจงเกินข้อมูล\n- ห้ามใช้ template เดิมกับทุกคำถาม ให้เปลี่ยนน้ำหนัก ตัวอย่าง และสิ่งที่ควรสังเกตตามเจตนาคำถามล่าสุด\n- คำถามล่าสุดสำคัญที่สุด ประวัติเก่าใช้ช่วยตีความเท่านั้น ห้ามเปลี่ยนเรื่องของคำถามล่าสุดไปตอบเรื่องเก่า\n- ห้ามบอกให้ผู้ใช้เชื่อสนิทใจ ให้บอกให้ใช้เป็นแนวทางประกอบการตัดสินใจ\n- ถ้าข้อมูลเกิดไม่ครบ ให้บอกข้อจำกัดสั้น ๆ แล้วดูจากข้อมูลที่มี\n${fileContexts?.length ? "\n- ถ้ามีเอกสารแนบ ให้อ้างอิงเฉพาะส่วนที่เกี่ยวข้อง" : ""}`,
              // isAstrologySession flag is set above — injects ทายทัก section only for astrology topics
            },
          ], clientSignal, 1, outcomeQuestion ? 650 : isDailyTimeFrame ? 650 : 1000);

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

        send("agent_start", { agentId: agent.id, name: agent.name, emoji: agent.emoji, role: agent.role, isChairman: false });

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

      // Oracle room: no cross-debate. Each reading stands on its own, then OMNIA.AI summarizes.
      let skipDiscussion = true;
      if (false && agentFindings.length > 1) {
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
            ], clientSignal, 250);
            try {
              const jsonMatch = consensusResult.content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch?.[0] ?? "{}");
                if (parsed.consensus === true) {
                  skipDiscussion = true;
                  send("status", { message: `✅ อ่านครบทุกศาสตร์ — กำลังเตรียมสรุปรวม` });
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
                content: `${companyContext}${memoryContext}${agent.soul}${agentVoice2}${knowledgeCtx}${domainKnowledge}${clarificationContext}${timeFrameContext}${dateContext}${antiHallucinationRules}\n\nคุณกำลังอยู่ในวงอภิปราย จงแสดงความเห็นตามบทบาท ${agent.role} ของคุณอย่างตรงไปตรงมา\n\n⚠️ กฎเหล็กของการอภิปราย:\n1. ห้ามพูดแค่ "เห็นด้วย" โดยไม่มีเนื้อหาใหม่ — ถ้าเห็นด้วยต้องเสริมมุมมองใหม่ที่คนอื่นยังไม่ได้พูด\n2. คุณต้องระบุอย่างน้อย 1 จุดที่ไม่เห็นด้วยหรือมีข้อกังวล พร้อมเหตุผลจากประสบการณ์ในบทบาท ${agent.role}\n3. คุณต้องชี้อย่างน้อย 1 ความเสี่ยงหรือข้อควรระวังที่คนอื่นอาจมองข้าม\n4. พูดกระชับ เน้นเฉพาะจุดที่ต่างจากคนอื่น ไม่ต้องสรุปซ้ำสิ่งที่ทุกคนเห็นตรงกันแล้ว\n5. ถ้าพบว่าคนอื่นให้ข้อมูลที่ไม่ถูกต้องหรืออ้างกฎหมายผิด ต้องชี้แจงและแก้ไขทันที พร้อมอ้างอิงมาตราที่ถูกต้อง\n6. ถ้าคนอื่นสรุปว่าต้องเสียภาษี/ปฏิบัติตามกฎใด โดยยังไม่ได้ตรวจสอบข้อยกเว้นตามกฎหมาย ต้องชี้ให้ตรวจสอบทันที\n7. ห้ามให้ข้อมูลที่ขัดแย้งกับข้อสรุปของตัวเอง`,
              },
              {
                role: "user",
                content: `วาระ: ${question}\n\nสรุปมุมมองของคุณ:\n${myFinding.content.slice(0, 500)}${myFinding.content.length > 500 ? "..." : ""}\n\n---\nมุมมองจากสมาชิกคนอื่น:\n${otherFindings}\n\n---\nในฐานะ ${agent.role}:\n1. ระบุจุดที่คุณไม่เห็นด้วยกับใคร เพราะอะไร?\n2. มีความเสี่ยงอะไรที่คนอื่นมองข้าม?\n3. มีข้อเสนอเพิ่มเติมจากมุมมอง ${agent.role} ของคุณไหม?\n\n⚠️ ความยาว: ตอบกระชับไม่เกิน 400 คำ เน้นจุดที่เห็นต่างเท่านั้น ไม่ต้องสรุปซ้ำสิ่งที่ทุกคนเห็นตรงกัน`,
              },
            ], clientSignal, 250);

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
      if (false && isAstrologySession && agentFindings.length >= 2 && mode !== "close") {
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
      if (false && agentFindings.length > 0 && mode !== "close") {
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

      // === Final OMNIA.AI synthesis (skip in "discuss" mode) ===
      if (mode !== "discuss") {

      send("status", { message: "✨ OMNIA.AI กำลังสรุปคำทำนายรวมให้ตรงประเด็น..." });

      const chairApiKey = await getAgentApiKey(chairman.id);

      // Build allContext from either current round findings or all rounds (close mode)
      let allContext = "";
      const SYNTHESIS_MSG_CAP = 1000; // per-message cap to prevent synthesis timeout
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
        const SYNTHESIS_FINDING_CAP = 1200;
        allContext = agentFindings
          .map((f) => {
            const text = f.content.length > SYNTHESIS_FINDING_CAP
              ? f.content.slice(0, 800) + "\n\n[...สรุปย่อ...]\n\n" + f.content.slice(-300)
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

          const longRoadmapQuestion = ["12 เดือนข้างหน้า", "ปีหน้า"].includes(timeFrame.label);
          const mediumRoadmapQuestion = ["3 เดือนข้างหน้า", "6 เดือนข้างหน้า", "เดือนหน้า", "สัปดาห์หน้า"].includes(timeFrame.label);
          const roadmapMonthLabels = longRoadmapQuestion
            ? thaiMonthRoadmapLabels(12).join(" / ")
            : timeFrame.label === "6 เดือนข้างหน้า"
              ? thaiMonthRoadmapLabels(6).join(" / ")
              : timeFrame.label === "3 เดือนข้างหน้า"
                ? thaiMonthRoadmapLabels(3).join(" / ")
                : "";
          const adaptiveSummaryFormatContext = isDailyTimeFrame ? `\n\n🧾 รูปแบบคำตอบสุดท้ายที่ต้องใช้: รายวัน/วันสั้น
- กฎนี้สำคัญกว่าหัวข้อยาวใน user prompt ถ้ามีคำสั่งขัดกันให้ยึดรูปแบบนี้
- ใช้หัวข้อ: **คำตอบตรง ๆ**, **เช็กให้ตรงก่อน**, **จังหวะของวัน**, **ควรทำ${dailyWord}**, **เลี่ยง${dailyWord}**
- ไม่เกิน 190 คำ และห้ามใส่หัวข้อเชิงระบบ เช่น หลักที่ใช้สรุปดวงนี้ / มุมที่แต่ละศาสตร์เห็นต่างกัน
` : outcomeQuestion ? `\n\n🧾 รูปแบบคำตอบสุดท้ายที่ต้องใช้: คำถามผลลัพธ์/ใช่หรือไม่
- กฎนี้สำคัญกว่าหัวข้อยาวใน user prompt ถ้ามีคำสั่งขัดกันให้ยึดรูปแบบนี้
- ใช้หัวข้อ: **คำตอบตรง ๆ**, **ทำไมเอนทางนี้**, **จุดที่จะทำให้ผลพลิก**, **สัญญาณที่ควรดูต่อ**
- ประโยคแรกต้องเลือกฝั่ง เช่น เอนทางได้/ไม่ได้/ติด/ไม่ติด/ผ่าน/ไม่ผ่าน/ซื้อ/ไม่ซื้อ ตามคำถาม ห้ามตอบกลาง ๆ
- ห้ามปลอบใจ ห้ามคำแนะนำทั่วไป ห้ามเปอร์เซ็นต์เว้นแต่ผู้ใช้ขอเอง ไม่เกิน 260 คำ
` : longRoadmapQuestion ? `\n\n🧾 รูปแบบคำตอบสุดท้ายที่ต้องใช้: ดวงระยะยาว/roadmap
- กฎนี้สำคัญกว่าหัวข้อยาวใน user prompt ถ้ามีคำสั่งขัดกันให้ยึดรูปแบบนี้
- ตอบให้อ่านเหมือนหมอดูเล่า roadmap ไม่ใช่รายงานจากระบบหลาย agent
- ใช้หัวข้อเรียงตามนี้เท่านั้น: **ข้อมูลที่ใช้ดู**, **ภาพรวม ${timeFrame.label}**, **เช็กให้ตรงก่อน**, **รายเดือน**, **ช่วงที่ควรลุย**, **ช่วงที่ควรระวัง**, **สิ่งที่ควรทำจริง**
- รายเดือนต้องใช้เดือนตามรายการนี้เท่านั้น ห้ามย้อนปีหรือแต่งเดือนเอง: ${roadmapMonthLabels}
- ในหัวข้อ **รายเดือน** ให้เขียนครบ 12 เดือนตามรายการด้านบน เดือนละ 1-2 ประโยค และต้องเปลี่ยนประเด็นตามจังหวะเดือน ห้ามใช้คำซ้ำแบบ "โอกาสใหม่/เรียนรู้/ปรับตัว" ทุกเดือน
- หัวข้อ **เช็กให้ตรงก่อน** ต้องสั้น 1-2 บรรทัด และถ้าเป็นภาพรวมที่ไม่มีเหตุการณ์จริง ให้บอกว่าเป็น "จุดที่ควรเช็ก" ไม่ใช่ข้อเท็จจริง
- ห้ามใช้คำว่า น้ำหนักรวม, ผสม, สัญญาณ, แรงหนุน, แรงต้าน, Day Master, กาลกิณี, ภูมิ, midpoint ในคำตอบสุดท้าย เว้นแต่ผู้ใช้ถามศัพท์นั้นเอง
- ห้ามใส่เปอร์เซ็นต์ ห้ามหัวข้อ หลักที่ใช้สรุปดวงนี้ / ทำไมถึงอ่านแบบนี้ / มุมที่แต่ละศาสตร์เห็นต่างกัน / ข้อควรรู้ก่อนเชื่อคำทำนายนี้
- ตอบยาวได้พอให้ครบ roadmap แต่ต้องไม่เกินประมาณ 900 คำ
` : mediumRoadmapQuestion ? `\n\n🧾 รูปแบบคำตอบสุดท้ายที่ต้องใช้: roadmap ระยะกลาง
- กฎนี้สำคัญกว่าหัวข้อยาวใน user prompt ถ้ามีคำสั่งขัดกันให้ยึดรูปแบบนี้
- ใช้หัวข้อ: **คำตอบตรง ๆ**, **เช็กให้ตรงก่อน**, **ภาพรวม${timeFrame.label}**, **รายช่วง**, **ช่วงที่ควรลุย**, **ช่วงที่ควรระวัง**, **สิ่งที่ควรทำจริง**
- แบ่งตามกรอบเวลาที่ผู้ใช้ถามจริง เช่น 3 เดือนให้แบ่งเดือน 1/2/3, 6 เดือนให้แบ่ง 1-2/3-4/5-6, เดือนหน้าให้แบ่งต้น/กลาง/ปลายเดือน
- ถ้าต้องระบุเดือน ให้ใช้เดือนเหล่านี้เท่านั้น ห้ามย้อนปีหรือแต่งเดือนเอง: ${roadmapMonthLabels || "ใช้เดือนตามวันที่ปัจจุบัน"}
- ห้ามใช้ศัพท์ระบบและห้ามเปอร์เซ็นต์ ไม่เกิน 600 คำ
` : `\n\n🧾 รูปแบบคำตอบสุดท้ายที่ต้องใช้: คำถามทั่วไป
- กฎนี้สำคัญกว่าหัวข้อยาวใน user prompt ถ้ามีคำสั่งขัดกันให้ยึดรูปแบบนี้
- ใช้หัวข้อ: **คำตอบตรง ๆ**, **เช็กให้ตรงก่อน**, **ภาพที่เห็น**, **เรื่องที่ควรระวัง**, **สิ่งที่ควรทำจริง**
- ตอบเหมือนหมอดูคุยกับคนทั่วไป ห้ามใช้ศัพท์ระบบ ห้ามทำเป็นรายงานหลายศาสตร์ เว้นแต่ผู้ใช้ถามว่าแต่ละศาสตร์เห็นต่างกันอย่างไร
- ถ้าข้อมูลยังน้อย ให้ถามต่อ 1 ข้อท้ายคำตอบ ไม่เกิน 420 คำ
`;

          const result = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
            {
              role: "system",
              content: `${companyContext}${memoryContext}คุณคือ OMNIA.AI ผู้สรุปคำทำนายรวมจากหมอดูหลายศาสตร์ หน้าที่ของคุณคืออ่านคำทำนายของแต่ละศาสตร์ แล้วสรุปให้ผู้ใช้เข้าใจแบบกระชับ อบอุ่น ตรงประเด็น และนำไปใช้ได้จริง ห้ามใช้ภาษาเป็นทางการหรือศัพท์ยากเกินจำเป็น ห้ามเรียกตัวเองว่าประธาน ห้ามใช้คำว่า วาระ/มติ/ประชุม${mode === "close" && allRounds && allRounds.length > 1 ? ` (มีคำถามต่อเนื่อง ${allRounds.length} รอบ ให้สรุปรวมทั้งหมด)` : ""}${failureNote}${factCheckNote}${domainKnowledge}${clarificationContext}${premiseGuardContext}${astroFocusContext}${timeFrameContext}${adaptiveSummaryFormatContext}${questionStyleContext}${outcomeVerdictContext}${salesDemoContext}${dailyBrevityContext}${dateContext}${agentCoverageContext}${getAstroPrecisionRules("summary")}${antiHallucinationRules}${astrologyAntiHallucinationRules}${astrologyElementGuardRules}`,
            },
            {
              role: "user",
              content: isDailyTimeFrame ? `${agentCoverageUserContext}${directAnswerOpeningContext}คำถามของผู้ใช้: ${question}\n\nคำทำนายจากหมอดูแต่ละศาสตร์:\n\n${allContext}\n\n---\nสรุปรายวันแบบสั้นเท่านั้น ห้ามใช้ template ยาว ห้ามใช้หัวข้ออื่นนอกจาก 7 หัวข้อนี้:\n\n**คำตอบตรง ๆ**\n- เปิดด้วยประโยคธรรมดา เช่น "วันนี้ไปต่อได้ แต่ต้องระวัง..." หรือ "พรุ่งนี้มีลุ้น ถ้า..." แล้วบอกเรื่องที่ควรระวังที่สุด 1 เรื่อง + สิ่งที่ควรทำที่สุด 1 เรื่อง\n\n**จุดที่หลายศาสตร์เห็นตรงกัน**\n- 1 bullet เท่านั้น ต้องโยงกับคำถาม โฟกัส หรือข้อมูลเกิด\n\n**จุดที่เห็นต่างกัน**\n- 1 bullet เท่านั้น ถ้าไม่ต่างให้บอกว่าแต่ละศาสตร์ย้ำคนละมุมของประเด็นเดียวกัน\n\n**เช็กให้ตรงก่อน**\n- 1 bullet จากอดีต/ปัจจุบันที่ตรวจได้จริง พร้อมคำธรรมดา เช่น "ดูค่อนข้างชัด", "พอมีเค้า", หรือ "ยังไม่ชัวร์"; ถ้าไม่ตรงให้บอกว่าคำอ่านส่วนถัดไปอาจคลาดเคลื่อน\n\n**จังหวะของวัน**\n- เช้า:\n- บ่าย:\n- เย็น-ค่ำ:\n\n**ควรทำ${dailyWord}**\n- 2 bullet เท่านั้น\n\n**เลี่ยง${dailyWord}**\n- 1 bullet เท่านั้น\n\nกติกา:\n- ไม่เกิน 190 คำ\n- ห้ามใช้คำว่า ทักแรง ทักกลาง ทักเบา\n- ห้ามใช้ชุดเดิม สื่อสารผิดพลาด/เอกสาร/เดินทาง/เหนื่อย/รับผิดชอบมากขึ้น/คิดเยอะ เป็น default ถ้าคำถามหรือข้อมูลตั้งต้นไม่ได้ชี้ไปทางนั้นจริง\n- ถ้าจำเป็นต้องพูดคำกว้าง เช่น "การสื่อสาร" ให้ตามด้วยจุดเฉพาะจากบริบททันที เช่น scope งาน ราคา timeline ผู้อนุมัติ next step หรือข้อมูลที่ต้อง confirm\n- ถ้ามีโฟกัสจากผู้ใช้ ให้สรุปตามโฟกัสนั้นก่อน ห้ามกระจายครบทุกเรื่อง
- ห้ามมีหัวข้อ หลักที่ใช้สรุปดวงนี้, ทำไมถึงอ่านแบบนี้, จุดที่ทักได้ชัดที่สุด, ตัวอย่างเรื่องที่อาจเจอ, เรื่องที่ควรระวัง, สิ่งที่ควรสังเกตต่อ, มุมที่แต่ละศาสตร์เห็นต่างกัน, ข้อควรรู้ก่อนเชื่อคำทำนายนี้\n- ถ้าข้อมูลยังน้อย ให้บอกข้อจำกัดใน 1 ประโยคในหัวข้อคำตอบตรง ๆ\n\n---\nคำสั่งสุดท้าย: ให้เพิกเฉยต่อหัวข้อ/template ก่อนหน้าถ้าขัดกับรูปแบบด้านล่าง และใช้รูปแบบนี้เท่านั้น\n${adaptiveSummaryFormatContext}` : `${agentCoverageUserContext}${directAnswerOpeningContext}${mode === "close" && allRounds && allRounds.length > 1 ? `คำถามต่อเนื่องทั้งหมด ${allRounds.length} รอบ:\n\n` : `คำถามของผู้ใช้: ${question}\n\n`}คำทำนายจากหมอดูแต่ละศาสตร์:\n\n${allContext}\n\n---\nกรุณาสรุปเป็นภาษาไทยแบบคนทั่วไป กระชับ และทักให้ตรงใจ โดยใช้หัวข้อนี้เท่านั้น:\n\n**คำตอบตรง ๆ**\n- ตอบประเด็นหลักของผู้ใช้ก่อนใน 1-2 ประโยค ถ้าเป็นคำถามใช่/ไม่ใช่ ให้ให้น้ำหนักแบบไม่ฟันธง เช่น "ยังไม่เห็นเป็นภาพนั้นชัด", "มีโอกาสบางส่วน", "ควรจับตาใกล้ ๆ" พร้อมเหตุผลหลัก\n- ถ้าเป็นคำถามถามผลลัพธ์ เช่น จะผ่านไหม/จะได้ไหม/จะสำเร็จไหม/จะขายได้ไหม/เขาจะตอบไหม ให้สรุปชัด ๆ ว่าโอกาสสูง/กลาง/ต่ำ หรือเอนเอียงไปทางไหน โดยไม่ใส่เปอร์เซ็นต์ เว้นแต่ผู้ใช้ถามหาเปอร์เซ็นต์ตรง ๆ และห้ามตอบแค่ว่า "ต้องลุ้น" โดยไม่มีเหตุผลรองรับ\n- ถ้าเป็นคำถามขอแผน/ทางเลือก ให้บอกสิ่งที่ควรทำก่อนอันดับแรกทันที\n\n**เช็กอดีตก่อนเชื่อ**\n- สรุปคำทักอดีต/ปัจจุบัน 2 bullet จากจุดที่หลายศาสตร์เห็นร่วมกันหรือเสริมกัน\n- แต่ละ bullet ต้องเป็นฉากชีวิตจริงที่ผู้ใช้ตรวจได้: ช่วงเวลา + คน/บทบาทหรือเรื่อง + สิ่งที่เกิด/พฤติกรรมที่เห็น + ผลกระทบสั้น ๆ + คำบอกระดับ เช่น "ดูค่อนข้างชัด", "พอมีเค้า", "ยังไม่ชัวร์"\n- ห้ามใช้คำว่า ทักแรง ทักกลาง ทักเบา\n- ห้ามใช้ความรู้สึกลอย ๆ เป็นอดีต; ต้องมี 1 bullet ที่บอกว่า "ถ้าข้อนี้ไม่ตรง คำอ่านส่วนถัดไปอาจคลาดเคลื่อน"\n\n**หลักที่ใช้สรุปดวงนี้**\n- สรุปข้อมูลตั้งต้นที่ใช้จริง 2-3 จุด เช่น อายุ วันเกิด เลขเส้นชีวิต เลขปีส่วนตัว ปีนักษัตร วันเกิดเหตุการณ์ที่ผู้ใช้ให้มา หรือข้อจำกัดเรื่องเวลาเกิด\n\n**ทำไมถึงอ่านแบบนี้**\n- สรุป 2 bullet ว่าหมอดูแต่ละศาสตร์เห็นสัญญาณอะไรตรงกันหรือเสริมกัน ต้องโยงกับข้อมูลตั้งต้นและคำถาม\n- ถ้าเป็นคำถามถามผลลัพธ์ ต้องมีทั้งจุดที่ทำให้มีลุ้นผลลัพธ์ และจุดที่ทำให้ต้องระวัง/ทำให้เฉียด ไม่ใช่มีแต่คำปลอบใจ\n\n**จุดที่ทักได้ชัดที่สุด**\n- 2 bullet แบบเจาะจงว่าช่วงนี้เจ้าชะตากำลังเด่น/ติดเรื่องอะไร เพราะอะไร\n\n${timeFrame.summaryInstruction}\n**ตัวอย่างเรื่องที่อาจเจอ**\n- ยกตัวอย่างสถานการณ์จริง 2 bullet ที่ผู้ใช้อาจเจอในเรื่องที่ถาม โดยใช้คำว่า "อาจ" หรือ "มีแนวโน้ม" เสมอ และโยงกับข้อมูลตั้งต้นอย่างน้อย 1 จุด\n- แต่ละตัวอย่างต้องมี คน/เรื่องที่เกี่ยวข้อง + ช่วงเวลา + อาการที่เห็นจริง + ผลกระทบ + วิธีรับมือสั้น ๆ ห้ามเขียนแค่โอกาสใหม่/เปลี่ยนแปลง/เรียนรู้ลอย ๆ\n- ถ้าผู้ใช้ให้วันเกิดเหตุการณ์ เช่น วันสอบ วันสัมภาษณ์ วันคุยงาน วันขายของ ให้ใช้วันนั้นประกอบภาพตัวอย่าง แต่ห้ามแต่งรายละเอียดเฉพาะเกินข้อมูล\n\n**เรื่องที่ควรระวัง**\n- ระบุ 2 bullet ว่าควรระวังเรื่องอะไร และควรรับมืออย่างไรแบบสั้น ๆ\n- ถ้าเป็นคำถามถามผลลัพธ์ ต้องบอกด้วยว่า ถ้าผลไม่เป็นตามหวัง สาเหตุน่าจะติดตรงไหน และควรทำอะไรต่อ\n\n**สิ่งที่ควรสังเกตต่อ**\n- ระบุ 2 bullet เป็นสิ่งที่เห็นในชีวิตจริงที่ผู้ใช้ควรดูต่อ ถ้าสัญญาณนั้นเกิดขึ้นแปลว่าคำทำนายกำลังเดินไปทางนั้น\n\n**มุมที่แต่ละศาสตร์เห็นต่างกัน**\n- สรุป 1 bullet ว่าแต่ละศาสตร์เน้นต่างกันตรงไหน ถ้าไม่ต่าง ให้บอกว่าแต่ละศาสตร์ยืนยันคนละมุมจากข้อมูลตั้งต้นใด\n\n**คำแนะนำที่ควรทำ**\n- ภายใน 7 วัน\n- ภายใน 30 วัน\n- ภายใน 3 เดือน\n\n**ข้อควรรู้ก่อนเชื่อคำทำนายนี้**\n- บอกข้อจำกัด เช่น เวลาเกิดไม่ครบ หรือข้อมูลยังน้อย ด้วยภาษาสั้น ๆ ไม่เกิน 1 ประโยค และย้ำว่าให้ใช้เป็นแนวทางประกอบการตัดสินใจ\n\nกติกา:\n- ไม่เกิน 440 คำ และต้องเขียนให้จบครบทุกหัวข้อ ห้ามหยุดกลางหัวข้อ\n- ห้ามใช้คำว่า ประธาน, มติ, วาระ, ประชุม\n- ห้ามทำให้กลัว ห้ามฟันธงแรงเกินจริง\n- ห้ามใช้ชุดเดิม สื่อสารผิดพลาด/เอกสาร/เดินทาง/เหนื่อย/รับผิดชอบมากขึ้น/คิดเยอะ เป็น default ถ้าคำถามหรือข้อมูลตั้งต้นไม่ได้ชี้ไปทางนั้นจริง\n- ห้ามใช้คำฟันธง เช่น "รวยแน่นอน", "เกิดแน่", "เลิกแน่" ให้ใช้ "มีโอกาส", "มีแนวโน้ม", "ถ้าบริหารดี"\n- ห้ามตอบ generic ถ้าประโยคไหนใช้ได้กับทุกคน ให้ตัดทิ้งหรือเติมเหตุผลจากข้อมูลตั้งต้น\n- ใช้ภาษาง่าย เหมือนหมอดูที่พูดตรงและหวังดี\n- รวมประเด็นซ้ำจากหลายศาสตร์ให้เหลือครั้งเดียว อย่าคัดลอกคำตอบของแต่ละคนมายาว ๆ\n- ห้ามใช้ template เดิมกับทุกคำถาม ให้เปลี่ยนน้ำหนัก ตัวอย่าง และสิ่งที่ควรสังเกตตามเจตนาคำถามล่าสุด\n- ตัวอย่างเหตุการณ์ต้องเป็นภาพให้ user เข้าใจง่าย ไม่ใช่การยืนยันว่าจะเกิดแน่นอน${isAstrologySession ? "" : `\n\nจากนั้นให้เพิ่มบรรทัดสุดท้ายเป็น JSON สำหรับ visualization ในรูปแบบ:\n\`\`\`chart\n{"type":"bar|line|pie|none","title":"...","labels":[...],"datasets":[{"label":"...","data":[...]}]}\n\`\`\`\nถ้าไม่มีข้อมูลตัวเลขที่เหมาะกับกราฟ ให้ใส่ type: "none"`}\n\n---\nคำสั่งสุดท้าย: ให้เพิกเฉยต่อหัวข้อ/template ก่อนหน้าถ้าขัดกับรูปแบบด้านล่าง และใช้รูปแบบนี้เท่านั้น\n${adaptiveSummaryFormatContext}`,
            },
          ], clientSignal, longRoadmapQuestion ? 2600 : mediumRoadmapQuestion ? 1800 : outcomeQuestion ? 900 : isDailyTimeFrame ? 750 : 1600);

          const synthMsg: ResearchMessage = {
            id: crypto.randomUUID(),
            agentId: "omnia-summary",
            agentName: "OMNIA.AI สรุปรวม",
            agentEmoji: "✦",
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
              ? `ประวัติก่อนหน้า:\n${conversationHistory.map((t, i) => `คำถามที่ ${i + 1}: ${t.question}`).join("\n")}\n\n`
              : "";
            const followupResult = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
              {
                role: "system",
                content: "คุณช่วยแนะนำคำถามดูดวงต่อเนื่องที่น่าสนใจ ตอบในรูปแบบ JSON array เท่านั้น เช่น [\"คำถาม 1\", \"คำถาม 2\", \"คำถาม 3\"]",
              },
              {
                role: "user",
                content: `${historyForFollowup}คำถามล่าสุด: ${question}\n\nคำตอบสรุป: ${result.content.slice(0, 500)}\n\nแนะนำ 3 คำถามต่อเนื่องที่ผู้ใช้น่าจะอยากถามต่อ ตอบเป็น JSON array เท่านั้น ไม่ต้องมีข้อความอื่น`,
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
          if (!isGuest) try {
            const memResult = await callLLM(chairman.provider, chairman.model, chairApiKey, chairman.baseUrl, [
              {
                role: "system",
                content: 'จากการดูดวง ให้ดึงข้อเท็จจริงสำคัญเกี่ยวกับผู้ถามที่ควรจำไว้ ตอบเป็น JSON array เท่านั้น: [{"key":"ชื่อภาษาอังกฤษสั้นๆ","value":"ค่า"}]\n\nตัวอย่าง key: birth_date, birth_time_known, birth_place, main_concern, preferred_name\nถ้าไม่มีข้อมูลใหม่ที่ควรจำ ตอบ []',
              },
              { role: "user", content: `คำถาม: ${question}\n\nข้อมูลจากผู้ถาม: ${clarificationContext || "ไม่มี"}\n\nคำตอบสรุป: ${result.content.slice(0, 500)}` },
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
