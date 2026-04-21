import { NextResponse } from "next/server";
import { getAgentStats } from "@/lib/agents-store";

export async function GET() {
  const stats = await getAgentStats();
  return NextResponse.json(stats);
}
