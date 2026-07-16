-- CreateTable
CREATE TABLE "AnalysisShare" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL DEFAULT 'contract',
    "title" TEXT,
    "snapshot" JSONB NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisShare_token_key" ON "AnalysisShare"("token");

-- CreateIndex
CREATE INDEX "AnalysisShare_ownerId_idx" ON "AnalysisShare"("ownerId");

-- CreateIndex
CREATE INDEX "AnalysisShare_ownerId_createdAt_idx" ON "AnalysisShare"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalysisShare" ADD CONSTRAINT "AnalysisShare_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
