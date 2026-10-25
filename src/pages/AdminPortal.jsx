import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import {
    Users, Award, Calendar, DollarSign, LogOut,
    Save, CheckCircle, XCircle, Edit3, User,
    Download, Upload, FileText, Search, Camera,
    BellPlus, Trash2, Megaphone, PlusCircle, Lock,
    Building, School, Check, X, ChevronRight, Layout,
    GripVertical, ChevronUp, ChevronDown, Menu, TrendingDown,
    AlertTriangle, Info, Database, BarChart3, Bot, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSchoolData } from '../context/SchoolDataContext';
import { supabase } from '../supabaseClient';
import { getBaseClass, filterStudentsByHierarchy, canonicalSubjectName, dedupeSubjectsList, getStudentFullClassLabel, getTrackSubjects, getStudentCardAcademicDetails, normalizeTrackName, filterForbiddenSubjects, getStudentTrack } from '../admin/utils/gradeUtils';

// ── Tab Components (Directly imported for instant 0ms tab switching) ──
import GradebookTab from '../admin/tabs/GradebookTab';
import AttendanceTab from '../admin/tabs/AttendanceTab';
import FeeTab from '../admin/tabs/FeeTab';
import AdmissionsTab from '../admin/tabs/AdmissionsTab';
import ReportsTab from '../admin/tabs/ReportsTab';
import AnnouncementsTab from '../admin/tabs/AnnouncementsTab';
import FacultyTab from '../admin/tabs/FacultyTab';
import FacilitiesTab from '../admin/tabs/FacilitiesTab';
import BlogTab from '../admin/tabs/BlogTab';
import ClassListsTab from '../admin/tabs/ClassListsTab';
import ExpensesTab from '../admin/tabs/ExpensesTab';
import StudentEditModal from '../admin/modals/StudentEditModal';
import AcademicSettingsTab from '../admin/tabs/AcademicSettingsTab';
import WarehouseTab from '../admin/tabs/WarehouseTab';
import BIAnalyticsTab from '../admin/tabs/BIAnalyticsTab';
import AIAgentTab from '../admin/tabs/AIAgentTab';

