# คู่มือติดตั้ง BossBoard — ห้องประชุม AI

คู่มือนี้ครอบคลุมการติดตั้งตั้งแต่เริ่มต้น สำหรับผู้ที่ไม่มีความรู้ด้านเทคนิค

---

## สารบัญ

1. [ความต้องการของระบบ (System Requirements)](#1-ความต้องการของระบบ)
2. [ติดตั้ง OS และ Software พื้นฐาน](#2-ติดตั้ง-os-และ-software-พื้นฐาน)
3. [ติดตั้ง BossBoard](#3-ติดตั้ง-bossboard)
4. [ตั้งค่าให้รันอัตโนมัติ (Systemd Service)](#4-ตั้งค่าให้รันอัตโนมัติ)
5. [ตั้งค่า Firewall](#5-ตั้งค่า-firewall)
6. [ตั้งค่า Reverse Proxy (Nginx) — ถ้าต้องการ Domain](#6-ตั้งค่า-reverse-proxy-nginx)
7. [ตั้งค่า SSL (HTTPS) — ถ้าต้องการ](#7-ตั้งค่า-ssl-https)
8. [ติดตั้งด้วย Docker (ทางเลือก)](#8-ติดตั้งด้วย-docker)
9. [ตั้งค่า AI Agents (หลังติดตั้งแล้ว)](#9-ตั้งค่า-ai-agents)
10. [การอัปเดตระบบ](#10-การอัปเดตระบบ)
11. [การสำรองข้อมูล (Backup)](#11-การสำรองข้อมูล)
12. [แก้ไขปัญหาที่พบบ่อย (Troubleshooting)](#12-แก้ไขปัญหาที่พบบ่อย)

---

## 1. ความต้องการของระบบ

### Hardware ขั้นต่ำ

| รายการ | ขั้นต่ำ | แนะนำ |
|--------|---------|-------|
| CPU | 2 Cores | 4 Cores |
| RAM | 2 GB | 4 GB |
| พื้นที่ดิสก์ | 10 GB (SSD) | 20 GB (SSD) |
| Network | มีอินเทอร์เน็ต (เรียก API ภายนอก) | Bandwidth 10 Mbps+ |

> **หมายเหตุ:** BossBoard ไม่ใช้ฐานข้อมูล ไม่ต้องติดตั้ง MySQL/PostgreSQL — ข้อมูลเก็บเป็นไฟล์ JSON

### Software ที่ต้องการ

| Software | Version | หมายเหตุ |
|----------|---------|----------|
| **OS** | Ubuntu 24.04 LTS (แนะนำ) | หรือ Ubuntu 22.04 LTS, Debian 12 |
| **Node.js** | 22.x LTS | ต้อง v22 ขึ้นไป (รองรับ Next.js 16) |
| **npm** | 10.x+ | มาพร้อม Node.js |
| **Git** | 2.x+ | สำหรับ clone โค้ด |

### API Key ที่ต้องเตรียม (อย่างน้อย 1 อย่าง)

BossBoard ต้องเชื่อมต่อกับ AI Provider เพื่อให้ agents ทำงานได้:

| Provider | ราคาโดยประมาณ | สมัครที่ |
|----------|---------------|---------|
| **OpenRouter** (แนะนำ) | มี model ฟรี + เสียเงิน | https://openrouter.ai |
| Google Gemini | มี free tier | https://aistudio.google.com |
| OpenAI | ~$0.01–0.03/1k tokens | https://platform.openai.com |
| Anthropic | ~$0.01–0.08/1k tokens | https://console.anthropic.com |

> **แนะนำ:** เริ่มต้นด้วย **OpenRouter** เพราะมี model ฟรีหลายตัว และรองรับ models จากหลาย provider ใน API key เดียว

---

## 2. ติดตั้ง OS และ Software พื้นฐาน

### 2.1 ติดตั้ง Ubuntu 24.04 LTS

1. ดาวน์โหลด ISO จาก https://ubuntu.com/download/server
2. สร้าง USB boot ด้วย [Rufus](https://rufus.ie) (Windows) หรือ [balenaEtcher](https://etcher.balena.io) (Mac/Linux)
3. ติดตั้ง Ubuntu Server — เลือก:
   - ภาษา: English
   - Keyboard: English (US)
   - Network: เลือก DHCP หรือตั้ง Static IP (แนะนำ Static IP สำหรับ server)
   - Storage: ใช้ทั้ง disk
   - Profile: ตั้ง username และ password
   - SSH: ☑ Install OpenSSH server

### 2.2 อัปเดตระบบ

เข้า server ผ่าน SSH หรือ terminal:

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 ติดตั้ง Node.js 22

```bash
# ติดตั้ง Node.js 22 LTS จาก NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# ตรวจสอบ version
node --version    # ต้องได้ v22.x.x
npm --version     # ต้องได้ 10.x.x
```

### 2.4 ติดตั้ง Git

```bash
sudo apt install -y git

# ตรวจสอบ
git --version     # ต้องได้ 2.x.x
```

### 2.5 ติดตั้ง build tools (สำหรับ npm packages ที่ต้อง compile)

```bash
sudo apt install -y build-essential python3
```

---

## 3. ติดตั้ง BossBoard

### 3.1 Clone โปรเจค

```bash
cd ~
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
```

### 3.2 ติดตั้ง Dependencies

```bash
npm install
```

> ใช้เวลาประมาณ 1-3 นาที ขึ้นอยู่กับความเร็วอินเทอร์เน็ต

### 3.3 ตั้งค่า Encryption Key (สำคัญมาก!)

สร้าง encryption key สำหรับเข้ารหัส API keys:

```bash
# สร้าง key แบบสุ่ม 32 ตัวอักษร
ENCRYPT_KEY=$(openssl rand -hex 16)
echo "AGENT_ENCRYPT_KEY=$ENCRYPT_KEY" > .env.local
echo "✅ Encryption key: $ENCRYPT_KEY"
echo "⚠️ เก็บ key นี้ไว้ให้ดี! ถ้าหาย จะถอดรหัส API keys ไม่ได้"
```

> **สำคัญ:** สำรอง key นี้ไว้ในที่ปลอดภัย ถ้าเสียไฟล์ `.env.local` จะต้องตั้ง API keys ใหม่ทั้งหมด

### 3.4 Build โปรเจค

```bash
npm run build
```

> ใช้เวลาประมาณ 1-2 นาที ต้องได้ข้อความ `✓ Generating static pages` สำเร็จ

### 3.5 เตรียม Standalone Server

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

### 3.6 ทดสอบรัน

```bash
cd .next/standalone
PORT=3003 node server.js
```

- เปิดเว็บเบราว์เซอร์ไปที่ `http://<IP-ของ-server>:3003`
- ถ้าเห็นหน้า Dashboard → ติดตั้งสำเร็จ ✅
- กด `Ctrl+C` เพื่อหยุด

---

## 4. ตั้งค่าให้รันอัตโนมัติ

เมื่อ server restart ระบบจะเปิด BossBoard ให้อัตโนมัติ:

### 4.1 คัดลอก .env.local ไปยัง standalone

```bash
cd ~/BossBoard
cp .env.local .next/standalone/.env.local
```

### 4.2 สร้าง Systemd Service

```bash
sudo tee /etc/systemd/system/bossboard.service << 'EOF'
[Unit]
Description=BossBoard AI Meeting Room
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/BossBoard/.next/standalone
Environment=NODE_ENV=production
Environment=PORT=3003
EnvironmentFile=/home/$USER/BossBoard/.env.local
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

> **แก้ `$USER`** เป็น username ของคุณ เช่น `bosscatdog`

### 4.3 เปิดใช้และสั่งรัน

```bash
sudo systemctl daemon-reload
sudo systemctl enable bossboard
sudo systemctl start bossboard

# ตรวจสอบสถานะ
sudo systemctl status bossboard
```

### 4.4 คำสั่งที่ใช้บ่อย

```bash
sudo systemctl start bossboard     # เริ่ม
sudo systemctl stop bossboard      # หยุด
sudo systemctl restart bossboard   # รีสตาร์ท
sudo systemctl status bossboard    # ดูสถานะ
journalctl -u bossboard -f         # ดู logs แบบ real-time
```

---

## 5. ตั้งค่า Firewall

```bash
# เปิด port สำหรับ SSH และ BossBoard
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3003/tcp    # BossBoard
sudo ufw enable

# ตรวจสอบ
sudo ufw status
```

---

## 6. ตั้งค่า Reverse Proxy (Nginx)

ถ้าต้องการเข้าผ่าน domain หรือ port 80/443:

### 6.1 ติดตั้ง Nginx

```bash
sudo apt install -y nginx
```

### 6.2 สร้าง config

```bash
sudo tee /etc/nginx/sites-available/bossboard << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # ← แก้เป็น domain หรือ IP ของคุณ

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE (Server-Sent Events) settings — จำเป็นสำหรับห้องประชุม
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
    }

    # จำกัดขนาดไฟล์แนบ 10MB
    client_max_body_size 10M;
}
EOF

sudo ln -sf /etc/nginx/sites-available/bossboard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. ตั้งค่า SSL (HTTPS)

ถ้ามี domain จริงและต้องการ HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

> Certbot จะตั้งค่า auto-renew ให้อัตโนมัติ

---

## 8. ติดตั้งด้วย Docker (ทางเลือก)

ถ้าต้องการใช้ Docker แทนการติดตั้งโดยตรง:

### 8.1 ติดตั้ง Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# ออกจาก SSH แล้ว login ใหม่
```

### 8.2 Build และรัน

```bash
cd ~/BossBoard

docker build -t bossboard .

docker run -d \
  --name bossboard \
  --restart unless-stopped \
  -p 3003:3000 \
  -v ~/.bossboard:/home/node/.bossboard \
  -e AGENT_ENCRYPT_KEY="$(cat .env.local | grep AGENT_ENCRYPT_KEY | cut -d= -f2)" \
  bossboard
```

> ⚠️ **สำคัญ:** Volume ต้อง mount ไปที่ `/home/node/.bossboard` เท่านั้น  
> ห้ามใช้ `/root/.bossboard` เพราะ container รันเป็น user `node` (uid=1000) ซึ่งไม่มีสิทธิ์เข้าถึง `/root/`  
> หาก mount ผิดจะทำให้ agents, teams, settings หายทั้งหมด

### 8.3 คำสั่ง Docker ที่ใช้บ่อย

```bash
docker logs -f bossboard       # ดู logs
docker restart bossboard       # รีสตาร์ท
docker stop bossboard          # หยุด
docker start bossboard         # เริ่ม
```

---

## 9. ตั้งค่า AI Agents (หลังติดตั้งแล้ว)

### 9.1 เข้าหน้าเว็บ

เปิดเบราว์เซอร์ไปที่ `http://<IP-server>:3003`

### 9.2 สร้าง Agent ตัวแรก

1. ไปที่เมนู **👥 จัดการเอเจนต์** (หรือ `/agents`)
2. กด **"+ เพิ่มเอเจนต์"**
3. เลือก Template เช่น "นักบัญชีอาวุโส"
4. ตั้งค่า:
   - **Provider:** OpenRouter (แนะนำ)
   - **Model:** เลือก model ที่ต้องการ
   - **API Key:** ใส่ key ที่สมัครไว้จาก https://openrouter.ai
   - **Soul:** บุคลิกและจุดยืนของ agent (template มีให้เลย)
   - **Seniority:** ลำดับอาวุโส (1 = สูงสุด = เป็นประธาน)
5. กด **บันทึก**

### 9.3 สร้างทีม

1. ไปที่เมนู **📋 ทีม** (หรือ `/teams`)
2. สร้างทีมใหม่ เลือก agents ที่ต้องการ

### 9.4 ทดลองประชุม

1. ไปที่เมนู **🏛️ ห้องประชุม** (หรือ `/research`)
2. เลือก agents/team
3. พิมพ์คำถาม เช่น "วิเคราะห์งบกำไรขาดทุน ปี 2024"
4. แนบไฟล์ถ้ามี (Excel, PDF, Word)
5. กด **เริ่มประชุม**

### 9.5 แนะนำ: ตั้งค่า Agents สำหรับสำนักงานบัญชี

| Agent | Provider | Model แนะนำ | Seniority |
|-------|----------|-------------|-----------|
| หัวหน้าบัญชี | OpenRouter | google/gemini-2.5-flash | 10 (ประธาน) |
| ผู้สอบบัญชี | OpenRouter | google/gemini-2.5-pro-preview | 20 |
| ที่ปรึกษาภาษี | OpenRouter | anthropic/claude-4-sonnet | 25 |
| นักวิเคราะห์การเงิน | OpenRouter | openai/gpt-4.1-mini | 35 |
| เจ้าหน้าที่ Compliance | OpenRouter | openai/gpt-4.1-mini | 40 |
| ผู้จัดการสำนักงาน | OpenRouter | openai/gpt-4.1-nano | 45 |
| พนักงานบัญชี | OpenRouter | openai/gpt-4.1-mini | 60 |

> **เคล็ดลับ:** ใช้ model ที่แตกต่างกันในแต่ละ agent เพื่อให้ได้มุมมองที่หลากหลาย

---

## 10. การอัปเดตระบบ

เมื่อมีเวอร์ชันใหม่:

```bash
cd ~/BossBoard

# ดึงโค้ดใหม่
git pull origin main

# ติดตั้ง dependencies ใหม่ (ถ้ามี)
npm install

# Build ใหม่
npm run build

# เตรียม standalone
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local

# รีสตาร์ท service
sudo systemctl restart bossboard

# ตรวจสอบ
sudo systemctl status bossboard
```

---

## 11. การสำรองข้อมูล

### ข้อมูลที่ต้องสำรอง

```bash
# ข้อมูล BossBoard ทั้งหมดอยู่ที่:
~/.bossboard/

# ประกอบด้วย:
# agents.json          — ข้อมูล agents (API keys เข้ารหัส)
# teams.json           — ข้อมูลทีม
# settings.json        — ค่า Web Search API keys
# research-history.json — ประวัติการประชุม (100 sessions ล่าสุด)
# agent-stats.json     — สถิติการใช้งาน
# company-info.json    — ข้อมูลบริษัท
# knowledge/           — ไฟล์ความรู้ของ agents
```

### สำรองข้อมูลด้วย cron (ทุกวัน)

```bash
# สร้างโฟลเดอร์ backup
sudo mkdir -p /backup/bossboard

# ตั้งค่า cron job
crontab -e
# เพิ่มบรรทัดนี้:
0 2 * * * tar -czf /backup/bossboard/backup-$(date +\%Y\%m\%d).tar.gz -C /home/$USER .bossboard/
```

### กู้คืนข้อมูล

```bash
# กู้คืนจาก backup
tar -xzf /backup/bossboard/backup-YYYYMMDD.tar.gz -C /home/$USER/
sudo systemctl restart bossboard
```

### สำรอง Encryption Key (สำคัญมาก!)

```bash
# คัดลอก .env.local ไปเก็บที่ปลอดภัย
cp ~/BossBoard/.env.local /backup/bossboard/env-backup.txt
```

> ⚠️ ถ้าสูญเสีย `AGENT_ENCRYPT_KEY` จะไม่สามารถถอดรหัส API keys ที่เก็บไว้ได้ ต้องตั้งค่า API keys ใหม่ทั้งหมด

---

## 12. แก้ไขปัญหาที่พบบ่อย

### เว็บเปิดไม่ได้

```bash
# ตรวจสอบว่า service ทำงานอยู่
sudo systemctl status bossboard

# ดู logs
journalctl -u bossboard --no-pager -n 50

# ตรวจสอบ port
sudo lsof -i :3003
```

### Build ไม่ผ่าน

```bash
# ลบ cache แล้ว build ใหม่
rm -rf .next node_modules
npm install
npm run build
```

### npm install ช้า หรือ error

```bash
# ลอง clear cache
npm cache clean --force
npm install
```

### Agent ไม่ตอบ (error)

- ตรวจสอบ API Key ถูกต้อง
- ตรวจสอบ model name ถูกต้อง (ดูในหน้า agents)
- ลองเปลี่ยน model อื่น
- ดู logs: `journalctl -u bossboard -f` แล้วลองประชุมใหม่

### ข้อความถูกตัดกลาง (เวอร์ชันเก่า)

อัปเดตเป็นเวอร์ชันล่าสุด — ปัญหานี้แก้ไขแล้ว (เพิ่ม max_tokens จาก 2048 เป็น 4096)

### RAM ไม่พอ

```bash
# ตรวจสอบ RAM
free -h

# ถ้า RAM < 2GB ให้เพิ่ม swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### อัปเดตแล้วเว็บไม่เปลี่ยนแปลง

```bash
# ล้าง browser cache (Ctrl+Shift+R)
# หรือรัน build ใหม่:
cd ~/BossBoard
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
sudo systemctl restart bossboard
```

---

## สรุปคำสั่งทั้งหมด (Quick Reference)

```bash
# === ติดตั้งครั้งแรก ===
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git build-essential python3
git clone https://github.com/bosocmputer/BossBoard.git
cd BossBoard
npm install
ENCRYPT_KEY=$(openssl rand -hex 16)
echo "AGENT_ENCRYPT_KEY=$ENCRYPT_KEY" > .env.local
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local

# === ทดสอบ ===
cd .next/standalone && PORT=3003 node server.js

# === อัปเดต ===
cd ~/BossBoard && git pull origin main && npm install && npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
sudo systemctl restart bossboard

# === จัดการ service ===
sudo systemctl start|stop|restart|status bossboard
journalctl -u bossboard -f
```

---

## ค่าใช้จ่ายโดยประมาณ

| รายการ | ค่าใช้จ่าย |
|--------|-----------|
| Server (VPS) | ฿200-500/เดือน (2 CPU, 2GB RAM) |
| Domain + SSL | ฟรี (Let's Encrypt) หรือ ฿300-500/ปี |
| **LLM API** | **~฿0.50-5/session** (ขึ้นอยู่กับ model) |
| Software | ฟรี (Open Source) |

> **ตัวอย่าง:** ประชุม 30 ครั้ง/เดือน ด้วย OpenRouter models → ค่า API ประมาณ ฿15-150/เดือน
