-- Add userId to research_sessions with backfill
ALTER TABLE "research_sessions" ADD COLUMN "user_id" TEXT;

UPDATE "research_sessions"
SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'superadmin' LIMIT 1)
WHERE "user_id" IS NULL;

ALTER TABLE "research_sessions" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "research_sessions"
ADD CONSTRAINT "research_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add userId to client_memory with backfill
ALTER TABLE "client_memory" ADD COLUMN "user_id" TEXT;

UPDATE "client_memory"
SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'superadmin' LIMIT 1)
WHERE "user_id" IS NULL;

ALTER TABLE "client_memory" ALTER COLUMN "user_id" SET NOT NULL;

-- Drop old unique on key, add composite unique
ALTER TABLE "client_memory" DROP CONSTRAINT IF EXISTS "client_memory_key_key";

ALTER TABLE "client_memory"
ADD CONSTRAINT "client_memory_user_id_key_key" UNIQUE ("user_id", "key");

ALTER TABLE "client_memory"
ADD CONSTRAINT "client_memory_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
