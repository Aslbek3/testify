-- AlterEnum
ALTER TYPE "AttemptSource" ADD VALUE 'TICKET';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "ticketNumber" INTEGER,
ADD COLUMN     "ticketOrder" INTEGER;

-- CreateIndex
CREATE INDEX "Question_ticketNumber_ticketOrder_idx" ON "Question"("ticketNumber", "ticketOrder");
