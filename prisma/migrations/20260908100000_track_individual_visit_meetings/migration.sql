CREATE TABLE "VisitMeeting" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "endedReason" TEXT,
  CONSTRAINT "VisitMeeting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VisitMeeting" ADD CONSTRAINT "VisitMeeting_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitMeeting" ADD CONSTRAINT "VisitMeeting_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VisitMeeting" ADD CONSTRAINT "VisitMeeting_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "VisitMeeting_visitId_startedAt_idx" ON "VisitMeeting"("visitId", "startedAt");
CREATE INDEX "VisitMeeting_hostId_endedAt_idx" ON "VisitMeeting"("hostId", "endedAt");
CREATE UNIQUE INDEX "VisitMeeting_one_active_meeting_per_visit_key"
  ON "VisitMeeting"("visitId") WHERE "endedAt" IS NULL;

-- Preserve the first meeting for existing forwarded visits. The forwarding user is the
-- original host, and Reception's assignment time is when that meeting ended.
INSERT INTO "VisitMeeting" ("id", "visitId", "departmentId", "hostId", "startedAt", "endedAt", "endedReason")
SELECT
  'legacy-forward-' || visit_row."id",
  visit_row."id",
  forward_row."fromDepartmentId",
  employee."id",
  visit_row."meetingStartedAt",
  forward_row."handledAt",
  'FORWARDED'
FROM "Visit" AS visit_row
JOIN LATERAL (
  SELECT *
  FROM "VisitForwardRequest"
  WHERE "visitId" = visit_row."id"
    AND "status" = 'COMPLETED'
    AND "handledAt" IS NOT NULL
  ORDER BY "handledAt" ASC
  LIMIT 1
) AS forward_row ON true
JOIN "User" AS user_row ON user_row."id" = forward_row."requestedByUserId"
JOIN "Employee" AS employee
  ON employee."email" = user_row."email"
  AND employee."departmentId" = forward_row."fromDepartmentId"
WHERE visit_row."meetingStartedAt" IS NOT NULL
  AND forward_row."handledAt" >= visit_row."meetingStartedAt";

-- Preserve legacy visits that did not have a completed forwarding handoff.
INSERT INTO "VisitMeeting" ("id", "visitId", "departmentId", "hostId", "startedAt", "endedAt", "endedReason")
SELECT
  'legacy-' || visit_row."id",
  visit_row."id",
  visit_row."departmentId",
  visit_row."hostId",
  visit_row."meetingStartedAt",
  COALESCE(visit_row."checkedOutAt", visit_row."leftAt"),
  CASE
    WHEN visit_row."checkedOutAt" IS NOT NULL THEN 'CHECKED_OUT'
    WHEN visit_row."leftAt" IS NOT NULL THEN 'LEFT_WITHOUT_MEETING'
    ELSE NULL
  END
FROM "Visit" AS visit_row
WHERE visit_row."meetingStartedAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "VisitMeeting" AS meeting WHERE meeting."visitId" = visit_row."id"
  );
