# OMNIA.AI — UX Design Spec

> **Status:** Phase 1-7 เสร็จสมบูรณ์ — demo/soft launch พร้อม

---

## Brand Identity

| Element | Value |
|---------|-------|
| Name | OMNIA.AI |
| Tagline | ที่ปรึกษาพยากรณ์ AI |
| Sub-tagline | Collaborative Astrology Intelligence |
| Primary BG | `#1A1A1A` (Dark Charcoal) |
| Accent | `#C9A84C` (Bronze Gold) |
| Text | `#F5F5F5` |
| Border | `#2E2E2E` |
| Light BG | `#FAF7F0` (Soft Gold) |
| Font | System sans-serif (Inter ถ้า load ได้) |

---

## Navigation Structure (Sidebar)

```
OMNIA.AI
ที่ปรึกษาพยากรณ์ AI

[ไม่มีหัวข้อ]
  🏠 Dashboard          /

ดูดวง
  🔮 ดูดวง              /research

โปรไฟล์
  👤 โปรไฟล์วันเกิด     /profile
  ⚡ อัปเกรด            /upgrade

จัดการ
  🤖 โหราจารย์ AI       /agents
  👥 ทีม                /teams
  🪙 Token Usage        /tokens

ตั้งค่า
  ⚙️ ตั้งค่า            /settings
  📖 คู่มือ             /guide
```

---

## Page Designs

### Login (`/login`)
- Full-screen dark bg + ambient gold blobs + grid pattern
- Logo: `TITLELOGO.png`
- Brand: **OMNIA** + **.AI** (gold)
- Subtitle: "Collaborative Astrology Intelligence"
- Fields: username, password
- Link: "สมัครสมาชิกฟรี" → `/register`
- Footer: "เพื่อความบันเทิง..."

### Register (`/register`)
- Same dark bg layout
- Fields: ชื่อผู้ใช้ (required), อีเมล (optional), รหัสผ่าน, ยืนยันรหัสผ่าน
- PDPA checkbox (required)
- On success: redirect `/research` + seed 5 agents

### Research (`/research`)
- หน้าหลัก — เลือก team + กรอก query
- Streaming response (SSE)
- แต่ละ agent ตอบทีละคน, อาจารย์นิรันดร์สรุปสุดท้าย

### Profile (`/profile`)
- ฟอร์ม: ชื่อ, วันเกิด, เวลาเกิด (optional), สถานที่เกิด (optional), timezone (optional)
- Auto-save feedback

### Upgrade (`/upgrade`)
- Credit wallet balance
- PromptPay QR/manual top-up
- Package selector: Starter, Focus, Pro
- Top-up history + credit transaction history
- Admin mode state: superadmin ไม่หักเครดิต และใช้หน้านี้ทดสอบ customer flow

### Sidebar Credit Indicator
- User เห็นเครดิตคงเหลือได้ทุกหน้า
- Low balance มีจุดเตือน
- Admin เห็น `Admin mode · ไม่หักเครดิต`

### Research Composer
- แสดงราคาคำถามตามจำนวนหมอดูที่เลือก
- แสดงเครดิตคงเหลือก่อนกดส่ง
- Admin เห็นว่าไม่ถูกหักเครดิต

---

## Component Patterns

- **Inputs**: `rounded-xl px-4 py-2.5`, focus ring `var(--accent)` + glow `var(--accent-8)`
- **Buttons (primary)**: bg `var(--accent)`, color `var(--bg)`, shadow `var(--accent-20)`
- **Cards**: bg `var(--card)`, border `var(--border)`, `rounded-2xl`
- **Ambient blobs**: `radial-gradient(circle, var(--accent) 0%, transparent 70%)`, opacity 0.12
- **Grid overlay**: `backgroundSize: "48px 48px"`, opacity 0.15

---

## Onboarding Flow

3 steps (localStorage key: `omnia-ai-onboarding-done`):
1. "ยินดีต้อนรับสู่ OMNIA.AI"
2. "5 หมอดู AI พร้อมใช้งาน"
3. "เริ่มถามดูดวง"
