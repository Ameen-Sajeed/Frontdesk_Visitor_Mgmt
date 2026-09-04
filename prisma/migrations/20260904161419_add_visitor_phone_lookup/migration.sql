-- AlterTable
ALTER TABLE "Visitor" ADD COLUMN     "phoneLookupKey" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Visitor_phoneLookupKey_idx" ON "Visitor"("phoneLookupKey");

-- Backfill records registered before phone lookup was introduced.
UPDATE "Visitor"
SET "phoneLookupKey" = regexp_replace("phone", '[^0-9]+', '', 'g')
WHERE "phoneLookupKey" = '';
