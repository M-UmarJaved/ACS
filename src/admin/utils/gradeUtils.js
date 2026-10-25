// ── Grade & Result Utility Functions ──
// Used across Gradebook, PDF Report, Student Report tabs.

export const calcGrade = (pct) => {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
};

export const gradeColor = (pct) => {
    if (pct >= 80) return { bg: '#dcfce7', text: '#15803d' };
    if (pct >= 60) return { bg: '#dbeafe', text: '#1d4ed8' };
    if (pct >= 50) return { bg: '#fef9c3', text: '#a16207' };
    if (pct >= 40) return { bg: '#ffedd5', text: '#c2410c' };
    return { bg: '#fee2e2', text: '#dc2626' };
};

export const calcOverallPct = (results, getSubjectTotal) => {
    if (!results || results.length === 0) return 0;
    let totalObtained = 0, totalMax = 0;
    results.forEach(r => {
        const subTotal = (typeof getSubjectTotal === 'function')
            ? getSubjectTotal(r.subject, r.term)
            : (Number(r.total) || 100);
        let obtained = r.obtained;
        if (obtained === undefined || obtained === null) {
            obtained = r.percentage !== undefined ? Math.round(((Number(r.percentage) || 0) / 100) * subTotal) : 0;
        }
        let numObtained = 0;
        if (obtained === 'A' || obtained === 'a' || String(obtained).toLowerCase() === 'absent') {
            numObtained = 0;
        } else {
            const parsed = Number(obtained);
            numObtained = isNaN(parsed) ? 0 : parsed;
        }
        totalObtained += numObtained;
        totalMax += (isNaN(subTotal) || subTotal <= 0 ? 100 : subTotal);
    });
    return totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
};

export const getTermResults = (student, termLabel) =>
    (student.results || []).filter(r => r.term === termLabel);

export const filterByGender = (studentsList, genderTab) => {
    if (genderTab === 'all') return studentsList;
    const genderVal = genderTab === 'boys' ? 'Male' : 'Female';
    return studentsList.filter(s => (s.gender || s.admissions?.[0]?.gender) === genderVal);
};

// ── Presets for sections, base classes, subject tracks and subtracks ────────────

/**
 * Normalizes subject names to prevent duplicate columns due to spelling/typo variations.
 */
export const canonicalSubjectName = (rawName) => {
    if (!rawName) return '';
    const s = String(rawName).trim();
    const lower = s.toLowerCase().replace(/[\s\-_.]+/g, ' ');

    if (lower === 'english' || lower === 'englsih' || lower === 'eng' || lower === 'english compulsory') return 'English';
    if (lower === 'urdu' || lower === 'urdu compulsory') return 'Urdu';
    if (lower === 'pakistan studies' || lower === 'pak studies' || lower === 'pak study' || lower === 'pakistan study' || lower === 'pakstudies' || lower === 'p st' || lower === 'ps') return 'Pakistan Studies';
    if (lower.includes('tarjma') || lower.includes('tarjuma') || lower === 'quran' || lower.includes('quran') || lower === 'tq' || lower === 't quran' || lower === 't.quran' || lower.includes('t.h.q') || lower.includes('thq')) return 'Tarjuma-tul-Quran';
    if (lower.includes('elective') && (lower.includes('islam') || lower.includes('islamiat') || lower.includes('is'))) return 'Islamic Studies (Elective)';
    if (lower === 'islamic studies' || lower === 'is' || lower === 'islamiat' || lower === 'islamiyat' || lower === 'islamic education' || lower === 'islamiyat compulsory') return 'Islamic Studies';
    if (lower.includes('nazar') || lower.includes('nazra') || lower === 'n.q' || lower === 'nq' || lower === 'n quran') return 'Nazar Quran';
    if (lower === 'w a u' || lower === 'wau' || lower === 'w.a.u' || lower === 'w. a.u' || lower.includes('world around')) return 'W. A.U';
    if (lower === 'g k' || lower === 'gk' || lower === 'g.k' || lower.includes('general knowledge')) return 'General Knowledge';
    if (lower === 's st' || lower === 'sst' || lower === 's.st' || lower.includes('social study') || lower.includes('social studies')) return 'Social Studies';
    if (lower === 'physics' || lower === 'phys') return 'Physics';
    if (lower === 'chemistry' || lower === 'chem') return 'Chemistry';
    if (lower === 'biology' || lower === 'bio') return 'Biology';
    if (lower === 'computer science' || lower === 'computer' || lower === 'cs' || lower === 'comp' || lower === 'comp science') return 'Computer Science';
    if (lower === 'mathematics' || lower === 'math' || lower === 'maths') return 'Mathematics';
    if (lower === 'general math' || lower === 'general mathematics' || lower === 'gen math') return 'General Math';
    if (lower === 'general science' || lower === 'gen science' || lower === 'g science' || lower === 'science') return 'General Science';
    if (lower === 'statistics' || lower === 'stats' || lower === 'stat') return 'Statistics';
    if (lower === 'economics' || lower === 'econ') return 'Economics';
    if (lower === 'civics') return 'Civics';
    if (lower === 'education' || lower === 'edu') return 'Education';
    if (lower === 'sociology' || lower === 'soc') return 'Sociology';
    if (lower === 'home economics' || lower === 'home econ') return 'Home Economics';
    if (lower === 'fine arts' || lower === 'arts') return 'Fine Arts';

    return s;
};

/**
 * Deduplicates and canonicalizes an array of subject strings.
 */
