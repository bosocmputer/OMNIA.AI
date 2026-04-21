import { Sparkles, Zap, CheckCircle } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  "ดูดวงไม่จำกัด — ไม่มี quota รายเดือน",
  "ทีมโหราจารย์ส่วนตัว — สร้างและปรับแต่งได้",
  "บันทึกผลดูดวง — เก็บประวัติตลอดชีพ",
  "Priority AI — ตอบเร็วกว่าในชั่วโมง peak",
  "Export PDF — นำผลดูดวงไปใช้ต่อ",
  "Early Access — ฟีเจอร์ใหม่ก่อนใคร",
];

export default function UpgradePage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)" }}
        >
          <Zap size={20} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>อัปเกรดเป็น Premium</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>ปลดล็อกพลังเต็มของ OMNIA.AI</p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div
        className="rounded-2xl p-8 text-center mb-6"
        style={{
          background: "linear-gradient(135deg, var(--card) 0%, var(--surface) 100%)",
          border: "1px solid var(--accent-30)",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={28} style={{ color: "var(--accent)" }} />
          <span className="text-2xl font-black" style={{ color: "var(--accent)" }}>OMNIA</span>
          <span className="text-2xl font-black" style={{ color: "var(--text)" }}> Premium</span>
        </div>
        <p
          className="text-3xl font-black mb-2"
          style={{ color: "var(--text)" }}
        >
          กำลังจะมา<span style={{ color: "var(--accent)" }}>เร็วๆ นี้</span>
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          เราอยู่ระหว่างพัฒนาระบบชำระเงินและ premium features
        </p>
      </div>

      {/* Features */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
          สิ่งที่จะได้รับกับ Premium
        </h2>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/research"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          ← กลับไปดูดวง
        </Link>
      </div>
    </div>
  );
}
