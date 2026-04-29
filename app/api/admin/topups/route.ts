import { NextRequest, NextResponse } from "next/server";
import { listTopups, reviewTopup } from "@/lib/billing";

function assertAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest) {
  if (!assertAdmin(req)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") || "all";
  const topups = await listTopups(status as any);
  return NextResponse.json({ topups });
}

export async function PATCH(req: NextRequest) {
  if (!assertAdmin(req)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const username = req.headers.get("x-username") || "admin";
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const status = String(body.status || "");
  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid review request" }, { status: 400 });
  }
  try {
    await reviewTopup(id, status as "approved" | "rejected", username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cannot review top-up" }, { status: 400 });
  }
}

