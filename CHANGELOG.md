# Changelog

## 2026-04-29 — v1.15.0: Soft Launch Monetization + PromptPay Credits

### Monetization
- **Credit wallet MVP:** เพิ่มระบบเครดิตแบบใช้ตามจริง แพ็ก Starter 99 บาท, Focus 199 บาท, Pro 499 บาท
- **Reading prices:** ถามเร็ว 29 เครดิต, สภา OMNIA 59 เครดิต, ถามต่อ 19 เครดิต
- **Welcome credits:** สมาชิกใหม่ได้เครดิตฟรี 29 เครดิตอัตโนมัติ เพื่อทดลองถามเร็ว 1 ครั้งก่อนจ่ายเงินจริง
- **PromptPay manual top-up:** หน้าเติมเครดิตแสดง QR PromptPay จริง, ยอดที่ต้องโอนตามแพ็ก, หมายเหตุโอนเงิน และสถานะรายการเติมเครดิต
- **Admin top-up review:** เพิ่มหน้า admin ตรวจรายการเติมเครดิตและอนุมัติ/ปฏิเสธ ก่อนเครดิตเข้ากระเป๋า
- **Server-side credit guard:** Streaming API ตรวจเครดิตบน server ก่อนเริ่มอ่านดวง และหักเครดิตเมื่อเริ่ม session สำเร็จ

### Product & UX
- **Theme refresh:** ปรับทั้ง app จากม่วงดำเป็นโทน dark green / antique gold ให้ดู mature และเป็น product มากขึ้น
- **Guide / Premium / Agents polish:** ปรับหน้าใช้งานหลักให้ professional ขึ้น ลดความรู้สึกเหมือน mockup หรือ AI-generated UI
- **Quick summary UI:** ปรับ block สรุปจาก OMNIA.AI ให้อ่านเร็วขึ้นและใช้พื้นที่น้อยลง
- **Astrology prompt tuning:** ปรับ prompt ของทุก agents ให้ตอบตรงขึ้น กล้าทักเรื่องที่ไม่ดี และลดคำตอบกว้าง/หวานเกินไป
- **Feedback + Analytics:** เพิ่ม dashboard เล็ก ๆ สำหรับจำนวนคำทำนาย, หมอดูที่ถูกเลือกบ่อย, topic ที่ถามเยอะ และ feedback รวม

### Current Status
- พร้อม soft launch ให้ลูกค้าทดลองกลุ่มแรก 10-30 คน
- สิ่งที่ต้องทดสอบต่อ: register →เครดิตฟรี→ถามดวง→เครดิตหมด→เติม PromptPay→admin อนุมัติ→ถามต่อ
- สิ่งที่ยังไม่ทำ: Dynamic PromptPay QR ตามยอดแพ็ก, slip OCR/payment gateway, terms/refund/privacy สำหรับเก็บเงินจริง

## 2026-04-27 — v1.14.3: User Isolation Hardening + Safe Deploy Docs

### Bug Fixes
- **Agents/Teams isolation:** API list/create/update/delete now scopes user-owned agents and teams by `x-user-id`; system agents remain readable but cannot be modified or deleted by users.
- **Team membership validation:** Teams can only include agents visible to the current user, preventing cross-user agent references.
- **Research stream session guard:** Existing streaming sessions are checked against the current user before reuse.
- **Token usage / agent stats:** Non-admin users now see only stats for their accessible agents; admins still see global usage.
- **Knowledge routes:** Agent knowledge endpoints verify agent access before list/upload/delete.
- **Runtime storage path:** DB/JSON stores now use `OPENCLAW_HOME` (`~/.omnia-ai`) instead of the old `~/.bossboard` path, so knowledge and encryption keys persist in the mounted OMNIA volume.
- **Docker healthcheck:** Healthcheck now respects the dynamic `PORT` env instead of hard-coding port 3000.
- **Docker networking:** OMNIA now runs like the other web apps with bridge publish (`host:3005 -> container:3000`) instead of `--network host`, and links to `ledgioai-db` / `ledgioai-redis` for DB/Redis access.

### Docs & Deploy
- Updated docs for Next.js 16 `proxy.ts`, npm/package-lock usage, user isolation, and dynamic deploy port selection.
- Replaced old BossBoard deploy script with `scripts/deploy.sh` scoped to `/home/bosscatdog/omnia-ai` and Docker container `omnia-ai`.
- Deploy script now chooses/reuses a safe candidate port, preserves `.env.production`, and avoids killing arbitrary processes by port.

## 2026-04-21 — v1.14.2: Next.js 16 Fix + DB Setup + SVG Logo

