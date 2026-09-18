-- CreateEnum
CREATE TYPE "CrvType" AS ENUM ('AZUL', 'VERDE', 'BRANCO', 'DIGITAL');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "renave_operations" ADD COLUMN     "idEstoqueRenave" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cpf" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "codigoSegurancaCrv" TEXT,
ADD COLUMN     "crvType" "CrvType",
ADD COLUMN     "numeroCrv" TEXT;
