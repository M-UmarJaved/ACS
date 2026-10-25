import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env file!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
    'students',
    'faculty',
    'facilities',
    'testimonials',
    'announcements',
    'blogs',
    'school_info',
    'metadata',
    'admins',
    'fee_records',
    'fee_transactions',
    'inquiries'
];

// Helper to fetch all rows for a table with pagination (handles > 1000 rows limit)
const fetchAllRows = async (tableName) => {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        let attempts = 0;
        let success = false;
        let resData = [];
        let lastErr = null;

        // Retry loop: up to 3 attempts with backoff
        while (attempts < 3 && !success) {
            attempts++;
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) {
                    lastErr = error;
                    console.warn(`    ⚠️  [Attempt ${attempts}/3] ${tableName} fetch warning:`, error.message);
                    await new Promise(res => setTimeout(res, 1000 * attempts));
                } else {
                    resData = data || [];
                    success = true;
                }
            } catch (err) {
                lastErr = err;
                console.warn(`    ⚠️  [Attempt ${attempts}/3] ${tableName} network error:`, err.message);
                await new Promise(res => setTimeout(res, 1000 * attempts));
            }
        }

        if (!success) {
            throw new Error(`Failed to fetch ${tableName} after 3 attempts. Error: ${lastErr?.message || lastErr}`);
        }

        allData = allData.concat(resData);
        if (resData.length < pageSize) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return allData;
};

const backupDatabase = async () => {
    try {
        console.log('🔄 Starting full database backup...\n');

        const backup = {
            timestamp: new Date().toISOString(),
            tables: {},
            stats: {}
        };

        let totalRecords = 0;
        let failedTables = [];

        for (const table of TABLES) {
            try {
                const rows = await fetchAllRows(table);
                backup.tables[table] = rows;
                backup.stats[table] = rows.length;
                totalRecords += rows.length;
                console.log(`  ✅ ${table.padEnd(18)}: ${rows.length} rows`);
            } catch (err) {
                console.error(`  ❌ ${table.padEnd(18)}: FAILED - ${err.message}`);
                failedTables.push(table);
            }
        }

        if (failedTables.length > 0) {
            console.error(`\n❌ Backup aborted! The following table(s) failed: ${failedTables.join(', ')}`);
            console.error(`   No file written to preserve valid backup history.`);
            process.exit(1);
        }

        // Create backups directory if missing
        const backupDir = path.resolve('backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Generate timestamped filename
        const timestamp = new Date().toISOString()
            .replace(/:/g, '-')
            .replace(/\..+/, '');
        const filename = `backup_${timestamp}.json`;
        const filepath = path.join(backupDir, filename);

        // Write backup file atomically
        fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

        const fileSizeKB = (fs.statSync(filepath).size / 1024).toFixed(1);
        console.log(`\n🎉 Backup successfully verified & saved!`);
        console.log(`   File: ${filename}`);
        console.log(`   Total Records: ${totalRecords}`);
        console.log(`   File size: ${fileSizeKB} KB`);

        // Clean up: delete corrupted 1KB files first, then keep last 30 valid backups
        const allFiles = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_') && f.endsWith('.json'));
        
        allFiles.forEach(f => {
            const fp = path.join(backupDir, f);
            const size = fs.statSync(fp).size;
            if (size < 5000) { // Delete corrupted/failed backup files (< 5KB)
                fs.unlinkSync(fp);
                console.log(`   🗑️  Cleaned up invalid/corrupted backup: ${f}`);
            }
        });

        const validFiles = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .sort();

        if (validFiles.length > 30) {
            const toDelete = validFiles.slice(0, validFiles.length - 30);
            toDelete.forEach(f => {
                fs.unlinkSync(path.join(backupDir, f));
                console.log(`   🗑️  Deleted old backup: ${f}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Backup script failed:', err.message);
        process.exit(1);
    }
};

backupDatabase();
