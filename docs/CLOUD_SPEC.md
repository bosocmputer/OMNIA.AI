# LEDGIO AI — Cloud Deployment Specification

> วิเคราะห์จากข้อมูลจริงบน demo server (2026-04-18)  
> ใช้สำหรับการเลือก Cloud Provider และ spec เครื่องที่เหมาะสม

---

## ข้อมูลจริงจาก Demo Server

| รายการ | ค่าที่วัดได้ |
| ------ | ----------- |
| RAM ที่ bossboard ใช้ (idle) | ~48 MB |
| RAM ที่ bossboard ใช้ (during meeting) | ~150–250 MB (ประมาณ — SSE streaming + context) |
| CPU (idle) | ~0% |
| CPU (during meeting, 5 agents) | ~15–40% (1 core) |
| Docker image + standalone build | ~79 MB |
| Data storage (`~/.bossboard/`) | ~784 KB (29 sessions, 7 agents) |
| Data storage (100 sessions, คาดการณ์) | ~3–5 MB |

---

## ระบบความต้องการ (System Requirements)

### Minimum — Self-hosted / Solo user

เหมาะสำหรับ: ทดสอบ, demo, ใช้คนเดียว

| รายการ | Spec |
| ------ | ---- |
| CPU | 1 vCPU |
| RAM | 1 GB |
| Disk | 20 GB SSD |
| OS | Ubuntu 22.04 / 24.04 LTS |
| Network | 100 Mbps (shared) |
| Docker | Docker Engine 24+ |

### Recommended — Production (1–10 users พร้อมกัน)

เหมาะสำหรับ: สำนักงานบัญชีขนาดเล็ก, ลูกค้า Starter/Professional

| รายการ | Spec |
| ------ | ---- |
| CPU | 2 vCPU |
| RAM | 4 GB |
| Disk | 40 GB SSD |
| OS | Ubuntu 22.04 / 24.04 LTS |
| Network | 1 Gbps (shared) |
| Docker | Docker Engine 24+ |

### Scale — Production (10–50 users พร้อมกัน)

เหมาะสำหรับ: SaaS multi-tenant, Enterprise plan

| รายการ | Spec |
| ------ | ---- |
| CPU | 4 vCPU |
| RAM | 8 GB |
| Disk | 80 GB SSD |
| OS | Ubuntu 22.04 / 24.04 LTS |
| Network | 1 Gbps dedicated |
| Database | Postgres 16 (managed หรือ self-hosted) |
| Cache | Redis 7 |

> **หมายเหตุ:** meeting แต่ละครั้งยิง LLM calls 10–20 ครั้ง (5 agents × 3–4 phases) — bottleneck หลักคือ network latency ไป LLM API ไม่ใช่ CPU/RAM

---

## Cloud Provider Comparison

### Option A — DigitalOcean Droplet ⭐ แนะนำ

เหมาะสุดสำหรับ developer/startup — UI ง่าย, ราคาชัดเจน, มี managed database

| Plan | vCPU | RAM | SSD | ราคา/เดือน | เหมาะกับ |
| ---- | ---- | --- | --- | ---------- | -------- |
| Basic (Minimum) | 1 | 1 GB | 25 GB | ~$6 | Dev/Demo |
| Basic (Recommended) | 2 | 2 GB | 60 GB | ~$18 | 1–5 users |
| General Purpose | 2 | 4 GB | 25 GB | ~$36 | 5–20 users |
| General Purpose | 4 | 8 GB | 50 GB | ~$72 | 20–50 users |

**เพิ่มเติม:**
- Managed Postgres (1 GB RAM): ~$15/เดือน
- Managed Redis: ~$15/เดือน  
- Spaces (Object Storage สำหรับ knowledge files): ~$5/เดือน

**สำหรับ production ที่แนะนำ:**
- Droplet 2 vCPU / 4 GB = ~$36/เดือน
- Managed Postgres = ~$15/เดือน
- **รวม ~$51/เดือน (~1,850 บาท/เดือน)**

---

### Option B — Vultr

ราคาถูกกว่า DO เล็กน้อย, datacenter ใน Singapore (latency ดีสำหรับไทย)