export const dedupeSubjectsList = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const result = [];
    list.forEach(item => {
        if (!item || typeof item !== 'string') return;
        const trimmed = item.trim();
        if (!trimmed) return;
        const canon = canonicalSubjectName(trimmed);
        const canonKey = canon.toLowerCase();
        if (!seen.has(canonKey)) {
            seen.add(canonKey);
            result.push(canon);
        }
    });
    return result;
};

export const SECTION_PRESETS = {
    "Primary": {
        baseClasses: ["Playgroup", "Nursery", "K.G", "1st", "2nd", "3rd", "4th", "5th"],
        subjectGroups: [],
        subTrackConfig: {}
    },
    "Middle": {
        baseClasses: ["6th", "7th", "8th"],
        subjectGroups: [],
        subTrackConfig: {}
    },
    "Matric": {
        baseClasses: ["9th", "10th"],
        subjectGroups: ["Biology", "Computer", "Computer Arts", "Arts"],
        subTrackConfig: {
            "Arts": ["Simple Arts", "Computer Arts"]
        }
    },
    "Intermediate": {
        baseClasses: ["1st Year", "2nd Year"],
        subjectGroups: ["Pre-Medical", "Pre-Engineering", "ICS", "Humanities"],
        subTrackConfig: {
            "ICS": ["Physics", "Economics", "Statistics"],
            "Humanities": ["FAIT", "FA"]
        }
    },
    "BS (Hons)": {
        baseClasses: ["BSCS", "BS English", "BS Math"],
        subjectGroups: ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
                        "5th Semester", "6th Semester", "7th Semester", "8th Semester"],
        subTrackConfig: {}
    }
};

export const getPreset = (sectionName) =>
    SECTION_PRESETS[sectionName] || { baseClasses: [], subjectGroups: [], subTrackConfig: {} };

/**
 * Normalizes any class string into its standard base class.
 */
export const getBaseClass = (rawGrade) => {
    if (!rawGrade) return '';
    const s = String(rawGrade).trim();
    const lower = s.toLowerCase();

    if (lower.startsWith('playgroup') || lower.startsWith('play group') || lower.startsWith('p.g') || lower === 'pg' || lower.startsWith('pg ')) return 'Playgroup';
    if (lower.startsWith('nursery')) return 'Nursery';
    if (lower.startsWith('k.g') || lower.startsWith('kg') || lower.startsWith('prep')) return 'K.G';
    if (lower.startsWith('1st') && !lower.includes('year') && !lower.includes('sem')) return '1st';
    if (lower.startsWith('2nd') && !lower.includes('year') && !lower.includes('sem')) return '2nd';
    if (lower.startsWith('3rd')) return '3rd';
    if (lower.startsWith('4th')) return '4th';
    if (lower.startsWith('5th')) return '5th';
    if (lower.startsWith('6th')) return '6th';
    if (lower.startsWith('7th')) return '7th';
    if (lower.startsWith('8th')) return '8th';
    if (lower.startsWith('9th') || lower.startsWith('9 ') || lower === '9') return '9th';
    if (lower.startsWith('10th') || lower.startsWith('10 ') || lower === '10') return '10th';
    if (lower.startsWith('1st year') || lower.startsWith('first year') || lower.startsWith('inter 1') || lower.startsWith('11th')) return '1st Year';
    if (lower.startsWith('2nd year') || lower.startsWith('second year') || lower.startsWith('inter 2') || lower.startsWith('12th')) return '2nd Year';

    for (const preset of Object.values(SECTION_PRESETS)) {
        for (const base of preset.baseClasses) {
            if (s === base || s.startsWith(base + ' ')) return base;
        }
    }

    return s;
};

/**
 * Extracts the subject track from a student record or raw grade string.
 */
