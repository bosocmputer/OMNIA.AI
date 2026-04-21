# BossBoard — UX/UI Overhaul Plan สำหรับพนักงานบัญชี (Package C — Complete)

> **Status:** ✅ เสร็จสมบูรณ์ — deploy แล้ว v1.13.0–v1.14.0 (2026-04-21)
> **Target user:** พนักงานบัญชี/สำนักงานบัญชีไทย (อายุ 25–50, คุ้น Excel/Express/Formula/MAC5, ไม่คุ้น AI/LLM)
> **Scope:** Complete polish — ทุกจุดที่วิเคราะห์ไว้

## Context

แอปตอนนี้ (v1.12.1) functional ครบ + design system สะอาด แต่ **ออกแบบสำหรับ tech-literate users** ไม่ใช่พนักงานบัญชี — มี gap สำคัญ 5 เรื่อง: ศัพท์ AI/technical, agent creation ซับซ้อน, research phase ไม่ชัดเจน + session หายเมื่อ refresh, token cost ไม่เป็นบาท, mobile ใช้ไม่สะดวก

---

## Phase 1 — Shared Components Library (Foundation) ✅

**Status:** เสร็จ 2026-04-21 | **Version:** v1.13.0-alpha

### 1.1 Shared Components ใหม่ใน `app/components/`

| Component | Status | Notes |
|-----------|--------|-------|
| `Tooltip.tsx` | ✅ Done | Hover + focus + tap mobile, auto-flip, Esc to close |
| `Input.tsx` | ✅ Done | label + error/hint + tooltip + icon + suffix |
| `Select.tsx` | ✅ Done | search + keyboard nav |
| `Table.tsx` | ✅ Done | mobile card list, sticky header |
| `Tabs.tsx` | ✅ Done | horizontal + arrow key nav |
| `Alert.tsx` | ✅ Done | persistent, 4 variants, dismissible |
| `Breadcrumb.tsx` | ✅ Done | semantic `<nav>` + aria-current |
| `CostDisplay.tsx` | ✅ Done | token count + THB side-by-side |

### 1.2 `lib/pricing.ts` ✅

- MODEL_PRICING map (Anthropic, OpenAI, Google, Groq, OpenRouter)
- `tokensToTHB(inputTokens, outputTokens, model?)` — rate จาก localStorage `usdThbRate` (default 36)
- `formatTHB(amount)` — format เป็น ฿X.XX หรือ ฿X,XXX
- `getRate()` — อ่าน localStorage ใน client, fallback 36

### 1.3 Accessibility Pass ✅

- `aria-current="page"` ใน sidebar active nav item
- Focus trap ใน Modal (useEffect + Tab/Shift+Tab handler)
- `aria-label` ใน hamburger, sidebar collapse button

---

## Phase 2 — Plain Thai + Glossary ✅

**Status:** เสร็จ 2026-04-21 | **Version:** v1.13.0-beta

### 2.1 `lib/glossary.ts` (new) ✅

22 entries ครอบคลุม 4 หมวด:
- **AI:** prompt, systemPrompt, contextWindow, streaming, rag, mcp, ttft, tokensPerSec, temperature, agent
- **Cost:** tokens, inputTokens, outputTokens
- **Accounting:** TFRS, NPAEs, PAEs, TSQC, COSO, มาตรา40, มาตรา65
- **UI:** session, team

### 2.2 Tooltips + Thai labels ✅

| หน้า | Label เดิม | Label ใหม่ |
|------|-----------|-----------|
| Dashboard | Agents | ที่ปรึกษา AI + tooltip |
| Dashboard | Sessions | การประชุม + tooltip |
| Tokens | Input Tokens | คำถามที่พิมพ์ (Input) + tooltip |
| Tokens | Output Tokens | คำตอบจาก AI (Output) + tooltip |
| Agents | Soul | บทบาท (System Prompt) + tooltip |
| Agents | Seniority | ลำดับอาวุโส + tooltip |
| Research | ความจำการประชุม | label + tooltip |
| Settings | มาตรฐานบัญชี | label + tooltip NPAEs/PAEs |

### 2.3 `/glossary` page ✅

- ตารางคำศัพท์ + search box + category filter (AI/Cost/Accounting/UI)
- Link จาก Guide page + Sidebar (nav.glossary)

---

## Phase 3 — Core Flow Improvements ✅

**Status:** เสร็จ 2026-04-21 | **Version:** v1.14.0

### 3.1 Agent Creation Wizard Mode ✅

- Toggle "โหมดง่าย / โหมดผู้เชี่ยวชาญ" — default = ง่าย
- **โหมดง่าย:** Template → 3-tier model picker → บทบาท → save (ซ่อน advanced tab)
- **3-Tier Model Picker:**
  - ประหยัด = `google/gemini-2.5-flash-lite` (ค่าพิมพ์ ฿3.6 / ตอบ ฿14.4 ต่อ 1M)
  - แนะนำ = `anthropic/claude-haiku-4-5`
  - คุณภาพสูง = `anthropic/claude-sonnet-4-6`
- **โหมดผู้เชี่ยวชาญ:** เห็น full model list + ขั้นสูง tab
- Template pricing → THB แทน USD
- Web search toggle → toast warning "อาจเพิ่มค่าใช้จ่าย Token"
- Save toast "บันทึกแล้ว" / "สร้างที่ปรึกษาแล้ว"

### 3.2 Research Page ✅ (บางส่วน)

- Phase labels → "เสนอความเห็น / แลกเปลี่ยน / สรุป"
- "ความจำการประชุม" label + tooltip อธิบาย

> **ยังไม่ทำ:** Visual progress bar + ETA, auto-save to Postgres, error recovery UI (agent timeout banner)