| Plan | vCPU | RAM | SSD | ราคา/เดือน |
| ---- | ---- | --- | --- | ---------- |
| Cloud Compute | 1 | 1 GB | 25 GB | ~$5 |
| Cloud Compute | 2 | 2 GB | 55 GB | ~$10 |
| Cloud Compute | 2 | 4 GB | 80 GB | ~$20 |
| Cloud Compute | 4 | 8 GB | 160 GB | ~$40 |

**Singapore region แนะนำ** — latency จากไทยต่ำกว่า US

---

### Option C — AWS EC2 (ถ้าต้องการ enterprise ecosystem)

ซับซ้อนกว่า แต่ ecosystem ครบที่สุด

| Instance | vCPU | RAM | ราคา/เดือน (on-demand) | ราคา/เดือน (reserved 1yr) |
| -------- | ---- | --- | ---------------------- | ------------------------- |
| t3.small | 2 | 2 GB | ~$17 | ~$11 |
| t3.medium | 2 | 4 GB | ~$34 | ~$21 |
| t3.large | 2 | 8 GB | ~$67 | ~$42 |
| c5.xlarge | 4 | 8 GB | ~$170 | ~$107 |

**บริการเสริม AWS ที่ควรใช้:**
- RDS Postgres (db.t3.micro): ~$15/เดือน
- ElastiCache Redis (cache.t3.micro): ~$13/เดือน
- S3 (knowledge files): ~$1/เดือน
- CloudFront CDN: ~$1–5/เดือน

---

### Option D — Hetzner Cloud (ถูกที่สุด, datacenter ยุโรป)

ถูกมากแต่ datacenter อยู่ยุโรป/US — latency จากไทยสูงกว่า

| Plan | vCPU | RAM | SSD | ราคา/เดือน |
| ---- | ---- | --- | --- | ---------- |
| CX21 | 2 | 4 GB | 40 GB | ~€4.85 (~$5) |
| CX31 | 2 | 8 GB | 80 GB | ~€8.49 (~$9) |
| CX41 | 4 | 16 GB | 160 GB | ~€15.49 (~$17) |

> ถูกที่สุด แต่ถ้า latency สำคัญ (ลูกค้าอยู่ไทย) แนะนำ Vultr Singapore แทน

---

## Software Stack ที่ต้องติดตั้ง

### Required (ทุก environment)

| Software | Version | Purpose |
| -------- | ------- | ------- |
| Ubuntu Server | 22.04 / 24.04 LTS | OS |
| Docker Engine | 24+ | Container runtime |
| Docker Compose | v2 | Multi-container management |
| Nginx | 1.24+ | Reverse proxy + SSL termination |
| Certbot | latest | Let's Encrypt SSL certificate |

### Application Stack (ใน Docker)

| Container | Image | Purpose |
| --------- | ----- | ------- |
| bossboard | custom (Next.js 16) | LEDGIO AI app |
| postgres | postgres:16-alpine | Database (Phase 2+) |
| redis | redis:7-alpine | Rate limiting + cache (Phase 5+) |

### Optional (Phase 3+)

| Software | Purpose |
| -------- | ------- |
| Uptime Kuma | Self-hosted monitoring + alerts |
| Loki + Grafana | Log aggregation และ dashboard |
| Watchtower | Auto-update Docker containers |

---

## Nginx Configuration (ตัวอย่าง)

```nginx
server {
    listen 80;
    server_name ledgio.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ledgio.example.com;

    ssl_certificate     /etc/letsencrypt/live/ledgio.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ledgio.example.com/privkey.pem;

    # SSE streaming — ปิด buffering เพื่อให้ stream ผ่านได้
    proxy_buffering off;
    proxy_cache off;

    # Timeout สูงสำหรับ meeting (อาจนาน 5–10 นาที)
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;

    # Rate limit ระดับ Nginx
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/team-research/stream {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        limit_req zone=api burst=5 nodelay;
    }
}
```

---

## Docker Compose (Production)

