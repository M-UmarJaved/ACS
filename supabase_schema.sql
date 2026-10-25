-- ============================================================
-- ACS School & College — Supabase Database Schema
-- Last updated: February 2026
-- ============================================================

-- CLEAN START: Drop existing tables if they exist (in order to avoid FK issues)
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS facilities;
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS school_info;
DROP TABLE IF EXISTS metadata;
DROP TABLE IF EXISTS blogs;
DROP TABLE IF EXISTS announcements;

-- ============================================================
-- 1. School Info Table (single-row configuration)
-- ============================================================
CREATE TABLE school_info (
    id          TEXT PRIMARY KEY DEFAULT 'info',
    name        TEXT,
    tagline     TEXT,
    description TEXT,
    contact     JSONB,   -- { phone, email, address, map }
    about       JSONB,   -- { mission, vision, history }
    statistics  JSONB    -- [ { label, value } ]
);

-- ============================================================
-- 2. Faculty Table
-- ============================================================
CREATE TABLE faculty (
    id         SERIAL PRIMARY KEY,
    name       TEXT    NOT NULL,
    role       TEXT,
    department TEXT,
    image      TEXT,
    bio        TEXT
);

-- ============================================================
-- 3. Facilities Table
-- ============================================================
CREATE TABLE facilities (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    image       TEXT,
    category    TEXT
);

-- ============================================================
-- 4. Testimonials Table
-- ============================================================
CREATE TABLE testimonials (
    id     SERIAL PRIMARY KEY,
    name   TEXT    NOT NULL,
    role   TEXT,
    text   TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5)
);

-- ============================================================
-- 5. Students Table
-- ============================================================
CREATE TABLE students (
    id               TEXT PRIMARY KEY,
    serial_number    TEXT UNIQUE,
    password         TEXT NOT NULL,   -- NOTE: hash passwords in production
    name             TEXT NOT NULL,
    grade            TEXT,             -- class/grade e.g. "Class 5A"
    image            TEXT,             -- URL to profile photo
    -- fee_status removed: replaced by fee_history below
    fee_history      JSONB DEFAULT '[]',    -- [{ month, status, paidOn }]
    results          JSONB DEFAULT '[]',    -- [{ subject, term, obtained, total, percentage, grade, remarks }]
    previous_results JSONB DEFAULT '[]',   -- archived terms: [{ term, results[] }]
    attendance       JSONB DEFAULT '{}',   -- { total, present, absent, percentage }
    admissions       JSONB DEFAULT '[]'    -- [{ studentName, bForm, dob, gender, ... }]
);

-- Index for filtering students by class (most common query)
CREATE INDEX idx_students_grade        ON students(grade);
-- Index for serial number lookups & uniqueness checks
CREATE INDEX idx_students_serial       ON students(serial_number);
-- Index for student name search
CREATE INDEX idx_students_name         ON students(name);

-- ============================================================
-- 6. Metadata Table  (stores configurable lists)
-- ============================================================
CREATE TABLE metadata (
    key   TEXT PRIMARY KEY,   -- e.g. 'CLASSES', 'SUBJECTS', 'TERMS', 'SECTIONS', 'WEIGHTS'
    value JSONB               -- the list/object value
);

-- ============================================================
-- 7. Announcements Table
-- ============================================================
CREATE TABLE announcements (
    id         SERIAL PRIMARY KEY,
    title      TEXT    NOT NULL,
    content    TEXT,
    date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- proper timestamp (was TEXT)
    type       TEXT,
    active     BOOLEAN DEFAULT true
);

-- Index for fetching latest announcements
CREATE INDEX idx_announcements_date ON announcements(date DESC);

-- ============================================================
-- 8. Blogs Table
-- ============================================================
CREATE TABLE blogs (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    excerpt    TEXT,
    content    TEXT,
    author     TEXT        DEFAULT 'Admin',
    date       TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- proper timestamp (was TEXT)
    category   TEXT        DEFAULT 'Events',
    read_time  TEXT,
    image      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching latest blogs
CREATE INDEX idx_blogs_date ON blogs(date DESC);

