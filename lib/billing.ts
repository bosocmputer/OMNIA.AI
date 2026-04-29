import crypto from "crypto";
import { db } from "./db";

export const CREDIT_PACKAGES = [
  { id: "starter", label: "Starter", amountTHB: 99, credits: 120, desc: "เหมาะกับลองถามหลายเรื่อง" },
  { id: "focus", label: "Focus", amountTHB: 199, credits: 280, desc: "คุ้มสุดสำหรับใช้จริงรายสัปดาห์" },
  { id: "pro", label: "Pro", amountTHB: 499, credits: 800, desc: "เหมาะกับคนดูให้ลูกค้าหรือถามบ่อย" },
] as const;

export const READING_PRICES = {
  quick: { credits: 29, label: "ถามเร็ว", desc: "หมอดู 1-2 ท่าน" },
  council: { credits: 59, label: "สภา OMNIA", desc: "หมอดู 3-5 ท่าน พร้อมสรุปรวม" },
  followup: { credits: 19, label: "ถามต่อ", desc: "ต่อจากคำทำนายเดิม" },
} as const;

export const WELCOME_CREDITS = Number(process.env.WELCOME_CREDITS || 29);

export type CreditTopupStatus = "pending" | "approved" | "rejected";

let ensured = false;

export async function ensureBillingTables() {
  if (ensured) return;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type VARCHAR(40) NOT NULL,
      amount INTEGER NOT NULL,
      reference TEXT,
      metadata JSONB,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS credit_transactions_user_idx
    ON credit_transactions (user_id, created_at DESC)
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS credit_topups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT,
      package_id VARCHAR(40) NOT NULL,
      amount_thb INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      transfer_note TEXT,
      reviewed_by TEXT,
      reviewed_at TIMESTAMP(3),
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS credit_topups_status_idx
    ON credit_topups (status, created_at DESC)
  `);
  ensured = true;
}

export function getReadingPrice(agentCount: number, existingSessionId?: string | null) {
  if (existingSessionId) return READING_PRICES.followup;
  return agentCount <= 2 ? READING_PRICES.quick : READING_PRICES.council;
}

export async function getCreditBalance(userId: string): Promise<number> {
  await ensureBillingTables();
  const rows = await db.$queryRawUnsafe<{ balance: unknown }[]>(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_transactions WHERE user_id = $1`,
    userId,
  );
  return Number(rows[0]?.balance ?? 0);
}

export async function grantWelcomeCredits(userId: string) {
  await ensureBillingTables();
  if (!WELCOME_CREDITS || WELCOME_CREDITS <= 0) return { granted: false, credits: 0 };

  const reference = `welcome:${userId}`;
  const existing = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM credit_transactions WHERE user_id = $1 AND reference = $2 LIMIT 1`,
    userId,
    reference,
  );
  if (existing.length > 0) return { granted: false, credits: WELCOME_CREDITS };

  await db.$executeRawUnsafe(
    `INSERT INTO credit_transactions (id, user_id, type, amount, reference, metadata)
     VALUES ($1, $2, 'welcome', $3, $4, $5::jsonb)`,
    crypto.randomUUID(),
    userId,
    WELCOME_CREDITS,
    reference,
    JSON.stringify({ source: "new_user_trial", label: "เครดิตฟรีสำหรับทดลองถาม" }),
  );
  return { granted: true, credits: WELCOME_CREDITS };
}

export async function createTopup(userId: string, username: string | null, packageId: string, transferNote = "") {
  await ensureBillingTables();
  const pack = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pack) throw new Error("Invalid package");
  const id = crypto.randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO credit_topups (id, user_id, username, package_id, amount_thb, credits, transfer_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    id,
    userId,
    username,
    pack.id,
    pack.amountTHB,
    pack.credits,
    transferNote || null,
  );
  return { id, packageId: pack.id, label: pack.label, amountTHB: pack.amountTHB, credits: pack.credits, desc: pack.desc, status: "pending" as CreditTopupStatus };
}

export async function listTopups(status?: CreditTopupStatus | "all") {
  await ensureBillingTables();
  const where = status && status !== "all" ? "WHERE status = $1" : "";
  const params = status && status !== "all" ? [status] : [];
  return db.$queryRawUnsafe<
    {
      id: string;
      user_id: string;
      username: string | null;
      package_id: string;
      amount_thb: number;
      credits: number;
      status: CreditTopupStatus;
      transfer_note: string | null;
      reviewed_by: string | null;
      reviewed_at: Date | null;
      created_at: Date;
    }[]
  >(
    `SELECT * FROM credit_topups ${where} ORDER BY created_at DESC LIMIT 200`,
    ...params,
  );
}

export async function listUserTopups(userId: string) {
  await ensureBillingTables();
  return db.$queryRawUnsafe<
    {
      id: string;
      package_id: string;
      amount_thb: number;
      credits: number;
      status: CreditTopupStatus;
      transfer_note: string | null;
      reviewed_at: Date | null;
      created_at: Date;
    }[]
  >(
    `SELECT id, package_id, amount_thb, credits, status, transfer_note, reviewed_at, created_at
     FROM credit_topups
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    userId,
  );
}

export async function listUserCreditTransactions(userId: string) {
  await ensureBillingTables();
  return db.$queryRawUnsafe<
    {
      id: string;
      type: string;
      amount: number;
      reference: string | null;
      metadata: Record<string, unknown> | null;
      created_at: Date;
    }[]
  >(
    `SELECT id, type, amount, reference, metadata, created_at
     FROM credit_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    userId,
  );
}

export async function reviewTopup(id: string, status: "approved" | "rejected", reviewer: string) {
  await ensureBillingTables();
  const rows = await db.$queryRawUnsafe<{ id: string; user_id: string; credits: number; status: string }[]>(
    `SELECT id, user_id, credits, status FROM credit_topups WHERE id = $1 LIMIT 1`,
    id,
  );
  const topup = rows[0];
  if (!topup) throw new Error("Top-up not found");
  if (topup.status !== "pending") throw new Error("Top-up already reviewed");

  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE credit_topups SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3`,
      status,
      reviewer,
      id,
    );
    if (status === "approved") {
      await tx.$executeRawUnsafe(
        `INSERT INTO credit_transactions (id, user_id, type, amount, reference, metadata)
         VALUES ($1, $2, 'topup', $3, $4, $5::jsonb)`,
        crypto.randomUUID(),
        topup.user_id,
        topup.credits,
        id,
        JSON.stringify({ source: "manual_promptpay" }),
      );
    }
  });
}

export async function chargeCredits(userId: string, amount: number, reference: string, metadata: Record<string, unknown>) {
  await ensureBillingTables();
  const balance = await getCreditBalance(userId);
  if (balance < amount) return { ok: false, balance };
  await db.$executeRawUnsafe(
    `INSERT INTO credit_transactions (id, user_id, type, amount, reference, metadata)
     VALUES ($1, $2, 'reading', $3, $4, $5::jsonb)`,
    crypto.randomUUID(),
    userId,
    -Math.abs(amount),
    reference,
    JSON.stringify(metadata),
  );
  return { ok: true, balance: balance - amount };
}
