import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TOPIC_RULES: { key: string; label: string; keywords: string[] }[] = [
  { key: "career", label: "การงาน/อาชีพ", keywords: ["งาน", "อาชีพ", "ตกงาน", "เลย์ออฟ", "บริษัท", "โปรเจกต์", "สอบ", "กพ", "ราชการ"] },
  { key: "money", label: "การเงิน/ทรัพย์สิน", keywords: ["เงิน", "หนี้", "บ้าน", "รถ", "รายได้", "ลงทุน", "รวย", "ค่าใช้จ่าย"] },
  { key: "love", label: "ความรัก/ครอบครัว", keywords: ["รัก", "แฟน", "คู่", "แต่งงาน", "ครอบครัว", "กลับมา", "เขา"] },
  { key: "health", label: "สุขภาพ", keywords: ["สุขภาพ", "ป่วย", "โรค", "เครียด", "นอน"] },
  { key: "luck", label: "โชคลาภ", keywords: ["โชค", "ลาภ", "หวย", "เสี่ยง", "รางวัล"] },
  { key: "overview", label: "ภาพรวมชีวิต", keywords: ["ภาพรวม", "12 เดือน", "ทั้งปี", "ปีนี้", "เดือนหน้า", "ดวง"] },
];

type FeedbackRow = { value: string; created_at: Date };

async function ensureFeedbackTable() {
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already exists") && !message.includes("23505")) throw error;
  }
}

function classifyTopic(question: string) {
  const normalized = question.toLowerCase();
  const match = TOPIC_RULES.find((topic) => topic.keywords.some((keyword) => normalized.includes(keyword)));
  return match ?? { key: "other", label: "อื่น ๆ", keywords: [] };
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    if (req.headers.get("x-user-role") !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await ensureFeedbackTable();

    const [sessions, agents, feedbackRows] = await Promise.all([
      db.researchSession.findMany({
        orderBy: { startedAt: "desc" },
        take: 300,
        select: {
          id: true,
          question: true,
          agentIds: true,
          status: true,
          startedAt: true,
          totalTokens: true,
          user: { select: { username: true } },
          messages: { select: { role: true } },
        },
      }),
      db.agent.findMany({ select: { id: true, name: true, emoji: true, role: true } }),
      db.$queryRaw<FeedbackRow[]>`
        SELECT value, created_at
        FROM reading_feedback
        ORDER BY created_at DESC
        LIMIT 500
      `,
    ]);

    const agentMap = new Map(agents.map((agent) => [agent.id, agent]));
    const agentCounts = new Map<string, { agentId: string; name: string; emoji: string; role: string; count: number }>();
    const topicCounts = new Map<string, { key: string; label: string; count: number; examples: string[] }>();
    const dailyCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();

    for (const session of sessions) {
      statusCounts.set(session.status, (statusCounts.get(session.status) ?? 0) + 1);
      dailyCounts.set(dateKey(session.startedAt), (dailyCounts.get(dateKey(session.startedAt)) ?? 0) + 1);

      const topic = classifyTopic(session.question);
      const topicItem = topicCounts.get(topic.key) ?? { key: topic.key, label: topic.label, count: 0, examples: [] };
      topicItem.count += 1;
      if (topicItem.examples.length < 3) topicItem.examples.push(session.question);
      topicCounts.set(topic.key, topicItem);

      for (const agentId of session.agentIds ?? []) {
        const agent = agentMap.get(agentId);
        const item = agentCounts.get(agentId) ?? {
          agentId,
          name: agent?.name ?? "Unknown",
          emoji: agent?.emoji ?? "•",
          role: agent?.role ?? "",
          count: 0,
        };
        item.count += 1;
        agentCounts.set(agentId, item);
      }
    }

    const feedbackCounts = feedbackRows.reduce<Record<string, number>>((acc, row) => {
      row.value.split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => {
        acc[value] = (acc[value] ?? 0) + 1;
      });
      return acc;
    }, {});

    const completed = sessions.filter((session) => session.status === "completed").length;
    const totalTokens = sessions.reduce((sum, session) => sum + session.totalTokens, 0);
    const multiQuestionSessions = sessions.filter((session) => session.messages.filter((msg) => msg.role === "user_question").length > 1).length;

    return NextResponse.json({
      totals: {
        sessions: sessions.length,
        completed,
        running: statusCounts.get("running") ?? 0,
        errored: statusCounts.get("error") ?? 0,
        totalTokens,
        averageTokens: sessions.length ? Math.round(totalTokens / sessions.length) : 0,
        multiQuestionSessions,
        feedback: feedbackRows.length,
      },
      agentPopularity: Array.from(agentCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10),
      topics: Array.from(topicCounts.values()).sort((a, b) => b.count - a.count),
      feedbackCounts,
      dailySessions: Array.from(dailyCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14),
      recentQuestions: sessions.slice(0, 12).map((session) => ({
        id: session.id,
        question: session.question,
        username: session.user?.username ?? "",
        startedAt: session.startedAt.toISOString(),
        status: session.status,
        agentCount: session.agentIds.length,
        topic: classifyTopic(session.question).label,
      })),
    });
  } catch (error) {
    console.error("admin analytics error:", error);
    return NextResponse.json({ error: "Cannot load analytics" }, { status: 500 });
  }
}
