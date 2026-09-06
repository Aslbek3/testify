-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('PRACTICE', 'EXAM');

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "mode" "AttemptMode" NOT NULL DEFAULT 'EXAM';

-- AlterTable
ALTER TABLE "AttemptAnswer" ADD COLUMN     "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "category" TEXT,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- CreateIndex
CREATE INDEX "Attempt_groupId_idx" ON "Attempt"("groupId");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