export const getStudentTrack = (student) => {
    if (!student) return null;
    const explicit = student.admissions?.[0]?.subjectTrack || student.subjectTrack || student.track;
    const grade = String(student.grade || '').toLowerCase();
    const base = getBaseClass(student.grade);

    if (explicit) {
        const expLower = String(explicit).trim().toLowerCase();
        if (expLower === 'pre-medical' || expLower.includes('pre-med') || expLower.includes('pre med') || expLower.includes('medical') || expLower === 'med') return 'Pre-Medical';
        if (expLower === 'pre-engineering' || expLower.includes('pre-eng') || expLower.includes('pre eng') || expLower.includes('engineering') || expLower === 'eng') return 'Pre-Engineering';
        if (expLower.startsWith('ics') || expLower === 'cs' || expLower.includes('computer science') || expLower.includes('ics') || expLower === 'economics' || expLower === 'statistics' || expLower === 'physics') {
            if (base === '1st Year' || base === '2nd Year' || grade.includes('1st') || grade.includes('2nd') || grade.includes('inter')) return 'ICS';
        }
        if (expLower === 'fa' || expLower === 'fait' || expLower === 'fa it' || expLower === 'fa-it' || expLower === 'humanities') {
            if (base === '1st Year' || base === '2nd Year') return 'Humanities';
            if (base === '9th' || base === '10th') return 'Arts';
            return 'Humanities';
        }
        if (expLower === 'biology' || expLower === 'bio') {
            if (base === '1st Year' || base === '2nd Year') return 'Pre-Medical';
            return 'Biology';
        }
        if (expLower === 'computer arts' || expLower === 'comp arts') return 'Computer Arts';
        if (expLower === 'computer' || expLower === 'comp') {
            if (base === '1st Year' || base === '2nd Year') return 'ICS';
            return 'Computer';
        }
        if (expLower === 'simple arts' || expLower === 'arts') return 'Arts';
        return explicit;
    }

    if (grade.includes('bio')) {
        if (base === '1st Year' || base === '2nd Year') return 'Pre-Medical';
        return 'Biology';
    }
    if (grade.includes('comp arts') || grade.includes('computer arts')) return 'Computer Arts';
    if (grade.includes('comp') || grade.includes('cs') || grade.includes('ics')) {
        if (grade.includes('1st') || grade.includes('2nd') || grade.includes('inter') || base === '1st Year' || base === '2nd Year') return 'ICS';
        return 'Computer';
    }
    if (grade.includes('pre-med') || grade.includes('medical')) return 'Pre-Medical';
    if (grade.includes('pre-eng') || grade.includes('engineering')) return 'Pre-Engineering';
    if (grade.includes('fait') || grade.includes('fa it') || grade.includes('fa-it') || grade.includes('humanities') || grade.includes('fa')) {
        if (base === '1st Year' || base === '2nd Year') return 'Humanities';
        if (base === '9th' || base === '10th') return 'Arts';
        return 'Humanities';
    }
    if (grade.includes('arts')) return 'Arts';

    const results = student.results || [];
    const subjects = results.map(r => canonicalSubjectName(r.subject).toLowerCase());
    if (subjects.some(sub => sub.includes('biology'))) {
        if (base === '1st Year' || base === '2nd Year') return 'Pre-Medical';
        return 'Biology';
    }
    if (subjects.some(sub => sub.includes('computer science') || sub.includes('computer') || sub.includes('econom') || sub.includes('statist'))) {
        if (base === '1st Year' || base === '2nd Year') return 'ICS';
        if (subjects.some(sub => sub.includes('general math') || sub.includes('general science') || sub.includes('education'))) return 'Computer Arts';
        return 'Computer';
    }
    if (base === '1st Year' || base === '2nd Year') {
        if (subjects.some(sub => sub.includes('math')) && subjects.some(sub => sub.includes('phys') || sub.includes('chem'))) {
            return 'Pre-Engineering';
        }
        if (subjects.some(sub => sub.includes('sociol') || sub.includes('education') || sub.includes('islamic studies (elective)'))) {
            return 'Humanities';
        }
    }

    return null;
};

/**
 * Extracts sub-track (e.g. Physics, Economics, Statistics for ICS; FAIT, FA for Humanities; Simple Arts, Computer Arts for Arts).
 */
export const getStudentSubTrack = (student) => {
    if (!student) return null;
    const explicit = student.admissions?.[0]?.subTrack || student.subTrack;
    if (explicit) {
        const expLower = String(explicit).trim().toLowerCase();
        if (expLower === 'it' || expLower === 'fa it' || expLower === 'fait' || expLower === 'fa-it') return 'FAIT';
        if (expLower === 'simple' || expLower === 'fa simple' || expLower === 'fa' || expLower === 'simple fa' || expLower === 'fa-simple') return 'FA';
        if (expLower === 'physics' || expLower === 'phys' || expLower.includes('phys')) return 'Physics';
        if (expLower === 'economics' || expLower === 'econ' || expLower.includes('econ')) return 'Economics';
        if (expLower === 'statistics' || expLower === 'stats' || expLower === 'stat' || expLower.includes('stat')) return 'Statistics';
        if (expLower === 'computer arts' || expLower === 'comp arts') return 'Computer Arts';
        if (expLower === 'simple arts') return 'Simple Arts';
        return explicit;
    }

    const rawTrack = String(student.admissions?.[0]?.subjectTrack || student.subjectTrack || student.track || '').toLowerCase();
    if (rawTrack.includes('econ')) return 'Economics';
    if (rawTrack.includes('stat')) return 'Statistics';
    if (rawTrack.includes('physic')) return 'Physics';
    if (rawTrack === 'fa it' || rawTrack === 'fait' || rawTrack === 'fa-it' || rawTrack.includes('fait') || rawTrack.includes('fa it') || rawTrack.includes('fa-it')) return 'FAIT';
    if (rawTrack === 'fa' || rawTrack === 'simple fa' || rawTrack === 'fa simple' || rawTrack.includes('simple') || rawTrack.includes('civic') || rawTrack.includes('sociolog')) return 'FA';
    if (rawTrack === 'computer arts' || rawTrack === 'comp arts') return 'Computer Arts';
    if (rawTrack === 'simple arts') return 'Simple Arts';

    const grade = String(student.grade || '').toLowerCase();
    if (grade.includes('econ')) return 'Economics';
    if (grade.includes('stat')) return 'Statistics';
    if (grade.includes('physic')) return 'Physics';
    if (grade.includes('fait') || grade.includes('fa-it')) return 'FAIT';
    if (grade.includes('comp arts') || grade.includes('computer arts')) return 'Computer Arts';
    if (grade.includes('simple arts')) return 'Simple Arts';
    if (grade.includes('simple') || grade.includes('civic') || grade.includes('sociolog')) return 'FA';
    if (grade.includes('it') && (grade.includes('fa') || grade.includes('humanities') || grade.includes('arts'))) return 'FAIT';

    const results = student.results || [];
    const subjects = results.map(r => canonicalSubjectName(r.subject).toLowerCase());
    if (subjects.some(s => s.includes('econom'))) return 'Economics';
    if (subjects.some(s => s.includes('statist'))) return 'Statistics';
    if (subjects.some(s => s.includes('physic'))) return 'Physics';
    if (subjects.some(s => s.includes('civic') || s.includes('sociolog'))) return 'FA';
    if (subjects.some(s => s.includes('computer'))) {
        const trk = getStudentTrack(student);
        if (trk === 'Humanities') return 'FAIT';
        if (trk === 'Arts') return 'Computer Arts';
    }

    // Default sub-track assignment if track is known but sub-track is not set
    const trk = getStudentTrack(student);
    if (trk === 'ICS') return 'Physics';
    if (trk === 'Humanities') return 'FAIT';
    if (trk === 'Arts') return 'Simple Arts';

    return null;
};

