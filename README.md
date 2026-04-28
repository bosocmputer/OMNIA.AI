# OMNIA.AI — ที่ปรึกษาพยากรณ์ AI

> **สภาโหราจารย์ AI 5 ศาสตร์** — โหราศาสตร์ไทย · BaZi จีน · เลข 7 ตัว · ยูเรเนียน · ทักษามหาพยากรณ์

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-gold)](LICENSE)

---

## ✨ คืออะไร

OMNIA.AI คือแพลตฟอร์ม B2C สำหรับการดูดวงพยากรณ์ด้วย AI ที่รวมศาสตร์พยากรณ์หลายแขนงไว้ในที่เดียว โดยมี "สภาโหราจารย์ AI" ที่ประกอบด้วยผู้เชี่ยวชาญ 5 ท่าน ซึ่งวิเคราะห์และสรุปมติร่วมกัน

### โหราจารย์ AI 5 ท่าน

| # | ชื่อ | ศาสตร์ | บทบาท |
|---|------|--------|-------|
| 🔯 | ปรมาจารย์วิมล | โหราศาสตร์ไทย | วิเคราะห์ดาวนพเคราะห์ ลัคนา ทักษาจร |
| ☯️ | ซือฝู่หลิน | BaZi จีน (สี่เสา) | Day Master ธาตุ 5 Useful God |
| 🔢 | อาจารย์ศักดา | เลข 7 ตัว 9 ฐาน | เลขเด่น เลขขาด โชคชะตา |
| 🔭 | ดร.เทพฤทธิ์ | ยูเรเนียนโหราศาสตร์ | Midpoint Symmetry Personal Points |
| 🧭 | อาจารย์นิรันดร์ | ทักษามหาพยากรณ์ | **ผู้สรุปมติ** Consensus Score |

---

## 🚀 Quick Start (Local Dev)

### สิ่งที่ต้องมี

- Node.js 22+
- PostgreSQL 16+
- Redis 7+
- npm (ใช้ `package-lock.json`)

### ติดตั้ง

```bash
git clone https://github.com/bosocmputer/OMNIA.AI.git
cd OMNIA.AI
npm install
cp .env.example .env.local
# แก้ไข .env.local ให้ครบ
npx prisma migrate dev
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## 🏗 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes, Prisma ORM v5 |
| Database | PostgreSQL 16 |
| Cache / Rate-limit | Redis 7 (ioredis) |
| Auth | JWT HS256 (jose) + bcryptjs, httpOnly cookie |
| AI | OpenRouter → `google/gemini-2.5-flash` |
| Deploy | Docker + `--network host` |

---

## 📁 โครงสร้างโปรเจกต์

```
app/
├── (auth)/           # login, register pages
├── api/
│   ├── auth/         # login, register, logout
│   ├── birth-profile/# ข้อมูลวันเกิด
│   ├── team-research/# ดูดวง streaming API
│   ├── team-agents/  # CRUD agents
│   └── teams/        # CRUD teams
├── research/         # หน้าดูดวงหลัก
├── profile/          # โปรไฟล์วันเกิด
├── agents/           # จัดการโหราจารย์ AI
├── teams/            # จัดการทีม
├── upgrade/          # Premium (coming soon)
└── settings/         # ตั้งค่า

lib/
├── auth.ts           # JWT sign/verify
├── db.ts             # Prisma client
├── seed-astro-for-user.ts  # seed 5 agents per user
└── rate-limit.ts     # Redis rate limiter

prisma/
└── schema.prisma     # User, Agent, Team, BirthProfile
```

---

## 🌙 Theme

Dark/Gold — สีพื้นหลัง `#1A1A1A` · Accent `#C9A84C` (Bronze Gold) · Text `#F5F5F5`

---

## 🔐 Data Isolation

ข้อมูลหลักที่ผู้ใช้สร้างเองถูกผูกกับ `userId`: agents, teams, birth profile, research sessions และ client memory. ระบบ auth อยู่ใน `proxy.ts` ตาม convention ของ Next.js 16 และส่ง `x-user-id` / `x-user-role` ให้ API routes หลัง verify JWT แล้ว

## ⚠️ ข้อกำหนด

ผลการดูดวงจาก OMNIA.AI **เพื่อความบันเทิงและแรงบันดาลใจเท่านั้น** — ไม่ใช่คำทำนายเชิงวิชาชีพ ไม่ควรใช้ตัดสินใจด้านการแพทย์ กฎหมาย หรือการเงิน

---

## 📄 License

MIT © 2026 OMNIA.AI
