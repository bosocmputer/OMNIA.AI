# LEDGIO AI — ห้องประชุม AI

> **From Ledger to Intelligence** — AI Financial & Tax Advisor for Modern Business

LEDGIO AI คือศูนย์รวม AI ที่ทำงานร่วมกัน เพื่อวิเคราะห์และให้คำตอบด้านบัญชีและภาษี — สร้างทีม AI agents หลายตัว ถามคำถามเดียว แล้วดู agents ถกเถียง วิเคราะห์ และสรุปมติร่วมกัน แบบ real-time

> **Project repo:** BossBoard | **Brand name:** LEDGIO AI | **Forked and extended from** [xmanrui/OpenClaw-bot-review](https://github.com/xmanrui/OpenClaw-bot-review)

---

## สถานะโปรเจค (v1.14.0 — 2026-04-21)

| รายการ | สถานะ |
| ------ | ------ |
| Core features (Meeting Room, Chat, Agents, Teams, Tokens) | ✅ ใช้งานได้จริง |
| Multi-provider LLM (Anthropic, OpenAI, Gemini, Ollama, OpenRouter) | ✅ พร้อม |
| File upload, Web search, MCP integration | ✅ พร้อม |
| Docker deployment | ✅ พร้อม — deploy บน 192.168.2.109 |
| Authentication / Login | ✅ JWT httpOnly cookie, bcrypt, 8h session |
| Multi-user isolation | ✅ ResearchSession/Memory แยกตาม userId |
| Production database | ✅ Postgres 16 (Prisma v5, 10 tables) + Redis |
| Rate limiting (ครอบคลุมทุก endpoint) | ✅ Redis sliding-window ทุก POST endpoint |
| Thai UX สำหรับพนักงานบัญชี | ✅ wizard mode, THB cost, tooltip glossary, Thai labels |
| Budget monitoring (ค่าใช้จ่าย THB) | ✅ monthly budget + progress bar |
| Mobile responsive | ✅ bottom-sheet modals, responsive charts |
| SSL / HTTPS | ⚠️ ยังไม่มี — HTTP เท่านั้น (LAN) |
| Plan enforcement / Billing | ⏳ ยังไม่ได้ทำ |

> **สรุป:** พร้อมใช้งาน production สำหรับ self-hosted — Thai accounting office UX ครบถ้วน ดู [ROADMAP.md](ROADMAP.md) สำหรับแผนพัฒนาต่อ | ดู [CHANGELOG.md](CHANGELOG.md) สำหรับประวัติ

---

## Tech Stack

| Layer       | Technology                                 |
| ----------- | ------------------------------------------ |
| Framework   | Next.js 16 (App Router, standalone output) |
| Language    | TypeScript                                 |
| Styling     | Tailwind CSS 4                             |
| Icons       | Lucide React                               |
| Runtime     | Node.js 22                                 |
| Database    | PostgreSQL 16 + Prisma v5 (10 tables)      |
| Cache       | Redis 7 (rate limiting + session)          |
| Auth        | JWT HS256, bcrypt cost 12, httpOnly cookie |
| Encryption  | AES-256-CBC (API keys & search keys)       |
| Streaming   | Server-Sent Events (SSE)                   |
| Doc Parsing | xlsx, pdf-parse, mammoth                   |

---

## Security

| Feature | Description |
|---|---|
| **Encryption** | API keys encrypted at rest (AES-256-CBC), key auto-generated if not set |
| **Rate Limiting** | Sliding-window 5 req/60s per IP on stream endpoint (429) |
| **Body Size Limit** | 100KB max request body on stream endpoint (413) |
| **SSRF Protection** | Agent base URLs validated — blocks private IPs, localhost, cloud metadata |
| **Security Headers** | CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| **Error Sanitization** | Internal errors logged server-side only, generic messages to client |
| **File Upload Validation** | Magic bytes check (PDF/Excel/Word) + extension + 10MB size limit |
| **Client Disconnect** | AbortSignal cancels in-flight LLM calls when client disconnects |
| **Docker Non-Root** | Container runs as `node` user (uid 1000) |
| **Healthcheck** | `GET /api/health` + Docker HEALTHCHECK auto-restart |

---

## Features

### 🏠 Dashboard (`/`)

หน้าภาพรวมระบบ — แสดงสถิติ agents, teams, sessions, tokens ใช้งาน, quick actions, การประชุมล่าสุด, เอเจนต์ยอดนิยม

- **Hero CTA** — ปุ่ม "🏛️ เริ่มประชุม AI" โดดเด่นบนสุด พร้อมลิงก์ตรงไปห้องประชุม
- **Quick Meeting Templates** — เลือก template ประชุมสำเร็จรูป (วิเคราะห์งบ, วางแผนภาษี, ประเมินความเสี่ยง, วิเคราะห์ต้นทุน) → เปิดห้องประชุมพร้อม `?q=` prefill

### 👥 Team Agents (`/agents`)

สร้างและจัดการทีมที่ปรึกษา AI — แต่ละตัวมี provider, model, API key, บทบาท (soul), skills, MCP endpoint เป็นของตัวเอง

- **Wizard Mode (ง่าย/ผู้เชี่ยวชาญ):** โหมดง่ายแสดง 3 ระดับ (ประหยัด / แนะนำ / คุณภาพสูง) โหมดผู้เชี่ยวชาญเห็น full model list
- **3-Tier Model Picker:** ประหยัด = gemini-2.5-flash-lite, แนะนำ = claude-haiku-4-5, คุณภาพสูง = claude-sonnet-4-6
- **4-Step Wizard Form** — Template → Model → ข้อมูล → ขั้นสูง (expert mode only)
- **Emoji Picker** — เลือก emoji จาก grid 80 ตัวใน 4 หมวด (คน, ธุรกิจ, วิเคราะห์, กฎหมาย) — ไม่ต้องพิมพ์เอง
- **Agent Cards** — แสดง model badge, ลำดับอาวุโส 🏛️, web search 🔍, MCP 🔌 indicators
- **Toast Notifications** — แจ้งเตือนเมื่อ save/delete/toggle agent สำเร็จ
- **6 Agent Templates** ใน 2 หมวด (เน้นสำนักงานบัญชี):
  - **สำนักงานบัญชี (5):** นักบัญชีอาวุโส, ผู้สอบบัญชี CPA, ที่ปรึกษาภาษี, นักวิเคราะห์งบการเงิน, ผู้ตรวจสอบภายใน
  - **Custom (1):** สร้าง agent ตามต้องการ
- **6 Providers:** Anthropic, OpenAI, Google Gemini, Ollama, OpenRouter, Custom (OpenAI-compatible)
- **19 Skills** per agent: web_search, code_execution, data_analysis, financial_modeling, legal_research, case_analysis, contract_review ฯลฯ
- **Soul (System Prompt)** — กำหนดบุคลิก จุดยืน และวิธีถกเถียงของ agent
- **MCP Endpoint** — เชื่อม MCP Server per agent เพื่อดึงข้อมูลจากระบบภายนอก (admin/sales/purchase/stock/general)
- **Seniority (1–99)** — ลำดับพูดในการประชุม + กำหนดประธาน
- **Knowledge Base** — อัปโหลดไฟล์เอกสารเฉพาะ agent (PDF/Excel/Word) เป็นฐานความรู้เพิ่มเติม
- API keys encrypted (AES-256-CBC)

### ⚙️ System Agents (DBD / RD)

ระบบจะสร้าง **System Agents** อัตโนมัติ 2 ตัว — ไม่สามารถลบได้ แต่ตั้งค่า Model และ API Key ได้

| Agent | Emoji | Role | ฐานความรู้ |
|-------|-------|------|------------|
| กรมพัฒนาธุรกิจการค้า (DBD) | 🏢 | ผู้เชี่ยวชาญกฎหมายธุรกิจ | จดทะเบียนธุรกิจ, ประเภทนิติบุคคล |
| กรมสรรพากร (RD) | 🏛️ | ผู้เชี่ยวชาญภาษีอากร | ภาษีเงินได้, VAT, ภาษีหัก ณ ที่จ่าย |

- **Edit Restriction** — กดแก้ไข System Agent จะแสดงเฉพาะแท็บ **"Model"** และ **"API Key"** เท่านั้น (ไม่มีแท็บตำแหน่ง/ข้อมูล/ขั้นสูง)
- **Knowledge Upload** — system agents สามารถอัพโหลดไฟล์ความรู้เพิ่มเติมผ่านปุ่ม 📚 Knowledge ได้เหมือน agent ปกติ
- **Knowledge Sync จาก GitHub** — ฐานความรู้เก็บที่ repo ภายนอก [`system-knowledge-ledgio-ai`](https://github.com/bosocmputer/system-knowledge-ledgio-ai) แล้ว sync ผ่าน GitHub Raw URL
- **ปุ่ม "🔄 อัพเดทข้อมูล"** — กดเพื่อ sync ความรู้ล่าสุดจาก GitHub → เขียนไฟล์ลง `~/.bossboard/system-knowledge/`
- **API:** `POST /api/team-agents/sync-knowledge` — ดึง `manifest.json` จาก GitHub แล้ว download ไฟล์ความรู้ทั้งหมด

### 💬 Chat Page (`/chat/[agentId]`)

หน้าแชท 1:1 กับ agent แต่ละตัว — ถามตอบโดยตรงแบบ real-time (ใช้ QA mode ไม่มีพิธีการประชุม)

- **Direct QA** — ส่งคำถามไปยัง agent เดียว ได้คำตอบทันที ผ่าน SSE streaming (mode: "qa")
- **Markdown Rendering** — คำตอบ render เป็น Markdown สมบูรณ์ (หัวข้อ, ตาราง, bullet, code block, blockquote)
- **File Attachment** — แนบไฟล์ (PDF/Excel/Word/CSV/JSON/TXT) ให้ agent วิเคราะห์ประกอบ
- **Chat History** — บันทึกประวัติสนทนาลง localStorage (เก็บ 50 ข้อความล่าสุดต่อ agent)
- **Conversation Context** — ส่ง 10 ข้อความล่าสุดเป็น context ให้ agent เข้าใจบริบทก่อนหน้า
- **Web Sources** — แสดงแหล่งข้อมูลจากอินเทอร์เน็ตที่ agent ค้นหา พร้อมลิงก์
- **Follow-up Suggestions** — AI แนะนำคำถามต่อเนื่อง
- **Enter ส่ง / Shift+Enter ขึ้นบรรทัด** — UX มาตรฐานสำหรับ chat
- **System Agent Chat** — เข้าถึงผ่าน sidebar: `/chat/system-dbd` (DBD) และ `/chat/system-rd` (RD)

### 🏛️ Meeting Room (`/research`)

ห้องประชุม AI — ประธานนำทีมถกเถียงและสรุปมติทุกวาระ

- **5-Phase Meeting Flow:**
  0. **ถามกลับ (clarification)** — ประธานถามคำถามเพิ่มเติมก่อนเริ่มประชุม เพื่อให้ได้ข้อมูลครบถ้วน
  1. **วิเคราะห์พร้อมกัน (parallel analysis)** — ทุก agent วิเคราะห์โจทย์พร้อมกัน (`Promise.allSettled`) แล้วส่งผลตาม seniority พร้อม stagger delay 120ms
  2. **นำเสนอ (finding)** — ผลวิเคราะห์แสดงตามลำดับ seniority + consensus check (ข้ามอภิปรายได้ถ้าเห็นพ้อง)
  3. **อภิปราย (chat)** — agents อ่านความเห็นกัน แสดงจุดยืน เห็นด้วย/ไม่เห็นด้วย
  4. **มติประธาน (synthesis)** — Chairman สรุป + Action Items
- **Pre-flight Clarification** — ก่อนเริ่มประชุม ประธานจะวิเคราะห์คำถามและขอข้อมูลเพิ่มเติม (ประเภทกิจการ, ทุนจดทะเบียน, ฯลฯ) เพื่อลดการสมมติข้อมูล
- **Anti-Hallucination Rules** — ทุก agent ต้องอ้างอิงมาตรา/กฎหมาย และแยกให้ชัดระหว่าง "ข้อเท็จจริง" กับ "ความเห็น"
- **Web Source Display** — แสดง URL แหล่งข้อมูลที่ agent ค้นหาจากอินเทอร์เน็ต พร้อมลิงก์คลิกได้
- **Professional Markdown Rendering** — render ข้อความ agent ด้วย Markdown (หัวข้อ, ตาราง, bullet, bold/italic, code block)
- **Chairman Auto-Detection** จาก role/seniority
- **Real-time SSE Streaming** — ดูทุก agent ตอบ real-time, แสดงหลาย agent กำลังคิดพร้อมกัน
- **Parallel Phase 1** — agents วิเคราะห์พร้อมกัน (Promise.allSettled) + rate-limit retry, ลดเวลาประชุมได้ ~15–30%
- **Agent Voice System** — แต่ละ agent มีสไตล์การพูดเฉพาะตัว (อ้างอิงกฎหมาย, ตั้งคำถามเชิงท้าทาย, วิเคราะห์ตัวเลข ฯลฯ)
- **Phase Progress Stepper** — แถบสถานะแสดง Phase ปัจจุบัน พร้อม sub-count "นำเสนอ (3/5)" ระหว่าง Phase 1
- **Phase Separators** — แสดงเส้นแบ่ง Phase พร้อม label สี (นำเสนอ / อภิปราย / สรุปมติ)
- **Thinking Animation** — แสดง card กำลังวิเคราะห์ พร้อม staggered animation เมื่อหลาย agent คิดพร้อมกัน
- **Data Sources:**
  - 📎 File Attachment (xlsx/xls/xlsm/pdf/docx/doc/csv/json/txt/md/log, max 10MB)
  - 🔌 MCP per Agent (ดึงข้อมูลจาก MCP Server อัตโนมัติ)
  - 🌐 Web Search (Serper/SerpAPI) per agent
- **History Modes:** Full, Last 3, Summary, None (ประหยัด token)
- **Token Tracking** per agent (input/output/total) + stats dashboard
- **Optimized LLM Calls** — max_tokens 2048, temperature 0.3, word limits per phase เพื่อลดค่าใช้จ่ายและเวลา
- **LLM Retry with Backoff** — auto-retry 1 ครั้งเมื่อเจอ rate limit (429) พร้อม 2s delay
- **Charts**: Auto-render Bar/Line/Pie จาก `chart` blocks ใน AI output
- **History**: ดูประวัติ sessions เก่า (เก็บ 100 sessions ล่าสุด)
- **Session Lifecycle Management:**
  - ⏱️ Auto-cleanup เซสชันค้าง >30 นาที
  - 📡 ปิดเซสชันอัตโนมัติเมื่อ client ตัดการเชื่อมต่อ / ปิดแท็บ
  - ⚠️ Badges "ค้าง" / "กำลังประชุม" ในรายการประวัติ
  - 🔒 ปุ่ม "ปิดประชุม" / "ถามต่อ" สำหรับเซสชันค้าง
- **Follow-up Suggestions** จาก AI
- **Meeting Timer** — นับเวลาประชุม (mm:ss) แสดงใน status bar
- **Token Cost Estimation** — แสดงจำนวน tokens + ค่าใช้จ่ายโดยประมาณ (~$X.XXX) ใน status bar
- **URL Param `?q=`** — เปิดห้องประชุมพร้อม prefill คำถามจาก dashboard template
- **Export Minutes** — บันทึกการประชุม Markdown พร้อมผู้เข้าประชุม, คำถามชี้แจง, ข้อค้นพบ, อภิปราย, มติ, แหล่งข้อมูลเว็บ, สรุป tokens

### 📋 Teams (`/teams`)

จัดกลุ่ม agents เป็น teams เพื่อเลือกใช้ใน Research — เปิด meeting room พร้อมทีมที่เลือกได้ทันที

### 📊 Token Analytics (`/tokens`)

แดชบอร์ดวิเคราะห์การใช้งาน tokens — แสดงค่าใช้จ่ายรวมเป็นบาท (≈ ฿X), กราฟรายวัน (30 วัน), รายละเอียดตาม agent พร้อม THB breakdown, sessions ล่าสุด

- **Hero card:** ค่าใช้จ่ายรวม ≈ ฿X (ใหญ่กว่า token count) + แนวโน้มเดือนนี้ vs เดือนก่อน
- **Budget progress bar:** ถ้าตั้ง monthly budget ใน Settings → แสดง % ที่ใช้ไปพร้อม warning สีส้ม (≥80%) / แดง (เกินงบ)
- **Per-agent THB:** ค่าใช้จ่ายแต่ละ agent คิดจาก model pricing × USD→THB rate

### 📖 User Guide (`/guide`)

คู่มือใช้งาน 8 ขั้นตอน — ตั้งแต่สร้าง agent ครั้งแรก จนถึงเริ่มประชุม AI ได้ด้วยตัวเอง (ภาษาไทย)

### 💰 Benefits & Pricing (`/benefits`)

หน้าแนะนำฟีเจอร์และแพ็คเกจ

| Plan         | ราคา         | รายละเอียด                                          |
| ------------ | ------------ | --------------------------------------------------- |
| Solo         | ฟรี 14 วัน   | 3 agents, 10 sessions, 1 user                       |
| Starter      | ฿790/เดือน   | 5 agents, ประชุมไม่จำกัด, file upload, 1 user       |
| Professional | ฿1,990/เดือน | Unlimited agents/sessions, 5 users, web search      |
| Enterprise   | ฿4,990/เดือน | Unlimited users, custom templates, MCP, white-label |

**บริการเสริม:**
| บริการ | ราคา |
|---------|------|
| Setup & Agent Config | 3,000–5,000 บาท/ครั้ง |
| Custom Agent Template | 2,000 บาท/ตัว |
| Training Workshop (2 ชม.) | 3,000 บาท/ครั้ง |
| Self-hosted License | 29,000 บาท/ปี |

> ค่า LLM API แยกต่างหาก (~0.50–5 บาท/session) — ลูกค้าใช้ API key ของตัวเอง (BYOK)

### ⚙️ Settings (`/settings`)

ตั้งค่าระบบ — Company Info, Web Search API keys, Budget

- **ข้อมูลบริษัท:** ชื่อ, ประเภทธุรกิจ, มาตรฐานบัญชี (NPAEs/PAEs), รอบบัญชี — ส่งให้ทุก agent อัตโนมัติ
- **Web Search:** Serper / SerpAPI keys พร้อมทดสอบ
- **งบประมาณรายเดือน (ใหม่):** ตั้ง monthly budget (฿) + USD→THB rate (default 36) — ใช้ใน Tokens dashboard

### 🌐 i18n & Theme

- **2 ภาษา:** ไทย / English
- **3 โหมด:** Auto (ตามระบบ/เวลา) / Dark / Light
- Auto ใช้ `prefers-color-scheme` + fallback ตามเวลา (06:00–18:00 = light)
- เก็บค่าใน localStorage

### 🧩 Shared UI Components (`app/components/`)

| Component           | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| `Button`            | primary / secondary / ghost / danger variants, sm / md / lg sizes           |
| `Card`              | hover effect, padding options, rounded-2xl                                  |
| `Modal`             | Escape key + focus trap, backdrop blur — mobile slides from bottom          |
| `Badge`             | default / accent / success / warning / danger / info variants               |
| `Toggle`            | Switch with label, sm / lg sizes, `role="switch"`                           |
| `EmptyState`        | Icon / emoji + title + description + optional action                        |
| `Toast`             | `showToast(type, message)` auto-dismiss 4s, 4 variants                      |
| `Skeleton`          | Loading placeholders — `Skeleton`, `SkeletonCard`, `SkeletonList`           |
| `KeyboardShortcuts` | `?` เปิด shortcuts, ⌘+1–5 สลับหน้า, ⌘+Shift+N ประชุมใหม่                    |
| `Tooltip`           | Hover + focus + tap (mobile), auto-flip placement, Esc to close             |
| `Alert`             | Persistent banner, 4 variants (info/warning/success/danger), dismissible    |
| `CostDisplay`       | แสดง token count + THB side-by-side, ใช้ `lib/pricing.ts`                   |
| `Breadcrumb`        | Semantic `<nav>` with `aria-current`, auto-derive from pathname             |

### 🧭 Navigation (Sidebar)

- **Icons:** Lucide React
- **Desktop:** Collapsible sidebar (224px ↔ 64px)
- **Mobile:** Header + slide-out drawer
- **Navigation Groups:**
  - **ห้องประชุม:** Research (ห้องประชุม AI)
  - **หน่วยงานราชการ:** Chat DBD (กรมพัฒนาธุรกิจการค้า), Chat RD (กรมสรรพากร)
  - **จัดการ:** Agents (ทีมที่ปรึกษา), Teams (ทีม), Tokens (สถิติการใช้งาน)
  - **ตั้งค่า:** Settings (ตั้งค่า), Guide (วิธีใช้งาน)
  - **อื่นๆ:** Benefits (แพ็คเกจ), Dashboard (หน้าหลัก)

---

## Supported Models

| Provider       | Models                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| **Anthropic**  | Claude 4.6 Opus, Claude 4.5 Sonnet, Claude 4 Sonnet, Claude 3.7 Sonnet, Claude 3 Haiku |
| **OpenAI**     | GPT-5.4, GPT-5.4 Mini, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o, o4 Mini, o3        |
| **Gemini**     | Gemini 2.5 Pro, 2.5 Flash, 2.5 Flash Lite, 2.0 Flash                                   |
| **Ollama**     | Llama 3.2, Mistral, Qwen 2.5 (local)                                                   |
| **OpenRouter** | 40+ models รวม DeepSeek V3.2/R1, Qwen3, Grok 4, Llama 4 + **5 free models**            |
| **Custom**     | OpenAI-compatible endpoint ใดก็ได้                                                     |

---

## Getting Started

```bash
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **📖 ติดตั้ง Production Server ตั้งแต่เริ่มต้น?** ดู [INSTALL.md](INSTALL.md) — คู่มือแบบ step-by-step สำหรับผู้ไม่มีความรู้ด้านเทคนิค
>
> **⚡ Quick Start?** ดู [quick_start.md](quick_start.md) — ติดตั้งเร็ว 5 นาที
>
> **📋 Changelog?** ดู [CHANGELOG.md](CHANGELOG.md) — ประวัติการอัปเดตทั้งหมด

---

## Requirements

- Node.js 22+
- No database required — ทุกอย่างเก็บเป็น JSON files ใน `~/.bossboard/`

---

## Data Storage

ข้อมูลเก็บใน **PostgreSQL** (ผ่าน Prisma v5) — ไม่ใช้ JSON files อีกต่อไป

| Table / Path | Contents |
| --- | --- |
| `agents` | Agent configs (API keys encrypted AES-256) |
| `agent_knowledge` | Knowledge file metadata per agent |
| `teams` / `team_agents` | Team groupings |
| `settings` | Web Search API keys (encrypted) |
| `research_sessions` / `research_messages` | Session + message history |
| `agent_stats` / `agent_daily_stats` | Per-agent token usage (90 days) |
| `client_memory` | Cross-session memory facts per user |
| `users` | User accounts (bcrypt passwords) |
| `~/.bossboard/knowledge/` | Knowledge file content (filesystem) |
| `~/.bossboard/system-knowledge/` | System agent knowledge (synced from GitHub) |

---

## Related Repositories

| Repository | Description |
|------------|-------------|
| [BossBoard](https://github.com/bosocmputer/BossBoard) | Main application — LEDGIO AI ห้องประชุม AI |
| [system-knowledge-ledgio-ai](https://github.com/bosocmputer/system-knowledge-ledgio-ai) | ฐานความรู้กลางสำหรับ System Agents (DBD/RD) — BossBoard ดึงไฟล์จาก repo นี้ผ่าน GitHub Raw URL |

**Flow:** `system-knowledge-ledgio-ai` (GitHub) → `syncSystemKnowledge()` fetch via Raw URL → เขียนลง `~/.bossboard/system-knowledge/` → System Agents ใช้เป็นฐานความรู้ในการประชุม

---

## Environment Variables

```env
# Custom encryption key for API keys (recommended for production)
# If not set, auto-generated and saved to ~/.bossboard/.encryption-key
AGENT_ENCRYPT_KEY=your-32-character-secret-key-here

# Override data directory (default: ~/.bossboard)
# OPENCLAW_HOME=/custom/path

# Node.js settings (set in Dockerfile)
# PORT=3000
# HOSTNAME=0.0.0.0
```

ดูตัวอย่างเต็มที่ [.env.example](.env.example)

---

## API Endpoints

| Route                              | Method            | Description                          |
| ---------------------------------- | ----------------- | ------------------------------------ |
| `/api/team-agents`                 | GET, POST         | List / Create agents                 |
| `/api/team-agents/[id]`            | PATCH, DELETE      | Update / Delete agent                |
| `/api/team-agents/[id]/knowledge`  | GET, POST, DELETE  | Agent knowledge base files           |
| `/api/team-agents/sync-knowledge`  | POST              | Sync system knowledge from GitHub    |
| `/api/team-models?provider=`       | GET               | Available models per provider        |
| `/api/teams`                       | GET, POST         | List / Create teams                  |
| `/api/teams/[id]`                  | PATCH, DELETE      | Update / Delete team                 |
| `/api/team-research`               | GET               | List research sessions               |
| `/api/team-research/[id]`          | GET               | Get specific session                 |
| `/api/team-research/stream`        | POST              | SSE streaming multi-agent research   |
| `/api/team-research/upload`        | POST              | Parse uploaded files to text context |
| `/api/team-settings`               | GET, POST         | Web search API keys                  |
| `/api/team-websearch`              | POST              | Perform web search                   |
| `/api/agent-stats`                 | GET               | Agent usage statistics               |
| `/api/token-usage`                 | GET               | Token usage tracking                 |
| `/api/client-memory`               | GET, POST, DELETE | Cross-session memory facts           |
| `/api/health`                      | GET               | Healthcheck (status + timestamp)     |

---

## Deployment

### Docker (recommended)

```bash
# Build and run
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
docker build -t bossboard .
docker run -d --name bossboard -p 3000:3000 \
  -v ~/.bossboard:/home/node/.bossboard \
  --restart unless-stopped bossboard
```

```bash
# Update
git pull origin main
docker build -t bossboard .
docker rm -f bossboard
docker run -d --name bossboard -p 3000:3000 \
  -v ~/.bossboard:/home/node/.bossboard \
  --restart unless-stopped bossboard
```

```bash
# View logs
docker logs -f bossboard
```

### Standalone (alternative)

```bash
npm install && npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone && PORT=3000 node server.js
```

---

## License

MIT
