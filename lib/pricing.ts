/**
 * Pricing per 1 million tokens in USD.
 * Source: provider public pricing (Oct 2025 snapshot). Update when providers change rates.
 * Keys use the `provider/model` format as stored in Agent.model.
 */
export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  displayName: string;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "anthropic/claude-opus-4-7": { inputPer1M: 15, outputPer1M: 75, displayName: "Claude Opus 4.7" },
  "anthropic/claude-sonnet-4-6": { inputPer1M: 3, outputPer1M: 15, displayName: "Claude Sonnet 4.6" },
  "anthropic/claude-haiku-4-5": { inputPer1M: 1, outputPer1M: 5, displayName: "Claude Haiku 4.5" },
  "openai/gpt-4o": { inputPer1M: 2.5, outputPer1M: 10, displayName: "GPT-4o" },
  "openai/gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6, displayName: "GPT-4o mini" },
  "google/gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10, displayName: "Gemini 2.5 Pro" },
  "google/gemini-2.5-flash": { inputPer1M: 0.3, outputPer1M: 2.5, displayName: "Gemini 2.5 Flash" },
  "google/gemini-2.5-flash-lite": { inputPer1M: 0.1, outputPer1M: 0.4, displayName: "Gemini 2.5 Flash Lite" },
};

export const DEFAULT_USD_THB_RATE = 36;

function getRate(): number {
  if (typeof window !== "undefined") {
    try {
      const v = localStorage.getItem("usdThbRate");
      if (v) {
        const n = parseFloat(v);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_USD_THB_RATE;
}

export function getModelPricing(model?: string | null): ModelPricing | null {
  if (!model) return null;
  return MODEL_PRICING[model] ?? null;
}

/**
 * Calculate USD cost given input/output tokens and a model id.
 * Returns null if model pricing is unknown.
 */
export function calcCostUSD(inputTokens: number, outputTokens: number, model?: string | null): number | null {
  const p = getModelPricing(model);
  if (!p) return null;
  return (inputTokens / 1_000_000) * p.inputPer1M + (outputTokens / 1_000_000) * p.outputPer1M;
}

/**
 * Convert token counts directly to THB. Returns null if pricing unknown.
 */
export function tokensToTHB(inputTokens: number, outputTokens: number, model?: string | null, rate?: number): number | null {
  const usd = calcCostUSD(inputTokens, outputTokens, model);
  if (usd === null) return null;
  return usd * (rate ?? getRate());
}

/**
 * Convert a USD amount to THB using the configured (or default) rate.
 */
export function usdToTHB(usd: number, rate?: number): number {
  return usd * (rate ?? getRate());
}

/**
 * Format a THB amount with thai conventions (฿ symbol, 2 decimals for small amounts, commas for thousands).
 */
export function formatTHB(amount: number, opts: { decimals?: number; compact?: boolean } = {}): string {
  const { compact = false } = opts;
  if (compact && amount >= 10_000) {
    return `฿${(amount / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })}K`;
  }
  const decimals = opts.decimals ?? (amount < 10 ? 2 : amount < 1000 ? 2 : 0);
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * Human readable "X tokens ≈ ฿Y" label, with fallback when pricing unknown.
 */
export function tokensTHBLabel(inputTokens: number, outputTokens: number, model?: string | null): string {
  const thb = tokensToTHB(inputTokens, outputTokens, model);
  if (thb === null) return `${(inputTokens + outputTokens).toLocaleString()} tokens`;
  return formatTHB(thb);
}
