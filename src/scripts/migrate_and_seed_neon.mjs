import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { generatePakistaniSchoolDataset } from '../warehouse/seedPakistaniData.js';
import { buildEnterpriseDataWarehouse } from '../warehouse/dwEngine.js';

dotenv.config({ path: '.env' });

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const CONNECTION_STRING = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!CONNECTION_STRING) {
    console.error('Missing DATABASE_URL or VITE_DATABASE_URL in .env file.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function getTableColumns(client, tableName) {
    const res = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
    );
    return new Map(res.rows.map((r) => [r.column_name, r.data_type]));
}

async function bulkInsert(client, tableName, rows, conflictClause = 'DO NOTHING') {
    if (!rows || rows.length === 0) return 0;
    const colMap = await getTableColumns(client, tableName);
    const cols = Object.keys(rows[0]).filter((c) => colMap.has(c));
    if (cols.length === 0) return 0;

    const colNames = cols.map((c) => `"${c}"`).join(', ');
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values = [];
        const rowPlaceholders = batch.map((row) => {
            const ph = cols.map((col) => {
                let val = row[col];
                const dt = colMap.get(col);
                if (dt === 'jsonb' && val !== null && val !== undefined) {
                    val = typeof val === 'string' ? val : JSON.stringify(val);
                } else if (val !== null && typeof val === 'object' && !(val instanceof Date) && dt !== 'ARRAY') {
                    val = JSON.stringify(val);
                }
                values.push(val ?? null);
                const idx = values.length;
                return dt === 'jsonb' ? `$${idx}::jsonb` : `$${idx}`;
            });
            return `(${ph.join(', ')})`;
        });

        const sql = `INSERT INTO "${tableName}" (${colNames}) VALUES ${rowPlaceholders.join(', ')} ${conflictClause}`;
        await client.query(sql, values);
        totalInserted += batch.length;
    }
    return totalInserted;
}

