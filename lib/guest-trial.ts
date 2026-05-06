import crypto from "crypto";
import { db } from "./db";
import { getClientIp, rateLimit } from "./rate-limit-redis";

export const GUEST_TRIAL_LIMIT = 2;
export const GUEST_TRIAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const GUEST_IP_LIMIT_PER_DAY = 10;
export const GUEST_TRIAL_USERNAME = "guest-trial";

export function isValidGuestId(value: string | null | undefined): value is string {
  return !!value && /^[a-zA-Z0-9_-]{16,100}$/.test(value);
}

export async function ensureGuestTrialUser(): Promise<string> {
  const user = await db.user.upsert({
    where: { username: GUEST_TRIAL_USERNAME },
    create: {
      username: GUEST_TRIAL_USERNAME,
      passwordHash: crypto.randomBytes(24).toString("hex"),
      role: "guest",
    },
    update: {},
    select: { id: true },
  });
  return user.id;
}

export async function getSuperadminUserId(): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { username: "superadmin" },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function checkGuestTrialQuota(headers: Headers, guestId: string) {
  const ip = getClientIp(headers);
  const [guestOk, ipOk] = await Promise.all([
    rateLimit(`guest-trial:${guestId}`, {
      maxRequests: GUEST_TRIAL_LIMIT,
      windowMs: GUEST_TRIAL_WINDOW_MS,
    }),
    rateLimit(`guest-trial-ip:${ip}`, {
      maxRequests: GUEST_IP_LIMIT_PER_DAY,
      windowMs: 24 * 60 * 60 * 1000,
    }),
  ]);

  if (!guestOk) {
    return {
      ok: false as const,
      code: "GUEST_TRIAL_LIMIT",
      message: "ทดลองถามฟรีครบแล้ว สมัครฟรีเพื่อถามต่อและเก็บประวัติคำทำนาย",
    };
  }
  if (!ipOk) {
    return {
      ok: false as const,
      code: "GUEST_IP_LIMIT",
      message: "มีการทดลองจากเครือข่ายนี้ครบโควตาแล้ว กรุณาสมัครเพื่อใช้งานต่อ",
    };
  }
  return { ok: true as const };
}
