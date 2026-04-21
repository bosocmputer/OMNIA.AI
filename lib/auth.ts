import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const key = process.env.JWT_SECRET ?? "dev-secret-change-me-in-production-32chars!!";
  return new TextEncoder().encode(key);
}

export interface JWTPayload {
  sub: string;
  username: string;
  role: string;
}

export const COOKIE_NAME = "bb_token";
export const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
