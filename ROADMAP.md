# LEDGIO AI — Production Roadmap

> **สถานะปัจจุบัน:** Production-ready (self-hosted) — Auth + DB + UX Thai accounting ครบถ้วน พร้อมให้ลูกค้าใช้งาน  
> **อัปเดตล่าสุด:** 2026-04-21 | **เวอร์ชัน:** v1.14.1

---

## สถานะ Bug ที่แก้แล้ว

| # | Bug | สถานะ |
| - | --- | ------ |
| 1 | Dockerfile healthcheck ใช้ `localhost` → Alpine resolve เป็น IPv6 `[::1]` ทำให้ container unhealthy | ✅ แก้แล้ว (→ `127.0.0.1`) |
| 2 | Token analytics แสดง 0 — ตรวจสอบแล้วพบว่า API ถูกต้อง, key mapping ใช้ `totalInputTokens`/`totalOutputTokens` ถูกต้อง | ✅ ยืนยันแล้ว |
| 3 | Docker build cache กิน disk 66 GB → disk เต็ม 85% | ✅ แก้แล้ว — `docker builder prune` เหลือ 27% |
| 4 | ไม่มี Nginx — port 3003 เปิด public ตรง, ไม่มี reverse proxy | ✅ ติดตั้ง Nginx แล้ว port 80 → 3003 |
| 5 | UFW ไม่ได้เปิด port 80 → เข้า `http://192.168.2.109/` ไม่ได้ | ✅ แก้แล้ว — `ufw allow 80/tcp` |

---

## Phase 1 — Authentication ✅ เสร็จแล้ว (2026-04-20)

**เป้าหมาย:** ป้องกันไม่ให้ทุกคนที่รู้ IP:port เข้าใช้ระบบได้

### ✅ เสร็จแล้ว

- [x] `proxy.ts` — block ทุก route (Next.js 16 ใช้ `proxy.ts` แทน `middleware.ts`), API → 401 JSON, Page → redirect `/login`
- [x] `app/(auth)/login/page.tsx` — Thai login form, route group แยกจาก root layout (ไม่มี Sidebar)
- [x] `app/api/auth/login` — bcrypt verify + httpOnly cookie (JWT HS256, 8h) — set ผ่าน raw `Set-Cookie` header
- [x] `app/api/auth/logout` — clear cookie
- [x] `app/api/auth/me` — return current user info
- [x] `lib/auth.ts` — Edge-safe JWT helper (jose), lazy secret eval
- [x] User เก็บใน Postgres table `users` (bcrypt cost 12)
- [x] `scripts/seed-admin.ts` — seed superadmin / superadmin (ใช้ `npm run seed:admin`)
- [x] Sidebar — ซ่อนบน `/login` โดยอ่าน `x-pathname` header จาก proxy, logout button
- [x] JWT_SECRET เพิ่มใน docker run env vars บน server
- [x] **Cookie Secure fix** — ลบ `ENV NODE_ENV=production` ออกจาก Dockerfile เพราะ Next.js 16 inject `Secure` อัตโนมัติใน production mode ทำให้ cookie ไม่ทำงานบน HTTP

### ยังเหลือ (อนาคต)

- [ ] Multi-user isolation — ถ้าต้องการหลาย user แยก data กัน (เพิ่ม `userId` field)

---

## Phase 2 — Storage Migration ✅ เสร็จแล้ว (2026-04-19)

**เป้าหมาย:** เปลี่ยนจาก JSON files → database เพื่อรองรับ concurrent users

### ✅ เสร็จแล้ว

- [x] **Postgres** — ใช้ `ledgioai-db` (172.17.0.3:5432) database `bossboard`
- [x] Prisma v5 schema — 10 tables: agents, agent_knowledge, teams, team_agents, settings, research_sessions, research_messages, agent_stats, agent_daily_stats, client_memory
- [x] `lib/agents-store-db.ts` — drop-in Postgres replacement (async)
- [x] `lib/agents-store.ts` — barrel re-export → routes ทุกตัวได้ DB โดยอัตโนมัติ
- [x] Data migration script (`scripts/migrate-json-to-db.ts`) — run สำเร็จ: 7 agents, 1 team, 29 sessions/95 messages
- [x] JSON backup ยังอยู่ที่ `~/.bossboard/*.json` (ไม่ถูกลบ)
- [x] Knowledge file content ยังเก็บบน filesystem (`~/.bossboard/knowledge/`), metadata อยู่ใน DB
- [x] **Redis rate limiting** — `lib/rate-limit-redis.ts` sorted-set sliding window, fallback to in-memory

