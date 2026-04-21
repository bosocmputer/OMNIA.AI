# OMNIA.AI — Installation Guide

## Prerequisites

| Software | Version |
|----------|---------|
| Node.js | 20+ |
| PostgreSQL | 16+ |
| Redis | 7+ |
| pnpm | 9+ (แนะนำ) |
| Docker | 24+ (สำหรับ deploy) |

---

## Local Development

### 1. Clone & Install

```bash
git clone https://github.com/bosocmputer/OMNIA.AI.git
cd OMNIA.AI
pnpm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

แก้ไข `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/omniadb"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="$(openssl rand -hex 32)"
AGENT_ENCRYPT_KEY="$(openssl rand -hex 16)"
OPENROUTER_API_KEY="sk-or-..."
```

### 3. Database

```bash
# สร้าง database
createdb omniadb

# Run migrations
pnpm prisma migrate dev --name init

# (Optional) Seed admin user
DATABASE_URL="..." AGENT_ENCRYPT_KEY="..." npx ts-node --project tsconfig.json scripts/seed-admin.ts
```

### 4. Run

```bash
pnpm dev
# เปิด http://localhost:3000
```

---

## Production — Docker (Self-hosted)

### สิ่งที่ต้องเตรียมบน server

1. PostgreSQL container (หรือ managed DB) พร้อม database `omniadb`
2. Redis container
3. Generate secrets:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 16   # AGENT_ENCRYPT_KEY (ใช้ 16 bytes = 32 hex chars)
```

### Build & Run

```bash
docker build -t omnia-ai .

docker run -d \
  --name omnia-ai \
  --restart unless-stopped \
  --network host \
  -e DATABASE_URL="postgresql://USER:PASS@127.0.0.1:PORT/omniadb" \
  -e REDIS_URL="redis://127.0.0.1:6381" \
  -e NODE_ENV=production \
  -e PORT=3005 \
  -e HOSTNAME=0.0.0.0 \
  -e JWT_SECRET="<64-char-hex>" \
  -e AGENT_ENCRYPT_KEY="<32-char-key>" \
  -e OPENROUTER_API_KEY="sk-or-..." \
  -v ~/.omnia-ai:/home/node/.omnia-ai \
  omnia-ai
```

### Run Migrations บน server

```bash
docker exec omnia-ai npx prisma migrate deploy
```

### ตรวจสอบ

```bash
docker logs omnia-ai --tail 20
curl http://localhost:3005/api/health
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | HS256 signing secret (min 32 chars) |
| `AGENT_ENCRYPT_KEY` | ✅ | AES-256 key for agent data (32 chars) |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key |
| `NODE_ENV` | ✅ | `development` หรือ `production` |
| `PORT` | — | Default: 3000 |
| `HOSTNAME` | — | Default: localhost |
| `GOOGLE_CLIENT_ID` | — | Google OAuth (Phase 8) |
| `STRIPE_SECRET_KEY` | — | Stripe (Phase 10) |

---

## Default Server Config (ที่ใช้อยู่)

| Resource | Host | Port | Database |
|----------|------|------|----------|
| PostgreSQL | `ledgioai-db` | 5436 | `omniadb` |
| Redis | `ledgioai-redis` | 6381 | shared |
| OMNIA-AI app | `192.168.2.109` | **3005** | — |
| Volume | `~/.omnia-ai` | — | — |
