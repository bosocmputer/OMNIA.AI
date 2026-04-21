import { NextResponse } from "next/server";
import { syncSystemKnowledge } from "@/lib/agents-store";

export async function POST() {
  try {
    const result = await syncSystemKnowledge();
    return NextResponse.json({
      ok: true,
      synced: result.synced,
      version: result.version,
      message: `ซิงค์สำเร็จ ${result.synced} ไฟล์ (v${result.version})`,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
