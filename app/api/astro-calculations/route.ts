import { NextRequest, NextResponse } from "next/server";
import { buildAstroCalculations } from "@/lib/astro-calculations";
import { buildBirthFacts } from "@/lib/astro-birth-facts";

function cleanString(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const birthDate = cleanString(body.birthDate, 20);
  if (!birthDate) {
    return NextResponse.json({ error: "birthDate is required in YYYY-MM-DD format" }, { status: 400 });
  }

  const birthTime = cleanString(body.birthTime, 10);
  const birthFacts = buildBirthFacts({
    name: cleanString(body.name, 120),
    birthDate,
    birthTime,
    birthPlace: cleanString(body.birthPlace, 200),
  });
  const calculations = buildAstroCalculations({ birthDate, birthTime });

  if (!birthFacts || !calculations) {
    return NextResponse.json({ error: "Invalid birthDate. Expected YYYY-MM-DD." }, { status: 400 });
  }

  return NextResponse.json({
    birthFacts,
    calculations: calculations.json,
    summaryText: birthFacts.summaryText,
  });
}

