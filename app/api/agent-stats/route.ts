import { NextRequest, NextResponse } from "next/server";
import { getAgentStats, listAgents } from "@/lib/agents-store";

export async function GET(req: NextRequest) {
  const stats = await getAgentStats();
  const role = req.headers.get("x-user-role");
  if (role === "admin") return NextResponse.json(stats);

  const agents = await listAgents(req.headers.get("x-user-id") ?? undefined);
  const visibleAgentIds = new Set(agents.map((a) => a.id));
  const visibleStats = Object.fromEntries(
    Object.entries(stats).filter(([agentId]) => visibleAgentIds.has(agentId))
  );
  return NextResponse.json(visibleStats);
}