```yaml
# docker-compose.prod.yml
services:
  bossboard:
    image: bossboard:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3003:3000"  # bind localhost เท่านั้น (Nginx จัดการ public)
    volumes:
      - bossboard-data:/home/node/.bossboard
    environment:
      - NODE_ENV=production
      - TZ=Asia/Bangkok
      - AGENT_ENCRYPT_KEY=${AGENT_ENCRYPT_KEY}
      # Phase 2+: เปิดเมื่อย้ายไป Postgres
      # - DATABASE_URL=postgresql://user:pass@postgres:5432/bossboard
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=bossboard
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASS}

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --save 60 1 --loglevel warning

volumes:
  bossboard-data:
  postgres-data:
  redis-data:
```

---

## Environment Variables (Production)

```env
# === Required ===
AGENT_ENCRYPT_KEY=<32-char random string>   # openssl rand -hex 16

# === Phase 2+: Database ===
DATABASE_URL=postgresql://bossboard:password@localhost:5432/bossboard

# === Phase 5+: Redis ===
REDIS_URL=redis://localhost:6379

# === Optional: Override data path ===
# OPENCLAW_HOME=/data/bossboard

# === Node.js ===
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
TZ=Asia/Bangkok
```

---

## ค่าใช้จ่ายสรุป (Production แนะนำ)

### Self-hosted VPS — Vultr Singapore (คุ้มสุด)

| รายการ | ค่าใช้จ่าย/เดือน |
| ------ | --------------- |
| Vultr 2 vCPU / 4 GB / 80 GB | ~$20 |
| Domain (.com) | ~$15/ปี (~$1.25/เดือน) |
| SSL (Let's Encrypt) | ฟรี |
| Backup (Vultr Snapshot) | ~$4/เดือน |
| **รวม** | **~$25/เดือน (~910 บาท/เดือน)** |

### DigitalOcean — ง่ายกว่า managed services

| รายการ | ค่าใช้จ่าย/เดือน |
| ------ | --------------- |
| Droplet 2 vCPU / 4 GB | ~$36 |
| Managed Postgres (เมื่อพร้อม Phase 2) | ~$15 |
| Domain + SSL | ~$1.25 + ฟรี |
| Backup (Droplet Backup 20%) | ~$7 |
| **รวม** | **~$59/เดือน (~2,150 บาท/เดือน)** |

---

## Checklist ก่อน Deploy Production

- [ ] ซื้อ domain name และชี้ A record ไป server IP
- [ ] ติดตั้ง Docker + Nginx + Certbot บน VPS
- [ ] Generate `AGENT_ENCRYPT_KEY` ด้วย `openssl rand -hex 16`
- [ ] ตั้งค่า Nginx + SSL (Let's Encrypt)
- [ ] Build และ run Docker container
- [ ] ทดสอบ `/api/health` ผ่าน HTTPS
- [ ] ตั้งค่า firewall — เปิดแค่ port 80, 443 (ปิด 3003 จาก public)
- [ ] ตั้งค่า automatic SSL renewal (`certbot renew --dry-run`)
- [ ] ตั้งค่า Docker volume backup (cron + rsync หรือ Vultr Snapshot)
- [ ] ติดตั้ง Uptime Kuma สำหรับ monitoring
- [ ] **Phase 2:** ย้าย JSON → Postgres ก่อน onboard ลูกค้าหลายราย
- [ ] **Phase 1:** เพิ่ม Authentication ก่อนเปิด public

---

## ลำดับขั้นตอน Deploy (ฉบับย่อ)

```bash
# 1. ตั้งค่า VPS (Ubuntu 24.04)
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx

# 2. SSL
certbot --nginx -d ledgio.yourdomain.com

# 3. Clone และ build
git clone https://github.com/bosocmputer/BossBoard.git /opt/bossboard
cd /opt/bossboard
docker build -t bossboard .

# 4. Run
docker run -d --name bossboard \
  -p 127.0.0.1:3003:3000 \
  -v /opt/bossboard-data:/home/node/.bossboard \
  -e AGENT_ENCRYPT_KEY=$(openssl rand -hex 16) \
  -e TZ=Asia/Bangkok \
  --restart unless-stopped \
  bossboard

# 5. ตั้งค่า Nginx (ดู config ด้านบน)
nginx -t && systemctl reload nginx
```