### Fixes
- **Next.js 16 migration:** ลบ `middleware.ts` (deprecated) — merge logic ทั้งหมด (public routes, x-username header, API 401 response) เข้า `proxy.ts` ตาม Next.js 16 convention
- **`next.config.mjs`:** ย้าย `outputFileTracingIncludes` ออกจาก `experimental` → top-level (Next.js 16 breaking change)
- **`node_modules` reinstall:** แก้ `Cannot find module '../server/require-hook'` ด้วย clean install → Next.js v16.2.4

### Infrastructure
- **สร้าง `omniadb`** บน server `ledgioai-db:5436` via SSH (`docker exec ledgioai-db psql`)
- **Prisma migrate deploy:** apply 4 migrations ขึ้น server DB สำเร็จ
- **`.env.local`:** สร้างไฟล์ชี้ไปที่ server DB/Redis (`192.168.2.109`)

### Logo
- **`public/assets/logo/TITLELOGO.svg` (new):** SVG logo ใหม่ — Geometric Yantra / Shatkona (สองสามเหลี่ยมซ้อน), วงแหวน 4 ชั้น, tick marks, inner hexagon, center bindu, Bronze Gold `#C9A84C` บน Dark `#1A1A1A`, glow effects — แทน TITLELOGO.png
- อัปเดต reference ทั้ง 5 จาก `.png` → `.svg`: login, register, sidebar (3 positions)

---

## 2026-04-21 — v1.14.1: /chat Agent Selector Page

- **`app/chat/page.tsx` (new):** หน้า selector agent — แสดง system agents (DBD/RD) ก่อน แล้วตาม user agents; คลิก → `/chat/[agentId]`; empty state ลิงก์ไป `/agents`
- **Sidebar:** เพิ่ม "ถามด่วน" (MessageCircle icon) ใน group จัดการ ลิงก์ไป `/chat`
- **Agent cards:** เพิ่มปุ่ม 💬 ถามด่วน บนทุก agent card ใน `/agents` → ลิงก์ `/chat/[id]`
- **i18n:** เพิ่ม `nav.chat` key (th: "ถามด่วน", en: "Quick Chat")
- Fix: Dashboard card "ถามด่วน" href="/chat" → ไม่ 404 แล้ว

## 2026-04-21 — v1.14.0: UX Overhaul Phase 3–5 (Wizard + THB Budget + Mobile)

### Phase 3 — Core Flow

- **Agent wizard mode:** โหมด "ง่าย/ผู้เชี่ยวชาญ" ในหน้า Agents — โหมดง่ายแสดง 3 ระดับ (ประหยัด / แนะนำ / คุณภาพสูง) แทน dropdown model เต็ม
- **Chat vs Research disambiguation:** Dashboard มี 2 card อธิบายว่าโหมดไหนใช้เมื่อไหร่
- **Research clarity:** phase labels → "เสนอความเห็น / แลกเปลี่ยน / สรุป"
- **Web search toggle warning:** Toast "อาจเพิ่มค่าใช้จ่าย Token" เมื่อเปิด Web Search

### Phase 4 — Cost in THB

- **`lib/pricing.ts` (new):** MODEL_PRICING + `tokensToTHB()` + `formatTHB()` helpers, USD→THB rate จาก localStorage
- **Tokens page hero:** ค่าใช้จ่ายรวมเป็นบาท (≈ ฿X) ใหญ่กว่า token count
- **Budget progress bar:** ถ้าตั้ง monthly budget ใน Settings → แสดง % ใช้ไป + warning สีส้ม (≥80%) / แดง (เกินงบ)
- **Per-agent breakdown:** แสดง THB คู่ token count
- **Agents pricing:** template `recommendedReason` เปลี่ยนจาก "$0.10/$0.40 per 1M" → "ค่าพิมพ์ ฿3.6 / ตอบ ฿14.4 ต่อ 1 ล้านคำ"
- **Settings Budget section (new):** set budget + USD→THB rate, persist ไปที่ localStorage

### Phase 5 — Mobile + Login + Guide + Admin + Benefits

- **Modal mobile bottom-sheet:** `md:items-center` + `md:rounded-xl` → mobile ขึ้นจากล่างเหมือน native sheet
- **Login polish:** password show/hide toggle (Eye icon), forgot password link (ติดต่อผู้ดูแล), dynamic footer year
- **Guide page:** default expand step "get-started" แทน "api-key" (dead key), FAQ multi-expand ได้พร้อมกัน
- **Admin users:** role labels เป็น "ผู้จัดการระบบ / ผู้ใช้ทั่วไป", delete confirm text ชัดกว่าเดิม
- **Benefits page:** Solo "ทดลองฟรี 14 วัน" (consistent), VAT note "ราคายังไม่รวม VAT 7%", CTA differentiation — Solo = outline, others = filled accent

### Why

Phase 3–5 ของ UX Overhaul Plan — ลดความซับซ้อนการสร้าง agent, ทำให้ cost เข้าใจเป็นบาท, mobile-friendly modals, login พิมพ์รหัสผ่านได้สะดวก, FAQ ใช้งานจริงได้

---

