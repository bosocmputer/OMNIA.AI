import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

type FeedbackRow = {
  id: string;
  user_id: string | null;
  username: string | null;
  session_id: string | null;
  question: string | null;
  scope: string;
  value: string;
  profile_id: string | null;
  agent_ids: string | null;
  answer_excerpt: string | null;
  note: string | null;
  created_at: Date;
};

let ensureFeedbackTablePromise: Promise<void> | null = null;

async function ensureFeedbackTable() {
  if (!ensureFeedbackTablePromise) {
    ensureFeedbackTablePromise = (async () => {
      try {
        await db.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS reading_feedback (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            username TEXT,
            session_id TEXT,
            question TEXT,
            scope TEXT NOT NULL,
            value TEXT NOT NULL,
            profile_id TEXT,
            agent_ids TEXT,
            answer_excerpt TEXT,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("already exists") && !message.includes("23505")) throw error;
      }
      await db.$executeRawUnsafe(`ALTER TABLE reading_feedback ADD COLUMN IF NOT EXISTS note TEXT`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS reading_feedback_user_idx ON reading_feedback (user_id)`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS reading_feedback_session_idx ON reading_feedback (session_id)`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS reading_feedback_created_idx ON reading_feedback (created_at DESC)`);
    })().catch((error) => {
      ensureFeedbackTablePromise = null;
      throw error;
    });
  }
  await ensureFeedbackTablePromise;
}

function cleanText(value: unknown, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawValues = Array.isArray(body?.values)
      ? body.values
      : typeof body?.value === "string"
        ? body.value.split(",")
        : [];
    const allowed = new Set(["accurate", "inaccurate", "too_broad", "too_long"]);
    const values = Array.from(new Set(rawValues.filter((item: unknown) => typeof item === "string").map((item: string) => item.trim()).filter((item: string) => allowed.has(item)))).slice(0, 4);
    const value = values.join(",");
    const scope = cleanText(body?.scope, 240);
    const note = cleanText(body?.note, 1200);
    if (!value || !scope) {
      return NextResponse.json({ error: "Missing feedback value or scope" }, { status: 400 });
    }

    if (values.length === 0) {
      return NextResponse.json({ error: "Invalid feedback value" }, { status: 400 });
    }

    if (values.includes("inaccurate") && !note) {
      return NextResponse.json({ error: "Please explain what was inaccurate" }, { status: 400 });
    }

    await ensureFeedbackTable();

    const id = crypto.randomUUID();
    const userId = req.headers.get("x-user-id");
    const username = req.headers.get("x-username");
    const agentIds = Array.isArray(body?.agentIds)
      ? body.agentIds.filter((id: unknown) => typeof id === "string").slice(0, 12)
      : [];

    await db.$executeRaw`
      INSERT INTO reading_feedback (
        id, user_id, username, session_id, question, scope, value, profile_id, agent_ids, answer_excerpt, note
      ) VALUES (
        ${id},
        ${userId},
        ${username},
        ${cleanText(body?.sessionId, 120)},
        ${cleanText(body?.question, 1000)},
        ${scope},
        ${value},
        ${cleanText(body?.profileId, 120)},
        ${agentIds.length ? JSON.stringify(agentIds) : null},
        ${cleanText(body?.answerExcerpt, 1200)},
        ${note}
      )
    `;

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("reading-feedback POST error:", error);
    return NextResponse.json({ error: "Cannot save feedback" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (req.headers.get("x-user-role") !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await ensureFeedbackTable();
    const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 100;
    const rows = await db.$queryRaw<FeedbackRow[]>`
      SELECT id, user_id, username, session_id, question, scope, value, profile_id, agent_ids, answer_excerpt, note, created_at
      FROM reading_feedback
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    const feedback = rows.map((row) => {
      let agentIds: string[] = [];
      try {
        agentIds = row.agent_ids ? JSON.parse(row.agent_ids) : [];
      } catch { /* ignore malformed legacy data */ }
      return {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        sessionId: row.session_id,
        question: row.question,
        scope: row.scope,
        value: row.value,
        profileId: row.profile_id,
        agentIds,
        answerExcerpt: row.answer_excerpt,
        note: row.note,
        createdAt: new Date(row.created_at).toISOString(),
      };
    });
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("reading-feedback GET error:", error);
    return NextResponse.json({ error: "Cannot load feedback" }, { status: 500 });
  }
}
