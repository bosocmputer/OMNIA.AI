import { NextRequest, NextResponse } from "next/server";
import {
  CREDIT_PACKAGES,
  WELCOME_CREDITS,
  createTopup,
  getCreditBalance,
  getReadingPrice,
  listUserCreditTransactions,
  listUserTopups,
} from "@/lib/billing";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") || "user";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const balance = await getCreditBalance(userId);
  const url = new URL(req.url);
  const agentCount = Number(url.searchParams.get("agentCount") ?? "5");
  const sessionId = url.searchParams.get("sessionId");
  const readingPrice = getReadingPrice(Number.isFinite(agentCount) ? agentCount : 5, sessionId);
  const [transactions, topups] = await Promise.all([
    listUserCreditTransactions(userId),
    listUserTopups(userId),
  ]);
  return NextResponse.json({
    balance,
    isAdmin: role === "admin",
    packages: CREDIT_PACKAGES,
    readingPrice,
    transactions,
    topups,
    welcomeCredits: WELCOME_CREDITS,
    promptPay: {
      name: process.env.PROMPTPAY_NAME || "OMNIA.AI",
      id: process.env.PROMPTPAY_ID || "",
    },
  });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const username = req.headers.get("x-username");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const topup = await createTopup(userId, username, String(body.packageId || ""), String(body.transferNote || ""));
    return NextResponse.json({ topup });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cannot create top-up" }, { status: 400 });
  }
}
