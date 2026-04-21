import { NextRequest, NextResponse } from "next/server";
import { updateAgent, deleteAgent } from "@/lib/agents-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit-redis";

const VALID_PROVIDERS = new Set(["anthropic", "openai", "gemini", "ollama", "openrouter", "custom"]);

function isUnsafeUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (!["http:", "https:"].includes(u.protocol)) return true;
    const host = u.hostname;
    if (host === "localhost" || host === "0.0.0.0") return true;
    const parts = host.split(".").map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      if (parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    }
    return false;
  } catch { return true; }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rateLimit(getClientIp(req.headers), { maxRequests: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    // Validate fields if provided
    if (body.provider && !VALID_PROVIDERS.has(body.provider)) return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    if (body.name && (typeof body.name !== "string" || body.name.length > 100)) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    if (body.soul && (typeof body.soul !== "string" || body.soul.length > 10000)) return NextResponse.json({ error: "Soul too long" }, { status: 400 });
    if (body.baseUrl && typeof body.baseUrl === "string" && body.provider !== "ollama" && isUnsafeUrl(body.baseUrl)) {
      return NextResponse.json({ error: "baseUrl not allowed" }, { status: 400 });
    }
    if (body.mcpEndpoint && typeof body.mcpEndpoint === "string" && isUnsafeUrl(body.mcpEndpoint)) {
      return NextResponse.json({ error: "mcpEndpoint not allowed" }, { status: 400 });
    }

    const updated = await updateAgent(id, body);
    if (!updated) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json({ agent: updated });
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await rateLimit(getClientIp(_req.headers), { maxRequests: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const { id } = await params;
    const ok = await deleteAgent(id);
    if (ok === "system") return NextResponse.json({ error: "ไม่สามารถลบ Agent ระบบได้" }, { status: 403 });
    if (!ok) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในระบบ" }, { status: 500 });
  }
}