const AdminPortal = ({ setIsAdmin, setCurrentPage }) => {
    const {
        schoolData, CLASSES, SUBJECTS, TERMS, SECTIONS, WEIGHTS, EXCLUSIONS,
        CLASS_SERIAL_STARTS, CLASS_FEE_DEFAULTS, CLASS_GROUPS, CLASS_TRACKS, CLASS_SUBTRACKS, EXPENSES,
        fetchData, setStudents, setFaculty, updateSchoolInfo, setAnnouncements,
        updateClasses, updateSubjects, updateTerms, updateSections,
        updateWeights, updateExclusions, updateClassSerialStarts,
        updateClassFeeDefaults, updateClassGroups, updateClassTracks, updateClassSubTracks, updateExpenses, adminCredentials, changeAdminPassword,
        setInquiries, deleteInquiry, deleteStudent,
        dataWarehouse, biSummary, loadPakistaniDWDataset, runWarehouseETL, showToast
    } = useSchoolData();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [saveMessage, setSaveMessage] = useState('');
    const sectionClasses = CLASSES || [];
    const [selectedClass, setSelectedClass] = useState(sectionClasses[0] || '');
    // Per-class subjects: SUBJECTS is { className: [subject,...] } with baseClass fallback
    const classSubjects = dedupeSubjectsList(SUBJECTS && !Array.isArray(SUBJECTS)
        ? (SUBJECTS[selectedClass] || SUBJECTS[getBaseClass(selectedClass)] || [])
        : (Array.isArray(SUBJECTS) ? SUBJECTS : []));
    const updateClassSubjects = (newList) => {
        const base = getBaseClass(selectedClass) || selectedClass;
        const current = typeof SUBJECTS === 'object' && !Array.isArray(SUBJECTS) ? SUBJECTS : {};
        const cleaned = dedupeSubjectsList(newList);
        updateSubjects({ ...current, [base]: cleaned, ...(selectedClass && selectedClass !== base ? { [selectedClass]: cleaned } : {}) });
    };

    // Per-class terms: TERMS is { className: [term,...] } with baseClass fallback
    const classTerms = (TERMS && !Array.isArray(TERMS)
        ? (TERMS[selectedClass] || TERMS[getBaseClass(selectedClass)] || [])
        : (Array.isArray(TERMS) ? TERMS : []));
    const updateClassTerms = (newList) => {
        const base = getBaseClass(selectedClass) || selectedClass;
        const current = typeof TERMS === 'object' && !Array.isArray(TERMS) ? TERMS : {};
        updateTerms({ ...current, [base]: newList, ...(selectedClass && selectedClass !== base ? { [selectedClass]: newList } : {}) });
    };
    const [reportSearch, setReportSearch] = useState('');
    const [selectedReportClasses, setSelectedReportClasses] = useState([]);
    const [selectedAttendanceClasses, setSelectedAttendanceClasses] = useState([]);
    const [reportTerm, setReportTerm] = useState('All Terms');
    const [reportGender, setReportGender] = useState('all');
    const [reportStatus, setReportStatus] = useState('active');

    // Marks editing state
    const [tempMarks, setTempMarks] = useState([]);
    const [editingMarks, setEditingMarks] = useState(false);
    const [assessmentName, setAssessmentName] = useState('');

    // Removed auto-selection of first class as per user request to have no class selected as default.
    useEffect(() => {
        // We keep this empty or remove it if not needed for other logic.
    }, [sectionClasses]);

    // ── Rename a subject for the current class and update all student results ──
    const renameSubject = async (oldName, newName) => {
        if (!oldName || !newName || oldName === newName) return;
        const baseClass = getBaseClass(selectedClass) || selectedClass;
        // Update subjects map
        const newSubjects = {
            ...SUBJECTS,
            [baseClass]: (SUBJECTS[baseClass] || SUBJECTS[selectedClass] || []).map(s => s === oldName ? newName : s),
            ...(selectedClass !== baseClass ? { [selectedClass]: (SUBJECTS[selectedClass] || []).map(s => s === oldName ? newName : s) } : {})
        };
        await updateSubjects(newSubjects);
        // Update student results for that class
        const updatedStudents = (schoolData.students || []).map(s => {
            if (getBaseClass(s.grade) !== baseClass) return s;
            const newResults = (s.results || []).map(r => r.subject === oldName ? { ...r, subject: newName } : r);
            const newPrev = (s.previousResults || []).map(term => ({ ...term, results: term.results.map(r => r.subject === oldName ? { ...r, subject: newName } : r) }));
            return { ...s, results: newResults, previousResults: newPrev };
        });
        await setStudents(updatedStudents);
        showSaveMessage(`Subject renamed: "${oldName}" → "${newName}"`);
    };

    // ── Add a subject to multiple classes at once ──
    const updateSubjectsForClasses = async (subjectName, targetClasses) => {
        if (!subjectName || !targetClasses || targetClasses.length === 0) return;
        const newSubjects = { ...(SUBJECTS || {}) };
        targetClasses.forEach(cls => {
            const existing = newSubjects[cls] || [];
            if (!existing.includes(subjectName)) newSubjects[cls] = [...existing, subjectName];
        });
        await updateSubjects(newSubjects);
        showSaveMessage(`"${subjectName}" added to ${targetClasses.length} class(es)!`);
    };

    // ── One-time migration: convert old global WEIGHTS to class-scoped format ──
    // Old: WEIGHTS["Test 6"] = { "Physics": 85 }            (shared across all classes — BUG)
    // New: WEIGHTS["Free Medical"]["Test 6"]["Physics"] = 85 (isolated per class)
    const migrateWeightsToClassScoped = async () => {
        if (!WEIGHTS) { showSaveMessage('No weights data to migrate.'); return; }

        const allClasses = sectionClasses; // all classes in the school
        const newW = { ...WEIGHTS };

        let migrated = 0;
        // Identify "old global term keys": top-level keys whose value is { subject: number }
        // and whose key is NOT a class name (class names are in sectionClasses)
        Object.entries(WEIGHTS).forEach(([key, val]) => {
            // Skip if it's already a class-scoped key
            if (allClasses.includes(key)) return;
            // Skip if value is not an object (e.g. flat subject→number legacy)
            if (typeof val !== 'object' || val === null || Array.isArray(val)) return;
            // It looks like a term-level entry: { subject: marks }
            const isTermEntry = Object.values(val).every(v => typeof v === 'number' || v === '');
            if (!isTermEntry) return;

            // Copy into every class that doesn't already have a class-scoped entry for this term
            allClasses.forEach(cls => {
                if (!newW[cls]) newW[cls] = {};
                // Only copy if this class doesn't already have class-scoped data for this term
                if (!newW[cls][key] || typeof newW[cls][key] !== 'object') {
                    newW[cls][key] = { ...val };
                    migrated++;
                }
            });
        });

        if (migrated === 0) {
            showSaveMessage('✅ Already up-to-date — no migration needed!');
            return;
        }

        await updateWeights(newW);
        showSaveMessage(`✅ Migrated ${migrated} term-weight entries to class-scoped format!`);
    };

    // ── Gradebook State ──
    // ── Class Management State ──
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [viewingClass, setViewingClass] = useState(null);
    const [classDetailTab, setClassDetailTab] = useState('all');
    const [newSectionName, setNewSectionName] = useState('');

    // ── Confirm Modal State ──
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, danger: true });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const openConfirm = (title, message, onConfirm, danger = true) => setConfirmModal({ open: true, title, message, onConfirm, danger });
    const closeConfirm = () => setConfirmModal({ open: false, title: '', message: '', onConfirm: null, danger: true });

    // ── Change Admin Password State ──
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [newAdminUser, setNewAdminUser] = useState('');
    const [newAdminPwd, setNewAdminPwd] = useState('');
    const [newAdminPwdConfirm, setNewAdminPwdConfirm] = useState('');

    // ── Attendance date filter ──
    const [attDateFilter, setAttDateFilter] = useState('');

    // Initialize selected section
    useEffect(() => {
        if (!selectedSectionId && SECTIONS && SECTIONS.length > 0) {
            setSelectedSectionId(SECTIONS[0].id);
        }
    }, [SECTIONS, selectedSectionId]);

    // ── Gradebook State ──
    const [gbTerm, setGbTerm] = useState('');
    useEffect(() => {
        // Reset term selection when class changes to show folder view
        setGbTerm('');
    }, [selectedClass]);
    const [gbGenderTab, setGbGenderTab] = useState('boys'); // 'boys', 'girls', 'all'
    const [gbEdits, setGbEdits] = useState({});       // { studentId: { subject: obtained } }
    const [gbSaving, setGbSaving] = useState(false);
    const [showGbStats, setShowGbStats] = useState(true);
    const [newSubjectInput, setNewSubjectInput] = useState('');
    const [newTermInput, setNewTermInput] = useState('');
    const [showGbSettings, setShowGbSettings] = useState(false);

    const getSubjectTotal = (sub, term) => {
        const t = term || gbTerm || classTerms[0] || 'Current';
        // Helper: find a value in an object by key, with case-insensitive + canonical fallback
        const findInMap = (map, key) => {
            if (!map || typeof map !== 'object') return undefined;
            if (map[key] !== undefined && map[key] !== '') return Number(map[key]);
            const canonKey = canonicalSubjectName(key).toLowerCase();
            for (const [k, v] of Object.entries(map)) {
                if (v === '' || v === undefined || v === null) continue;
                if (canonicalSubjectName(k).toLowerCase() === canonKey) return Number(v);
            }
            return undefined;
        };
        if (WEIGHTS) {
            // Class-scoped lookup: WEIGHTS[selectedClass][term][sub]
            const classW = WEIGHTS[selectedClass];
            if (classW && classW[t] && typeof classW[t] === 'object') {
                const val = findInMap(classW[t], sub);
                if (val !== undefined) return val;
            }
            // Fallback: legacy flat class-scoped: WEIGHTS[selectedClass][sub]
            if (classW && typeof classW[sub] === 'number') return Number(classW[sub]);
            // Legacy global (pre-fix data): WEIGHTS[term][sub]
            if (WEIGHTS[t] && typeof WEIGHTS[t] === 'object') {
                const val = findInMap(WEIGHTS[t], sub);
                if (val !== undefined) return val;
            }
            if (typeof WEIGHTS[sub] === 'number') return Number(WEIGHTS[sub]);
        }
        return 100;
    };

    const isExcluded = (sub, term) => {
        const t = term || gbTerm || classTerms[0] || 'Current';
        if (!selectedClass || !EXCLUSIONS) return false;
        return !!(EXCLUSIONS[selectedClass]?.[t]?.[sub]);
    };

    const getSubjectTotalForClass = (className, sub, term) => {
        const t = term || 'Current';
        const baseClass = getBaseClass(className) || className;
        // Helper: find a value in an object by key, with case-insensitive + canonical fallback
        const findInMap = (map, key) => {
            if (!map || typeof map !== 'object') return undefined;
            // 1. Exact match
            if (map[key] !== undefined && map[key] !== '') return Number(map[key]);
            // 2. Case-insensitive + canonical match
            const canonKey = canonicalSubjectName(key).toLowerCase();
            for (const [k, v] of Object.entries(map)) {
                if (v === '' || v === undefined || v === null) continue;
                if (canonicalSubjectName(k).toLowerCase() === canonKey) return Number(v);
            }
            return undefined;
        };
        if (WEIGHTS) {
            // Try className first, then baseClass
            for (const cls of [className, baseClass]) {
                const classW = WEIGHTS[cls];
                if (!classW) continue;
                // Class-scoped lookup: WEIGHTS[cls][term][sub]
                if (classW[t] && typeof classW[t] === 'object') {
                    const val = findInMap(classW[t], sub);
                    if (val !== undefined) return val;
                }
                // Legacy flat class-scoped: WEIGHTS[cls][sub]
                if (typeof classW[sub] === 'number') return Number(classW[sub]);
            }
            // Legacy global: WEIGHTS[term][sub]
            if (WEIGHTS[t] && typeof WEIGHTS[t] === 'object') {
                const val = findInMap(WEIGHTS[t], sub);
                if (val !== undefined) return val;
            }
            if (typeof WEIGHTS[sub] === 'number') return Number(WEIGHTS[sub]);
        }
        return 100;
    };

    const isExcludedForClass = (className, sub, term) => {
        const t = term || 'Current';
        const baseClass = getBaseClass(className) || className;
        if (!className || !EXCLUSIONS) return false;
        return !!(EXCLUSIONS[className]?.[t]?.[sub] || EXCLUSIONS[baseClass]?.[t]?.[sub]);
    };

    // ── Overall Percentage Calculation ──
    // Uses per-subject totals from WEIGHTS: sum(obtained) / sum(totals) × 100
    // Falls back to 100 per subject if not configured.
    const calcOverallPct = (results) => {
        if (!results || results.length === 0) return 0;
        let totalObtained = 0, totalMax = 0;
        results.forEach(r => {
            if (isExcluded(r.subject, r.term)) return;
            const subTotal = getSubjectTotal(r.subject, r.term);
            let obtained = r.obtained;
            if (obtained === undefined) obtained = Math.round((r.percentage / 100) * subTotal);
            const numObtained = obtained === 'A' ? 0 : Number(obtained);

            totalObtained += numObtained;
            totalMax += subTotal;
        });
        return totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    };

    // Alias for backward compat in export functions
    const calcWeightedAvg = calcOverallPct;

    // ── Grade Calculation (Pakistani Scale) ──
    const calcGrade = (pct) => {
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B+';
        if (pct >= 60) return 'B';
        if (pct >= 50) return 'C';
        if (pct >= 40) return 'D';
        return 'F';
    };

    const gradeColor = (pct) => {
        if (pct >= 80) return { bg: '#dcfce7', text: '#15803d' };
        if (pct >= 60) return { bg: '#dbeafe', text: '#1d4ed8' };
        if (pct >= 50) return { bg: '#fef9c3', text: '#a16207' };
        if (pct >= 40) return { bg: '#ffedd5', text: '#c2410c' };
        return { bg: '#fee2e2', text: '#dc2626' };
    };

    // Helper: get results for a specific term from a student's results array
    const getTermResults = (student, termLabel) => {
        return (student.results || []).filter(r => r.term === termLabel);
    };

    // Get the obtained value for a student/subject from edits or saved data (filtered by selected term)
    const getCellValue = (student, subject) => {
        const canon = canonicalSubjectName(subject);
        if (gbEdits[student.id]) {
            if (gbEdits[student.id][canon] !== undefined) return gbEdits[student.id][canon];
            if (gbEdits[student.id][subject] !== undefined) return gbEdits[student.id][subject];
        }
        const termLabel = gbTerm || classTerms[0] || 'Current';
        const termResults = getTermResults(student, termLabel);
        const r = termResults.find(r => 
            canonicalSubjectName(r.subject).toLowerCase() === canon.toLowerCase() ||
            r.subject === subject
        );
        return r ? (r.obtained !== undefined ? r.obtained : '') : '';
    };

    // Helper: filter students by gender for gradebook
    const filterByGender = (studentsList, genderTab) => {
        if (genderTab === 'all') return studentsList;
        const genderVal = genderTab === 'boys' ? 'Male' : 'Female';
        return studentsList.filter(s => s.gender === genderVal);
    };

    const handleCellEdit = (studentId, subject, value) => {
        const canon = canonicalSubjectName(subject);
        let finalValue = value;
        if (typeof value === 'string' && value.trim().toUpperCase() === 'A') {
            finalValue = 'A';
        } else if (value !== '') {
            finalValue = Number(value);
            const subTotal = getSubjectTotal(canon, gbTerm || classTerms[0] || 'Current');
            if (finalValue > subTotal) return; // Deny entry above total marks
        } else {
            finalValue = '';
        }

        setGbEdits(prev => ({
            ...prev,
            [studentId]: { ...(prev[studentId] || {}), [canon]: finalValue, [subject]: finalValue }
        }));
    };

    const saveGradebook = async () => {
        setGbSaving(true);
        const termLabel = gbTerm || classTerms[0] || 'Current';
        const activeStudents = (students || []).filter(s => (s.status || 'active') === 'active');
        const classStudents = activeStudents.filter(s => getBaseClass(s.grade) === getBaseClass(selectedClass));
        const allSubjectsList = dedupeSubjectsList(classSubjects);

        const updatedStudents = classStudents.map(s => {
            const hasExisting = getTermResults(s, termLabel).length > 0;
            const hasEdits = gbEdits[s.id] !== undefined;
            if (!hasEdits && !hasExisting) return s;

            // Map existing results by canonical subject
            const existingTermResults = getTermResults(s, termLabel);
            const existingMap = new Map();
            existingTermResults.forEach(r => {
                existingMap.set(canonicalSubjectName(r.subject).toLowerCase(), r);
            });

            // Set of candidate subjects to save
            const subjectCandidates = new Set([
                ...allSubjectsList,
                ...existingTermResults.map(r => canonicalSubjectName(r.subject))
            ]);

            // Build clean, deduplicated new results for this term
            const newTermResults = [];
            subjectCandidates.forEach(subjectName => {
                const canon = canonicalSubjectName(subjectName);
                const subTotal = getSubjectTotal(canon, termLabel);
                
                let obtained = gbEdits[s.id]?.[canon] !== undefined 
                    ? gbEdits[s.id][canon] 
                    : gbEdits[s.id]?.[subjectName];
                
                if (obtained === undefined) {
                    const existingResult = existingMap.get(canon.toLowerCase());
                    obtained = existingResult?.obtained;
                }
                
                if (obtained === undefined || obtained === '') return;

                const numObtained = obtained === 'A' ? 0 : Number(obtained);
                const pct = subTotal > 0 ? Math.round((numObtained / subTotal) * 100) : 0;
                const grade = obtained === 'A' ? 'F' : calcGrade(pct);
                const existingResult = existingMap.get(canon.toLowerCase());
                
                newTermResults.push({
                    subject: canon,
                    total: subTotal,
                    obtained,
                    percentage: pct,
                    grade,
                    remarks: existingResult?.remarks || '',
                    term: termLabel
                });
            });

            // Merge: keep results from OTHER terms, replace results for THIS term
            const otherTermResults = (s.results || []).filter(r => (r.term || 'Current').trim().toLowerCase() !== termLabel.trim().toLowerCase());
            return { ...s, results: [...otherTermResults, ...newTermResults] };
        });

        const allStudents = students.map(s => updatedStudents.find(u => u.id === s.id) || s);
        await setStudents(allStudents);
        setGbEdits({});
        setGbSaving(false);
        showSaveMessage(`Gradebook saved for ${termLabel}!`);
    };

    const saveRemarks = async (studentId, subject, remarks) => {
        const termLabel = gbTerm || classTerms[0] || 'Current';
        const updatedStudents = students.map(s => {
            if (s.id !== studentId) return s;
            const newResults = (s.results || []).map(r =>
                (r.subject === subject && r.term === termLabel) ? { ...r, remarks } : r
            );
            return { ...s, results: newResults };
        });
        await setStudents(updatedStudents);
    };

    const archiveTerm = async () => {
        const termLabel = gbTerm || classTerms[0];
        if (!window.confirm(`Archive "${termLabel}" marks for ${selectedClass}? This will move this term's results to history.`)) return;
        const classStudents = students.filter(s => getBaseClass(s.grade) === getBaseClass(selectedClass) && (s.status || 'active') === 'active');
        const updatedStudents = classStudents.map(s => {
            const termResults = getTermResults(s, termLabel);
            const historyEntry = { term: termLabel, results: [...termResults] };
            // Remove this term's results, keep other terms
            const remainingResults = (s.results || []).filter(r => r.term !== termLabel);
            return {
                ...s,
                previousResults: [...(s.previousResults || []), historyEntry],
                results: remainingResults
            };
        });
        const allStudents = students.map(s => updatedStudents.find(u => u.id === s.id) || s);
        await setStudents(allStudents);
        showSaveMessage(`Term "${termLabel}" archived!`);
    };

    // ── Cumulative Excel Export ──
    // Exports one workbook with:
    //   - One sheet per archived term (from previousResults)
    //   - One "Current" sheet for active results
    //   - One "Summary" sheet showing all terms side-by-side
    const exportGradebookExcel = () => {
        const classStudents = students
            .filter(s => getBaseClass(s.grade) === getBaseClass(selectedClass) && (s.status || 'active') === 'active')
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        const wb = XLSX.utils.book_new();

        // Collect all term names (archived + current)
        const archivedTermNames = [];
        classStudents.forEach(s => {
            (s.previousResults || []).forEach(h => {
                if (!archivedTermNames.includes(h.term)) archivedTermNames.push(h.term);
            });
        });

        const buildSheet = (termResults, termName) => {
            // termResults: { studentId -> results[] }
            return classStudents.map(s => {
                const results = termResults[s.id] || [];
                const row = { 'Student ID': s.id, 'Student Name': s.name };
                const subs = (SUBJECTS[selectedClass] || SUBJECTS[getBaseClass(selectedClass)] || []).filter(sub => !isExcluded(sub, termName));
                subs.forEach(sub => {
                    const r = results.find(r => r.subject === sub);
                    row[`${sub} (Marks)`] = r ? r.obtained : '';
                    row[`${sub} (%)`] = r ? r.percentage : '';
                    row[`${sub} (Grade)`] = r ? r.grade : '';
                    const tLabel = r ? r.term : null;
                    const w = tLabel ? getSubjectTotal(sub, tLabel) : getSubjectTotal(sub, termName);
                    if (w !== 100) row[`${sub} (Weight)`] = w;
                });
                const avg = results.length ? calcWeightedAvg(results.filter(r => !isExcluded(r.subject, r.term))) : '';
                row['Weighted Avg %'] = avg;
                row['Overall Grade'] = avg !== '' ? calcGrade(avg) : '';
                return row;
            });
        };

        // Sheet per archived term
        archivedTermNames.forEach(termName => {
            const termResults = {};
            classStudents.forEach(s => {
                const hist = (s.previousResults || []).find(h => h.term === termName);
                termResults[s.id] = hist ? hist.results : [];
            });
            const ws = XLSX.utils.json_to_sheet(buildSheet(termResults, termName));
            XLSX.utils.book_append_sheet(wb, ws, termName.substring(0, 31));
        });

        // Per-term sheets for currently active terms (not archived)
        classTerms.forEach(termName => {
            if (archivedTermNames.includes(termName)) return; // already exported via archived
            const termResults = {};
            classStudents.forEach(s => {
                termResults[s.id] = getTermResults(s, termName);
            });
            // Only add sheet if there's data
            const hasData = Object.values(termResults).some(r => r.length > 0);
            if (hasData) {
                const ws = XLSX.utils.json_to_sheet(buildSheet(termResults, termName));
                XLSX.utils.book_append_sheet(wb, ws, termName.substring(0, 31));
            }
        });

        // Summary sheet: student | Term1 Avg | Term2 Avg | ... | Overall
        const allTermNames = [...archivedTermNames, ...classTerms.filter(t => !archivedTermNames.includes(t))];
        const summaryRows = classStudents.map(s => {
            const row = { 'Student ID': s.id, 'Student Name': s.name, 'Gender': s.gender || '' };
            allTermNames.forEach(termName => {
                // Check archived first, then active
                const hist = (s.previousResults || []).find(h => h.term === termName);
                const res = hist ? hist.results : getTermResults(s, termName);
                row[`${termName} Avg%`] = res.length ? calcWeightedAvg(res) : '';
                row[`${termName} Grade`] = res.length ? calcGrade(calcWeightedAvg(res)) : '';
            });
            // Grand average across all terms
            const allAvgs = allTermNames.map(t => {
                const hist = (s.previousResults || []).find(h => h.term === t);
                const res = hist ? hist.results : getTermResults(s, t);
                return res.length ? calcWeightedAvg(res) : null;
            }).filter(v => v !== null);
            row['Grand Avg%'] = allAvgs.length ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : '';
            row['Grand Grade'] = row['Grand Avg%'] !== '' ? calcGrade(row['Grand Avg%']) : '';
            return row;
        });
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        XLSX.writeFile(wb, `Gradebook_${selectedClass}_AllTerms.xlsx`);
    };

    const importGradebookExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws);
            const termLabel = gbTerm || classTerms[0] || 'Current';

            let hasError = false;
            let errorMessage = '';
            const newEdits = {};

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const studentId = row['Student ID'];
                if (!studentId) continue;
                newEdits[studentId] = {};
                for (let sub of classSubjects.filter(sub => !isExcluded(sub, termLabel))) {
                    let val = row[sub];
                    if (val !== undefined && val !== '') {
                        if (typeof val === 'string' && val.trim().toUpperCase() === 'A') {
                            newEdits[studentId][sub] = 'A';
                        } else {
                            const numVal = Number(val);
                            const subTotal = getSubjectTotal(sub, termLabel);
                            if (numVal > subTotal) {
                                hasError = true;
                                errorMessage = `Excel sheet rejected. Student ${studentId} has obtained ${numVal} marks for ${sub}, which is greater than the total marks (${subTotal}).`;
                                break;
                            }
                            newEdits[studentId][sub] = numVal;
                        }
                    }
                }
                if (hasError) break;
            }

            if (hasError) {
                openConfirm('Validation Error', errorMessage, null, true);
                return;
            }

            setGbEdits(newEdits);
            showSaveMessage(`Imported marks for ${Object.keys(newEdits).length} students into ${termLabel}. Click Save All to apply.`);
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const downloadGradebookTemplate = () => {
        const allClassStudents = students.filter(s => getBaseClass(s.grade) === getBaseClass(selectedClass) && (s.status || 'active') === 'active');
        const classStudents = filterByGender(allClassStudents, gbGenderTab);
        const termLabel = gbTerm || classTerms[0] || 'Current';
        const genderLabel = gbGenderTab === 'all' ? 'All' : (gbGenderTab === 'boys' ? 'Boys' : 'Girls');
        const rows = classStudents.map(s => {
            const row = { 'Student ID': s.id, 'Student Name': s.name, 'Gender': s.gender || '' };
            classSubjects.forEach(sub => { row[sub] = ''; });
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Marks Template');
        XLSX.writeFile(wb, `Marks_Template_${selectedClass}_${termLabel}_${genderLabel}.xlsx`);
    };

    // ── PDF Result Report ──
    // ── PDF Result Report ──
    const exportResultPDF = (customStudents = null, filterTitle = '', allTracksForClass = [], selectedTrackArg = '', selectedSubTrackArg = 'all', prebuiltGroups = null) => {
        const termLabel = gbTerm || classTerms[0] || 'Current';
        const baseClass = getBaseClass(selectedClass);
        const schoolName = schoolData.name || 'ACS School & College';
        const printDate = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
        const sectionName = (SECTIONS || []).find(s => (s.classes || []).some(c => getBaseClass(c) === baseClass))?.name || '';
        const genderLabel = gbGenderTab === 'all' ? 'All Students' : (gbGenderTab === 'boys' ? 'Boys' : 'Girls');
        const subs = classSubjects.filter(sub => !isExcluded(sub, termLabel));

        const gradeColors = (pct) => {
            if (pct >= 90) return { bg: '#d1fae5', text: '#065f46', border: '#1e293b' };
            if (pct >= 80) return { bg: '#dcfce7', text: '#15803d', border: '#1e293b' };
            if (pct >= 70) return { bg: '#dbeafe', text: '#1d4ed8', border: '#1e293b' };
            if (pct >= 60) return { bg: '#ede9fe', text: '#6d28d9', border: '#1e293b' };
            if (pct >= 50) return { bg: '#fef9c3', text: '#a16207', border: '#1e293b' };
            if (pct >= 40) return { bg: '#ffedd5', text: '#c2410c', border: '#1e293b' };
            return { bg: '#fee2e2', text: '#dc2626', border: '#1e293b' };
        };

        const buildSectionHTML = (sectionStudents, sectionLabel, isFirst = true, explicitSubjects = null) => {
            const sortedStudents = sectionStudents
                .slice()
                .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

            if (sortedStudents.length === 0) return '';

            // Extract the stream track to enforce strict cross-stream separation in PDF export
            let sectionTrack = (selectedTrackArg && selectedTrackArg !== 'all') ? selectedTrackArg : '';
            if (!sectionTrack && sectionLabel) {
                sectionTrack = normalizeTrackName(sectionLabel);
            }
            if (!sectionTrack && sortedStudents.length > 0) {
                const sTracks = new Set(sortedStudents.map(s => getStudentTrack(s)).filter(Boolean));
                if (sTracks.size === 1) sectionTrack = Array.from(sTracks)[0];
            }

            const fallbackSubs = getTrackSubjects(baseClass, sectionTrack || null, null, subs, sortedStudents, gbEdits, getCellValue);
            const candidateSubs = explicitSubjects && explicitSubjects.length > 0 ? explicitSubjects : fallbackSubs;
            const sectionSubs = dedupeSubjectsList(filterForbiddenSubjects(candidateSubs, sectionTrack));

            // Build rows
            const rows = sortedStudents.map((s, idx) => {
                const res = getTermResults(s, termLabel);
                let rowObtained = 0, rowMax = 0;
                let hasAnyMark = false;

                const subCells = sectionSubs.map(sub => {
                    const canonSub = canonicalSubjectName(sub);
                    const r = res.find(r => canonicalSubjectName(r.subject).toLowerCase() === canonSub.toLowerCase() || r.subject === sub);
                    const edited = gbEdits[s.id]?.[canonSub] !== undefined ? gbEdits[s.id][canonSub] : gbEdits[s.id]?.[sub];
                    const rawVal = edited !== undefined ? edited : (r ? r.obtained : null);
                    const total = getSubjectTotal(canonSub, termLabel);
                    const isAbsent = rawVal === 'A' || rawVal === 'a' || String(rawVal).toLowerCase() === 'absent';
                    const numOb = isAbsent ? 0 : (rawVal !== null && rawVal !== undefined && rawVal !== '' ? Number(rawVal) : null);

                    if (numOb !== null || isAbsent) {
                        hasAnyMark = true;
                        rowObtained += (isAbsent ? 0 : Number(numOb || 0));
                        rowMax += total;
                    }
                    const pct = numOb !== null && total > 0 ? Math.round((numOb / total) * 100) : null;
                    const sc = pct !== null ? gradeColors(pct) : { bg: '#f8fafc', text: '#1e293b', border: '#1e293b' };
                    const displayOb = isAbsent ? 'Absent' : (rawVal !== null && rawVal !== undefined && rawVal !== '' ? rawVal : '—');
                    const displayGrade = isAbsent ? 'F' : (pct !== null ? calcGrade(pct) : '');
                    return `<td style="text-align:center; padding:6px 4px; border:2px solid #1e293b; background:${sc.bg}; color:${sc.text}; font-weight:900; font-size:15px;">${displayOb}${displayGrade ? `<br/><span style='font-size:13px;font-weight:900'>${displayGrade}</span>` : ''}</td>`;
                }).join('');

                const overall = rowMax > 0 && hasAnyMark ? Math.round((rowObtained / rowMax) * 100) : null;
                const gc = overall !== null ? gradeColors(overall) : { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };

                return `
                <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">
                    <td style="padding:8px 10px; border:2px solid #1e293b; font-weight:900; font-size:15px; color:#0f172a;">${idx + 1}</td>
                    <td style="padding:8px 10px; border:2px solid #1e293b; font-weight:900; font-size:15px; color:#0f172a;">${s.name}</td>
                    <td style="padding:8px 4px; border:2px solid #1e293b; font-size:15px; font-weight:900; color:#0f172a; text-align:center">${s.id}</td>
                    ${subCells}
                    <td style="text-align:center; padding:6px 8px; border:2px solid #1e293b; background:${gc.bg}; color:${gc.text}; font-weight:900; font-size:15px;">
                        ${overall !== null ? `
                            <div style="font-size:17px;font-weight:900;">${overall}%</div>
                            <div style="font-size:13px; font-weight:900; margin-top:2px;">${rowObtained} / ${rowMax}</div>
                            <div style="font-size:14px; font-weight:900; margin-top:2px;">Grade: ${calcGrade(overall)}</div>
                        ` : '—'}
                    </td>
                    <td style="text-align:center; padding:6px 8px; border:2px solid #1e293b; font-weight:900; font-size:15px; color:${overall !== null && overall >= 40 ? '#15803d' : '#dc2626'}">
                        ${overall !== null ? (overall >= 40 ? 'PASS' : 'FAIL') : '—'}
                    </td>
                </tr>`;
            }).join('');

            // Stats
            const withResults = sortedStudents.filter(s => getTermResults(s, termLabel).length > 0 || (gbEdits[s.id] && Object.values(gbEdits[s.id]).some(v => v !== '')));
            const passCount = withResults.filter(s => calcOverallPct(getTermResults(s, termLabel), (sub) => getSubjectTotal(sub, termLabel)) >= 40).length;
            const avgPct = withResults.length ? Math.round(withResults.reduce((sum, s) => sum + calcOverallPct(getTermResults(s, termLabel), (sub) => getSubjectTotal(sub, termLabel)), 0) / withResults.length) : 0;
            const topStudent = [...withResults].sort((a, b) => calcOverallPct(getTermResults(b, termLabel), (sub) => getSubjectTotal(sub, termLabel)) - calcOverallPct(getTermResults(a, termLabel), (sub) => getSubjectTotal(sub, termLabel)))[0];

            const subHeaders = sectionSubs.map(sub =>
                `<th style="padding:8px 4px; background:#1e3a5f; color:white; font-size:15px; font-weight:900; text-align:center; min-width:75px; border:2px solid #0f172a">${sub}<br/><span style='font-weight:700;font-size:12px'>/${getSubjectTotal(sub, termLabel)}</span></th>`
            ).join('');

            const pageBreakClass = isFirst ? '' : 'report-page-break';

            return `
            <div class="report-container ${pageBreakClass}">
                <div class="header">
                    <h1>📊 ${schoolName}</h1>
                    <p>Result Report &nbsp;|&nbsp; ${sectionName ? sectionName + ' — ' : ''}${selectedClass}${sectionLabel ? ' — ' + sectionLabel : ''} &nbsp;|&nbsp; ${termLabel} &nbsp;|&nbsp; Generated: ${printDate}</p>
                </div>
                <div class="meta-bar">
                    <div class="meta-item"><span class="meta-label">Class</span><span class="meta-value">${selectedClass}</span></div>
                    ${sectionLabel ? `<div class="meta-item"><span class="meta-label">Track / Group</span><span class="meta-value">${sectionLabel}</span></div>` : ''}
                    ${sectionName ? `<div class="meta-item"><span class="meta-label">Section</span><span class="meta-value">${sectionName}</span></div>` : ''}
                    <div class="meta-item"><span class="meta-label">Term</span><span class="meta-value">${termLabel}</span></div>
                    <div class="meta-item"><span class="meta-label">Gender</span><span class="meta-value">${genderLabel}</span></div>
                    <div class="meta-item"><span class="meta-label">Total Students</span><span class="meta-value">${sortedStudents.length}</span></div>
                    <div class="meta-item"><span class="meta-label">Appeared</span><span class="meta-value">${withResults.length}</span></div>
                    <div class="meta-item"><span class="meta-label">Date</span><span class="meta-value">${printDate}</span></div>
                </div>
                <div class="stats-bar">
                    <div class="stat-card"><div class="stat-num" style="color:#15803d">${passCount}</div><div class="stat-lbl">Passed</div></div>
                    <div class="stat-card"><div class="stat-num" style="color:#dc2626">${withResults.length - passCount}</div><div class="stat-lbl">Failed</div></div>
                    <div class="stat-card"><div class="stat-num" style="color:#1d4ed8">${withResults.length ? Math.round((passCount / withResults.length) * 100) : 0}%</div><div class="stat-lbl">Pass Rate</div></div>
                    <div class="stat-card"><div class="stat-num">${avgPct}%</div><div class="stat-lbl">Class Average</div></div>
                    ${topStudent ? `<div class="stat-card" style="flex:2;"><div class="stat-num" style="font-size:16px;color:#7c3aed">${topStudent.name}</div><div class="stat-lbl">🏆 Top Student — ${calcOverallPct(getTermResults(topStudent, termLabel), (sub) => getSubjectTotal(sub, termLabel))}%</div></div>` : ''}
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th style="padding:8px 10px; background:#1e3a5f; color:white; text-align:left; font-size:15px; font-weight:900; border:2px solid #0f172a">#</th>
                                <th style="padding:8px 10px; background:#1e3a5f; color:white; text-align:left; font-size:15px; font-weight:900; min-width:160px; border:2px solid #0f172a">Student Name</th>
                                <th style="padding:8px 4px; background:#1e3a5f; color:white; text-align:center; font-size:15px; font-weight:900; min-width:80px; border:2px solid #0f172a">ID</th>
                                ${subHeaders}
                                <th style="padding:8px 8px; background:#0f2744; color:#fbbf24; text-align:center; font-size:15px; font-weight:900; min-width:70px; border:2px solid #0f172a">Overall</th>
                                <th style="padding:8px 8px; background:#0f2744; color:#fbbf24; text-align:center; font-size:15px; font-weight:900; min-width:55px; border:2px solid #0f172a">Result</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="footer">
                    ${schoolName} &nbsp;|&nbsp; ${selectedClass}${sectionLabel ? ' — ' + sectionLabel : ''} &nbsp;|&nbsp; ${termLabel} &nbsp;|&nbsp; Printed: ${printDate} &nbsp;|&nbsp; Total Students: ${sortedStudents.length}
                </div>
            </div>`;
        };

        const getDisplaySubTrackName = (trk, st) => {
            if (trk === 'Humanities' || trk === 'FA') {
                if (st === 'FA' || st === 'Simple' || st === 'FA Simple') return 'FA Simple';
                if (st === 'FAIT' || st === 'FA IT' || st === 'IT') return 'FAIT';
            }
            if (trk === 'Arts') {
                if (st === 'Simple Arts' || st === 'Arts') return 'Simple Arts';
                if (st === 'Computer Arts') return 'Computer Arts';
            }
            return st;
        };

        const subTrackConfig = {
            'ICS': ['Physics', 'Economics', 'Statistics'],
            'Humanities': ['FAIT', 'FA'],
            'FA': ['FAIT', 'FA'],
            'Arts': ['Simple Arts', 'Computer Arts']
        };

        const getSubTracksForTrack = (trk) => {
            const trackKey = `${baseClass} ${trk}`;
            if (CLASS_SUBTRACKS?.[trackKey] !== undefined) return CLASS_SUBTRACKS[trackKey] || [];
            return subTrackConfig[trk] || [];
        };

        let sectionsHTML = '';
        let isFirst = true;

        const classStudentsPool = (students || schoolData.students || []).filter(s => {
            if ((s.status || 'active') !== 'active') return false;
            const stuBase = getBaseClass(s.grade);
            return stuBase === baseClass || s.grade === selectedClass;
        });

        if (prebuiltGroups && Array.isArray(prebuiltGroups) && prebuiltGroups.length > 0) {
            prebuiltGroups.forEach(grp => {
                if (grp.students && grp.students.length > 0) {
                    const cleanSubs = filterForbiddenSubjects(grp.subjects || [], grp.trackName || grp.trackKey || selectedTrackArg);
                    sectionsHTML += buildSectionHTML(grp.students, grp.trackName, isFirst, cleanSubs);
                    isFirst = false;
                }
            });
        } else if (allTracksForClass && allTracksForClass.length > 0 && (!selectedTrackArg || selectedTrackArg === 'all')) {
            // Multi-section mode: generate one clean section per track & sub-track, each on a fresh page
            allTracksForClass.forEach(track => {
                const subTracks = getSubTracksForTrack(track);

                if (subTracks.length > 0) {
                    const matchedStudentIds = new Set();
                    subTracks.forEach(st => {
                        const subStudents = filterStudentsByHierarchy(classStudentsPool, {
                            baseClass,
                            track,
                            subTrack: st,
                            gender: gbGenderTab,
                            status: 'active'
                        });

                        if (subStudents.length > 0) {
                            subStudents.forEach(s => matchedStudentIds.add(s.id));
                            const subSubjects = getTrackSubjects(baseClass, track, st, subs, subStudents, gbEdits, getCellValue);
                            const displaySub = getDisplaySubTrackName(track, st);
                            const groupLabel = `${track} (${displaySub})`;
                            sectionsHTML += buildSectionHTML(subStudents, groupLabel, isFirst, subSubjects);
                            isFirst = false;
                        }
                    });

                    // Catch unassigned in this track
                    const unassignedTrackStudents = filterStudentsByHierarchy(classStudentsPool, {
                        baseClass,
                        track,
                        gender: gbGenderTab,
                        status: 'active'
                    }).filter(s => !matchedStudentIds.has(s.id));

                    if (unassignedTrackStudents.length > 0) {
                        const defaultSub = subTracks[0];
                        const subSubjects = getTrackSubjects(baseClass, track, defaultSub, subs, unassignedTrackStudents, gbEdits, getCellValue);
                        const displaySub = getDisplaySubTrackName(track, defaultSub);
                        const groupLabel = `${track} (${displaySub})`;
                        sectionsHTML += buildSectionHTML(unassignedTrackStudents, groupLabel, isFirst, subSubjects);
                        isFirst = false;
                    }
                } else {
                    const trackStudents = filterStudentsByHierarchy(classStudentsPool, {
                        baseClass,
                        track,
                        gender: gbGenderTab,
                        status: 'active'
                    });
                    if (trackStudents.length > 0) {
                        const trackSubjects = getTrackSubjects(baseClass, track, null, subs, trackStudents, gbEdits, getCellValue);
                        sectionsHTML += buildSectionHTML(trackStudents, track, isFirst, trackSubjects);
                        isFirst = false;
                    }
                }
            });
        } else if (selectedTrackArg && selectedTrackArg !== 'all') {
            // Specific track filtered
            const subTracks = getSubTracksForTrack(selectedTrackArg);

            if (selectedSubTrackArg && selectedSubTrackArg !== 'all') {
                const subStudents = customStudents || filterStudentsByHierarchy(classStudentsPool, {
                    baseClass,
                    track: selectedTrackArg,
                    subTrack: selectedSubTrackArg,
                    gender: gbGenderTab,
                    status: 'active'
                });
                const subSubjects = getTrackSubjects(baseClass, selectedTrackArg, selectedSubTrackArg, subs, subStudents, gbEdits, getCellValue);
                const displaySub = getDisplaySubTrackName(selectedTrackArg, selectedSubTrackArg);
                const groupLabel = `${selectedTrackArg} (${displaySub})`;
                sectionsHTML = buildSectionHTML(subStudents, groupLabel, true, subSubjects);
            } else if (subTracks.length > 0) {
                const matchedStudentIds = new Set();
                subTracks.forEach(st => {
                    const subStudents = filterStudentsByHierarchy(classStudentsPool, {
                        baseClass,
                        track: selectedTrackArg,
                        subTrack: st,
                        gender: gbGenderTab,
                        status: 'active'
                    });

                    if (subStudents.length > 0) {
                        subStudents.forEach(s => matchedStudentIds.add(s.id));
                        const subSubjects = getTrackSubjects(baseClass, selectedTrackArg, st, subs, subStudents, gbEdits, getCellValue);
                        const displaySub = getDisplaySubTrackName(selectedTrackArg, st);
                        const groupLabel = `${selectedTrackArg} (${displaySub})`;
                        sectionsHTML += buildSectionHTML(subStudents, groupLabel, isFirst, subSubjects);
                        isFirst = false;
                    }
                });

                // Catch unassigned in this track
                const unassignedTrackStudents = filterStudentsByHierarchy(classStudentsPool, {
                    baseClass,
                    track: selectedTrackArg,
                    gender: gbGenderTab,
                    status: 'active'
                }).filter(s => !matchedStudentIds.has(s.id));

                if (unassignedTrackStudents.length > 0) {
                    const defaultSub = subTracks[0];
                    const subSubjects = getTrackSubjects(baseClass, selectedTrackArg, defaultSub, subs, unassignedTrackStudents, gbEdits, getCellValue);
                    const displaySub = getDisplaySubTrackName(selectedTrackArg, defaultSub);
                    const groupLabel = `${selectedTrackArg} (${displaySub})`;
                    sectionsHTML += buildSectionHTML(unassignedTrackStudents, groupLabel, isFirst, subSubjects);
                    isFirst = false;
                }
            } else {
                const students2Use = customStudents || filterStudentsByHierarchy(classStudentsPool, {
                    baseClass,
                    track: selectedTrackArg,
                    gender: gbGenderTab,
                    status: 'active'
                });
                const trackSubjects = getTrackSubjects(baseClass, selectedTrackArg, null, subs, students2Use, gbEdits, getCellValue);
                sectionsHTML = buildSectionHTML(students2Use, selectedTrackArg, true, trackSubjects);
            }
        } else {
            const students2Use = customStudents || filterStudentsByHierarchy(classStudentsPool, {
                baseClass,
                gender: gbGenderTab,
                status: 'active'
            });
            const trackSubjects = getTrackSubjects(baseClass, null, null, subs, students2Use, gbEdits, getCellValue);
            sectionsHTML = buildSectionHTML(students2Use, '', true, trackSubjects);
        }

        if (!sectionsHTML.trim()) {
            alert('No students found for the selected filter. Please check your selection.');
            return;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Result Report - ${selectedClass} - ${termLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; color: #0f172a; padding: 20px; text-align: center; display: block; overflow-x: auto; }
  @page { size: A4 landscape; margin: 10mm; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; padding: 0; background: #fff; overflow: visible; display: block; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .report-container { 
        box-shadow: none !important; 
        margin: 0 0 30px 0 !important; 
        width: 100% !important; 
        min-width: 100% !important; 
        display: block !important; 
        page-break-before: auto !important; 
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .report-page-break {
        page-break-before: always !important;
        break-before: page !important;
    }
    .table-wrap { overflow-x: visible !important; width: 100% !important; padding: 10px 0 0 !important; }
    table { page-break-inside: auto; width: 100% !important; }
    tr { page-break-inside: avoid; page-break-after: auto; }
  }
  .report-container { 
      display: inline-block; 
      min-width: 100%; 
      background: #fff; 
      border-radius: 8px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
      margin: 0 auto 40px; 
      text-align: left; 
      page-break-inside: avoid; 
      break-inside: avoid;
  }
  .report-page-break {
      page-break-before: always;
      break-before: page;
  }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 20px 24px; border-radius: 8px 8px 0 0; text-align: center; }
  .header h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
  .header p { font-size: 13px; font-weight: 700; opacity: 0.95; }
  .meta-bar { display: flex; justify-content: center; gap: 24px; background: #f8fafc; padding: 14px 24px; border-bottom: 2px solid #e2e8f0; flex-wrap: wrap; text-align: center; }
  .meta-item { display: flex; flex-direction: column; }
  .meta-label { font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 900; letter-spacing: 0.05em; }
  .meta-value { font-size: 15px; font-weight: 900; color: #0f172a; }
  .stats-bar { display: flex; justify-content: center; gap: 14px; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
  .stat-card { flex: 1; min-width: 90px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: center; }
  .stat-num { font-size: 22px; font-weight: 900; color: #1e3a5f; }
  .stat-lbl { font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; margin-top: 2px; }
  .table-wrap { width: 100%; padding: 16px 24px 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; border: 2px solid #0f172a; margin: 0; }
  thead tr th { position: sticky; top: 0; z-index: 10; }
  .footer { text-align: center; padding: 14px 24px; font-size: 13px; font-weight: 900; color: #334155; border-top: 1px solid #e2e8f0; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
  .print-btn:hover { background: #1d4ed8; }
</style>
</head>
<body>
${sectionsHTML}
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
</body>
</html>`;

        const win = window.open('', '_blank');
        if (!win) {
            alert("Popup blocked! Please allow popups to download/print.");
            return;
        }
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 600);
    };

    // ── Export Passwords PDF ──
    const exportPasswordsPDF = (classToExport, customStudents = null) => {
        const sourceList = Array.isArray(customStudents)
            ? customStudents
            : students.filter(s => getBaseClass(s.grade) === getBaseClass(classToExport) && (s.status || 'active') === 'active');

        const classStudents = sourceList
            .slice()
            .sort((a, b) => {
                const sA = parseInt(a.serialNumber || a.serial_number, 10);
                const sB = parseInt(b.serialNumber || b.serial_number, 10);
                if (!isNaN(sA) && !isNaN(sB) && sA !== sB) return sA - sB;
                return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true });
            });

        if (classStudents.length === 0) {
            alert('No active students found for the selected class/filter to export credentials.');
            return;
        }

        const schoolName = schoolData.name || 'ACS School & College';
        const websiteDomain = 'acscollege.com';

        const cardsHTML = classStudents.map((s) => {
            const info = getStudentCardAcademicDetails(s);
            const loginPassword = s.password || (s.id + '123');

            return `
                <div class="cred-card">
                    <div class="card-top-accent"></div>
                    <div class="card-header">
                        <div class="brand-wrap">
                            <img src="/logo.png" class="brand-logo" alt="ACS" onerror="this.style.display='none'" />
                            <div class="brand-text">
                                <h1>${schoolName}</h1>
                                <p>Official Student Portal &amp; Login Card</p>
                            </div>
                        </div>
                        ${info.serialNumber !== '—' ? `
                            <div class="header-badges">
                                <span class="serial-pill">S# ${info.serialNumber}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="card-body">
                        <div class="student-identity">
                            <div class="student-name-wrap">
                                <span class="student-label">Student Name</span>
                                <h2 class="student-name">${s.name}</h2>
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-cell">
                                <span class="info-lbl">Father's Name</span>
                                <span class="info-val">${info.fatherName}</span>
                            </div>
                            <div class="info-cell">
                                <span class="info-lbl">Gender</span>
                                <span class="info-val ${info.isFemale ? 'text-female' : (info.isMale ? 'text-male' : '')}">${info.genderLabel}</span>
                            </div>
                            <div class="info-cell">
                                <span class="info-lbl">Class Level</span>
                                <span class="info-val highlight-navy">${info.classLevel}</span>
                            </div>
                            <div class="info-cell">
                                <span class="info-lbl">Academic Stream / Group</span>
                                <span class="info-val highlight-stream">${info.fullGroupDisplay}</span>
                            </div>
                        </div>

                        <div class="credentials-box">
                            <div class="cred-box-header">
                                <span>🔐 ONLINE PORTAL LOGIN CREDENTIALS</span>
                            </div>
                            <div class="cred-row">
                                <div class="cred-item">
                                    <span class="cred-label">Student ID / Username</span>
                                    <span class="cred-value id-val">${s.id}</span>
                                </div>
                                <div class="cred-item">
                                    <span class="cred-label">Portal Password</span>
                                    <span class="cred-value pwd-val">${loginPassword}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="website-banner">
                            <span class="web-label">🌐 Official Website:</span>
                            <span class="web-url">www.${websiteDomain}</span>
                        </div>
                        <div class="footer-note">
                            Log in at <strong>${websiteDomain}</strong> to view Attendance, Exam Results &amp; Fee Status online.
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Student Login &amp; Academic Cards - ${classToExport}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #e2e8f0;
      color: #0f172a;
      padding: 72px 20px 40px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
  }

  /* Toolbar */
  .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #0f172a;
      color: white;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .toolbar-left { display: flex; align-items: center; gap: 12px; }
  .toolbar-title { font-size: 15px; font-weight: 800; color: #f8fafc; }
  .toolbar-sub { font-size: 12px; color: #94a3b8; font-weight: 600; }
  .toolbar-actions { display: flex; align-items: center; gap: 10px; }
  .layout-btn {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
  }
  .layout-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }
  .print-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 9px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(16,185,129,0.3);
  }
  .print-btn:hover { background: #059669; }

  /* Grid Container */
  .cards-sheet {
      max-width: 210mm;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
  }

  /* Individual Credential Card */
  .cred-card {
      background: #ffffff;
      border: 1.5px dashed #94a3b8;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 4px 12px rgba(15,23,42,0.06);
      position: relative;
  }

  .card-top-accent {
      height: 5px;
      background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #f59e0b 100%);
  }

  .card-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: white;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
  }
  .brand-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
  }
  .brand-logo {
      width: 36px;
      height: 36px;
      object-fit: contain;
      background: white;
      border-radius: 8px;
      padding: 3px;
      flex-shrink: 0;
  }
  .brand-text h1 {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.3px;
      line-height: 1.15;
      color: #ffffff;
      text-transform: uppercase;
  }
  .brand-text p {
      font-size: 9.5px;
      font-weight: 700;
      color: #93c5fd;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
  }

  .header-badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
  }
  .serial-pill {
      background: rgba(255,255,255,0.16);
      color: #fde68a;
      border: 1px solid rgba(253,230,138,0.4);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
  }
  .gender-badge {
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
  }
  .gender-badge.male {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #93c5fd;
  }
  .gender-badge.female {
      background: #fce7f3;
      color: #be185d;
      border: 1px solid #f9a8d4;
  }
  .gender-badge.neutral {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
  }

  .card-body {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
  }

  .student-identity {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 8px;
  }
  .student-label {
      display: block;
      font-size: 9px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.6px;
  }
  .student-name {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
      margin-top: 1px;
  }
  .academic-pill-wrap {
      flex-shrink: 0;
      text-align: right;
  }
  .academic-main-pill {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1.5px solid #bfdbfe;
      padding: 4px 9px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
  }

  .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
  }
  .info-cell {
      display: flex;
      flex-direction: column;
      min-width: 0;
  }
  .info-lbl {
      font-size: 8.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
  }
  .info-val {
      font-size: 11.5px;
      font-weight: 800;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
  }
  .info-val.highlight-navy { color: #1e3a8a; }
  .info-val.highlight-stream { color: #047857; }
  .info-val.text-male { color: #1d4ed8; }
  .info-val.text-female { color: #be185d; }

  .credentials-box {
      background: #f0f9ff;
      border: 1.5px solid #bae6fd;
      border-radius: 8px;
      padding: 8px 10px;
  }
  .cred-box-header {
      font-size: 9px;
      font-weight: 900;
      color: #0369a1;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
      text-align: center;
  }
  .cred-row {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 8px;
  }
  .cred-item {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 8px;
      text-align: center;
  }
  .cred-label {
      display: block;
      font-size: 8.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 2px;
  }
  .cred-value {
      display: block;
      font-size: 13.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      font-family: 'Consolas', 'Courier New', monospace;
  }
  .cred-value.id-val { color: #0f172a; }
  .cred-value.pwd-val { color: #2563eb; }

  .card-footer {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 12px;
      text-align: center;
  }
  .website-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 2px;
  }
  .web-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
  }
  .web-url {
      font-size: 12px;
      font-weight: 900;
      color: #38bdf8;
      letter-spacing: 0.5px;
      background: rgba(56,189,248,0.14);
      padding: 1px 8px;
      border-radius: 4px;
      border: 1px solid rgba(56,189,248,0.35);
  }
  .footer-note {
      font-size: 9px;
      color: #cbd5e1;
      font-weight: 500;
  }
  .footer-note strong {
      color: #fde68a;
      font-weight: 800;
  }

  /* Compact 6-per-page mode */
  body.compact-6 .cred-card .card-header { padding: 8px 12px; }
  body.compact-6 .cred-card .brand-logo { width: 28px; height: 28px; }
  body.compact-6 .cred-card .brand-text h1 { font-size: 12.5px; }
  body.compact-6 .cred-card .card-body { padding: 8px 12px; gap: 6px; }
  body.compact-6 .cred-card .student-name { font-size: 14px; }
  body.compact-6 .cred-card .info-grid { padding: 5px 8px; gap: 4px 8px; }
  body.compact-6 .cred-card .credentials-box { padding: 6px 8px; }
  body.compact-6 .cred-card .cred-value { font-size: 12px; }
  body.compact-6 .cred-card .card-footer { padding: 6px 10px; }

  @page { size: A4 portrait; margin: 8mm; }
  @media print {
      .no-print { display: none !important; }
      body { background: #ffffff; padding: 0; }
      .cards-sheet {
          max-width: 100%;
          gap: 8px;
      }
      .cred-card {
          box-shadow: none !important;
          border: 1.5px dashed #64748b !important;
      }
  }
</style>
</head>
<body class="compact-6">
  <div class="toolbar no-print">
      <div class="toolbar-left">
          <div>
              <div class="toolbar-title">🪪 Student Portal &amp; Login Credentials (${classStudents.length} Students — ${classToExport})</div>
              <div class="toolbar-sub">Includes Website (acscollege.com), Gender Label, Class Level &amp; Academic Stream/Sub-Track</div>
          </div>
      </div>
      <div class="toolbar-actions">
          <button id="btn-6" class="layout-btn active" onclick="document.body.className='compact-6'; document.getElementById('btn-6').classList.add('active'); document.getElementById('btn-4').classList.remove('active');">6 Cards / A4 Page</button>
          <button id="btn-4" class="layout-btn" onclick="document.body.className=''; document.getElementById('btn-4').classList.add('active'); document.getElementById('btn-6').classList.remove('active');">4 Cards / A4 Page (Large)</button>
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
      </div>
  </div>
  <div class="cards-sheet">
      ${cardsHTML}
  </div>
</body>
</html>`;

        const win = window.open('', '_blank');
        if (!win) {
            alert("Popup blocked! Please allow popups to export passwords.");
            return;
        }
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 600);
    };


    const attendanceFileRef = useRef(null);
    const marksFileRef = useRef(null);
    const feeFileRef = useRef(null);
    const photoFileRef = useRef(null);
    const facultyFileRef = useRef(null);
    const facilityFileRef = useRef(null);
    const blogImageRef = useRef(null);
    const gbImportFileRef = useRef(null);


    // Announcement state
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0] });

    // Admission Form State
    const admissionInitialState = {
        applyingFor: sectionClasses[0] || '', applicationDate: new Date().toISOString().split('T')[0],
        serialNumber: '', // Added Serial Number field
        inquiryNo: '',    // Added Inquiry Number field
        studentName: '', bForm: '', dob: '', nationality: '', gender: '', religion: '',
        allergies: 'No', allergiesDetails: '', chronicCondition: 'No', chronicConditionDetails: '',
        medication: 'No', medicationDetails: '', fatherName: '', fatherCnic: '',
        contact: '', whatsapp: '', address: '', monthlyFee: '', docs: { photos: false, bform: false, cnic: false }, photo: ''
    };
    const [admissionData, setAdmissionData] = useState(admissionInitialState);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [editingFacultyId, setEditingFacultyId] = useState(null);
    const [editingFacilityId, setEditingFacilityId] = useState(null);
    const [tempFacultyMember, setTempFacultyMember] = useState(null);
    const [tempFacility, setTempFacility] = useState(null);
    const [editingBlogId, setEditingBlogId] = useState(null);
    const [tempBlog, setTempBlog] = useState(null);

    // Class Management State
    const [selectedClassForList, setSelectedClassForList] = useState(sectionClasses[0] || '');
    const [classListSearch, setClassListSearch] = useState('');
    const [newClassName, setNewClassName] = useState('');
    const [editingSectionId, setEditingSectionId] = useState(null);
    const [editingSectionName, setEditingSectionName] = useState('');
    const classImportFileRef = useRef(null);
    const studentPhotoUploadRef = useRef(null);
    const [editingStudentId, setEditingStudentId] = useState(null);
    const [editStudentData, setEditStudentData] = useState(null);
    const [importReport, setImportReport] = useState(null); // { success, updated, errors[], warnings[] }

    const students = schoolData.students || [];

    const handleFacultyPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const publicUrl = await uploadImage(file, 'Faculty');
        if (publicUrl) {
            if (editingFacultyId === 'new') {
                setTempFacultyMember(prev => ({ ...prev, image: publicUrl }));
            } else {
                const { error } = await supabase.from('faculty').update({ image: publicUrl }).eq('id', editingFacultyId);
                if (error) {
                    alert('Error updating database: ' + error.message);
                } else {
                    // Update state FIRST so UI doesn't revert while fetching
                    setTempFacultyMember(prev => ({ ...prev, image: publicUrl }));
                    await fetchData();
                    showSaveMessage('Faculty photo updated!');
                }
            }
        }
    };

    const handleFacilityPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const publicUrl = await uploadImage(file, 'Facilities');
        if (publicUrl) {
            if (editingFacilityId === 'new') {
                setTempFacility(prev => ({ ...prev, image: publicUrl }));
            } else {
                const { error } = await supabase.from('facilities').update({ image: publicUrl }).eq('id', editingFacilityId);
                if (error) {
                    alert('Error updating database: ' + error.message);
                } else {
                    // Update state FIRST so UI doesn't revert while fetching
                    setTempFacility(prev => ({ ...prev, image: publicUrl }));
                    await fetchData();
                    showSaveMessage('Facility photo updated!');
                }
            }
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
        setCurrentPage('home');
    };

    const showSaveMessage = (msg) => {
        setSaveMessage(msg);
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const uploadImage = async (file, bucket) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error.message);
            alert('Error uploading image: ' + error.message);
            return null;
        }
    };

    const handleStudentPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showSaveMessage('Uploading photo…');
        const publicUrl = await uploadImage(file, 'students');
        if (publicUrl) {
            setEditStudentData(prev => ({ ...prev, photo: publicUrl, image: publicUrl }));
            showSaveMessage('Photo uploaded! Click Save Changes to apply.');
        }
        e.target.value = '';
    };

    const handleAdmissionPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const publicUrl = await uploadImage(file, 'students');
        if (publicUrl) {
            setAdmissionData(prev => ({ ...prev, photo: publicUrl }));
            showSaveMessage('Admission photo uploaded!');
        }
    };

    // --- ADMISSION FORM PRINTING & SAVING ---
    const printAdmissionForm = async () => {
        const d = admissionData;

        if (!d.studentName.trim()) {
            alert("Please enter Student Name first!");
            return;
        }

        // 1. Save to Supabase
        try {
            const year = new Date().getFullYear();
            // Find the max existing ID number to avoid duplicates after deletions
            const maxNum = students.reduce((max, s) => {
                const match = s.id?.match(/ACS-\d{4}-(\d+)/);
                return match ? Math.max(max, parseInt(match[1], 10)) : max;
            }, 0);
            const nextIdNum = maxNum + 1;
            const studentId = `ACS-${year}-${nextIdNum.toString().padStart(3, '0')}`;

            // Auto-assign serial number — globally unique across ALL students
            let autoSerial = d.serialNumber ? d.serialNumber : null;
            if (!autoSerial) {
                const classStart = CLASS_SERIAL_STARTS?.[d.applyingFor];
                if (classStart !== undefined && classStart !== null) {
                    // Floor: start from class starting serial (or 1 below it)
                    const floor = parseInt(classStart, 10) - 1;
                    // Find the highest serial across ALL students in the entire college
                    const globalMaxSerial = students.reduce((max, s) => {
                        const sn = parseInt(s.serialNumber, 10);
                        return !isNaN(sn) ? Math.max(max, sn) : max;
                    }, floor);
                    // New serial = max(floor, globalMax) + 1
                    autoSerial = String(Math.max(floor, globalMaxSerial) + 1);
                }
            }
            // Also validate if admin manually entered a serial — block duplicates
            if (autoSerial && students.some(s => String(s.serialNumber) === String(autoSerial))) {
                alert(`Serial number ${autoSerial} is already in use by another student. Please assign a unique serial number.`);
                return;
            }

            const newStudentRecord = {
                id: studentId,
                serial_number: autoSerial || null,
                name: d.studentName,
                password: 'acs' + Math.floor(1000 + Math.random() * 9000),
                grade: d.applyingFor,
                image: d.photo,
                fee_history: [],
                admissions: [d],
                results: [],
                attendance: { present: 0, absent: 0, total: 0, percentage: 0 },
                previous_results: []
            };

            const { error } = await supabase.from('students').insert([newStudentRecord]);

            if (error) throw error;

            await fetchData(); // Refresh local state
            showSaveMessage(`Student ${d.studentName} saved with ID: ${studentId}${autoSerial ? ` (Serial: ${autoSerial})` : ''}`);
        } catch (error) {
            console.error("Error saving admission:", error.message);
            alert("Error saving to database, but printing will continue: " + error.message);
        }

        // 2. Print Logic

        // Helper to create boxed character spans
        const boxChars = (str, length, spacing = 0) => {
            const chars = (str || '').replace(/[^A-Z0-9 ]/gi, '').toUpperCase().split('');
            let html = '';
            for (let i = 0; i < length; i++) {
                html += `<span style="display:inline-block;width:20px;height:20px;border:1px solid #000;text-align:center;line-height:20px;font-weight:700;margin-right:${spacing}px;font-size:11px;">${chars[i] === ' ' ? '&nbsp;' : (chars[i] || '')}</span>`;
            }
            return html;
        };

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admission Form - ${d.studentName || 'New Student'}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
                body { margin: 0; padding: 0; background: #f0f0f0; }
                .page { 
                    width: 210mm; 
                    height: 297mm; 
                    margin: 0 auto; 
                    background: #fff; 
                    padding: 12mm 15mm; 
                    position: relative; 
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                .header-container {
                    display: flex;
                    align-items: center;
                    border: 2.5px solid #1e3a8a;
                    padding: 15px 25px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    position: relative;
                    background: linear-gradient(135deg, #ffffff, #f8fafc);
                }
                .header-logo {
                    width: 100px;
                    height: auto;
                    margin-right: 25px;
                }
                .header-text {
                    flex: 1;
                    text-align: center;
                }
                .header-text h1 {
                    margin: 0;
                    font-size: 32px;
                    color: #1e3a8a;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                .header-text p {
                    margin: 4px 0;
                    font-size: 13px;
                    color: #1e40af;
                    font-weight: 600;
                }
                .header-contact {
                    font-size: 16px;
                    font-weight: 800;
                    color: #1e3a8a;
                    margin-top: 5px;
                }
                .section-title { 
                    background: #f97316; 
                    color: #fff; 
                    display: inline-block; 
                    padding: 4px 15px; 
                    font-weight: 800; 
                    border-radius: 4px; 
                    margin: 22px 0 12px; 
                    font-size: 14px; 
                    text-transform: uppercase;
                }
                .field-row { display: flex; align-items: center; margin-bottom: 11px; font-size: 12px; }
                .field-label { width: 130px; font-weight: 700; font-size: 10px; text-transform: uppercase; color: #334155; }
                .boxed-row { display: flex; gap: 1px; }
                .photo-box { 
                    position: absolute; 
                    top: 175px; 
                    right: 15mm; 
                    width: 35mm; 
                    height: 44mm; 
                    border: 2px dashed #64748b; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: center; 
                    text-align: center; 
                    padding: 5px;
                    background: #f8fafc;
                }
                .photo-box b { font-size: 12px; color: #64748b; }
                .photo-box span { font-size: 9px; color: #94a3b8; }
                .checkbox-group { display: flex; gap: 12px; }
                .checkbox { display: flex; align-items: center; gap: 4px; font-weight: 600; }
                .box { width: 13px; height: 13px; border: 1.5px solid #000; }
                .underline { border-bottom: 1.5px solid #e2e8f0; flex: 1; padding: 0 5px; min-height: 18px; font-weight: 700; color: #1e293b; }
                .meta-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 20px; }
                
                @media print {
                    @page { size: A4; margin: 0; }
                    body { 
                        background: #fff; 
                        padding: 0; 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    .page { border: none; box-shadow: none; width: 100%; height: 100vh; padding: 10mm 15mm; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body onload="setTimeout(()=>{window.print();},600)">
            <div class="no-print" style="text-align:center; padding: 16px 20px; background: #1e3a8a; border-bottom: 3px solid #1e40af; display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap;">
                <span style="color:white; font-weight:700; font-size:14px;">📄 To save as PDF: In the print dialog → change <strong>Destination</strong> to <em>"Save as PDF"</em> → click Save</span>
                <button onclick="window.print()" style="padding: 10px 24px; background: white; color: #1e3a8a; border: none; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 14px;">🖨️ Print / Save as PDF</button>
            </div>
            <div class="page">
                ${d.inquiryNo ? `<div style="position:absolute; top:40px; right:40px; color:#dc2626; border:3px solid #dc2626; padding:8px 15px; border-radius:4px; font-weight:900; font-size:16px; transform:rotate(-5deg); z-index:100;">INQUIRY #: ${d.inquiryNo}</div>` : ''}
                <div class="header-container">
                    <img src="/logo.png" class="header-logo" onerror="this.style.display='none'" />
                    <div class="header-text">
                        <h1>ACS School & College</h1>
                        <p>Main Jhang Road Near Attock Petrol Pump, Painsra, Faisalabad</p>
                        <div class="header-contact">📞 0300-1333275</div>
                    </div>
                </div>

                <div class="meta-header">
                    <div>APPLYING FOR: <span style="color:#1e3a8a; border-bottom:1px solid #1e3a8a; min-width:80px; display:inline-block">${d.applyingFor}</span></div>
                    <div>DATE: <span style="color:#1e3a8a; border-bottom:1px solid #1e3a8a; min-width:80px; display:inline-block">${d.applicationDate}</span></div>
                </div>

                <div style="text-align:center; margin: 10px 0;">
                    <span style="background:#1e3a8a; color:#fff; padding:6px 40px; border-radius:6px; font-weight:900; font-size:18px; letter-spacing:1px; border:2px solid #1e3a8a; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">ADMISSION FORM</span>
                </div>

                <div class="photo-box">
                    ${d.photo ? `<img src="${d.photo}" style="width:100%;height:100%;object-fit:cover;" />` : `
                    <b>Photograph</b>
                    <span>(Passport Size)</span>
                    `}
                </div>

                <div class="section-title" style="background:#1e3a8a; margin-top: 45px;">Student's Information</div>
                <p style="font-size:9px; color:#64748b; margin:-4px 0 8px; font-weight:600;">USE CAPITAL LETTERS ONLY</p>

                <div class="field-row">
                    <div class="field-label">Student Name:</div>
                    <div class="boxed-row">${boxChars(d.studentName, 25)}</div>
                </div>

                <div class="field-row">
                    <div class="field-label">B-Form No:</div>
                    <div class="boxed-row">
                        ${(() => {
                            const cleanBForm = (d.bForm || '').replace(/\D/g, '');
                            return `
                                ${boxChars(cleanBForm.substring(0, 5), 5)}
                                <span style="margin:0 2px; font-weight:bold;">-</span>
                                ${boxChars(cleanBForm.substring(5, 12), 7)}
                                <span style="margin:0 2px; font-weight:bold;">-</span>
                                ${boxChars(cleanBForm.substring(12, 13), 1)}
                            `;
                        })()}
                    </div>
                </div>

                <div class="field-row">
                    <div class="field-label">Date of Birth:</div>
                    <div class="boxed-row">
                        ${(() => {
                            const normalizedDob = normalizeDate(d.dob);
                            const parts = normalizedDob.split('-');
                            return `
                                ${boxChars(parts[2] || '', 2)}
                                <span style="margin:0 2px; font-weight:bold;">-</span>
                                ${boxChars(parts[1] || '', 2)}
                                <span style="margin:0 2px; font-weight:bold;">-</span>
                                ${boxChars(parts[0] || '', 4)}
                            `;
                        })()}
                    </div>
                    <div style="margin-left: 15px; font-weight:800; font-size:10px; color:#475569;">NATIONALITY: <span class="underline" style="min-width:100px; display:inline-block">${d.nationality || 'PAKISTANI'}</span></div>
                </div>

                <div class="field-row" style="margin-top:2px;">
                    <div class="field-label">Gender:</div>
                    <div class="checkbox-group">
                        <div class="checkbox"><div class="box" style="${d.gender === 'Male' ? 'background:#1e3a8a' : ''}"></div> MALE</div>
                        <div class="checkbox"><div class="box" style="${d.gender === 'Female' ? 'background:#1e3a8a' : ''}"></div> FEMALE</div>
                    </div>
                    <div style="margin-left: 30px; font-weight:800; font-size:10px; color:#475569;">RELIGION: <span class="underline" style="min-width:130px; display:inline-block">${d.religion || 'ISLAM'}</span></div>
                </div>

                <div class="section-title" style="background:#0f766e">Health & Medical Info</div>
                <div class="field-row">
                    <div class="field-label" style="width:100px;">Allergies:</div>
                    <div class="checkbox-group">
                        <div class="checkbox"><div class="box" style="${d.allergies === 'Yes' ? 'background:#0f766e' : ''}"></div> YES</div>
                        <div class="checkbox"><div class="box" style="${d.allergies === 'No' ? 'background:#0f766e' : ''}"></div> NO</div>
                    </div>
                    <div style="margin-left:20px; font-weight:700; font-size:10px;">DETAILS: <span class="underline">${d.allergiesDetails}</span></div>
                </div>
                <div class="field-row">
                    <div class="field-label" style="width:160px;">Chronic Condition:</div>
                    <div class="checkbox-group">
                        <div class="checkbox"><div class="box" style="${d.chronicCondition === 'Yes' ? 'background:#0f766e' : ''}"></div> YES</div>
                        <div class="checkbox"><div class="box" style="${d.chronicCondition === 'No' ? 'background:#0f766e' : ''}"></div> NO</div>
                    </div>
                    <div style="margin-left:20px; font-weight:700; font-size:10px;">DETAILS: <span class="underline">${d.chronicConditionDetails}</span></div>
                </div>
                <div class="field-row">
                    <div class="field-label" style="width:220px;">Regular Medication:</div>
                    <div class="checkbox-group">
                        <div class="checkbox"><div class="box" style="${d.medication === 'Yes' ? 'background:#0f766e' : ''}"></div> YES</div>
                        <div class="checkbox"><div class="box" style="${d.medication === 'No' ? 'background:#0f766e' : ''}"></div> NO</div>
                    </div>
                    <div style="margin-left:20px; font-weight:700; font-size:10px; flex:1;">DETAILS: <span class="underline">${d.medicationDetails}</span></div>
                </div>

                <div class="section-title" style="background:#b91c1c">Parents Information</div>
                <div class="field-row">
                    <div class="field-label">Father Name:</div>
                    <div class="boxed-row">${boxChars(d.fatherName, 25)}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Father CNIC:</div>
                    <div class="boxed-row">
                        ${(() => {
                            const cleanCNIC = (d.fatherCnic || '').replace(/\D/g, '');
                            return `
                                ${boxChars(cleanCNIC.substring(0, 5), 5)}
                                <span style="margin:0 2px; font-weight:bold;">-</span>
                                ${boxChars(cleanCNIC.substring(5, 12), 7)}
                                <span style="margin:0 2px; font-weight:bold;">-</span>
                                ${boxChars(cleanCNIC.substring(12, 13), 1)}
                            `;
                        })()}
                    </div>
                    <div style="margin-left:15px; font-weight:800; font-size:10px; color:#475569;">CONTACT: <span class="underline" style="min-width:130px; display:inline-block">${d.contact}</span></div>
                </div>
                <div class="field-row" style="margin-top:5px;">
                    <div class="field-label">Address:</div>
                    <span class="underline">${d.address}</span>
                    <div style="margin-left:15px; font-weight:800; font-size:10px; color:#475569;">WHATSAPP: <span class="underline" style="min-width:120px; display:inline-block">${d.whatsapp}</span></div>
                </div>
                <div class="field-row" style="margin-top:5px;">
                    <div class="field-label">Agreed Monthly Fee:</div>
                    <div class="underline" style="max-width:200px">RS ${d.monthlyFee || '__________'}</div>
                </div>

                <div class="section-title" style="background:#1e293b; padding: 3px 20px;">UNDERTAKING</div>
                <div style="font-size:10px; line-height:1.5; color:#334155; padding: 0 10px;">
                    <b>I solemnly declare that:</b>
                    <div style="margin-left:15px;">
                        • I will abide by all rules and regulations of the school.<br>
                        • I will pay all dues/fees promptly as per schedule.<br>
                        • <span style="color:#b91c1c; font-weight:700;">All information provided above is correct and true.</span><br>
                        • Fees once paid are <span style="font-weight:700;">non-refundable</span> in any situation.<br>
                        • Admission is provisional until all required documents are submitted.
                    </div>
                </div>
                
                <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                    <div style="text-align:center; width:180px; border-top:1.5px solid #1e293b; padding-top:5px; font-size:11px; font-weight:800; color:#1e293b;">PARENT'S SIGNATURE</div>
                </div>

                <div class="section-title" style="background:#4338ca">Required Documents</div>
                <div style="display:flex; gap:30px; font-size:10px; font-weight:700; margin-left:10px; color:#4338ca;">
                    <div class="checkbox"><div class="box" style="${d.docs.photos ? 'background:#4338ca' : ''}"></div> 4 PASSPORT PHOTOS</div>
                    <div class="checkbox"><div class="box" style="${d.docs.bform ? 'background:#4338ca' : ''}"></div> COPY OF B-FORM</div>
                    <div class="checkbox"><div class="box" style="${d.docs.cnic ? 'background:#4338ca' : ''}"></div> COPY OF PARENT CNIC</div>
                </div>

                <div style="display:flex; justify-content:flex-end; margin-top:15px;">
                    <div style="text-align:center; width:180px; border-top:1.5px solid #1e293b; padding-top:5px; font-size:11px; font-weight:800; color:#b91c1c;">PRINCIPAL'S SIGNATURE</div>
                </div>

                <!-- Footer Line -->
                <div style="position:absolute; bottom:15mm; left:20mm; right:20mm; height:1px; background:#e2e8f0;"></div>
            </div>
        </body>
        </html>`;

        const printWin = window.open('', '_blank');
        if (!printWin) {
            alert("Popup blocked! Please allow popups for this website to print the admission form.");
            return;
        }
        printWin.document.write(html);
        printWin.document.close();
    };

    const printInquiryRecord = (inquiry) => {
        const schoolName = schoolData.name || 'ACS School';
        const today = new Date().toLocaleDateString('en-GB');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Inquiry Record - ${inquiry.inquiry_no}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; background: #f8fafc; }
                .card { background: white; max-width: 500px; margin: auto; padding: 30px; border-top: 6px solid #1a3a6b; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
                .header h1 { margin: 0; color: #1a3a6b; font-size: 22px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f8fafc; }
                .label { color: #64748b; font-weight: 600; font-size: 13px; }
                .value { color: #1e293b; font-weight: 800; font-size: 14px; }
                .inq-no { background: #fef08a; color: #854d0e; padding: 5px 12px; border-radius: 6px; font-weight: 800; display: inline-block; margin-bottom: 20px; }
                @media print { .no-print { display: none; } body { background: white; padding: 20px; } .card { box-shadow: none; border: 2px solid #1a3a6b; } }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <h1>${schoolName}</h1>
                    <p style="color: #64748b; font-size: 12px; margin-top: 5px;">Prospective Student Inquiry</p>
                </div>
                
                <div style="text-align: center;">
                    <div class="inq-no">INQUIRY #: ${inquiry.inquiry_no}</div>
                </div>

                <div class="row"><span class="label">Name:</span> <span class="value">${inquiry.name}</span></div>
                <div class="row"><span class="label">Contact:</span> <span class="value">${inquiry.contact}</span></div>
                <div class="row"><span class="label">Applying For:</span> <span class="value">${inquiry.class_applying || '—'}</span></div>
                
                <div style="margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fafafa;">
                    <div style="font-size: 11px; font-weight: 700; color: #1a3a6b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">FEE STRUCTURE</div>
                    <div class="row" style="border:none; margin:0; padding:4px 0;"><span class="label" style="font-size:11px;">Admission Fee:</span> <span class="value" style="font-size:11px;">Rs. ${inquiry.admission_fee || 0}</span></div>
                    <div class="row" style="border:none; margin:0; padding:4px 0;"><span class="label" style="font-size:11px;">Monthly Fee:</span> <span class="value" style="font-size:11px;">Rs. ${inquiry.monthly_fee || 0}</span></div>
                    <div class="row" style="border:none; margin:0; padding:4px 0;"><span class="label" style="font-size:11px;">Paper Fund:</span> <span class="value" style="font-size:11px;">Rs. ${inquiry.paper_fund || 0}</span></div>
                    <div class="row" style="border:none; margin:0; padding:10px 0 0 0; border-top: 1.5px solid #1a3a6b;"><span class="label" style="color:#1a3a6b; font-weight:800;">TOTAL AGREED:</span> <span class="value" style="color:#1a3a6b; font-size:15px;">Rs. ${inquiry.quoted_fee || 0}</span></div>
                </div>

                <div class="row"><span class="label">Date:</span> <span class="value">${new Date(inquiry.created_at).toLocaleDateString('en-GB')}</span></div>
                
                <div style="margin-top: 20px;">
                    <div class="label" style="margin-bottom: 8px;">Notes:</div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 13px; color: #475569; min-height: 60px;">${inquiry.notes || 'No additional notes provided.'}</div>
                </div>

                <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; font-style: italic;">
                    Please bring this slip for admission confirmation.<br>
                    Generated on ${today}
                </div>
            </div>
            <div style="text-align:center; margin-top: 20px;" class="no-print">
                <button onclick="window.print()" style="padding: 10px 25px; background: #1a3a6b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;">Print Slip</button>
            </div>
        </body>
        </html>
        `;

        const win = window.open('', '_blank');
        if (!win) {
            alert("Popup blocked! Please allow popups to print inquiry records.");
            return;
        }
        win.document.write(html);
        win.document.close();
    };

    const printFeeVoucher = (inquiry, feeDetails) => {
        const { admissionFee, paperFund, monthlyFee } = feeDetails;
        const total = Number(admissionFee) + Number(paperFund) + Number(monthlyFee);
        const schoolName = schoolData.name || 'ACS School';
        const today = new Date().toLocaleDateString('en-GB');
        const voucherNo = `V-${Math.floor(Math.random() * 90000) + 10000}`;

        const generatePart = (label) => `
            <div style="flex: 1; border: 1.5px solid #1a3a6b; padding: 15px; background: white; position: relative; min-width: 0;">
                <div style="background: #1a3a6b; color: white; padding: 8px; text-align: center; font-weight: 800; font-size: 13px; margin: -15px -15px 15px -15px; text-transform: uppercase;">
                    ${schoolName}
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px;">
                    <div style="font-size: 10px; font-weight: 700; color: #1a3a6b;">${label}</div>
                    <div style="font-size: 9px; color: #64748b;">${today}</div>
                </div>

                <div style="background: #fef08a; display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 800; color: #854d0e; margin-bottom: 10px;">
                    INQ #: ${inquiry.inquiry_no}
                </div>

                <div style="font-size: 11px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>Name:</strong> ${inquiry.name}</div>
                <div style="font-size: 11px; margin-bottom: 5px;"><strong>Class:</strong> ${inquiry.class_applying || '—'}</div>
                <div style="font-size: 11px; margin-bottom: 15px;"><strong>Voucher #:</strong> ${voucherNo}</div>

                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 6px 0;">Admission Fee</td>
                        <td style="text-align: right; padding: 6px 0;">Rs. ${admissionFee}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 6px 0;">Paper Fund</td>
                        <td style="text-align: right; padding: 6px 0;">Rs. ${paperFund}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 6px 0;">Monthly Fee</td>
                        <td style="text-align: right; padding: 6px 0;">Rs. ${monthlyFee}</td>
                    </tr>
                    <tr style="font-weight: 900; color: #1a3a6b; font-size: 12px; border-top: 2px solid #1a3a6b;">
                        <td style="padding: 10px 0;">TOTAL</td>
                        <td style="text-align: right; padding: 10px 0;">Rs. ${total}</td>
                    </tr>
                </table>

                <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 8px; color: #64748b;">
                    <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 5px;">Depositor Signature</div>
                    <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 5px;">Cashier Signature</div>
                </div>
            </div>
        `;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Fee Voucher - ${inquiry.inquiry_no}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: #f1f5f9; }
                .container { display: flex; gap: 15px; max-width: 1100px; margin: auto; }
                @media print { 
                    .no-print { display: none; }
                    body { background: white; padding: 0; }
                    .container { gap: 0; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align:center; padding: 20px;">
                <button onclick="window.print()" style="padding: 12px 30px; background: #1a3a6b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 800;">Print 3-Part Voucher</button>
            </div>
            <div class="container">
                ${generatePart('BANK COPY')}
                <div style="width: 1px; border-left: 1px dashed #94a3b8; margin: 0 5px;"></div>
                ${generatePart('OFFICE COPY')}
                <div style="width: 1px; border-left: 1px dashed #94a3b8; margin: 0 5px;"></div>
                ${generatePart('STUDENT COPY')}
            </div>
        </body>
        </html>
        `;

        const win = window.open('', '_blank');
        if (!win) {
            alert("Popup blocked! Please allow popups to print fee vouchers.");
            return;
        }
        win.document.write(html);
        win.document.close();
    };

    // ── Shared: build a single admission form page HTML from student data ──
    const buildAdmissionFormHTML = (d) => {
        const boxChars = (str, length, spacing = 0) => {
            const chars = String(str || '').replace(/[^A-Z0-9 ]/gi, '').toUpperCase().split('');
            let html = '';
            for (let i = 0; i < length; i++) {
                html += `<span style="display:inline-block;width:20px;height:20px;border:1px solid #000;text-align:center;line-height:20px;font-weight:700;margin-right:${spacing}px;font-size:11px;">${chars[i] === ' ' ? '&nbsp;' : (chars[i] || '')}</span>`;
            }
            return html;
        };
        const bForm = String(d.bForm || d.admissions?.[0]?.bForm || '');
        const fatherCnic = String(d.fatherCnic || d.admissions?.[0]?.fatherCnic || '');
        const adm = d.admissions?.[0] || {};
        const studentName = d.studentName || d.name || '';
        const applyingFor = d.applyingFor || d.grade || '';
        const applicationDate = d.applicationDate || adm.applicationDate || new Date().toISOString().split('T')[0];
        const dob = String(d.dob || adm.dob || '');
        const nationality = d.nationality || adm.nationality || 'PAKISTANI';
        const gender = d.gender || adm.gender || '';
        const religion = d.religion || adm.religion || 'ISLAM';
        const photo = d.photo || d.image || '';
        const allergies = d.allergies || adm.allergies || 'No';
        const allergiesDetails = d.allergiesDetails || adm.allergiesDetails || '';
        const chronicCondition = d.chronicCondition || adm.chronicCondition || 'No';
        const chronicConditionDetails = d.chronicConditionDetails || adm.chronicConditionDetails || '';
        const medication = d.medication || adm.medication || 'No';
        const medicationDetails = d.medicationDetails || adm.medicationDetails || '';
        const fatherName = d.fatherName || adm.fatherName || '';
        const contact = d.contact || adm.contact || '';
        const address = d.address || adm.address || '';
        const whatsapp = d.whatsapp || adm.whatsapp || '';
        const serialNumber = d.serialNumber || d.serial_number || '';
        const monthlyFee = d.monthlyFee || adm.monthlyFee || '';
        const docs = d.docs || { photos: false, bform: false, cnic: false };
        return `
        <div class="page">
            <div class="header-container">
                <img src="/logo.png" class="header-logo" onerror="this.style.display='none'" />
                <div class="header-text">
                    <h1>ACS School &amp; College</h1>
                    <p>Main Jhang Road Near Attock Petrol Pump, Painsra, Faisalabad</p>
                    <div class="header-contact">📞 0300-1333275</div>
                </div>
            </div>
            <div class="meta-header">
                <div>APPLYING FOR: <span style="color:#1e3a8a;border-bottom:1px solid #1e3a8a;min-width:80px;display:inline-block">${applyingFor}</span></div>
                ${serialNumber ? `<div>SERIAL #: <span style="color:#7c3aed;font-weight:900">${serialNumber}</span></div>` : ''}
                <div>DATE: <span style="color:#1e3a8a;border-bottom:1px solid #1e3a8a;min-width:80px;display:inline-block">${applicationDate}</span></div>
            </div>
            <div style="text-align:center;margin:10px 0">
                <span style="background:#1e3a8a;color:#fff;padding:6px 40px;border-radius:6px;font-weight:900;font-size:18px;letter-spacing:1px;border:2px solid #1e3a8a">ADMISSION FORM</span>
            </div>
            <div class="photo-box">
                ${photo ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover" />` : '<b>Photograph</b><span>(Passport Size)</span>'}
            </div>
            <div class="section-title" style="background:#1e3a8a; margin-top: 35px;">Student's Information</div>
            <p style="font-size:9px;color:#64748b;margin:-4px 0 8px;font-weight:600">USE CAPITAL LETTERS ONLY</p>
            <div class="field-row"><div class="field-label">Student Name:</div><div class="boxed-row">${boxChars(studentName, 25)}</div></div>
            <div class="field-row"><div class="field-label">B-Form No:</div><div class="boxed-row">${(() => { const clean = bForm.replace(/\D/g, ''); return boxChars(clean.substring(0, 5), 5) + '<span style="margin:0 2px;font-weight:bold">-</span>' + boxChars(clean.substring(5, 12), 7) + '<span style="margin:0 2px;font-weight:bold">-</span>' + boxChars(clean.substring(12, 13), 1); })()}</div></div>
            <div class="field-row"><div class="field-label">Date of Birth:</div><div class="boxed-row">${(() => { const normalized = normalizeDate(dob); const parts = normalized.split('-'); return boxChars(parts[2] || '', 2) + '<span style="margin:0 2px;font-weight:bold">-</span>' + boxChars(parts[1] || '', 2) + '<span style="margin:0 2px;font-weight:bold">-</span>' + boxChars(parts[0] || '', 4); })()}</div><div style="margin-left:15px;font-weight:800;font-size:10px;color:#475569">NATIONALITY: <span class="underline" style="min-width:100px;display:inline-block">${nationality}</span></div></div>
            <div class="field-row" style="margin-top:2px"><div class="field-label">Gender:</div><div class="checkbox-group"><div class="checkbox"><div class="box" style="${gender === 'Male' ? 'background:#1e3a8a' : ''}"></div> MALE</div><div class="checkbox"><div class="box" style="${gender === 'Female' ? 'background:#1e3a8a' : ''}"></div> FEMALE</div></div><div style="margin-left:30px;font-weight:800;font-size:10px;color:#475569">RELIGION: <span class="underline" style="min-width:130px;display:inline-block">${religion}</span></div></div>
            <div class="section-title" style="background:#0f766e">Health &amp; Medical Info</div>
            <div class="field-row"><div class="field-label" style="width:100px">Allergies:</div><div class="checkbox-group"><div class="checkbox"><div class="box" style="${allergies === 'Yes' ? 'background:#0f766e' : ''}"></div> YES</div><div class="checkbox"><div class="box" style="${allergies === 'No' ? 'background:#0f766e' : ''}"></div> NO</div></div><div style="margin-left:20px;font-weight:700;font-size:10px">DETAILS: <span class="underline">${allergiesDetails}</span></div></div>
            <div class="field-row"><div class="field-label" style="width:160px">Chronic Condition:</div><div class="checkbox-group"><div class="checkbox"><div class="box" style="${chronicCondition === 'Yes' ? 'background:#0f766e' : ''}"></div> YES</div><div class="checkbox"><div class="box" style="${chronicCondition === 'No' ? 'background:#0f766e' : ''}"></div> NO</div></div><div style="margin-left:20px;font-weight:700;font-size:10px">DETAILS: <span class="underline">${chronicConditionDetails}</span></div></div>
            <div class="field-row"><div class="field-label" style="width:220px">Regular Medication:</div><div class="checkbox-group"><div class="checkbox"><div class="box" style="${medication === 'Yes' ? 'background:#0f766e' : ''}"></div> YES</div><div class="checkbox"><div class="box" style="${medication === 'No' ? 'background:#0f766e' : ''}"></div> NO</div></div><div style="margin-left:20px;font-weight:700;font-size:10px;flex:1">DETAILS: <span class="underline">${medicationDetails}</span></div></div>
            <div class="section-title" style="background:#b91c1c">Parents Information</div>
            <div class="field-row"><div class="field-label">Father Name:</div><div class="boxed-row">${boxChars(fatherName, 25)}</div></div>
            <div class="field-row"><div class="field-label">Father CNIC:</div><div class="boxed-row">${(() => { const clean = fatherCnic.replace(/\D/g, ''); return boxChars(clean.substring(0, 5), 5) + '<span style="margin:0 2px;font-weight:bold">-</span>' + boxChars(clean.substring(5, 12), 7) + '<span style="margin:0 2px;font-weight:bold">-</span>' + boxChars(clean.substring(12, 13), 1); })()}</div><div style="margin-left:15px;font-weight:800;font-size:10px;color:#475569">CONTACT: <span class="underline" style="min-width:130px;display:inline-block">${contact}</span></div></div>
            <div class="field-row" style="margin-top:5px"><div class="field-label">Address:</div><span class="underline">${address}</span><div style="margin-left:15px;font-weight:800;font-size:10px;color:#475569">WHATSAPP: <span class="underline" style="min-width:120px;display:inline-block">${whatsapp}</span></div></div>
            <div class="field-row" style="margin-top:5px"><div class="field-label">Agreed Monthly Fee:</div><div class="underline" style="max-width:200px">RS ${monthlyFee || '__________'}</div></div>
            <div class="section-title" style="background:#1e293b;padding:3px 20px">UNDERTAKING</div>
            <div style="font-size:10px;line-height:1.5;color:#334155;padding:0 10px">
                <b>I solemnly declare that:</b>
                <div style="margin-left:15px">• I will abide by all rules and regulations of the school.<br>• I will pay all dues/fees promptly as per schedule.<br>• <span style="color:#b91c1c;font-weight:700">All information provided above is correct and true.</span><br>• Fees once paid are <span style="font-weight:700">non-refundable</span> in any situation.<br>• Admission is provisional until all required documents are submitted.</div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:15px">
                <div style="text-align:center;width:180px;border-top:1.5px solid #1e293b;padding-top:5px;font-size:11px;font-weight:800;color:#1e293b">PARENT'S SIGNATURE</div>
            </div>
            <div class="section-title" style="background:#4338ca">Required Documents</div>
            <div style="display:flex;gap:30px;font-size:10px;font-weight:700;margin-left:10px;color:#4338ca">
                <div class="checkbox"><div class="box" style="${docs.photos ? 'background:#4338ca' : ''}"></div> 4 PASSPORT PHOTOS</div>
                <div class="checkbox"><div class="box" style="${docs.bform ? 'background:#4338ca' : ''}"></div> COPY OF B-FORM</div>
                <div class="checkbox"><div class="box" style="${docs.cnic ? 'background:#4338ca' : ''}"></div> COPY OF PARENT CNIC</div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:15px">
                <div style="text-align:center;width:180px;border-top:1.5px solid #1e293b;padding-top:5px;font-size:11px;font-weight:800;color:#b91c1c">PRINCIPAL'S SIGNATURE</div>
            </div>
            <div style="position:absolute;bottom:10mm;left:20mm;right:20mm;height:1px;background:#e2e8f0"></div>
        </div>`;
    };

    // ── Bulk Admission Form Printing ──
    // mode: 'student' (by ID) | 'class' (by class name) | 'college' (all)
    const printAdmissionFormBulk = (mode, value) => {
        let targetStudents = [];
        if (mode === 'student') {
            const s = students.find(st => st.id === value);
            if (!s) { alert('Student not found.'); return; }
            targetStudents = [s];
        } else if (mode === 'class') {
            targetStudents = students.filter(s => String(s.grade || '').toLowerCase() === String(value || '').toLowerCase() && (s.status || 'active') === 'active');
            if (targetStudents.length === 0) { alert(`No active students found in class "${value}".`); return; }
        } else if (mode === 'college') {
            targetStudents = students.filter(s => (s.status || 'active') === 'active');
            if (targetStudents.length === 0) { alert('No active students found.'); return; }
        }
        // Sort by serial, then name
        targetStudents.sort((a, b) => {
            const sa = parseInt(a.serialNumber, 10), sb = parseInt(b.serialNumber, 10);
            if (!isNaN(sa) && !isNaN(sb)) return sa - sb;
            return (a.name || '').localeCompare(b.name || '');
        });
        const sharedCSS = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
            body { margin: 0; padding: 0; background: #f0f0f0; }
            .page { width:210mm; min-height:297mm; margin:0 auto; background:#fff; padding:12mm 15mm; position:relative; box-shadow:0 0 10px rgba(0,0,0,0.1); page-break-after:always; }
            .header-container { display:flex; align-items:center; border:2.5px solid #1e3a8a; padding:10px 20px; border-radius:12px; margin-bottom:15px; position:relative; background:linear-gradient(135deg,#ffffff,#f8fafc); }
            .header-logo { width:80px; height:auto; margin-right:20px; }
            .header-text { flex:1; text-align:center; }
            .header-text h1 { margin:0; font-size:28px; color:#1e3a8a; font-weight:800; letter-spacing:1px; text-transform:uppercase; }
            .header-text p { margin:4px 0; font-size:12px; color:#1e40af; font-weight:600; }
            .header-contact { font-size:15px; font-weight:800; color:#1e3a8a; margin-top:4px; }
            .section-title { background:#f97316; color:#fff; display:inline-block; padding:4px 15px; font-weight:800; border-radius:4px; margin:16px 0 10px; font-size:14px; text-transform:uppercase; }
            .field-row { display:flex; align-items:center; margin-bottom:9px; font-size:12px; }
            .field-label { width:130px; font-weight:700; font-size:10px; text-transform:uppercase; color:#334155; }
            .boxed-row { display:flex; gap:1px; }
            .photo-box { position:absolute; top:155px; right:15mm; width:35mm; height:44mm; border:2px dashed #64748b; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:5px; background:#f8fafc; }
            .photo-box b { font-size:12px; color:#64748b; } .photo-box span { font-size:9px; color:#94a3b8; }
            .checkbox-group { display:flex; gap:12px; }
            .checkbox { display:flex; align-items:center; gap:4px; font-weight:600; }
            .box { width:13px; height:13px; border:1.5px solid #000; }
            .underline { border-bottom:1.5px solid #e2e8f0; flex:1; padding:0 5px; min-height:16px; font-weight:700; color:#1e293b; }
            .meta-header { display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#475569; margin-bottom:15px; }
            @media print { @page { size:A4; margin:0; } body { background:#fff; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; } .page { border:none; box-shadow:none; width:100%; padding:5mm 15mm; } .no-print { display:none!important; } }
        `;
        const pagesHTML = targetStudents.map(s => buildAdmissionFormHTML(s)).join('');
        const printWin = window.open('', '_blank');
        if (!printWin) {
            alert("Popup blocked! Please allow popups for this website to print forms.");
            return;
        }
        printWin.document.write(`<!DOCTYPE html><html><head><title>Admission Forms — ${mode === 'student' ? value : mode === 'class' ? value : 'All College'}</title><style>${sharedCSS}</style></head><body onload="setTimeout(()=>{window.print();},600)"><div class="no-print" style="text-align:center;padding:16px 20px;background:#1e3a8a;border-bottom:3px solid #1e40af;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;"><span style="color:white;font-weight:700;font-size:14px;">📄 To save as PDF: change <strong>Destination</strong> to <em>"Save as PDF"</em> in the dialog → click Save</span><button onclick="window.print()" style="padding:10px 24px;background:white;color:#1e3a8a;border:none;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;">🖨️ Print / Save as PDF (${targetStudents.length} form${targetStudents.length !== 1 ? 's' : ''})</button></div>${pagesHTML}</body></html>`);
        printWin.document.close();
    };


    // --- GRADE HELPER ---
    const percentageToGrade = (num) => {
        if (num === 'Absent' || num === 'A') return 'Absent';
        if (num >= 95) return 'A++';
        if (num >= 90) return 'A+';
        if (num >= 85) return 'A';
        if (num >= 80) return 'B++';
        if (num >= 75) return 'B+';
        if (num >= 70) return 'B';
        if (num >= 60) return 'C';
        if (num >= 50) return 'D';
        if (num >= 40) return 'E';
        return 'U';
    };

    const gradeToRemark = (grade) => {
        switch (grade) {
            case 'A++': return 'Absolutely Outstanding! Your dedication and hard work truly paid off. Keep up the amazing effort! Incredible achievement!';
            case 'A+': return 'Excellent work! Fantastic results';
            case 'A': return 'Adorable!';
            case 'B++': return 'Great job';
            case 'B+': return 'Well done!';
            case 'B': return 'Good progress. Keep it up! You have potential to do even better!';
            case 'C': return 'Satisfactory! Don’t be discouraged! DO More';
            case 'D': return 'Don’t give up! We’re here to help you';
            case 'E': return 'Performance needs serious improvement. Strong effort and consistent support are urgently needed. We believe in your potential—let’s work together to improve!';
            case 'U': return 'Unsatisfactory!';
            case 'Absent': return 'Student was absent.';
            default: return '';
        }
    };

    // --- PHOTO UPLOAD FUNCTION ---
    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedStudent) return;

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showSaveMessage('File too large! Max 2MB.');
            return;
        }

        const publicUrl = await uploadImage(file, 'students');
        if (publicUrl) {
            const { error } = await supabase
                .from('students')
                .update({ image: publicUrl }) // Update 'image' column in DB
                .eq('id', selectedStudent);

            if (error) {
                alert('Error updating student: ' + error.message);
            } else {
                await fetchData();
                showSaveMessage('Student photo updated!');
            }
        }
        e.target.value = ''; // Reset input
    };

    // --- MARKS FUNCTIONS ---
    const startEditingMarks = () => {
        if (!selectedStudent) return;
        const student = students.find(s => s.id === selectedStudent);
        setTempMarks(student.results.map(r => ({ ...r })));
        setEditingMarks(true);
    };

    const handleMarkChange = (index, field, value) => {
        const updated = [...tempMarks];
        if (field === 'percentage' || field === 'obtained') {
            const num = parseInt(value) || 0;
            const total = updated[index].total || 100;
            updated[index].obtained = Math.min(total, Math.max(0, num));
            const pct = Math.round((updated[index].obtained / total) * 100);
            updated[index].percentage = pct;
            updated[index].grade = percentageToGrade(pct);
        }
        setTempMarks(updated);
    };

    const saveMarks = async () => {
        const student = students.find(s => s.id === selectedStudent);
        if (!student) return;

        const { error } = await supabase
            .from('students')
            .update({ results: [...tempMarks] })
            .eq('id', selectedStudent);

        if (!error) {
            fetchData();
            setEditingMarks(false);
            showSaveMessage('Marks saved successfully!');
        }
    };

    // --- MARKS EXCEL EXPORT ---
    const exportMarksExcel = (overrideName = null, overrideSubjects = null) => {
        const filteredStudents = students.filter(s => getBaseClass(s.grade) === getBaseClass(selectedClass) && (s.status || 'active') === 'active');
        if (filteredStudents.length === 0) {
            alert('No students found in this class.');
            return;
        }

        const nameToUse = overrideName || assessmentName || 'Assessment';
        const subjectsList = overrideSubjects || (filteredStudents[0].results.length > 0 ? filteredStudents[0].results.map(r => ({ name: r.subject, total: r.total || 100 })) : []);

        const rows = filteredStudents.map(student => {
            const row = {
                'Student ID': student.id,
                'Student Name': student.name,
                'Class': student.grade
            };

            subjectsList.forEach(sub => {
                const res = student.results.find(r => r.subject === sub.name);
                row[`${sub.name} (Total: ${sub.total})`] = res ? (res.obtained !== undefined ? res.obtained : res.percentage) : 0;
            });

            return row;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Marks');

        const fileName = `Marks_${selectedClass.replace(/ /g, '_')}_${nameToUse.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showSaveMessage(`Marks template for ${nameToUse} exported!`);
    };

    // --- MARKS EXCEL IMPORT ---
    const importMarksExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    alert("No data found in Excel sheet.");
                    return;
                }

                const headers = Object.keys(data[0]);
                const subjectCols = headers.filter(h => h.includes('(Total:'));

                const subjectsInfo = subjectCols.map(col => {
                    const match = col.match(/(.*) \(Total: (\d+)\)/);
                    return {
                        column: col,
                        name: match ? match[1].trim() : col,
                        total: match ? parseInt(match[2]) : 100
                    };
                });

                let invalidCount = 0;
                const updatedStudents = students.map(s => {
                    const excelRow = data.find(row => row['Student ID'] === s.id);
                    if (excelRow) {
                        const updatedResults = s.results.map(res => {
                            const subInfo = subjectsInfo.find(info => info.name === res.subject);
                            if (subInfo) {
                                const obtainedValue = excelRow[subInfo.column];
                                const obtained = parseInt(obtainedValue);

                                if (!isNaN(obtained)) {
                                    if (obtained > subInfo.total) {
                                        invalidCount++;
                                        return res;
                                    }
                                    const pct = Math.round((obtained / subInfo.total) * 100);
                                    return {
                                        ...res,
                                        obtained: obtained,
                                        percentage: pct,
                                        grade: percentageToGrade(pct)
                                    };
                                }
                            }
                            return res;
                        });
                        return { ...s, results: updatedResults };
                    }
                    return s;
                });

                if (invalidCount > 0) {
                    alert(`Import finished with ${invalidCount} entries skipped because obtained marks exceeded total marks.`);
                }

                setStudents(updatedStudents);
                showSaveMessage(`Marks imported for ${data.length} students.`);
            } catch (err) {
                console.error(err);
                alert('Error processing file. Please ensure it follows the exported template format.');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };


    // --- ATTENDANCE FUNCTIONS ---
    // Stores day-by-day records: attendance = { records: [{date, status}], total, present, absent, percentage }
    const markAttendance = async (studentId, status, targetDate = null) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const dateToMark = targetDate || attDateFilter || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const oldAtt = student.attendance || {};
        const records = [...(oldAtt.records || [])];

        // Prevent duplicate entry for same day
        const existingIdx = records.findIndex(r => r.date === dateToMark);
        if (existingIdx >= 0) {
            records[existingIdx] = { date: dateToMark, status }; // overwrite target date's entry
        } else {
            records.push({ date: dateToMark, status });
        }

        // Recompute totals — 'leave', 'late' count as present for percentage. 'holiday' is ignored.
        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const leave = records.filter(r => r.status === 'leave').length;
        const late = records.filter(r => r.status === 'late').length;
        const holiday = records.filter(r => r.status === 'holiday').length;
        const total = records.filter(r => r.status !== 'holiday').length;

        // Holiday records are excluded from the denominator
        const presentForPct = present + leave + late;
        const effectiveTotal = total;
        const percentage = effectiveTotal > 0 ? parseFloat(((presentForPct / effectiveTotal) * 100).toFixed(1)) : 0;

        const newAttendance = { records, total, present, absent, leave, late, holiday, percentage };

        const { error } = await supabase
            .from('students')
            .update({ attendance: newAttendance })
            .eq('id', studentId);

        if (!error) {
            fetchData();
            const statusLabel = status === 'present' ? '✓ Present' : status === 'absent' ? '✗ Absent' : status === 'leave' ? '📋 Leave' : status === 'holiday' ? '🌴 Holiday' : '⏰ Late';
            showSaveMessage(`${statusLabel} marked for ${student.name} on ${dateToMark}!`);
        }
    };

    // Undo/remove a specific date record for a student
    const removeAttendanceRecord = async (studentId, dateStr) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        const oldAtt = student.attendance || {};
        const records = (oldAtt.records || []).filter(r => r.date !== dateStr);

        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const leave = records.filter(r => r.status === 'leave').length;
        const late = records.filter(r => r.status === 'late').length;
        const holiday = records.filter(r => r.status === 'holiday').length;
        const total = records.filter(r => r.status !== 'holiday').length;

        const presentForPct = present + leave + late;
        const effectiveTotal = total;
        const percentage = effectiveTotal > 0 ? parseFloat(((presentForPct / effectiveTotal) * 100).toFixed(1)) : 0;

        const newAttendance = { records, total, present, absent, leave, late, holiday, percentage };
        await supabase.from('students').update({ attendance: newAttendance }).eq('id', studentId);
        fetchData();
        showSaveMessage(`Record for ${dateStr} removed.`);
    };

    // --- ATTENDANCE EXCEL EXPORT ---
    const exportAttendanceExcel = () => {
        const filteredStudents = students.filter(s => getBaseClass(s.grade) === getBaseClass(selectedClass) && (s.status || 'active') === 'active');
        const today = new Date().toLocaleDateString();
        const rows = filteredStudents.map(s => ({
            'Student ID': s.id,
            'Student Name': s.name,
            'Grade': s.grade,
            'Date': today,
            'Status (Present/Absent)': '',
            'Instructions': 'Enter P or A in the Status column'
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 12 }, { wch: 25 }, { wch: 10 },
            { wch: 14 }, { wch: 22 }, { wch: 30 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
        XLSX.writeFile(wb, `Attendance_${selectedClass.replace(/ /g, '_')}_${today.replace(/\//g, '-')}.xlsx`);
        showSaveMessage(`Attendance for ${selectedClass} exported!`);
    };

    // --- ATTENDANCE EXCEL IMPORT ---
    const importAttendanceExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                let updateCount = 0;
                const updatedStudents = students.map(s => {
                    const row = data.find(r => r['Student ID'] === s.id);
                    if (row && row['Status (Present/Absent)']) {
                        const status = row['Status (Present/Absent)'].toString().toLowerCase().trim();
                        let statusType = '';
                        if (status === 'present' || status === 'p') statusType = 'present';
                        else if (status === 'absent' || status === 'a') statusType = 'absent';
                        else if (status === 'leave' || status === 'l') statusType = 'leave';
                        else if (status === 'late' || status === 'lt') statusType = 'late';
                        else if (status === 'holiday' || status === 'h') statusType = 'holiday';

                        if (statusType) {
                            updateCount++;
                            const today = new Date().toISOString().split('T')[0];
                            const records = [...(s.attendance?.records || [])];
                            const idx = records.findIndex(r => r.date === today);
                            if (idx >= 0) records[idx] = { date: today, status: statusType };
                            else records.push({ date: today, status: statusType });

                            const present = records.filter(r => r.status === 'present').length;
                            const absent = records.filter(r => r.status === 'absent').length;
                            const leave = records.filter(r => r.status === 'leave').length;
                            const late = records.filter(r => r.status === 'late').length;
                            const holiday = records.filter(r => r.status === 'holiday').length;
                            const total = records.length;

                            const presentForPct = present + leave + late;
                            const effectiveTotal = total - holiday;
                            const percentage = effectiveTotal > 0 ? parseFloat(((presentForPct / effectiveTotal) * 100).toFixed(1)) : 0;

                            const newAtt = { records, total, present, absent, leave, late, holiday, percentage };
                            supabase.from('students').update({ attendance: newAtt }).eq('id', s.id).then();
                            return { ...s, attendance: newAtt };
                        }
                    }
                    return s;
                });
                setStudents(updatedStudents);
                showSaveMessage(`Attendance imported for ${updateCount} students!`);
            } catch (err) {
                showSaveMessage('Error reading file. Please check the format.');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    // --- FEE FUNCTIONS (month-by-month history) ---

    // Open a new month for all students in the selected class (or whole college)
    const openNewFeeMonth = async (targetClass = selectedClass) => {
        // Use consistent en-US locale to match openFeeMonthRange
        const now = new Date();
        const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const activeStudents = (students || []).filter(s => (s.status || 'active') === 'active');
        const targetStudents = targetClass === 'All' ? activeStudents : activeStudents.filter(s => getBaseClass(s.grade) === getBaseClass(targetClass));
        if (targetStudents.length === 0) { alert('No active students found!'); return; }

        const alreadyOpen = targetStudents.some(s =>
            (s.feeHistory || []).some(h => h.month === monthLabel)
        );
        if (alreadyOpen) {
            alert(`${monthLabel} is already open for some or all of these students!`);
            return;
        }

        const updatedStudents = students.map(s => {
            if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return s;
            const existing = s.feeHistory || [];
            const cDef = (CLASS_FEE_DEFAULTS && (CLASS_FEE_DEFAULTS[s.grade] || CLASS_FEE_DEFAULTS[getBaseClass(s.grade)])) || {};
            const customTuition = s.admissions?.[0]?.monthlyFee || s.monthlyFee;
            return {
                ...s, feeHistory: [...existing, {
                    month: monthLabel,
                    status: 'unpaid',
                    paidOn: null,
                    tuitionFee: customTuition ? Number(customTuition) : (cDef.tuitionFee ?? 0),
                    labFee: cDef.labFee ?? 0,
                    examFee: cDef.examFee ?? 0,
                    admissionFee: cDef.admissionFee ?? 0,
                    annualFee: cDef.annualFee ?? 0,
                    transportFee: cDef.transportFee ?? 0,
                }]
            };
        });
        await setStudents(updatedStudents);
        showSaveMessage(`Fee month "${monthLabel}" opened for ${targetClass === 'All' ? 'Whole College' : targetClass}!`);
    };

    // Clear ALL fee history from ALL students — direct Supabase update for speed
    const clearAllFeeData = async () => {
        try {
            // Single query updates every student row at once — much faster than 557 individual calls
            const { error } = await supabase
                .from('students')
                .update({ fee_history: [] })
                .neq('id', ''); // targets all rows

            if (error) {
                alert('Error clearing fee data: ' + error.message);
                return;
            }
            // Update local state — clear feeHistory on every student without re-fetching
            const cleared = students.map(s => ({ ...s, feeHistory: [], fee_history: [] }));
            await setStudents(cleared);
            showSaveMessage('✓ All fee data cleared! Revenue is now RS 0.');
        } catch (err) {
            alert('Unexpected error: ' + err.message);
        }
    };


    // Open a RANGE of months (e.g. January 2026 → March 2026) for target class

    // feeOverrides: optional { tuitionFee, labFee, examFee, admissionFee } to pre-fill amounts
    // markPaid: if true, marks all generated records as already paid
    const openFeeMonthRange = async (startYM, endYM, targetClass = 'All', feeOverrides = null, markPaid = false) => {
        const [sy, sm] = startYM.split('-').map(Number);
        const [ey, em] = endYM.split('-').map(Number);

        const monthLabels = [];
        let y = sy, m = sm;
        while (y < ey || (y === ey && m <= em)) {
            const label = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
            monthLabels.push(label);
            m++;
            if (m > 12) { m = 1; y++; }
        }

        if (monthLabels.length === 0) { alert('Invalid date range!'); return; }

        const today = new Date().toLocaleDateString();
        let updatedStudents = [...students];

        for (const monthLabel of monthLabels) {
            updatedStudents = updatedStudents.map(s => {
                if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return s;
                const existing = s.feeHistory || [];
                // Skip if already exists
                if (existing.some(h => h.month === monthLabel)) return s;

                // Build the fee record — if feeOverrides given use them, otherwise use class defaults
                const cDef = (CLASS_FEE_DEFAULTS && (CLASS_FEE_DEFAULTS[s.grade] || CLASS_FEE_DEFAULTS[getBaseClass(s.grade)])) || {};
                const customTuition = s.monthlyFee;
                const record = {
                    month: monthLabel,
                    status: markPaid ? 'paid' : 'unpaid',
                    paidOn: markPaid ? today : null,
                    tuitionFee: feeOverrides?.tuitionFee ?? (customTuition ? Number(customTuition) : (cDef.tuitionFee ?? 0)),
                    labFee: feeOverrides?.labFee ?? (cDef.labFee ?? 0),
                    examFee: feeOverrides?.examFee ?? (cDef.examFee ?? 0),
                    admissionFee: feeOverrides?.admissionFee ?? (cDef.admissionFee ?? 0),
                    annualFee: feeOverrides?.annualFee ?? (cDef.annualFee ?? 0),
                    transportFee: feeOverrides?.transportFee ?? (cDef.transportFee ?? 0),
                };
                if (markPaid) {
                    const net = record.tuitionFee + record.labFee + record.examFee + record.admissionFee + record.annualFee + record.transportFee;
                    record.paidAmount = net;
                }
                return { ...s, feeHistory: [...existing, record] };
            });
        }

        // Optimistic UX Update
        setStudents(updatedStudents);

        // Bulk Push to Relational Database
        const recordsToPush = [];
        for (const monthLabel of monthLabels) {
            updatedStudents.forEach(s => {
                if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return;
                const existing = s.feeHistory || [];
                const targetRec = existing.find(h => h.month === monthLabel);
                if (targetRec) {
                    recordsToPush.push({
                        student_id: s.id, month: monthLabel,
                        tuition_fee: Number(targetRec.tuitionFee || 0),
                        lab_fee: Number(targetRec.labFee || 0),
                        exam_fee: Number(targetRec.examFee || 0),
                        admission_fee: Number(targetRec.admissionFee || 0),
                        late_fine: Number(targetRec.lateFine || 0),
                        discount: Number(targetRec.discount || 0),
                        paid_amount: Number(targetRec.paidAmount || 0),
                        status: targetRec.status,
                        paid_on: targetRec.paidOn
                    });
                }
            });
        }

        if (recordsToPush.length > 0) {
            await supabase.from('fee_records').upsert(recordsToPush, { onConflict: 'student_id, month' });
        }
        const statusText = markPaid ? ' (marked as Paid)' : '';
        showSaveMessage(`${monthLabels.length} months opened for ${targetClass === 'All' ? 'Whole College' : targetClass}${statusText}!`);
        return monthLabels.length;
    };

    // Toggle a specific month's fee status for a student (Quick Toggle)
    const toggleMonthFeeStatus = async (studentId, monthLabel) => {
        let pushedRec = null;
        const updatedStudents = students.map(s => {
            if (s.id !== studentId) return s;
            const history = s.feeHistory || [];
            const updated = history.map(h => {
                if (h.month !== monthLabel) return h;
                const newStatus = h.status === 'paid' ? 'unpaid' : 'paid';
                pushedRec = { ...h, status: newStatus, paidOn: newStatus === 'paid' ? new Date().toLocaleDateString() : null };
                return pushedRec;
            });
            return { ...s, feeHistory: updated };
        });

        setStudents(updatedStudents);

        if (pushedRec) {
            await supabase.from('fee_records').upsert({
                student_id: studentId, month: monthLabel,
                tuition_fee: Number(pushedRec.tuitionFee || 0),
                lab_fee: Number(pushedRec.labFee || 0),
                exam_fee: Number(pushedRec.examFee || 0),
                admission_fee: Number(pushedRec.admissionFee || 0),
                late_fine: Number(pushedRec.lateFine || 0),
                discount: Number(pushedRec.discount || 0),
                paid_amount: Number(pushedRec.paidAmount || 0),
                status: pushedRec.status,
                paid_on: pushedRec.paidOn
            }, { onConflict: 'student_id, month' });
        }
        showSaveMessage('Fee status updated!');
    };

    // Update full detailed fee record for a student (upsert: update if exists, append if new)
    const updateStudentFeeRecord = async (studentId, monthLabel, newRecordData) => {
        // 1. Optimistic Local Update
        setStudents(prev => {
            return prev.map(s => {
                if (s.id !== studentId) return s;
                const history = s.feeHistory || [];
                const exists = history.some(h => h.month === monthLabel);
                const updatedHist = exists
                    ? history.map(h => h.month === monthLabel ? { ...h, ...newRecordData } : h)
                    : [...history, { month: monthLabel, status: 'unpaid', ...newRecordData }];
                return { ...s, feeHistory: updatedHist };
            });
        });

        // 2. Relational Supabase Upsert
        const { transactions, ...recordBase } = newRecordData;
        const dbRecord = {
            student_id: studentId,
            month: monthLabel,
            tuition_fee: Number(recordBase.tuitionFee || 0),
            lab_fee: Number(recordBase.labFee || 0),
            exam_fee: Number(recordBase.examFee || 0),
            admission_fee: Number(recordBase.admissionFee || 0),
            late_fine: Number(recordBase.lateFine || 0),
            discount: Number(recordBase.discount || 0),
            paid_amount: Number(recordBase.paidAmount || 0),
            status: recordBase.status || 'unpaid',
            paid_on: recordBase.paidOn || null
        };

        try {
            // Upsert record to get ID (Matching by student_id and month via unique constraint)
            const { data: recordData, error: recErr } = await supabase.from('fee_records').upsert(dbRecord, { onConflict: 'student_id, month' }).select('id').single();
            if (recErr) throw recErr;

            if (recordData?.id && transactions?.length > 0) {
                // Find New Transactions (those without an ID or existing only locally)
                const latestTx = transactions[transactions.length - 1];
                // We just lazily insert the newest transaction if it was created right now
                // To be totally safe on partial payments, we insert it
                if (latestTx && latestTx.note === "Itemized UI pending full ledger integration") {
                    const { error: txErr } = await supabase.from('fee_transactions').insert({
                        fee_record_id: recordData.id,
                        student_id: studentId,
                        month_label: monthLabel,
                        amount: Number(latestTx.amount),
                        payment_date: latestTx.date,
                        note: "Itemized UI Payment"
                    });
                    if (txErr) throw txErr;
                }
            }
            showSaveMessage('Fee record updated successfully!');
        } catch (error) {
            console.error('Error saving fee record:', error);
            alert('Critical Error: Failed to save fee record to database. Please check your connection and try again.');
            fetchData(); // Rollback optimistic update
        }
    };

    // Bulk update fee records safely
    const bulkUpdateFeeRecords = async (updates) => {
        // updates = [ { studentId, monthLabel, newRecordData }, ... ]

        // 1. Optimistic Update
        setStudents(prev => {
            return prev.map(s => {
                const upd = updates.find(u => u.studentId === s.id);
                if (!upd) return s;
                const history = s.feeHistory || [];
                const exists = history.some(h => h.month === upd.monthLabel);
                const updatedHist = exists
                    ? history.map(h => h.month === upd.monthLabel ? { ...h, ...upd.newRecordData } : h)
                    : [...history, { month: upd.monthLabel, status: 'unpaid', ...upd.newRecordData }];
                return { ...s, feeHistory: updatedHist };
            });
        });

        // 2. Relational Supabase Chunked Push
        const feeRecordsToPush = updates.map(u => ({
            student_id: u.studentId,
            month: u.monthLabel,
            tuition_fee: Number(u.newRecordData.tuitionFee || 0),
            lab_fee: Number(u.newRecordData.labFee || 0),
            exam_fee: Number(u.newRecordData.examFee || 0),
            admission_fee: Number(u.newRecordData.admissionFee || 0),
            late_fine: Number(u.newRecordData.lateFine || 0),
            discount: Number(u.newRecordData.discount || 0),
            paid_amount: Number(u.newRecordData.paidAmount || 0),
            status: u.newRecordData.status || 'unpaid',
            paid_on: u.newRecordData.paidOn || null
        }));

        try {
            const { error: bulkErr } = await supabase.from('fee_records').upsert(feeRecordsToPush, { onConflict: 'student_id, month' });
            if (bulkErr) throw bulkErr;

            // NOTE: For bulk we ignore deep nested transactions array append to avoid complex mapping locally. 
            // We can fetch data to sync IDs.
            fetchData();
            showSaveMessage(`Bulk updated ${updates.length} fee records successfully!`);
        } catch (error) {
            console.error('Error saving bulk fee records:', error);
            alert('Critical Error: Failed to save bulk fee records. Please check your connection and try again.');
            fetchData(); // Rollback optimistic update
        }
    };

    // Mark all students in target class as paid for a given month
    const markAllPaidForMonth = async (monthLabel, targetClass = selectedClass) => {
        const updatedStudents = students.map(s => {
            if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return s;
            const history = (s.feeHistory || []).map(h => {
                if (h.month !== monthLabel) return h;
                // Calculate the net total for this record to set paidAmount correctly
                const net = (h.tuitionFee || 0) + (h.labFee || 0) + (h.examFee || 0) +
                    (h.admissionFee || 0) + (h.annualFee || 0) + (h.transportFee || 0) +
                    (h.lateFine || 0) - (h.discount || 0);
                return {
                    ...h,
                    status: 'paid',
                    paidOn: h.paidOn || new Date().toLocaleDateString(),
                    paidAmount: net
                };
            });
            return { ...s, feeHistory: history };
        });

        // Optimistic
        setStudents(updatedStudents);

        // Relational Push (Batch)
        const pushedRecs = [];
        updatedStudents.forEach(s => {
            if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return;
            const history = s.feeHistory || [];
            const targetRec = history.find(h => h.month === monthLabel);
            if (targetRec && targetRec.status === 'paid') {
                pushedRecs.push({
                    student_id: s.id, month: monthLabel,
                    tuition_fee: Number(targetRec.tuitionFee || 0),
                    lab_fee: Number(targetRec.labFee || 0),
                    exam_fee: Number(targetRec.examFee || 0),
                    admission_fee: Number(targetRec.admissionFee || 0),
                    late_fine: Number(targetRec.lateFine || 0),
                    discount: Number(targetRec.discount || 0),
                    paid_amount: Number(targetRec.paidAmount || 0),
                    status: 'paid',
                    paid_on: targetRec.paidOn
                });
            }
        });
        try {
            if (pushedRecs.length > 0) {
                const { error: batchErr } = await supabase.from('fee_records').upsert(pushedRecs, { onConflict: 'student_id, month' });
                if (batchErr) throw batchErr;
            }

            showSaveMessage(`All targeted students marked Paid for ${monthLabel}!`);
        } catch (error) {
            console.error('Error marking all paid:', error);
            alert('Critical Error: Failed to save payments to the database. Reverting changes...');
            fetchData(); // Rollback optimistic update
        }
    };

    // Reset all students in target class as unpaid for a given month
    const markAllUnpaidForMonth = async (monthLabel, targetClass = selectedClass) => {
        const updatedStudents = students.map(s => {
            if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return s;
            const history = (s.feeHistory || []).map(h =>
                h.month === monthLabel ? { ...h, status: 'unpaid', paidOn: null, paidAmount: 0 } : h
            );
            return { ...s, feeHistory: history };
        });

        try {
            // Batch push to relational DB
            const pushedRecs = [];
            updatedStudents.forEach(s => {
                if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return;
                const history = s.feeHistory || [];
                const targetRec = history.find(h => h.month === monthLabel);
                if (targetRec) {
                    pushedRecs.push({
                        student_id: s.id, month: monthLabel,
                        tuition_fee: Number(targetRec.tuitionFee || 0),
                        lab_fee: Number(targetRec.labFee || 0),
                        exam_fee: Number(targetRec.examFee || 0),
                        admission_fee: Number(targetRec.admissionFee || 0),
                        late_fine: Number(targetRec.lateFine || 0),
                        discount: Number(targetRec.discount || 0),
                        paid_amount: 0,
                        status: 'unpaid',
                        paid_on: null
                    });
                }
            });

            if (pushedRecs.length > 0) {
                const { error: batchErr } = await supabase.from('fee_records').upsert(pushedRecs, { onConflict: 'student_id, month' });
                if (batchErr) throw batchErr;
            }

            // Only update local UI on successful DB action
            await setStudents(updatedStudents);
            showSaveMessage(`All targeted students reset to Unpaid for ${monthLabel}!`);
        } catch (error) {
            console.error('Error resetting to unpaid:', error);
            alert('Critical Error: Failed to reset payments in the database. Reverting changes...');
            fetchData();
        }
    };

    // Delete a month from all students in the target class
    const deleteFeeMonth = async (monthLabel, targetClass = selectedClass) => {
        if (!window.confirm(`Remove "${monthLabel}" from all students in ${targetClass === 'All' ? 'the whole college' : targetClass}? This cannot be undone.`)) return;

        try {
            // Relational Deletion
            let query = supabase.from('fee_records').delete().eq('month', monthLabel);

            if (targetClass !== 'All') {
                const targetStudentIds = students.filter(s => getBaseClass(s.grade) === getBaseClass(targetClass)).map(s => s.id);
                if (targetStudentIds.length === 0) return; // Nothing to do
                query = query.in('student_id', targetStudentIds);
            }

            const { error } = await query;
            if (error) throw error;

            const updatedStudents = students.map(s => {
                if (targetClass !== 'All' && getBaseClass(s.grade) !== getBaseClass(targetClass)) return s;
                return { ...s, feeHistory: (s.feeHistory || []).filter(h => h.month !== monthLabel) };
            });
            await setStudents(updatedStudents);
            showSaveMessage(`Month "${monthLabel}" removed!`);
        } catch (error) {
            console.error('Error deleting fee month:', error);
            alert('Critical Error: Failed to delete the month from the database. Please try again.');
            fetchData();
        }
    };



    // --- FEE EXCEL EXPORT ---
    const exportFeeExcel = () => {
        const filteredStudents = students.filter(s => getBaseClass(s.grade) === getBaseClass(selectedClass) && (s.status || 'active') === 'active');
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const rows = filteredStudents.map(s => ({
            'Student ID': s.id,
            'Student Name': s.name,
            'Grade': s.grade,
            'Billing Month': currentMonth,
            'Fee Status (Paid/Unpaid)': s.feeStatus === 'paid' ? 'Paid' : 'Unpaid',
            'Instructions': 'Change status to Paid or Unpaid'
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 24 }, { wch: 30 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Fee Status');
        XLSX.writeFile(wb, `Fees_${selectedClass.replace(/ /g, '_')}_${currentMonth.replace(/ /g, '_')}.xlsx`);
        showSaveMessage(`Fees for ${selectedClass} exported!`);
    };

    // --- FEE EXCEL IMPORT ---
    const importFeeExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                let updateCount = 0;
                const updatedStudents = students.map(s => {
                    const row = data.find(r => r['Student ID'] === s.id);
                    if (row && row['Fee Status (Paid/Unpaid)']) {
                        const status = row['Fee Status (Paid/Unpaid)'].toString().toLowerCase().trim();
                        if (status === 'paid' || status === 'p') {
                            updateCount++;
                            return { ...s, feeStatus: 'paid' };
                        } else if (status === 'unpaid' || status === 'u') {
                            updateCount++;
                            return { ...s, feeStatus: 'unpaid' };
                        }
                    }
                    return s;
                });
                setStudents(updatedStudents);
                showSaveMessage(`Fee status imported for ${updateCount} students!`);
            } catch (err) {
                showSaveMessage('Error reading file. Please check the format.');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const getGradeColor = (percentage) => {
        if (percentage >= 90) return 'var(--color-success)';
        if (percentage >= 75) return 'var(--color-primary)';
        if (percentage >= 60) return 'var(--color-accent)';
        return 'var(--color-danger)';
    };


    // --- SAVE STUDENT REMARK ---
    const saveRemark = async (studentId, remarkText) => {
        const { error } = await supabase
            .from('students')
            .update({ remarks: remarkText })
            .eq('id', studentId);
        if (error) {
            console.error('Error saving remark:', error);
            alert('Failed to save remark. Please try again.');
        } else {
            await fetchData();
            showSaveMessage('Remark saved!');
        }
    };

    // --- DOWNLOAD STUDENT REPORT ---
    const downloadStudentReport = (studentId, termFilter = 'All Terms', returnHtml = false) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return '';

        // Collect results from BOTH student.results AND student.previous_results
        const currentRes = (student.results || []);
        const prevRes = (student.previous_results || student.previousResults || []).flatMap(pr => 
            (pr.results || []).map(r => ({ ...r, term: r.term || pr.term }))
        );

        // Deduplicate: if current term has results, they take precedence over previous
        const sourceMap = new Map();
        [...prevRes, ...currentRes].forEach(r => {
            if (!r || !r.subject) return;
            const canonSub = canonicalSubjectName(r.subject);
            const key = `${(r.term || 'Current').trim().toLowerCase()}__${canonSub.toLowerCase()}`;
            sourceMap.set(key, { ...r, subject: canonSub });
        });
        const combinedResults = Array.from(sourceMap.values());

        // Recalculate results on the fly with the latest weights/total marks
        let allResults = combinedResults.map(r => {
            const termName = r.term || 'Current';
            const subTotal = getSubjectTotalForClass(student.grade, r.subject, termName);
            const obtained = r.obtained;
            const isAbsent = obtained === 'A' || obtained === 'a' || String(obtained).toLowerCase() === 'absent';
            const numObtained = isAbsent ? 0 : Number(obtained || 0);
            const pct = subTotal > 0 ? Math.round((numObtained / subTotal) * 100) : 0;
            const grade = isAbsent ? 'F' : calcGrade(pct);
            return {
                ...r,
                total: subTotal,
                percentage: pct,
                grade: grade
            };
        });

        if (termFilter && termFilter !== 'All Terms') {
            const cleanFilter = termFilter.trim().toLowerCase();
            allResults = allResults.filter(r => (r.term || 'Current').trim().toLowerCase() === cleanFilter);
        }

        if (allResults.length === 0) {
            if (!returnHtml) {
                alert(`No exam results found for ${student.name} (${student.grade}) in "${termFilter}".\nPlease verify that marks have been saved for this student in Manage Exams.`);
            }
            return '';
        }

        const totalObtained = allResults.reduce((sum, r) => {
            if (isExcludedForClass(student.grade, r.subject, r.term || 'Current')) return sum;
            return sum + (r.obtained === 'A' ? 0 : Number(r.obtained || 0));
        }, 0);
        const totalMax = allResults.reduce((sum, r) => {
            if (isExcludedForClass(student.grade, r.subject, r.term || 'Current')) return sum;
            return sum + Number(r.total || 100);
        }, 0);
        const avg = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
        const overallGrade = percentageToGrade(parseFloat(avg));
        const gradeColor = (pct) => {
            const color = pct >= 90 ? '#0d7c52' : pct >= 75 ? '#1a5fb4' : pct >= 60 ? '#c4841d' : '#c0392b';
            return { text: color };
        };
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const schoolName = schoolData.name || 'ACS School & College';
        const schoolAddress = schoolData.contact?.address || '';
        const schoolPhone = schoolData.contact?.phone || '';
        const schoolEmail = schoolData.contact?.email || '';

        // Group results by term
        // Group results by term
        const termGroups = {};
        allResults.forEach(r => {
            const term = r.term || 'Current';
            if (!termGroups[term]) termGroups[term] = [];
            termGroups[term].push(r);
        });

        // Filter active terms (terms where student has at least one valid mark and not all subjects are excluded)
        const activeTerms = Object.keys(termGroups).filter(termName =>
            termGroups[termName].some(r => !isExcludedForClass(student.grade, r.subject, termName) && r.obtained !== undefined && r.obtained !== null && r.obtained !== '')
        );

        // Dynamic subject count to automatically optimize spacing for A4 print
        const validResults = allResults.filter(r => !isExcludedForClass(student.grade, r.subject, r.term || 'Current'));
        const uniqueSubs = dedupeSubjectsList(validResults.map(r => r.subject));
        const numSubs = activeTerms.length > 1 ? uniqueSubs.length : Math.max(validResults.length, 1);

        // Density scaling presets for guaranteed single A4 sheet fit
        const isHighDensity = numSubs >= 8;
        const isMediumDensity = numSubs >= 6 && numSubs < 8;

        const padCell = isHighDensity ? '3.5px 6px' : isMediumDensity ? '5px 8px' : '7px 10px';
        const fontTable = isHighDensity ? '12.5px' : isMediumDensity ? '13.5px' : '15px';
        const fontTableHead = isHighDensity ? '12px' : isMediumDensity ? '13px' : '14px';
        const headerGap = isHighDensity ? '6px' : isMediumDensity ? '10px' : '14px';
        const logoH = isHighDensity ? '46px' : isMediumDensity ? '54px' : '64px';
        const schoolTitleF = isHighDensity ? '22px' : isMediumDensity ? '26px' : '30px';
        const schoolSubF = isHighDensity ? '10.5px' : '11.5px';
        const badgePad = isHighDensity ? '3px 18px' : '4px 22px';
        const badgeF = isHighDensity ? '12px' : '13px';
        const badgeMargin = isHighDensity ? '6px' : '10px';
        const studentPad = isHighDensity ? '6px 10px' : isMediumDensity ? '8px 12px' : '12px 14px';
        const studentMargin = isHighDensity ? '6px' : isMediumDensity ? '10px' : '14px';
        const photoW = isHighDensity ? '56px' : isMediumDensity ? '66px' : '78px';
        const photoH = isHighDensity ? '66px' : isMediumDensity ? '76px' : '88px';
        const nameF = isHighDensity ? '15px' : isMediumDensity ? '17px' : '19px';
        const idF = isHighDensity ? '12px' : '14px';
        const labelF = isHighDensity ? '10.5px' : '11.5px';
        const valF = isHighDensity ? '13.5px' : isMediumDensity ? '14.5px' : '15.5px';
        const secTitleMargin = isHighDensity ? '4px' : '6px';
        const secTitleF = isHighDensity ? '13.5px' : isMediumDensity ? '14.5px' : '15.5px';
        const summaryMargin = isHighDensity ? '6px' : isMediumDensity ? '8px' : '12px';
        const summaryPad = isHighDensity ? '6px 10px' : isMediumDensity ? '8px 12px' : '10px 12px';
        const summaryValF = isHighDensity ? '14px' : '16px';
        const attBoxPad = isHighDensity ? '6px' : isMediumDensity ? '8px' : '10px';
        const attValF = isHighDensity ? '18px' : isMediumDensity ? '20px' : '22px';
        const remarksMargin = isHighDensity ? '6px' : isMediumDensity ? '8px' : '12px';
        const remarksMinH = isHighDensity ? '30px' : isMediumDensity ? '38px' : '48px';
        const remarksLineH = isHighDensity ? '15px' : isMediumDensity ? '19px' : '24px';
        const remarksF = isHighDensity ? '12px' : '13px';
        const sigLineH = isHighDensity ? '18px' : isMediumDensity ? '24px' : '30px';
        const sigPadB = isHighDensity ? '3px' : '6px';
        const innerPad = isHighDensity ? '10px 14px' : isMediumDensity ? '14px 18px' : '18px 22px';

        let resultsRows = '';

        if (activeTerms.length > 1) {
            // Multi-Term Scholastic Areas Cumulative Table (e.g. 1st Term + 2nd Term side-by-side)
            const termTotalsMap = {};
            activeTerms.forEach(t => { termTotalsMap[t] = 0; });
            let grandTotalMax = 0;
            let grandTotalObtained = 0;

            const multiTermRows = uniqueSubs.map((sub, idx) => {
                let subMax = 0;
                let subObt = 0;
                let hasAnyScore = false;

                const termCols = activeTerms.map(term => {
                    const r = validResults.find(res => (res.term || 'Current').trim().toLowerCase() === term.trim().toLowerCase() && canonicalSubjectName(res.subject).toLowerCase() === sub.toLowerCase());
                    if (r) {
                        const ob = r.obtained;
                        const isAbsent = ob === 'A' || ob === 'a' || String(ob).toLowerCase() === 'absent';
                        const numOb = isAbsent ? 0 : Number(ob || 0);
                        if (ob !== null && ob !== undefined && ob !== '') {
                            hasAnyScore = true;
                            subObt += numOb;
                            termTotalsMap[term] = (termTotalsMap[term] || 0) + numOb;
                        }
                        subMax += Number(r.total || 100);
                        const displayOb = isAbsent ? 'Absent' : (ob !== null && ob !== undefined && ob !== '' ? ob : '—');
                        return `<td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;font-weight:900;font-size:${fontTable};color:#0f172a;">${displayOb}</td>`;
                    }
                    return `<td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;color:#94a3b8;font-weight:700;font-size:${fontTable};">—</td>`;
                }).join('');

                grandTotalMax += subMax;
                grandTotalObtained += subObt;

                const pct = subMax > 0 && hasAnyScore ? Math.round((subObt / subMax) * 100) : 0;
                const grade = hasAnyScore ? calcGrade(pct) : '—';
                const gradeCol = gradeColor(pct);

                return `
                    <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f0f4ff'};">
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;font-size:${fontTable};font-weight:900;color:#0f172a;">${sub}</td>
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;font-weight:900;font-size:${fontTable};color:#0f172a;">${subMax}</td>
                        ${termCols}
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;font-weight:900;font-size:${fontTable};color:#b91c1c;">${hasAnyScore ? subObt : '—'}</td>
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;font-weight:900;font-size:${fontTable};color:${gradeCol.text};">${hasAnyScore ? `${pct}%` : '—'}</td>
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;font-weight:900;font-size:${fontTable};color:${gradeCol.text};">${grade}</td>
                    </tr>
                `;
            }).join('');

            const grandAvgPct = grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(1) : '0.0';
            const grandGrade = percentageToGrade(parseFloat(grandAvgPct));

            resultsRows = `
                <div style="margin-bottom:${summaryMargin};page-break-inside:avoid;">
                    <div class="section-title" style="margin-bottom:${secTitleMargin};">
                        <div class="title-bar" style="height:14px;"></div>
                        <div class="title-text" style="font-size:${secTitleF};font-weight:900;">Scholastic Areas & Term Progress</div>
                    </div>

                    <table style="border:2px solid #1e3a8a; border-collapse:collapse; width:100%;">
                        <thead style="background:#1e3a8a;color:#fff;">
                            <tr>
                                <th style="padding:${padCell};text-align:left;font-size:${fontTableHead};font-weight:900;border:1.5px solid #1e3a8a;">Scholastic Areas<br/><span style="font-size:10.5px;font-weight:700;color:#e0e7ff;">SUBJECT</span></th>
                                <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;border:1.5px solid #1e3a8a;">Total</th>
                                ${activeTerms.map(t => `<th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;border:1.5px solid #1e3a8a;">${t}</th>`).join('')}
                                <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;border:1.5px solid #1e3a8a;">Obtained Marks</th>
                                <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;border:1.5px solid #1e3a8a;">%age</th>
                                <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;border:1.5px solid #1e3a8a;">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${multiTermRows}
                            <tr style="background:#1e3a8a;color:#fff;font-weight:900;">
                                <td style="padding:${padCell};border:1.5px solid #1e3a8a;font-size:${fontTable};">Total</td>
                                <td style="padding:${padCell};text-align:center;border:1.5px solid #1e3a8a;font-size:${fontTable};">${grandTotalMax}</td>
                                ${activeTerms.map(t => `<td style="padding:${padCell};text-align:center;border:1.5px solid #1e3a8a;font-size:${fontTable};">${termTotalsMap[t] || 0}</td>`).join('')}
                                <td style="padding:${padCell};text-align:center;border:1.5px solid #1e3a8a;font-size:${fontTable};color:#fbbf24;">${grandTotalObtained}</td>
                                <td style="padding:${padCell};text-align:center;border:1.5px solid #1e3a8a;font-size:${fontTable};">${Math.round(parseFloat(grandAvgPct))}%</td>
                                <td style="padding:${padCell};text-align:center;border:1.5px solid #1e3a8a;font-size:${fontTable};">${grandGrade}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            // Single-Term Clean Table (for new students or when single term is filtered)
            resultsRows = Object.entries(termGroups).map(([termName, termResults]) => {
                const filteredTermResults = termResults.filter(r => !isExcludedForClass(student.grade, r.subject, termName));
                if (filteredTermResults.length === 0) return '';
                
                const rows = filteredTermResults.map((r, i) => `
                    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f0f4ff'};">
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;font-size:${fontTable};font-weight:900;color:#0f172a;">${r.subject}</td>
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;font-weight:900;font-size:${fontTable};color:#0f172a;">${r.total || 100}</td>
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;font-weight:900;font-size:${fontTable};color:#b91c1c;letter-spacing:0.5px;">${r.obtained === 'A' ? 'Absent' : (r.obtained !== undefined && r.obtained !== null ? r.obtained : '—')}</td>
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;text-align:center;">
                            <span style="font-weight:900;font-size:${fontTable};color:${gradeColor(r.percentage).text || '#1e3a8a'};">${r.grade}</span>
                        </td>
                        <td style="padding:${padCell};border:1.5px solid #1e3a8a;width:140px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <div style="flex:1;background:#e2e8f0;border-radius:3px;height:8px;overflow:hidden;">
                                    <div style="background:${gradeColor(r.percentage).text || '#1e3a8a'};height:100%;width:${r.percentage}%;border-radius:3px;"></div>
                                </div>
                                <span style="font-size:${fontTable};color:${gradeColor(r.percentage).text || '#1e3a8a'};font-weight:900;min-width:34px;text-align:right;">${r.percentage}%</span>
                            </div>
                        </td>
                    </tr>
                `).join('');

                return `
                    <div style="margin-bottom:${summaryMargin};page-break-inside:avoid;">
                        <div class="section-title" style="margin-bottom:${secTitleMargin};">
                            <div class="title-bar" style="height:14px;"></div>
                            <div class="title-text" style="font-size:${secTitleF};font-weight:900;">Examination Results - ${termName}</div>
                        </div>

                        <table style="border:2px solid #1e3a8a; border-collapse:collapse; width:100%;">
                            <thead style="background:#1e3a8a;color:#fff;">
                                <tr>
                                    <th style="padding:${padCell};text-align:left;font-size:${fontTableHead};font-weight:900;letter-spacing:0.5px;border:1px solid #1e3a8a;">Subject</th>
                                    <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;letter-spacing:0.5px;border:1px solid #1e3a8a;">Total</th>
                                    <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;letter-spacing:0.5px;border:1px solid #1e3a8a;">Obtained</th>
                                    <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;letter-spacing:0.5px;border:1px solid #1e3a8a;">Grade</th>
                                    <th style="padding:${padCell};text-align:center;font-size:${fontTableHead};font-weight:900;letter-spacing:0.5px;border:1px solid #1e3a8a;">Performance</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            }).join('');
        }

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Report Card — ${student.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Outfit', sans-serif; color: #0f172a; background: #fff; padding: 0; }
                @page {
                    size: A4 portrait;
                    margin: 4mm 5mm;
                }
                @media print {
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                    .page-container {
                        border: 1.5px solid #1a3a6b !important;
                        box-shadow: none !important;
                        margin: 0 auto !important;
                        padding: 2.5mm !important;
                        width: 100% !important;
                        max-width: 198mm !important;
                        height: 288mm !important;
                        max-height: 288mm !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        page-break-after: always !important;
                        overflow: hidden !important;
                    }
                    .inner-border {
                        border: 2px solid #1a3a6b !important;
                        box-sizing: border-box !important;
                        height: 100% !important;
                        max-height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        padding: ${innerPad} !important;
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
                .page-container {
                    max-width: 800px;
                    margin: 15px auto;
                    background: #fff;
                    padding: 8px;
                    border: 1.5px solid #1a3a6b;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
                    box-sizing: border-box;
                }
                .inner-border {
                    border: 2px solid #1a3a6b;
                    padding: ${innerPad};
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    min-height: 275mm;
                }
                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .title-bar {
                    width: 4px;
                    background: #1a3a6b;
                    border-radius: 2px;
                }
                .title-text {
                    font-family: 'Playfair Display', serif;
                    font-weight: 900;
                    color: #1a3a6b;
                }
                table { width: 100%; border-collapse: collapse; }
                .label-sm { font-size: ${labelF}; text-transform: uppercase; color: #334155; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 1px; }
                .value-md { font-size: ${valF}; font-weight: 900; color: #0f172a; }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align:center;padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                <button onclick="window.print()" style="padding:9px 26px;background:#1a3a6b;color:white;border:none;border-radius:50px;font-weight:900;cursor:pointer;font-size:14px;">🖨️ PRINT REPORT CARD</button>
            </div>
            
            <div class="page-container">
                <div class="inner-border">
                    <!-- HEADER -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:${headerGap};">
                        <img src="/logo.png" style="height:${logoH};width:auto;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                        <div style="display:none;width:${logoH};height:${logoH};background:#f1f5f9;border-radius:8px;align-items:center;justify-content:center;font-size:22px;">🏫</div>
                        <div style="text-align:center;">
                            <h1 style="font-family:'Playfair Display',serif;font-size:${schoolTitleF};font-weight:900;color:#1e3a8a;margin:0;line-height:1.1;">${schoolName}</h1>
                            <p style="font-size:${schoolSubF};color:#334155;font-weight:700;margin-top:3px;">${schoolAddress}</p>
                            <p style="font-size:${schoolSubF};color:#334155;font-weight:700;">${schoolPhone} • ${schoolEmail} ${schoolData.contact?.website ? `• ${schoolData.contact.website}` : ''}</p>
                        </div>
                    </div>

                    <div style="text-align:center;margin-bottom:${badgeMargin};">
                        <span style="padding:${badgePad};border:2px solid #1a3a6b;border-radius:6px;font-size:${badgeF};font-weight:900;color:#1a3a6b;letter-spacing:1.5px;background:#f8fafc;">REPORT CARD</span>
                    </div>

                    <!-- STUDENT INFO -->
                    <div style="display:flex;gap:14px;background:#f0f4ff;border:2px solid #1e3a8a;border-radius:10px;padding:${studentPad};margin-bottom:${studentMargin};">
                        <div style="width:${photoW};height:${photoH};background:#e2e8f0;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1.5px solid #1e3a8a;flex-shrink:0;">
                            ${(student.photo || student.image) ? `<img src="${student.photo || student.image}" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="font-size:28px;font-weight:900;color:#94a3b8;">${(student.name || '?')[0]}</span>`}
                        </div>
                        <div style="flex:1;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px 12px;align-items:center;">
                            <div>
                                <div class="label-sm" style="font-size:${labelF};">Student Name</div>
                                <div style="font-size:${nameF};font-weight:900;color:#0f172a;line-height:1.2;">${student.name}</div>
                                <div style="font-size:${idF};font-weight:900;color:#1e3a8a;margin-top:1px;">ID: ${student.id}</div>
                            </div>
                            <div>
                                <div class="label-sm" style="font-size:${labelF};">Class</div>
                                <div class="value-md" style="font-size:${valF};">${getStudentFullClassLabel(student)}</div>
                            </div>
                            <div>
                                <div class="label-sm" style="font-size:${labelF};">Gender</div>
                                <div class="value-md" style="font-size:${valF};">${student.gender || '—'}</div>
                            </div>
                            <div style="background:#fff;border:1.5px solid #1e3a8a;border-radius:6px;padding:4px 8px;">
                                <div class="label-sm" style="font-size:${labelF};color:#1e3a8a;">Father's Name</div>
                                <div style="font-size:${valF};font-weight:900;color:#0f172a;">${student.fatherName || (student.admissions?.[0]?.fatherName) || '—'}</div>
                            </div>
                            <div>
                                <div class="label-sm" style="font-size:${labelF};">Date Generated</div>
                                <div class="value-md" style="font-size:${valF};">${today}</div>
                            </div>
                        </div>
                    </div>

                    <!-- RESULTS -->
                    ${resultsRows}

                    <!-- SUMMARY & ATTENDANCE -->
                    <div style="page-break-inside:avoid;margin-bottom:${summaryMargin};">
                        <div class="section-title" style="margin-bottom:${secTitleMargin};">
                            <div class="title-bar" style="height:14px;"></div>
                            <div class="title-text" style="font-size:${secTitleF};font-weight:900;">Summary & Attendance</div>
                        </div>
                        <table style="border:2px solid #1e3a8a;">
                            <tbody>
                                <tr style="background:#f0f4ff;">
                                    <td style="padding:${summaryPad};font-weight:900;font-size:${summaryValF};color:#0f172a;border:1.5px solid #1e3a8a;width:35%;">Aggregate Result</td>
                                    <td style="padding:${summaryPad};text-align:center;border:1.5px solid #1e3a8a;">
                                        <div style="font-weight:900;font-size:${summaryValF};color:#0f172a;">${totalObtained} / ${totalMax}</div>
                                        <div style="font-size:${summaryValF};color:#1e3a8a;font-weight:900;margin-top:1px;">${avg}%</div>
                                    </td>
                                    <td style="padding:${summaryPad};text-align:center;border:1.5px solid #1e3a8a;">
                                        <span style="display:inline-block;padding:2px 14px;background:#1e3a8a;color:#fff;border-radius:20px;font-weight:900;font-size:${summaryValF};text-align:center;">${overallGrade}</span>
                                    </td>
                                    <td style="padding:${summaryPad};text-align:center;font-weight:900;font-size:${summaryValF};color:${gradeColor(parseFloat(avg)).text || '#1e3a8a'};border:1.5px solid #1e3a8a;letter-spacing:1px;">
                                        ${parseFloat(avg) >= 40 ? 'PASSED' : 'FAIL'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="display:flex;text-align:center;border:2px solid #1e3a8a;border-radius:8px;background:#f0f4ff;overflow:hidden;margin-top:6px;">
                            <div style="flex:1;padding:${attBoxPad};border-right:1.5px solid #1e3a8a;"><div style="font-size:${attValF};font-weight:900;color:#059669;">${(student.attendance || {}).present ?? '—'}</div><div class="label-sm" style="font-size:${labelF};font-weight:900;">Present</div></div>
                            <div style="flex:1;padding:${attBoxPad};border-right:1.5px solid #1e3a8a;"><div style="font-size:${attValF};font-weight:900;color:#dc2626;">${(student.attendance || {}).absent ?? '—'}</div><div class="label-sm" style="font-size:${labelF};font-weight:900;">Absent</div></div>
                            <div style="flex:1;padding:${attBoxPad};"><div style="font-size:${attValF};font-weight:900;color:#1e3a8a;">${(student.attendance || {}).percentage ?? '—'}${(student.attendance || {}).percentage != null ? '%' : ''}</div><div class="label-sm" style="font-size:${labelF};font-weight:900;">Attendance</div></div>
                        </div>
                    </div>

                    <!-- REMARKS -->
                    <div style="margin-bottom:${remarksMargin};">
                        <div class="section-title" style="margin-bottom:${secTitleMargin};">
                            <div class="title-bar" style="height:14px;"></div>
                            <div class="title-text" style="font-size:${secTitleF};font-weight:900;">Remarks</div>
                        </div>
                        <div style="font-size:${remarksF}; font-weight:800; color:#0f172a; line-height:${remarksLineH}; min-height:${remarksMinH}; background: repeating-linear-gradient(transparent, transparent ${parseInt(remarksLineH)-1}px, #cbd5e1 ${parseInt(remarksLineH)-1}px, #cbd5e1 ${remarksLineH}); padding: 0 4px; border: none; word-break: break-word;">
                            ${student.remarks ? student.remarks : (gradeToRemark(overallGrade) || '')}
                        </div>
                    </div>

                    <!-- SIGNATURES -->
                    <div style="margin-top:auto;display:flex;justify-content:space-between;gap:20px;padding-bottom:${sigPadB};">
                        <div style="flex:1;text-align:center;"><div style="border-bottom:2px solid #1a3a6b;height:${sigLineH};margin-bottom:3px;"></div><div class="label-sm" style="font-size:${labelF};font-weight:900;color:#0f172a;">Class Teacher</div></div>
                        <div style="flex:1;text-align:center;"><div style="border-bottom:2px solid #1a3a6b;height:${sigLineH};margin-bottom:3px;"></div><div class="label-sm" style="font-size:${labelF};font-weight:900;color:#0f172a;">Principal</div></div>
                        <div style="flex:1;text-align:center;"><div style="border-bottom:2px solid #1a3a6b;height:${sigLineH};margin-bottom:3px;"></div><div class="label-sm" style="font-size:${labelF};font-weight:900;color:#0f172a;">Parent Signature</div></div>
                    </div>

                    <!-- FOOTER -->
                    <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#334155;font-weight:800;padding-top:6px;border-top:1px solid #e2e8f0;">
                        <span>Generated by ${schoolName} Portal</span>
                        <span>${today}</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        if (returnHtml) return html;

        const w = window.open('', '_blank');
        if (!w) {
            alert("Popup blocked! Please allow popups to view the report.");
            return;
        }
        w.document.write(html);
        w.document.close();
    };

    const printBulkReports = (filteredStudents, term) => {
        if (filteredStudents.length === 0) return;
        
        const validReports = [];
        filteredStudents.forEach((s) => {
            const html = downloadStudentReport(s.id, term, true);
            if (html && html.trim().length > 0) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const pageContent = doc.querySelector('.page-container')?.outerHTML || '';
                if (pageContent) {
                    validReports.push(pageContent);
                }
            }
        });

        if (validReports.length === 0) {
            alert(`No student marks found for term "${term}". Please ensure marks are saved in Manage Exams before printing report cards.`);
            return;
        }

        const reportsHtml = validReports.join('');

        const finalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bulk Report Cards</title>
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Outfit', sans-serif; color: #0f172a; background: #fff; padding: 0; }
                    @page {
                        size: A4 portrait;
                        margin: 4mm 5mm;
                    }
                    @media print {
                        html, body {
                            width: 100% !important;
                            height: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                        .no-print { display: none !important; }
                        .page-container {
                            border: 1.5px solid #1a3a6b !important;
                            box-shadow: none !important;
                            margin: 0 auto !important;
                            padding: 2.5mm !important;
                            width: 100% !important;
                            max-width: 198mm !important;
                            height: 288mm !important;
                            max-height: 288mm !important;
                            box-sizing: border-box !important;
                            page-break-inside: avoid !important;
                            page-break-after: always !important;
                            overflow: hidden !important;
                        }
                        .inner-border {
                            border: 2px solid #1a3a6b !important;
                            box-sizing: border-box !important;
                            height: 100% !important;
                            max-height: 100% !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: space-between !important;
                        }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    .page-container {
                        max-width: 800px;
                        margin: 15px auto;
                        background: #fff;
                        padding: 8px;
                        border: 1.5px solid #1a3a6b;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
                        box-sizing: border-box;
                    }
                    .inner-border {
                        border: 2px solid #1a3a6b;
                        padding: 14px 18px;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        min-height: 275mm;
                    }
                    .section-title { display: flex; align-items: center; gap: 6px; }
                    .title-bar { width: 4px; background: #1a3a6b; border-radius: 2px; }
                    .title-text { font-family: 'Playfair Display', serif; font-weight: 900; color: #1a3a6b; }
                    table { width: 100%; border-collapse: collapse; }
                    .label-sm { font-size: 11.5px; text-transform: uppercase; color: #334155; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 1px; }
                    .value-md { font-size: 15px; font-weight: 900; color: #0f172a; }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align:center;padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                    <button onclick="window.print()" style="padding:9px 24px;background:#1a3a6b;color:white;border:none;border-radius:8px;font-weight:900;cursor:pointer;font-size:14px;">🖨️ Print All Reports (${filteredStudents.length})</button>
                </div>
                ${reportsHtml}
            </body>
            </html>
        `;

        const w = window.open('', '_blank');
        if (!w) {
            alert("Popup blocked! Please allow popups to print bulk reports.");
            return;
        }
        w.document.write(finalHtml);
        w.document.close();
    };

    // --- ANNOUNCEMENTS FUNCTIONS ---
    const addAnnouncement = async () => {
        if (!newAnnouncement.title || !newAnnouncement.content) {
            showSaveMessage('Title and content are required!');
            return;
        }

        const { error } = await supabase.from('announcements').insert([newAnnouncement]);
        if (error) {
            alert('Error posting announcement: ' + error.message);
        } else {
            setNewAnnouncement({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
            await fetchData();
            showSaveMessage('Announcement posted!');
        }
    };

    const deleteAnnouncement = async (id) => {
        if (window.confirm('Are you sure you want to delete this announcement?')) {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) {
                alert('Error deleting announcement: ' + error.message);
            } else {
                await fetchData();
                showSaveMessage('Announcement deleted!');
            }
        }
    };

    // --- FACULTY MANAGEMENT ---
    const addFaculty = () => {
        setEditingFacultyId('new');
        setTempFacultyMember({
            name: '',
            role: '',
            department: '',
            bio: '',
            image: '',
            phone: '',
            joining_date: '',
            base_salary: ''
        });
    };

    const saveFaculty = async () => {
        if (!tempFacultyMember.phone || tempFacultyMember.phone.trim() === '') {
            alert('Phone number is required. Please provide a contact number.');
            return;
        }

        if (editingFacultyId === 'new') {
            const { error } = await supabase.from('faculty').insert([tempFacultyMember]);
            if (error) {
                alert('Error adding faculty: ' + error.message);
                return;
            }
            showSaveMessage('Faculty member added!');
        } else {
            // Strip ID from payload for updates
            const { id, ...payload } = tempFacultyMember;
            const { error } = await supabase.from('faculty').update(payload).eq('id', editingFacultyId);
            if (error) {
                alert('Error updating faculty: ' + error.message);
                return;
            }
            showSaveMessage('Faculty updated!');
        }
        setEditingFacultyId(null);
        setTempFacultyMember(null);
        await fetchData();
    };

    const deleteFaculty = async (id) => {
        if (window.confirm('Are you sure you want to remove this faculty member?')) {
            const { error } = await supabase.from('faculty').delete().eq('id', id);
            if (error) {
                alert('Error deleting faculty: ' + error.message);
            } else {
                await fetchData();
                showSaveMessage('Faculty member removed');
            }
        }
    };

    // --- FACILITIES MANAGEMENT ---
    const addFacility = () => {
        setEditingFacilityId('new');
        setTempFacility({
            name: '',
            description: '',
            category: '',
            image: ''
        });
    };

    const saveFacility = async () => {
        if (editingFacilityId === 'new') {
            const { error } = await supabase.from('facilities').insert([tempFacility]);
            if (error) {
                alert('Error adding facility: ' + error.message);
                return;
            }
            showSaveMessage('Facility added!');
        } else {
            // Strip ID from payload for updates
            const { id, ...payload } = tempFacility;
            const { error } = await supabase.from('facilities').update(payload).eq('id', editingFacilityId);
            if (error) {
                alert('Error updating facility: ' + error.message);
                return;
            }
            showSaveMessage('Facility updated!');
        }
        setEditingFacilityId(null);
        setTempFacility(null);
        await fetchData();
    };

    const deleteFacility = async (id) => {
        if (window.confirm('Are you sure you want to remove this facility?')) {
            const { error } = await supabase.from('facilities').delete().eq('id', id);
            if (error) {
                alert('Error deleting facility: ' + error.message);
            } else {
                await fetchData();
                showSaveMessage('Facility removed');
            }
        }
    };

    // --- BLOG MANAGEMENT ---
    const addBlog = () => {
        setEditingBlogId('new');
        setTempBlog({
            title: '',
            excerpt: '',
            content: '',
            author: 'Admin',
            date: new Date().toISOString().split('T')[0],
            category: 'Events',
            read_time: '3 min read',
            image: ''
        });
    };

    const saveBlog = async () => {
        if (!tempBlog.title || !tempBlog.excerpt || !tempBlog.content) {
            showSaveMessage('Title, excerpt, and content are required!');
            return;
        }

        if (editingBlogId === 'new') {
            const { error } = await supabase.from('blogs').insert([tempBlog]);
            if (error) {
                alert('Error adding blog: ' + error.message);
                return;
            }
            showSaveMessage('Blog post added!');
        } else {
            const { id, created_at, updated_at, ...payload } = tempBlog;
            const { error } = await supabase.from('blogs').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingBlogId);
            if (error) {
                alert('Error updating blog: ' + error.message);
                return;
            }
            showSaveMessage('Blog post updated!');
        }
        setEditingBlogId(null);
        setTempBlog(null);
        await fetchData();
    };

    const deleteBlog = async (id) => {
        if (window.confirm('Are you sure you want to delete this blog post?')) {
            const { error } = await supabase.from('blogs').delete().eq('id', id);
            if (error) {
                alert('Error deleting blog: ' + error.message);
            } else {
                await fetchData();
                showSaveMessage('Blog post deleted!');
            }
        }
    };

    const handleBlogImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const publicUrl = await uploadImage(file, 'blogs');
        if (publicUrl) {
            setTempBlog(prev => ({ ...prev, image: publicUrl }));
            showSaveMessage('Blog image uploaded!');
        }
        e.target.value = '';
    };

    // --- CLASS MANAGEMENT FUNCTIONS ---
    const downloadClassTemplate = () => {
        const templateData = [{
            'Student Name': 'Ali Ahmed', 'B-Form Number': '12345-1234567-1', 'Date of Birth': '2010-01-15',
            'Gender': 'Male', 'Religion': 'Islam', 'Nationality': 'Pakistani', 'Father Name': 'Ahmed Khan',
            'Father CNIC': '12345-1234567-1', 'Contact Number': '03001234567', 'WhatsApp Number': '03001234567',
            'Address': '123 Street, City', 'Allergies': 'No', 'Allergies Details': '',
            'Chronic Condition': 'No', 'Chronic Condition Details': '', 'Medication': 'No',
            'Medication Details': '', 'Fee Status': 'Pending'
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        ws['!cols'] = Array(18).fill({ wch: 15 });
        XLSX.writeFile(wb, `Class_${selectedClassForList}_Template.xlsx`);
        showSaveMessage('Template downloaded!');
    };

    // ── Excel field validators for student import ──
    const validateCNIC = (val) => {
        if (!val) return null;
        const s = String(val).trim();
        // Pakistani CNIC/B-Form: XXXXX-XXXXXXX-X  (dashes optional)
        const withDashes = /^\d{5}-\d{7}-\d{1}$/;
        const noDashes = /^\d{13}$/;
        if (withDashes.test(s) || noDashes.test(s)) return null;
        return `Invalid CNIC/B-Form format "${s}". Expected: XXXXX-XXXXXXX-X (e.g. 35202-1234567-1)`;
    };

    const validatePhone = (val) => {
        if (!val) return null;
        const s = String(val).trim().replace(/[\s\-()]/g, '');
        // Pakistani mobile: 03XXXXXXXXX or +923XXXXXXXXX or 923XXXXXXXXX
        const pkMobile = /^(0|\+?92)?3\d{9}$/;
        // Also allow landline: 0XX-XXXXXXX patterns
        const landline = /^0\d{2,3}\d{7,8}$/;
        if (pkMobile.test(s) || landline.test(s) || /^\+?\d{10,15}$/.test(s)) return null;
        return `Invalid phone number "${val}". Expected format: 03XXXXXXXXX`;
    };

    const validateGender = (val) => {
        if (!val) return null;
        const normalized = String(val).trim();
        const valid = ['Male', 'Female', 'Others', 'male', 'female', 'others', 'M', 'F', 'Boy', 'Girl', 'boy', 'girl'];
        if (valid.includes(normalized)) return null;
        return `Invalid gender "${val}". Expected: Male, Female, or Others`;
    };

    const normalizeGender = (val) => {
        if (!val) return '';
        const lower = String(val).trim().toLowerCase();
        if (['male', 'm', 'boy'].includes(lower)) return 'Male';
        if (['female', 'f', 'girl'].includes(lower)) return 'Female';
        if (['others', 'other'].includes(lower)) return 'Others';
        return String(val).trim();
    };

    const normalizeDate = (val) => {
        if (!val) return '';
        let s = String(val).trim();
        // If it's an Excel date serial number (5 digits)
        if (/^\d{5}$/.test(s)) {
            const excelSerial = parseInt(s, 10);
            const date = new Date((excelSerial - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }
        // If it's DD/MM/YYYY or DD-MM-YYYY
        const match = s.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})$/);
        if (match) {
            const day = match[1];
            const month = match[2];
            const year = match[3];
            return `${year}-${month}-${day}`;
        }
        // If already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            return s;
        }
        // Fallback standard parse
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
        return s;
    };

    const validateDOB = (val) => {
        if (!val) return null;
        const s = String(val).trim();
        // Accept YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or Excel serial numbers
        if (/^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{2}[/\-]\d{2}[/\-]\d{4}$/.test(s)) {
            const d = new Date(s);
            if (isNaN(d.getTime())) return `Invalid date "${s}". Could not parse.`;
            if (d.getFullYear() < 1950 || d.getFullYear() > new Date().getFullYear()) return `Unlikely date of birth "${s}".`;
            return null;
        }
        // Excel date serial number
        if (/^\d{5}$/.test(s)) return null;
        return `Invalid date format "${s}". Expected: YYYY-MM-DD`;
    };

    const importStudentsExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                // Use ArrayBuffer for better compatibility with different Excel formats
                const arrayBuffer = evt.target.result;
                const wb = XLSX.read(arrayBuffer, { type: 'array' });

                if (!wb.SheetNames || wb.SheetNames.length === 0) {
                    setImportReport({ success: 0, updated: 0, errors: [{ row: '-', field: 'File', message: 'Invalid Excel file: No sheets found.' }], warnings: [] });
                    return;
                }

                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    setImportReport({ success: 0, updated: 0, errors: [{ row: '-', field: 'Sheet', message: 'No data found. Check if the sheet is empty or headers are missing.' }], warnings: [] });
                    return;
                }

                console.log("Excel Headers Found:", Object.keys(data[0]));

                let successCount = 0;
                let updateCount = 0;
                const errors = [];    // { row, field, message } — blocks import for that row
                const warnings = [];  // { row, field, message } — imported but flagged
                const newStudents = [];
                const updatedStudents = [];
                const processedSerials = new Set();
                const processedIds = new Set();

                // Get existing serials to check for duplicates
                const existingSerialsMap = new Map();
                students.forEach(s => {
                    if (s.serialNumber) {
                        existingSerialsMap.set(String(s.serialNumber).trim().toLowerCase(), s.id);
                    }
                });

                data.forEach((row, index) => {
                    const rowNum = index + 2; // Excel row (1-header)
                    let rowHasError = false;

                    // Flexible Header Matching
                    const name = row['Student Name'] || row['Name'] || row['name'] || row['Student Name*'];
                    const serial = row['Serial No'] || row['Serial Number'] || row['Serial'] || row['S.No'];
                    const providedId = row['Student ID'] || row['Member ID'] || row['ID'];
                    const grade = row['Class'] || row['Grade'] || selectedClassForList || '';
                    const password = row['Password'] || '';

                    // ── Validate Name (Critical) ──
                    if (!name) {
                        if (Object.keys(row).length > 0) {
                            errors.push({ row: rowNum, field: 'Student Name', message: 'Missing student name. Row skipped.' });
                        }
                        return;
                    }
                    if (String(name).trim().length < 2) {
                        errors.push({ row: rowNum, field: 'Student Name', message: `Name "${name}" is too short (minimum 2 characters).` });
                        return;
                    }

                    // ── Validate CNIC / B-Form ──
                    const rawBForm = row['B-Form Number'];
                    const bFormErr = rawBForm ? validateCNIC(rawBForm) : null;
                    if (bFormErr) {
                        warnings.push({ row: rowNum, field: 'B-Form Number', message: bFormErr });
                    }

                    // ── Validate Father CNIC ──
                    const rawFatherCnic = row['Father CNIC'];
                    const fatherCnicErr = rawFatherCnic ? validateCNIC(rawFatherCnic) : null;
                    if (fatherCnicErr) {
                        warnings.push({ row: rowNum, field: 'Father CNIC', message: fatherCnicErr });
                    }

                    // ── Validate Contact Number ──
                    const rawContact = row['Contact Number'] || row['Contact'];
                    const contactErr = rawContact ? validatePhone(rawContact) : null;
                    if (contactErr) {
                        warnings.push({ row: rowNum, field: 'Contact Number', message: contactErr });
                    }

                    // ── Validate WhatsApp Number ──
                    const rawWhatsApp = row['WhatsApp Number'];
                    const whatsAppErr = rawWhatsApp ? validatePhone(rawWhatsApp) : null;
                    if (whatsAppErr) {
                        warnings.push({ row: rowNum, field: 'WhatsApp Number', message: whatsAppErr });
                    }

                    // ── Validate Gender ──
                    const rawGender = row['Gender'];
                    const genderErr = rawGender ? validateGender(rawGender) : null;
                    if (genderErr) {
                        warnings.push({ row: rowNum, field: 'Gender', message: genderErr });
                    }

                    // ── Validate Date of Birth ──
                    const rawDob = row['Date of Birth'] ? normalizeDate(row['Date of Birth']) : undefined;
                    const dobErr = rawDob ? validateDOB(rawDob) : null;
                    if (dobErr) {
                        warnings.push({ row: rowNum, field: 'Date of Birth', message: dobErr });
                    }

                    // Normalize gender for storage
                    const normalizedGender = rawGender ? normalizeGender(rawGender) : undefined;

                    // Check if this row refers to an existing student
                    let existingStudent = null;
                    if (providedId) {
                        existingStudent = students.find(s => s.id === providedId);
                    } else if (serial) {
                        const existingId = existingSerialsMap.get(String(serial).trim().toLowerCase());
                        if (existingId) existingStudent = students.find(s => s.id === existingId);
                    }

                    if (existingStudent) {
                        // UPDATE PATH
                        if (processedIds.has(existingStudent.id)) {
                            errors.push({ row: rowNum, field: 'Student ID', message: `Duplicate entry for student ID '${existingStudent.id}' in this file.` });
                            return;
                        }

                        // Check serial conflict if they are changing serial
                        if (serial) {
                            const newSerial = String(serial).trim().toLowerCase();
                            const conflictId = existingSerialsMap.get(newSerial);
                            if (conflictId && conflictId !== existingStudent.id) {
                                errors.push({ row: rowNum, field: 'Serial Number', message: `Serial '${serial}' belongs to another student.` });
                                return;
                            }
                            if (processedSerials.has(newSerial)) {
                                errors.push({ row: rowNum, field: 'Serial Number', message: `Duplicate Serial '${serial}' in this file.` });
                                return;
                            }
                            processedSerials.add(newSerial);
                        }

                        processedIds.add(existingStudent.id);

                        // Merge admissions info safely — DEEP COPY to avoid mutating
                        // the original student object in data.students (which would cause
                        // the diff in setStudents to miss changes and skip the DB write).
                        let admissions = (existingStudent.admissions || []).map(a => ({ ...a }));
                        if (admissions.length === 0) admissions.push({});

                        // update provided fields on the cloned admissions object
                        if (normalizedGender !== undefined) admissions[0].gender = normalizedGender;
                        if (row['Father Name'] !== undefined) admissions[0].fatherName = row['Father Name'];
                        if (rawContact !== undefined) admissions[0].contact = rawContact || '';
                        if (rawBForm !== undefined) admissions[0].bForm = rawBForm;
                        if (rawDob !== undefined) admissions[0].dob = rawDob;
                        if (row['Religion'] !== undefined) admissions[0].religion = row['Religion'];
                        if (row['Nationality'] !== undefined) admissions[0].nationality = row['Nationality'];
                        if (rawFatherCnic !== undefined) admissions[0].fatherCnic = rawFatherCnic;
                        if (rawWhatsApp !== undefined) admissions[0].whatsapp = rawWhatsApp;
                        if (row['Address'] !== undefined) admissions[0].address = row['Address'];

                        const updatedStudent = {
                            ...existingStudent,
                            name: name,
                            grade: grade || existingStudent.grade,
                            password: password || existingStudent.password,
                            serialNumber: serial ? String(serial).trim() : existingStudent.serialNumber,
                            admissions: admissions
                        };

                        updatedStudents.push(updatedStudent);
                        updateCount++;
                    } else {
                        // CREATE PATH
                        if (serial) {
                            const serialStr = String(serial).trim();
                            if (existingSerialsMap.has(serialStr.toLowerCase())) {
                                errors.push({ row: rowNum, field: 'Serial Number', message: `Serial '${serial}' already exists in system.` });
                                return;
                            }
                            if (processedSerials.has(serialStr.toLowerCase())) {
                                errors.push({ row: rowNum, field: 'Serial Number', message: `Duplicate Serial '${serial}' in this file.` });
                                return;
                            }
                            processedSerials.add(serialStr.toLowerCase());
                        }

                        let studentId = providedId;
                        if (!studentId) {
                            const year = new Date().getFullYear();
                            const maxNum = [...students, ...newStudents].reduce((max, s) => {
                                const match = s.id?.match(/ACS-\d{4}-(\d+)/);
                                return match ? Math.max(max, parseInt(match[1], 10)) : max;
                            }, 0);
                            const seq = String(maxNum + 1).padStart(3, '0');
                            studentId = `ACS-${year}-${seq}`;
                        } else {
                            if (students.some(s => s.id === studentId) || newStudents.some(s => s.id === studentId)) {
                                errors.push({ row: rowNum, field: 'Student ID', message: `Student ID '${studentId}' already exists.` });
                                return;
                            }
                        }

                        processedIds.add(studentId);

                        const newStudent = {
                            id: studentId,
                            serialNumber: serial ? String(serial).trim() : null,
                            name: name,
                            password: password || ('acs' + Math.floor(1000 + Math.random() * 9000)),
                            grade: grade,
                            image: '',
                            feeHistory: [],
                            results: [],
                            attendance: { present: 0, absent: 0, total: 0, percentage: 0 },
                            previous_results: [],
                            previousResults: [],
                            admissions: [{
                                date: new Date().toISOString(),
                                gender: normalizedGender || '',
                                fatherName: row['Father Name'] || '',
                                contact: rawContact || '',
                                bForm: rawBForm || '',
                                dob: rawDob || '',
                                religion: row['Religion'] || '',
                                nationality: row['Nationality'] || '',
                                fatherCnic: rawFatherCnic || '',
                                whatsapp: rawWhatsApp || '',
                                address: row['Address'] || ''
                            }]
                        };

                        newStudents.push(newStudent);
                        successCount++;
                    }
                });

                if (newStudents.length > 0 || updatedStudents.length > 0) {
                    // Merge updates + new students back into the FULL existing list.
                    const updatedMap = new Map(updatedStudents.map(s => [s.id, s]));
                    const mergedFull = students.map(s => updatedMap.has(s.id) ? updatedMap.get(s.id) : s);
                    newStudents.forEach(s => mergedFull.push(s));
                    const { error } = await setStudents(mergedFull);
                    if (error) {
                        errors.push({ row: '-', field: 'Database', message: error.message });
                    } else {
                        showSaveMessage(`${successCount + updateCount} students processed!`);
                        if (classImportFileRef.current) classImportFileRef.current.value = '';
                        await fetchData();
                    }
                    setImportReport({ success: successCount, updated: updateCount, errors, warnings });
                } else {
                    if (errors.length === 0) {
                        errors.push({ row: '-', field: 'Sheet', message: "No valid students found. Ensure your Excel has a 'Student Name' column." });
                    }
                    setImportReport({ success: 0, updated: 0, errors, warnings });
                }

            } catch (err) {
                console.error("Import Error:", err);
                setImportReport({ success: 0, updated: 0, errors: [{ row: '-', field: 'File', message: `Failed to process file: ${err.message || 'Invalid .xlsx format'}` }], warnings: [] });
            }
        };
        reader.readAsArrayBuffer(file);
    };


    const exportClassRoster = () => {
        const classStudents = students.filter(s =>
            getBaseClass(s.grade) === getBaseClass(selectedClassForList) &&
            (classDetailTab === 'all' || s.gender === (classDetailTab === 'boys' ? 'Male' : 'Female'))
        );
        const suffix = classDetailTab === 'all' ? 'All' : (classDetailTab === 'boys' ? 'Boys' : 'Girls');

        if (classStudents.length === 0) {
            alert(`No ${suffix.toLowerCase()} in this class!`);
            return;
        }

        const exportData = classStudents.map(s => {
            const adm = s.admissions?.[0] || {};
            return {
                'Serial No': s.serialNumber || '', // Added Serial No
                'Student ID': s.id, 'Student Name': s.name, 'B-Form Number': adm.bForm || '',
                'Date of Birth': adm.dob || '', 'Gender': s.gender || '', 'Religion': adm.religion || '',
                'Nationality': adm.nationality || '', 'Father Name': s.fatherName || '',
                'Father CNIC': adm.fatherCnic || '', 'Contact Number': adm.contact || '',
                'WhatsApp Number': adm.whatsapp || '', 'Address': adm.address || '',
                'Fee Dues': (s.feeHistory || []).filter(h => h.status === 'unpaid').length + ' unpaid month(s)', 'Password': s.password
            };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        // Sheet names have a max limit of 31 chars in Excel
        XLSX.utils.book_append_sheet(wb, ws, `${selectedClassForList} ${suffix}`.substring(0, 31));
        XLSX.writeFile(wb, `Class_${selectedClassForList}_${suffix}_Roster_${new Date().toISOString().split('T')[0]}.xlsx`);
        showSaveMessage(`Exported ${classStudents.length} ${suffix.toLowerCase()}!`);
    };

    // Common button style for Excel buttons
    const excelBtnStyle = {
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        borderRadius: 'var(--radius-md)',
        fontWeight: 'var(--font-weight-semibold)',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        cursor: 'pointer',
        transition: 'all var(--transition-base)'
    };

    const adminTabs = [
        { id: 'warehouse', label: 'Data Warehouse', icon: Database, category: 'DATA WAREHOUSE & BI', badge: '3-TIER', desc: 'Bronze Data Lake, Silver Data Vault 2.0 & Gold Star Schema.' },
        { id: 'bi-analytics', label: 'BI & OLAP Studio', icon: BarChart3, category: 'DATA WAREHOUSE & BI', badge: 'OLAP', desc: 'Multidimensional Slice & Dice, Roll-up, Drill-down & Risk Radar.' },
        { id: 'ai-agent', label: 'Groq AI BI Analyst', icon: Bot, category: 'DATA WAREHOUSE & BI', badge: 'AI', desc: 'Agentic AI Copilot querying the entire Data Warehouse via Groq LPU.' },
        { id: 'admissions', label: 'Admissions Desk', icon: PlusCircle, category: 'ACADEMIC & SIS', desc: 'Handle new enrollments, NADRA B-Forms, and walk-in inquiries.' },
        { id: 'classes', label: 'Classes & Sections', icon: Users, category: 'ACADEMIC & SIS', desc: 'View class rosters, BISE tracks, and manage student records.' },
        { id: 'marks', label: 'Exam Gradebook', icon: Award, category: 'ACADEMIC & SIS', desc: 'Input multi-term exam marks and configure subject weights.' },
        { id: 'attendance', label: 'Daily Attendance', icon: Calendar, category: 'ACADEMIC & SIS', desc: 'Track daily biometric/register attendance and absentees.' },
        { id: 'reports', label: 'Report Cards', icon: FileText, category: 'ACADEMIC & SIS', desc: 'Generate BISE-formatted transcript analysis and report cards.' },
        { id: 'academic-settings', label: 'Academic Hierarchy', icon: School, category: 'ACADEMIC & SIS', desc: 'Configure sections, classes, groups, and subject tracks.' },
        { id: 'fees', label: 'Fee Ledger & Challans', icon: DollarSign, category: 'FINANCE & HR', desc: 'Record monthly tuition fee challans, installments, and arrears.' },
        { id: 'expenses', label: 'Expense & P&L Ledger', icon: TrendingDown, category: 'FINANCE & HR', desc: 'Log institutional expenses, payroll, and net operating surplus.' },
        { id: 'faculty', label: 'Faculty & Staff', icon: User, category: 'FINANCE & HR', desc: 'Manage teaching staff qualifications and department profiles.' },
        { id: 'announcements', label: 'Noticeboard', icon: Megaphone, category: 'CAMPUS CMS', desc: 'Broadcast official notices to student and faculty portals.' },
        { id: 'facilities', label: 'Campus Facilities', icon: Building, category: 'CAMPUS CMS', desc: 'List and update campus labs and infrastructure.' },
        { id: 'blog', label: 'Website News', icon: Layout, category: 'CAMPUS CMS', desc: 'Publish institutional stories and news to the public portal.' }
    ];

    return (
        <div className="dashboard-container" style={{ overflowX: 'hidden' }}>
            {/* ── Confirm Modal ── */}
            {confirmModal.open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ maxWidth: '460px', width: '100%', padding: '2rem', textAlign: 'center', borderTop: `4px solid ${confirmModal.danger ? '#ef4444' : '#2563eb'}` }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>{confirmModal.title}</div>
                        <div style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>{confirmModal.message}</div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button onClick={closeConfirm} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => { confirmModal.onConfirm?.(); closeConfirm(); }} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: confirmModal.danger ? '#ef4444' : '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                {confirmModal.danger ? 'Yes, Delete' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Excel Import Report Modal ── */}
            {importReport && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
                    <div className="card animate-fade-in" style={{ maxWidth: '640px', width: '100%', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>

                        {/* Header */}
                        <div style={{
                            background: (importReport.errors.length > 0 && importReport.success === 0 && importReport.updated === 0)
                                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                                : importReport.warnings.length > 0
                                    ? 'linear-gradient(135deg, #d97706, #b45309)'
                                    : 'linear-gradient(135deg, #059669, #047857)',
                            color: 'white', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {(importReport.errors.length > 0 && importReport.success === 0 && importReport.updated === 0)
                                    ? <XCircle size={24} />
                                    : importReport.warnings.length > 0
                                        ? <AlertTriangle size={24} />
                                        : <CheckCircle size={24} />
                                }
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>Excel Import Report</div>
                                    <div style={{ opacity: 0.85, fontSize: '0.82rem', marginTop: '0.1rem' }}>
                                        {(importReport.success + importReport.updated) > 0
                                            ? `${importReport.success} added · ${importReport.updated} updated`
                                            : 'Import failed — no students processed'
                                        }
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setImportReport(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '0.35rem 0.65rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}>✕</button>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', maxHeight: '60vh', overflowY: 'auto' }}>

                            {/* ── Success Summary ── */}
                            {(importReport.success > 0 || importReport.updated > 0) && (
                                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <CheckCircle size={20} color="#059669" style={{ flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.95rem' }}>Successfully Processed</div>
                                        <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '0.15rem' }}>
                                            {importReport.success > 0 && <span>{importReport.success} new student{importReport.success !== 1 ? 's' : ''} added. </span>}
                                            {importReport.updated > 0 && <span>{importReport.updated} student{importReport.updated !== 1 ? 's' : ''} updated.</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Errors ── */}
                            {importReport.errors.length > 0 && (
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <XCircle size={16} color="#dc2626" />
                                        <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.9rem' }}>{importReport.errors.length} Error{importReport.errors.length !== 1 ? 's' : ''} — Rows Skipped</span>
                                    </div>
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ background: '#fee2e2', color: '#991b1b', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '50px' }}>Row</th>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '100px' }}>Field</th>
                                                    <th style={{ padding: '0.6rem 0.75rem' }}>Issue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importReport.errors.slice(0, 25).map((err, i) => (
                                                    <tr key={i} style={{ borderTop: i > 0 ? '1px solid #fecaca' : 'none' }}>
                                                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#b91c1c' }}>{err.row}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#991b1b' }}>{err.field}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: '#7f1d1d' }}>{err.message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {importReport.errors.length > 25 && (
                                            <div style={{ padding: '0.5rem 0.75rem', color: '#991b1b', fontSize: '0.75rem', fontWeight: 600, borderTop: '1px solid #fecaca' }}>...and {importReport.errors.length - 25} more errors</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Warnings ── */}
                            {importReport.warnings.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <AlertTriangle size={16} color="#d97706" />
                                        <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }}>{importReport.warnings.length} Warning{importReport.warnings.length !== 1 ? 's' : ''} — Imported but Check Values</span>
                                    </div>
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ background: '#fef3c7', color: '#92400e', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '50px' }}>Row</th>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '100px' }}>Field</th>
                                                    <th style={{ padding: '0.6rem 0.75rem' }}>Issue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importReport.warnings.slice(0, 25).map((warn, i) => (
                                                    <tr key={i} style={{ borderTop: i > 0 ? '1px solid #fde68a' : 'none' }}>
                                                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#b45309' }}>{warn.row}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#92400e' }}>{warn.field}</td>
                                                        <td style={{ padding: '0.5rem 0.75rem', color: '#78350f' }}>{warn.message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {importReport.warnings.length > 25 && (
                                            <div style={{ padding: '0.5rem 0.75rem', color: '#92400e', fontSize: '0.75rem', fontWeight: 600, borderTop: '1px solid #fde68a' }}>...and {importReport.warnings.length - 25} more warnings</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Tip for clean imports ── */}
                            {(importReport.errors.length > 0 || importReport.warnings.length > 0) && (
                                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.8rem', color: '#0c4a6e' }}>
                                    <Info size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} color="#0284c7" />
                                    <div>
                                        <strong>Tip:</strong> Download the class template for the correct column format.
                                        CNIC/B-Form should be <strong>XXXXX-XXXXXXX-X</strong>, phone should be <strong>03XXXXXXXXX</strong>, and gender should be <strong>Male</strong>, <strong>Female</strong>, or <strong>Others</strong>.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setImportReport(null)} className="btn btn-primary" style={{ padding: '0.6rem 1.75rem', fontWeight: 700 }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Change Admin Password Modal ── */}
            {showChangePwd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ maxWidth: '420px', width: '100%', padding: '2rem', borderTop: '4px solid #2563eb' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.25rem' }}>🔐 Change Admin Credentials</div>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Update the admin username and password stored in the database.</p>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>New Username</label>
                            <input className="form-input" value={newAdminUser} onChange={e => setNewAdminUser(e.target.value)} placeholder={adminCredentials.username || 'admin'} style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>New Password</label>
                            <input className="form-input" type="password" value={newAdminPwd} onChange={e => setNewAdminPwd(e.target.value)} placeholder="New password" style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Confirm Password</label>
                            <input className="form-input" type="password" value={newAdminPwdConfirm} onChange={e => setNewAdminPwdConfirm(e.target.value)} placeholder="Confirm password" style={{ width: '100%' }} />
                            {newAdminPwd && newAdminPwdConfirm && newAdminPwd !== newAdminPwdConfirm && (
                                <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.4rem' }}>⚠ Passwords do not match</div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowChangePwd(false); setNewAdminUser(''); setNewAdminPwd(''); setNewAdminPwdConfirm(''); }} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={async () => {
                                if (!newAdminUser.trim() || !newAdminPwd.trim()) { alert('Username and password cannot be empty.'); return; }
                                if (newAdminPwd !== newAdminPwdConfirm) { alert('Passwords do not match.'); return; }
                                const { error } = await changeAdminPassword(newAdminUser.trim(), newAdminPwd.trim());
                                if (!error) { showSaveMessage('✅ Admin credentials updated!'); setShowChangePwd(false); setNewAdminUser(''); setNewAdminPwd(''); setNewAdminPwdConfirm(''); }
                                else alert('Error updating: ' + error.message);
                            }} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                                disabled={newAdminPwd !== newAdminPwdConfirm && !!newAdminPwdConfirm}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Student Edit Modal ── */}
            {editingStudentId && editStudentData && (
                <Suspense fallback={null}>
                    <StudentEditModal
                        editStudentData={editStudentData}
                        setEditStudentData={setEditStudentData}
                        sectionClasses={sectionClasses}
                        handleStudentPhotoUpload={handleStudentPhotoUpload}
                        students={students}
                        setStudents={setStudents}
                        showSaveMessage={showSaveMessage}
                        editingStudentId={editingStudentId}
                        setEditingStudentId={setEditingStudentId}
                        SUBJECTS={SUBJECTS}
                        SECTIONS={SECTIONS}
                        CLASS_SERIAL_STARTS={CLASS_SERIAL_STARTS}
                        CLASS_GROUPS={CLASS_GROUPS}
                        CLASS_TRACKS={CLASS_TRACKS}
                        CLASS_SUBTRACKS={CLASS_SUBTRACKS}
                    />
                </Suspense>
            )}

            {/* ── Hidden File Inputs ── */}
            <input type="file" ref={attendanceFileRef} onChange={importAttendanceExcel} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
            <input type="file" ref={marksFileRef} onChange={importMarksExcel} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
            <input type="file" ref={feeFileRef} onChange={importFeeExcel} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
            <input type="file" ref={photoFileRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
            <input type="file" ref={facultyFileRef} onChange={handleFacultyPhotoUpload} accept="image/*" style={{ display: 'none' }} />
            <input type="file" ref={facilityFileRef} onChange={handleFacilityPhotoUpload} accept="image/*" style={{ display: 'none' }} />
            <input type="file" ref={blogImageRef} onChange={handleBlogImageUpload} accept="image/*" style={{ display: 'none' }} />
            <input type="file" ref={classImportFileRef} onChange={importStudentsExcel} accept=".xlsx,.xls" style={{ display: 'none' }} />

            {/* ── Save Toast ── */}
            {saveMessage && (
                <div className="animate-fade-in" style={{ position: 'fixed', top: '20px', right: '20px', background: 'var(--color-success)', color: 'white', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', zIndex: 1000, display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 'var(--font-weight-semibold)' }}>
                    <CheckCircle size={20} /> {saveMessage}
                </div>
            )}

            {/* ── MOBILE OVERLAY ── */}
            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

            {/* ── LEFT SIDEBAR (MINIMAL ENTERPRISE DW & BI NAVIGATION) ── */}
            <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ background: '#0f172a', borderRight: '1px solid #1e293b' }}>
                <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: '#2563eb', color: 'white', padding: '0.45rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Database size={18} strokeWidth={2.2} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#f8fafc', letterSpacing: '-0.01em', lineHeight: 1.2 }}>ACS Enterprise</div>
                            <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em' }}>DW &amp; BI WORKSPACE</div>
                        </div>
                    </div>
                    <button className="mobile-menu-btn" style={{ color: '#f8fafc' }} onClick={() => setIsSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <nav style={{ padding: '0.85rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', overflowY: 'auto', flex: 1 }}>
                    <button
                        onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                        className="btn"
                        style={{
                            justifyContent: 'flex-start',
                            padding: '0.6rem 0.85rem',
                            background: activeTab === 'dashboard' ? '#1e293b' : 'transparent',
                            color: activeTab === 'dashboard' ? '#ffffff' : '#94a3b8',
                            fontWeight: activeTab === 'dashboard' ? 600 : 500,
                            fontSize: '0.83rem',
                            borderRadius: '6px',
                            width: '100%',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Layout size={16} style={{ marginRight: '0.65rem', color: activeTab === 'dashboard' ? '#38bdf8' : '#64748b' }} />
                        Executive Command
                    </button>

                    {['DATA WAREHOUSE & BI', 'ACADEMIC & SIS', 'FINANCE & HR', 'CAMPUS CMS'].map((category) => (
                        <React.Fragment key={category}>
                            <div style={{ margin: '1rem 0 0.3rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {category}
                            </div>
                            {adminTabs
                                .filter((t) => t.category === category)
                                .map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    const isDW = tab.category === 'DATA WAREHOUSE & BI';
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
                                            className="btn"
                                            style={{
                                                justifyContent: 'space-between',
                                                padding: '0.58rem 0.85rem',
                                                background: isActive ? '#1e293b' : 'transparent',
                                                color: isActive ? '#ffffff' : '#94a3b8',
                                                fontWeight: isActive ? 600 : 500,
                                                fontSize: '0.82rem',
                                                borderRadius: '6px',
                                                width: '100%',
                                                textAlign: 'left',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                                <tab.icon size={16} style={{ marginRight: '0.65rem', color: isActive ? '#38bdf8' : isDW ? '#10b981' : '#64748b' }} />
                                                {tab.label}
                                            </span>
                                            {tab.badge && (
                                                <span style={{
                                                    fontSize: '0.62rem',
                                                    fontWeight: 700,
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    background: tab.badge === 'AI' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(59, 130, 246, 0.18)',
                                                    color: tab.badge === 'AI' ? '#34d399' : '#60a5fa'
                                                }}>
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                        </React.Fragment>
                    ))}
                </nav>

                <div style={{ padding: '0.85rem', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <button onClick={() => setCurrentPage('home')} className="btn" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.78rem', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px' }}>
                        <School size={14} /> Campus Website
                    </button>
                    <button onClick={() => { setNewAdminUser(adminCredentials.username || ''); setShowChangePwd(true); }} className="btn" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.78rem', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '6px' }}>
                        <Lock size={14} /> Security &amp; Credentials
                    </button>
                    <button onClick={handleLogout} className="btn" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px' }}>
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="dashboard-main" style={{ background: '#f8fafc' }}>

                {/* Minimal Enterprise Command Header */}
                <header className="dashboard-header" style={{ padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu size={22} />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                    {activeTab === 'dashboard' ? 'Executive DW & BI Control Center' : adminTabs.find(t => t.id === activeTab)?.label}
                                </h1>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                                    NEON DW ONLINE • {students.length} STUDENTS
                                </span>
                            </div>
                            <p style={{ color: '#64748b', margin: '0.15rem 0 0', fontSize: '0.82rem' }}>
                                {activeTab === 'dashboard'
                                    ? 'Unified Data Warehouse (Bronze Lake → Silver Data Vault 2.0 → Gold Kimball Star Schema) & Operational ERP'
                                    : adminTabs.find(t => t.id === activeTab)?.desc}
                            </p>
                        </div>
                    </div>

                    {/* Quick Command Strip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('warehouse')}
                            className="dw-btn"
                            style={{ background: activeTab === 'warehouse' ? '#0f172a' : '#ffffff', color: activeTab === 'warehouse' ? '#fff' : '#334155', border: '1px solid #cbd5e1', padding: '7px 13px', fontSize: '0.78rem' }}
                        >
                            <Database size={14} /> Data Warehouse
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('bi-analytics')}
                            className="dw-btn"
                            style={{ background: activeTab === 'bi-analytics' ? '#0f172a' : '#ffffff', color: activeTab === 'bi-analytics' ? '#fff' : '#334155', border: '1px solid #cbd5e1', padding: '7px 13px', fontSize: '0.78rem' }}
                        >
                            <BarChart3 size={14} /> BI &amp; OLAP Cube
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('ai-agent')}
                            className="dw-btn"
                            style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #1d4ed8', padding: '7px 14px', fontSize: '0.78rem' }}
                        >
                            <Bot size={14} /> Ask Groq AI Analyst
                        </button>
                    </div>
                </header>

                <div className="dashboard-content" style={{ padding: '1.5rem 2rem' }}>
                    {/* ── Executive Overview Dashboard ── */}
                    {activeTab === 'dashboard' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Enterprise Workspace Header Card */}
                            <div className="dw-hero-banner">
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <span className="dw-pill-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                            ACS HIGHER SECONDARY SCHOOL • DATA WAREHOUSE &amp; BI SUITE
                                        </span>
                                        {dataWarehouse && (
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {(dataWarehouse.metadata?.counts?.goldTotalRows || 0).toLocaleString()} Gold Fact/Dim Rows Ready
                                            </span>
                                        )}
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                        Institutional Data Warehouse, OLAP Analytics &amp; Operational ERP
                                    </h2>
                                    <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.875rem', maxWidth: '720px', lineHeight: 1.55 }}>
                                        Explore the 3-Tier Hybrid Data Warehouse (Bronze Lake, Silver Data Vault 2.0, Gold Kimball Star Schema), slice multidimensional OLAP cubes, or query the Groq AI BI Analyst.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => setActiveTab('warehouse')} className="dw-btn dw-btn-primary">
                                        <Database size={14} /> Open Data Warehouse
                                    </button>
                                    <button type="button" onClick={() => setActiveTab('bi-analytics')} className="dw-btn dw-btn-secondary">
                                        <BarChart3 size={14} /> Launch OLAP BI Studio
                                    </button>
                                    <button type="button" onClick={() => setActiveTab('ai-agent')} className="dw-btn dw-btn-secondary" style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}>
                                        <Bot size={14} /> Groq AI BI Copilot
                                    </button>
                                </div>
                            </div>

                            {/* Live Executive KPI Strip */}
                            {biSummary && (
                                <div className="dw-kpi-grid">
                                    <div className="dw-kpi-card" onClick={() => setActiveTab('classes')} style={{ cursor: 'pointer' }}>
                                        <div className="dw-kpi-label">ACTIVE ENROLLMENT (`dw_dim_student`)</div>
                                        <div className="dw-kpi-value">{biSummary.kpis.totalStudents}</div>
                                        <div className="dw-kpi-sub">{biSummary.kpis.boysCount} Boys • {biSummary.kpis.girlsCount} Girls (Pakistani Cohort)</div>
                                    </div>
                                    <div className="dw-kpi-card" onClick={() => setActiveTab('bi-analytics')} style={{ cursor: 'pointer' }}>
                                        <div className="dw-kpi-label">INSTITUTION EXAM MEAN</div>
                                        <div className="dw-kpi-value">{biSummary.kpis.overallExamAvg}%</div>
                                        <div className="dw-kpi-sub">Pass Rate: {biSummary.kpis.overallPassRate}% • Attendance: {biSummary.kpis.overallAttendancePct}%</div>
                                    </div>
                                    <div className="dw-kpi-card" onClick={() => setActiveTab('fees')} style={{ cursor: 'pointer' }}>
                                        <div className="dw-kpi-label">FEE REVENUE COLLECTED</div>
                                        <div className="dw-kpi-value" style={{ color: '#059669' }}>PKR {(biSummary.kpis.totalCollected / 1000000).toFixed(2)}M</div>
                                        <div className="dw-kpi-sub">Recovery Rate: {biSummary.kpis.collectionEfficiency}% • Arrears: PKR {(biSummary.kpis.totalArrears / 1000).toFixed(0)}K</div>
                                    </div>
                                    <div className="dw-kpi-card" onClick={() => setActiveTab('warehouse')} style={{ cursor: 'pointer' }}>
                                        <div className="dw-kpi-label">WAREHOUSE RECORDS SYNCED</div>
                                        <div className="dw-kpi-value">
                                            {((dataWarehouse?.metadata?.counts?.bronzeTotalRows || 0) + (dataWarehouse?.metadata?.counts?.silverTotalRows || 0) + (dataWarehouse?.metadata?.counts?.goldTotalRows || 0)).toLocaleString()}
                                        </div>
                                        <div className="dw-kpi-sub">Bronze + Silver Data Vault 2.0 + Gold Star Schema</div>
                                    </div>
                                </div>
                            )}

                            {/* Categorized Minimal Enterprise Module Blueprint */}
                            {['DATA WAREHOUSE & BI', 'ACADEMIC & SIS', 'FINANCE & HR', 'CAMPUS CMS'].map((category) => (
                                <div key={category}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                                            {category}
                                        </span>
                                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0', marginLeft: '12px' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' }}>
                                        {adminTabs
                                            .filter((t) => t.category === category)
                                            .map((tab) => {
                                                const isHighlight = category === 'DATA WAREHOUSE & BI';
                                                return (
                                                    <div
                                                        key={tab.id}
                                                        onClick={() => setActiveTab(tab.id)}
                                                        style={{
                                                            padding: '1.2rem 1.3rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '0.75rem',
                                                            background: '#ffffff',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '10px',
                                                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.borderColor = '#94a3b8';
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.06)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.03)';
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <div style={{
                                                                background: isHighlight ? '#eff6ff' : '#f8fafc',
                                                                color: isHighlight ? '#2563eb' : '#334155',
                                                                border: isHighlight ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                                                padding: '0.55rem',
                                                                borderRadius: '8px',
                                                                display: 'inline-flex'
                                                            }}>
                                                                <tab.icon size={18} strokeWidth={2} />
                                                            </div>
                                                            {tab.badge && (
                                                                <span style={{
                                                                    fontSize: '0.66rem',
                                                                    fontWeight: 700,
                                                                    padding: '2px 8px',
                                                                    borderRadius: '6px',
                                                                    background: '#f1f5f9',
                                                                    color: '#334155'
                                                                }}>
                                                                    {tab.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 style={{ fontWeight: 600, fontSize: '0.96rem', color: '#0f172a', margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>
                                                                {tab.label}
                                                            </h3>
                                                            <p style={{ color: '#64748b', fontSize: '0.81rem', lineHeight: 1.45, margin: 0 }}>
                                                                {tab.desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Tab Content ── */}
                    {activeTab !== 'dashboard' && (
                        <div className="animate-fade-in">
                            <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading Module…</div>}>
                                {/* Enterprise Data Warehouse Workbench */}
                                {activeTab === 'warehouse' && (
                                    <WarehouseTab
                                        dataWarehouse={dataWarehouse}
                                        loadPakistaniDWDataset={loadPakistaniDWDataset}
                                        runWarehouseETL={runWarehouseETL}
                                        showToast={showToast}
                                    />
                                )}

                                {/* Executive BI & OLAP Cube Studio */}
                                {activeTab === 'bi-analytics' && (
                                    <BIAnalyticsTab
                                        dataWarehouse={dataWarehouse}
                                        biSummary={biSummary}
                                        onNavigateTab={setActiveTab}
                                    />
                                )}

                                {/* Groq Agentic AI BI Analyst */}
                                {activeTab === 'ai-agent' && (
                                    <AIAgentTab
                                        dataWarehouse={dataWarehouse}
                                        biSummary={biSummary}
                                        showToast={showToast}
                                    />
                                )}

                                {/* Gradebook */}
                                {activeTab === 'marks' && (
                                    <GradebookTab
                                        students={students} selectedClass={selectedClass} setSelectedClass={setSelectedClass} sectionClasses={sectionClasses}
                                        SECTIONS={SECTIONS} CLASSES={CLASSES} CLASS_TRACKS={CLASS_TRACKS} CLASS_SUBTRACKS={CLASS_SUBTRACKS} CLASS_GROUPS={CLASS_GROUPS}
                                        TERMS={TERMS} SUBJECTS={SUBJECTS} WEIGHTS={WEIGHTS} EXCLUSIONS={EXCLUSIONS}
                                        gbTerm={gbTerm} setGbTerm={setGbTerm} gbGenderTab={gbGenderTab} setGbGenderTab={setGbGenderTab}
                                        gbEdits={gbEdits} setGbEdits={setGbEdits} gbSaving={gbSaving}
                                        showGbStats={showGbStats} setShowGbStats={setShowGbStats}
                                        showGbSettings={showGbSettings} setShowGbSettings={setShowGbSettings}
                                        newSubjectInput={newSubjectInput} setNewSubjectInput={setNewSubjectInput}
                                        newTermInput={newTermInput} setNewTermInput={setNewTermInput}
                                        updateClassSubjects={updateClassSubjects} updateClassTerms={updateClassTerms} updateTerms={updateTerms} updateWeights={updateWeights} updateExclusions={updateExclusions}
                                        saveGradebook={saveGradebook} downloadGradebookTemplate={downloadGradebookTemplate}
                                        exportGradebookExcel={exportGradebookExcel} archiveTerm={archiveTerm}
                                        exportResultPDF={exportResultPDF} importGradebookExcel={importGradebookExcel}
                                        gbImportFileRef={gbImportFileRef} getCellValue={getCellValue} handleCellEdit={handleCellEdit} saveRemarks={saveRemarks}
                                        renameSubject={renameSubject} updateSubjectsForClasses={updateSubjectsForClasses}
                                        migrateWeightsToClassScoped={migrateWeightsToClassScoped}
                                    />
                                )}

                                {/* Attendance */}
                                {activeTab === 'attendance' && (
                                    <AttendanceTab
                                        students={students} 
                                        selectedClasses={selectedAttendanceClasses} setSelectedClasses={setSelectedAttendanceClasses} 
                                        sectionClasses={sectionClasses}
                                        attDateFilter={attDateFilter} setAttDateFilter={setAttDateFilter}
                                        markAttendance={markAttendance} removeAttendanceRecord={removeAttendanceRecord}
                                        exportAttendanceExcel={exportAttendanceExcel} fetchData={fetchData}
                                        showSaveMessage={showSaveMessage} openConfirm={openConfirm}
                                        schoolName={schoolData?.name}
                                        schoolLogo={schoolData?.logo || '/logo.png'}
                                        sections={SECTIONS}
                                    />
                                )}

                                {/* Fee */}
                                {activeTab === 'fees' && (
                                    <FeeTab
                                        students={students} selectedClass={selectedClass} setSelectedClass={setSelectedClass} sectionClasses={sectionClasses}
                                        openFeeMonthRange={openFeeMonthRange}
                                        markAllPaidForMonth={markAllPaidForMonth} markAllUnpaidForMonth={markAllUnpaidForMonth}
                                        updateStudentFeeRecord={updateStudentFeeRecord}
                                        CLASS_FEE_DEFAULTS={CLASS_FEE_DEFAULTS} updateClassFeeDefaults={updateClassFeeDefaults}
                                    />
                                )}

                                {/* Expenses */}
                                {activeTab === 'expenses' && (
                                    <ExpensesTab
                                        EXPENSES={EXPENSES}
                                        updateExpenses={updateExpenses}
                                        students={students}
                                    />
                                )}

                                {/* Admissions */}
                                {activeTab === 'admissions' && (
                                    <AdmissionsTab
                                        admissionData={admissionData} setAdmissionData={setAdmissionData}
                                        admissionInitialState={admissionInitialState}
                                        printAdmissionForm={printAdmissionForm}
                                        printAdmissionFormBulk={printAdmissionFormBulk}
                                        handleAdmissionPhotoUpload={handleAdmissionPhotoUpload}
                                        photoFileRef={photoFileRef} sectionClasses={sectionClasses}
                                        students={students} setStudents={setStudents}
                                        SUBJECTS={SUBJECTS} TERMS={TERMS}
                                        SECTIONS={SECTIONS} CLASSES={CLASSES}
                                        CLASS_GROUPS={CLASS_GROUPS} CLASS_TRACKS={CLASS_TRACKS} CLASS_SUBTRACKS={CLASS_SUBTRACKS}
                                        inquiries={schoolData.inquiries || []}
                                        setInquiries={setInquiries}
                                        deleteInquiry={deleteInquiry}
                                        schoolName={schoolData.name}
                                        printFeeVoucher={printFeeVoucher}
                                        printInquiryRecord={printInquiryRecord}
                                    />
                                )}

                                {/* Reports */}
                                {activeTab === 'reports' && (
                                    <ReportsTab
                                        students={students}
                                        CLASSES={CLASSES}
                                        TERMS={TERMS}
                                        SECTIONS={SECTIONS}
                                        selectedClasses={selectedReportClasses} setSelectedClasses={setSelectedReportClasses}
                                        reportTerm={reportTerm} setReportTerm={setReportTerm}
                                        reportGender={reportGender} setReportGender={setReportGender}
                                        reportStatus={reportStatus} setReportStatus={setReportStatus}
                                        reportSearch={reportSearch} setReportSearch={setReportSearch}
                                        downloadStudentReport={downloadStudentReport}
                                        printBulkReports={printBulkReports}
                                        saveRemark={saveRemark}
                                    />
                                )}

                                {/* Announcements */}
                                {activeTab === 'announcements' && (
                                    <AnnouncementsTab
                                        schoolData={schoolData}
                                        newAnnouncement={newAnnouncement} setNewAnnouncement={setNewAnnouncement}
                                        addAnnouncement={addAnnouncement} deleteAnnouncement={deleteAnnouncement}
                                    />
                                )}

                                {/* Faculty */}
                                {activeTab === 'faculty' && (
                                    <FacultyTab
                                        schoolData={schoolData}
                                        editingFacultyId={editingFacultyId} setEditingFacultyId={setEditingFacultyId}
                                        tempFacultyMember={tempFacultyMember} setTempFacultyMember={setTempFacultyMember}
                                        addFaculty={addFaculty} saveFaculty={saveFaculty} deleteFaculty={deleteFaculty}
                                        facultyFileRef={facultyFileRef}
                                    />
                                )}

                                {/* Facilities */}
                                {activeTab === 'facilities' && (
                                    <FacilitiesTab
                                        schoolData={schoolData}
                                        editingFacilityId={editingFacilityId} setEditingFacilityId={setEditingFacilityId}
                                        tempFacility={tempFacility} setTempFacility={setTempFacility}
                                        addFacility={addFacility} saveFacility={saveFacility} deleteFacility={deleteFacility}
                                        facilityFileRef={facilityFileRef}
                                    />
                                )}

                                {/* Blog */}
                                {activeTab === 'blog' && (
                                    <BlogTab
                                        schoolData={schoolData}
                                        editingBlogId={editingBlogId} setEditingBlogId={setEditingBlogId}
                                        tempBlog={tempBlog} setTempBlog={setTempBlog}
                                        addBlog={addBlog} saveBlog={saveBlog} deleteBlog={deleteBlog}
                                        blogImageRef={blogImageRef}
                                    />
                                )}

                                {/* Class Lists */}
                                {activeTab === 'classes' && (
                                    <ClassListsTab
                                        students={students} setStudents={setStudents}
                                        deleteStudent={deleteStudent}
                                        SECTIONS={SECTIONS} CLASSES={CLASSES}
                                        CLASS_GROUPS={CLASS_GROUPS} CLASS_TRACKS={CLASS_TRACKS} CLASS_SUBTRACKS={CLASS_SUBTRACKS}
                                        updateSections={updateSections} updateClasses={updateClasses}
                                        updateClassGroups={updateClassGroups} updateClassTracks={updateClassTracks} updateClassSubTracks={updateClassSubTracks}
                                        selectedClassForList={selectedClassForList} setSelectedClassForList={setSelectedClassForList}
                                        viewingClass={viewingClass} setViewingClass={setViewingClass}
                                        classDetailTab={classDetailTab} setClassDetailTab={setClassDetailTab}
                                        selectedSectionId={selectedSectionId} setSelectedSectionId={setSelectedSectionId}
                                        editingStudentId={editingStudentId} setEditingStudentId={setEditingStudentId}
                                        editStudentData={editStudentData} setEditStudentData={setEditStudentData}
                                        classImportFileRef={classImportFileRef} importStudentsExcel={importStudentsExcel}
                                        exportClassRoster={exportClassRoster} exportPasswordsPDF={exportPasswordsPDF}
                                        setActiveTab={setActiveTab} setAdmissionData={setAdmissionData}
                                        showSaveMessage={showSaveMessage} openConfirm={openConfirm}
                                        CLASS_SERIAL_STARTS={CLASS_SERIAL_STARTS} updateClassSerialStarts={updateClassSerialStarts}
                                        uploadImage={uploadImage}
                                    />
                                )}

                                {/* Academic Settings */}
                                {activeTab === 'academic-settings' && (
                                    <AcademicSettingsTab
                                        SECTIONS={SECTIONS} CLASSES={CLASSES}
                                        CLASS_GROUPS={CLASS_GROUPS}
                                        CLASS_TRACKS={CLASS_TRACKS}
                                        CLASS_SUBTRACKS={CLASS_SUBTRACKS}
                                        updateSections={updateSections} updateClasses={updateClasses}
                                        updateClassGroups={updateClassGroups}
                                        updateClassTracks={updateClassTracks}
                                        updateClassSubTracks={updateClassSubTracks}
                                        students={students} setStudents={setStudents}
                                        showSaveMessage={showSaveMessage}
                                    />
                                )}
                            </Suspense>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminPortal;
