"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consentPdpa, setConsentPdpa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (!consentPdpa) {
      setError("กรุณายอมรับนโยบายความเป็นส่วนตัวก่อน");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email: email || undefined, password, consentPdpa }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      window.location.href = "/research";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.12 }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.08 }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.15,
          }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo/TITLELOGO.svg"
            alt="OMNIA.AI"
            className="w-auto object-contain drop-shadow-lg"
            style={{ height: "clamp(68px, 13vw, 96px)" }}
          />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xl font-black tracking-tight" style={{ color: "var(--text)" }}>OMNIA</span>
              <span className="text-xl font-black tracking-tight" style={{ color: "var(--accent)" }}>.AI</span>
            </div>
            <p className="mt-0.5 text-[10px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--text-muted)" }}>
              สมัครสมาชิกฟรี
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm rounded-2xl p-7 shadow-2xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-center text-base font-semibold mb-5" style={{ color: "var(--text)" }}>
            สร้างบัญชีใหม่
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                ชื่อผู้ใช้ <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="a-z, 0-9, _ (3-30 ตัว)"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-8)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                อีเมล <span style={{ color: "var(--text-muted)" }}>(ไม่บังคับ)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="your@email.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-8)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                รหัสผ่าน <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm outline-none transition-all"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                ยืนยันรหัสผ่าน <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-8)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* PDPA Consent */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="consent"
                type="checkbox"
                checked={consentPdpa}
                onChange={(e) => setConsentPdpa(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-[var(--accent)]"
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer" style={{ color: "var(--text-muted)" }}>
                ฉันได้อ่านและยอมรับ{" "}
                <Link href="/privacy" target="_blank" style={{ color: "var(--accent)" }} className="underline">
                  นโยบายความเป็นส่วนตัว
                </Link>{" "}
                และยินยอมให้ประมวลผลข้อมูลเพื่อการดูดวง
              </label>
            </div>

            {error && (
              <p
                className="text-xs rounded-xl px-4 py-2.5"
                style={{ background: "var(--danger-10)", color: "var(--danger)", border: "1px solid var(--danger-30)" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !consentPdpa}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer mt-1"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                boxShadow: loading ? "none" : "0 4px 20px var(--accent-20)",
              }}
            >
              {loading ? "กำลังสมัคร…" : "สมัครสมาชิกฟรี"}
            </button>
          </form>

          {/* Disclaimer */}
          <p className="mt-4 text-[10px] text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
            ⚠️ ผลดูดวงจาก AI เพื่อความบันเทิงเท่านั้น — ไม่ใช่คำทำนายเชิงวิชาชีพ
          </p>
        </div>

        <p className="mt-5 text-[12px]" style={{ color: "var(--text-muted)" }}>
          มีบัญชีแล้ว?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }} className="font-semibold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>

        <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          © {new Date().getFullYear()} OMNIA.AI
        </p>
      </div>
    </div>
  );
}
