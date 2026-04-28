-- Bring the production database in line with the current B2C schema.

-- User account metadata
ALTER TABLE "users" ADD COLUMN "email" VARCHAR(200);
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN "plan" VARCHAR(20) NOT NULL DEFAULT 'FREE';
ALTER TABLE "users" ADD COLUMN "monthlySessionsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "quotaResetAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN "consentPdpa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "consentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- User-owned agents and teams
ALTER TABLE "agents" ADD COLUMN "userId" TEXT;
ALTER TABLE "teams" ADD COLUMN "userId" TEXT;

ALTER TABLE "agents"
ADD CONSTRAINT "agents_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teams"
ADD CONSTRAINT "teams_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Birth profile per user
CREATE TABLE "birth_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "birthDate" VARCHAR(20) NOT NULL,
    "birthTime" VARCHAR(10),
    "birthPlace" VARCHAR(200),
    "timezone" VARCHAR(50),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "birth_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "birth_profiles_userId_key" ON "birth_profiles"("userId");

ALTER TABLE "birth_profiles"
ADD CONSTRAINT "birth_profiles_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
