import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { username: body.username } });
  const dummyHash = "$2a$12$invalidhashfortimingnormalization000000000000000000000000";
  const valid = user
    ? await bcrypt.compare(body.password, user.passwordHash)
    : await bcrypt.compare(body.password, dummyHash).then(() => false);

  if (!user || !valid) {
    return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const token = await signToken({ sub: user.id, username: user.username, role: user.role });
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
  const cookieStr = `${COOKIE_NAME}=${token}; Path=/; Expires=${expires}; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`;
  const res = NextResponse.json({ ok: true, username: user.username });
  res.headers.set("Set-Cookie", cookieStr);
  return res;
}
