-- CreateTable
CREATE TABLE "AnalysisFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisFeedback_userId_analysisType_analysisId_key" ON "AnalysisFeedback"("userId", "analysisType", "analysisId");

-- CreateIndex
CREATE INDEX "AnalysisFeedback_analysisType_idx" ON "AnalysisFeedback"("analysisType");

-- CreateIndex
CREATE INDEX "AnalysisFeedback_createdAt_idx" ON "AnalysisFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "AnalysisFeedback_expiresAt_idx" ON "AnalysisFeedback"("expiresAt");

-- AddForeignKey
ALTER TABLE "AnalysisFeedback" ADD CONSTRAINT "AnalysisFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
