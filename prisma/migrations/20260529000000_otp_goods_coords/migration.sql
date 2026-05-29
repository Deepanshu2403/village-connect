-- Add OTP verification records for signup and forgot-password flows.
CREATE TABLE "OtpVerification" (
  "id" SERIAL NOT NULL,
  "phone" TEXT NOT NULL,
  "otp" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpVerification_phone_purpose_idx" ON "OtpVerification"("phone", "purpose");

-- Store goods pickup/drop coordinates when available.
ALTER TABLE "GoodsRequest"
  ADD COLUMN "fromLat" DOUBLE PRECISION,
  ADD COLUMN "fromLng" DOUBLE PRECISION,
  ADD COLUMN "toLat" DOUBLE PRECISION,
  ADD COLUMN "toLng" DOUBLE PRECISION;

-- Track accepted goods delivery lifecycle.
ALTER TABLE "GoodsMatch"
  ADD COLUMN "pickedUpAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);

ALTER TABLE "GoodsMatch" ALTER COLUMN "status" SET DEFAULT 'accepted';
