-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "emoji" VARCHAR(10) NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL DEFAULT '',
    "baseUrl" TEXT,
    "model" VARCHAR(200) NOT NULL,
    "soul" TEXT NOT NULL,
    "role" VARCHAR(200) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "useWebSearch" BOOLEAN NOT NULL DEFAULT false,
    "seniority" INTEGER,
    "mcpEndpoint" TEXT,
    "mcpAccessMode" TEXT,
    "trustedUrls" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "systemAgentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_knowledge" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "filename" VARCHAR(500) NOT NULL,
    "meta" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "emoji" VARCHAR(10) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_agents" (
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "team_agents_pkey" PRIMARY KEY ("teamId","agentId")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "serperApiKey" TEXT NOT NULL DEFAULT '',
    "serpApiKey" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT,
    "businessType" TEXT,
    "registrationNumber" TEXT,
    "accountingStandard" TEXT,
    "fiscalYear" TEXT,
    "employeeCount" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_sessions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "agentIds" TEXT[],
    "dataSource" TEXT,
    "status" VARCHAR(20) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "finalAnswer" TEXT,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "research_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" VARCHAR(100) NOT NULL,
    "agentEmoji" VARCHAR(10) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_stats" (
    "agentId" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" VARCHAR(10) NOT NULL,

    CONSTRAINT "agent_stats_pkey" PRIMARY KEY ("agentId")
);

-- CreateTable
CREATE TABLE "agent_daily_stats" (
    "id" SERIAL NOT NULL,
    "agentId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agent_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_memory" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "source" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_daily_stats_agentId_date_key" ON "agent_daily_stats"("agentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "client_memory_key_key" ON "client_memory"("key");

-- AddForeignKey
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_agents" ADD CONSTRAINT "team_agents_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_agents" ADD CONSTRAINT "team_agents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_messages" ADD CONSTRAINT "research_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "research_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_stats" ADD CONSTRAINT "agent_stats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_daily_stats" ADD CONSTRAINT "agent_daily_stats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_stats"("agentId") ON DELETE CASCADE ON UPDATE CASCADE;
