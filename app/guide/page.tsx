"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, MessageSquare, Sparkles, UserCircle, Users } from "lucide-react";

const STEPS = [
  {
    icon: UserCircle,
    title: "เลือกเจ้าชะตา",
    desc: "บันทึกข้อมูลเกิดของตัวเอง แฟน ลูกค้า หรือคนที่อยากดูให้",
    details: ["ไปที่หน้า เจ้าชะตา", "เพิ่มชื่อ วันเกิด เวลาเกิด และสถานที่เกิด", "ตั้งคนที่ใช้บ่อยเป็นเจ้าชะตาหลัก"],
    href: "/profile",
  },
  {
    icon: MessageSquare,
    title: "ถามเรื่องที่อยากรู้",
    desc: "พิมพ์เป็นภาษาคนปกติ เช่น งาน เงิน ความรัก สอบ หรือเดือนหน้า",
    details: ["เปิดห้องดูดวง", "เลือกเจ้าชะตาที่ต้องการ", "พิมพ์คำถามเดียวหรือหลายเรื่องในข้อความเดียวได้"],
    href: "/research",
  },
  {
    icon: Users,
    title: "เลือกหมอดู",
    desc: "ให้หลายศาสตร์ช่วยมองคนละมุม หรือเลือกหมอดูเฉพาะคนก็ได้",
    details: ["เลือกหมอดูในแผงด้านซ้ายของห้องดูดวง", "เปิดหลายท่านเพื่อให้ OMNIA สรุปรวม", "เปิดคนเดียวเมื่อต้องการคำตอบเร็วและตรงจากศาสตร์นั้น"],
    href: "/agents",
  },
  {
    icon: Sparkles,
    title: "อ่านสรุปจาก OMNIA",
    desc: "ระบบรวมคำทำนายเป็นคำตอบเดียว พร้อมสิ่งที่ควรสังเกตและแผนต่อไป",
    details: ["อ่านคำตอบตรง ๆ ก่อน", "ดูตัวอย่างเรื่องที่อาจเจอและเรื่องที่ควรระวัง", "กด feedback ว่าแม่น กว้างไป หรือยาวไป เพื่อช่วยปรับคำตอบครั้งต่อไป"],
    href: "/research",
  },
];

const FAQS = [
  {
    q: "ต้องกรอกเวลาเกิดไหม?",
    a: "ถ้ารู้เวลาเกิด คำทำนายจะละเอียดขึ้น โดยเฉพาะศาสตร์ที่ใช้เวลาและสถานที่เกิด ถ้าไม่รู้ก็ยังดูจากวันเกิดและข้อมูลที่มีได้",
  },
  {
    q: "ดูดวงให้คนอื่นได้ไหม?",
    a: "ได้ เพิ่มเจ้าชะตาใหม่ในหน้าเจ้าชะตา แล้วเลือกคนนั้นก่อนถามในห้องดูดวง",
  },
  {
    q: "ถามต่อได้ไหม?",
    a: "ได้ หลังคำตอบแรกจบ พิมพ์คำถามต่อได้เลย ระบบจะใช้บริบทเดิมประกอบ โดยไม่ต้องเริ่มใหม่ทุกครั้ง",
  },
  {
    q: "คำทำนายเชื่อได้แค่ไหน?",
    a: "ให้ใช้เป็นแนวทางประกอบการตัดสินใจ จุดที่ควรเชื่อมากขึ้นคือคำตอบที่โยงกับข้อมูลเกิด คำถามจริง และสัญญาณที่สังเกตได้ในชีวิต",
  },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <section className="rounded-2xl border p-5 md:p-7 mb-5" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--card), var(--surface))" }}>
        <div className="inline-flex items-center gap-2 text-xs font-semibold mb-3" style={{ color: "var(--accent)" }}>
          <BookOpen size={14} /> OMNIA.AI Guide
        </div>
        <h1 className="text-2xl md:text-4xl font-bold leading-tight" style={{ color: "var(--text)" }}>
          ใช้งาน OMNIA.AI ให้ได้คำทำนายที่ตรงขึ้น
        </h1>
        <p className="text-sm md:text-base mt-3 max-w-2xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
          เริ่มจากเลือกเจ้าชะตา ถามเรื่องที่อยากรู้ แล้วให้หมอดูหลายศาสตร์อ่านร่วมกันก่อน OMNIA สรุปเป็นภาษาที่ใช้ตัดสินใจได้จริง
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <Link href="/research" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            เปิดห้องดูดวง <ArrowRight size={16} />
          </Link>
          <Link href="/profile" className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>
            เพิ่มเจ้าชะตา
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border p-4 md:p-5 mb-8" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Workflow</div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>จากข้อมูลเกิดถึงคำตอบที่ใช้ตัดสินใจ</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
        {STEPS.map((step, index) => (
          <Link key={step.title} href={step.href} className="relative rounded-2xl border p-4 transition-all hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {index < STEPS.length - 1 && (
              <span className="hidden md:block absolute top-9 -right-3 w-6 h-px" style={{ background: "var(--accent-30)" }} />
            )}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-10)", color: "var(--accent)" }}>
                <step.icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold mb-1" style={{ color: "var(--accent)" }}>ขั้นตอนที่ {index + 1}</div>
                <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>{step.title}</h2>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{step.desc}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {step.details.map((detail) => (
                <li key={detail} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
        </div>
      </section>

      <section className="rounded-2xl border p-5 mb-8" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>ถามอย่างไรให้แม่นขึ้น</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { title: "ระบุเรื่อง", desc: "เช่น งาน เงิน ความรัก สอบ หรือการตัดสินใจสำคัญ" },
            { title: "ระบุเวลา", desc: "เช่น เดือนหน้า 3 เดือนนี้ ปีนี้ หรือวันที่เกิดเหตุการณ์" },
            { title: "ระบุบริบท", desc: "เช่น เพิ่งสอบมา กำลังสมัครงาน หรือมีภาระบ้านอยู่" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.title}</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>คำถามที่พบบ่อย</h2>
        <div className="space-y-2">
          {FAQS.map((faq, index) => {
            const open = openFaq === index;
            return (
              <button
                key={faq.q}
                type="button"
                onClick={() => setOpenFaq(open ? null : index)}
                className="w-full text-left rounded-2xl border p-4 transition-all"
                style={{ borderColor: open ? "var(--accent)" : "var(--border)", background: "var(--card)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{faq.q}</div>
                  <span style={{ color: "var(--text-muted)" }}>{open ? "−" : "+"}</span>
                </div>
                {open && <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>{faq.a}</p>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
