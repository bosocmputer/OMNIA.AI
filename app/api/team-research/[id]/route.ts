import { NextRequest, NextResponse } from "next/server";
import { getResearchSession, completeResearchSession } from "@/lib/agents-store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id")!;
    const role = req.headers.get("x-user-role");
    const ownerFilter = role === "admin" ? undefined : userId;
    const session = await getResearchSession(id, ownerFilter);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id")!;
    const role = req.headers.get("x-user-role");
    const body = await req.json();
    if (body.action !== "force-complete") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const ownerFilter = role === "admin" ? undefined : userId;
    const session = await getResearchSession(id, ownerFilter);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status !== "running") {
      return NextResponse.json({ error: "Session is not running" }, { status: 409 });
    }
    const reason = typeof body.reason === "string" ? body.reason : "🔒 ปิดประชุมโดยผู้ใช้";
    await completeResearchSession(id, reason, "completed");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
