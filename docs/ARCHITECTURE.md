# OMNIA.AI — Architecture

## Overview

OMNIA.AI เป็น B2C web app สำหรับดูดวง AI ที่สร้างบน Next.js 16 App Router โดยใช้ architecture แบบ monolith (frontend + API ในโปรเจกต์เดียว) deploy ด้วย Docker

```
Browser
  └── Next.js App (เลือก port ว่างตอน deploy)
        ├── App Router Pages      (React Server + Client Components)
        ├── API Routes            (Edge/Node.js handlers)
        ├── Proxy                 (Edge JWT auth, Next.js 16)
        └── Prisma ORM
              └── PostgreSQL 16
        └── ioredis
              └── Redis 7
        └── OpenRouter API
              └── google/gemini-2.5-flash
```

---

## Directory Structure

```
/
├── app/
│   ├── (auth)/              # login, register — no sidebar layout
│   ├── api/
│   │   ├── auth/            # login, register, logout, me
│   │   ├── birth-profile/   # GET/PUT user birth data
│   │   ├── team-research/   # ดูดวง + streaming
│   │   ├── team-agents/     # CRUD agents
│   │   ├── teams/           # CRUD teams
│   │   └── health/          # health check
│   ├── research/            # หน้าดูดวงหลัก
│   ├── profile/             # birth profile form
│   ├── agents/              # manage agents
│   ├── teams/               # manage teams
│   ├── upgrade/             # premium upsell
│   └── settings/            # app settings
│
├── lib/
│   ├── auth.ts              # JWT sign/verify, COOKIE_NAME
│   ├── db.ts                # Prisma singleton client
│   ├── seed-astro-for-user.ts  # seed 5 agents on register
│   ├── rate-limit.ts        # in-memory rate limiter
│   ├── rate-limit-redis.ts  # Redis-backed rate limiter
│   └── openclaw-paths.ts    # OPENCLAW_HOME = ~/.omnia-ai
│
├── prisma/
│   └── schema.prisma        # DB schema
│
└── proxy.ts                 # Edge JWT protection
```

---

## Data Models (Prisma)

```prisma
User
  id, username, passwordHash
  email?, googleId?
  role ("user" | "admin")
  plan ("FREE" | "PREMIUM")
  monthlySessionsUsed, quotaResetAt?
  consentPdpa, consentAt?
  stripeCustomerId?, stripeSubscriptionId?
  ──► agents[]  teams[]  birthProfile?

Agent
  id, name, emoji, soul, role
  provider, apiKeyEncrypted, model
  seniority, active, isSystem
  userId?  ──► User (cascade delete)

Team
  id, name, emoji, description
  userId?  ──► User (cascade delete)
  members ──► TeamAgent[]

TeamAgent
  teamId, agentId, position

BirthProfile
  userId (unique), name
  birthDate, birthTime?, birthPlace?, timezone?
```

---

## Auth Flow

```
POST /api/auth/register
  → validate input (rate limit: 5/IP/hr)
  → bcrypt(password, 12)
  → db.user.create (plan: FREE)
  → seedAstrologyAgentsForUser(userId)  ← 5 agents + 1 team
  → signToken({ sub, username, role })
  → Set-Cookie: bb_token (httpOnly, 8h)
  → redirect /research

proxy.ts (Edge)
  → verifyToken(cookie)
  → if invalid → redirect /login?from=<path>
  → if valid → forward x-user-id, x-username headers
```

> ใน Next.js 16 โปรเจคนี้ใช้ `proxy.ts` แทน `middleware.ts` แล้ว

## User Isolation

API routes ต้องอ่าน `x-user-id` จาก `proxy.ts` และส่งต่อเข้า storage layer เสมอเมื่อจัดการข้อมูลผู้ใช้:

- `Agent` / `Team`: list/create/update/delete scoped ด้วย `userId`; system agents อ่านได้ทุก user แต่แก้ไข/ลบไม่ได้
- `ResearchSession`: user เห็นเฉพาะ session ตัวเอง, admin เห็นทั้งหมด
- `BirthProfile` / `ClientMemory`: ผูกกับ `userId`
- `Token usage` / `Agent stats`: user เห็นเฉพาะ stats ของ agents ที่เข้าถึงได้, admin เห็นทั้งหมด

---

## Streaming Research (ดูดวง)

```
POST /api/team-research/stream
  → รับ { teamId, query, birthProfile? }
  → ดึง agents ของ team (filter by userId)
  → สร้าง prompt per agent (soul + user query)
  → OpenRouter API (google/gemini-2.5-flash)
  → Server-Sent Events stream กลับ client
  → อาจารย์นิรันดร์ (seniority 100) สรุปมติสุดท้าย
```

---

## Security

| Layer | Mechanism |
|-------|-----------|
| Auth | JWT HS256 (jose), httpOnly cookie, 8h TTL |
| Password | bcrypt cost 12 |
| Agent data | AES-256-CBC encrypted souls at rest |
| Rate limit | Redis: 5 register/IP/hr, 20 research/user/hr |
| Middleware | Edge runtime, verifies every request |
| PDPA | consent captured at register, stored in DB |

---

## Deploy

```bash
docker run -d --name omnia-ai --restart unless-stopped --network host \
  -e DATABASE_URL="..." -e REDIS_URL="..." \
  -e JWT_SECRET="..." -e AGENT_ENCRYPT_KEY="..." \
  -e NODE_ENV=production -e PORT=<free-port> -e HOSTNAME=0.0.0.0 \
  -v ~/.omnia-ai:/home/node/.omnia-ai \
  omnia-ai
```

Server: `192.168.2.109:<free-port>` โดยเลือก port ว่างก่อน deploy เพื่อไม่ชนโปรเจคอื่น