/**
 * Normalizes subject track names into standard keys (e.g. 'ICS (Physics)' -> 'ICS').
 */
export const normalizeTrackName = (rawTrack) => {
    if (!rawTrack) return 'all';
    const s = String(rawTrack).trim().toLowerCase();
    if (s.includes('pre-med') || s.includes('pre med') || s.includes('medical')) return 'Pre-Medical';
    if (s.includes('pre-eng') || s.includes('pre eng') || s.includes('engineering')) return 'Pre-Engineering';
    if (s.startsWith('ics') || s.includes('ics')) return 'ICS';
    if (s.includes('fait') || s.includes('fa it') || s.includes('fa-it')) return 'FAIT';
    if (s.includes('fa') || s.includes('humanities')) return 'Humanities';
    if (s.includes('bio')) return 'Biology';
    if (s.includes('comp arts')) return 'Computer Arts';
    if (s.includes('computer') || s.includes('comp') || s.includes('cs')) return 'Computer';
    if (s.includes('arts')) return 'Arts';
    return rawTrack;
};

/**
 * Strict stream isolation: subjects that are NEVER permitted to appear under a given track.
 */
export const FORBIDDEN_TRACK_SUBJECTS = {
    'ICS': [
        'Biology', 'Chemistry', 'General Math', 'General Science', 
        'Civics', 'Fine Arts', 'Home Economics'
    ],
    'Pre-Medical': [
        'Computer Science', 'Mathematics', 'Economics', 'Statistics', 
        'General Math', 'General Science', 'Civics', 'Sociology', 'Fine Arts', 'Home Economics'
    ],
    'Pre-Engineering': [
        'Biology', 'Computer Science', 'Economics', 'Statistics', 
        'General Math', 'General Science', 'Civics', 'Sociology', 'Fine Arts', 'Home Economics'
    ],
    'Humanities': [
        'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Statistics', 'Civics'
    ],
    'FA': [
        'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Statistics', 'Civics'
    ],
    'FAIT': [
        'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Statistics', 'Civics'
    ],
    'Biology': [
        'Computer Science', 'General Math', 'General Science', 'Civics', 'Economics', 'Fine Arts', 'Home Economics'
    ],
    'Computer': [
        'Biology', 'General Math', 'General Science', 'Civics', 'Economics', 'Fine Arts', 'Home Economics'
    ],
    'Computer Arts': [
        'Physics', 'Chemistry', 'Biology', 'Mathematics'
    ],
    'Arts': [
        'Physics', 'Chemistry', 'Biology', 'Mathematics'
    ]
};

/**
 * Purges cross-stream forbidden subjects from any subject list for a specific track.
 */
export const filterForbiddenSubjects = (subjectList, trackName) => {
    if (!Array.isArray(subjectList) || !trackName) return subjectList || [];
    const normTrack = normalizeTrackName(trackName);
    const forbidden = FORBIDDEN_TRACK_SUBJECTS[normTrack] || FORBIDDEN_TRACK_SUBJECTS[trackName] || [];
    if (forbidden.length === 0) return subjectList;
    const forbiddenSet = new Set(forbidden.map(s => canonicalSubjectName(s).toLowerCase()));
    return subjectList.filter(s => !forbiddenSet.has(canonicalSubjectName(s).toLowerCase()));
};

/**
 * Returns the complete list of subjects for a given track, ensuring empty subjects never disappear.
 */
