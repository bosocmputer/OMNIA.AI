# Quick Start — OMNIA.AI

## ติดตั้งเร็ว (Local Dev)

```bash
# 1. ต้องมี Node.js 22+
node --version

# 2. ติดตั้ง dependencies
npm install

# 3. ตั้งค่า env
cp .env.example .env.local
# แก้ DATABASE_URL, REDIS_URL, JWT_SECRET, AGENT_ENCRYPT_KEY, OPENROUTER_API_KEY

# 4. เตรียม database
npx prisma migrate dev

# 5. รัน development server
npm run dev
# เปิด http://localhost:3000
```

## Production Build

```bash
npm run build
npm run start
```

## Production Docker

```bash
docker build -t omnia-ai .
docker run -d --name omnia-ai --restart unless-stopped --network host \
  -e DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5436/omniadb" \
  -e REDIS_URL="redis://127.0.0.1:6381" \
  -e JWT_SECRET="<openssl rand -hex 32>" \
  -e AGENT_ENCRYPT_KEY="<openssl rand -hex 16>" \
  -e OPENROUTER_API_KEY="sk-or-..." \
  -e NODE_ENV=production -e PORT=<free-port> -e HOSTNAME=0.0.0.0 \
  -v ~/.omnia-ai:/home/node/.omnia-ai \
  omnia-ai
```

## หลังติดตั้ง

1. สมัครสมาชิกที่ `/register` และยอมรับ PDPA
2. ระบบจะ seed โหราจารย์ AI 5 ท่านและทีมเริ่มต้นให้อัตโนมัติ
3. กรอกข้อมูลวันเกิดที่ `/profile`
4. เริ่มดูดวงที่ `/research`

คู่มือเต็มอยู่ที่ `INSTALL.md`
