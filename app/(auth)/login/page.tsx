"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Eye, EyeOff, MessageSquare } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      const from = searchParams.get("from") || "/";
      window.location.href = from;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden overflow-y-auto" style={{ background: "var(--bg)" }}>
      {/* Ambient blobs — use brand accent via CSS variable */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.12 }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.08 }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.15,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex min-h-dvh flex-col items-center justify-start px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:justify-center sm:px-5 sm:py-10">

        {/* Logo + wordmark */}
        <div className="mb-6 flex flex-col items-center gap-3 sm:mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo/TITLELOGO.svg"
            alt="OMNIA.AI"
            className="w-auto object-contain drop-shadow-lg"
            style={{ height: "clamp(60px, 18vw, 110px)" }}
          />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black tracking-tight" style={{ color: "var(--text)" }}>OMNIA</span>
              <span className="text-2xl font-black tracking-tight" style={{ color: "var(--accent)" }}>.AI</span>
            </div>
            <p className="mt-1 text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--text-muted)" }}>
              Collaborative Astrology Intelligence
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm rounded-2xl p-5 shadow-2xl sm:p-7"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <h2 className="text-center text-base font-semibold mb-6" style={{ color: "var(--text)" }}>
            เข้าสู่ระบบ
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="กรอกชื่อผู้ใช้"
                className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all sm:text-sm"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-8)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-base outline-none transition-all sm:text-sm"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-8)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs rounded-xl px-4 py-2.5" style={{ background: "var(--danger-10)", color: "var(--danger)", border: "1px solid var(--danger-30)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-base font-semibold transition-all disabled:opacity-50 cursor-pointer mt-2 sm:text-sm"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                boxShadow: loading ? "none" : "0 4px 20px var(--accent-20)",
              }}
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="mt-5 text-[12px]" style={{ color: "var(--text-muted)" }}>
          ยังไม่มีบัญชี?{" "}
          <a href="/register" style={{ color: "var(--accent)" }} className="font-semibold hover:underline">
            สมัครสมาชิกฟรี
          </a>
        </p>

        <Link
          href="/research"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:border-[var(--accent)]"
          style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}
        >
          <MessageSquare size={14} />
          ทดลองถามฟรีก่อนสมัคร
        </Link>

        {/* Footer */}
        <p className="mt-4 text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          © {new Date().getFullYear()} OMNIA.AI · เพื่อความบันเทิงและสร้างแรงบันดาลใจเท่านั้น
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
