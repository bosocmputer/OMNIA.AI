# OMNIA.AI — Cloud & Deploy Specification

## Server Info

| Item | Value |
|------|-------|
| Server IP | `192.168.2.109` |
| SSH user | `bosscatdog` |
| App directory | `/home/bosscatdog/omnia-ai` |
| Container name | `omnia-ai` |
| Image name | `omnia-ai:latest` |
| Port policy | Reuse `/home/bosscatdog/.omnia-ai-port` when free; otherwise choose a free candidate port |
| Volume | `/home/bosscatdog/.omnia-ai` → `/home/node/.omnia-ai` |
| Docker network | Bridge publish, e.g. `0.0.0.0:3005->3000/tcp` |

## Shared Services

| Service | Host/Port | Notes |
|---------|-----------|-------|
| PostgreSQL | `127.0.0.1:5436` | database `omniadb` |
| Redis | `127.0.0.1:6381` | shared Redis instance |

## Safety Rules

- Deploy only to `/home/bosscatdog/omnia-ai`.
- Manage only Docker container `omnia-ai`; do not stop containers from other projects.
- Do not kill processes by port. Check `ss -tulpen` first and choose a free port.
- Keep production secrets in `/home/bosscatdog/omnia-ai/.env.production`; do not commit them.
- Run Prisma migrations before starting/restarting the app container.
- Run the app like the other web projects: Docker bridge mode with `-p <host-port>:3000`, not `--network host`.

## Required `.env.production`

```env
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5436/omniadb
REDIS_URL=redis://127.0.0.1:6381
JWT_SECRET=<openssl rand -hex 32>
AGENT_ENCRYPT_KEY=<openssl rand -hex 16>
OPENROUTER_API_KEY=sk-or-...
NODE_ENV=production
```

`PORT` and `HOSTNAME` are injected by the deploy script. In the running container, `PORT=3000`; the host port is mapped by Docker.

## Deploy

From the project root:

```bash
bash scripts/deploy.sh
```

The script syncs the current workspace, installs dependencies on the server for migrations, builds the Docker image, recreates only the `omnia-ai` container, and prints the final URL.

## Manual Verify

```bash
ssh bosscatdog@192.168.2.109 'cat /home/bosscatdog/.omnia-ai-port'
ssh bosscatdog@192.168.2.109 'docker ps --filter name=omnia-ai'
ssh bosscatdog@192.168.2.109 'curl -fsS http://127.0.0.1:$(cat /home/bosscatdog/.omnia-ai-port)/api/health'
```
