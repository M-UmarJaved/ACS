-- ============================================================
-- ACS School & College — Inquiries Table Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS inquiries (
    id               SERIAL PRIMARY KEY,
    inquiry_no       TEXT UNIQUE NOT NULL, -- e.g. INQ-26-001
    name             TEXT NOT NULL,
    contact          TEXT NOT NULL,
    class_applying   TEXT,
    admission_fee    NUMERIC DEFAULT 0,
    monthly_fee      NUMERIC DEFAULT 0,
    paper_fund       NUMERIC DEFAULT 0,
    quoted_fee       NUMERIC DEFAULT 0, -- Total/Agreed amount
    notes            TEXT,
    status           TEXT DEFAULT 'pending', -- 'pending', 'confirmed'
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching inquiries
CREATE INDEX IF NOT EXISTS idx_inquiries_no ON inquiries(inquiry_no);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all access (Matches the 'UNRESTRICTED' state of other tables)
CREATE POLICY "Enable all access for all users" ON inquiries FOR ALL USING (true);