export const getTrackSubjects = (baseClass, trackName, subTrack, allClassSubjects = [], groupStudents = [], gbEdits = {}, getCellValue = null) => {
    const dedupedAll = dedupeSubjectsList(allClassSubjects);
    if (!baseClass) return dedupedAll;

    const base = getBaseClass(baseClass);
    let trk = trackName ? String(trackName).trim() : 'all';
    let subTrk = subTrack ? String(subTrack).trim() : 'all';

    // Normalize track & sub-track
    if (trk !== 'all') {
        const rawLower = trk.toLowerCase();
        if (rawLower.includes('physic')) subTrk = 'Physics';
        else if (rawLower.includes('econ')) subTrk = 'Economics';
        else if (rawLower.includes('stat')) subTrk = 'Statistics';
        else if (rawLower.includes('fait') || rawLower.includes('fa it') || rawLower.includes('fa-it')) subTrk = 'FAIT';
        else if (rawLower.includes('simple') || rawLower.includes('sociol')) subTrk = 'FA';

        trk = normalizeTrackName(trk);
    } else if (Array.isArray(groupStudents) && groupStudents.length > 0) {
        // If trk is 'all' or not specified, but all groupStudents belong to a single track, auto-detect it
        const detectedTracks = new Set(groupStudents.map(s => getStudentTrack(s)).filter(Boolean));
        if (detectedTracks.size === 1) {
            trk = Array.from(detectedTracks)[0];
        }
    }

    let trackCore = [];

    // ── Playgroup, Nursery, K.G (Early Years) ──
    if (base === 'Playgroup' || base === 'PG' || base === 'P.G' || base === 'Nursery' || base === 'K.G') {
        trackCore = ['English', 'Mathematics', 'Urdu', 'W. A.U'];
    }

    // ── 1st, 2nd, 3rd Class (Lower Primary) ──
    if (base === '1st' || base === '2nd' || base === '3rd') {
        trackCore = ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Knowledge', 'Computer Science', 'Nazar Quran'];
    }

    // ── 4th, 5th Class (Upper Primary) ──
    if (base === '4th' || base === '5th') {
        trackCore = ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Science', 'Computer Science', 'Social Studies', 'Nazar Quran'];
    }

    // ── 6th, 7th, 8th Class (Middle School) ──
    if (base === '6th' || base === '7th' || base === '8th') {
        trackCore = ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Science', 'Computer Science', 'Tarjuma-tul-Quran'];
    }

    // ── 9th Class (Islamic Studies + Tarjuma-tul-Quran) ──
    if (base === '9th') {
        const compulsory9th = ['English', 'Urdu', 'Islamic Studies', 'Tarjuma-tul-Quran'];
        if (trk === 'Biology') {
            trackCore = [...compulsory9th, 'Mathematics', 'Physics', 'Chemistry', 'Biology'];
        } else if (trk === 'Computer') {
            trackCore = [...compulsory9th, 'Mathematics', 'Physics', 'Chemistry', 'Computer Science'];
        } else if (trk === 'Computer Arts') {
            trackCore = [...compulsory9th, 'General Math', 'General Science', 'Computer Science', 'Education'];
        } else if (trk === 'Arts') {
            if (subTrk === 'Computer Arts') {
                trackCore = [...compulsory9th, 'General Math', 'General Science', 'Computer Science', 'Education'];
            } else {
                trackCore = [...compulsory9th, 'General Math', 'General Science', 'Islamic Studies (Elective)', 'Education', 'Sociology'];
            }
        }
    }

    // ── 10th Class (Pakistan Studies + Tarjuma-tul-Quran) ──
    if (base === '10th') {
        const compulsory10th = ['English', 'Urdu', 'Pakistan Studies', 'Tarjuma-tul-Quran'];
        if (trk === 'Biology') {
            trackCore = [...compulsory10th, 'Mathematics', 'Physics', 'Chemistry', 'Biology'];
        } else if (trk === 'Computer') {
            trackCore = [...compulsory10th, 'Mathematics', 'Physics', 'Chemistry', 'Computer Science'];
        } else if (trk === 'Computer Arts') {
            trackCore = [...compulsory10th, 'General Math', 'General Science', 'Computer Science', 'Education'];
        } else if (trk === 'Arts') {
            if (subTrk === 'Computer Arts') {
                trackCore = [...compulsory10th, 'General Math', 'General Science', 'Computer Science', 'Education'];
            } else {
                trackCore = [...compulsory10th, 'General Math', 'General Science', 'Islamic Studies (Elective)', 'Education', 'Sociology'];
            }
        }
    }

    // ── 1st Year (Islamic Studies + Tarjuma-tul-Quran) ──
    if (base === '1st Year') {
        const compulsory1st = ['English', 'Urdu', 'Islamic Studies', 'Tarjuma-tul-Quran'];
        if (trk === 'Pre-Medical') {
            trackCore = [...compulsory1st, 'Physics', 'Chemistry', 'Biology'];
        } else if (trk === 'Pre-Engineering') {
            trackCore = [...compulsory1st, 'Physics', 'Chemistry', 'Mathematics'];
        } else if (trk === 'ICS') {
            trackCore = [...compulsory1st, 'Computer Science', 'Mathematics'];
            if (subTrk === 'Economics') trackCore.push('Economics');
            else if (subTrk === 'Statistics') trackCore.push('Statistics');
            else if (subTrk === 'Physics') trackCore.push('Physics');
            else trackCore.push('Physics', 'Economics', 'Statistics');
        } else if (trk === 'Humanities' || trk === 'FA' || trk === 'FAIT' || trk === 'FA IT') {
            if (subTrk === 'FAIT' || subTrk === 'FA IT' || subTrk === 'IT' || trk === 'FAIT' || trk === 'FA IT') {
                trackCore = [...compulsory1st, 'Computer Science', 'Islamic Studies (Elective)', 'Education'];
            } else if (subTrk === 'FA' || subTrk === 'FA Simple' || subTrk === 'Simple' || trk === 'FA') {
                trackCore = [...compulsory1st, 'Islamic Studies (Elective)', 'Education', 'Sociology'];
            } else {
                trackCore = [...compulsory1st, 'Computer Science', 'Islamic Studies (Elective)', 'Education', 'Sociology'];
            }
        }
    }

    // ── 2nd Year (Pakistan Studies + Tarjuma-tul-Quran) ──
    if (base === '2nd Year') {
        const compulsory2nd = ['English', 'Urdu', 'Pakistan Studies', 'Tarjuma-tul-Quran'];
        if (trk === 'Pre-Medical') {
            trackCore = [...compulsory2nd, 'Physics', 'Chemistry', 'Biology'];
        } else if (trk === 'Pre-Engineering') {
            trackCore = [...compulsory2nd, 'Physics', 'Chemistry', 'Mathematics'];
        } else if (trk === 'ICS') {
            trackCore = [...compulsory2nd, 'Computer Science', 'Mathematics'];
            if (subTrk === 'Economics') trackCore.push('Economics');
            else if (subTrk === 'Statistics') trackCore.push('Statistics');
            else if (subTrk === 'Physics') trackCore.push('Physics');
            else trackCore.push('Physics', 'Economics', 'Statistics');
        } else if (trk === 'Humanities' || trk === 'FA' || trk === 'FAIT' || trk === 'FA IT') {
            if (subTrk === 'FAIT' || subTrk === 'FA IT' || subTrk === 'IT' || trk === 'FAIT' || trk === 'FA IT') {
                trackCore = [...compulsory2nd, 'Computer Science', 'Islamic Studies (Elective)', 'Education'];
            } else if (subTrk === 'FA' || subTrk === 'FA Simple' || subTrk === 'Simple' || trk === 'FA') {
                trackCore = [...compulsory2nd, 'Islamic Studies (Elective)', 'Education', 'Sociology'];
            } else {
                trackCore = [...compulsory2nd, 'Computer Science', 'Islamic Studies (Elective)', 'Education', 'Sociology'];
            }
        }
    }

    const allowedSubjectSet = new Set(dedupedAll.map(s => canonicalSubjectName(s).toLowerCase()));
    const isSubjectAllowed = (subName) => {
        if (!allClassSubjects || allClassSubjects.length === 0) return true;
        return allowedSubjectSet.has(canonicalSubjectName(subName).toLowerCase());
    };

    const resultSet = new Set();

    if (trackCore.length > 0) {
        trackCore.forEach(tc => {
            const canonTc = canonicalSubjectName(tc);
            if (isSubjectAllowed(canonTc)) {
                resultSet.add(canonTc);
            }
        });
    }

    if (trk === 'all') {
        dedupedAll.forEach(sub => {
            const canonSub = canonicalSubjectName(sub);
            if (isSubjectAllowed(canonSub)) {
                resultSet.add(canonSub);
            }
        });
    } else {
        dedupedAll.forEach(sub => {
            const canonSub = canonicalSubjectName(sub);
            if (isSubjectAllowed(canonSub) && trackCore.some(tc => canonicalSubjectName(tc).toLowerCase() === canonSub.toLowerCase())) {
                resultSet.add(canonSub);
            }
        });
    }

    if (Array.isArray(groupStudents) && groupStudents.length > 0) {
        groupStudents.forEach(s => {
            dedupedAll.forEach(sub => {
                const canonSub = canonicalSubjectName(sub);
                if (!isSubjectAllowed(canonSub)) return;

                // STRICT STREAM SEPARATION: If a specific track with a defined trackCore is being evaluated,
                // never allow subjects outside trackCore to be added (prevents ICS subjects showing under Medical, etc.)
                if (trackCore.length > 0 && !trackCore.some(tc => canonicalSubjectName(tc).toLowerCase() === canonSub.toLowerCase())) {
                    return;
                }

                const hasEdit = gbEdits?.[s.id]?.[sub] !== undefined || gbEdits?.[s.id]?.[canonSub] !== undefined;
                let hasMark = false;
                if (typeof getCellValue === 'function') {
                    const v = getCellValue(s, sub) || getCellValue(s, canonSub);
                    hasMark = v !== undefined && v !== null && v !== '';
                } else {
                    const r = (s.results || []).find(res => canonicalSubjectName(res.subject).toLowerCase() === canonSub.toLowerCase());
                    hasMark = r && r.obtained !== undefined && r.obtained !== null && r.obtained !== '';
                }
                if (hasEdit || hasMark) {
                    resultSet.add(canonSub);
                }
            });
        });
    }

    return filterForbiddenSubjects(Array.from(resultSet), trk);
};