### Backup (ยังเหลือ)

- [ ] Backup cron job สำหรับ database (pg_dump → schedule)

---

## Phase 3 — Production Hardening

**เป้าหมาย:** ระบบเสถียร ปลอดภัย monitor ได้

### งานที่ต้องทำ

- [ ] **Nginx reverse proxy** — SSL termination, rate limiting ระดับ network
  - Let's Encrypt certificate (certbot)
  - Config: `proxy_pass http://127.0.0.1:3003`
- [x] **Rate limit ครอบทุก API** — Redis sliding window ครอบทุก POST endpoint แล้ว (2026-04-19)
- [ ] **Structured logging** — แทน `console.log` ด้วย pino หรือ winston
  - request ID per request
  - error stack trace ไม่ส่งหา client
- [ ] **Uptime monitoring** — Uptime Kuma หรือ Better Uptime สำหรับ alert
- [ ] **Docker healthcheck start-period** เพิ่มเป็น 60s สำหรับ cold start
- [ ] **Environment variable validation** — fail fast ถ้า config ขาด

---

## Phase UX — Thai Accounting UX Overhaul ✅ เสร็จแล้ว (2026-04-21)

**เป้าหมาย:** ทำให้พนักงานบัญชีอายุ 25–50 ใช้ระบบได้โดยไม่ต้องรู้เรื่อง AI/LLM

### ✅ เสร็จแล้ว

- [x] **Shared components:** Tooltip, Alert, CostDisplay, Breadcrumb, Input, Select, Table, Tabs
- [x] **`lib/glossary.ts`:** 22 terms (AI/Cost/Accounting/UI) + `/glossary` page
- [x] **Thai labels ทุกหน้า:** "Agent"→"ที่ปรึกษา AI", "Session"→"การประชุม", "Soul"→"บทบาท"
- [x] **Agent wizard mode:** easy (3-tier model) / expert (full list) — default = easy
- [x] **THB cost display:** `lib/pricing.ts` + tokens hero ≈ ฿X + budget progress bar
- [x] **Monthly budget setting:** localStorage `monthlyBudgetTHB` + USD→THB rate config
- [x] **Mobile bottom-sheet modal:** `md:items-center` pattern ทุก Modal
- [x] **Login polish:** password toggle, forgot link, dynamic year
- [x] **Guide:** default expand "get-started", FAQ multi-expand
- [x] **Admin:** Thai role labels ("ผู้จัดการระบบ"/"ผู้ใช้ทั่วไป"), clearer delete confirm
- [x] **Benefits:** VAT note, CTA differentiation, Solo "ทดลองฟรี 14 วัน"
- [x] **Dashboard:** Chat vs Research disambiguation cards
- [x] **`/chat` agent selector page (v1.14.1):** หน้าเลือก agent ก่อนเข้า chat — system agents ก่อน, user agents ตาม; empty state; ไม่ 404 แล้ว
- [x] **Sidebar "ถามด่วน" nav item (v1.14.1):** MessageCircle icon ลิงก์ `/chat` ใน group จัดการ
- [x] **Agent card 💬 button (v1.14.1):** ปุ่มลัด `/chat/[id]` บนทุก agent card ใน `/agents`
- [x] **Sidebar active state fix (v1.14.1):** `/chat` ใช้ exact match — ไม่ highlight เมื่ออยู่ที่ `/chat/[agentId]`

---

## Phase 4 — Business Features

**เป้าหมาย:** feature สำหรับลูกค้าจริง

### รายการที่ต้องทำ

- [ ] **Plan enforcement** — จำกัดตาม pricing plan (Solo/Starter/Pro/Enterprise)
  - จำกัดจำนวน agents, sessions, users
  - แสดง upgrade prompt เมื่อถึง limit
- [ ] **Usage billing tracking** — บันทึก token usage ต่อ user ต่อเดือน
- [ ] **Admin dashboard** (`/admin`) — manage users, plans, API keys
- [ ] **Audit log** — บันทึกการกระทำสำคัญ (สร้าง/ลบ agent, export ประชุม ฯลฯ)
- [ ] **Email notifications** — แจ้งเตือนเมื่อ plan ใกล้ครบ limit
- [ ] **Export ประชุม PDF** — นอกจาก Markdown ที่มีอยู่แล้ว
- [ ] **Custom domain** per enterprise customer (white-label)

