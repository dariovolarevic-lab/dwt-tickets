-- Existing vouchers get a random token too (two UUIDs = 64 hex chars)
ALTER TABLE "Voucher" ADD COLUMN "checkToken" TEXT;
ALTER TABLE "Voucher" ADD COLUMN "checkedInAt" TIMESTAMP(3);

UPDATE "Voucher"
SET "checkToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "checkToken" IS NULL;

ALTER TABLE "Voucher" ALTER COLUMN "checkToken" SET NOT NULL;

CREATE UNIQUE INDEX "Voucher_checkToken_key" ON "Voucher"("checkToken");
CREATE INDEX "Voucher_tourDate_timeSlot_idx" ON "Voucher"("tourDate", "timeSlot");

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
