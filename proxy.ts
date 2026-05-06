import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// Public routes — no auth required
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/privacy", "/terms", "/contact", "/research"]);
const PUBLIC_PREFIX = ["/api/auth/", "/api/health", "/_next/", "/assets/", "/favicon"];
const GUEST_API_ROUTES = new Set(["/api/team-agents", "/api/team-research/stream"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nextWithPath = () => {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  // Allow public routes
  if (PUBLIC_ROUTES.has(pathname)) return nextWithPath();
  if (PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) return nextWithPath();
  if (GUEST_API_ROUTES.has(pathname)) return nextWithPath();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "ไม่ได้รับอนุญาต — กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Attach user info to request headers for API routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-username", payload.username);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|public/).*)" ],
};
