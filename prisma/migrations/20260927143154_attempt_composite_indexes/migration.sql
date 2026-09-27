-- DropIndex
DROP INDEX "Attempt_groupId_idx";

-- DropIndex
DROP INDEX "Attempt_studentId_idx";

-- CreateIndex
CREATE INDEX "Attempt_studentId_finishedAt_idx" ON "Attempt"("studentId", "finishedAt");

-- CreateIndex
CREATE INDEX "Attempt_groupId_mode_finishedAt_idx" ON "Attempt"("groupId", "mode", "finishedAt");
