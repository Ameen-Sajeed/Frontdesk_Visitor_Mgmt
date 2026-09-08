CREATE TYPE "VisitForwardStatus" AS ENUM ('PENDING', 'COMPLETED');

CREATE TABLE "VisitForwardRequest" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "fromDepartmentId" TEXT NOT NULL,
  "toDepartmentId" TEXT NOT NULL,
  "suggestedHostIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "note" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "handledAt" TIMESTAMP(3),
  "handledByUserId" TEXT,
  "status" "VisitForwardStatus" NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "VisitForwardRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VisitForwardRequest"
  ADD CONSTRAINT "VisitForwardRequest_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "VisitForwardRequest_status_requestedAt_idx" ON "VisitForwardRequest"("status", "requestedAt");
CREATE INDEX "VisitForwardRequest_visitId_status_idx" ON "VisitForwardRequest"("visitId", "status");
