import Link from "next/link";
import { ArrowLeft, CreditCard, FileText, ShieldAlert } from "lucide-react";

const CREDIT_TERMS = [
  "เครดิตใช้สำหรับถามคำทำนายใน OMNIA.AI เท่านั้น ไม่สามารถแลกเป็นเงินสด",
  "เมื่อเริ่มอ่านดวงสำเร็จ ระบบจะหักเครดิตตามจำนวนหมอดูและประเภทคำถามที่เลือก",
  "รายการเติมเครดิตผ่าน PromptPay เป็นการตรวจยอดแบบ manual เครดิตจะเข้าเมื่อผู้ดูแลตรวจสอบและอนุมัติ",
  "หากโอนผิดยอด แจ้งผิดแพ็ก หรือแจ้งข้อมูลโอนไม่ครบ ผู้ใช้ควรติดต่อผู้ดูแลเพื่อให้ตรวจสอบเป็นรายกรณี",
  "กรณีระบบผิดพลาดจนหักเครดิตโดยไม่ได้รับคำตอบ ผู้ดูแลสามารถคืนเครดิตให้ตามการตรวจสอบ",
];

export default function TermsPage() {
  return (
    <main className="min-h-screen px-5 py-8" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold mb-6" style={{ color: "var(--accent)" }}>
          <ArrowLeft size={16} />
          กลับไปเข้าสู่ระบบ
        </Link>

        <section className="rounded-3xl border p-7 md:p-10" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--surface), var(--card))" }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-10)", border: "1px solid var(--accent-30)", color: "var(--accent)" }}>
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Terms of Use</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-black">เงื่อนไขการใช้งาน OMNIA.AI</h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                มีผลตั้งแต่วันที่ 29 เมษายน 2569 การใช้งาน OMNIA.AI ถือว่าผู้ใช้รับทราบและยอมรับเงื่อนไขต่อไปนี้
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 mt-5">
          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold">ขอบเขตคำทำนาย</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              คำทำนายจาก OMNIA.AI เป็นข้อมูลเพื่อความบันเทิง การสะท้อนตัวเอง และแรงบันดาลใจเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ กฎหมาย การเงิน การลงทุน
              หรือคำรับรองผลลัพธ์ในอนาคต ผู้ใช้ควรใช้วิจารณญาณและรับผิดชอบต่อการตัดสินใจของตนเอง
            </p>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold">เครดิต การชำระเงิน และการคืนเครดิต</h2>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {CREDIT_TERMS.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h2 className="text-lg font-bold mb-3">ข้อห้ามในการใช้งาน</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ห้ามใช้ระบบเพื่อหลอกลวงผู้อื่น แอบอ้างเป็นผู้ประกอบวิชาชีพ สร้างความเสียหายต่อบุคคลอื่น โจมตีระบบ หลีกเลี่ยงการชำระเงิน
              หรือส่งข้อมูลที่ผิดกฎหมาย ผู้ดูแลสามารถระงับบัญชีหรือปฏิเสธการให้บริการเมื่อพบการใช้งานที่เสี่ยงหรือผิดเงื่อนไข
            </p>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--accent-30)", background: "var(--accent-8)" }}>
            <h2 className="text-lg font-bold mb-3">การติดต่อและข้อพิพาท</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              หากพบปัญหาเรื่องเครดิต การชำระเงิน หรือข้อมูลส่วนบุคคล กรุณาติดต่อผู้ดูแลผ่านหน้า <Link href="/contact" className="font-semibold underline" style={{ color: "var(--accent)" }}>ติดต่อเรา</Link>
              ก่อนดำเนินการอื่น เพื่อให้ตรวจสอบหลักฐานและแก้ไขเป็นรายกรณี
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
