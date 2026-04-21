"use client";

import { Users, DollarSign, Zap, BarChart3, Shield, Settings2, BookOpen, FileText, MessageSquare, Globe, Key } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function BenefitsPage() {
  const benefits: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Users, title: "ห้องประชุม AI", desc: "สร้างทีมที่ปรึกษาเฉพาะทางหลายตำแหน่ง ให้ถกเถียงและสรุปมติในแต่ละวาระประชุม" },
    { icon: DollarSign, title: "ควบคุมต้นทุนได้", desc: "ค่า AI คิดตามใช้งานจริง เริ่มต้นไม่ถึง 5 บาท/ครั้ง ดูต้นทุนต่อ session ได้ตลอด" },
    { icon: Zap, title: "ตอบลูกค้าได้เร็วขึ้น", desc: "ส่งคำถามเข้าประชุม ได้รายงานพร้อมข้อมูลอ้างอิงในไม่กี่นาที" },
    { icon: BarChart3, title: "Dashboard ค่าใช้จ่าย", desc: "แสดงมูลค่าการใช้งาน กราฟแนวโน้ม และต้นทุนต่อครั้งแบบ realtime" },
    { icon: Shield, title: "ข้อมูลอยู่ในมือคุณ", desc: "ติดตั้งบนเซิร์ฟเวอร์ส่วนตัว ข้อมูลลูกค้าไม่ถูกส่งออกภายนอก" },
    { icon: Settings2, title: "ปรับแต่งตาม scope งาน", desc: "สร้างทีม Agent ตามประเภทลูกค้า — ร้านค้า, โรงงาน, นิติบุคคลหมู่บ้าน" },
    { icon: BookOpen, title: "ฐานความรู้เฉพาะทาง", desc: "แนบไฟล์ให้แต่ละ Agent เช่น มาตรฐานบัญชี ระเบียบสรรพากร เอกสารภายใน" },
    { icon: Globe, title: "ค้นข้อมูลออนไลน์", desc: "เปิด Web Search ให้ Agent ค้นข่าว กฎหมายใหม่ อัตราแลกเปลี่ยนล่าสุด" },
  ];

  const useCases = [
    { title: "วางแผนภาษี", desc: "วิเคราะห์โครงสร้างรายได้/รายจ่าย แนะนำการลดหย่อนตามกฎหมาย" },
    { title: "วิเคราะห์งบการเงิน", desc: "อัพโหลด Excel ให้ AI อ่านงบ วิเคราะห์ ratio สรุปสุขภาพธุรกิจ" },
    { title: "ตรวจ Compliance", desc: "ตรวจสอบความถูกต้องตามมาตรฐานบัญชีและกฎหมายสรรพากร" },
    { title: "ที่ปรึกษา M&A", desc: "ประเมินมูลค่า ตรวจ due diligence สำหรับการซื้อ-ขายกิจการ" },
    { title: "ร่าง/ตรวจสัญญา", desc: "ตรวจสัญญา ชี้ความเสี่ยง และแนะนำแก้ไข" },
    { title: "ตั้งบริษัทใหม่", desc: "วิเคราะห์โครงสร้างบริษัท สิทธิประโยชน์ BOI และเรื่องภาษี" },
  ];

  const plans = [
    {
      name: "Solo",
      price: "ทดลองฟรี",
      period: "14 วัน",
      target: "ลองใช้ดูก่อนตัดสินใจ",
      features: ["Agent ได้ 3 ตัว", "ประชุมได้ 10 sessions", "1 ผู้ใช้", "Export รายงาน", "ค่า AI ตามใช้จริง"],
      excluded: ["File upload", "ฐานความรู้ Agent"],
      cta: "ทดลองใช้",
      highlight: false,
      color: "var(--text-muted)",
    },
    {
      name: "Starter",
      price: "790",
      period: "บาท/เดือน",
      target: "นักบัญชีอิสระ / Freelance",
      features: ["ที่ปรึกษา AI ได้ 5 ตัว", "ประชุมไม่จำกัด", "1 ผู้ใช้", "Upload ไฟล์ (Excel/PDF)", "ฐานความรู้เฉพาะทาง", "ข้อมูลบริษัท", "Line support"],
      excluded: [],
      cta: "ติดต่อทีมงาน",
      highlight: false,
      color: "var(--accent)",
    },
    {
      name: "Professional",
      price: "1,990",
      period: "บาท/เดือน",
      target: "สำนักงานบัญชี 1-5 คน",
      features: ["ที่ปรึกษา AI ไม่จำกัด", "ประชุมไม่จำกัด", "5 ผู้ใช้", "Upload ไฟล์ทุกประเภท", "ฐานความรู้ไม่จำกัด", "กราฟวิเคราะห์การใช้งาน", "Template บัญชี 10+ แบบ", "ค้นข้อมูลออนไลน์", "Priority support"],
      excluded: [],
      cta: "ติดต่อทีมงาน",
      highlight: true,
      color: "var(--accent)",
    },
    {
      name: "Enterprise",
      price: "4,990",
      period: "บาท/เดือน",
      target: "สำนักงานใหญ่ / หลายสาขา",
      features: ["ทุกอย่างใน Professional", "ผู้ใช้ไม่จำกัด", "ออกแบบ AI Template ตาม scope งาน", "เชื่อมต่อระบบ ERP ที่มีอยู่", "Onboarding + ช่วย setup", "White-label (ใส่ logo สำนักงาน)", "SLA + Dedicated support"],
      excluded: [],
      cta: "ติดต่อทีมงาน",
      highlight: false,
      color: "var(--accent)",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-4xl font-bold mb-3 leading-tight" style={{ color: "var(--text)" }}>
          ห้องประชุม AI สำหรับ<span style={{ color: "var(--accent)" }}>สำนักงานบัญชี</span>
        </h1>
        <p className="text-sm sm:text-base mb-8 max-w-2xl" style={{ color: "var(--text-muted)" }}>
          สร้างทีมที่ปรึกษา AI เฉพาะทาง ให้ถกเถียงและสรุปมติเหมือนประชุมจริง ตอบคำถามลูกค้าได้เร็วขึ้น ควบคุมต้นทุนได้
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="https://line.me/ti/p/@ledgio" target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors" style={{ background: "var(--accent)", color: "#000" }}>
            นัดทดลองใช้ฟรี
          </a>
          <a href="#pricing" className="px-6 py-2.5 rounded-lg font-bold text-sm border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            ดูแพ็กเกจราคา
          </a>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text)" }}>
          ความสามารถหลัก
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-xl p-4 flex gap-3"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <b.icon size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
              <div>
                <h3 className="font-bold text-sm mb-0.5" style={{ color: "var(--text)" }}>{b.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text)" }}>
          ตัวอย่างการใช้งาน
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((uc) => (
            <div key={uc.title} className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>{uc.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          แพ็กเกจราคา
        </h2>
        <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>
          ค่า AI เริ่มต้นไม่ถึง 5 บาท/ครั้ง คิดตามการใช้งานจริง — ไม่มีค่าแอบแฝง (ราคายังไม่รวม VAT 7%)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl p-5 flex flex-col"
              style={{
                background: "var(--card)",
                border: plan.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              {plan.highlight && (
                <div className="text-xs font-bold text-center mb-3 py-1 rounded-full" style={{ background: "var(--accent)", color: "#000" }}>
                  แนะนำ
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>{plan.name}</h3>
                <div className="mt-1">
                  <span className="text-2xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                  {plan.period && <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{plan.period}</span>}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{plan.target}</p>
              </div>

              <ul className="flex-1 space-y-1.5 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text)" }}>
                    <span className="mt-0.5" style={{ color: "var(--accent)" }}>✓</span>
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                    <span className="mt-0.5">✗</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-2.5 rounded-lg font-bold text-sm transition-colors cursor-pointer"
                style={{
                  background: plan.name === "Solo" ? "transparent" : plan.highlight ? "var(--accent)" : "var(--accent)",
                  color: plan.name === "Solo" ? "var(--accent)" : "#000",
                  border: plan.name === "Solo" ? "1.5px solid var(--accent)" : "none",
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl p-4 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="font-bold text-sm mb-0.5" style={{ color: "var(--text)" }}>ต้องการติดตั้งบนเซิร์ฟเวอร์ของคุณเอง?</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Self-hosted license เริ่มต้น 29,000 บาท/ปี — รวม setup + training
          </p>
        </div>
      </div>

      {/* Add-on Services */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
          บริการเสริม
        </h2>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          ให้ทีมงานช่วย setup ระบบ สร้าง Agent ที่เหมาะกับงานของคุณ พร้อมสอนใช้จนคล่อง
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "🛠 Setup & Agent Config", price: "3,000 – 5,000", unit: "บาท/ครั้ง", desc: "ช่วยสร้าง Agent ตามประเภทลูกค้า ตั้งค่าทีม Soul Prompt และทดสอบจนใช้งานได้จริง" },
            { title: "🤖 Custom Agent Template", price: "2,000", unit: "บาท/ตัว", desc: "ออกแบบ Agent เฉพาะทาง เช่น ที่ปรึกษา BOI ผู้เชี่ยวชาญ Transfer Pricing หรือตาม scope งานที่ต้องการ" },
            { title: "🎓 Training Workshop", price: "3,000", unit: "บาท/ครั้ง (2 ชม.)", desc: "สอนทีมงานใช้ระบบ ตั้งแต่สร้าง Agent จัดประชุม วิเคราะห์ผล จนถึงเทคนิคการตั้งคำถามให้ได้คำตอบที่ดี" },
          ].map((s) => (
            <div key={s.title} className="rounded-xl p-4 flex flex-col" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>{s.title}</h3>
              <div className="mb-2">
                <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>{s.price}</span>
                <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{s.unit}</span>
              </div>
              <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text)" }}>
          สนใจทดลองใช้งาน?
        </h2>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          ทดลองใช้ฟรี 14 วัน พร้อมให้คำปรึกษาและช่วย setup — ติดต่อเราได้เลย
        </p>
        <a href="https://line.me/ti/p/@ledgio" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-2.5 rounded-lg font-bold text-sm transition-colors" style={{ background: "var(--accent)", color: "#000" }}>
          ติดต่อนัดทดลองใช้
        </a>
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          สอบถามเพิ่มเติม: Line @ledgio · info@ledgio.ai
        </p>
      </div>
    </div>
  );
}
