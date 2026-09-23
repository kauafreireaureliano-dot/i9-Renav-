-- CreateEnum
CREATE TYPE "RenaveChargeStatus" AS ENUM ('PENDENTE', 'PAGO');

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "renaveFeeAmount" DECIMAL(6,2) NOT NULL DEFAULT 5.48;

-- CreateTable
CREATE TABLE "renave_charges" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "amount" DECIMAL(6,2) NOT NULL,
    "status" "RenaveChargeStatus" NOT NULL DEFAULT 'PENDENTE',
    "paidAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renave_charges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "renave_charges" ADD CONSTRAINT "renave_charges_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
