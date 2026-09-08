CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Visit"
ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Visit"
SET "approvalStatus" = CASE
  WHEN "status"::text IN ('APPROVED', 'CHECKED_IN', 'IN_MEETING', 'CHECKED_OUT') THEN 'APPROVED'::"ApprovalStatus"
  WHEN "status"::text = 'REJECTED' THEN 'REJECTED'::"ApprovalStatus"
  ELSE 'PENDING'::"ApprovalStatus"
END;

CREATE TYPE "VisitStatus_new" AS ENUM ('WAITING', 'INSIDE', 'CHECKED_OUT', 'LEFT_WITHOUT_MEETING');
ALTER TABLE "Visit" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Visit" ALTER COLUMN "status" TYPE "VisitStatus_new" USING (
  CASE
    WHEN "status"::text = 'IN_MEETING' THEN 'INSIDE'
    WHEN "status"::text = 'CHECKED_OUT' THEN 'CHECKED_OUT'
    WHEN "status"::text IN ('REJECTED', 'LEFT_WITHOUT_MEETING') THEN 'LEFT_WITHOUT_MEETING'
    ELSE 'WAITING'
  END::"VisitStatus_new"
);
ALTER TABLE "VisitStatusHistory" ALTER COLUMN "status" TYPE "VisitStatus_new" USING (
  CASE
    WHEN "status"::text = 'IN_MEETING' THEN 'INSIDE'
    WHEN "status"::text = 'CHECKED_OUT' THEN 'CHECKED_OUT'
    WHEN "status"::text IN ('REJECTED', 'LEFT_WITHOUT_MEETING') THEN 'LEFT_WITHOUT_MEETING'
    ELSE 'WAITING'
  END::"VisitStatus_new"
);
DROP TYPE "VisitStatus";
ALTER TYPE "VisitStatus_new" RENAME TO "VisitStatus";
ALTER TABLE "Visit" ALTER COLUMN "status" SET DEFAULT 'WAITING';

ALTER TABLE "VisitStatusHistory" ADD COLUMN "changedByUserId" TEXT;
CREATE INDEX "VisitStatusHistory_changedByUserId_idx" ON "VisitStatusHistory"("changedByUserId");
ALTER TABLE "VisitStatusHistory" ADD CONSTRAINT "VisitStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
