-- CreateTable
CREATE TABLE "ContractComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseAnalysisId" TEXT NOT NULL,
    "revisedAnalysisId" TEXT NOT NULL,
    "diffResult" JSONB NOT NULL,
    "overallVerdict" TEXT NOT NULL,
    "overallSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractComparison_userId_idx" ON "ContractComparison"("userId");

-- CreateIndex
CREATE INDEX "ContractComparison_userId_createdAt_idx" ON "ContractComparison"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractComparison_baseAnalysisId_idx" ON "ContractComparison"("baseAnalysisId");

-- CreateIndex
CREATE INDEX "ContractComparison_revisedAnalysisId_idx" ON "ContractComparison"("revisedAnalysisId");

-- CreateIndex
CREATE INDEX "ContractComparison_expiresAt_idx" ON "ContractComparison"("expiresAt");

-- AddForeignKey
ALTER TABLE "ContractComparison" ADD CONSTRAINT "ContractComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractComparison" ADD CONSTRAINT "ContractComparison_baseAnalysisId_fkey" FOREIGN KEY ("baseAnalysisId") REFERENCES "ContractAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractComparison" ADD CONSTRAINT "ContractComparison_revisedAnalysisId_fkey" FOREIGN KEY ("revisedAnalysisId") REFERENCES "ContractAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
