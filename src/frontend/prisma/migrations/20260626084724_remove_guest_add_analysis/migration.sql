/*
  Warnings:

  - You are about to drop the column `actorType` on the `UsageEvent` table. All the data in the column will be lost.
  - You are about to drop the column `guestSessionId` on the `UsageEvent` table. All the data in the column will be lost.
  - You are about to drop the `GuestSession` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `userId` on table `UsageEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "GuestSession" DROP CONSTRAINT "GuestSession_convertedUserId_fkey";

-- DropForeignKey
ALTER TABLE "UsageEvent" DROP CONSTRAINT "UsageEvent_guestSessionId_fkey";

-- DropIndex
DROP INDEX "UsageEvent_guestSessionId_idx";

-- AlterTable
ALTER TABLE "UsageEvent" DROP COLUMN "actorType",
DROP COLUMN "guestSessionId",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "resourceId" TEXT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'free';

-- DropTable
DROP TABLE "GuestSession";

-- CreateTable
CREATE TABLE "UserQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractAnalysisCount" INTEGER NOT NULL DEFAULT 0,
    "contractAnalysisLimit" INTEGER NOT NULL DEFAULT 5,
    "clauseAnalysisCount" INTEGER NOT NULL DEFAULT 0,
    "clauseAnalysisLimit" INTEGER NOT NULL DEFAULT 10,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "fileName" TEXT NOT NULL,
    "documentId" TEXT,
    "contractType" TEXT NOT NULL,
    "overallRisk" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "contractInfo" JSONB,
    "ocrMarkdown" TEXT,
    "structuredData" JSONB,
    "totalClauses" INTEGER NOT NULL DEFAULT 0,
    "analyzedClauses" INTEGER NOT NULL DEFAULT 0,
    "flaggedClauses" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClauseAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractAnalysisId" TEXT,
    "source" TEXT NOT NULL,
    "clauseText" TEXT NOT NULL,
    "articleNo" TEXT,
    "contractType" TEXT NOT NULL,
    "riskLevel" TEXT,
    "conclusion" TEXT,
    "analysisResult" JSONB,
    "legalBasis" JSONB,
    "suggestion" TEXT,
    "negotiationMessage" TEXT,
    "processingTimeMs" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClauseAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractParty" (
    "id" TEXT NOT NULL,
    "contractAnalysisId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "roleLabel" TEXT,
    "nameHash" TEXT,
    "idNumberHash" TEXT,
    "missingFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEquipment" (
    "id" TEXT NOT NULL,
    "contractAnalysisId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserQuota_userId_key" ON "UserQuota"("userId");

-- CreateIndex
CREATE INDEX "ContractAnalysis_userId_idx" ON "ContractAnalysis"("userId");

-- CreateIndex
CREATE INDEX "ContractAnalysis_userId_createdAt_idx" ON "ContractAnalysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractAnalysis_status_idx" ON "ContractAnalysis"("status");

-- CreateIndex
CREATE INDEX "ContractAnalysis_expiresAt_idx" ON "ContractAnalysis"("expiresAt");

-- CreateIndex
CREATE INDEX "ClauseAnalysis_userId_idx" ON "ClauseAnalysis"("userId");

-- CreateIndex
CREATE INDEX "ClauseAnalysis_contractAnalysisId_idx" ON "ClauseAnalysis"("contractAnalysisId");

-- CreateIndex
CREATE INDEX "ClauseAnalysis_userId_source_createdAt_idx" ON "ClauseAnalysis"("userId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "ClauseAnalysis_source_idx" ON "ClauseAnalysis"("source");

-- CreateIndex
CREATE INDEX "ClauseAnalysis_expiresAt_idx" ON "ClauseAnalysis"("expiresAt");

-- CreateIndex
CREATE INDEX "ContractParty_contractAnalysisId_idx" ON "ContractParty"("contractAnalysisId");

-- CreateIndex
CREATE INDEX "ContractEquipment_contractAnalysisId_idx" ON "ContractEquipment"("contractAnalysisId");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_action_createdAt_idx" ON "UsageEvent"("userId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAnalysis" ADD CONSTRAINT "ContractAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseAnalysis" ADD CONSTRAINT "ClauseAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseAnalysis" ADD CONSTRAINT "ClauseAnalysis_contractAnalysisId_fkey" FOREIGN KEY ("contractAnalysisId") REFERENCES "ContractAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractParty" ADD CONSTRAINT "ContractParty_contractAnalysisId_fkey" FOREIGN KEY ("contractAnalysisId") REFERENCES "ContractAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEquipment" ADD CONSTRAINT "ContractEquipment_contractAnalysisId_fkey" FOREIGN KEY ("contractAnalysisId") REFERENCES "ContractAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
