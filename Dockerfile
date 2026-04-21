# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY . .
RUN npm install && npx prisma generate && npm run build

# Production stage
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV TZ=Asia/Bangkok

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Run as non-root user (node user already exists in node:alpine)
USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
