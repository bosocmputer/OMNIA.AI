# Quick Start — BossBoard ห้องประชุม AI

## ติดตั้งเร็ว (5 นาที)

```bash
# 1. ต้องมี Node.js 22+
node --version    # ต้องได้ v22.x.x

# 2. Clone และติดตั้ง
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
npm install

# 3. ตั้งค่า encryption key (แนะนำ)
echo "AGENT_ENCRYPT_KEY=$(openssl rand -hex 16)" > .env.local

# 4. รัน Development
npm run dev
# เปิด http://localhost:3000
```

## รัน Production (Docker — แนะนำ)

```bash
docker build -t bossboard .
docker run -d --name bossboard -p 3003:3000 \
  -v ~/.bossboard:/home/node/.bossboard \
  --restart unless-stopped bossboard
# เปิด http://localhost:3003
```

## รัน Production (Standalone)

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone
PORT=3003 node server.js
# เปิด http://localhost:3003
```

## หลังติดตั้ง

1. เปิดเบราว์เซอร์ → `http://localhost:3000` (dev) หรือ `http://<IP>:3003` (production)
2. ไปที่ **👥 จัดการเอเจนต์** → สร้าง agent อย่างน้อย 2 ตัว (ใส่ API Key จาก OpenRouter/OpenAI/etc.)
3. ไปที่ **🏛️ ห้องประชุม** → เลือก agents → พิมพ์คำถาม → **เริ่มประชุม**

## ต้องการคู่มือเต็ม?

ดู [INSTALL.md](INSTALL.md) — คู่มือติดตั้ง server ตั้งแต่เริ่มต้น สำหรับผู้ไม่มีความรู้ด้านเทคนิค
