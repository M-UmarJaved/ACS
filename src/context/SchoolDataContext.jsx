import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { CLASSES as LOCAL_CLASSES, schoolData as DEFAULT_SCHOOL_DATA } from '../data/schoolData';
import { getBaseClass, cleanDuplicateClasses, dedupeSubjectsList, canonicalSubjectName } from '../admin/utils/gradeUtils';
import { generatePakistaniSchoolDataset } from '../warehouse/seedPakistaniData';
import { buildEnterpriseDataWarehouse } from '../warehouse/dwEngine';
import { computeExecutiveBISummary } from '../warehouse/olapEngine';

// ── Official 2025/2026 Scheme Default Subjects ──
const OFFICIAL_DEFAULT_SUBJECTS = {
    "Playgroup": ["English", "Mathematics", "Urdu", "W. A.U"],
    "PG": ["English", "Mathematics", "Urdu", "W. A.U"],
    "Nursery": ["English", "Mathematics", "Urdu", "W. A.U"],
    "K.G": ["English", "Mathematics", "Urdu", "W. A.U"],
    "1st": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Knowledge", "Computer Science", "Nazar Quran"],
    "2nd": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Knowledge", "Computer Science", "Nazar Quran"],
    "3rd": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Knowledge", "Computer Science", "Nazar Quran"],
    "4th": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Science", "Computer Science", "Social Studies", "Nazar Quran"],
    "5th": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Science", "Computer Science", "Social Studies", "Nazar Quran"],
    "6th": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Science", "Computer Science", "Tarjuma-tul-Quran"],
    "7th": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Science", "Computer Science", "Tarjuma-tul-Quran"],
    "8th": ["English", "Mathematics", "Urdu", "Islamic Studies", "General Science", "Computer Science", "Tarjuma-tul-Quran"],
    "9th": [
        "English", "Urdu", "Islamic Studies", "Tarjuma-tul-Quran",
        "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
        "General Math", "General Science", "Islamic Studies (Elective)", "Education", "Sociology", "Civics", "Economics", "Home Economics", "Fine Arts"
    ],
    "10th": [
        "English", "Urdu", "Pakistan Studies", "Tarjuma-tul-Quran",
        "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
        "General Math", "General Science", "Islamic Studies (Elective)", "Education", "Sociology", "Civics", "Economics", "Home Economics", "Fine Arts"
    ],
    "1st Year": [
        "English", "Urdu", "Islamic Studies", "Tarjuma-tul-Quran",
        "Physics", "Chemistry", "Biology", "Mathematics", "Computer Science",
        "Statistics", "Economics", "Islamic Studies (Elective)", "Education", "Sociology"
    ],
    "2nd Year": [
        "English", "Urdu", "Pakistan Studies", "Tarjuma-tul-Quran",
        "Physics", "Chemistry", "Biology", "Mathematics", "Computer Science",
        "Statistics", "Economics", "Islamic Studies (Elective)", "Education", "Sociology"
    ]
};

// SUBJECTS is now a per-class map: { "className": ["Urdu", "Math", ...] }
const DEFAULT_SUBJECTS = { ...OFFICIAL_DEFAULT_SUBJECTS };
// TERMS is now a per-class map: { "className": ["Term 1", "Term 2", ...] } 
// or an array for legacy support.
const DEFAULT_TERMS = {};
// SUBJECT_TOTALS stored as WEIGHTS key: { subject: totalMarks } e.g. { "Mathematics": 100, "Physics": 85 }
// If a subject has no entry, falls back to DEFAULT_SUBJECT_TOTAL (100).
const DEFAULT_WEIGHTS = {};
const DEFAULT_SUBJECT_TOTAL = 100;
// CLASS_SERIAL_STARTS: { "9A": 200, "Inter 1st": 300 } — starting serial per class
const DEFAULT_CLASS_SERIAL_STARTS = {};
// CLASS_FEE_DEFAULTS: { "1st Year": { tuitionFee: 3000, admissionFee: 1000, ... } }
const DEFAULT_CLASS_FEE_DEFAULTS = {};

const SchoolDataContext = createContext();

export const useSchoolData = () => {
    const context = useContext(SchoolDataContext);
    if (!context) {
        throw new Error('useSchoolData must be used within a SchoolDataProvider');
    }
    return context;
};

