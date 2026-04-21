# LEDGIO AI — Architecture

> สถาปัตยกรรมและการทำงานของระบบ LEDGIO AI (BossBoard)

> **สถานะ:** Production-ready (self-hosted) — Auth + Postgres + Redis + Thai UX ครบถ้วน | **Version:** v1.14.0 | **ดู roadmap:** [ROADMAP.md](../ROADMAP.md)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 App                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Pages (12)  │  │  API Routes   │  │   Lib Layer      │  │
│  │  React 19    │  │  (22 routes)  │  │  (12 modules)    │  │
│  └──────┬───────┘  └──────┬────────┘  └───────┬──────────┘  │
│         │                 │                   │             │
│         └─────────────────┼───────────────────┘             │
│                           │                                 │
│              ┌────────────┴─────────────┐                   │
│              │      proxy.ts (Edge)     │  ← Auth guard     │
│              │  JWT verify per request  │                   │
│              └────────────┬─────────────┘                   │
│                           │                                 │
│              ┌────────────┴─────────────┐                   │
│              │    agents-store-db.ts    │  ← Data layer     │
│              │    (Prisma v5 client)    │                   │
│              └────────────┬─────────────┘                   │
└───────────────────────────┼─────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
    ┌─────────▼──────────┐    ┌────────────▼───────────┐
    │   PostgreSQL 16     │    │       Redis 7           │
    │  (10 tables, DB:    │    │  (rate limiting,        │
    │   bossboard)        │    │   session tracking)     │
    └────────────────────┘    └────────────────────────┘
```

LEDGIO AI เป็น **Next.js 16 full-stack application** ที่ใช้ PostgreSQL เป็น primary storage, Redis สำหรับ rate limiting และ auth guard ผ่าน Edge-compatible `proxy.ts`

---

## Pages (12)

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | ภาพรวมระบบ — สถิติ, chat/research cards, quick templates |
| `/research` | Meeting Room | ห้องประชุม AI — core feature ของระบบ |
| `/agents` | Agent Manager | สร้าง/แก้ไข agent (wizard easy/expert mode) |
| `/chat/[agentId]` | Chat | สนทนา 1:1 กับ agent เดียว |
| `/teams` | Team Manager | จัดกลุ่ม agents เป็นทีม |
| `/tokens` | Token Analytics | ค่าใช้จ่าย THB + สถิติ tokens รายวัน/agent |
| `/settings` | Settings | Company info, Web Search keys, Budget config |
| `/guide` | User Guide | คู่มือ 8 ขั้นตอน (ภาษาไทย) |
| `/glossary` | Glossary | คำศัพท์ AI/บัญชี 22 terms + search |
| `/benefits` | Benefits | แนะนำแพ็คเกจและราคา |
| `/admin/users` | Admin Users | จัดการ users (admin only) |
| `/login` | Login | หน้า login (route group แยก layout) |

---

## Authentication Architecture

```
Request
   │
   ▼
