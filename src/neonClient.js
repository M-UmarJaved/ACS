import { neon } from '@neondatabase/serverless';

export const NEON_DATABASE_URL =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATABASE_URL) ||
    (typeof process !== 'undefined' && (process.env?.DATABASE_URL || process.env?.VITE_DATABASE_URL)) ||
    '';

export const neonSql = NEON_DATABASE_URL
    ? neon(NEON_DATABASE_URL)
    : async () => {
          throw new Error('VITE_DATABASE_URL is not configured in .env');
      };

const VALID_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function quoteIdent(name) {
    if (!VALID_IDENT.test(name)) {
        throw new Error(`Invalid SQL identifier: ${name}`);
    }
    return `"${name}"`;
}

// Primary keys per operational/warehouse table for automatic ON CONFLICT handling
const TABLE_PRIMARY_KEYS = {
    school_info: 'id',
    students: 'id',
    inquiries: 'inquiry_no',
    fee_records: 'id',
    fee_transactions: 'id',
    faculty: 'id',
    facilities: 'id',
    announcements: 'id',
    blogs: 'id',
    testimonials: 'id',
    metadata: 'key',
    admins: 'username',
    dv_hub_student: 'hk_student',
    dv_hub_class: 'hk_class',
    dv_hub_subject: 'hk_subject',
    dv_hub_faculty: 'hk_faculty',
    dv_hub_fee_invoice: 'hk_invoice',
    dw_dim_date: 'date_key',
    dw_dim_student: 'student_sk',
    dw_dim_class_track: 'class_track_sk',
    dw_dim_subject: 'subject_sk',
    dw_dim_faculty: 'faculty_sk'
};

const JSONB_COLUMNS = new Set([
    'stats',
    'contact',
    'statistics',
    'admissions',
    'attendance',
    'results',
    'previous_results',
    'fee_history',
    'value',
    'raw_payload'
]);

function serializeValue(col, val) {
    if (val === undefined) return null;
    if (val === null) return null;
    if (JSONB_COLUMNS.has(col) && typeof val === 'object') {
        return JSON.stringify(val);
    }
    if (Array.isArray(val) && !JSONB_COLUMNS.has(col)) {
        return val;
    }
    if (typeof val === 'object' && !(val instanceof Date)) {
        return JSON.stringify(val);
    }
    return val;
}

/**
 * PostgREST-compatible query builder backed by Neon Serverless HTTP driver (`@neondatabase/serverless`).
 * Ensures all existing `supabase.from(table).select/insert/upsert/update/delete` calls execute directly on Neon!
 */
class NeonQueryBuilder {
    constructor(table) {
        this.table = table;
        this.action = 'select';
        this.columns = '*';
        this.payload = null;
        this.upsertOpts = {};
        this.filters = [];
        this.orderBy = null;
        this.limitCount = null;
        this.offsetCount = null;
        this.isSingle = false;
    }

    select(cols = '*') {
        if (this.action === 'select') {
            this.columns = cols;
        }
        return this;
    }

    insert(data) {
        this.action = 'insert';
        this.payload = Array.isArray(data) ? data : [data];
        return this;
    }

    upsert(data, opts = {}) {
        this.action = 'upsert';
        this.payload = Array.isArray(data) ? data : [data];
        this.upsertOpts = opts;
        return this;
    }

    update(data) {
        this.action = 'update';
        this.payload = data;
        return this;
    }

    delete() {
        this.action = 'delete';
        return this;
    }

    eq(col, val) {
        this.filters.push({ type: 'eq', col, val });
        return this;
    }

    neq(col, val) {
        this.filters.push({ type: 'neq', col, val });
        return this;
    }

    not(col, op, val) {
        if (op === 'in') {
            const arr = typeof val === 'string'
                ? val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
                : (Array.isArray(val) ? val : []);
            this.filters.push({ type: 'not_in', col, val: arr });
        } else {
            this.filters.push({ type: 'neq', col, val });
        }
        return this;
    }

    in(col, vals) {
        this.filters.push({ type: 'in', col, val: vals });
        return this;
    }

    order(col, { ascending = true } = {}) {
        this.orderBy = { col, ascending };
        return this;
    }

    limit(n) {
        this.limitCount = Number(n);
        return this;
    }

    range(start, end) {
        const s = Number(start) || 0;
        const e = Number(end) || 999;
        this.offsetCount = s;
        this.limitCount = Math.max(1, e - s + 1);
        return this;
    }

    single() {
        this.isSingle = true;
        this.limitCount = 1;
        return this;
    }

