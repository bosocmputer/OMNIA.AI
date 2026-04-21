import { NextRequest, NextResponse } from "next/server";
import { listResearch } from "@/lib/agents-store";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")!;
    const role = req.headers.get("x-user-role") ?? undefined;
    const sessions = await listResearch(userId, role);
    return NextResponse.json({ sessions });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
