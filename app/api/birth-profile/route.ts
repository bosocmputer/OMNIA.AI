import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.birthProfile.findUnique({ where: { userId } });
  return NextResponse.json({ profile: profile ?? null });
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

  const { name, birthDate, birthTime, birthPlace, timezone } = body as {
    name?: string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    timezone?: string;
  };

  if (!name || !birthDate) {
    return NextResponse.json({ error: "name and birthDate are required" }, { status: 400 });
  }

  const profile = await db.birthProfile.upsert({
    where: { userId },
    create: {
      userId,
      name: String(name).slice(0, 100),
      birthDate: String(birthDate).slice(0, 20),
      birthTime: birthTime ? String(birthTime).slice(0, 10) : null,
      birthPlace: birthPlace ? String(birthPlace).slice(0, 200) : null,
      timezone: timezone ? String(timezone).slice(0, 50) : null,
    },
    update: {
      name: String(name).slice(0, 100),
      birthDate: String(birthDate).slice(0, 20),
      birthTime: birthTime ? String(birthTime).slice(0, 10) : null,
      birthPlace: birthPlace ? String(birthPlace).slice(0, 200) : null,
      timezone: timezone ? String(timezone).slice(0, 50) : null,
    },
  });

  return NextResponse.json({ profile });
}