    _buildWhere(params) {
        if (this.filters.length === 0) return '';
        const clauses = this.filters.map((f) => {
            const colIdent = quoteIdent(f.col);
            if (f.type === 'eq') {
                params.push(f.val);
                return `${colIdent} = $${params.length}`;
            }
            if (f.type === 'neq') {
                params.push(f.val);
                return `${colIdent} <> $${params.length}`;
            }
            if (f.type === 'in') {
                const arr = Array.isArray(f.val) ? f.val : [];
                if (arr.length === 0) return 'FALSE';
                const placeholders = arr.map((item) => {
                    params.push(item);
                    return `$${params.length}`;
                });
                return `${colIdent} IN (${placeholders.join(', ')})`;
            }
            if (f.type === 'not_in') {
                const arr = Array.isArray(f.val) ? f.val : [];
                if (arr.length === 0) return 'TRUE';
                const placeholders = arr.map((item) => {
                    params.push(item);
                    return `$${params.length}`;
                });
                return `${colIdent} NOT IN (${placeholders.join(', ')})`;
            }
            return 'TRUE';
        });
        return ` WHERE ${clauses.join(' AND ')}`;
    }

    async execute() {
        const tableIdent = quoteIdent(this.table);
        try {
            if (this.action === 'select') {
                const params = [];
                let sql = `SELECT * FROM ${tableIdent}`;
                sql += this._buildWhere(params);
                if (this.orderBy && VALID_IDENT.test(this.orderBy.col)) {
                    sql += ` ORDER BY ${quoteIdent(this.orderBy.col)} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`;
                }
                if (this.limitCount !== null && this.limitCount !== undefined) {
                    sql += ` LIMIT ${Number(this.limitCount)}`;
                }
                if (this.offsetCount !== null && this.offsetCount !== undefined) {
                    sql += ` OFFSET ${Number(this.offsetCount)}`;
                }
                const rows = await neonSql.query(sql, params);
                if (this.isSingle) {
                    return { data: rows[0] || null, error: null };
                }
                return { data: rows, error: null };
            }

            if (this.action === 'insert' || this.action === 'upsert') {
                const rows = this.payload || [];
                if (rows.length === 0) return { data: [], error: null };

                const allCols = Object.keys(rows[0]).filter((c) => VALID_IDENT.test(c));
                const colList = allCols.map(quoteIdent).join(', ');
                const pk = this.upsertOpts?.onConflict || TABLE_PRIMARY_KEYS[this.table] || 'id';

                // Execute in batches of 50 rows for fast serverless HTTP roundtrips
                const batchSize = 50;
                const inserted = [];
                for (let i = 0; i < rows.length; i += batchSize) {
                    const batch = rows.slice(i, i + batchSize);
                    const params = [];
                    const valueGroups = batch.map((row) => {
                        const placeholders = allCols.map((col) => {
                            params.push(serializeValue(col, row[col]));
                            const idx = params.length;
                            return JSONB_COLUMNS.has(col) ? `$${idx}::jsonb` : `$${idx}`;
                        });
                        return `(${placeholders.join(', ')})`;
                    });

                    let sql = `INSERT INTO ${tableIdent} (${colList}) VALUES ${valueGroups.join(', ')}`;
                    if (this.action === 'upsert' && pk && VALID_IDENT.test(pk)) {
                        const updateCols = allCols.filter((c) => c !== pk);
                        if (updateCols.length > 0) {
                            const updateSet = updateCols
                                .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
                                .join(', ');
                            sql += ` ON CONFLICT (${quoteIdent(pk)}) DO UPDATE SET ${updateSet}`;
                        } else {
                            sql += ` ON CONFLICT (${quoteIdent(pk)}) DO NOTHING`;
                        }
                    }
                    sql += ' RETURNING *';
                    const res = await neonSql.query(sql, params);
                    inserted.push(...res);
                }

                return { data: this.isSingle ? inserted[0] || null : inserted, error: null };
            }

            if (this.action === 'update') {
                const row = this.payload || {};
                const cols = Object.keys(row).filter((c) => VALID_IDENT.test(c));
                if (cols.length === 0) return { data: [], error: null };
                const params = [];
                const setClauses = cols.map((col) => {
                    params.push(serializeValue(col, row[col]));
                    const idx = params.length;
                    return `${quoteIdent(col)} = ${JSONB_COLUMNS.has(col) ? `$${idx}::jsonb` : `$${idx}`}`;
                });
                let sql = `UPDATE ${tableIdent} SET ${setClauses.join(', ')}`;
                sql += this._buildWhere(params);
                sql += ' RETURNING *';
                const res = await neonSql.query(sql, params);
                return { data: this.isSingle ? res[0] || null : res, error: null };
            }

            if (this.action === 'delete') {
                const params = [];
                let sql = `DELETE FROM ${tableIdent}`;
                sql += this._buildWhere(params);
                const res = await neonSql.query(sql, params);
                return { data: res, error: null };
            }

            return { data: null, error: null };
        } catch (err) {
            console.warn(`[NeonDB Query Warning on ${this.table}]:`, err.message);
            return { data: null, error: err };
        }
    }

    then(resolve, reject) {
        return this.execute().then(resolve, reject);
    }
}

export const neonAdapter = {
    from(table) {
        return new NeonQueryBuilder(table);
    },
    storage: {
        from() {
            return {
                upload: async () => ({ data: { path: '' }, error: null }),
                getPublicUrl: () => ({ data: { publicUrl: '/logo.png' } })
            };
        }
    }
};
