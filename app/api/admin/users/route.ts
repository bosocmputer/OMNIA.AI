import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await db.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const { username, password, role = "user" } = body ?? {};
  if (!username || typeof username !== "string" || username.length < 3 || username.length > 50) {
    return NextResponse.json({ error: "ชื่อผู้ใช้ต้องมี 3-50 ตัวอักษร" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" }, { status: 409 });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { username, passwordHash, role: role === "admin" ? "admin" : "user" },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user }, { status: 201 });
}
