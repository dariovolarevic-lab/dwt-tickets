-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agencyCode" TEXT,
ADD COLUMN     "canUseK" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isK" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "netAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Existing vouchers had no commission: amount due equals the total
UPDATE "Voucher" SET "netAmount" = "totalPrice";

-- CreateTable
CREATE TABLE "VoucherCounter" (
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "isK" BOOLEAN NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VoucherCounter_pkey" PRIMARY KEY ("userId","year","isK")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_agencyCode_key" ON "User"("agencyCode");

-- AddForeignKey
ALTER TABLE "VoucherCounter" ADD CONSTRAINT "VoucherCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
