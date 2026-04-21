#!/bin/bash
# Deploy BossBoard to server
# Usage: ./scripts/deploy.sh

SERVER="bosscatdog@192.168.2.109"
PASS="boss123456"
APP_DIR="~/BossBoard"
PORT=3003

echo "🏛️ Deploying BossBoard to $SERVER..."

sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "
set -e
cd $APP_DIR

echo '📥 Pulling latest...'
git pull origin main

echo '📦 Installing deps...'
npm install --production=false

echo '🔨 Building...'
npm run build

echo '📋 Copying static assets to standalone...'
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo '🛑 Stopping old BossBoard process (port $PORT only)...'
fuser -k $PORT/tcp 2>/dev/null || true
sleep 3

echo '▶️ Starting BossBoard on port $PORT...'
nohup env PORT=$PORT node .next/standalone/server.js >> /tmp/bossboard.log 2>&1 &
echo \$! > /tmp/bossboard.pid
disown \$!
sleep 5

STATUS=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/)
echo \"✅ HTTP Status: \$STATUS\"
echo '📋 Logs:'
tail -5 /tmp/bossboard.log
"

echo ""
echo "✅ BossBoard deploy complete!"
echo "🌐 Access: http://192.168.2.109:$PORT"
echo "💡 To create tunnel: cloudflared tunnel --url http://localhost:$PORT"