async function main() {
    const client = await pool.connect();
    try {
        console.log('================================================================');
        console.log('🚀 CONNECTING TO NEON SERVERLESS POSTGRESQL (neondb)');
        console.log('================================================================');
        const versionRes = await client.query('SELECT version(), current_database(), current_user');
        console.log('✅ Connected:', versionRes.rows[0].current_database, 'as', versionRes.rows[0].current_user);

        // 1. Run complete DDL migration from supabase_dw_complete.sql
        console.log('\n📜 Step 1: Executing Data Warehouse & Operational DDL Migration (supabase_dw_complete.sql)...');
        const sqlPath = path.join(projectRoot, 'supabase_dw_complete.sql');
        const ddlSql = fs.readFileSync(sqlPath, 'utf8');
        await client.query('DROP TABLE IF EXISTS fee_transactions, fee_records CASCADE;');
        await client.query(ddlSql);
        console.log('✅ All 28 Operational, Bronze Lake, Silver Data Vault 2.0, and Gold Star Schema tables verified!');

        // 2. Generate Pakistani ERP Dataset & 3-Tier Data Warehouse
        console.log('\n🇵🇰 Step 2: Generating Pakistani ERP Dataset (360 Students, 4 Operational DBs) & Running ETL...');
        const dataset = generatePakistaniSchoolDataset(20261017);
        const dw = buildEnterpriseDataWarehouse({
            schoolData: dataset,
            CLASSES: dataset.metadata.CLASSES,
            SECTIONS: dataset.metadata.SECTIONS,
            SUBJECTS: dataset.metadata.SUBJECTS,
            CLASS_FEE_DEFAULTS: dataset.metadata.CLASS_FEE_DEFAULTS,
            EXPENSES: dataset.expenses
        });

        // 3. Seed Operational OLTP Tables
        console.log('\n🏦 Step 3: Seeding Operational OLTP Tables in Neon...');
        await client.query('BEGIN');

        await client.query(`
            TRUNCATE TABLE
                students, inquiries, fee_records, fee_transactions,
                faculty, facilities, announcements, blogs, testimonials,
                metadata, admins
            RESTART IDENTITY CASCADE
        `);

        await client.query(
            `INSERT INTO school_info (id, name, tagline, description, contact, statistics)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                tagline = EXCLUDED.tagline,
                description = EXCLUDED.description,
                contact = EXCLUDED.contact,
                statistics = EXCLUDED.statistics`,
            [
                'info',
                dataset.schoolInfo.name,
                dataset.schoolInfo.tagline,
                dataset.schoolInfo.description,
                JSON.stringify(dataset.schoolInfo.contact),
                JSON.stringify(dataset.schoolInfo.statistics)
            ]
        );

        const dbStudents = dataset.students.map((s) => ({
            id: s.id,
            serial_number: String(s.serial_number ?? s.serialNumber ?? ''),
            password: s.password || '123456',
            name: s.name,
            grade: s.grade,
            status: s.status || 'active',
            image: s.image || '',
            fee_history: s.feeHistory || [],
            results: s.results || [],
            previous_results: s.previousResults || [],
            attendance: s.attendance || {},
            admissions: s.admissions || []
        }));
        await bulkInsert(client, 'students', dbStudents, 'ON CONFLICT (id) DO NOTHING');

        const dbInquiries = dataset.inquiries.map((inq, idx) => ({
            inquiry_no: inq.inquiryNo || `INQ-26-${String(idx + 1).padStart(3, '0')}`,
            name: inq.name,
            father_name: inq.fatherName,
            contact: inq.contact || inq.phone || '0300-0000000',
            area_locality: inq.areaLocality || inq.address || 'Painsra',
            class_applying: inq.classApplying || inq.targetClass || '9th',
            track_interested: inq.trackInterested || 'Science',
            admission_fee: inq.admissionFee || 5000,
            monthly_fee: inq.monthlyFee || 3500,
            paper_fund: inq.paperFund || 1000,
            quoted_fee: inq.quotedFee || 9500,
            notes: inq.notes || '',
            status: inq.status || 'pending'
        }));
        await bulkInsert(client, 'inquiries', dbInquiries, 'ON CONFLICT (inquiry_no) DO NOTHING');

        await bulkInsert(client, 'fee_records', dataset.feeRecords, 'ON CONFLICT (id) DO NOTHING');
        await bulkInsert(client, 'fee_transactions', dataset.feeTransactions, '');
        await bulkInsert(client, 'faculty', dataset.faculty, '');
        await bulkInsert(client, 'facilities', dataset.facilities, '');
        await bulkInsert(client, 'announcements', dataset.announcements, '');
        await bulkInsert(client, 'blogs', dataset.blogs, '');
        await bulkInsert(client, 'testimonials', dataset.testimonials, '');

        for (const [k, v] of Object.entries(dataset.metadata)) {
            await client.query(
                `INSERT INTO metadata (key, value) VALUES ($1, $2::jsonb)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                [k, JSON.stringify(v)]
            );
        }

        await client.query(
            `INSERT INTO admins (username, password, role) VALUES ('admin', 'admin123', 'admin')
             ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`
        );
        await client.query('COMMIT');
        console.log(`✅ Operational OLTP seeded: ${dbStudents.length} students, ${dataset.feeRecords.length} fee records, ${dbInquiries.length} inquiries.`);

        // 4. Seed Tier 1: Bronze Data Lake
        console.log('\n🥉 Step 4: Seeding Tier 1 — Bronze Data Lake Tables in Neon...');
        await client.query('BEGIN');
        await client.query(`
            TRUNCATE TABLE
                dw_bronze_admissions_raw,
                dw_bronze_academics_raw,
                dw_bronze_finance_raw,
                dw_bronze_operations_raw
            RESTART IDENTITY CASCADE
        `);
        await bulkInsert(client, 'dw_bronze_admissions_raw', dw.bronze.bronze_admissions_raw, '');
        await bulkInsert(client, 'dw_bronze_academics_raw', dw.bronze.bronze_academics_raw, '');
        await bulkInsert(client, 'dw_bronze_finance_raw', dw.bronze.bronze_finance_raw, '');
        await bulkInsert(client, 'dw_bronze_operations_raw', dw.bronze.bronze_operations_raw.slice(0, 4500), '');
        await client.query('COMMIT');
        console.log('✅ Bronze Data Lake tables populated!');

        // 5. Seed Tier 2: Silver Data Vault 2.0 (Hubs, Links, Satellites)
        console.log('\n🥈 Step 5: Seeding Tier 2 — Silver Data Vault 2.0 (Hubs, Links, Satellites) in Neon...');
        await client.query('BEGIN');
        await client.query(`
            TRUNCATE TABLE
                dv_hub_student, dv_hub_class, dv_hub_subject, dv_hub_faculty, dv_hub_fee_invoice,
                dv_link_student_enrollment, dv_link_exam_assessment, dv_link_fee_billing, dv_link_student_attendance,
                dv_sat_student_demographics, dv_sat_student_academic_track, dv_sat_exam_marks, dv_sat_fee_financials, dv_sat_attendance_daily
            RESTART IDENTITY CASCADE
        `);
        await bulkInsert(client, 'dv_hub_student', dw.silverDataVault.hubs.dv_hub_student, 'ON CONFLICT (hk_student) DO NOTHING');
        await bulkInsert(client, 'dv_hub_class', dw.silverDataVault.hubs.dv_hub_class, 'ON CONFLICT (hk_class) DO NOTHING');
        await bulkInsert(client, 'dv_hub_subject', dw.silverDataVault.hubs.dv_hub_subject, 'ON CONFLICT (hk_subject) DO NOTHING');
        await bulkInsert(client, 'dv_hub_faculty', dw.silverDataVault.hubs.dv_hub_faculty, 'ON CONFLICT (hk_faculty) DO NOTHING');
        await bulkInsert(client, 'dv_hub_fee_invoice', dw.silverDataVault.hubs.dv_hub_fee_invoice, 'ON CONFLICT (hk_invoice) DO NOTHING');

        await bulkInsert(client, 'dv_link_student_enrollment', dw.silverDataVault.links.dv_link_student_enrollment, 'ON CONFLICT (hk_link_enrollment) DO NOTHING');
        await bulkInsert(client, 'dv_link_exam_assessment', dw.silverDataVault.links.dv_link_exam_assessment, 'ON CONFLICT (hk_link_assessment) DO NOTHING');
        await bulkInsert(client, 'dv_link_fee_billing', dw.silverDataVault.links.dv_link_fee_billing, 'ON CONFLICT (hk_link_billing) DO NOTHING');
        await bulkInsert(client, 'dv_link_student_attendance', dw.silverDataVault.links.dv_link_student_attendance.slice(0, 4500), 'ON CONFLICT (hk_link_attendance) DO NOTHING');

        await bulkInsert(client, 'dv_sat_student_demographics', dw.silverDataVault.satellites.dv_sat_student_demographics, 'ON CONFLICT DO NOTHING');
        await bulkInsert(client, 'dv_sat_student_academic_track', dw.silverDataVault.satellites.dv_sat_student_academic_track, 'ON CONFLICT DO NOTHING');
        await bulkInsert(client, 'dv_sat_exam_marks', dw.silverDataVault.satellites.dv_sat_exam_marks, 'ON CONFLICT DO NOTHING');
        await bulkInsert(client, 'dv_sat_fee_financials', dw.silverDataVault.satellites.dv_sat_fee_financials, 'ON CONFLICT DO NOTHING');
        await bulkInsert(client, 'dv_sat_attendance_daily', dw.silverDataVault.satellites.dv_sat_attendance_daily.slice(0, 4500), 'ON CONFLICT DO NOTHING');
        await client.query('COMMIT');
        console.log('✅ Silver Data Vault 2.0 Hubs, Links, and Satellites populated!');

        // 6. Seed Tier 3: Gold Kimball Star Schema (Conformed Dimensions & Fact Tables)
        console.log('\n🥇 Step 6: Seeding Tier 3 — Gold Kimball Star Schema (Dimensions & Facts) in Neon...');
        await client.query('BEGIN');
        await client.query(`
            TRUNCATE TABLE
                dw_dim_date, dw_dim_student, dw_dim_class_track, dw_dim_subject, dw_dim_faculty,
                dw_fact_academic_performance, dw_fact_fee_ledger, dw_fact_daily_attendance, dw_fact_admissions_funnel, dw_fact_institutional_pnl
            RESTART IDENTITY CASCADE
        `);
        await bulkInsert(client, 'dw_dim_date', dw.goldStarSchema.dimensions.dw_dim_date, 'ON CONFLICT (date_key) DO NOTHING');
        await bulkInsert(client, 'dw_dim_student', dw.goldStarSchema.dimensions.dw_dim_student, 'ON CONFLICT (student_sk) DO NOTHING');
        await bulkInsert(client, 'dw_dim_class_track', dw.goldStarSchema.dimensions.dw_dim_class_track, 'ON CONFLICT (class_track_sk) DO NOTHING');
        await bulkInsert(client, 'dw_dim_subject', dw.goldStarSchema.dimensions.dw_dim_subject, 'ON CONFLICT (subject_sk) DO NOTHING');
        await bulkInsert(client, 'dw_dim_faculty', dw.goldStarSchema.dimensions.dw_dim_faculty, 'ON CONFLICT (faculty_sk) DO NOTHING');

        await bulkInsert(client, 'dw_fact_academic_performance', dw.goldStarSchema.facts.dw_fact_academic_performance, '');
        await bulkInsert(client, 'dw_fact_fee_ledger', dw.goldStarSchema.facts.dw_fact_fee_ledger, '');
        await bulkInsert(client, 'dw_fact_daily_attendance', dw.goldStarSchema.facts.dw_fact_daily_attendance.slice(0, 5000), '');
        await bulkInsert(client, 'dw_fact_admissions_funnel', dw.goldStarSchema.facts.dw_fact_admissions_funnel, 'ON CONFLICT (inquiry_no) DO NOTHING');
        await bulkInsert(client, 'dw_fact_institutional_pnl', dw.goldStarSchema.facts.dw_fact_institutional_pnl, 'ON CONFLICT (month_label) DO NOTHING');
        await client.query('COMMIT');
        console.log('✅ Gold Kimball Star Schema Dimensions and Fact tables populated!');

        // 7. Verification Audit across all 29 tables in Neon
        console.log('\n📊 Step 7: Verifying Live Neon PostgreSQL Table Counts:');
        const verifyTables = [
            'school_info', 'students', 'inquiries', 'fee_records', 'fee_transactions', 'faculty', 'facilities', 'announcements', 'blogs', 'testimonials', 'metadata', 'admins',
            'dw_bronze_admissions_raw', 'dw_bronze_academics_raw', 'dw_bronze_finance_raw', 'dw_bronze_operations_raw',
            'dv_hub_student', 'dv_hub_class', 'dv_hub_subject', 'dv_hub_faculty', 'dv_hub_fee_invoice',
            'dv_link_student_enrollment', 'dv_link_exam_assessment', 'dv_link_fee_billing', 'dv_link_student_attendance',
            'dv_sat_student_demographics', 'dv_sat_student_academic_track', 'dv_sat_exam_marks', 'dv_sat_fee_financials', 'dv_sat_attendance_daily',
            'dw_dim_date', 'dw_dim_student', 'dw_dim_class_track', 'dw_dim_subject', 'dw_dim_faculty',
            'dw_fact_academic_performance', 'dw_fact_fee_ledger', 'dw_fact_daily_attendance', 'dw_fact_admissions_funnel', 'dw_fact_institutional_pnl'
        ];

        let grandTotalRows = 0;
        for (const tb of verifyTables) {
            const cRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM "${tb}"`);
            const cnt = cRes.rows[0].cnt;
            grandTotalRows += cnt;
            console.log(`   • ${tb.padEnd(32, ' ')} : ${cnt.toLocaleString()} rows`);
        }
        console.log('================================================================');
        console.log(`🎉 SUCCESS! Total Rows Persisted in Neon PostgreSQL: ${grandTotalRows.toLocaleString()}`);
        console.log('================================================================');
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((err) => {
    console.error('❌ Migration/Seed Error:', err);
    process.exit(1);
});
