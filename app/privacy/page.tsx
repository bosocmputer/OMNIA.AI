import Link from "next/link";
import { ArrowLeft, Database, LockKeyhole, Mail, ShieldCheck, UserCheck } from "lucide-react";

const DATA_ITEMS = [
  "ข้อมูลบัญชี เช่น ชื่อผู้ใช้ อีเมล และสถานะบัญชี",
  "ข้อมูลวันเกิด เวลาเกิด สถานที่เกิด และ timezone ที่ผู้ใช้บันทึกไว้",
  "คำถาม คำตอบ คำทำนาย หมอดูที่เลือก และ feedback ที่ผู้ใช้ส่งให้ระบบ",
  "ข้อมูลเครดิต รายการเติมเครดิต หมายเหตุการโอน และประวัติการใช้งานเครดิต",
  "ข้อมูลทางเทคนิค เช่น IP โดยประมาณ, cookie สำหรับเข้าสู่ระบบ, log ระบบ และข้อมูลป้องกันการใช้งานผิดปกติ",
];

const RIGHTS = [
  "ขอเข้าถึงหรือขอสำเนาข้อมูลส่วนบุคคล",
  "ขอแก้ไขข้อมูลให้ถูกต้องและเป็นปัจจุบัน",
  "ขอให้ลบ ทำลาย หรือระงับการใช้ข้อมูลเมื่อไม่มีเหตุจำเป็นต้องเก็บ",
  "คัดค้านหรือขอจำกัดการประมวลผลข้อมูลในบางกรณี",
  "ถอนความยินยอม โดยการถอนอาจทำให้บางฟังก์ชันใช้งานไม่ได้",
  "ร้องเรียนต่อหน่วยงานกำกับดูแลตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล",
];

export default function PrivacyPage() {
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
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Privacy Notice</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-black">นโยบายความเป็นส่วนตัว OMNIA.AI</h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                มีผลตั้งแต่วันที่ 29 เมษายน 2569 นโยบายนี้อธิบายว่า OMNIA.AI เก็บ ใช้ เปิดเผย และดูแลข้อมูลส่วนบุคคลของผู้ใช้อย่างไร
                เพื่อให้สอดคล้องกับหลักการของพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 mt-5">
          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Database size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold">ข้อมูลที่เราเก็บ</h2>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {DATA_ITEMS.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h2 className="text-lg font-bold mb-3">วัตถุประสงค์ในการใช้ข้อมูล</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              เราใช้ข้อมูลเพื่อสร้างและรักษาบัญชีผู้ใช้ วิเคราะห์คำถามและพื้นดวง บันทึกประวัติคำทำนาย คำนวณและหักเครดิต ตรวจรายการเติมเครดิต
              ปรับปรุงคุณภาพคำตอบจาก feedback ป้องกันการใช้งานผิดปกติ และติดต่อผู้ใช้ในกรณีที่เกี่ยวข้องกับบัญชี การชำระเงิน หรือการใช้บริการ
            </p>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h2 className="text-lg font-bold mb-3">ฐานทางกฎหมายและการเปิดเผยข้อมูล</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              การประมวลผลข้อมูลอาจอาศัยฐานสัญญาการให้บริการ ความยินยอม ประโยชน์โดยชอบด้วยกฎหมาย การปฏิบัติตามกฎหมาย หรือการป้องกันการทุจริต
              เราอาจส่งข้อมูลเท่าที่จำเป็นให้ผู้ให้บริการระบบ เช่น hosting, database, AI API, logging และผู้ดูแลระบบของ OMNIA.AI
              โดยจะไม่ขายข้อมูลส่วนบุคคลให้บุคคลภายนอก
            </p>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-3">
              <LockKeyhole size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold">การเก็บรักษาและความปลอดภัย</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              เราเก็บข้อมูลเท่าที่จำเป็นต่อการให้บริการ การตรวจสอบเครดิต และการปรับปรุงระบบ ข้อมูลบัญชีและประวัติคำทำนายจะเก็บไว้จนกว่าผู้ใช้ขอลบ
              หรือจนหมดความจำเป็นตามวัตถุประสงค์ เราใช้การจำกัดสิทธิ์ผู้ดูแล ระบบ authentication และการแยกข้อมูลตามผู้ใช้เพื่อลดความเสี่ยง
            </p>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold">สิทธิของเจ้าของข้อมูล</h2>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {RIGHTS.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </section>

          <section className="rounded-2xl border p-6" style={{ borderColor: "var(--accent-30)", background: "var(--accent-8)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Mail size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold">ติดต่อผู้ควบคุมข้อมูล</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ผู้ดูแลระบบ: นนทวัช วงค์หนัก · OMNIA.AI
              <br />
              หากต้องการใช้สิทธิหรือสอบถามเรื่องข้อมูลส่วนบุคคล กรุณาติดต่อผ่านหน้า <Link href="/contact" className="font-semibold underline" style={{ color: "var(--accent)" }}>ติดต่อเรา</Link>
            </p>
          </section>

          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            หมายเหตุ: เอกสารนี้จัดทำเพื่อใช้เป็น Privacy Notice สำหรับ soft launch และควรให้ผู้เชี่ยวชาญด้านกฎหมายตรวจทานอีกครั้งก่อนขยายเชิงพาณิชย์เต็มรูปแบบ
          </p>
        </div>
      </div>
    </main>
  );
}
