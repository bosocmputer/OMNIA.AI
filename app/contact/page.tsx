import Link from "next/link";
import { ArrowLeft, CreditCard, Mail, MessageSquare, ShieldCheck } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen px-5 py-8" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="mx-auto max-w-3xl">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold mb-6" style={{ color: "var(--accent)" }}>
          <ArrowLeft size={16} />
          กลับไปเข้าสู่ระบบ
        </Link>

        <section className="rounded-3xl border p-7 md:p-10" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--surface), var(--card))" }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)", color: "var(--accent)" }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Contact</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-black">ติดต่อ OMNIA.AI</h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                ใช้หน้านี้สำหรับปัญหาเครดิต การโอนเงิน การใช้งานบัญชี หรือการขอใช้สิทธิตามนโยบายความเป็นส่วนตัว
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 mt-5 md:grid-cols-3">
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <CreditCard size={20} style={{ color: "var(--accent)" }} />
            <h2 className="mt-3 font-bold">ปัญหาเติมเครดิต</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ส่งเวลาโอน ยอดเงิน แพ็กที่เลือก และชื่อผู้โอน เพื่อให้ตรวจสอบได้เร็ว
            </p>
          </div>
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <ShieldCheck size={20} style={{ color: "var(--accent)" }} />
            <h2 className="mt-3 font-bold">ข้อมูลส่วนบุคคล</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ขอแก้ไข ลบ หรือสอบถามข้อมูลที่ OMNIA.AI เก็บไว้เกี่ยวกับบัญชีของคุณ
            </p>
          </div>
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <Mail size={20} style={{ color: "var(--accent)" }} />
            <h2 className="mt-3 font-bold">ช่องทางติดต่อ</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ผู้ดูแลระบบ: นนทวัช วงค์หนัก
              <br />
              PromptPay: 0904681299
            </p>
          </div>
        </div>

        <section className="mt-5 rounded-2xl border p-6" style={{ borderColor: "var(--accent-30)", background: "var(--accent-8)" }}>
          <h2 className="font-bold">ข้อความที่ควรส่งมาเมื่อมีปัญหาโอนเงิน</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            “เติมเครดิตแพ็ก Focus 199 บาท โอนเวลา 14:32 ชื่อบัญชีผู้โอน ... username ...”
            <br />
            ถ้าระบบมีการใช้งานลูกค้าจริงมากขึ้น ควรเพิ่ม LINE OA หรืออีเมล support แล้วนำมาใส่หน้านี้เพิ่มเติม
          </p>
        </section>
      </div>
    </main>
  );
}