/**
 * Unified student filter for Manage Exams, Class Lists, Reports, etc.
 */
export const filterStudentsByHierarchy = (students, {
    baseClass = '',
    track = '',
    subTrack = '',
    group = '',
    gender = 'all',
    status = 'active',
    search = ''
} = {}) => {
    if (!Array.isArray(students)) return [];

    return students.filter(s => {
        // Status filter
        if (status !== 'all') {
            const stuStatus = s.status || 'active';
            if (stuStatus !== status) return false;
        }

        // Base Class filter
        if (baseClass && baseClass !== 'all') {
            const stuBase = getBaseClass(s.grade);
            const targetBase = getBaseClass(baseClass);
            if (stuBase !== targetBase && s.grade !== baseClass) return false;
        }

        // Subject Track filter
        if (track && track !== 'all') {
            const stuTrack = getStudentTrack(s);
            const normFilterTrack = (track === 'FA' || track === 'FA IT' || track === 'Humanities') ? 'Humanities' : track;
            const normStuTrack = (stuTrack === 'FA' || stuTrack === 'FA IT' || stuTrack === 'Humanities') ? 'Humanities' : stuTrack;
            
            if (normStuTrack && normStuTrack.toLowerCase() !== normFilterTrack.toLowerCase()) return false;
            if (!normStuTrack) {
                const gradeStr = String(s.grade || '').toLowerCase();
                if (!gradeStr.includes(normFilterTrack.toLowerCase())) return false;
            }
        }

        // Sub-Track filter (e.g. ICS Physics, Stats, Econ, FAIT, FA, Simple Arts, Computer Arts)
        if (subTrack && subTrack !== 'all') {
            const stuSubTrack = getStudentSubTrack(s);
            const normalizeSubTrackName = (st) => {
                if (!st) return '';
                const lower = String(st).trim().toLowerCase();
                if (lower === 'it' || lower === 'fa it' || lower === 'fait' || lower === 'fa-it') return 'fait';
                if (lower === 'fa' || lower === 'simple' || lower === 'fa simple' || lower === 'simple fa' || lower === 'fa-simple') return 'fa';
                if (lower === 'physics' || lower === 'phys') return 'physics';
                if (lower === 'economics' || lower === 'econ') return 'economics';
                if (lower === 'statistics' || lower === 'stats' || lower === 'stat') return 'statistics';
                if (lower === 'computer arts' || lower === 'comp arts') return 'computer arts';
                if (lower === 'simple arts') return 'simple arts';
                return lower;
            };
            const normFilter = normalizeSubTrackName(subTrack);
            const normStu = normalizeSubTrackName(stuSubTrack);

            if (normStu) {
                if (normStu !== normFilter) return false;
            } else {
                const gradeStr = String(s.grade || '').toLowerCase();
                if (!gradeStr.includes(normFilter)) return false;
            }
        }

        // Custom Group filter (e.g. Quaid, Iqbal)
        if (group && group !== 'all') {
            const stuGroup = s.group || s.admissions?.[0]?.group || '';
            if (stuGroup !== group) return false;
        }

        // Gender filter
        if (gender && gender !== 'all') {
            const stuGender = (s.gender || s.admissions?.[0]?.gender || '').toLowerCase();
            if (gender === 'boys' || gender === 'male') {
                if (stuGender !== 'male') return false;
            } else if (gender === 'girls' || gender === 'female') {
                if (stuGender !== 'female') return false;
            }
        }

        // Search filter
        if (search) {
            const q = search.toLowerCase();
            const nameMatch = s.name?.toLowerCase().includes(q);
            const idMatch = s.id?.toLowerCase().includes(q);
            const fatherMatch = (s.fatherName || s.admissions?.[0]?.fatherName || '').toLowerCase().includes(q);
            if (!nameMatch && !idMatch && !fatherMatch) return false;
        }

        return true;
    });
};

