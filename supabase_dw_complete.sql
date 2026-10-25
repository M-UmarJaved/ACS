-- =========================================================================================
-- ACS HIGHER SECONDARY SCHOOL & COLLEGE — ENTERPRISE DATA WAREHOUSE & BI COMPLETE SCHEMA
-- Architecture: Hybrid Medallion Data Lakehouse (Bronze) + Data Vault 2.0 (Silver) + Kimball Star Schema (Gold)
-- Target Engine: PostgreSQL 15+ / Supabase Cloud
-- =========================================================================================

-- =========================================================================================
-- PART 1: OPERATIONAL OLTP SOURCE DATABASES (4 DEPARTMENTAL DOMAINS)
-- =========================================================================================

-- 1.1 Domain A: Admissions & CRM Operational Tables
CREATE TABLE IF NOT EXISTS inquiries (
    id               SERIAL PRIMARY KEY,
    inquiry_no       TEXT UNIQUE NOT NULL, -- e.g. INQ-26-001
    name             TEXT NOT NULL,
    father_name      TEXT,
    contact          TEXT NOT NULL,
    area_locality    TEXT,
    class_applying   TEXT,
    track_interested TEXT,
    admission_fee    NUMERIC DEFAULT 0,
    monthly_fee      NUMERIC DEFAULT 0,
    paper_fund       NUMERIC DEFAULT 0,
    quoted_fee       NUMERIC DEFAULT 0,
    notes            TEXT,
    status           TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'lost'
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id               TEXT PRIMARY KEY,       -- e.g. ACS-2026-001
    serial_number    TEXT UNIQUE,            -- College-wide unique register serial
    password         TEXT NOT NULL,
    name             TEXT NOT NULL,
    grade            TEXT,                   -- Base class e.g. "9th", "1st Year"
    status           TEXT DEFAULT 'active',  -- 'active', 'left', 'graduated'
    image            TEXT,
    fee_history      JSONB DEFAULT '[]',
    results          JSONB DEFAULT '[]',     -- Current term results
    previous_results JSONB DEFAULT '[]',     -- Archived terms: [{ term, results[] }]
    attendance       JSONB DEFAULT '{}',     -- { total, present, absent, late, percentage, records[] }
    admissions       JSONB DEFAULT '[]',     -- Demographic & track object
    "Timestamp"      TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Domain B: Finance, Fee Billing & Accounting Operational Tables
CREATE TABLE IF NOT EXISTS fee_records (
    id               TEXT PRIMARY KEY,
    student_id       TEXT REFERENCES students(id) ON DELETE CASCADE,
    month            TEXT NOT NULL,          -- e.g. "October 2026"
    tuition_fee      NUMERIC DEFAULT 0,
    lab_fee          NUMERIC DEFAULT 0,
    exam_fee         NUMERIC DEFAULT 0,
    admission_fee    NUMERIC DEFAULT 0,
    late_fine        NUMERIC DEFAULT 0,
    discount         NUMERIC DEFAULT 0,
    paid_amount      NUMERIC DEFAULT 0,
    status           TEXT DEFAULT 'unpaid',  -- 'paid', 'partial', 'unpaid'
    paid_on          TEXT,
    UNIQUE(student_id, month)
);

CREATE TABLE IF NOT EXISTS fee_transactions (
    id               SERIAL PRIMARY KEY,
    fee_record_id    TEXT REFERENCES fee_records(id) ON DELETE CASCADE,
    student_id       TEXT NOT NULL,
    month_label      TEXT NOT NULL,
    amount           NUMERIC NOT NULL,
    payment_date     TEXT NOT NULL,
    payment_method   TEXT DEFAULT 'Cash',
    note             TEXT
);

-- 1.3 Domain C: HR, Faculty & Campus Operations Tables
CREATE TABLE IF NOT EXISTS faculty (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    role             TEXT,
    department       TEXT,
    qualification    TEXT,
    phone            TEXT,
    joining_date     TEXT,
    base_salary      NUMERIC DEFAULT 0,
    image            TEXT,
    bio              TEXT
);

CREATE TABLE IF NOT EXISTS facilities (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    image            TEXT,
    category         TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
    id               SERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    content          TEXT,
    date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type             TEXT DEFAULT 'Academic',
    active           BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS blogs (
    id               SERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    excerpt          TEXT,
    content          TEXT,
    author           TEXT DEFAULT 'Admin',
    date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category         TEXT DEFAULT 'Events',
    read_time        TEXT,
    image            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS testimonials (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    role             TEXT,
    text             TEXT,
    rating           INTEGER CHECK (rating BETWEEN 1 AND 5)
);

-- 1.4 Domain D: Academic Configuration & Governance Metadata
CREATE TABLE IF NOT EXISTS school_info (
    id               TEXT PRIMARY KEY DEFAULT 'info',
    name             TEXT,
    tagline          TEXT,
    description      TEXT,
    contact          JSONB,
    about            JSONB,
    statistics       JSONB
);

CREATE TABLE IF NOT EXISTS metadata (
    key              TEXT PRIMARY KEY,
    value            JSONB
);

CREATE TABLE IF NOT EXISTS admins (
    id               SERIAL PRIMARY KEY,
    username         TEXT UNIQUE NOT NULL,
    password         TEXT NOT NULL,
    role             TEXT NOT NULL DEFAULT 'admin'
);


-- =========================================================================================
-- PART 2: BRONZE LAYER — DATA LAKE RAW INGESTION ZONE (SCHEMA-ON-READ)
-- Purpose: Immutable append-only staging lake capturing raw JSON payloads from the 4 OLTP DBs
-- =========================================================================================

CREATE TABLE IF NOT EXISTS dw_bronze_admissions_raw (
    ingestion_id     BIGSERIAL PRIMARY KEY,
    batch_id         TEXT NOT NULL,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_system    TEXT NOT NULL DEFAULT 'OLTP_ADMISSIONS_CRM',
    entity_type      TEXT NOT NULL, -- 'STUDENT_ADMISSION' | 'WALK_IN_INQUIRY'
    business_key     TEXT NOT NULL,
    raw_payload      JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS dw_bronze_academics_raw (
    ingestion_id     BIGSERIAL PRIMARY KEY,
    batch_id         TEXT NOT NULL,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_system    TEXT NOT NULL DEFAULT 'OLTP_EXAM_GRADEBOOK',
    entity_type      TEXT NOT NULL, -- 'TERM_RESULT' | 'HISTORICAL_RESULT' | 'CURRICULUM_META'
    business_key     TEXT NOT NULL,
    raw_payload      JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS dw_bronze_finance_raw (
    ingestion_id     BIGSERIAL PRIMARY KEY,
    batch_id         TEXT NOT NULL,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_system    TEXT NOT NULL DEFAULT 'OLTP_FEE_ACCOUNTING',
    entity_type      TEXT NOT NULL, -- 'FEE_CHALLAN' | 'FEE_INSTALLMENT_TX' | 'OPERATING_EXPENSE'
    business_key     TEXT NOT NULL,
    raw_payload      JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS dw_bronze_operations_raw (
    ingestion_id     BIGSERIAL PRIMARY KEY,
    batch_id         TEXT NOT NULL,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_system    TEXT NOT NULL DEFAULT 'OLTP_HR_ATTENDANCE',
    entity_type      TEXT NOT NULL, -- 'DAILY_ATTENDANCE_SCAN' | 'FACULTY_RECORD'
    business_key     TEXT NOT NULL,
    raw_payload      JSONB NOT NULL
);


-- =========================================================================================
-- PART 3: SILVER LAYER — DATA VAULT 2.0 ENTERPRISE CORE (HUBS, LINKS, SATELLITES)
-- Purpose: Auditable, historical, hash-keyed enterprise integration layer (Dan Linstedt DV 2.0)
-- =========================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 3.1 DATA VAULT HUBS (Unique Business Keys + Hash Keys + Audit Metadata)
-- ─────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dv_hub_student (
    hk_student       CHAR(32) PRIMARY KEY,   -- MD5(UPPER(TRIM(student_id)))
    student_id       TEXT UNIQUE NOT NULL,   -- Business Key (e.g., ACS-2026-001)
    serial_number    TEXT,
    load_dts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src          TEXT NOT NULL DEFAULT 'SRC_ADMISSIONS_DB'
);

CREATE TABLE IF NOT EXISTS dv_hub_class (
    hk_class         CHAR(32) PRIMARY KEY,   -- MD5(UPPER(TRIM(base_class_code)))
    base_class_code  TEXT UNIQUE NOT NULL,   -- Business Key (e.g., '9th', '1st Year')
    load_dts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src          TEXT NOT NULL DEFAULT 'SRC_ACADEMICS_DB'
);

CREATE TABLE IF NOT EXISTS dv_hub_subject (
    hk_subject       CHAR(32) PRIMARY KEY,   -- MD5(UPPER(TRIM(canonical_subject_name)))
    subject_name     TEXT UNIQUE NOT NULL,   -- Business Key (e.g., 'Physics', 'Tarjuma-tul-Quran')
    load_dts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src          TEXT NOT NULL DEFAULT 'SRC_ACADEMICS_DB'
);

CREATE TABLE IF NOT EXISTS dv_hub_faculty (
    hk_faculty       CHAR(32) PRIMARY KEY,   -- MD5(UPPER(TRIM(faculty_bk)))
    faculty_bk       TEXT UNIQUE NOT NULL,   -- Business Key
    load_dts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src          TEXT NOT NULL DEFAULT 'SRC_HR_OPERATIONS_DB'
);

CREATE TABLE IF NOT EXISTS dv_hub_fee_invoice (
    hk_invoice       CHAR(32) PRIMARY KEY,   -- MD5(UPPER(student_id || '||' || billing_month))
    invoice_bk       TEXT UNIQUE NOT NULL,   -- Composite Business Key: ACS-2026-001::October 2026
    load_dts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src          TEXT NOT NULL DEFAULT 'SRC_FINANCE_DB'
);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 3.2 DATA VAULT LINKS (Relationships & Associations Between Hubs)
-- ─────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dv_link_student_enrollment (
    hk_link_enrollment CHAR(32) PRIMARY KEY, -- MD5(hk_student || hk_class)
    hk_student         CHAR(32) NOT NULL REFERENCES dv_hub_student(hk_student),
    hk_class           CHAR(32) NOT NULL REFERENCES dv_hub_class(hk_class),
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src            TEXT NOT NULL DEFAULT 'SRC_ADMISSIONS_DB'
);

CREATE TABLE IF NOT EXISTS dv_link_exam_assessment (
    hk_link_assessment CHAR(32) PRIMARY KEY, -- MD5(hk_student || hk_class || hk_subject || term_name)
    hk_student         CHAR(32) NOT NULL REFERENCES dv_hub_student(hk_student),
    hk_class           CHAR(32) NOT NULL REFERENCES dv_hub_class(hk_class),
    hk_subject         CHAR(32) NOT NULL REFERENCES dv_hub_subject(hk_subject),
    term_name          TEXT NOT NULL,
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src            TEXT NOT NULL DEFAULT 'SRC_ACADEMICS_DB'
);

CREATE TABLE IF NOT EXISTS dv_link_fee_billing (
    hk_link_billing    CHAR(32) PRIMARY KEY, -- MD5(hk_student || hk_invoice)
    hk_student         CHAR(32) NOT NULL REFERENCES dv_hub_student(hk_student),
    hk_invoice         CHAR(32) NOT NULL REFERENCES dv_hub_fee_invoice(hk_invoice),
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src            TEXT NOT NULL DEFAULT 'SRC_FINANCE_DB'
);

CREATE TABLE IF NOT EXISTS dv_link_student_attendance (
    hk_link_attendance CHAR(32) PRIMARY KEY, -- MD5(hk_student || hk_class || attendance_date)
    hk_student         CHAR(32) NOT NULL REFERENCES dv_hub_student(hk_student),
    hk_class           CHAR(32) NOT NULL REFERENCES dv_hub_class(hk_class),
    attendance_date    DATE NOT NULL,
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rec_src            TEXT NOT NULL DEFAULT 'SRC_HR_OPERATIONS_DB'
);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 3.3 DATA VAULT SATELLITES (Time-Variant Descriptive Context & Change Tracking)
-- ─────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dv_sat_student_demographics (
    hk_student         CHAR(32) NOT NULL REFERENCES dv_hub_student(hk_student),
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_diff          CHAR(32) NOT NULL,
    full_name          TEXT NOT NULL,
    father_name        TEXT,
    gender             TEXT,
    dob                TEXT,
    b_form_cnic        TEXT,
    father_cnic        TEXT,
    contact_phone      TEXT,
    locality           TEXT,
    enrollment_status  TEXT,
    rec_src            TEXT NOT NULL DEFAULT 'SRC_ADMISSIONS_DB',
    PRIMARY KEY (hk_student, load_dts)
);

CREATE TABLE IF NOT EXISTS dv_sat_student_academic_track (
    hk_link_enrollment CHAR(32) NOT NULL REFERENCES dv_link_student_enrollment(hk_link_enrollment),
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_diff          CHAR(32) NOT NULL,
    section_name       TEXT,
    subject_track      TEXT,
    sub_track          TEXT,
    house_group        TEXT,
    agreed_monthly_fee NUMERIC,
    rec_src            TEXT NOT NULL DEFAULT 'SRC_ADMISSIONS_DB',
    PRIMARY KEY (hk_link_enrollment, load_dts)
);

CREATE TABLE IF NOT EXISTS dv_sat_exam_marks (
    hk_link_assessment CHAR(32) NOT NULL REFERENCES dv_link_exam_assessment(hk_link_assessment),
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_diff          CHAR(32) NOT NULL,
    obtained_marks     NUMERIC,
    max_marks          NUMERIC,
    percentage         NUMERIC,
    letter_grade       TEXT,
    is_pass            BOOLEAN,
    teacher_remarks    TEXT,
    is_archived_term   BOOLEAN DEFAULT false,
    rec_src            TEXT NOT NULL DEFAULT 'SRC_ACADEMICS_DB',
    PRIMARY KEY (hk_link_assessment, load_dts)
);

CREATE TABLE IF NOT EXISTS dv_sat_fee_financials (
    hk_invoice         CHAR(32) NOT NULL REFERENCES dv_hub_fee_invoice(hk_invoice),
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_diff          CHAR(32) NOT NULL,
    billing_month      TEXT NOT NULL,
    tuition_fee        NUMERIC DEFAULT 0,
    lab_fee            NUMERIC DEFAULT 0,
    exam_fee           NUMERIC DEFAULT 0,
    admission_fee      NUMERIC DEFAULT 0,
    late_fine          NUMERIC DEFAULT 0,
    discount_amount    NUMERIC DEFAULT 0,
    net_payable        NUMERIC DEFAULT 0,
    paid_amount        NUMERIC DEFAULT 0,
    balance_due        NUMERIC DEFAULT 0,
    payment_status     TEXT,
    paid_on_date       TEXT,
    installment_count  INTEGER DEFAULT 0,
    rec_src            TEXT NOT NULL DEFAULT 'SRC_FINANCE_DB',
    PRIMARY KEY (hk_invoice, load_dts)
);

CREATE TABLE IF NOT EXISTS dv_sat_attendance_daily (
    hk_link_attendance CHAR(32) NOT NULL REFERENCES dv_link_student_attendance(hk_link_attendance),
    load_dts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status             TEXT NOT NULL, -- 'present', 'absent', 'late', 'leave'
    is_present         INTEGER,
    is_absent          INTEGER,
    is_late            INTEGER,
    rec_src            TEXT NOT NULL DEFAULT 'SRC_HR_OPERATIONS_DB',
    PRIMARY KEY (hk_link_attendance, load_dts)
);


-- =========================================================================================
-- PART 4: GOLD LAYER — KIMBALL DIMENSIONAL STAR SCHEMA (BI & OLAP CONSUMPTION ZONE)
-- Purpose: Denormalized Dimensions (with SCD Type 2) + Conformed Facts for Fast OLAP & AI
-- =========================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 4.1 CONFORMED DIMENSION TABLES
-- ─────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dw_dim_date (
    date_key           INTEGER PRIMARY KEY,  -- YYYYMMDD e.g. 20261017
    full_date          DATE UNIQUE NOT NULL,
    day_of_month       INTEGER,
    day_name           TEXT,
    month_num          INTEGER,
    month_name         TEXT,
    month_label        TEXT,                 -- e.g. 'October 2026'
    quarter_num        INTEGER,
    quarter_label      TEXT,                 -- e.g. 'Q4 2026'
    calendar_year      INTEGER,
    academic_session   TEXT,                 -- e.g. '2025-2026'
    is_weekend         BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS dw_dim_student (
    student_sk         SERIAL PRIMARY KEY,   -- Surrogate Key
    hk_student         CHAR(32) NOT NULL,
    student_id         TEXT NOT NULL,        -- Natural Key
    serial_number      TEXT,
    full_name          TEXT NOT NULL,
    father_name        TEXT,
    gender             TEXT,
    locality           TEXT,
    section_name       TEXT,
    base_class         TEXT,
    subject_track      TEXT,
    sub_track          TEXT,
    house_group        TEXT,
    enrollment_status  TEXT,
    -- SCD Type 2 Slowly Changing Dimension Tracking
    effective_from     DATE NOT NULL DEFAULT '2025-04-01',
    effective_to       DATE DEFAULT '9999-12-31',
    is_current         BOOLEAN NOT NULL DEFAULT true,
    version_num        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS dw_dim_class_track (
    class_track_sk     SERIAL PRIMARY KEY,
    section_name       TEXT NOT NULL,        -- Primary, Middle, Matric, Intermediate
    base_class         TEXT NOT NULL,        -- Playgroup .. 2nd Year
    subject_track      TEXT NOT NULL,        -- General, Biology, Computer, Pre-Medical, ICS, etc.
    sub_track          TEXT NOT NULL,        -- Standard, Physics, Statistics, Economics, FA, FAIT
    board_affiliation  TEXT DEFAULT 'BISE Faisalabad',
    standard_tuition   NUMERIC DEFAULT 0,
    class_sort_order   INTEGER DEFAULT 99
);

CREATE TABLE IF NOT EXISTS dw_dim_subject (
    subject_sk         SERIAL PRIMARY KEY,
    canonical_name     TEXT UNIQUE NOT NULL,
    subject_category   TEXT NOT NULL,        -- 'Compulsory', 'STEM Science', 'Humanities/Arts', 'Quranic/Islamic'
    default_max_marks  NUMERIC DEFAULT 100
);

CREATE TABLE IF NOT EXISTS dw_dim_faculty (
    faculty_sk         SERIAL PRIMARY KEY,
    faculty_id         INTEGER UNIQUE NOT NULL,
    full_name          TEXT NOT NULL,
    designation        TEXT,
    department         TEXT,
    qualification      TEXT,
    monthly_salary     NUMERIC DEFAULT 0,
    joining_date       TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- 4.2 KIMBALL FACT TABLES
-- ─────────────────────────────────────────────────────────────────────────────────────────

-- Fact 1: Academic Examination Performance (Grain: 1 row per Student per Subject per Exam Term)
CREATE TABLE IF NOT EXISTS dw_fact_academic_performance (
    fact_exam_id       BIGSERIAL PRIMARY KEY,
    student_sk         INTEGER REFERENCES dw_dim_student(student_sk),
    class_track_sk     INTEGER REFERENCES dw_dim_class_track(class_track_sk),
    subject_sk         INTEGER REFERENCES dw_dim_subject(subject_sk),
    term_name          TEXT NOT NULL,
    academic_session   TEXT NOT NULL DEFAULT '2025-2026',
    obtained_marks     NUMERIC NOT NULL,
    total_marks        NUMERIC NOT NULL,
    percentage         NUMERIC NOT NULL,
    grade_letter       TEXT NOT NULL,
    gpa_points         NUMERIC NOT NULL,
    pass_flag          INTEGER NOT NULL,     -- 1 = Pass (>=40%), 0 = Fail
    distinction_flag   INTEGER NOT NULL      -- 1 = A/A+ (>=80%), 0 = Below
);

-- Fact 2: Fee Billing & Revenue Collection Ledger (Grain: 1 row per Student per Billing Month)
CREATE TABLE IF NOT EXISTS dw_fact_fee_ledger (
    fact_fee_id        BIGSERIAL PRIMARY KEY,
    student_sk         INTEGER REFERENCES dw_dim_student(student_sk),
    class_track_sk     INTEGER REFERENCES dw_dim_class_track(class_track_sk),
    date_key           INTEGER REFERENCES dw_dim_date(date_key),
    billing_month      TEXT NOT NULL,
    tuition_fee        NUMERIC DEFAULT 0,
    lab_exam_fee       NUMERIC DEFAULT 0,
    admission_fee      NUMERIC DEFAULT 0,
    late_fine          NUMERIC DEFAULT 0,
    gross_billed       NUMERIC DEFAULT 0,
    discount_scholarship NUMERIC DEFAULT 0,
    net_payable        NUMERIC DEFAULT 0,
    collected_amount   NUMERIC DEFAULT 0,
    outstanding_arrears NUMERIC DEFAULT 0,
    collection_ratio   NUMERIC DEFAULT 0,
    is_fully_paid      INTEGER DEFAULT 0,
    is_defaulter       INTEGER DEFAULT 0,
    installment_tx_cnt INTEGER DEFAULT 0
);

-- Fact 3: Daily Student Attendance (Grain: 1 row per Student per School Day)
CREATE TABLE IF NOT EXISTS dw_fact_daily_attendance (
    fact_att_id        BIGSERIAL PRIMARY KEY,
    student_sk         INTEGER REFERENCES dw_dim_student(student_sk),
    class_track_sk     INTEGER REFERENCES dw_dim_class_track(class_track_sk),
    date_key           INTEGER REFERENCES dw_dim_date(date_key),
    attendance_date    DATE NOT NULL,
    present_count      INTEGER DEFAULT 0,
    absent_count       INTEGER DEFAULT 0,
    late_count         INTEGER DEFAULT 0,
    leave_count        INTEGER DEFAULT 0
);

-- Fact 4: Walk-in Admissions Inquiry Funnel (Grain: 1 row per Walk-in Inquiry)
CREATE TABLE IF NOT EXISTS dw_fact_admissions_funnel (
    fact_inquiry_id    BIGSERIAL PRIMARY KEY,
    inquiry_no         TEXT UNIQUE NOT NULL,
    class_track_sk     INTEGER REFERENCES dw_dim_class_track(class_track_sk),
    date_key           INTEGER REFERENCES dw_dim_date(date_key),
    applicant_name     TEXT,
    locality           TEXT,
    quoted_admission   NUMERIC DEFAULT 0,
    quoted_monthly     NUMERIC DEFAULT 0,
    total_quoted_pkg   NUMERIC DEFAULT 0,
    converted_flag     INTEGER DEFAULT 0,    -- 1 = Confirmed/Enrolled, 0 = Pending/Lost
    status_label       TEXT
);

-- Fact 5: Institutional Monthly Profit & Loss Summary (Grain: 1 row per Calendar Month)
CREATE TABLE IF NOT EXISTS dw_fact_institutional_pnl (
    fact_pnl_id        BIGSERIAL PRIMARY KEY,
    month_label        TEXT UNIQUE NOT NULL,
    date_key           INTEGER,
    gross_fee_billed   NUMERIC DEFAULT 0,
    scholarships_given NUMERIC DEFAULT 0,
    net_fee_receivable NUMERIC DEFAULT 0,
    fee_revenue_collected NUMERIC DEFAULT 0,
    uncollected_arrears NUMERIC DEFAULT 0,
    faculty_payroll    NUMERIC DEFAULT 0,
    utilities_expense  NUMERIC DEFAULT 0,
    maintenance_ops    NUMERIC DEFAULT 0,
    total_expenses     NUMERIC DEFAULT 0,
    net_operating_profit NUMERIC DEFAULT 0,
    profit_margin_pct  NUMERIC DEFAULT 0
);

-- Performance Indexes on Gold Star Schema
CREATE INDEX IF NOT EXISTS idx_fact_exam_student ON dw_fact_academic_performance(student_sk);
CREATE INDEX IF NOT EXISTS idx_fact_exam_class   ON dw_fact_academic_performance(class_track_sk);
CREATE INDEX IF NOT EXISTS idx_fact_exam_subject ON dw_fact_academic_performance(subject_sk);
CREATE INDEX IF NOT EXISTS idx_fact_fee_student  ON dw_fact_fee_ledger(student_sk);
CREATE INDEX IF NOT EXISTS idx_fact_fee_month    ON dw_fact_fee_ledger(billing_month);
CREATE INDEX IF NOT EXISTS idx_fact_att_student  ON dw_fact_daily_attendance(student_sk);
CREATE INDEX IF NOT EXISTS idx_fact_att_date     ON dw_fact_daily_attendance(date_key);
