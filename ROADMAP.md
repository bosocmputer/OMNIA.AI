# OMNIA.AI — Roadmap

> **สถานะปัจจุบัน (2026-04-29):** พร้อม soft launch ให้ลูกค้าทดลองกลุ่มแรก ระบบหลักพร้อมใช้งานจริงแบบ MVP พร้อมเครดิต/PromptPay manual

---

## ✅ Phase 1 — Fork & Setup (เสร็จแล้ว)

- [x] Fork จาก BossBoard → OMNIA-AI
- [x] ตั้งค่า Git remote: `https://github.com/bosocmputer/OMNIA.AI.git`
- [x] ปรับ `package.json`: name `omnia-ai`, version `0.1.0`

## ✅ Phase 2 — Rebrand + Dark/Gold Theme (เสร็จแล้ว)

- [x] `app/layout.tsx` — title/description ภาษาไทย
- [x] `app/globals.css` — Dark Gold theme (`#1A1A1A` / `#C9A84C`)
- [x] `lib/i18n.tsx` — brand names + nav keys ภาษาไทย
- [x] `app/sidebar.tsx` — nav groups: ดูดวง / โปรไฟล์ / จัดการ / ตั้งค่า
- [x] `lib/openclaw-paths.ts` — `~/.omnia-ai`
- [x] `app/components/Onboarding.tsx` — Welcome flow ภาษาไทย
- [x] `app/(auth)/login/page.tsx` — brand + register link

## ✅ Phase 3 — Prisma Schema (เสร็จแล้ว)

- [x] `Agent` model: เพิ่ม `userId` (user-scoped agents)
- [x] `Team` model: เพิ่ม `userId` (user-scoped teams)
- [x] `User` model: เพิ่ม email, plan, googleId, PDPA consent, quota fields
- [x] `BirthProfile` model: ใหม่ — เก็บข้อมูลวันเกิดต่อ user

## ✅ Phase 4 — B2C Auth (เสร็จแล้ว)

- [x] `app/api/auth/register/route.ts` — register API พร้อม rate limit + bcrypt
- [x] `app/(auth)/register/page.tsx` — หน้าสมัครสมาชิก + PDPA checkbox
- [x] `proxy.ts` — Edge JWT protection ทุก route (Next.js 16 convention)

## ✅ Phase 5 — Astrology UX (เสร็จแล้ว)

- [x] `lib/seed-astro-for-user.ts` — seed 5 โหราจารย์ + 1 ทีม ต่อ user ใหม่
- [x] `app/api/birth-profile/route.ts` — GET/PUT birth profile
- [x] `app/profile/page.tsx` — ฟอร์มข้อมูลวันเกิด
- [x] `app/upgrade/page.tsx` — หน้าเครดิต/แพ็กเกจ/PromptPay manual
- [x] `public/assets/logo/TITLELOGO.svg` — Geometric Yantra logo (Bronze Gold / Dark)

---

## ✅ Phase 6 — Deploy รอบแรก (เสร็จแล้ว)

- [x] สร้าง DB `omniadb` บน server (`ledgioai-db` port 5436)
- [x] `prisma migrate deploy` บน server (4 migrations applied)
- [x] Docker build + run บน `192.168.2.109:3005`
- [x] Deploy ผ่าน `scripts/deploy-git.sh`
- [x] Health check ผ่าน `/api/health`

## ✅ Phase 7 — Soft Launch Monetization (เสร็จแล้ว)

- [x] ระบบเครดิต: Starter 99 บาท / Focus 199 บาท / Pro 499 บาท
- [x] ราคาอ่านดวง: ถามเร็ว 29 เครดิต / สภา OMNIA 59 เครดิต / ถามต่อ 19 เครดิต
- [x] เครดิตฟรี user ใหม่ 29 เครดิต สำหรับทดลองถามเร็ว 1 ครั้ง
- [x] PromptPay QR manual ในหน้า `/upgrade`
- [x] Admin review รายการเติมเครดิตที่ `/admin/topups`
- [x] Server-side credit guard ก่อนเริ่มอ่านดวง
- [x] Credit usage summary หลังจบคำทำนาย

## 🧪 Phase 8 — Customer Trial Checklist (กำลังรอทดสอบจริง)

- [ ] ทดสอบ user ใหม่สมัครแล้วได้ 29 เครดิต
- [ ] ทดสอบถามเร็ว 1-2 หมอดูแล้วเครดิตถูกหัก 29
- [ ] ทดสอบเครดิตไม่พอแล้วถูกพาไปหน้าเติมเครดิต
- [ ] ทดสอบเลือกแพ็ก โอน PromptPay และแจ้งหมายเหตุ
- [ ] ทดสอบ admin อนุมัติแล้วเครดิตเข้า
- [ ] เก็บ feedback จากลูกค้า 10-30 คน: แม่นไหม, ยาวไหม, อ่านง่ายไหม, ยอมจ่ายไหม, ราคาโอเคไหม

## 🔜 Phase 9 — Payment Automation

- [ ] Dynamic PromptPay QR ตามยอดแพ็ก เพื่อลดการกรอกยอดผิด
- [ ] Slip OCR หรือ payment gateway เพื่อยืนยันยอดอัตโนมัติ
- [ ] Terms / Refund / Privacy สำหรับเก็บเงินจริง
- [ ] Admin revenue summary

## 🔜 Phase 10 — PWA

- [ ] `next-pwa` หรือ `@ducanh2912/next-pwa`
- [ ] manifest.json: name OMNIA.AI, theme_color `#C9A84C`
- [ ] Service worker offline cache
- [ ] iOS install prompt

## 🔜 Phase 11 — Google OAuth

- [ ] `app/api/auth/google/route.ts` — OAuth callback
- [ ] Merge account ถ้า email ซ้ำ
- [ ] "เข้าสู่ระบบด้วย Google" button บน login/register

## 🔜 Phase 12 — Subscription / Premium

- [ ] Daily Insight ส่วนตัว
- [ ] Life Timeline / Archive
- [ ] Export PDF รายงานคำทำนาย
- [ ] Follow-up reading จากคำทำนายเดิม
- [ ] Subscription หรือแพ็กเครดิตรายเดือน

## 🔮 Future

- [ ] Shareable Reading Card (image export)
- [ ] Consensus Score UI (progress bars 5 ศาสตร์)
- [ ] ประวัติดูดวง (reading history per user)
- [ ] Push notifications (PWA)
- [ ] Multi-language (EN)
