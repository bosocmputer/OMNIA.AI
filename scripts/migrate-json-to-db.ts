/**
 * One-time migration: reads all JSON files from ~/.bossboard/ and inserts them into Postgres.
 * Run with: DATABASE_URL=... npx ts-node --project tsconfig.json scripts/migrate-json-to-db.ts
 *
 * JSON files are NOT deleted — they remain as backup.
 * Safe to run multiple times (uses upsert/skip-on-conflict).
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();
const BOSSBOARD_DIR = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "", ".bossboard");

function readJson<T>(file: string, fallback: T): T {
  try {
    const fp = path.join(BOSSBOARD_DIR, file);
    if (!fs.existsSync(fp)) return fallback;
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    return fallback;
  }
}

async function migrateAgents() {
  const agents: any[] = readJson("agents.json", []);
  let count = 0;
  for (const a of agents) {
    await db.agent.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        name: a.name,
        emoji: a.emoji || "🤖",
        provider: a.provider || "openrouter",
        apiKeyEncrypted: a.apiKeyEncrypted || "",
        baseUrl: a.baseUrl || null,
        model: a.model || "",
        soul: a.soul || "",
        role: a.role || "",
        active: a.active ?? true,
        useWebSearch: a.useWebSearch ?? false,
        seniority: a.seniority ?? null,
        mcpEndpoint: a.mcpEndpoint || null,
        mcpAccessMode: a.mcpAccessMode || null,
        trustedUrls: Array.isArray(a.trustedUrls) ? a.trustedUrls : [],
        isSystem: a.isSystem ?? false,
        systemAgentType: a.systemAgentType || null,
        createdAt: new Date(a.createdAt || Date.now()),
        updatedAt: new Date(a.updatedAt || Date.now()),
      },
      update: {},
    });

    if (Array.isArray(a.knowledge)) {
      for (const k of a.knowledge) {
        if (!k.id) continue;
        await db.agentKnowledge.upsert({
          where: { id: k.id },
          create: {
            id: k.id,
            agentId: a.id,
            filename: k.filename || "unknown.txt",
            meta: k.meta || "",
            tokens: k.tokens || 0,
            uploadedAt: new Date(k.uploadedAt || Date.now()),
          },
          update: {},
        });
      }
    }
    count++;
  }
  console.log(`✅ agents: ${count} migrated`);
}

async function migrateTeams() {
  const teams: any[] = readJson("teams.json", []);
  let count = 0;
  for (const t of teams) {
    await db.team.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        name: t.name,
        emoji: t.emoji || "👥",
        description: t.description || "",
        createdAt: new Date(t.createdAt || Date.now()),
        updatedAt: new Date(t.updatedAt || Date.now()),
      },
      update: {},
    });

    if (Array.isArray(t.agentIds)) {
      for (let i = 0; i < t.agentIds.length; i++) {
        const agentId = t.agentIds[i];
        const agentExists = await db.agent.findUnique({ where: { id: agentId } });
        if (!agentExists) continue;
        await db.teamAgent.upsert({
          where: { teamId_agentId: { teamId: t.id, agentId } },
          create: { teamId: t.id, agentId, position: i },
          update: { position: i },
        });
      }
    }
    count++;
  }
  console.log(`✅ teams: ${count} migrated`);
}

async function migrateSettings() {
  const s: any = readJson("settings.json", {});
  if (!Object.keys(s).length) {
    console.log("⏭️  settings: empty, skipped");
    return;
  }
  await db.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      serperApiKey: s.serperApiKey || "",
      serpApiKey: s.serpApiKey || "",
      companyName: s.companyInfo?.name || null,
      businessType: s.companyInfo?.businessType || null,
      registrationNumber: s.companyInfo?.registrationNumber || null,
      accountingStandard: s.companyInfo?.accountingStandard || null,
      fiscalYear: s.companyInfo?.fiscalYear || null,
      employeeCount: s.companyInfo?.employeeCount || null,
      notes: s.companyInfo?.notes || null,
      updatedAt: new Date(s.updatedAt || Date.now()),
    },
    update: {},
  });
  console.log("✅ settings: migrated");
}

async function migrateResearch() {
  const superadmin = await db.user.findUnique({ where: { username: "superadmin" } });
  const fallbackUserId = superadmin?.id ?? "";
  const sessions: any[] = readJson("research-history.json", []);
  let sessionCount = 0;
  let msgCount = 0;
  for (const s of sessions) {
    await db.researchSession.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        user: { connect: { id: fallbackUserId } },
        question: s.question || "",
        agentIds: Array.isArray(s.agentIds) ? s.agentIds : [],
        dataSource: s.dataSource || null,
        status: s.status || "completed",
        startedAt: new Date(s.startedAt || Date.now()),
        completedAt: s.completedAt ? new Date(s.completedAt) : null,
        finalAnswer: s.finalAnswer || null,
        totalTokens: s.totalTokens || 0,
      },
      update: {},
    });

    if (Array.isArray(s.messages)) {
      for (const m of s.messages) {
        if (!m.id) continue;
        await db.researchMessage.upsert({
          where: { id: m.id },
          create: {
            id: m.id,
            sessionId: s.id,
            agentId: m.agentId || "",
            agentName: m.agentName || "",
            agentEmoji: m.agentEmoji || "🤖",
            role: m.role || "finding",
            content: m.content || "",
            tokensUsed: m.tokensUsed || 0,
            timestamp: new Date(m.timestamp || Date.now()),
          },
          update: {},
        });
        msgCount++;
      }
    }
    sessionCount++;
  }
  console.log(`✅ research: ${sessionCount} sessions, ${msgCount} messages migrated`);
}

async function migrateStats() {
  const stats: Record<string, any> = readJson("agent-stats.json", {});
  let count = 0;
  for (const [agentId, s] of Object.entries(stats)) {
    const agentExists = await db.agent.findUnique({ where: { id: agentId } });
    if (!agentExists) continue;

    await db.agentStat.upsert({
      where: { agentId },
      create: {
        agentId,
        totalSessions: s.totalSessions || 0,
        totalInputTokens: s.totalInputTokens || 0,
        totalOutputTokens: s.totalOutputTokens || 0,
        lastUsed: s.lastUsed || new Date().toISOString().slice(0, 10),
      },
      update: {},
    });

    if (Array.isArray(s.daily)) {
      const last90 = s.daily.slice(-90);
      for (const d of last90) {
        if (!d.date) continue;
        await db.agentDailyStat.upsert({
          where: { agentId_date: { agentId, date: d.date } },
          create: {
            agentId,
            date: d.date,
            sessions: d.sessions || 0,
            inputTokens: d.inputTokens || 0,
            outputTokens: d.outputTokens || 0,
          },
          update: {},
        });
      }
    }
    count++;
  }
  console.log(`✅ agent_stats: ${count} migrated`);
}

async function migrateMemory() {
  const superadmin = await db.user.findUnique({ where: { username: "superadmin" } });
  const fallbackUserId = superadmin?.id ?? "";
  const facts: any[] = readJson("client-memory.json", []);
  let count = 0;
  for (const f of facts) {
    if (!f.id || !f.key) continue;
    await db.clientMemory.upsert({
      where: { userId_key: { userId: fallbackUserId, key: f.key } },
      create: {
        id: f.id,
        user: { connect: { id: fallbackUserId } },
        key: f.key,
        value: f.value || "",
        source: f.source || "migration",
        createdAt: new Date(f.createdAt || Date.now()),
        updatedAt: new Date(f.updatedAt || Date.now()),
      },
      update: {},
    });
    count++;
  }
  console.log(`✅ client_memory: ${count} migrated`);
}

async function main() {
  console.log(`\n🚀 Migrating data from ${BOSSBOARD_DIR} → Postgres\n`);
  try {
    await migrateAgents();
    await migrateTeams();
    await migrateSettings();
    await migrateResearch();
    await migrateStats();
    await migrateMemory();
    console.log("\n✅ Migration complete. JSON files kept as backup.\n");
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