/**
 * Cleans sections and class arrays to remove duplicate track-appended class strings.
 */
export const cleanDuplicateClasses = (sections = [], rawClasses = []) => {
    const cleanedSections = sections.map(sec => {
        const baseList = Array.from(new Set(
            (sec.classes || []).map(c => getBaseClass(c)).filter(Boolean)
        ));
        return {
            ...sec,
            classes: baseList
        };
    });

    const cleanedClasses = Array.from(new Set(
        rawClasses.map(c => getBaseClass(c)).filter(Boolean)
    ));

    return { cleanedSections, cleanedClasses };
};

/**
 * Returns the formatted class string with track/sub-track in brackets
 * (e.g. "1st Year (Pre-Medical)", "1st Year (ICS Physics)", "1st Year (FAIT)", "9th (Biology)", "9th (Computer) - Quaid").
 */
export const getStudentFullClassLabel = (student) => {
    if (!student) return '';
    const base = getBaseClass(student.grade) || student.grade || '';
    const trk = getStudentTrack(student);
    const subTrk = getStudentSubTrack(student);
    const group = student.group || student.admissions?.[0]?.group || '';

    let streamLabel = '';

    // Intermediate (1st Year / 2nd Year)
    if (base === '1st Year' || base === '2nd Year') {
        if (trk === 'Pre-Medical') {
            streamLabel = 'Pre-Medical';
        } else if (trk === 'Pre-Engineering') {
            streamLabel = 'Pre-Engineering';
        } else if (trk === 'ICS') {
            if (subTrk === 'Economics') streamLabel = 'ICS Economics';
            else if (subTrk === 'Statistics') streamLabel = 'ICS Stat';
            else streamLabel = 'ICS Physics';
        } else if (trk === 'Humanities' || trk === 'FA' || trk === 'FAIT') {
            if (subTrk === 'FA' || subTrk === 'FA Simple' || subTrk === 'Simple') streamLabel = 'FA Simple';
            else streamLabel = 'FAIT';
        }
    } 
    // Matric (9th / 10th)
    else if (base === '9th' || base === '10th') {
        if (trk === 'Biology') {
            streamLabel = 'Biology';
        } else if (trk === 'Computer') {
            streamLabel = 'Computer';
        } else if (trk === 'Computer Arts') {
            streamLabel = 'Computer Arts';
        } else if (trk === 'Arts') {
            if (subTrk === 'Computer Arts') streamLabel = 'Computer Arts';
            else streamLabel = 'Simple Arts';
        }
    }

    let result = base;
    if (streamLabel) {
        result += ` (${streamLabel})`;
    }
    if (group && group.trim().length > 0) {
        result += ` - ${group.trim()}`;
    }

    return result;
};

/**
 * Returns structured academic, gender, and contact details for Student ID & Password Cards.
 * Includes Class level, Stream/Group (Pre-Medical, Pre-Engineering, ICS with Physics/Economics/Statistics,
 * Humanities with FA/FA-IT, Matric Biology/Computer/Arts), Gender label, and Website URL.
 */
