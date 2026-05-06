import { NextRequest, NextResponse } from "next/server";
import { listAgents, createAgent, AgentProvider, migrateSouls } from "@/lib/agents-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit-redis";
import { getSuperadminUserId } from "@/lib/guest-trial";

const VALID_PROVIDERS = new Set(["anthropic", "openai", "gemini", "ollama", "openrouter", "custom"]);

// Block SSRF — reject private/internal IPs and non-http(s) schemes
function isUnsafeUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (!["http:", "https:"].includes(u.protocol)) return true;
    const host = u.hostname;
    if (host === "localhost" || host === "0.0.0.0") return true;
    // Allow typical private ranges only for ollama (local model)
    const parts = host.split(".").map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      if (parts[0] === 127) return true;
      if (parts[0] === 169 && parts[1] === 254) return true; // link-local
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    }
    return false;
  } catch { return true; }
}

export async function GET(req: NextRequest) {
  try {
    await (migrateSouls as () => Promise<void> | void)();
    const requesterId = req.headers.get("x-user-id") ?? undefined;
    const ownerId = requesterId ?? await getSuperadminUserId() ?? undefined;
    const agents = await (listAgents as (userId?: string) => Promise<unknown[]>)(ownerId);
    return NextResponse.json({ agents });
  } catch (e) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในระบบ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!req.headers.get("x-user-id")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!await rateLimit(getClientIp(req.headers), { maxRequests: 20, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { name, emoji, provider, apiKey, baseUrl, model, soul, role, useWebSearch, seniority, mcpEndpoint, mcpAccessMode, trustedUrls } = body;

    if (!name || !provider || !model || !soul || !role) {
      return NextResponse.json({ error: "Missing required fields: name, provider, model, soul, role" }, { status: 400 });
    }

    // Validate types
    if (typeof name !== "string" || name.length > 100) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    if (typeof model !== "string" || model.length > 200) return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    if (typeof soul !== "string" || soul.length > 10000) return NextResponse.json({ error: "Soul too long (max 10000)" }, { status: 400 });
    if (typeof role !== "string" || role.length > 200) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (!VALID_PROVIDERS.has(provider)) return NextResponse.json({ error: "Invalid provider" }, { status: 400 });

    // SSRF protection — block private IPs (allow for ollama which is local)
    if (baseUrl && typeof baseUrl === "string") {
      if (provider !== "ollama" && isUnsafeUrl(baseUrl)) {
        return NextResponse.json({ error: "baseUrl not allowed (private/internal address)" }, { status: 400 });
      }
    }
    if (mcpEndpoint && typeof mcpEndpoint === "string" && isUnsafeUrl(mcpEndpoint)) {
      return NextResponse.json({ error: "mcpEndpoint not allowed (private/internal address)" }, { status: 400 });
    }

    // Validate seniority range
    if (seniority !== undefined && (typeof seniority !== "number" || seniority < 1 || seniority > 100)) {
      return NextResponse.json({ error: "Seniority must be 1-100" }, { status: 400 });
    }

    // Validate trustedUrls
    if (trustedUrls && (!Array.isArray(trustedUrls) || trustedUrls.some((u: unknown) => typeof u !== "string"))) {
      return NextResponse.json({ error: "trustedUrls must be string array" }, { status: 400 });
    }

    const agent = await createAgent({
      name,
      emoji: emoji || "🤖",
      provider: provider as AgentProvider,
      apiKey: apiKey || "",
      baseUrl,
      model,
      soul,
      role,
      useWebSearch: useWebSearch ?? false,
      seniority,
      mcpEndpoint,
      mcpAccessMode,
      trustedUrls,
      userId: req.headers.get("x-user-id") ?? undefined,
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในระบบ" }, { status: 500 });
  }
}
