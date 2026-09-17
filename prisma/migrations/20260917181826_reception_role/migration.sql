-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RECEPTION';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "receptionHandlesPayments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receptionSeesProgress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tutorManagesStudents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tutorResetsPasswords" BOOLEAN NOT NULL DEFAULT false;