export const SchoolDataProvider = ({ children }) => {
    const [data, setData] = useState(DEFAULT_SCHOOL_DATA || {
        name: 'ACS School & College',
        tagline: 'Inspiring Excellence, Empowering Leaders.',
        description: 'A premier educational institution dedicated to academic achievement and holistic development.',
        about: {},
        contact: {},
        statistics: [],
        faculty: [],
        facilities: [],
        students: [],
        announcements: [],
        testimonials: [],
        blogs: [],
        inquiries: []
    });
    const [classes, setClasses] = useState(LOCAL_CLASSES);
    const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS); // { className: [subject,...] }
    const [terms, setTerms] = useState(DEFAULT_TERMS);
    const [sections, setSections] = useState([]);
    const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
    const [exclusions, setExclusions] = useState({}); // { className: { termName: { subject: boolean } } }
    const [classSerialStarts, setClassSerialStarts] = useState(DEFAULT_CLASS_SERIAL_STARTS);
    const [classFeeDefaults, setClassFeeDefaults] = useState(DEFAULT_CLASS_FEE_DEFAULTS);
    const [classGroups, setClassGroups] = useState({}); // { "9th": [groupName,...] }
    const [classTracks, setClassTracks] = useState({}); // { "9th": ["Biology", "Computer"], "1st Year": ["Pre-Medical", "ICS"] }
    const [classSubTracks, setClassSubTracks] = useState({}); // { "ICS": ["Physics","Economics"], "1st Year ICS": ["Physics"] }
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminCredentials, setAdminCredentials] = useState({ username: 'admin', password: 'admin123' });
    const [etlSeedTrigger, setEtlSeedTrigger] = useState(20261017);

    const loadPakistaniDWDataset = (customSeed = 20261017) => {
        const pk = generatePakistaniSchoolDataset(customSeed);
        setData(prev => ({
            ...prev,
            ...pk.schoolInfo,
            faculty: pk.faculty,
            facilities: pk.facilities,
            testimonials: pk.testimonials,
            announcements: pk.announcements,
            blogs: pk.blogs,
            inquiries: pk.inquiries,
            students: pk.students,
            expenses: pk.expenses
        }));
        setClasses(pk.metadata.CLASSES);
        setSections(pk.metadata.SECTIONS);
        setSubjects(pk.metadata.SUBJECTS);
        setTerms(pk.metadata.TERMS);
        setWeights(pk.metadata.WEIGHTS);
        setExclusions(pk.metadata.EXCLUSIONS || {});
        setClassSerialStarts(pk.metadata.CLASS_SERIAL_STARTS);
        setClassFeeDefaults(pk.metadata.CLASS_FEE_DEFAULTS);
        setClassGroups(pk.metadata.CLASS_GROUPS);
        setClassTracks(pk.metadata.CLASS_TRACKS);
        setClassSubTracks(pk.metadata.CLASS_SUBTRACKS);
        setExpenses(pk.metadata.EXPENSES);
        setEtlSeedTrigger(Date.now());
        return pk;
    };

    const fetchAllRows = async (queryFactory) => {
        let allData = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
            const start = page * pageSize;
            const end = start + pageSize - 1;
            const { data, error } = await queryFactory(start, end);
            if (error || !data || data.length === 0) {
                hasMore = false;
            } else {
                allData = allData.concat(data);
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        }
        return allData;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const preferLocalPakistaniDW = localStorage.getItem('acs_dw_mode') !== 'cloud_only';

            if (preferLocalPakistaniDW) {
                loadPakistaniDWDataset(20261017);
                setLoading(false);
                return;
            }

            // Fire ALL queries in parallel with paged fetching for large tables (> 1000 rows)
            const [
                infoRes, facRes, facilRes, testiRes, metaRes, annRes, stuData, feeRecData, feeTxData, blogRes, adminRes, inqData
            ] = await Promise.all([
                supabase.from('school_info').select('*').single(),
                supabase.from('faculty').select('*').order('id'),
                supabase.from('facilities').select('*').order('id'),
                supabase.from('testimonials').select('*'),
                supabase.from('metadata').select('*'),
                supabase.from('announcements').select('*').order('id', { ascending: false }),
                fetchAllRows((start, end) => supabase.from('students').select('id, password, name, grade, image, results, attendance, previous_results, admissions, serial_number, status, Timestamp').order('id', { ascending: true }).range(start, end)),
                fetchAllRows((start, end) => supabase.from('fee_records').select('*').range(start, end)),
                fetchAllRows((start, end) => supabase.from('fee_transactions').select('*').range(start, end)),
                supabase.from('blogs').select('*').order('created_at', { ascending: false }),
                supabase.from('admins').select('*').eq('role', 'admin').limit(1),
                fetchAllRows((start, end) => supabase.from('inquiries').select('*').order('created_at', { ascending: false }).range(start, end))
            ]);

            if (!stuData || stuData.length === 0) {
                // Fallback to Pakistani School DW dataset if cloud DB is empty
                loadPakistaniDWDataset(20261017);
                setLoading(false);
                return;
            }

            const metaMap = {};
            (metaRes.data || []).forEach(r => { metaMap[r.key] = r.value; });

            if (adminRes.data && adminRes.data.length > 0) {
                setAdminCredentials({ username: adminRes.data[0].username, password: adminRes.data[0].password });
            }
            
            // Map Relational Fees to Student Profiles for UI
            const feeMap = {};
            (feeRecData || []).forEach(record => {
                const txs = (feeTxData || []).filter(tx => tx.fee_record_id === record.id).map(tx => ({
                    amount: Number(tx.amount), date: tx.payment_date, note: tx.note
                }));
                if (!feeMap[record.student_id]) feeMap[record.student_id] = [];
                feeMap[record.student_id].push({
                    month: record.month,
                    tuitionFee: Number(record.tuition_fee),
                    labFee: Number(record.lab_fee),
                    examFee: Number(record.exam_fee),
                    admissionFee: Number(record.admission_fee),
                    lateFine: Number(record.late_fine),
                    discount: Number(record.discount),
                    paidAmount: Number(record.paid_amount),
                    status: record.status,
                    paidOn: record.paid_on,
                    transactions: txs
                });
            });

            setData(prev => ({
                ...prev,
                ...(infoRes.data || {}),
                faculty: facRes.data || [],
                facilities: facilRes.data || [],
                testimonials: testiRes.data || [],
                announcements: annRes.data || [],
                blogs: blogRes.data || [],
                inquiries: inqData || [],
                students: (stuData || [])
                    .map(s => {
                        // Normalize and deduplicate student results
                        const rawResults = s.results || [];
                        const resultMap = new Map();
                        rawResults.forEach(r => {
                            if (!r || !r.subject) return;
                            const canonSub = canonicalSubjectName(r.subject);
                            const tName = r.term || 'Current';
                            const key = `${tName.trim().toLowerCase()}__${canonSub.toLowerCase()}`;
                            const existing = resultMap.get(key);
                            if (!existing || (existing.obtained === undefined || existing.obtained === '' || existing.obtained === null)) {
                                resultMap.set(key, { ...r, subject: canonSub, term: tName });
                            }
                        });
                        const cleanResults = Array.from(resultMap.values());

                        // Normalize previous results
                        const rawPrev = s.previous_results || s.previousResults || [];
                        const cleanPrev = rawPrev.map(pr => {
                            const pMap = new Map();
                            (pr.results || []).forEach(r => {
                                if (!r || !r.subject) return;
                                const canonSub = canonicalSubjectName(r.subject);
                                const tName = r.term || pr.term || 'Current';
                                const key = `${tName.trim().toLowerCase()}__${canonSub.toLowerCase()}`;
                                const existing = pMap.get(key);
                                if (!existing || (existing.obtained === undefined || existing.obtained === '' || existing.obtained === null)) {
                                    pMap.set(key, { ...r, subject: canonSub, term: tName });
                                }
                            });
                            return { ...pr, results: Array.from(pMap.values()) };
                        });

                        return {
                            ...s,
                            photo: s.image,
                            fatherName: s.admissions?.[0]?.fatherName || '',
                            gender: s.admissions?.[0]?.gender || '',
                            monthlyFee: s.admissions?.[0]?.monthlyFee || s.monthly_fee || '',
                            feeHistory: feeMap[s.id] || [],
                            results: cleanResults,
                            previous_results: cleanPrev,
                            previousResults: cleanPrev,
                            serialNumber: s.serial_number
                        };
                    })
                    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
            }));

            // Determine classes from database: ALWAYS use live student grades + section classes as source of truth.
            // DB-stored CLASSES is used only to preserve user-defined ordering.
            // IMPORTANT: Normalize ALL grade strings through getBaseClass() to prevent duplicates like
            // "9th Bio" and "9th" both appearing as separate classes (track info lives in student.admissions, not grade).
            const uniqueStudentGrades = Array.from(
                new Set((stuData || []).map(s => getBaseClass(s.grade)).filter(Boolean))
            );
            const definedSectionClasses = Array.from(
                new Set((metaMap['SECTIONS'] || []).flatMap(s => (s.classes || []).map(c => getBaseClass(c)).filter(Boolean)))
            );
            // Union of normalized grades and section-defined classes (no phantom/stale/track-appended entries)
            const liveClassSet = Array.from(new Set([...uniqueStudentGrades, ...definedSectionClasses])).filter(Boolean);

            let resolvedClasses;
            if (metaMap['CLASSES'] && liveClassSet.length > 0) {
                // Normalize DB list too — remove any stale track-appended entries (e.g. "9th Bio")
                const dbListNormalized = Array.from(
                    new Set((metaMap['CLASSES'] || []).map(c => getBaseClass(c)).filter(Boolean))
                );
                // Use DB ordering but ONLY keep entries that exist in liveClassSet
                // Then append any liveClassSet entries not in the DB list (new classes)
                const filtered = dbListNormalized.filter(c => liveClassSet.includes(c));
                const newOnes = liveClassSet.filter(c => !dbListNormalized.includes(c));
                resolvedClasses = [...filtered, ...newOnes];
            } else if (liveClassSet.length > 0) {
                resolvedClasses = liveClassSet;
            } else {
                resolvedClasses = LOCAL_CLASSES;
            }
            // Final safety dedup
            resolvedClasses = Array.from(new Set(resolvedClasses));
            setClasses(resolvedClasses);

            const currentClasses = resolvedClasses;


            // ── Normalization & Recovery of SUBJECTS ──
            const baseOfficial = { ...OFFICIAL_DEFAULT_SUBJECTS };
            if (metaMap['SUBJECTS']) {
                const loaded = metaMap['SUBJECTS'];
                const toCleanStringArray = (v) => {
                    if (!v) return [];
                    if (Array.isArray(v)) {
                        return dedupeSubjectsList(
                            v.flatMap(item => typeof item === 'object' && item !== null ? Object.values(item) : item)
                             .filter(s => typeof s === 'string' && s.trim().length > 0)
                        );
                    }
                    if (typeof v === 'object' && v !== null) {
                        return dedupeSubjectsList(
                            Object.values(v).flatMap(item => typeof item === 'object' && item !== null ? Object.values(item) : item)
                             .filter(s => typeof s === 'string' && s.trim().length > 0)
                        );
                    }
                    if (typeof v === 'string' && v.trim().length > 0) return dedupeSubjectsList([v.trim()]);
                    return [];
                };

                if (Array.isArray(loaded)) {
                    const cleanList = toCleanStringArray(loaded);
                    const legacyMap = {};
                    currentClasses.forEach(c => { legacyMap[c] = cleanList; });
                    setSubjects({ ...baseOfficial, ...legacyMap });
                } else if (typeof loaded === 'object' && loaded !== null) {
                    const normalizedSubjects = { ...baseOfficial };
                    // Merge all variants under their baseClass and deduplicate canonical names
                    Object.entries(loaded).forEach(([key, val]) => {
                        const base = getBaseClass(key) || key;
                        const items = toCleanStringArray(val);
                        if (!normalizedSubjects[base]) normalizedSubjects[base] = [];
                        normalizedSubjects[base] = dedupeSubjectsList([...normalizedSubjects[base], ...items]);
                        if (key !== base) {
                            normalizedSubjects[key] = dedupeSubjectsList([...(normalizedSubjects[key] || []), ...items]);
                        }
                    });
                    // Fallback for currentClasses from their baseClass
                    currentClasses.forEach(c => {
                        const base = getBaseClass(c) || c;
                        if (!normalizedSubjects[c] && normalizedSubjects[base]) {
                            normalizedSubjects[c] = [...normalizedSubjects[base]];
                        }
                    });

                    // Strict Subject Sanity for Intermediate: Civics removed, Sociology guaranteed
                    Object.keys(normalizedSubjects).forEach(clsKey => {
                        const base = getBaseClass(clsKey);
                        if (base === '1st Year' || base === '2nd Year') {
                            const filtered = normalizedSubjects[clsKey].filter(s => canonicalSubjectName(s) !== 'Civics');
                            if (!filtered.some(s => canonicalSubjectName(s) === 'Sociology')) {
                                filtered.push('Sociology');
                            }
                            normalizedSubjects[clsKey] = dedupeSubjectsList(filtered);
                        }
                    });

                    setSubjects(normalizedSubjects);
                }
            } else {
                setSubjects(baseOfficial);
            }

            // ── Normalization & Recovery of TERMS (Prevents disappearing terms) ──
            if (metaMap['TERMS'] || (stuData && stuData.length > 0)) {
                const loadedTerms = metaMap['TERMS'] || {};
                const toCleanStringArray = (v) => {
                    if (!v) return [];
                    if (Array.isArray(v)) {
                        return v.flatMap(item => typeof item === 'object' && item !== null ? Object.values(item) : item)
                                .filter(s => typeof s === 'string' && s.trim().length > 0);
                    }
                    if (typeof v === 'object' && v !== null) {
                        return Object.values(v).flatMap(item => typeof item === 'object' && item !== null ? Object.values(item) : item)
                                .filter(s => typeof s === 'string' && s.trim().length > 0);
                    }
                    if (typeof v === 'string' && v.trim().length > 0) return [v.trim()];
                    return [];
                };

                const normalizedTerms = {};
                if (Array.isArray(loadedTerms)) {
                    const cleanList = toCleanStringArray(loadedTerms);
                    currentClasses.forEach(c => { normalizedTerms[c] = cleanList; });
                } else if (typeof loadedTerms === 'object' && loadedTerms !== null) {
                    // Merge all sub-variants (e.g. "9th Bio", "9th Computer", "9th") under baseClass ("9th")
                    Object.entries(loadedTerms).forEach(([key, val]) => {
                        const base = getBaseClass(key) || key;
                        const items = toCleanStringArray(val);
                        if (!normalizedTerms[base]) normalizedTerms[base] = [];
                        normalizedTerms[base] = Array.from(new Set([...normalizedTerms[base], ...items]));
                        if (key !== base) {
                            normalizedTerms[key] = Array.from(new Set([...(normalizedTerms[key] || []), ...items]));
                        }
                    });
                }

                // AUTO-RECOVER TERMS from student results:
                // If a term was ever used in student results (e.g. "Second Term", "Test 6")
                // but was omitted or lost from metadata, recover it automatically!
                (stuData || []).forEach(s => {
                    const base = getBaseClass(s.grade);
                    if (!base) return;
                    const stuTerms = new Set();
                    (s.results || []).forEach(r => { if (r.term && typeof r.term === 'string') stuTerms.add(r.term.trim()); });
                    (s.previous_results || s.previousResults || []).forEach(pr => { if (pr.term && typeof pr.term === 'string') stuTerms.add(pr.term.trim()); });
                    if (stuTerms.size > 0) {
                        if (!normalizedTerms[base]) normalizedTerms[base] = [];
                        normalizedTerms[base] = Array.from(new Set([...normalizedTerms[base], ...stuTerms]));
                        if (s.grade && s.grade !== base) {
                            if (!normalizedTerms[s.grade]) normalizedTerms[s.grade] = [];
                            normalizedTerms[s.grade] = Array.from(new Set([...normalizedTerms[s.grade], ...stuTerms]));
                        }
                    }
                });

                // Ensure every class in currentClasses has an entry
                currentClasses.forEach(c => {
                    const base = getBaseClass(c) || c;
                    if (!normalizedTerms[c] && normalizedTerms[base]) {
                        normalizedTerms[c] = [...normalizedTerms[base]];
                    }
                });

                setTerms(normalizedTerms);
            }

            if (metaMap['SECTIONS']) {
                const { cleanedSections } = cleanDuplicateClasses(metaMap['SECTIONS']);
                setSections(cleanedSections);
            }

            if (metaMap['WEIGHTS']) {
                const loadedWeights = metaMap['WEIGHTS'];
                if (typeof loadedWeights === 'object' && loadedWeights !== null) {
                    const normalizedWeights = { ...loadedWeights };
                    Object.entries(loadedWeights).forEach(([key, val]) => {
                        const base = getBaseClass(key);
                        if (base && base !== key && !normalizedWeights[base]) {
                            normalizedWeights[base] = val;
                        }
                    });
                    setWeights(normalizedWeights);
                } else {
                    setWeights(loadedWeights);
                }
            }

            if (metaMap['EXCLUSIONS']) {
                const loadedExcl = metaMap['EXCLUSIONS'];
                if (typeof loadedExcl === 'object' && loadedExcl !== null) {
                    const normalizedExcl = { ...loadedExcl };
                    Object.entries(loadedExcl).forEach(([key, val]) => {
                        const base = getBaseClass(key);
                        if (base && base !== key && !normalizedExcl[base]) {
                            normalizedExcl[base] = val;
                        }
                    });
                    setExclusions(normalizedExcl);
                } else {
                    setExclusions(loadedExcl);
                }
            }
            if (metaMap['CLASS_SERIAL_STARTS']) setClassSerialStarts(metaMap['CLASS_SERIAL_STARTS']);
            if (metaMap['CLASS_FEE_DEFAULTS']) setClassFeeDefaults(metaMap['CLASS_FEE_DEFAULTS']);
            const defaultTracks = {
                "9th": ["Biology", "Computer", "Computer Arts", "Arts"],
                "10th": ["Biology", "Computer", "Computer Arts", "Arts"],
                "1st Year": ["Pre-Medical", "Pre-Engineering", "ICS", "Humanities"],
                "2nd Year": ["Pre-Medical", "Pre-Engineering", "ICS", "Humanities"]
            };
            const defaultSubTracks = {
                "9th Arts": ["Simple Arts", "Computer Arts"],
                "10th Arts": ["Simple Arts", "Computer Arts"],
                "1st Year ICS": ["Physics", "Economics", "Statistics"],
                "2nd Year ICS": ["Physics", "Economics", "Statistics"],
                "1st Year Humanities": ["FAIT", "FA"],
                "2nd Year Humanities": ["FAIT", "FA"]
            };
            setClassTracks({ ...defaultTracks, ...(metaMap['CLASS_TRACKS'] || {}) });
            setClassSubTracks({ ...defaultSubTracks, ...(metaMap['CLASS_SUBTRACKS'] || {}) });
            if (metaMap['EXPENSES']) setExpenses(metaMap['EXPENSES']);

        } catch (error) {
            console.error('Error fetching data, activating Pakistani DW dataset fallback:', error);
            loadPakistaniDWDataset(20261017);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Live Data Warehouse & BI OLAP Summary (recomputes automatically when operational data changes)
    const dataWarehouse = useMemo(() => {
        return buildEnterpriseDataWarehouse({
            schoolData: data,
            SECTIONS: sections,
            CLASSES: classes,
            SUBJECTS: subjects,
            CLASS_FEE_DEFAULTS: classFeeDefaults,
            EXPENSES: expenses
        });
    }, [data, sections, classes, subjects, classFeeDefaults, expenses, etlSeedTrigger]);

    const biSummary = useMemo(() => {
        return computeExecutiveBISummary(dataWarehouse);
    }, [dataWarehouse]);

    const runWarehouseETL = () => {
        setEtlSeedTrigger(Date.now());
        return dataWarehouse;
    };

    // Database Update Wrappers
    const updateSchoolInfo = async (updates) => {
        setData(prev => ({ ...prev, ...updates }));
        try { await supabase.from('school_info').update(updates).eq('id', 'info'); } catch {}
    };

    const setFaculty = async (facultyList) => {
        setData(prev => ({ ...prev, faculty: facultyList }));
        try { await supabase.from('faculty').upsert(facultyList); } catch {}
    };

    const setFacilities = async (facilitiesList) => {
        setData(prev => ({ ...prev, facilities: facilitiesList }));
        try { await supabase.from('facilities').upsert(facilitiesList); } catch {}
    };

    const setStudents = async (studentsList) => {
        // Optimistic update — reflect in UI & Data Warehouse immediately
        setData(prev => ({ ...prev, students: studentsList }));
        if (localStorage.getItem('acs_dw_mode') !== 'cloud_only') {
            return { error: null };
        }

        const oldStudentsMap = new Map((data.students || []).map(s => [s.id, s]));
        const serialPatches = [];   // Only serial_number changed → use targeted UPDATE
        const fullUpserts = [];     // Other fields changed → use full upsert

        for (const s of studentsList) {
            const old = oldStudentsMap.get(s.id);
            const newSerial = s.serialNumber !== undefined ? s.serialNumber : s.serial_number;

            if (!old) {
                fullUpserts.push(s);
                continue;
            }

            const oldSerial = old.serialNumber !== undefined ? old.serialNumber : old.serial_number;
            const serialChanged = String(newSerial ?? '') !== String(oldSerial ?? '');

            const stripSerial = (obj) => {
                const c = { ...obj };
                delete c.serialNumber;
                delete c.serial_number;
                return c;
            };
            const otherChanged = JSON.stringify(stripSerial(old)) !== JSON.stringify(stripSerial(s));

            if (otherChanged) {
                fullUpserts.push(s);
            } else if (serialChanged) {
                serialPatches.push({ id: s.id, serial_number: newSerial });
            }
        }

        let lastError = null;

        for (const { id, serial_number } of serialPatches) {
            const { error } = await supabase
                .from('students')
                .update({ serial_number })
                .eq('id', id);
            if (error) {
                console.error('Serial patch failed for', id, error);
                lastError = error;
            }
        }

        const chunkSize = 50;
        for (let i = 0; i < fullUpserts.length; i += chunkSize) {
            const chunk = fullUpserts.slice(i, i + chunkSize).map(s => ({
                id: s.id,
                serial_number: s.serialNumber !== undefined ? s.serialNumber : s.serial_number,
                password: s.password,
                name: s.name,
                grade: s.grade,
                status: s.status || 'active',
                image: s.image !== undefined ? s.image : s.photo,
                fee_history: s.fee_history !== undefined ? s.fee_history : (s.feeHistory || []),
                results: s.results || [],
                attendance: s.attendance !== undefined ? s.attendance : {},
                previous_results: s.previousResults !== undefined ? s.previousResults : (s.previous_results || []),
                admissions: s.admissions || []
            }));
            const { error } = await supabase.from('students').upsert(chunk);
            if (error) {
                console.error('Full upsert chunk failed:', error);
                lastError = error;
            }
        }

        return { error: lastError };
    };

    const deleteStudent = async (id) => {
        setData(prev => ({ ...prev, students: prev.students.filter(s => s.id !== id) }));
        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
            return { error };
        } catch {
            return { error: null };
        }
    };

    const setAnnouncements = async (announcementsList) => {
        setData(prev => ({ ...prev, announcements: announcementsList }));
        try { await supabase.from('announcements').upsert(announcementsList); } catch {}
    };

    const setBlogs = async (blogsList) => {
        setData(prev => ({ ...prev, blogs: blogsList }));
        try { await supabase.from('blogs').upsert(blogsList); } catch {}
    };

    const setInquiries = async (inquiriesList) => {
        setData(prev => ({ ...prev, inquiries: inquiriesList }));
        try {
            const { error } = await supabase.from('inquiries').upsert(inquiriesList);
            return { error };
        } catch {
            return { error: null };
        }
    };

    const deleteInquiry = async (id) => {
        setData(prev => ({ ...prev, inquiries: prev.inquiries.filter(i => i.id !== id) }));
        try {
            const { error } = await supabase.from('inquiries').delete().eq('id', id);
            return { error };
        } catch {
            return { error: null };
        }
    };

    const updateClasses = async (newClassesList) => {
        setClasses(newClassesList);
        try { await supabase.from('metadata').upsert({ key: 'CLASSES', value: newClassesList }); } catch {}
    };

    const updateSubjects = async (newSubjectsMap) => {
        const cleanedMap = {};
        Object.entries(newSubjectsMap || {}).forEach(([cls, list]) => {
            cleanedMap[cls] = dedupeSubjectsList(list);
        });
        setSubjects(cleanedMap);
        try { await supabase.from('metadata').upsert({ key: 'SUBJECTS', value: cleanedMap }); } catch {}
    };

    const updateTerms = async (newTermsMap) => {
        setTerms(newTermsMap);
        try { await supabase.from('metadata').upsert({ key: 'TERMS', value: newTermsMap }); } catch {}
    };

    const updateSections = async (newSectionsList) => {
        const { cleanedSections } = cleanDuplicateClasses(newSectionsList || []);
        setSections(cleanedSections);
        try {
            const { error } = await supabase.from('metadata').upsert({ key: 'SECTIONS', value: cleanedSections });
            return { error };
        } catch {
            return { error: null };
        }
    };

    const updateWeights = async (newWeights) => {
        setWeights(newWeights);
        try { await supabase.from('metadata').upsert({ key: 'WEIGHTS', value: newWeights }); } catch {}
    };

    const updateExclusions = async (newExclusions) => {
        setExclusions(newExclusions);
        try { await supabase.from('metadata').upsert({ key: 'EXCLUSIONS', value: newExclusions }); } catch {}
    };

    const updateClassSerialStarts = async (newMap) => {
        setClassSerialStarts(newMap);
        try {
            const { error } = await supabase.from('metadata').upsert({ key: 'CLASS_SERIAL_STARTS', value: newMap });
            return { error };
        } catch {
            return { error: null };
        }
    };

    const updateClassFeeDefaults = async (newMap) => {
        setClassFeeDefaults(newMap);
        try {
            const { error } = await supabase.from('metadata').upsert({ key: 'CLASS_FEE_DEFAULTS', value: newMap });
            return { error };
        } catch {
            return { error: null };
        }
    };

    const updateClassGroups = async (newMap) => {
        setClassGroups(newMap);
        try {
            const { error } = await supabase.from('metadata').upsert({ key: 'CLASS_GROUPS', value: newMap });
            return { error };
        } catch {
            return { error: null };
        }
    };

    const updateExpenses = async (newList) => {
        setExpenses(newList);
        try {
            const { error } = await supabase.from('metadata').upsert({ key: 'EXPENSES', value: newList });
            return { error };
        } catch {
            return { error: null };
        }
    };

    const changeAdminPassword = async (newUsername, newPassword) => {
        setAdminCredentials({ username: newUsername, password: newPassword });
        try {
            const { error } = await supabase
                .from('admins')
                .update({ username: newUsername, password: newPassword })
                .eq('role', 'admin');
            return { error };
        } catch {
            return { error: null };
        }
    };

    const updateClassTracks = async (newMap) => {
        setClassTracks(newMap);
        try {
            const { error } = await supabase.from('metadata').upsert({ key: 'CLASS_TRACKS', value: newMap });
            return { error };
        } catch {
            return { error: null };
        }
    };

    const updateClassSubTracks = async (newMap) => {
        setClassSubTracks(newMap);
        try {
            const { error } = await supabase.from('metadata').upsert({ key: 'CLASS_SUBTRACKS', value: newMap });
            return { error };
        } catch {
            return { error: null };
        }
    };

    return (
        <SchoolDataContext.Provider value={{
            schoolData: data,
            CLASSES: classes,
            SUBJECTS: subjects,
            TERMS: terms,
            SECTIONS: sections,
            WEIGHTS: weights,
            EXCLUSIONS: exclusions,
            CLASS_SERIAL_STARTS: classSerialStarts,
            CLASS_FEE_DEFAULTS: classFeeDefaults,
            CLASS_GROUPS: classGroups,
            CLASS_TRACKS: classTracks,
            CLASS_SUBTRACKS: classSubTracks,
            EXPENSES: expenses,
            adminCredentials,
            loading,
            dataWarehouse,
            biSummary,
            loadPakistaniDWDataset,
            runWarehouseETL,
            fetchData,
            updateSchoolInfo,
            setFaculty,
            setFacilities,
            setStudents,
            deleteStudent,
            setAnnouncements,
            setBlogs,
            setInquiries,
            deleteInquiry,
            updateClasses,
            updateSubjects,
            updateTerms,
            updateSections,
            updateWeights,
            updateExclusions,
            updateClassSerialStarts,
            updateClassFeeDefaults,
            updateClassGroups,
            updateClassTracks,
            updateClassSubTracks,
            updateExpenses,
            changeAdminPassword
        }}>
            {children}
        </SchoolDataContext.Provider>
    );
};

