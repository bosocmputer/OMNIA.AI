# OMNIA.AI — Roadmap

> **สถานะปัจจุบัน:** Phase 1-5 เสร็จสมบูรณ์ — พร้อม deploy รอบแรก

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
- [x] `app/upgrade/page.tsx` — Premium placeholder
- [x] `public/assets/logo/TITLELOGO.svg` — Geometric Yantra logo (Bronze Gold / Dark)

---

## 🚀 Phase 6 — Deploy รอบแรก (กำลังดำเนินการ)

- [x] สร้าง DB `omniadb` บน server (`ledgioai-db` port 5436)
- [x] `prisma migrate deploy` บน server (4 migrations applied)
- [ ] Docker build + run บน `192.168.2.109:<free-port>` โดยไม่ชนโปรเจคอื่น
- [ ] ทดสอบ register → seed agents → ดูดวง end-to-end

## 🔜 Phase 7 — PWA

- [ ] `next-pwa` หรือ `@ducanh2912/next-pwa`
- [ ] manifest.json: name OMNIA.AI, theme_color `#C9A84C`
- [ ] Service worker offline cache
- [ ] iOS install prompt

## 🔜 Phase 8 — Google OAuth

- [ ] `app/api/auth/google/route.ts` — OAuth callback
- [ ] Merge account ถ้า email ซ้ำ
- [ ] "เข้าสู่ระบบด้วย Google" button บน login/register

## 🔜 Phase 9 — Freemium Quota

- [ ] Middleware ตรวจ `monthlySessionsUsed` vs quota (FREE: 10/เดือน)
- [ ] Auto-reset `quotaResetAt` ทุกต้นเดือน
- [ ] Quota bar บน sidebar

## 🔜 Phase 10 — Stripe Premium

- [ ] Stripe Checkout Session
- [ ] Webhook: `checkout.session.completed` → plan = "PREMIUM"
- [ ] `app/upgrade/page.tsx` → Stripe checkout flow จริง
- [ ] Portal จัดการ subscription

## 🔮 Future

- [ ] Shareable Reading Card (image export)
- [ ] Consensus Score UI (progress bars 5 ศาสตร์)
- [ ] ประวัติดูดวง (reading history per user)
- [ ] Push notifications (PWA)
- [ ] Multi-language (EN)