### 3.3 Chat vs Research Disambiguation ✅

- Dashboard: 2 card "ถามด่วน (Chat)" vs "ประชุมทีม (Research)" พร้อมคำอธิบาย

---

## Phase 4 — Token Cost in THB ✅

**Status:** เสร็จ 2026-04-21 | **Version:** v1.14.0

### 4.1 Tokens Page ✅

- **Hero card:** ค่าใช้จ่ายรวม ≈ ฿X (ใหญ่กว่า token count)
- **Budget progress bar:** ถ้าตั้ง budget → แสดง % ใช้ไป + warning ส้ม (≥80%) / แดง (เกินงบ)
- **Per-agent breakdown:** THB ข้างจำนวน tokens
- Stat labels → ภาษาไทยพร้อม tooltip

> **ยังไม่ทำ:** Per-session cost column, historical compare chart redesign mobile

### 4.2 Agent Model Pricing Display ✅

- Template `recommendedReason` → THB แทน USD (ค่าพิมพ์ ฿X / ตอบ ฿Y ต่อ 1 ล้านคำ)

### 4.3 Settings — Budget Config ✅

- Section "งบประมาณรายเดือน" — budget (฿) + USD→THB rate
- Persist ไป localStorage `monthlyBudgetTHB` + `usdThbRate`
- `lib/pricing.ts` อ่าน rate ผ่าน `getRate()` อัตโนมัติ

---

## Phase 5 — Mobile Polish + Login + Guide + Admin + Benefits ✅

**Status:** เสร็จ 2026-04-21 | **Version:** v1.14.0

### 5.1 Mobile Responsive ✅ (บางส่วน)

- **Modal → bottom-sheet บน mobile:** `items-end md:items-center` + `rounded-t-2xl md:rounded-xl`

> **ยังไม่ทำ:** Tokens chart horizontal list, emoji picker redesign, bottom nav 4-icon

### 5.2 Login Polish ✅

- Password show/hide toggle (Eye icon)
- "ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ" link
- Dynamic year `{new Date().getFullYear()}`

> **ยังไม่ทำ:** Field-specific errors (security concern — revealing account existence)

### 5.3 Onboarding Interactive ⏳

> **ยังไม่ทำ:** Interactive tour 5 steps หลัง login ครั้งแรก

### 5.4 Guide Page ✅

- Default expanded: "get-started" (แก้จาก "api-key" ซึ่งไม่มีในระบบ)
- FAQ multi-expand ได้พร้อมกัน (Set<number> state)

### 5.5 Admin Users ✅ (บางส่วน)

- Role labels → "ผู้จัดการระบบ" / "ผู้ใช้ทั่วไป"
- Delete confirm → "ข้อมูลการประชุมของผู้ใช้จะยังถูกเก็บไว้ แต่ผู้ใช้จะเข้าระบบไม่ได้อีก"

> **ยังไม่ทำ:** Password reset modal (ยังเป็น inline), lastLoginAt column (ต้องเพิ่ม schema), password strength indicator

### 5.6 Benefits Page ✅

- Solo → "ทดลองฟรี 14 วัน" (consistent)
- VAT note → "ราคายังไม่รวม VAT 7%"
- CTA differentiation → Solo = outline border, Starter/Pro/Enterprise = filled accent

---

## Phase 6 — Audit + Testing ✅ (บางส่วน)

- TypeScript type check: ✅ ผ่าน clean
- Next.js build: ✅ ผ่าน (34 routes, 18.4s compile)
- Lighthouse / axe / mobile device testing: ⏳ ยังไม่ได้ทำ formal audit

---

## สรุปสิ่งที่ยังเหลือ (Backlog)

| Item | Phase | Priority |
|------|-------|----------|
| Research: visual progress bar + ETA | 3.2 | 🟡 Medium |
| Research: auto-save to Postgres | 3.2 | 🟡 Medium |
| Research: error recovery UI (agent timeout) | 3.2 | 🟡 Medium |
| Tokens: per-session THB column | 4.1 | 🟢 Low |
| Tokens: mobile horizontal chart | 5.1 | 🟢 Low |
| Onboarding: interactive tour | 5.3 | 🟢 Low |
| Admin: password reset modal | 5.5 | 🟢 Low |
| Admin: lastLoginAt column (schema change) | 5.5 | 🟢 Low |
| Admin: password strength indicator | 5.5 | 🟢 Low |
| Lighthouse a11y ≥ 90 formal audit | 6 | 🟢 Low |
| Mobile device testing (iPhone SE, iPad) | 6 | 🟢 Low |

---

## Verification Checklist

- [x] Non-technical user สร้าง agent ใหม่ใน 3 นาที — wizard mode ง่าย ✅
- [x] `/tokens` บอกค่าใช้จ่ายเป็นบาทได้ทันที — hero card ≈ ฿X ✅
- [x] Hover ทุก AI jargon → เห็น Thai tooltip ✅
- [x] Login: พิมพ์รหัสผ่านแสดงได้ด้วย Eye icon ✅
- [x] Guide: FAQ expand ได้พร้อมกันหลายข้อ ✅
- [x] Modal: เปิดบน mobile → slide from bottom ✅
- [x] Build clean + TypeScript ไม่มี error ✅
- [x] Deploy healthy: `curl /api/health` → `{"status":"ok","db":"ok","redis":"ok"}` ✅
- [ ] Research kill agent mid-synthesis → UI recover ได้ (ยังไม่ implement)
- [ ] Refresh /research → session กลับมา (auto-save ยังไม่ implement)
- [ ] Keyboard-only navigate ทั้ง app (formal test ยังไม่ทำ)
- [ ] Lighthouse a11y ≥ 90, performance ≥ 80 mobile (ยังไม่ทำ)
