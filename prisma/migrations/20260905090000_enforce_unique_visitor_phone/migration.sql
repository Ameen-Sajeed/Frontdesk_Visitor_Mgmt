-- Standardize legacy keys using the same UAE-local-number convention as the app.
-- Visits are retained when duplicate visitor records are consolidated.
WITH normalized AS (
  SELECT id,
    CASE
      WHEN regexp_replace(phone, '[^0-9]+', '', 'g') ~ '^0[0-9]{9}$'
        THEN '971' || substring(regexp_replace(phone, '[^0-9]+', '', 'g') FROM 2)
      ELSE regexp_replace(phone, '[^0-9]+', '', 'g')
    END AS lookup_key
  FROM "Visitor"
)
UPDATE "Visitor" v SET "phoneLookupKey" = normalized.lookup_key
FROM normalized WHERE v.id = normalized.id;

-- Choose the earliest Visitor as the canonical person, enrich empty fields,
-- reassign every Visit, then remove only the redundant person rows.
WITH ranked AS (
  SELECT id, "phoneLookupKey",
         first_value(id) OVER (PARTITION BY "phoneLookupKey" ORDER BY "createdAt", id) AS canonical_id,
         row_number() OVER (PARTITION BY "phoneLookupKey" ORDER BY "createdAt", id) AS row_num
  FROM "Visitor"
), duplicate_values AS (
  SELECT r.canonical_id,
         max(v."fullName") FILTER (WHERE v."fullName" <> '') AS full_name,
         max(v.email) FILTER (WHERE v.email IS NOT NULL) AS email,
         max(v.company) FILTER (WHERE v.company IS NOT NULL) AS company,
         max(v.designation) FILTER (WHERE v.designation IS NOT NULL) AS designation
  FROM ranked r JOIN "Visitor" v ON v.id = r.id
  GROUP BY r.canonical_id
)
UPDATE "Visitor" v SET
  "fullName" = COALESCE(NULLIF(v."fullName", ''), d.full_name),
  email = COALESCE(v.email, d.email),
  company = COALESCE(v.company, d.company),
  designation = COALESCE(v.designation, d.designation)
FROM duplicate_values d WHERE v.id = d.canonical_id;

WITH ranked AS (
  SELECT id, first_value(id) OVER (PARTITION BY "phoneLookupKey" ORDER BY "createdAt", id) AS canonical_id
  FROM "Visitor"
)
UPDATE "Visit" visit SET "visitorId" = ranked.canonical_id
FROM ranked WHERE visit."visitorId" = ranked.id AND ranked.id <> ranked.canonical_id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY "phoneLookupKey" ORDER BY "createdAt", id) AS row_num
  FROM "Visitor"
)
DELETE FROM "Visitor" visitor USING ranked WHERE visitor.id = ranked.id AND ranked.row_num > 1;

DROP INDEX IF EXISTS "Visitor_phoneLookupKey_idx";
CREATE UNIQUE INDEX "Visitor_phoneLookupKey_key" ON "Visitor"("phoneLookupKey");
