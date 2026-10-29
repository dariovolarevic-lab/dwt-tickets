-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARTNER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "agencyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "agencyCode" TEXT,
    "commissionPercent" DECIMAL NOT NULL DEFAULT 0,
    "canUseK" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "approvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "meetingPoint" TEXT NOT NULL,
    "departureTimes" JSONB NOT NULL,
    "priceAdult" DECIMAL NOT NULL,
    "priceChild" DECIMAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClosedDeparture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tourId" TEXT NOT NULL,
    "tourDate" DATETIME NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClosedDeparture_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "leadGuestName" TEXT,
    "tourDate" DATETIME NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "priceAdult" DECIMAL NOT NULL,
    "priceChild" DECIMAL NOT NULL,
    "totalPrice" DECIMAL NOT NULL,
    "commissionPercent" DECIMAL NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "netAmount" DECIMAL NOT NULL DEFAULT 0,
    "isK" BOOLEAN NOT NULL DEFAULT false,
    "checkToken" TEXT NOT NULL,
    "checkedInAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Voucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Voucher_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VoucherCounter" (
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "isK" BOOLEAN NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "year", "isK"),
    CONSTRAINT "VoucherCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_agencyCode_key" ON "User"("agencyCode");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "ClosedDeparture_tourDate_idx" ON "ClosedDeparture"("tourDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedDeparture_tourId_tourDate_timeSlot_key" ON "ClosedDeparture"("tourId", "tourDate", "timeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_checkToken_key" ON "Voucher"("checkToken");

-- CreateIndex
CREATE INDEX "Voucher_userId_createdAt_idx" ON "Voucher"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Voucher_tourDate_timeSlot_idx" ON "Voucher"("tourDate", "timeSlot");

-- CreateIndex
CREATE INDEX "Voucher_createdAt_idx" ON "Voucher"("createdAt");

-- CreateIndex
CREATE INDEX "Voucher_tourId_idx" ON "Voucher"("tourId");
