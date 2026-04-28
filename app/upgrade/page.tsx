import { ArrowRight, CalendarDays, FileText, History, Sparkles, Zap, CheckCircle } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  "Daily Insight ส่วนตัว — เปิดมาแล้วรู้ทันทีว่าวันนี้ควรระวังอะไร",
  "Timeline Archive — เก็บจังหวะดี/หนักของแต่ละคำทำนายไว้เทียบย้อนหลัง",
  "Follow-up Reading — ถามต่อจากคำทำนายเดิมโดยไม่ต้องเล่าซ้ำ",
  "ทีมโหราจารย์ส่วนตัว — ปรับบุคลิกและศาสตร์ที่ใช้บ่อยได้",
  "Export PDF — เก็บผลคำทำนายไว้ส่งต่อหรืออ่านซ้ำ",
  "Priority AI — ตอบเร็วกว่าในช่วงที่คนใช้งานเยอะ",
];

const PREVIEWS = [
  { icon: CalendarDays, title: "Daily Insight", desc: "สรุปจุดที่ควรทำและควรระวังในแต่ละวันจากเจ้าชะตาหลัก" },
  { icon: History, title: "Life Timeline", desc: "รวมคำทำนายเป็นเส้นเวลา เห็นจังหวะซ้ำและเรื่องที่ถูกทักบ่อย" },
  { icon: FileText, title: "Reading Report", desc: "ส่งออกเป็นรายงานอ่านง่าย พร้อมสรุปสั้นและแผนรับมือ" },
];

export default function UpgradePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
      <section
        className="rounded-2xl p-6 md:p-8 text-center mb-6"
        style={{
          background: "linear-gradient(135deg, var(--accent-8), color-mix(in srgb, var(--teal) 14%, transparent))",
          border: "1px solid var(--accent-30)",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={28} style={{ color: "var(--accent)" }} />
          <span className="text-2xl font-black" style={{ color: "var(--accent)" }}>OMNIA</span>
          <span className="text-2xl font-black" style={{ color: "var(--text)" }}> Premium</span>
        </div>
        <p
          className="text-3xl md:text-4xl font-black mb-2"
          style={{ color: "var(--text)" }}
        >
          กำลังจะมา<span style={{ color: "var(--accent)" }}>เร็วๆ นี้</span>
        </p>
        <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Premium จะทำให้ OMNIA ไม่ใช่แค่ดูดวงครั้งเดียว แต่เป็นพื้นที่ติดตามจังหวะชีวิต ถามต่อ และเก็บคำทำนายที่สำคัญไว้ใช้งานจริง
        </p>
        <div className="mt-5">
          <Link href="/research" className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            กลับไปเปิดคำทำนาย
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-3 mb-6">
        {PREVIEWS.map((item) => (
          <div key={item.title} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
              <item.icon size={18} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>{item.title}</h2>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
          </div>
        ))}
      </section>

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

      <p className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        รุ่นแรกจะเปิดให้ทดลองกับบัญชีที่ใช้งานบ่อยก่อน เพื่อเก็บ feedback เรื่องความแม่นและความเร็ว
      </p>
    </div>
  );
}
