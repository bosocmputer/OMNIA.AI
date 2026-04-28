import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

async function getProfiles(userId: string) {
  return db.birthProfile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await getProfiles(userId);
  return NextResponse.json({ profiles, profile: profiles[0] ?? null });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = cleanString(body.name, 100);
  const birthDate = cleanString(body.birthDate, 20);
  if (!name || !birthDate) {
    return NextResponse.json({ error: "name and birthDate are required" }, { status: 400 });
  }

  const existingCount = await db.birthProfile.count({ where: { userId } });
  const shouldDefault = body.isDefault === true || existingCount === 0;
  if (shouldDefault) await db.birthProfile.updateMany({ where: { userId }, data: { isDefault: false } });

  const profile = await db.birthProfile.create({
    data: {
      userId,
      label: cleanString(body.label, 50),
      name,
      birthDate,
      birthTime: cleanString(body.birthTime, 10),
      birthPlace: cleanString(body.birthPlace, 200),
      timezone: cleanString(body.timezone, 50) ?? "Asia/Bangkok",
      isDefault: shouldDefault,
    },
  });

  return NextResponse.json({ profile, profiles: await getProfiles(userId) });
}

export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = cleanString(body.name, 100);
  const birthDate = cleanString(body.birthDate, 20);
  if (!name || !birthDate) {
    return NextResponse.json({ error: "name and birthDate are required" }, { status: 400 });
  }

  const id = cleanString(body.id, 100);
  const [existingDefault, profileCount] = await Promise.all([
    db.birthProfile.findFirst({ where: { userId, isDefault: true } }),
    db.birthProfile.count({ where: { userId } }),
  ]);
  const shouldDefault = body.isDefault === true || !existingDefault || profileCount <= 1;
  if (shouldDefault) await db.birthProfile.updateMany({ where: { userId }, data: { isDefault: false } });

  const data = {
    label: cleanString(body.label, 50),
    name,
    birthDate,
    birthTime: cleanString(body.birthTime, 10),
    birthPlace: cleanString(body.birthPlace, 200),
    timezone: cleanString(body.timezone, 50) ?? "Asia/Bangkok",
    isDefault: shouldDefault,
  };

  let profile;
  if (id) {
    const existing = await db.birthProfile.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    profile = await db.birthProfile.update({ where: { id }, data });
  } else {
    profile = await db.birthProfile.create({ data: { ...data, userId } });
  }

  return NextResponse.json({ profile, profiles: await getProfiles(userId) });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const profile = await db.birthProfile.findFirst({ where: { id, userId } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await db.birthProfile.delete({ where: { id } });
  if (profile.isDefault) {
    const next = await db.birthProfile.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
    if (next) await db.birthProfile.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  return NextResponse.json({ ok: true, profiles: await getProfiles(userId) });
}
