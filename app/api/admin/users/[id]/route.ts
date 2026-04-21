import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { password, role } = body ?? {};

  const updates: Record<string, string> = {};
  if (password) {
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }
    updates.passwordHash = await bcrypt.hash(password, 12);
  }
  if (role) {
    updates.role = role === "admin" ? "admin" : "user";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id },
    data: updates,
    select: { id: true, username: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const requesterId = req.headers.get("x-user-id");
  if (id === requesterId) {
    return NextResponse.json({ error: "ไม่สามารถลบตัวเองได้" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
