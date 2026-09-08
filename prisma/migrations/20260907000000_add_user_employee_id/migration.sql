ALTER TABLE "User" ADD COLUMN "employeeId" TEXT;

WITH numbered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS row_number
  FROM "User"
)
UPDATE "User" AS user_record
SET "employeeId" = 'EMP' || LPAD(numbered_users.row_number::TEXT, 3, '0')
FROM numbered_users
WHERE user_record.id = numbered_users.id;

ALTER TABLE "User" ALTER COLUMN "employeeId" SET NOT NULL;
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
