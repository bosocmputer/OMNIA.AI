#!/usr/bin/env bash
set -euo pipefail

SERVER="${SERVER:-bosscatdog@192.168.2.109}"
PASS="${PASS:-boss123456}"
REMOTE_DIR="${REMOTE_DIR:-/home/bosscatdog/omnia-ai}"
REPO_URL="${REPO_URL:-https://github.com/bosocmputer/OMNIA.AI.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3005}"

echo "Deploying OMNIA.AI from git ${REPO_URL} (${BRANCH}) to ${SERVER}:${REMOTE_DIR}"

sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "
set -euo pipefail

if [ ! -d '$REMOTE_DIR/.git' ]; then
  if [ -d '$REMOTE_DIR' ]; then
    backup_dir=\"${REMOTE_DIR}.backup-\$(date +%Y%m%d%H%M%S)\"
    echo \"Existing non-git directory found. Moving to \$backup_dir\"
    mv '$REMOTE_DIR' \"\$backup_dir\"
  fi
  git clone --branch '$BRANCH' '$REPO_URL' '$REMOTE_DIR'
fi

cd '$REMOTE_DIR'
git fetch origin '$BRANCH'
git reset --hard 'origin/$BRANCH'

if [ ! -f .env.production ]; then
  backup_env=\$(ls -td ${REMOTE_DIR}.backup-* 2>/dev/null | head -n 1 || true)
  if [ -n \"\$backup_env\" ] && [ -f \"\$backup_env/.env.production\" ]; then
    cp \"\$backup_env/.env.production\" .env.production
  else
    echo 'Missing .env.production'
    exit 2
  fi
fi

mkdir -p /home/bosscatdog/.omnia-ai
OMNIA_PORT='$PORT' docker compose up -d --build omnia-ai
echo '$PORT' > /home/bosscatdog/.omnia-ai-port
sleep 5
curl -fsS \"http://127.0.0.1:$PORT/api/health\"
echo
echo \"OMNIA.AI is running at http://192.168.2.109:$PORT\"
"
