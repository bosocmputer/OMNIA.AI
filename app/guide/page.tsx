"use client";

import { useState } from "react";
import Link from "next/link";

interface Step {
  id: string;
  title: string;
  desc: string;
  details: string[];
  tips?: string[];
}

const STEPS: Step[] = [
  {
    id: "get-started",
    title: "เริ่มต้นใช้งาน",
    desc: "ติดต่อทีมงานเพื่อเปิดใช้งานระบบ",
    details: [
      "ติดต่อ Line @ledgio หรือ info@ledgio.ai",
      "ทีมงานจะช่วย setup ระบบและตั้งค่าเบื้องต้นให้",
      "เมื่อพร้อมแล้ว เข้าใช้งานได้ทันที ไม่ต้องตั้งค่าอะไรเพิ่มเติม",
    ],
    tips: [
      "ทดลองใช้ฟรี 14 วัน ไม่มีข้อผูกมัด",
      "รองรับแพ็กเกจตั้งแต่ Starter 790 บาท/เดือน ถึง Enterprise 4,990 บาท/เดือน",
    ],
  },
  {
    id: "company-info",
    title: "กรอกข้อมูลบริษัท",
    desc: "ให้ AI รู้จักบริษัทของคุณเพื่อให้คำตอบที่ตรงประเด็น",
    details: [
      "ไปที่หน้า Settings > ส่วน ข้อมูลบริษัท",
      "กรอกชื่อบริษัท ประเภทธุรกิจ มาตรฐานบัญชี (PAEs/NPAEs)",
      "เลือกรอบบัญชี และจำนวนพนักงาน",
      'เพิ่มหมายเหตุเพิ่มเติมในช่อง "บันทึกเพิ่มเติม" ถ้าต้องการ',
      "กด บันทึกข้อมูลบริษัท — ข้อมูลจะถูกส่งให้ทุก Agent อัตโนมัติ",
    ],
    tips: [
      "ดูตัวอย่างสิ่งที่ AI จะเห็นได้ในส่วน Context Preview",
      "ไม่จำเป็นต้องกรอกทุกช่อง — กรอกเฉพาะที่เกี่ยวข้อง",
    ],
  },
  {
    id: "agents",
    title: "สร้างทีม Agent",
    desc: "ตั้งค่าทีมที่ปรึกษา AI ตามบทบาทที่ต้องการ",
    details: [
      "ไปที่หน้า Team Agents",
      'กด "+ สร้าง Agent ใหม่" หรือใช้ Template สำเร็จรูป',
      "ตั้งชื่อ เลือก Emoji บทบาท (เช่น นักบัญชี, ที่ปรึกษาภาษี, ทนายความ)",
      'เขียน "จิตวิญญาณ" (Soul) — คำอธิบายบุคลิกและทักษะของ Agent',
      "เลือก AI Model ที่ต้องการ (มีคำแนะนำให้ตามประเภทงาน)",
      "กำหนดลำดับอาวุโส — Agent ที่อาวุโสสูงสุดจะเป็นประธานการประชุม",
      "เปิด/ปิด Web Search ถ้าต้องการให้ค้นข้อมูลจากอินเทอร์เน็ต",
    ],
    tips: [
      "แนะนำให้มี Agent อย่างน้อย 3 ตัว เพื่อให้ได้มุมมองที่หลากหลาย",
      "ลำดับอาวุโส (Seniority) กำหนดว่าใครพูดก่อน — ตัวเลขสูง = อาวุโสมาก",
      "ใช้ Template เป็นจุดเริ่มต้นแล้วปรับแต่งตาม scope งานลูกค้า",
    ],
  },
  {
    id: "knowledge",
    title: "เพิ่มฐานความรู้ให้ Agent",
    desc: "แนบไฟล์เฉพาะทางเพื่อให้ Agent มีข้อมูลเพิ่มเติม",
    details: [
      'ในหน้า Team Agents กดปุ่ม "Knowledge" ที่ Agent ที่ต้องการ',
      'กด "อัพโหลดไฟล์ความรู้"',
      "เลือกไฟล์ที่ต้องการ — รองรับ xlsx, pdf, docx, txt, md, csv, json",
      "ระบบจะอ่านเนื้อหาและแสดง preview + ขนาดโดยประมาณ",
      "ความรู้จะถูกส่งให้เฉพาะ Agent ที่เป็นเจ้าของเท่านั้น",
    ],
    tips: [
      "ตัวอย่างไฟล์: มาตรฐานบัญชี, ระเบียบสรรพากร, ข้อมูลลูกค้า, ตัวอย่างสัญญา",
      "แต่ละไฟล์รองรับเนื้อหาสูงสุด 50,000 ตัวอักษร",
      "สามารถลบไฟล์ที่ไม่ใช้แล้วได้ตลอดเวลา",
    ],
  },
  {
    id: "meeting",
    title: "เปิดห้องประชุม AI",
    desc: "เริ่มการประชุมกับทีม Agent ของคุณ",
    details: [
      "ไปที่หน้า Meeting Room",
      "เลือก Agent ที่จะเข้าประชุมจากแถบด้านข้าง (✓ = เข้าร่วม)",
      "พิมพ์วาระการประชุม เช่น \"วิเคราะห์งบการเงินบริษัท ABC ปี 2568\"",
      "กด Enter หรือปุ่มส่ง — Agent ที่อาวุโสสูงสุดจะเปิดการประชุม",
      "แต่ละ Agent จะวิเคราะห์ตามบทบาทของตน (Phase 1)",
      "จากนั้นทุกคนจะถกเถียงกัน (Phase 2) ก่อนประธานสรุปมติ",
    ],
    tips: [
      "แนบไฟล์ Excel/PDF ได้ในช่องพิมพ์ — Agent จะวิเคราะห์ข้อมูลในไฟล์ด้วย",
      "ถ้าอยากถามต่อ พิมพ์วาระใหม่ได้เลย ระบบจำบริบทเดิม",
      'กด "🔚 สรุปมติ" เพื่อให้ประธานสรุปรวมทุกวาระ',
    ],
  },
  {
    id: "multi-round",
    title: "ประชุมหลายรอบ",
    desc: "ถามต่อเนื่องเพื่อเจาะลึกรายละเอียด",
    details: [
      "หลังรอบแรกจบ ระบบจะแนะนำคำถามต่อยอด (Suggestions)",
      "คลิกคำถามที่แนะนำ หรือพิมพ์วาระใหม่เอง",
      "Agent จะจำเนื้อหาจากรอบก่อนหน้า ไม่ต้องอธิบายซ้ำ",
      "ประชุมกี่รอบก็ได้ — ทุกรอบบันทึกไว้ให้",
      'กด "สรุปมติ" เมื่อพร้อม — ประธานจะสรุปรวมทุกวาระ',
    ],
    tips: [
      "ใช้วิธีนี้สำหรับงานซับซ้อน เช่น วิเคราะห์งบ → วางแผนภาษี → เขียนรายงาน",
      "แต่ละรอบมีกราฟ visualization ให้ถ้ามีข้อมูลตัวเลข",
    ],
  },
  {
    id: "export",
    title: "Export รายงานการประชุม",
    desc: "ดาวน์โหลดรายงานเป็นไฟล์ Markdown พร้อมใช้",
    details: [
      'กดปุ่ม "Export Minutes" ที่มุมขวาบนของห้องประชุม',
      "ระบบจะรวมทุกรอบวาระ + มติ + action items เป็นไฟล์เดียว",
      "ไฟล์เป็น Markdown (.md) เปิดอ่านได้ทุกที่ แปลงเป็น PDF/Word ได้ง่าย",
    ],
    tips: [
      "ส่งรายงานให้ลูกค้าหรือกรรมการได้ทันที",
      "ประวัติการประชุมเก็บไว้ในระบบ ดูย้อนหลังได้จากประวัติ",
    ],
  },
  {
    id: "usage",
    title: "ดูสถิติการใช้งาน",
    desc: "ติดตามปริมาณการใช้งานและต้นทุน AI",
    details: [
      "ไปที่หน้า สถิติการใช้งาน",
      "ดูกราฟการใช้งานรายวัน",
      "ดูว่าที่ปรึกษาตัวไหนใช้งานมากที่สุด",
      "ดูรายละเอียดแต่ละครั้งประชุม — วาระ + มูลค่าการใช้งาน",
    ],
    tips: [
      "ค่า AI โดยเฉลี่ย: ~0.50-5 บาท/ครั้งประชุม",
      "รายละเอียดค่าใช้จ่ายดูได้ใน Dashboard",
    ],
  },
];

