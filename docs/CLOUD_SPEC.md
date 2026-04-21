# OMNIA.AI — Cloud & Deploy Specification

## Server Info

| Item | Value |
|------|-------|
| Server IP | `192.168.2.109` |
| App Port | **3005** |
| Container name | `omnia-ai` |
| Volume | `~/.omnia-ai` → `/home/node/.omnia-ai` |

## Database

| Item | Value |
|------|-------|
| Container | `ledgioai-db` |
| Port | 5436 |
| Database name | `omniadb` |
| User | `ledgioai` |
| Password | `ledgioai_dev_2026` |

## Redis

| Item | Value |
|------|-------|
| Container | `ledgioai-redis` |
| Port | 6381 |
| Shared with | BossBoard (port 3003) |

---

## Docker Run Command

```bash
docker run -d \
  --name omnia-ai \
  --restart unless-stopped \
  --network host \
  -e DATABASE_URL="postgresql://ledgioai:ledgioai_dev_2026@127.0.0.1:5436/omniadb" \
  -e REDIS_URL="redis://127.0.0.1:6381" \
  -e NODE_ENV=production \
  -e PORT=3005 \
  -e HOSTNAME=0.0.0.0 \
  -e JWT_SECRET="<generate: openssl rand -hex 32>" \
  -e AGENT_ENCRYPT_KEY="<generate: openssl rand -hex 16>" \
  -e OPENROUTER_API_KEY="sk-or-..." \
  -v /home/bosscatdog/.omnia-ai:/home/node/.omnia-ai \
  omnia-ai
```

## Deploy Script (ใช้งานได้ทันที)

```bash
sshpass -p 'boss123456' ssh -o StrictHostKeyChecking=no bosscatdog@192.168.2.109 '
  cd ~/OMNIA.AI && git pull &&
  docker build -t omnia-ai . &&
  docker stop omnia-ai; docker rm omnia-ai;
  docker run -d --name omnia-ai --restart unless-stopped --network host \
    -e DATABASE_URL="postgresql://ledgioai:ledgioai_dev_2026@127.0.0.1:5436/omniadb" \
    -e REDIS_URL="redis://127.0.0.1:6381" \
    -e NODE_ENV=production -e PORT=3005 -e HOSTNAME=0.0.0.0 \
    -e JWT_SECRET="REPLACE_ME" -e AGENT_ENCRYPT_KEY="REPLACE_ME" \
    -e OPENROUTER_API_KEY="REPLACE_ME" \
    -v /home/bosscatdog/.omnia-ai:/home/node/.omnia-ai omnia-ai
'
```

## First-time DB Setup (server)

```bash
# สร้าง database
docker exec ledgioai-db psql -U ledgioai -c "CREATE DATABASE omniadb;"

# Run migrations
docker exec omnia-ai npx prisma migrate deploy
```

## Health Check

```bash
curl http://192.168.2.109:3005/api/health
```

## Services Overview (Server)

| Service | Container | Port | Status |
|---------|-----------|------|--------|
| BossBoard | `bossboard` | 3003 | running |
| OMNIA.AI | `omnia-ai` | 3005 | pending deploy |
| PostgreSQL | `ledgioai-db` | 5436 | running |
| Redis | `ledgioai-redis` | 6381 | running |
