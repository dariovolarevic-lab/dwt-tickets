CREATE TABLE "ClosedDeparture" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "tourDate" DATE NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosedDeparture_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClosedDeparture_tourId_tourDate_timeSlot_key"
ON "ClosedDeparture"("tourId", "tourDate", "timeSlot");

CREATE INDEX "ClosedDeparture_tourDate_idx" ON "ClosedDeparture"("tourDate");

ALTER TABLE "ClosedDeparture"
ADD CONSTRAINT "ClosedDeparture_tourId_fkey"
FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Voucher" ALTER COLUMN "leadGuestName" DROP NOT NULL;
