CREATE SEQUENCE "User_employeeId_seq" START WITH 1;

SELECT setval(
  '"User_employeeId_seq"',
  COALESCE(MAX(NULLIF(SUBSTRING("employeeId" FROM '^EMP([0-9]+)$'), '')::INTEGER), 1),
  COALESCE(MAX(NULLIF(SUBSTRING("employeeId" FROM '^EMP([0-9]+)$'), '')::INTEGER), 0) > 0
)
FROM "User";