## 2026-04-21 — v1.13.0-beta: UX Overhaul Phase 2 (Plain Thai + Glossary)

### Features

- **`lib/glossary.ts` (new):** 22 entries ของศัพท์ AI / Token / บัญชี / UI — ใช้เป็น source of truth สำหรับ Tooltip + Glossary page
  - AI: prompt, systemPrompt, contextWindow, streaming, rag, mcp, ttft, tokensPerSec, temperature, agent
  - Cost: tokens, inputTokens, outputTokens
  - Accounting: TFRS, NPAEs, PAEs, TSQC, COSO, มาตรา 40, มาตรา 65
  - UI: session, team
- **`/glossary` page (new):** ตารางคำศัพท์พร้อม search + category filter (AI/Cost/Accounting/UI), ลิงก์จาก Guide page + sidebar
- **Tooltip + Thai labels across app:**
  - Dashboard: stat cards มี tooltip อธิบาย (ที่ปรึกษา AI / การประชุม / Tokens), `sessions` → `การประชุม`
  - Tokens page: "Total/Input/Output/Sessions" → ภาษาไทย + tooltip เต็ม, chart legend + per-agent list แสดง "พิมพ์/ตอบ"
  - Agents page: "Soul" → "บทบาท (System Prompt)" + tooltip, "Seniority" → "ลำดับอาวุโส" + tooltip, card badges (Web/URLs/MCP) มี tooltip
  - Research page: "ความจำการประชุม" มี tooltip อธิบาย context window
  - Settings: "มาตรฐานบัญชี" มี tooltip อธิบาย NPAEs vs PAEs

### i18n

- เพิ่ม `nav.glossary` key ทั้ง th/en

### Why

Phase 2 ของ UX Overhaul Plan — พนักงานบัญชีที่ไม่คุ้น AI/LLM ต้องอ่าน label แล้วเข้าใจทันที และเรียกดูคำศัพท์ได้จากที่เดียว

---

## 2026-04-21 — v1.13.0-alpha: UX Overhaul Phase 1 (Foundation)

### Features

- **Shared components (new):** `Tooltip`, `Input`, `Select`, `Table`, `Tabs`, `Alert`, `Breadcrumb`, `CostDisplay`
  - Tooltip: hover + focus + tap (mobile), auto-flip placement, keyboard accessible (Esc to close)
  - Input: label + error/hint + tooltip + icon + suffix, password show/hide toggle, 44px min-height
  - Select: native-replacement with search + keyboard nav, mobile opens bottom sheet
  - Table: auto-converts to card list on mobile, optional sorting
  - Alert: persistent (vs Toast), 4 variants (info/warning/success/danger), dismissible
  - Breadcrumb: semantic `<nav>` with aria-current
  - CostDisplay: shows ฿THB + token counts, reuses `lib/pricing.ts`
- **`lib/pricing.ts` (new):** Model pricing table (USD per 1M tokens), `tokensToTHB()` / `formatTHB()` helpers, configurable USD→THB rate (default 36)

### Accessibility

- `aria-current="page"` ใน sidebar active nav item
- Skip-to-content link ใน root layout
- `main` element ได้ `id="main-content"` + `tabIndex={-1}` เพื่อรับ focus จาก skip link
- Modal: focus trap (Tab/Shift+Tab), auto-focus first element, restore focus on close, `role="dialog"` + `aria-modal`
- Sidebar nav items: min-height 44px (WCAG tap target)

### Why

Phase 1 ของ UX Overhaul Plan (ดู `docs/ux-overhaul-plan.md`) — foundation ที่ phase ถัดไปต้องใช้ ก่อนจะเริ่ม i18n audit, agent wizard, token THB

---

## 2026-04-20 — v1.12.1: Global Ambient Background

### Features

- **Ambient background app-wide** — ใส่ `body::before` (subtle grid) + `body::after` (cyan radial blobs) ใน `globals.css` ให้ทุกหน้าได้ feel ของ login page
- Opacity ปรับเบา (grid 0.08 dark / 0.15 light, blobs 5-8%) เพื่อไม่แย่งความสนใจจาก content
- `z-index: -1/-2` + `pointer-events: none` — sidebar/card (solid `var(--card)`) ยังอ่านชัดเจน
- Light mode มี gradient เบากว่า dark mode อีก step เพื่อไม่ให้ดู muddy

### Why

หน้าอื่นๆ เดิมเป็น flat navy ล้วน ขาด depth ที่ login page มี — แก้ไฟล์เดียว (globals.css) เพื่อ sync feel ทั้ง app

---

## 2026-04-20 — v1.12.0: Brand Consistency — Favicon + Design System

