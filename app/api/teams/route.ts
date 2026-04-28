import { NextRequest, NextResponse } from "next/server";
import { listTeams, createTeam } from "@/lib/agents-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit-redis";

export async function GET(req: NextRequest) {
  try {
    const teams = await listTeams(req.headers.get("x-user-id") ?? undefined);
    return NextResponse.json({ teams });
  } catch (e) {
    console.error("GET /api/teams error", e);
    return NextResponse.json({ error: "Failed to load teams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await rateLimit(getClientIp(req.headers), { maxRequests: 20, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const body = await req.json();
    const { name, emoji, description, agentIds } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const team = await createTeam({
      name: String(name).trim(),
      emoji: typeof emoji === "string" ? emoji.trim() || "👥" : "👥",
      description: typeof description === "string" ? description.trim() : "",
      agentIds: Array.isArray(agentIds) ? agentIds.filter((id) => typeof id === "string") : [],
      userId: req.headers.get("x-user-id") ?? undefined,
    });
    return NextResponse.json({ team }, { status: 201 });
  } catch (e) {
    console.error("POST /api/teams error", e);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