export const getStudentCardAcademicDetails = (student) => {
    if (!student) {
        return {
            classLevel: '—',
            streamGroup: 'General',
            subStreamSpec: '',
            customGroup: '',
            fullGroupDisplay: 'General',
            fullClassAndGroup: '—',
            genderLabel: 'Not Specified',
            isMale: true,
            isFemale: false,
            fatherName: '—',
            serialNumber: '—',
            bForm: 'Not Provided',
            contact: '—',
            websiteUrl: 'acscollege.com'
        };
    }

    const baseClass = getBaseClass(student.grade) || student.grade || '—';
    const trk = getStudentTrack(student);
    const subTrk = getStudentSubTrack(student);
    const customGroup = (student.group || student.admissions?.[0]?.group || '').trim();

    let streamGroup = '';
    let subStreamSpec = '';
    let fullGroupDisplay = '';

    if (baseClass === '1st Year' || baseClass === '2nd Year') {
        if (trk === 'Pre-Medical') {
            streamGroup = 'Pre-Medical';
            fullGroupDisplay = 'Pre-Medical';
        } else if (trk === 'Pre-Engineering') {
            streamGroup = 'Pre-Engineering';
            fullGroupDisplay = 'Pre-Engineering';
        } else if (trk === 'ICS') {
            streamGroup = 'ICS';
            if (subTrk === 'Economics') {
                subStreamSpec = 'Economics';
                fullGroupDisplay = 'ICS (Economics)';
            } else if (subTrk === 'Statistics') {
                subStreamSpec = 'Statistics';
                fullGroupDisplay = 'ICS (Statistics)';
            } else {
                subStreamSpec = 'Physics';
                fullGroupDisplay = 'ICS (Physics)';
            }
        } else if (trk === 'Humanities' || trk === 'FA' || trk === 'FAIT' || trk === 'FA IT') {
            streamGroup = 'Humanities';
            if (subTrk === 'FA' || subTrk === 'FA Simple' || subTrk === 'Simple' || trk === 'FA') {
                subStreamSpec = 'FA';
                fullGroupDisplay = 'Humanities (FA)';
            } else {
                subStreamSpec = 'FA-IT';
                fullGroupDisplay = 'Humanities (FA-IT)';
            }
        } else if (trk) {
            streamGroup = trk;
            subStreamSpec = subTrk || '';
            fullGroupDisplay = subTrk ? `${trk} (${subTrk})` : trk;
        } else {
            streamGroup = 'General';
            fullGroupDisplay = 'General';
        }
    } else if (baseClass === '9th' || baseClass === '10th') {
        if (trk === 'Biology') {
            streamGroup = 'Biology';
            fullGroupDisplay = 'Science (Biology)';
        } else if (trk === 'Computer') {
            streamGroup = 'Computer Science';
            fullGroupDisplay = 'Science (Computer)';
        } else if (trk === 'Computer Arts') {
            streamGroup = 'Arts';
            subStreamSpec = 'Computer Arts';
            fullGroupDisplay = 'Arts (Computer Arts)';
        } else if (trk === 'Arts') {
            streamGroup = 'Arts';
            if (subTrk === 'Computer Arts') {
                subStreamSpec = 'Computer Arts';
                fullGroupDisplay = 'Arts (Computer Arts)';
            } else {
                subStreamSpec = 'Simple Arts';
                fullGroupDisplay = 'Arts (Simple Arts)';
            }
        } else if (trk) {
            streamGroup = trk;
            subStreamSpec = subTrk || '';
            fullGroupDisplay = subTrk ? `${trk} (${subTrk})` : trk;
        } else {
            streamGroup = 'General';
            fullGroupDisplay = 'General';
        }
    } else {
        streamGroup = trk || 'General';
        subStreamSpec = subTrk || '';
        fullGroupDisplay = trk ? (subTrk ? `${trk} (${subTrk})` : trk) : 'General';
    }

    if (customGroup) {
        fullGroupDisplay = fullGroupDisplay && fullGroupDisplay !== 'General'
            ? `${fullGroupDisplay} • ${customGroup}`
            : customGroup;
    }

    const fullClassAndGroup = fullGroupDisplay && fullGroupDisplay !== 'General'
        ? `${baseClass} — ${fullGroupDisplay}`
        : baseClass;

    const rawGender = String(student.gender || student.admissions?.[0]?.gender || '').trim();
    const gLower = rawGender.toLowerCase();
    let genderLabel = 'Not Specified';
    let isMale = false;
    let isFemale = false;
    if (gLower === 'male' || gLower === 'boy' || gLower === 'boys' || gLower === 'm') {
        genderLabel = 'Male';
        isMale = true;
    } else if (gLower === 'female' || gLower === 'girl' || gLower === 'girls' || gLower === 'f') {
        genderLabel = 'Female';
        isFemale = true;
    } else if (rawGender) {
        genderLabel = rawGender;
    }

    const fatherName = student.fatherName || student.admissions?.[0]?.fatherName || '—';
    const serialNumber = student.serialNumber || student.serial_number || '—';
    const bForm = student.bForm || student.admissions?.[0]?.bForm || 'Not Provided';
    const contact = student.contact || student.admissions?.[0]?.contact || student.admissions?.[0]?.whatsapp || '—';

    return {
        classLevel: baseClass,
        streamGroup,
        subStreamSpec,
        customGroup,
        fullGroupDisplay,
        fullClassAndGroup,
        genderLabel,
        isMale,
        isFemale,
        fatherName,
        serialNumber,
        bForm,
        contact,
        websiteUrl: 'acscollege.com'
    };
};

