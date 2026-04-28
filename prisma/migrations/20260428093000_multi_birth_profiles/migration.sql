-- Allow each user to keep multiple birth profiles ("สมุดเจ้าชะตา").

ALTER TABLE "birth_profiles" ADD COLUMN "label" VARCHAR(50);
ALTER TABLE "birth_profiles" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "birth_profiles" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "birth_profiles"
SET "isDefault" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("userId") "id"
  FROM "birth_profiles"
  ORDER BY "userId", "updatedAt" DESC
);

DROP INDEX IF EXISTS "birth_profiles_userId_key";
CREATE INDEX IF NOT EXISTS "birth_profiles_userId_idx" ON "birth_profiles"("userId");
