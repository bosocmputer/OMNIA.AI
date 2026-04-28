#!/usr/bin/env bash
set -euo pipefail

# Safe deploy for OMNIA.AI.
# - Uses its own remote directory and Docker container name only.
# - Reuses the previous OMNIA port when available.
# - Otherwise chooses the first free candidate port.
# - Does not kill arbitrary processes by port.

SERVER="${SERVER:-bosscatdog@192.168.2.109}"
PASS="${PASS:-boss123456}"
REMOTE_DIR="${REMOTE_DIR:-/home/bosscatdog/omnia-ai}"
CONTAINER="${CONTAINER:-omnia-ai}"
IMAGE="${IMAGE:-omnia-ai:latest}"
PORT_FILE="${PORT_FILE:-/home/bosscatdog/.omnia-ai-port}"
PORT_CANDIDATES="${PORT_CANDIDATES:-3005 3010 3011 3012 3013 3014 3015 3016 3017 3018 3019}"

echo "Deploying OMNIA.AI to ${SERVER}:${REMOTE_DIR}"

sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "mkdir -p '$REMOTE_DIR' /home/bosscatdog/.omnia-ai"

sshpass -p "$PASS" rsync -az --delete \
  -e "ssh -o StrictHostKeyChecking=no" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .DS_Store \
  --exclude '*.log' \
  --exclude .env.local \
  --exclude .env.production \
  ./ "${SERVER}:${REMOTE_DIR}/"

sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "
set -euo pipefail
cd '$REMOTE_DIR'

if [ ! -f .env.production ]; then
  echo 'Missing .env.production in $REMOTE_DIR'
  echo 'Create it from .env.example before deploying.'
  exit 2
fi

choose_port() {
  if [ -f '$PORT_FILE' ]; then
    previous=\$(cat '$PORT_FILE' 2>/dev/null || true)
    if [ -n \"\$previous\" ]; then
      if docker ps --format '{{.Names}}' | grep -qx '$CONTAINER'; then
        echo \"\$previous\"
        return
      fi
      if ! ss -tulpen | grep -q \":\${previous}\\b\"; then
        echo \"\$previous\"
        return
      fi
    fi
  fi
  for p in $PORT_CANDIDATES; do
    if ! ss -tulpen | grep -q \":\${p}\\b\"; then
      echo \"\$p\"
      return
    fi
  done
  return 1
}

PORT=\$(choose_port) || { echo 'No free OMNIA candidate port found'; exit 3; }
echo \"Using port \$PORT\"

npm ci
set -a
. ./.env.production
set +a
npx prisma migrate deploy
docker build -t '$IMAGE' .
docker rm -f '$CONTAINER' >/dev/null 2>&1 || true
docker run -d \
  --name '$CONTAINER' \
  --restart unless-stopped \
  -p \"\$PORT\":3000 \
  --link ledgioai-db:ledgioai-db \
  --link ledgioai-redis:ledgioai-redis \
  --env-file .env.production \
  -e DATABASE_URL=postgresql://ledgioai:ledgioai_dev_2026@ledgioai-db:5432/omniadb \
  -e REDIS_URL=redis://ledgioai-redis:6379 \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  -v /home/bosscatdog/.omnia-ai:/home/node/.omnia-ai \
  '$IMAGE'

echo \"\$PORT\" > '$PORT_FILE'
sleep 5
curl -fsS \"http://127.0.0.1:\$PORT/api/health\"
echo
echo \"OMNIA.AI is running at http://192.168.2.109:\$PORT\"
"