### Features
- **Favicon** — เปลี่ยนจาก emoji 🏛️ เป็น TITLELOGO.png (circle icon) ทั้ง browser tab และ iOS apple-icon
- **Sidebar logo** — แทน "LG" text ด้วย TITLELOGO.png ทุก position (collapsed, expanded, mobile header)
- **Input focus glow** — เพิ่ม global CSS focus state (cyan border + glow ring) ให้ทุก input/textarea/select สอดคล้องกับ login page
- **Light mode accent sync** — เปลี่ยน `--accent` light mode จาก `#0ea5e9` → `#00d4ff` ให้ตรง brand ทั้ง dark และ light
- **Login page CSS variables** — แทน hardcoded hex ทั้งหมดด้วย CSS variables เพื่อ maintain ง่ายและ respond ต่อ theme change
- **proxy.ts** — เพิ่ม `/assets/` ใน auth exemption list เพื่อให้ static files แสดงได้โดยไม่ redirect ไป login

### Design System Analysis
- Login page ใช้เป็น benchmark (dark navy, cyan accent, glassmorphism card)
- App pages ปัจจุบัน consistent อยู่แล้วในเรื่อง color — แก้แค่ favicon, sidebar logo, และ input focus
- Ambient blobs/grid เก็บไว้เฉพาะ login page (hero screen) — ไม่ copy ไปทุกหน้าเพื่อไม่ distract content

---

## 2026-04-20 — v1.11.0: User Isolation + Login Logo

### Features
- **User-isolated sessions** — ResearchSession และ ClientMemory แยกตาม user (แต่ละ user เห็นข้อมูลของตัวเองเท่านั้น)
- **Admin sees all sessions** — superadmin/admin เห็น session ทุก user พร้อม badge `@username`
- **User Management UI** — `/admin/users` (เพิ่ม/ลบ/reset password/toggle role) เห็นเฉพาะ admin
- **localStorage isolation** — Chat history ลบออกจาก localStorage (in-session only), Research page ใช้ key แยกตาม userId
- **Login logo** — เปลี่ยนจาก emoji เป็น LEDGIO AI logo จริง

### Bug Fixes
- **Prisma `@map("user_id")`** — เพิ่ม `@map` directive ให้ `userId` fields เพื่อให้ Prisma client ค้นหา column ถูก (DB ใช้ snake_case `user_id`)
- **Migration drop old unique index** — ลบ `client_memory_key_key` solo unique index ที่ค้างจาก migration ก่อนหน้า

### Schema Changes
- `prisma/schema.prisma` — เพิ่ม `userId @map("user_id")` ใน ResearchSession และ ClientMemory, เพิ่ม `sessions`/`memories` relations ใน User model
- Migration `20260420050000_add_user_isolation` — ADD COLUMN `user_id`, backfill superadmin, FK constraint
- Migration `20260420060000_fix_user_id_map` — DROP INDEX `client_memory_key_key`

---

## 2026-04-20 — v1.10.1: Authentication — Login Fixed

### Bug Fixes

- **Cookie `Secure` flag บน HTTP** — Next.js 16 inject `Secure` flag ให้ cookie อัตโนมัติทุกครั้งที่ `NODE_ENV=production` โดยไม่สนใจ `secure: false` ใน code ทำให้ browser บน HTTP reject cookie → login redirect loop
- **Root cause:** `ENV NODE_ENV=production` ใน Dockerfile ถูก bake ลงใน image layer และ Next.js 16 override cookie options ใน production mode
- **Fix:** ลบ `ENV NODE_ENV=production` ออกจาก Dockerfile — ไม่ pass `NODE_ENV` ผ่าน container, Next.js standalone ทำงานได้ดีโดยไม่มีตัวแปรนี้
- **Docker BuildKit issue:** BuildKit 0.19.0 ใช้ Git context แทน local files ทำให้ `COPY . .` transfer แค่ 8KB — แก้โดยใช้ `DOCKER_BUILDKIT=0` สำหรับ rebuild

### Infrastructure

- **Container recreated** — `docker rm bossboard` + `docker run` ใหม่โดยไม่มี `NODE_ENV=production` (ต้อง rm+run ใหม่, `docker restart` ไม่เพียงพอเพราะ env ยังอยู่)
- **Rebuild command บน server:** `DOCKER_BUILDKIT=0 docker build --no-cache -t bossboard:latest .`

---

## 2026-04-19 — v1.10.0: Redis + Postgres Storage Migration

### Phase A: Redis Rate Limiting

- **`lib/redis-client.ts`** — Singleton ioredis client (lazy connect, graceful fallback when unavailable)
- **`lib/rate-limit-redis.ts`** — Redis sorted-set sliding window rate limiter (key: `rl:{ip}:{windowMs}`) with in-memory fallback
- **Rate limiting ขยายครอบคลุมทุก endpoint** — POST team-agents (20/min), PATCH/DELETE team-agents/[id] (30/10 per min), POST teams (20/min), POST team-settings (10/min), POST client-memory (60/min), POST upload (10/min)
- Rate limit survive app restart (ข้อมูลอยู่ใน Redis)

