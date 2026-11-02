-- Set when a guide checks guests in on a different day than booked; tourDate is then moved to the arrival day
ALTER TABLE "Voucher" ADD COLUMN "originalTourDate" DATETIME;