---

## Phase 5 — Scale & Reliability

**เป้าหมาย:** รองรับ traffic จริง

### งานที่ต้องทำ

- [x] **Redis สำหรับ rate limit** — ✅ เสร็จแล้ว (2026-04-19) ใช้ `ledgioai-redis` 172.17.0.4:6379
- [ ] **SSE connection management** — จำกัด concurrent streaming connections ต่อ user
- [ ] **Background job queue** — สำหรับ long-running meeting sessions (Bull/BullMQ)
- [ ] **CDN สำหรับ static assets** — ลด load บน server
- [ ] **Horizontal scaling** — Docker Swarm หรือ Kubernetes (ถ้าจำเป็น)
- [ ] **Database replication** — read replica สำหรับ analytics queries

---

## Cloud Deployment Spec

ดูรายละเอียด spec การเช่า cloud, ราคา, Nginx config, Docker Compose production ได้ที่ [docs/CLOUD_SPEC.md](docs/CLOUD_SPEC.md)

---

## Infrastructure ปัจจุบัน (อัปเดต 2026-04-19)

```
Server: 192.168.2.109 (Ubuntu 24.04, Docker)
Disk: 109 GB / ใช้ ~28 GB (27%) — หลัง prune build cache

Network (UFW):
├── port 22   SSH
├── port 80   Nginx → bossboard :3003  ✅ เปิดแล้ว
├── port 3003  bossboard (direct)
├── port 3000  openclaw-admin
├── port 3001  (reserved)
├── port 4000  (reserved)
└── port 5000  (reserved)

Nginx: /etc/nginx/sites-enabled/bossboard
├── port 80 → proxy_pass http://127.0.0.1:3003
└── /api/team-research/stream → SSE config (no buffering, timeout 600s)

BossBoard env vars (docker run):
├── DATABASE_URL=postgresql://ledgioai:ledgioai_dev_2026@172.17.0.3:5432/bossboard
├── REDIS_URL=redis://172.17.0.4:6379
└── AGENT_ENCRYPT_KEY=e2806590b15b4e0108a5a375c6968639

SSH เข้า server:
└── sshpass -p 'boss123456' ssh -o StrictHostKeyChecking=no bosscatdog@192.168.2.109

Containers รันอยู่:
├── bossboard         :3003  ← LEDGIO AI (this app) ✅ healthy
│                               └── Postgres + Redis connected ✅
├── ledgioai          :3004  ← App อื่น (src-app) ✅ healthy
├── ledgioai-db       :5436  ← Postgres 16 ✅
│   ├── bridge IP: 172.17.0.3:5432
│   ├── user: ledgioai  password: ledgioai_dev_2026
│   └── database: bossboard (10 tables)
├── ledgioai-redis    :6381  ← Redis 7 ✅
│   └── bridge IP: 172.17.0.4:6379  (no password)
├── openclaw-admin    :3000  ← Admin panel ✅
├── centrix-web       :3002  ← Centrix frontend ✅
├── centrix-api       :5001  ← Centrix backend ✅
├── centrix-postgres  :5434  ← Postgres 16 ✅
├── centrix-redis     :6380  ← Redis 7 ✅
└── openclaw-postgres :5432  ← Postgres 16 ✅
```

---

## Priority ลำดับงาน

| Priority | Phase | เวลาประมาณ | สถานะ |
|----------|-------|-----------|-------|
| 🔴 ด่วนมาก | Phase 1: Authentication | 2–3 วัน | ✅ เสร็จแล้ว (2026-04-20) |
| 🟠 สำคัญ | Phase 2: Storage → Postgres + Redis | 3–5 วัน | ✅ เสร็จแล้ว (2026-04-19) |
| 🟡 ก่อน prod | Phase 3: Nginx SSL + Monitoring | 1–2 วัน | 🔄 บางส่วน (Nginx ✅, SSL ⏳) |
| 🟢 UX | Phase UX: Thai Accounting UX Overhaul | 7 วัน | ✅ เสร็จแล้ว (2026-04-21) v1.14.0 |
| 🟢 หลัง launch | Phase 4: Business Features | 2–4 สัปดาห์ | ⏳ ยังไม่เริ่ม |
| 🔵 อนาคต | Phase 5: Scale | ตามความต้องการ | ✅ Redis ✅ (ที่เหลือ ⏳) |
