import { NextRequest, NextResponse } from "next/server";
import { AgentProvider } from "@/lib/agents-store";

const PROVIDER_MODELS: Record<AgentProvider, { id: string; name: string; contextWindow: number; desc?: string }[]> = {
  anthropic: [
    { id: "claude-4.6-opus", name: "Claude 4.6 Opus", contextWindow: 1000000 },
    { id: "claude-4.5-sonnet", name: "Claude 4.5 Sonnet", contextWindow: 1000000 },
    { id: "claude-4-sonnet", name: "Claude 4 Sonnet", contextWindow: 200000 },
    { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet", contextWindow: 200000 },
    { id: "claude-3-haiku", name: "Claude 3 Haiku", contextWindow: 200000 },
  ],
  openai: [
    { id: "gpt-5.4", name: "GPT-5.4", contextWindow: 1050000 },
    { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", contextWindow: 400000 },
    { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 1047576 },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 1047576 },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", contextWindow: 1047576 },
    { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
    { id: "o4-mini", name: "o4 Mini", contextWindow: 200000 },
    { id: "o3", name: "o3", contextWindow: 200000 },
  ],
  gemini: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1048576 },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1048576 },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", contextWindow: 1048576 },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1048576 },
  ],
  ollama: [
    { id: "llama3.2", name: "Llama 3.2", contextWindow: 128000 },
    { id: "mistral", name: "Mistral", contextWindow: 32000 },
    { id: "qwen2.5", name: "Qwen 2.5", contextWindow: 128000 },
  ],
  openrouter: [
    // ── ⭐ แนะนำ (เรียงจากเร็วที่สุด) ──────────────────────────────
    { id: "google/gemini-2.5-flash-lite", name: "⭐ Gemini 2.5 Flash Lite — แนะนำลด cost", contextWindow: 1048576, desc: "⚡ เร็ว+ถูก · $0.10/$0.40 ต่อ 1M tokens · benchmark ไทยนิ่งสุดในกลุ่มประหยัด" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash — คุณภาพสูงขึ้น", contextWindow: 1048576, desc: "$0.30/$2.50 · แพงกว่า Lite ~6x ใน output เหมาะคำถามสำคัญ" },
    { id: "google/gemini-3-flash-preview", name: "⭐ Gemini 3 Flash — ฉลาดสุด", contextWindow: 1048576, desc: "⚡ TTFT 1.0s · 77 tok/s · $0.50/$3.00 · reasoning top 93%" },
    { id: "google/gemini-3.1-flash-lite-preview", name: "⭐ Gemini 3.1 Flash Lite — ใหม่+ประหยัด", contextWindow: 1048576, desc: "⚡ TTFT 0.74s · 78 tok/s · $0.25/$1.50 · ใกล้เคียง 2.5 Flash" },
    { id: "google/gemini-2.5-pro-preview-06-05", name: "⭐ Gemini 2.5 Pro — แม่นยำสูง", contextWindow: 1048576, desc: "TTFT 1.5s · $1.25/$10.00 · reasoning+coding top tier" },
    { id: "openai/gpt-4.1-nano", name: "⭐ GPT-4.1 Nano — ถูก+เร็ว", contextWindow: 1047576, desc: "$0.10/$0.40 · เหมาะงานง่ายๆ" },
    { id: "openai/gpt-4.1-mini", name: "⭐ GPT-4.1 Mini", contextWindow: 1047576, desc: "$0.40/$1.60 · สมดุลราคา-คุณภาพ" },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2 — ช้า", contextWindow: 163840, desc: "⚠️ ช้า ~60-90s · 15-20 tok/s · $0.30/$1.25 · คุณภาพดีแต่ช้า" },
    { id: "mistralai/mistral-small-2603", name: "⭐ Mistral Small 4", contextWindow: 262144, desc: "เร็ว ราคาถูก" },
    { id: "openai/gpt-5.4-mini", name: "⭐ GPT-5.4 Mini", contextWindow: 400000, desc: "รุ่นใหม่ คุณภาพสูง" },
    { id: "anthropic/claude-4-sonnet", name: "⭐ Claude 4 Sonnet — พรีเมียม", contextWindow: 200000, desc: "$3/$15 · คุณภาพสูงมาก แต่แพง" },
    // ── ฟรี ──────────────────────────────────────────────────────
    { id: "google/gemma-3-27b-it:free", name: "🆓 Gemma 3 27B (free)", contextWindow: 131072 },
    { id: "google/gemma-4-31b-it:free", name: "🆓 Gemma 4 31B (free)", contextWindow: 262144 },
    { id: "google/gemma-4-26b-a4b-it:free", name: "🆓 Gemma 4 26B A4B (free)", contextWindow: 262144 },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "🆓 Llama 3.3 70B (free)", contextWindow: 65536 },
    { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "🆓 Qwen3 Next 80B (free)", contextWindow: 262144 },
    // ── Anthropic ────────────────────────────────────────────────
    { id: "anthropic/claude-4.6-opus", name: "Claude 4.6 Opus", contextWindow: 1000000 },
    { id: "anthropic/claude-4.5-opus", name: "Claude 4.5 Opus", contextWindow: 200000 },
    { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", contextWindow: 200000 },
    { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", contextWindow: 200000 },
    // ── OpenAI ───────────────────────────────────────────────────
    { id: "openai/gpt-5.4", name: "GPT-5.4", contextWindow: 1050000 },
    { id: "openai/gpt-5.4-nano", name: "GPT-5.4 Nano", contextWindow: 400000 },
    { id: "openai/gpt-5-mini", name: "GPT-5 Mini", contextWindow: 400000 },
    { id: "openai/gpt-5-nano", name: "GPT-5 Nano", contextWindow: 400000 },
    { id: "openai/gpt-4.1", name: "GPT-4.1", contextWindow: 1047576 },
    { id: "openai/o4-mini", name: "o4 Mini", contextWindow: 200000 },
    { id: "openai/o3", name: "o3", contextWindow: 200000 },
    { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000 },
    // ── Google ───────────────────────────────────────────────────
    { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", contextWindow: 1048576, desc: "$2/$12 · frontier reasoning" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", contextWindow: 1048576, desc: "⚠️ หมดอายุ 1 มิ.ย. 2026" },
    // ── DeepSeek ─────────────────────────────────────────────────
    { id: "deepseek/deepseek-r1-0528", name: "DeepSeek R1 0528", contextWindow: 163840 },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3", contextWindow: 163840 },
    // ── Qwen ─────────────────────────────────────────────────────
    { id: "qwen/qwen3-235b-a22b", name: "Qwen3 235B A22B", contextWindow: 131072 },
    { id: "qwen/qwen3-32b", name: "Qwen3 32B", contextWindow: 40960 },
    { id: "qwen/qwq-32b", name: "QwQ 32B", contextWindow: 131072 },
    // ── Mistral ──────────────────────────────────────────────────
    { id: "mistralai/mistral-large-2512", name: "Mistral Large 3", contextWindow: 262144 },
    { id: "mistralai/mistral-medium-3.1", name: "Mistral Medium 3.1", contextWindow: 131072 },
    // ── xAI ──────────────────────────────────────────────────────
    { id: "x-ai/grok-4-07-09", name: "Grok 4", contextWindow: 256000 },
    { id: "x-ai/grok-3-mini", name: "Grok 3 Mini", contextWindow: 131072 },
    // ── Meta ─────────────────────────────────────────────────────
    { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", contextWindow: 1048576 },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 65536 },
  ],
  custom: [
    { id: "custom-model", name: "Custom Model", contextWindow: 128000 },
  ],
};

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") as AgentProvider | null;
  if (!provider || !PROVIDER_MODELS[provider]) {
    return NextResponse.json({ models: [] });
  }
  return NextResponse.json({ models: PROVIDER_MODELS[provider] });
}
