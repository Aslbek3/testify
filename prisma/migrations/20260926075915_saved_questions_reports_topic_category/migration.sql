-- CreateEnum
CREATE TYPE "QuestionReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "category" TEXT;

-- CreateTable
CREATE TABLE "SavedQuestion" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionReport" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reason" TEXT,
    "status" "QuestionReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedQuestion_studentId_createdAt_idx" ON "SavedQuestion"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedQuestion_studentId_questionId_key" ON "SavedQuestion"("studentId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionReport_status_createdAt_idx" ON "QuestionReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionReport_questionId_reportedById_key" ON "QuestionReport"("questionId", "reportedById");

-- CreateIndex
CREATE INDEX "Topic_category_name_idx" ON "Topic"("category", "name");

-- AddForeignKey
ALTER TABLE "SavedQuestion" ADD CONSTRAINT "SavedQuestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedQuestion" ADD CONSTRAINT "SavedQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