### Phase B: Postgres Storage

- **`prisma/schema.prisma`** — 10 tables: agents, agent_knowledge, teams, team_agents, settings, research_sessions, research_messages, agent_stats, agent_daily_stats, client_memory
- **`lib/db.ts`** — Prisma singleton (globalThis pattern สำหรับ Next.js hot reload)
- **`lib/agents-store-db.ts`** — Drop-in Postgres replacement — function signatures เหมือนกันทุก function, รองรับ async
- **`lib/agents-store.ts`** — ตอนนี้ barrel re-export จาก `agents-store-db.ts` — routes ทุกตัวได้ DB implementation อัตโนมัติ
- **`lib/agents-store-json.ts`** — JSON file implementation เก็บไว้เป็น backup และ type definitions
- **`scripts/migrate-json-to-db.ts`** — Migration script: อ่าน JSON → insert Postgres (upsert-safe, ไม่ลบ JSON)
- **Migration สำเร็จ** — 7 agents, 1 team, settings, 29 sessions/95 messages, 6 agent stats, 11 memory facts

### Async/Await Fixes

- **ทุก function ใน agents-store ทำเป็น async** — `listAgents`, `getSettings`, `saveSettings`, `listTeams`, `getAgentStats`, `updateAgentStats`, `getAgentApiKey`, `getAgentKnowledgeContent`, `getResearchSession`, `upsertMemoryFact`, `deleteMemoryFact` ฯลฯ
- **แก้ await ในทุก route** — stream/route.ts, [id]/route.ts, team-agents, teams, team-settings, client-memory, agent-stats, token-usage, team-websearch, knowledge

### Bug Fixes & Build

- **`app/api/team-research/upload/route.ts`** — เปลี่ยน `import("pdf-parse")` → `require("pdf-parse/lib/pdf-parse")` แก้ TypeScript strict error ใน Docker build
- **Alpine Linux OpenSSL** — `apk add --no-cache openssl` + binaryTargets `linux-musl-openssl-3.0.x` ใน schema.prisma
- **Docker networking** — ใช้ bridge IP `172.17.0.3:5432` (Postgres) และ `172.17.0.4:6379` (Redis) แทน host IP (UFW block)
- **Prisma version** — downgrade จาก v7 → v5.22.0 (v7 มี breaking change ใน schema URL syntax)

### Infrastructure (server: 192.168.2.109)

- **`GET /api/health`** — เพิ่มตรวจสอบ DB และ Redis connectivity → `{"status":"ok","db":"ok","redis":"ok"}`
- **Environment variables** — `DATABASE_URL`, `REDIS_URL`, `AGENT_ENCRYPT_KEY` set ใน docker run command
- **Migration run สำเร็จ** บน server ก่อน switch เป็น DB mode

---

## 2026-04-18 — v1.9.4: Infrastructure & Docs

### Bug Fixes

- **Dockerfile HEALTHCHECK** — แก้ `localhost` → `127.0.0.1` แก้ปัญหา Alpine Linux resolve `localhost` เป็น IPv6 `[::1]` ทำให้ container อยู่สถานะ unhealthy ตลอด

### Server (192.168.2.109)

- **Docker build cache cleanup** — `docker builder prune` ล้าง build cache 66 GB ลด disk จาก 85% → 27%
- **Nginx ติดตั้งแล้ว** — reverse proxy port 80 → 3003, SSE streaming config (`proxy_buffering off`, timeout 600s)
- **UFW** — เปิด port 80/tcp เพื่อให้ `http://192.168.2.109/` เข้าถึงได้

### Docs

- เพิ่ม `ROADMAP.md` — แผนพัฒนา 5 phases พร้อม checklist
- เพิ่ม `docs/CLOUD_SPEC.md` — spec cloud provider, Nginx config, Docker Compose production
- อัปเดต `README.md` — เพิ่มตารางสถานะโปรเจคที่ตรงความจริง
- อัปเดต `docs/ARCHITECTURE.md` — แก้ healthcheck URL และสถานะ pre-production

## 2026-04-18 — v1.9.3: Meeting UI Bug Fixes

### History Filter

- **ซ่อน session ของ System Agents** — ประวัติหน้าห้องประชุม (`/research`) กรอง session ที่มี `agentIds` ขึ้นต้นด้วย `system-` (เช่น system-dbd, system-rd) ออก ไม่ให้ปนกับประวัติการประชุมทีม

### Progress Indicator Fix

- **แก้ปัญหาแสดง "6/5"** — เปลี่ยน `phase1DoneCount` จากตัวเลขธรรมดาเป็น `Set<string>` นับตาม agentId ที่ไม่ซ้ำ ป้องกันการนับซ้ำจากข้อความเปิดประชุมของประธาน (role: finding) และ error messages ที่ใช้ role เดียวกัน

### Meeting Phase Stepper & Modal

