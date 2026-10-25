-- ============================================================
-- ACS School & College — Supabase MIGRATION Script
-- Run this on your LIVE database (does NOT drop any tables)
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Add missing fee_history column (if not already added)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS fee_history JSONB DEFAULT '[]';

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Remove the now-redundant fee_status column
--         fee_history is now the single source of truth.
--         SAFE: Only run this after confirming fee_history is in use.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE students
    DROP COLUMN IF EXISTS fee_status;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Add performance indexes on students table
-- ─────────────────────────────────────────────────────────────

-- Most-used filter: filter students by class/grade
CREATE INDEX IF NOT EXISTS idx_students_grade
    ON students(grade);

-- Serial number lookups (uniqueness checks, search)
CREATE INDEX IF NOT EXISTS idx_students_serial
    ON students(serial_number);

-- Student name search
CREATE INDEX IF NOT EXISTS idx_students_name
    ON students(name);

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Add indexes on announcements and blogs
-- ─────────────────────────────────────────────────────────────

-- Latest announcements first
CREATE INDEX IF NOT EXISTS idx_announcements_id
    ON announcements(id DESC);

-- Latest blogs first
CREATE INDEX IF NOT EXISTS idx_blogs_created
    ON blogs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- STEP 5: Add CHECK constraint on testimonials rating (1–5)
--         PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS,
--         so we check pg_constraint manually first.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_rating' AND conrelid = 'testimonials'::regclass
    ) THEN
        ALTER TABLE testimonials ADD CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5);
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- STEP 6: Set proper DEFAULT values on student JSONB fields
--         (ensures new rows always have safe defaults)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE students
    ALTER COLUMN fee_history      SET DEFAULT '[]',
    ALTER COLUMN results          SET DEFAULT '[]',
    ALTER COLUMN previous_results SET DEFAULT '[]',
    ALTER COLUMN attendance       SET DEFAULT '{}',
    ALTER COLUMN admissions       SET DEFAULT '[]';

-- ─────────────────────────────────────────────────────────────
-- STEP 7: Fix any NULL JSONB fields for existing students
--         (backfill null values so the app never crashes)
-- ─────────────────────────────────────────────────────────────
UPDATE students SET fee_history      = '[]' WHERE fee_history      IS NULL;
UPDATE students SET results          = '[]' WHERE results          IS NULL;
UPDATE students SET previous_results = '[]' WHERE previous_results IS NULL;
UPDATE students SET attendance       = '{}' WHERE attendance       IS NULL;
UPDATE students SET admissions       = '[]' WHERE admissions       IS NULL;

-- ─────────────────────────────────────────────────────────────
-- STEP 8: Create admins table (stores admin login credentials)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id       SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role     TEXT NOT NULL DEFAULT 'admin'  -- 'admin' or 'developer'
);

-- Insert the default admin row (only if it doesn't exist yet)
-- ⚠️ CHANGE THESE CREDENTIALS after first login!
INSERT INTO admins (username, password, role)
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- STEP 9: Backfill attendance records[] for old-format students
--         Old format: { total, present, absent, percentage }
--         New format: { records: [], total, present, absent, percentage }
--         This safely adds an empty records array without losing totals.
-- ─────────────────────────────────────────────────────────────
UPDATE students
SET attendance = attendance || '{"records": []}'::jsonb
WHERE attendance IS NOT NULL
  AND NOT (attendance ? 'records');

-- ─────────────────────────────────────────────────────────────
-- STEP 10: Verify everything looks correct
-- ─────────────────────────────────────────────────────────────
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;
