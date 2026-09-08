-- A visitor may have only one visit that is still active. Completed visits remain unlimited.
CREATE UNIQUE INDEX "Visit_one_active_visit_per_visitor_key"
ON "Visit" ("visitorId")
WHERE "status" IN ('WAITING', 'INSIDE');
