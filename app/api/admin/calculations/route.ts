import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildBirthFacts } from "@/lib/astro-birth-facts";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profileId = req.nextUrl.searchParams.get("profileId") ?? "";
  const profiles = await db.birthProfile.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
    include: {
      user: { select: { id: true, username: true, role: true } },
    },
  });

  const selected = profileId
    ? profiles.find((profile) => profile.id === profileId) ?? null
    : profiles[0] ?? null;

  const birthFacts = selected
    ? buildBirthFacts({
      name: selected.name,
      birthDate: selected.birthDate,
      birthTime: selected.birthTime ?? undefined,
      birthPlace: selected.birthPlace ?? undefined,
    })
    : null;

  return NextResponse.json({
    profiles: profiles.map((profile) => ({
      id: profile.id,
      label: profile.label,
      name: profile.name,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      timezone: profile.timezone,
      isDefault: profile.isDefault,
      updatedAt: profile.updatedAt.toISOString(),
      user: profile.user,
    })),
    selectedProfileId: selected?.id ?? null,
    birthFacts,
    calculations: birthFacts?.calculations?.json ?? null,
    contextText: birthFacts?.summaryText ?? "",
  });
}