proxy.ts (Edge Middleware)
   │
   ├── /login, /api/auth/*, /api/health → allow
   │
   ├── JWT verify (jose, HS256)
   │     ├── Valid → set x-user-id, x-user-role headers → next()
   │     └── Invalid/missing
   │           ├── API route → 401 JSON
   │           └── Page route → redirect /login?from=...
   │
   ▼
API Route / Page
   │
   └── อ่าน x-user-id จาก header → filter data per user
```

**JWT:** HS256, 8h expiry, httpOnly cookie (`token`)
**Password:** bcrypt cost 12, stored in `users` table
**User isolation:** ResearchSession, ClientMemory แยกตาม `userId`

---

## Meeting Flow (5 Phases)

```
User Question
     │
     ▼
┌─────────────────────┐
│ Phase 0: Clarify    │  ← ประธานถามคำถามเพิ่มเติม (optional)
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Phase 1: PARALLEL   │  ← Promise.allSettled() — ทุก agent พร้อมกัน
│ All agents analyze  │     emit ตาม seniority + 120ms stagger
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Consensus Check     │  ← ข้าม Phase 2 ถ้าเห็นพ้องหมด
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Phase 2: Discussion │  ← agents อภิปราย เห็นด้วย/ไม่เห็นด้วย
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Phase 3: Synthesis  │  ← Chairman สรุปมติ + Action Items
└─────────────────────┘
```

### SSE Streaming Protocol

```
Client → POST /api/team-research/stream
         { question, agentIds, mode, sessionId, clarificationAnswers? }

Server → SSE stream:
  event: session               data: {sessionId}
  event: chairman              data: {agentId, name, emoji, role}
  event: status                data: {message}
  event: clarification_needed  data: {questions}
  event: agent_start           data: {agentId, name, emoji, role}
  event: agent_searching       data: {agentId, query}
  event: web_sources           data: {agentId, sources}
  event: message               data: {id, agentId, role, content}
                                role: thinking|finding|chat|synthesis
  event: agent_tokens          data: {agentId, input, output}
  event: final_answer          data: {content}
  event: chart_data            data: {type, labels, datasets}
  event: follow_up_suggestions data: {suggestions}
  event: done                  data: {sessionId}
```

---

## Agent System

### Agent Configuration

| Field | Description |
|-------|-------------|
| `id` | UUID v4 |
| `name` | ชื่อแสดงผล |
| `emoji` | ไอคอน agent |
| `provider` | anthropic / openai / gemini / ollama / openrouter / custom |
| `model` | Model ID |
| `apiKey` | Encrypted AES-256-CBC |
| `soul` | System prompt — บุคลิก, จุดยืน |
| `seniority` | 1–99 (ต่ำสุด = ประธาน) |
| `skills` | Array of 19 skills |
| `mcpEndpoint` | Optional MCP Server URL |
| `webSearchEnabled` | เปิด/ปิด web search |
| `isActive` | เปิด/ปิด |

### Agent Wizard Mode (v1.14.0)

| Mode | ขั้นตอน | Model Picker |
|------|---------|-------------|
| ง่าย (default) | Template → Model (3-tier) → บทบาท | ประหยัด / แนะนำ / คุณภาพสูง |
| ผู้เชี่ยวชาญ | Template → Model (full list) → บทบาท → ขั้นสูง | full OpenRouter model list |

**3-Tier Map:**
- ประหยัด → `google/gemini-2.5-flash-lite` (฿3.6/฿14.4 ต่อ 1M)
- แนะนำ → `anthropic/claude-haiku-4-5`
- คุณภาพสูง → `anthropic/claude-sonnet-4-6`

### 6 Agent Templates

| # | Template | Model default |
|---|----------|--------------|
| 1 | นักบัญชีอาวุโส | gemini-2.5-flash-lite |
| 2 | ผู้สอบบัญชี CPA | gemini-2.5-flash |
| 3 | ที่ปรึกษาภาษี | gemini-2.5-flash |
| 4 | นักวิเคราะห์งบการเงิน | gemini-2.5-flash-lite |
| 5 | ผู้ตรวจสอบภายใน | gemini-2.5-flash-lite |
| 6 | Custom | (ผู้ใช้เลือกเอง) |

### Chairman Selection

Agent ที่มี **seniority ต่ำสุด** = ประธาน — รับผิดชอบ Phase 0 (clarify) + Phase 3 (synthesis)

---

## Context Stacking (12 Layers)

```
 1. System Prompt (soul)           ← บุคลิก/จุดยืน
 2. Company Info                   ← ข้อมูลบริษัท (จาก settings)
 3. Accounting Standard            ← NPAEs / TFRS
 4. Agent Skills                   ← 19 skills
 5. Meeting Role                   ← chairman / member / ลำดับ
 6. Anti-Hallucination Rules       ← ต้องอ้างอิงกฎหมาย/มาตรฐาน
 7. Client Memory                  ← ข้อเท็จจริงข้าม session
 8. Knowledge Base (per agent)     ← ไฟล์เอกสารเฉพาะ agent
 9. MCP Data                       ← ข้อมูลจาก MCP Server
10. Web Search Results             ← ผลค้นหาอินเทอร์เน็ต
11. File Attachment                ← ไฟล์แนบจาก user
12. Conversation History           ← ประวัติ (full/last3/summary/none)
```

---

## Data Layer

### Database Schema (Prisma v5 — PostgreSQL 16)

```
users              ← user accounts, bcrypt passwords
agents             ← agent configs (API keys encrypted)
agent_knowledge    ← knowledge file metadata per agent
teams              ← team definitions
team_agents        ← many-to-many agents↔teams
settings           ← web search keys, company info
research_sessions  ← session metadata (userId FK)
research_messages  ← messages per session
agent_stats        ← per-agent token totals
agent_daily_stats  ← daily aggregation (90 days)
client_memory      ← cross-session facts (userId FK)
```

### agents-store-db.ts

Prisma v5 implementation ของ data layer — re-exported ผ่าน `agents-store.ts` เพื่อให้ API routes ทุกตัวได้ DB โดยอัตโนมัติ

```
API Routes ──► agents-store.ts ──► agents-store-db.ts ──► Prisma ──► PostgreSQL
```

**Knowledge files:** metadata ใน DB, content บน filesystem `~/.bossboard/knowledge/`

---

## Cost Tracking (v1.14.0)

```
LLM Response
   │
   ├── input_tokens + output_tokens
   │
   ▼
lib/pricing.ts
   ├── MODEL_PRICING map (USD per 1M tokens)
   ├── tokensToTHB(input, output, model) → ฿X.XX
   └── rate = localStorage.usdThbRate ?? 36
   │
   ▼
Tokens Page Hero Card
   ├── รวมทุก agent → ≈ ฿X (ใหญ่กว่า token count)
   ├── Budget progress bar (ถ้าตั้ง monthlyBudgetTHB)
   └── Per-agent breakdown THB
```

---

## LLM Provider Integration

| Provider | Auth | Base URL |
|----------|------|----------|
| Anthropic | `x-api-key` header | `https://api.anthropic.com` |
| OpenAI | `Bearer` token | `https://api.openai.com` |
| Gemini | API key in URL | `https://generativelanguage.googleapis.com` |
| Ollama | None (local) | `http://localhost:11434` |
| OpenRouter | `Bearer` token | `https://openrouter.ai/api` |
| Custom | `Bearer` token | User-defined |

### SSRF Protection

ตรวจ base URL ก่อนเรียก API:
- Block private IP (10.x, 172.16–31.x, 192.168.x)
- Block localhost / 127.0.0.1
- Block cloud metadata (169.254.169.254)
- Allow HTTPS only (ยกเว้น Ollama localhost)

---

## Web Search Pipeline

```
Agent (webSearchEnabled=true)
   │
   ▼
Extract keywords → Serper / SerpAPI
   │  (key จาก settings, encrypted)
   ▼
Parse top N snippets → inject Context Layer 10
   │
   ▼
Agent cites → displayed as clickable links
```

---

## Security Architecture

### Encryption

```
API Keys plaintext
   │
   ▼
AES-256-CBC (IV: random 16 bytes)
   ├── Key: AGENT_ENCRYPT_KEY env var
   │   OR auto-generated → ~/.bossboard/.encryption-key
   └── Stored as "iv:encrypted" in DB
```

### Rate Limiting (Redis)

```
POST endpoints
   │
   ▼
lib/rate-limit-redis.ts
   ├── Sorted-set sliding window (per IP)
   ├── Window: 60s, Max: 5 req
   ├── Fallback: in-memory (Redis unavailable)
   └── Exceeded → 429 Too Many Requests
```

### Security Headers

```
Content-Security-Policy, X-Content-Type-Options: nosniff,
X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy
```

---

## Token Tracking

```
Agent Response → input/output tokens
   │
   ▼
Save to: agent_stats + agent_daily_stats (Postgres)
   │
   ├── /tokens page: THB hero + budget bar + per-agent breakdown
   ├── Meeting status bar: real-time token count
   └── Dashboard: overview stats
```

---

## Performance Optimization

### Parallel Phase 1

```
Sequential (ก่อน):  A1──►A2──►A3──►A4──►A5  = ~150s
Parallel (หลัง):    A1─────────────────────►
                    A2─────────────────────►
                    A3─────────────────────►  = ~30–40s
                    A4─────────────────────►
                    A5─────────────────────►
```

ใช้ `Promise.allSettled()` — agent ที่ fail ไม่กระทบตัวอื่น

### LLM Call Optimization

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `max_tokens` | 2048 | เพียงพอสำหรับการวิเคราะห์ |
| `temperature` | 0.3 | ตรงประเด็น ลด hallucination |
| Word limit Phase 1 | 600 คำ | ป้องกัน overwrite |
| Word limit Phase 2 | 400 คำ | อภิปรายกระชับ |
| Word limit Phase 3 | 800 คำ | สรุปครบถ้วน |

### Rate Limit Retry

`callLLMWithRetry()` — auto-retry 1 ครั้งเมื่อ HTTP 429, delay 2s

---

## Shared UI Components (`app/components/`)

| Component | Description |
|-----------|-------------|
| `Button` | primary/secondary/ghost/danger, sm/md/lg |
| `Card` | hover effect, padding options |
| `Modal` | focus trap, Esc close, mobile bottom-sheet |
| `Badge` | 6 variants |
| `Toggle` | role="switch" |
| `Toast` | `showToast(type, msg)` auto-dismiss 4s |
| `Skeleton` | loading placeholders |
| `Tooltip` | hover+focus+tap, auto-flip, Esc close |
| `Alert` | persistent, 4 variants, dismissible |
| `CostDisplay` | tokens + THB side-by-side |
| `Breadcrumb` | semantic nav + aria-current |
| `Input` | label+error+hint+tooltip+icon |
| `Select` | search + keyboard nav |
| `Table` | mobile auto-card, sticky header |
| `Tabs` | arrow key nav |

---

## Docker Architecture

```dockerfile
FROM node:22-alpine AS builder   # Build stage
FROM node:22-alpine AS runner    # Runtime stage

USER node (uid 1000)             # Non-root
EXPOSE 3000
HEALTHCHECK CMD wget --spider http://127.0.0.1:3000/api/health

Env vars required:
  DATABASE_URL   postgresql://...
  REDIS_URL      redis://...
  AGENT_ENCRYPT_KEY
  JWT_SECRET
  TZ             Asia/Bangkok
```

**Output:** Standalone Next.js build — ไม่ต้อง `node_modules` ตอน runtime

**Build command (server):** `DOCKER_BUILDKIT=0 docker build --no-cache -t bossboard:latest .`
> ต้องใช้ `DOCKER_BUILDKIT=0` เพราะ BuildKit 0.19.0 ใช้ Git context แทน local files

---

## Directory Structure

```
BossBoard/
├── app/
│   ├── layout.tsx              # Root layout (theme, i18n, sidebar)
│   ├── page.tsx                # Dashboard
│   ├── providers.tsx           # Theme + i18n providers
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── globals.css             # Tailwind CSS 4 + CSS variables
│   ├── (auth)/login/           # Login page (route group — no sidebar)
│   ├── agents/page.tsx         # Agent manager (wizard mode)
│   ├── research/page.tsx       # Meeting room (SSE streaming)
│   ├── chat/[agentId]/         # 1:1 chat
│   ├── teams/page.tsx          # Team manager
│   ├── tokens/page.tsx         # Token analytics + THB cost
│   ├── settings/page.tsx       # Settings + budget config
│   ├── guide/page.tsx          # User guide (8 steps)
│   ├── glossary/page.tsx       # Glossary 22 terms
│   ├── benefits/page.tsx       # Pricing
│   ├── admin/users/page.tsx    # Admin user management
│   ├── components/             # 15 shared UI components
│   └── api/                    # 22 API routes
│       ├── auth/login, logout, me
│       ├── admin/users/[id]
│       ├── team-research/stream, route, [id], upload
│       ├── team-agents/route, [id]/route, [id]/knowledge
│       ├── teams/route, [id]
│       ├── team-settings, team-websearch, team-models
│       ├── agent-stats, token-usage, client-memory
│       └── health
├── lib/
│   ├── agents-store.ts         # Barrel re-export → DB layer
│   ├── agents-store-db.ts      # Prisma v5 implementation
│   ├── auth.ts                 # Edge-safe JWT helpers (jose)
│   ├── glossary.ts             # 22 glossary entries
│   ├── i18n.tsx                # Thai/English translations
│   ├── pricing.ts              # Model pricing + tokensToTHB()
│   ├── platforms.ts            # LLM provider definitions
│   ├── rate-limit-redis.ts     # Redis sliding-window rate limiter
│   └── theme.tsx               # Theme provider (auto/dark/light)
├── prisma/
│   └── schema.prisma           # 10 tables Prisma schema
├── scripts/
│   ├── seed-admin.ts           # Seed superadmin user
│   └── migrate-json-to-db.ts   # One-time JSON→DB migration
├── docs/
│   ├── ARCHITECTURE.md         # (this file)
│   ├── ROADMAP.md → ../ROADMAP.md
│   ├── ux-overhaul-plan.md     # UX overhaul execution log
│   └── CLOUD_SPEC.md           # Cloud deployment spec
├── public/assets/              # Logos, icons
├── Dockerfile                  # Multi-stage Docker build
├── proxy.ts                    # Edge auth middleware
├── CHANGELOG.md                # Version history
├── ROADMAP.md                  # Development roadmap
└── README.md                   # Project overview
```

---

## OpenClaw Legacy

BossBoard fork มาจาก OpenClaw — legacy code 2 จุดที่ยังอยู่:

| File | Status |
|------|--------|
| `lib/openclaw-cli.ts` | Optional — ไม่จำเป็น |
| `/api/config` | Legacy — return error gracefully |

> ระบบทำงานสมบูรณ์โดยไม่ต้องมี OpenClaw
