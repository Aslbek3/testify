-- CreateEnum
CREATE TYPE "StudentPaymentMethod" AS ENUM ('CARD', 'CASH');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "paymentCardHolder" TEXT,
ADD COLUMN     "paymentCardNumber" TEXT,
ADD COLUMN     "priceOneMonth" INTEGER,
ADD COLUMN     "priceSixMonths" INTEGER,
ADD COLUMN     "studentPaymentsEnabledAt" TIMESTAMP(3),
ADD COLUMN     "trialDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "paidUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StudentPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "method" "StudentPaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receiptKey" TEXT,
    "receiptMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "StudentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentPayment_organizationId_status_idx" ON "StudentPayment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "StudentPayment_studentId_idx" ON "StudentPayment"("studentId");

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
