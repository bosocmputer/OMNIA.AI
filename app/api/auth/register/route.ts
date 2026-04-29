import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";
import { seedAstrologyAgentsForUser } from "@/lib/seed-astro-for-user";
import { grantWelcomeCredits, isCreditBillingEnabled } from "@/lib/billing";

// Rate limit: max 5 registrations per IP per hour (simple in-memory for now)
const regAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRegRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = regAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    regAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRegRateLimit(ip)) {
    return NextResponse.json({ error: "ลองใหม่ในภายหลัง (rate limit)" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password || !body?.consentPdpa) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบและยอมรับนโยบาย PDPA" }, { status: 400 });
  }

  const { username, email, password, consentPdpa } = body;

  // Validate username
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json({ error: "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ ยาว 3-30 ตัว" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
  }

  // Check duplicate
  const existing = await db.user.findFirst({
    where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
    select: { id: true, username: true, email: true },
  });
  if (existing?.username === username) {
    return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว" }, { status: 409 });
  }
  if (email && existing?.email === email) {
    return NextResponse.json({ error: "อีเมลนี้ลงทะเบียนแล้ว" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: {
      username,
      email: email || null,
      passwordHash,
      role: "user",
      plan: "FREE",
      consentPdpa: Boolean(consentPdpa),
      consentAt: new Date(),
    },
  });

  // Auto-seed 5 astrology agents for this user
  await seedAstrologyAgentsForUser(user.id).catch((e) =>
    console.error("[register] seed error:", e)
  );
  if (isCreditBillingEnabled()) {
    await grantWelcomeCredits(user.id).catch((e) =>
      console.error("[register] welcome credit error:", e)
    );
  }

  const token = await signToken({ sub: user.id, username: user.username, role: user.role });
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
  const cookieStr = `${COOKIE_NAME}=${token}; Path=/; Expires=${expires}; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`;
  const res = NextResponse.json({ ok: true, username: user.username });
  res.headers.set("Set-Cookie", cookieStr);
  return res;
}