export default function GuidePage() {
  const [expandedId, setExpandedId] = useState<string | null>("get-started");
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text)" }}>
            วิธีใช้งาน LEDGIO AI
          </h1>
          <p className="text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
            8 ขั้นตอนง่ายๆ จากเริ่มต้นจนใช้งานประชุม AI ได้จริง
          </p>
        </div>

        {/* Quick Start */}
        <div className="rounded-xl p-5 mb-8 border" style={{ background: "var(--accent-5)", borderColor: "var(--accent-35)" }}>
          <h2 className="font-bold text-sm mb-3" style={{ color: "var(--accent)" }}>เริ่มต้นเร็ว (3 นาที)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { step: "1", label: "กรอกข้อมูลบริษัท", link: "/settings" },
              { step: "2", label: "ดูทีมที่ปรึกษา", link: "/agents" },
              { step: "3", label: "เปิดห้องประชุม", link: "/research" },
              { step: "4", label: "พิมพ์วาระ แล้วส่ง", link: "/research" },
            ].map((s) => (
              <a key={s.step} href={s.link} className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:opacity-80" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "var(--accent)", color: "#000" }}>
                  {s.step}
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{s.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Steps Accordion */}
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const isOpen = expandedId === step.id;
            return (
              <div
                key={step.id}
                className="rounded-xl border overflow-hidden transition-all"
                style={{
                  borderColor: isOpen ? "var(--accent)" : "var(--border)",
                  background: "var(--card)",
                  boxShadow: isOpen ? "0 0 16px var(--accent-10)" : undefined,
                }}
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : step.id)}
                  className="w-full flex items-center gap-3 p-4 text-left transition-all"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: isOpen ? "var(--accent)" : "var(--surface)", color: isOpen ? "#000" : "var(--text-muted)" }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>{step.title}</h3>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{step.desc}</p>
                  </div>
                  <span className="text-lg flex-shrink-0 transition-transform" style={{ color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="ml-11">
                      {/* Steps */}
                      <ol className="space-y-2 mb-4">
                        {step.details.map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text)" }}>
                            <span className="font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ol>

                      {/* Tips */}
                      {step.tips && step.tips.length > 0 && (
                        <div className="rounded-lg p-3 border" style={{ background: "var(--accent-3)", borderColor: "var(--accent-15)" }}>
                          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--accent)" }}>เคล็ดลับ</p>
                          <ul className="space-y-1">
                            {step.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                <span>•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "var(--text)" }}>คำถามที่พบบ่อย</h2>
          <div className="space-y-3">
            {[
              { q: "ต้องเสียเงินเท่าไหร่?", a: "เริ่มต้นที่แพ็กเกจ Starter 790 บาท/เดือน พร้อมค่า AI เริ่มต้นไม่ถึง 5 บาท/ครั้งประชุม ดูรายละเอียดที่หน้าแพ็กเกจ หรือติดต่อเรา" },
              { q: "ข้อมูลลูกค้าจะหลุดไหม?", a: "ข้อมูลเก็บในเซิร์ฟเวอร์ของคุณเอง เข้ารหัส AES-256 ไม่ส่งขึ้น cloud ไม่แชร์กับบุคคลที่สาม" },
              { q: "ต้องเก่งคอมพิวเตอร์ไหม?", a: "ไม่ต้องเลย — แค่พิมพ์คำถามเป็นภาษาไทยธรรมดา AI จะเข้าใจบริบทบัญชีและตอบให้" },
              { q: "ใช้กับลูกค้าหลายรายได้ไหม?", a: "ได้ — สร้าง Agent set ต่างกันตาม scope งาน หรือตั้งค่าข้อมูลบริษัทใหม่ได้เสมอ" },
              { q: "รองรับไฟล์อะไรบ้าง?", a: "Excel (.xlsx/.xls), PDF, Word (.docx), Text (.txt/.md), CSV, JSON — อัพโหลดได้ทั้งในห้องประชุมและฐานความรู้ Agent" },
              { q: "เลือก AI ระดับไหนดี?", a: "ระบบจะเลือกระดับที่เหมาะสมตามประเภทงาน งานทั่วไปใช้ระดับเร็วและประหยัด ส่วนงานซับซ้อนใช้ระดับละเอียดและแม่นยำกว่า" },
            ].map((faq, i) => {
              const open = expandedFaqs.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setExpandedFaqs((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    });
                  }}
                  className="w-full text-left rounded-xl p-4 border transition-all"
                  style={{ background: "var(--card)", borderColor: open ? "var(--accent)" : "var(--border)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{faq.q}</p>
                    <span className="text-sm flex-shrink-0" style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
                  </div>
                  {open && (
                    <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-muted)" }}>{faq.a}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Glossary link */}
        <div className="mt-8 text-center">
          <Link href="/glossary" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80" style={{ color: "var(--accent)" }}>
            📖 ดูคำศัพท์ทั้งหมด (AI / บัญชี / ภาษี)
          </Link>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <a href="https://line.me/ti/p/@ledgio" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 rounded-lg font-bold text-sm transition-colors" style={{ background: "var(--accent)", color: "#000" }}>
            ติดต่อนัดทดลองใช้
          </a>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            มีปัญหาหรือข้อสงสัย? ติดต่อ Line @ledgio
          </p>
        </div>
      </div>
    </div>
  );
}