- **แก้ label "วาระที่ 2" ตอนปิดประชุม** — เพิ่ม state `isCurrentClosing` เพื่อตรวจจับว่ากำลังสรุปมติ แสดง "สรุปมติที่ประชุม" แทน "วาระที่ N" พร้อม styling สีทอง/ตัวหนา (เหมือนกับ completed synthesis divider)
- **Confirmation Modal** — แทน browser confirm() ด้วย Modal component สำหรับ clear session
- **Phase Stepper Redesign** — ปรับ layout ให้ compact และแสดงเฉพาะข้อมูลสำคัญ

## 2026-04-18 — v1.9.2: Stability & Robustness

### Data Race Fix

- **File Lock บน Research Functions** — `appendResearchMessage()`, `createResearchSession()`, `completeResearchSession()`, `listResearch()`, `cleanupStaleSessions()` ใช้ `withFileLock()` ป้องกัน race condition เมื่อ agents หลายตัวเขียนไฟล์พร้อมกัน (Phase 1 ที่มี 5 agents ผ่าน `Promise.allSettled`)

### Error Boundaries

- **`app/error.tsx`** — Global error boundary สำหรับทุกหน้า แสดงปุ่ม "ลองใหม่" เมื่อเกิด uncaught error
- **`app/research/error.tsx`** — Error boundary เฉพาะหน้าห้องประชุม

### UX Improvements

- **ซ่อน Thinking Messages ในประวัติ** — ข้อความ "กำลังวิเคราะห์..." (role: thinking) ไม่แสดงในมุมมองประวัติการประชุมอีกต่อไป ลดความรกและแสดงเฉพาะผลลัพธ์ที่สำคัญ

### Docker

- **Timezone** — เพิ่ม `ENV TZ=Asia/Bangkok` ใน Dockerfile

## 2026-04-18 — v1.9.1: Session Lifecycle Management

### Stale Session Fix

- **PATCH `/api/team-research/[id]`** — endpoint ใหม่สำหรับ force-complete เซสชันค้าง รับ `{ action: "force-complete", reason: "..." }`
- **Auto-cleanup >30 นาที** — เซสชันที่ค้างสถานะ "running" เกิน 30 นาที จะถูกปิดอัตโนมัติเมื่อดึงรายการประวัติ พร้อมข้อความ "⏱️ ปิดประชุมอัตโนมัติ — หมดเวลา (30 นาที)"
- **Stream Disconnect Cleanup** — เมื่อ client ตัดการเชื่อมต่อระหว่าง stream, ระบบจะปิดเซสชันให้อัตโนมัติ แทนที่จะค้างสถานะ "running" ตลอดไป
- **handleStop → Server Sync** — ปุ่มหยุดประชุมเรียก PATCH API เพื่อปิดเซสชันบน server ด้วย (ก่อนหน้านี้ปิดแค่ฝั่ง client)
- **sendBeacon on Unload** — เมื่อผู้ใช้ปิดแท็บ/ออกจากหน้า ระบบส่ง beacon เพื่อปิดเซสชันที่กำลังทำงานอยู่

### Stuck Session UI

- **ปุ่ม "ปิดประชุม" / "ถามต่อ"** — เมื่อเปิดดูเซสชันที่ค้างสถานะ "running" จะแสดงปุ่มให้เลือก: ปิดประชุมทิ้ง หรือ นำวาระกลับไปถามต่อในเซสชันใหม่
- **Badges ในรายการประวัติ** — แสดง "⚠️ ค้าง" (>30 นาที) หรือ "🔵 กำลังประชุม" (<30 นาที) แทนไอคอนนาฬิกาเดิม

## 2026-04-17 — v1.9: System Agents & External Knowledge

### System Agents

- **System Agents (DBD / RD)** — ระบบสร้าง agents อัตโนมัติ 2 ตัว: กรมพัฒนาธุรกิจการค้า (DBD) และ กรมสรรพากร (RD) พร้อม soul, role, trusted URLs ที่กำหนดมาให้
- **Edit Restriction** — กดแก้ไข System Agent แสดงเฉพาะแท็บ "Model" + "API Key" เท่านั้น (ไม่สามารถแก้ชื่อ/ตำแหน่ง/บุคลิก/ข้อมูล/ขั้นสูง)
- **Cannot Delete** — System agents มี `isSystem: true` flag ป้องกันการลบ

### External Knowledge Repository

