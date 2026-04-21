import { NextRequest, NextResponse } from "next/server";
import { getMemoryFacts, upsertMemoryFact, deleteMemoryFact } from "@/lib/agents-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit-redis";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id")!;
  return NextResponse.json({ facts: await getMemoryFacts(userId) });
}

export async function POST(req: NextRequest) {
  if (!await rateLimit(getClientIp(req.headers), { maxRequests: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const userId = req.headers.get("x-user-id")!;
  const body = await req.json();
  const { key, value, source } = body;
  if (!key || typeof key !== "string" || key.length > 100) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  if (!value || typeof value !== "string" || value.length > 500) {
    return NextResponse.json({ error: "Invalid value (max 500 chars)" }, { status: 400 });
  }
  const fact = await upsertMemoryFact(userId, key, value, source || "manual");
  return NextResponse.json({ fact }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id")!;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteMemoryFact(userId, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
