ALTER TABLE "User"
ADD COLUMN "availabilityStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "customStatus" TEXT,
ADD COLUMN "customStatusEmoji" TEXT;
