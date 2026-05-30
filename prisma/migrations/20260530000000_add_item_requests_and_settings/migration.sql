ALTER TABLE "TravelPost"
  ADD COLUMN "canBringItems" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "itemCategories" TEXT,
  ADD COLUMN "itemNotes" TEXT;

CREATE TABLE "ItemRequest" (
  "id" SERIAL NOT NULL,
  "requesterId" INTEGER NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "fromLat" DOUBLE PRECISION,
  "fromLng" DOUBLE PRECISION,
  "toLat" DOUBLE PRECISION,
  "toLng" DOUBLE PRECISION,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'other',
  "budget" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "acceptedByDriver" INTEGER,
  "travelPostId" INTEGER,
  "pickedUpAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ItemRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ItemRequest"
  ADD CONSTRAINT "ItemRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItemRequest"
  ADD CONSTRAINT "ItemRequest_acceptedByDriver_fkey"
  FOREIGN KEY ("acceptedByDriver") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ItemRequest"
  ADD CONSTRAINT "ItemRequest_travelPostId_fkey"
  FOREIGN KEY ("travelPostId") REFERENCES "TravelPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
