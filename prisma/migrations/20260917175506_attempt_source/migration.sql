-- CreateEnum
CREATE TYPE "AttemptSource" AS ENUM ('PRACTICE', 'MARATHON', 'EXAM', 'ASSIGNMENT', 'MISTAKES');

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "source" "AttemptSource";
