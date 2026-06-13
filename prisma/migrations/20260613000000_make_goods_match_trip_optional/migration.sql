ALTER TABLE "GoodsMatch" DROP CONSTRAINT IF EXISTS "GoodsMatch_travelPostId_fkey";

ALTER TABLE "GoodsMatch" ALTER COLUMN "travelPostId" DROP NOT NULL;

ALTER TABLE "GoodsMatch"
  ADD CONSTRAINT "GoodsMatch_travelPostId_fkey"
  FOREIGN KEY ("travelPostId") REFERENCES "TravelPost"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