- **Knowledge ย้ายไป GitHub** — ไฟล์ความรู้ (DBD: จดทะเบียนธุรกิจ/ประเภทนิติบุคคล, RD: ภาพรวมภาษี/คู่มือ VAT) ย้ายจาก `data/system-knowledge/` ไปเก็บที่ repo [`system-knowledge-ledgio-ai`](https://github.com/bosocmputer/system-knowledge-ledgio-ai)
- **Sync from GitHub** — `syncSystemKnowledge()` ดึง `manifest.json` + ไฟล์ความรู้ผ่าน GitHub Raw URL แทนอ่านจาก local filesystem
- **Sync API** — `POST /api/team-agents/sync-knowledge` สำหรับ trigger sync ผ่าน API
- **ปุ่ม "🔄 อัพเดทข้อมูล"** — บนหน้า Agents กดเพื่อ sync ความรู้ล่าสุดจาก GitHub ได้ทันที

### Chat Page (Individual Agent Chat)

- **Knowledge Upload สำหรับ System Agents** — เปิดให้ system agents (DBD/RD) ใช้ปุ่ม 📚 Knowledge อัพโหลดไฟล์ความรู้ได้
- **Fix: ReactMarkdown ว่างเปล่า** — แก้ `<ReactMarkdown />` self-closing tag → `<ReactMarkdown>{content}</ReactMarkdown>` ทำให้ข้อความตอบกลับแสดงในกล่องแชทได้
- **Fix: crypto.randomUUID บน HTTP** — เพิ่ม `genId()` fallback สำหรับ browser ที่ไม่มี secure context (HTTPS) ทำให้หน้า chat ไม่ crash
- **Enter ส่งข้อความ** — เปลี่ยนจาก Cmd+Enter เป็น Enter ส่ง (Shift+Enter ขึ้นบรรทัดใหม่) ตาม UX มาตรฐานของ chat
- **Fix: Layout height** — แก้ความสูง chat container จาก `h-full` เป็น `calc(100dvh - 3.5rem)` ป้องกันเนื้อหาถูกซ่อน

## 2026-04-14 — v1.8: Parallel Phase 1 & UX Enhancement

### Performance

- **Parallel Phase 1** — agents วิเคราะห์พร้อมกัน (`Promise.allSettled`) แทนทำทีละคน → ลดเวลาประชุม ~15–30%
- **LLM Retry with Backoff** — `callLLMWithRetry()` auto-retry 1 ครั้งเมื่อเจอ rate limit (429) พร้อม 2s delay
- **Optimized Token Usage** — `max_tokens: 2048` (ลดจาก 4096), `temperature: 0.3`, word limits per phase (600/400/800 คำ)

### UX Improvements

- **Phase Progress Stepper** — แถบสถานะแสดง Phase ปัจจุบัน พร้อม sub-count "นำเสนอ (3/5)" ระหว่าง Phase 1
- **Phase Separators** — เส้นแบ่ง Phase พร้อม label สี (📋 นำเสนอ / 💬 อภิปราย / 🏛️ สรุปมติ)
- **Thinking Animation** — card กำลังวิเคราะห์ พร้อม animated dots + staggered animation เมื่อหลาย agent คิดพร้อมกัน
- **Agent Voice System** — `getAgentVoice()` inject สไตล์การพูดเฉพาะ role (อ้างอิงกฎหมาย, ตั้งคำถามท้าทาย, วิเคราะห์ตัวเลข ฯลฯ)
- **Multi-Agent Thinking UI** — `activeAgentIds: Set<string>` แสดงหลาย agent กำลังคิดพร้อมกันบน sidebar
- **Speaking Pulse Animation** — sidebar agent card กระพริบเมื่อกำลังพูด
- **Message Slide-in Animation** — ข้อความใหม่เลื่อนเข้ามาอย่างเป็นธรรมชาติ

## 2026-04-14 — v1.7: Security & Reliability Hardening

- **Rate Limiting** — Sliding-window rate limiter (5 req/60s per IP) บน stream endpoint → ป้องกัน abuse, return 429
- **Request Body Size Limit** — จำกัด request body 100KB บน stream endpoint → return 413
- **Client Disconnect Handling** — ตรวจจับเมื่อ client ตัดการเชื่อมต่อ ส่ง AbortSignal ไปยัง callLLM ทุกจุด (~11 calls) เพื่อหยุดเรียก LLM ทันที ประหยัด tokens
- **Healthcheck Endpoint** — `GET /api/health` + Dockerfile `HEALTHCHECK` instruction (auto-restart on failure)
- **Error Message Sanitization** — ทุก API route ไม่ส่งรายละเอียด error ดิบไปยัง client แล้ว → log ฝั่ง server แทน (ป้องกัน information disclosure)
- **File Upload MIME Validation** — ตรวจ magic bytes (PDF `%PDF`, Excel/Word `PK`/`OLE2`) ก่อน parse → ป้องกันไฟล์ปลอมนามสกุล
- **`.env.example`** — เพิ่มไฟล์เอกสาร environment variables ทั้งหมด

## 2026-04-13 — v1.6: Security & Intelligence Upgrade (10 Features)

- **Encryption Key Auto-Generation** — ถ้าไม่ตั้ง `AGENT_ENCRYPT_KEY` ระบบจะสร้าง key อัตโนมัติ + เก็บลง `~/.bossboard/.encryption-key`
- **Input Validation & SSRF Protection** — ป้องกัน SSRF บน base URL ของ agents (block private IPs, localhost, metadata endpoints)
- **Security Headers** — เพิ่ม CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Docker Non-Root User** — container ทำงานภายใต้ user `node` (uid 1000) ไม่ใช่ root
- **Anthropic Prompt Caching** — ใช้ `cache_control: { type: "ephemeral" }` บน system message สำหรับ Anthropic models
- **Search Query Rewriting** — AI rewrite คำถามเป็น search query ที่ดีขึ้นก่อนค้นเว็บ
- **Consensus Skip** — ถ้า agents เห็นตรงกัน ข้ามขั้นตอน discussion ไปสรุปเลย
- **Auto-Summarize Old Rounds** — สรุป history เก่าอัตโนมัติเมื่อยาวเกิน 2000 ตัวอักษร
- **Cross-Session Memory** — จดจำ facts จากการประชุมก่อนหน้า นำมาใช้ในครั้งถัดไป (`/api/client-memory`)
- **Fact-Checking Before Synthesis** — ประธานตรวจสอบข้อเท็จจริงจาก web search ก่อนสรุปมติ

## 2025-04-13 — v1.5: Quality & Export Upgrade

- **Fix: Chairman opening** — ข้อความเปิดประชุมของประธานแสดงเป็นการ์ดเต็ม ไม่ถูกตัดทอนอีกต่อไป
- **Fix: Thinking message** — ข้อความระหว่างวิเคราะห์ไม่แสดงข้อมูลที่ยังไม่ได้ค้นหา
- **Web Search error logging** — บันทึก log เมื่อ Serper/SerpApi ล้มเหลว ตรวจสอบได้จาก `docker logs bossboard | grep WebSearch`
- **Export Minutes upgrade** — บันทึกการประชุมครบถ้วน: ผู้เข้าประชุม, คำถามชี้แจง, ข้อค้นพบ, อภิปราย, มติ, แหล่งข้อมูลเว็บ, สรุป tokens
- **Clarification answers persisted** — คำตอบจากขั้นตอนคำถามชี้แจงถูกบันทึกใน session history
- **Agents page cleanup** — ลบ banners แนะนำที่ไม่จำเป็น ให้ดูเป็นมืออาชีพ

## 2025-04-12 — v1.4: Clarification Bug Fix

- **Fix: Clarification flow** — แก้ปัญหาห้องประชุมค้างเมื่อ AI ถามคำถามกลับ (คำถามหายเมื่อ user ตอบ)

## 2025-04-12 — v1.3: 4 Major Upgrades

- **Pre-flight Clarification** — ก่อนเริ่มประชุม ประธานจะวิเคราะห์คำถามและขอข้อมูลเพิ่มเติมถ้าจำเป็น
- **Anti-Hallucination Rules** — agents ต้องอ้างอิงมาตรา/กฎหมาย และแยก "ข้อเท็จจริง" กับ "ความเห็น" ออกจากกัน
- **Web Source Display** — แสดง URL แหล่งข้อมูลที่ agent ค้นหาจากอินเทอร์เน็ต พร้อมลิงก์คลิกได้
- **Professional Markdown UI** — render ข้อความ agent ด้วย Markdown (หัวข้อ, ตาราง, bullet, bold, code block)

## 2025-04-11 — v1.2: Knowledge Upgrade (4-Phase)

- Domain Knowledge — ฝังความรู้ประมวลรัษฎากรไทยลงใน soul ของทุก agent
- Trusted URLs — agent อ้างอิง rd.go.th, dbd.go.th, bot.or.th อัตโนมัติ
- Enhanced Knowledge System — ระบบ knowledge base พร้อม upload เอกสาร
- Auto web search สำหรับคำถามด้านกฎหมาย

## 2025-04-10 — v1.1: Smart Mode & UX

- **Smart Mode** — QA mode (ตอบคนเดียว) vs Meeting mode (ถกเถียงเต็มรูปแบบ)
- **Skip-to-Summary** — ยุบขั้นตอนกลางและข้ามไปดูมติได้
- **Model Fallback** — ถ้า model หลักล้มเหลว ระบบสลับไป fallback อัตโนมัติ
- **B2B UX overhaul** — ลบศัพท์เทคนิค ทำให้ผู้ใช้ทั่วไปเข้าถึงได้

## 2025-04-08 — v1.0: Initial Release

- ห้องประชุม AI สำหรับสำนักงานบัญชี
- 4-phase meeting flow (thinking → finding → discussion → synthesis)
- Multi-agent SSE streaming
- File upload, MCP integration, Web Search
- Token tracking & cost estimation
- Dashboard, Teams, Benefits, Settings pages
- Thai/English, Dark/Light/Auto theme
- Docker + Standalone deployment
