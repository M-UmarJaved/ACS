// =========================================================================================
// ACS HIGHER SECONDARY SCHOOL & COLLEGE — REALISTIC PAKISTANI ERP & DW DATASET GENERATOR
// Generates 4 Departmental Source Domains (Admissions, Academics, Finance, HR/Operations)
// with NADRA-compliant CNICs (33100-XXXXXXX-X), BISE Faisalabad tracks, multi-term results,
// 6-month fee ledgers & installment transactions, and 60-day attendance logs.
// =========================================================================================

import { calcGrade, canonicalSubjectName } from '../admin/utils/gradeUtils.js';

// Deterministic Pseudo-Random Number Generator (Mulberry32) so dataset is consistent across reloads
function createPRNG(seed = 20261017) {
    let a = seed;
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const MALE_FIRST_NAMES = [
    'MUHAMMAD AHMED', 'ALI HASSAN', 'HAMZA TARIQ', 'USMAN GHANI', 'BILAL MUSTAFA',
    'ABDULLAH HAROON', 'ZAIN UL ABIDEEN', 'HUZAIFA REHMAN', 'SAAD BIN ZAFAR', 'TALHA MAHMOOD',
    'FAHAD IQBAL', 'UMAR FAROOQ', 'DANISH NADEEM', 'RAYAN SHAHID', 'ARSLAN ASLAM',
    'HASNAIN RAZA', 'IBRAHIM KHALID', 'SALMAN AKRAM', 'AWAIS ANWAR', 'SHAHZAIB LATIF',
    'MUHAMMAD TAYYAB', 'SUBHAN SAEED', 'NOMAN ASHRAF', 'WAQAS BASHIR', 'ZOHAIB AFZAL',
    'MOIZ MUNIR', 'HAIDER ALI', 'KASHIF JAVED', 'TAha YASEEN', 'REHAN YOUSAF',
    'MUHAMMAD AHSAN', 'HARIS SULTAN', 'ADEEL SARWAR', 'BURHAN UD DIN', 'SUFYAN NAWAZ',
    'FURQAN HAMEED', 'MAAZ SHAFIQ', 'YASIR MEHMOOD', 'ATIF RAFIQ', 'KAMRAN SALEEM'
];

const FEMALE_FIRST_NAMES = [
    'AYESHA SIDDIQA', 'FATIMA ZAHRA', 'ZAINAB BIBI', 'MARYAM NAWAZ', 'NOOR UL AIN',
    'HAFSA TARIQ', 'LAIBA NOOR', 'AMNA SHEHZADI', 'KHADIJA TUL KUBRA', 'MAHNOOR FATIMA',
    'EMAN FATIMA', 'IQRA BATOOL', 'SANAULLAH NOOR', 'AROOJ FATIMA', 'NIMRA SHAHZAD',
    'MOMINA KHALID', 'KINZA REHMAN', 'HIRA MUSTAFA', 'SEHAR BANO', 'URWA TUL WUSQA',
    'ANUMTA ZAFAR', 'MINAHIL ASIF', 'DUA E ZAHRA', 'RIDA FATIMA', 'BISMA SAEED',
    'SUMIYA AKRAM', 'JAVERIA NADEEM', 'SIDRA MUNIR', 'komal shahid', 'MEHWISH IQBAL',
    'AQSA YASIN', 'FARWA HASSAN', 'AREESHA ANWAR', 'MARIAM LATIF', 'NAYAB SARWAR',
    'HADIA AFZAL', 'RIMSHA ASHRAF', 'SHANZA BASHIR', 'WARDA SALEEM', 'ZOYA RAFIQ'
].map(s => s.toUpperCase());

const FATHER_FIRST_NAMES = [
    'MUHAMMAD TARIQ', 'GHULAM MUSTAFA', 'ABDUL REHMAN', 'ZAFAR IQBAL', 'MAHMOOD AHMAD',
    'SHAHID NADEEM', 'MUHAMMAD ASLAM', 'KHALID MEHMOOD', 'MUHAMMAD AKRAM', 'ANWAR UL HAQ',
    'ABDUL LATIF', 'MUHAMMAD SAEED', 'MUHAMMAD ASHRAF', 'BASHIR AHMAD', 'MUHAMMAD AFZAL',
    'MUNIR AHMAD', 'JAVED IQBAL', 'MUHAMMAD YOUSAF', 'SULTAN MEHMOOD', 'SARWAR KHAN',
    'NAWAZISH ALI', 'ABDUL HAMEED', 'MUHAMMAD SHAFIQ', 'RAFIQ AHMAD', 'MUHAMMAD SALEEM',
    'LIAQAT ALI', 'NASIR MEHMOOD', 'SHAUKAT ALI', 'RIAZ AHMAD', 'PARVEZ AKHTAR'
];

const FAMILY_SURNAMES = [
    'CHEEMA', 'CHAUDHRY', 'WARRAICH', 'BAJWA', 'GILL',
    'RANDHAWA', 'SANDHU', 'MALIK', 'AWAN', 'RAJPOOT',
    'GUJJAR', 'RANA', 'VIRK', 'QURESHI', 'HASHMI',
    'SYED', 'ARAIN', 'TOOR', 'CHATTHA', 'SAHI',
    'KHARAL', 'MUGHAL', 'BUTT', 'NIAZI', 'DOGAr'
].map(s => s.toUpperCase());

const FAISALABAD_LOCALITIES = [
    'Jhang Road, Painsra',
    'Gojra Road, Painsra City',
    'Chak 275 JB, Painsra',
    'Chak 276 JB, Painsra',
    'Chak 66 JB Dhandra, Faisalabad',
    'Chak 67 JB Sadhar, Faisalabad',
    'Thikriwala Bypass, Jhang Road',
    'Dijkot Road, Painsra',
    'Chak 273 JB, Painsra',
    'Niamuana, Jhang Road',
    'Air Avenue, Jhang Road Faisalabad',
    'Gulfishan Colony, Jhang Road',
    'Chak 70 JB, Faisalabad',
    'Motorway Interchange M-4, Painsra'
];

const MOBILE_PREFIXES = ['0300', '0301', '0302', '0306', '0312', '0321', '0322', '0333', '0334', '0345'];

const HOUSE_GROUPS = ['Quaid House', 'Iqbal House', 'Jinnah House', 'Sir Syed House'];

export const DEFAULT_SECTIONS_CONFIG = [
    {
        id: 'sec-primary',
        name: 'Primary',
        classes: ['Playgroup', 'Nursery', 'K.G', '1st', '2nd', '3rd', '4th', '5th']
    },
    {
        id: 'sec-middle',
        name: 'Middle',
        classes: ['6th', '7th', '8th']
    },
    {
        id: 'sec-matric',
        name: 'Matric',
        classes: ['9th', '10th']
    },
    {
        id: 'sec-inter',
        name: 'Intermediate',
        classes: ['1st Year', '2nd Year']
    }
];

export const DEFAULT_CLASS_FEE_MAP = {
    'Playgroup': { tuitionFee: 1800, labFee: 100, examFee: 200, admissionFee: 3000, annualFee: 1500, transportFee: 0 },
    'Nursery':   { tuitionFee: 1900, labFee: 100, examFee: 200, admissionFee: 3000, annualFee: 1500, transportFee: 0 },
    'K.G':       { tuitionFee: 2000, labFee: 150, examFee: 250, admissionFee: 3500, annualFee: 1500, transportFee: 0 },
    '1st':       { tuitionFee: 2200, labFee: 150, examFee: 250, admissionFee: 4000, annualFee: 2000, transportFee: 0 },
    '2nd':       { tuitionFee: 2300, labFee: 150, examFee: 250, admissionFee: 4000, annualFee: 2000, transportFee: 0 },
    '3rd':       { tuitionFee: 2400, labFee: 200, examFee: 300, admissionFee: 4500, annualFee: 2000, transportFee: 0 },
    '4th':       { tuitionFee: 2500, labFee: 200, examFee: 300, admissionFee: 4500, annualFee: 2500, transportFee: 0 },
    '5th':       { tuitionFee: 2700, labFee: 250, examFee: 350, admissionFee: 5000, annualFee: 2500, transportFee: 0 },
    '6th':       { tuitionFee: 3000, labFee: 300, examFee: 400, admissionFee: 5500, annualFee: 3000, transportFee: 0 },
    '7th':       { tuitionFee: 3200, labFee: 300, examFee: 400, admissionFee: 5500, annualFee: 3000, transportFee: 0 },
    '8th':       { tuitionFee: 3500, labFee: 350, examFee: 500, admissionFee: 6000, annualFee: 3500, transportFee: 0 },
    '9th':       { tuitionFee: 4200, labFee: 500, examFee: 600, admissionFee: 7500, annualFee: 4000, transportFee: 0 },
    '10th':      { tuitionFee: 4500, labFee: 500, examFee: 700, admissionFee: 7500, annualFee: 4000, transportFee: 0 },
    '1st Year':  { tuitionFee: 5500, labFee: 700, examFee: 800, admissionFee: 10000, annualFee: 5000, transportFee: 0 },
    '2nd Year':  { tuitionFee: 5800, labFee: 700, examFee: 900, admissionFee: 10000, annualFee: 5000, transportFee: 0 }
};

export const DEFAULT_SUBJECTS_BY_CLASS = {
    'Playgroup': ['English', 'Mathematics', 'Urdu', 'W. A.U'],
    'Nursery':   ['English', 'Mathematics', 'Urdu', 'W. A.U'],
    'K.G':       ['English', 'Mathematics', 'Urdu', 'W. A.U'],
    '1st':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Knowledge', 'Computer Science', 'Nazar Quran'],
    '2nd':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Knowledge', 'Computer Science', 'Nazar Quran'],
    '3rd':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Knowledge', 'Computer Science', 'Nazar Quran'],
    '4th':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Science', 'Computer Science', 'Social Studies', 'Nazar Quran'],
    '5th':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Science', 'Computer Science', 'Social Studies', 'Nazar Quran'],
    '6th':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Science', 'Computer Science', 'Tarjuma-tul-Quran'],
    '7th':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Science', 'Computer Science', 'Tarjuma-tul-Quran'],
    '8th':       ['English', 'Mathematics', 'Urdu', 'Islamic Studies', 'General Science', 'Computer Science', 'Tarjuma-tul-Quran'],
    '9th': [
        'English', 'Urdu', 'Islamic Studies', 'Tarjuma-tul-Quran',
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
        'General Math', 'General Science', 'Education', 'Civics'
    ],
    '10th': [
        'English', 'Urdu', 'Pakistan Studies', 'Tarjuma-tul-Quran',
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
        'General Math', 'General Science', 'Education', 'Civics'
    ],
    '1st Year': [
        'English', 'Urdu', 'Islamic Studies', 'Tarjuma-tul-Quran',
        'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science',
        'Statistics', 'Economics', 'Education', 'Sociology'
    ],
    '2nd Year': [
        'English', 'Urdu', 'Pakistan Studies', 'Tarjuma-tul-Quran',
        'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science',
        'Statistics', 'Economics', 'Education', 'Sociology'
    ]
};

// Returns exact subjects for a student based on class, track, and subTrack
function getSubjectsForStudent(baseClass, track, subTrack) {
    if (baseClass === '9th' || baseClass === '10th') {
        const comp = baseClass === '9th'
            ? ['English', 'Urdu', 'Islamic Studies', 'Tarjuma-tul-Quran']
            : ['English', 'Urdu', 'Pakistan Studies', 'Tarjuma-tul-Quran'];
        if (track === 'Biology') return [...comp, 'Mathematics', 'Physics', 'Chemistry', 'Biology'];
        if (track === 'Computer') return [...comp, 'Mathematics', 'Physics', 'Chemistry', 'Computer Science'];
        if (track === 'Arts' && subTrack === 'Computer Arts') return [...comp, 'General Math', 'General Science', 'Computer Science', 'Education'];
        return [...comp, 'General Math', 'General Science', 'Education', 'Civics'];
    }
    if (baseClass === '1st Year' || baseClass === '2nd Year') {
        const comp = baseClass === '1st Year'
            ? ['English', 'Urdu', 'Islamic Studies', 'Tarjuma-tul-Quran']
            : ['English', 'Urdu', 'Pakistan Studies', 'Tarjuma-tul-Quran'];
        if (track === 'Pre-Medical') return [...comp, 'Physics', 'Chemistry', 'Biology'];
        if (track === 'Pre-Engineering') return [...comp, 'Physics', 'Chemistry', 'Mathematics'];
        if (track === 'ICS') {
            const thirdSub = subTrack === 'Statistics' ? 'Statistics' : subTrack === 'Economics' ? 'Economics' : 'Physics';
            return [...comp, 'Computer Science', 'Mathematics', thirdSub];
        }
        if (track === 'Humanities') {
            if (subTrack === 'FAIT') return [...comp, 'Computer Science', 'Education', 'Sociology'];
            return [...comp, 'Economics', 'Education', 'Sociology'];
        }
    }
    return DEFAULT_SUBJECTS_BY_CLASS[baseClass] || ['English', 'Mathematics', 'Urdu'];
}

// Subject max marks according to BISE Faisalabad standards
function getSubjectMaxMarks(baseClass, subject) {
    const canon = canonicalSubjectName(subject);
    if (canon === 'Tarjuma-tul-Quran' || canon === 'Nazar Quran') return 50;
    if ((baseClass === '9th' || baseClass === '10th') && (canon === 'Islamic Studies' || canon === 'Pakistan Studies')) return 50;
    if ((baseClass === '1st Year' || baseClass === '2nd Year') && (canon === 'Islamic Studies' || canon === 'Pakistan Studies')) return 50;
    if (baseClass === '9th' || baseClass === '10th') {
        if (['Physics', 'Chemistry', 'Biology'].includes(canon)) return 60;
        if (canon === 'Computer Science') return 50;
        if (['English', 'Urdu', 'Mathematics', 'General Math', 'General Science', 'Education', 'Civics'].includes(canon)) return 75;
    }
    if (baseClass === '1st Year' || baseClass === '2nd Year') {
        if (['Physics', 'Chemistry', 'Biology', 'Computer Science', 'Statistics'].includes(canon)) return 85;
        return 100;
    }
    return 100;
}

// Generate 60 school days across Aug, Sep, Oct 2026 (excluding Sundays)
function getSchoolDates2026() {
    const dates = [];
    const months = [
        { year: 2026, month: 8, maxDay: 31 },
        { year: 2026, month: 9, maxDay: 30 },
        { year: 2026, month: 10, maxDay: 17 }
    ];
    for (const m of months) {
        for (let d = 1; d <= m.maxDay; d++) {
            const dt = new Date(m.year, m.month - 1, d);
            if (dt.getDay() !== 0) { // Exclude Sunday
                const ds = `${m.year}-${String(m.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                dates.push(ds);
            }
        }
    }
    return dates.slice(-60); // Last 60 working school days
}

export function generatePakistaniSchoolDataset(seed = 20261017) {
    const rand = createPRNG(seed);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

    const allClasses = DEFAULT_SECTIONS_CONFIG.flatMap(s => s.classes);
    const schoolDates = getSchoolDates2026();
    const billingMonths = [
        'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026', 'October 2026'
    ];

    // Class distribution (total = 360 students)
    const classCounts = {
        'Playgroup': 14,
        'Nursery': 16,
        'K.G': 16,
        '1st': 18,
        '2nd': 18,
        '3rd': 18,
        '4th': 20,
        '5th': 20,
        '6th': 22,
        '7th': 22,
        '8th': 24,
        '9th': 38,
        '10th': 36,
        '1st Year': 42,
        '2nd Year': 36
    };

    const classSerialStarts = {};
    let currentBoysSerial = 1001;
    let currentGirlsSerial = 5001;

    const students = [];
    const feeRecords = [];
    const feeTransactions = [];

    let globalStudentCounter = 1;

    allClasses.forEach((cls) => {
        const count = classCounts[cls] || 20;
        const classBoysStart = currentBoysSerial;
        const classGirlsStart = currentGirlsSerial;
        classSerialStarts[cls] = { boys: String(classBoysStart), girls: String(classGirlsStart) };

        const feeDef = DEFAULT_CLASS_FEE_MAP[cls] || DEFAULT_CLASS_FEE_MAP['9th'];

        for (let i = 0; i < count; i++) {
            const isFirstDemoStudent = globalStudentCounter === 1;
            const gender = isFirstDemoStudent ? 'Male' : (rand() < 0.54 ? 'Male' : 'Female');
            const surname = pick(FAMILY_SURNAMES);
            const firstName = gender === 'Male' ? pick(MALE_FIRST_NAMES) : pick(FEMALE_FIRST_NAMES);
            const fullName = isFirstDemoStudent ? 'MUHAMMAD AHMED CHEEMA' : `${firstName} ${surname}`;
            const fatherName = `${pick(FATHER_FIRST_NAMES)} ${surname}`;

            // Assign Serial
            const serialNum = gender === 'Male' ? String(currentBoysSerial++) : String(currentGirlsSerial++);
            const studentId = isFirstDemoStudent
                ? 'STU001'
                : `ACS-2026-${String(globalStudentCounter).padStart(3, '0')}`;

            // Assign Track & Sub-Track
            let subjectTrack = '';
            let subTrack = '';
            if (cls === '9th' || cls === '10th') {
                const r = rand();
                if (r < 0.48) subjectTrack = 'Biology';
                else if (r < 0.82) subjectTrack = 'Computer';
                else {
                    subjectTrack = 'Arts';
                    subTrack = rand() < 0.5 ? 'Simple Arts' : 'Computer Arts';
                }
            } else if (cls === '1st Year' || cls === '2nd Year') {
                const r = rand();
                if (isFirstDemoStudent || r < 0.36) subjectTrack = 'Pre-Medical';
                else if (r < 0.58) subjectTrack = 'Pre-Engineering';
                else if (r < 0.85) {
                    subjectTrack = 'ICS';
                    const sr = rand();
                    subTrack = sr < 0.55 ? 'Physics' : sr < 0.82 ? 'Statistics' : 'Economics';
                } else {
                    subjectTrack = 'Humanities';
                    subTrack = rand() < 0.55 ? 'FAIT' : 'FA';
                }
            }

            // Generate NADRA-compliant Faisalabad CNIC & B-Form (33100-XXXXXXX-X)
            // Last digit odd = Male (1,3,5,7,9), even = Female (2,4,6,8)
            const mid7Student = String(randInt(1000000, 9999999));
            const lastDigitStudent = gender === 'Male' ? pick([1, 3, 5, 7, 9]) : pick([2, 4, 6, 8]);
            const bForm = `33100-${mid7Student}-${lastDigitStudent}`;

            const mid7Father = String(randInt(1000000, 9999999));
            const lastDigitFather = pick([1, 3, 5, 7, 9]);
            const fatherCnic = `33100-${mid7Father}-${lastDigitFather}`;

            const phonePrefix = pick(MOBILE_PREFIXES);
            const phoneNum = `${phonePrefix}-${randInt(1000000, 9999999)}`;
            const locality = pick(FAISALABAD_LOCALITIES);
            const houseGroup = pick(HOUSE_GROUPS);

            // DOB based on class
            const classAgeOffset = Math.max(4, allClasses.indexOf(cls) + 4);
            const birthYear = 2026 - classAgeOffset;
            const birthMonth = String(randInt(1, 12)).padStart(2, '0');
            const birthDay = String(randInt(1, 28)).padStart(2, '0');
            const dob = `${birthYear}-${birthMonth}-${birthDay}`;

            // Intrinsic Student Academic Ability (0.38 to 0.97)
            // Used to correlate Attendance %, Exam Marks %, and Merit Discounts!
            const baseAbility = isFirstDemoStudent
                ? 0.91
                : Math.min(0.97, Math.max(0.36, 0.45 + rand() * 0.48 + (gender === 'Female' ? 0.03 : 0)));

            // 1. Generate 60-day Attendance Log correlated with ability
            const targetAttRate = Math.min(0.99, Math.max(0.58, baseAbility + (rand() - 0.4) * 0.16));
            let presentCnt = 0;
            let absentCnt = 0;
            let lateCnt = 0;
            const attRecords = schoolDates.map((dStr) => {
                const roll = rand();
                if (roll < targetAttRate) {
                    presentCnt++;
                    return { date: dStr, status: 'present' };
                } else if (roll < targetAttRate + 0.04) {
                    lateCnt++;
                    presentCnt++; // Late counts as attended for overall presence
                    return { date: dStr, status: 'late' };
                } else {
                    absentCnt++;
                    return { date: dStr, status: 'absent' };
                }
            });
            const attPct = Number(((presentCnt / schoolDates.length) * 100).toFixed(1));

            // 2. Generate Multi-Term Academic Results
            const studentSubjects = getSubjectsForStudent(cls, subjectTrack, subTrack);

            // Subject difficulty modifier (Chemistry, Physics, Math slightly harder)
            const getSubModifier = (sub) => {
                const c = canonicalSubjectName(sub);
                if (c === 'Chemistry' || c === 'Physics') return -0.06;
                if (c === 'Mathematics') return -0.05;
                if (c === 'English') return -0.03;
                if (c === 'Tarjuma-tul-Quran' || c === 'Nazar Quran' || c === 'Islamic Studies') return +0.07;
                return 0;
            };

            const buildTermResults = (termName, termShift = 0) => {
                return studentSubjects.map((sub) => {
                    const maxMarks = getSubjectMaxMarks(cls, sub);
                    const subMod = getSubModifier(sub);
                    const noise = (rand() - 0.5) * 0.14;
                    const rawRatio = Math.min(0.98, Math.max(0.28, baseAbility + subMod + termShift + noise));
                    const obtained = Math.round(rawRatio * maxMarks);
                    const pct = Math.round((obtained / maxMarks) * 100);
                    const grade = calcGrade(pct);
                    const remarks = pct >= 85
                        ? 'Outstanding conceptual mastery'
                        : pct >= 70
                        ? 'Good consistent effort'
                        : pct >= 50
                        ? 'Satisfactory; needs more practice'
                        : 'Critical attention & extra coaching required';
                    return {
                        subject: sub,
                        term: termName,
                        obtained,
                        total: maxMarks,
                        percentage: pct,
                        grade,
                        remarks
                    };
                });
            };

            const firstTerm2026 = buildTermResults('First Term 2026', -0.02);
            const midTerm2026 = buildTermResults('Mid Term 2026', +0.02);
            const currentResults = [...firstTerm2026, ...midTerm2026];

            const previousResults = [
                {
                    term: 'First Term 2025',
                    results: buildTermResults('First Term 2025', -0.05)
                },
                {
                    term: 'Send-Up Exam 2025',
                    results: buildTermResults('Send-Up Exam 2025', -0.03)
                }
            ];

            // 3. Generate 6-Month Fee History & Transactions
            const hasMeritScholarship = baseAbility >= 0.88 && rand() < 0.45;
            const discountAmt = hasMeritScholarship ? Math.round(feeDef.tuitionFee * 0.25) : 0;
            // Financial reliability profile
            const paymentReliability = isFirstDemoStudent ? 0.95 : (0.55 + rand() * 0.45);

            const studentFeeHistory = [];

            billingMonths.forEach((mLabel, mIdx) => {
                const isAdmissionMonth = mIdx === 0 && rand() < 0.28;
                const isExamMonth = mLabel === 'June 2026' || mLabel === 'October 2026';
                const tuition = feeDef.tuitionFee;
                const lab = feeDef.labFee;
                const exam = isExamMonth ? feeDef.examFee : 0;
                const admFee = isAdmissionMonth ? feeDef.admissionFee : 0;

                // Older months have higher chance of being paid; latest month (Oct 2026) has more pending/partial
                const recencyFactor = mIdx === 5 ? -0.22 : mIdx === 4 ? -0.10 : +0.12;
                const payScore = paymentReliability + recencyFactor + (rand() - 0.5) * 0.2;

                let status = 'paid';
                let lateFine = 0;
                const netBeforeFine = tuition + lab + exam + admFee - discountAmt;
                let paidAmount = netBeforeFine;
                let paidOn = `2026-${String(mIdx + 5).padStart(2, '0')}-${String(randInt(2, 10)).padStart(2, '0')}`;
                const txs = [];
                const recordId = `feerec-${studentId}-${mIdx + 1}`;

                if (payScore >= 0.58) {
                    status = 'paid';
                    if (rand() < 0.15) {
                        lateFine = 200;
                        paidOn = `2026-${String(mIdx + 5).padStart(2, '0')}-${String(randInt(15, 25)).padStart(2, '0')}`;
                    }
                    const finalNet = netBeforeFine + lateFine;
                    paidAmount = finalNet;

                    // Either 1 full payment or 2 installments
                    if (rand() < 0.2) {
                        const firstHalf = Math.round(finalNet * 0.6);
                        const secondHalf = finalNet - firstHalf;
                        txs.push(
                            { amount: firstHalf, date: `2026-${String(mIdx + 5).padStart(2, '0')}-05`, note: '1st Installment (Cash)' },
                            { amount: secondHalf, date: paidOn, note: 'Final Settlement' }
                        );
                    } else {
                        txs.push({ amount: finalNet, date: paidOn, note: 'Full Challan Paid' });
                    }
                } else if (payScore >= 0.36) {
                    status = 'partial';
                    lateFine = 200;
                    const finalNet = netBeforeFine + lateFine;
                    paidAmount = Math.round((finalNet * randInt(40, 70)) / 1000) * 100;
                    paidOn = `2026-${String(mIdx + 5).padStart(2, '0')}-${String(randInt(11, 22)).padStart(2, '0')}`;
                    txs.push({ amount: paidAmount, date: paidOn, note: 'Partial Installment Received' });
                } else {
                    status = 'unpaid';
                    lateFine = mIdx < 5 ? 300 : 0;
                    paidAmount = 0;
                    paidOn = null;
                }

                const feeObj = {
                    id: recordId,
                    month: mLabel,
                    tuitionFee: tuition,
                    labFee: lab,
                    examFee: exam,
                    admissionFee: admFee,
                    lateFine,
                    discount: discountAmt,
                    paidAmount,
                    status,
                    paidOn,
                    transactions: txs
                };
                studentFeeHistory.push(feeObj);

                feeRecords.push({
                    id: recordId,
                    student_id: studentId,
                    month: mLabel,
                    tuition_fee: tuition,
                    lab_fee: lab,
                    exam_fee: exam,
                    admission_fee: admFee,
                    late_fine: lateFine,
                    discount: discountAmt,
                    paid_amount: paidAmount,
                    status,
                    paid_on: paidOn
                });

                txs.forEach((t) => {
                    feeTransactions.push({
                        fee_record_id: recordId,
                        student_id: studentId,
                        month_label: mLabel,
                        amount: t.amount,
                        payment_date: t.date,
                        note: t.note
                    });
                });
            });

            const status = rand() < 0.96 ? 'active' : (rand() < 0.6 ? 'left' : 'graduated');

            students.push({
                id: studentId,
                serial_number: serialNum,
                serialNumber: serialNum,
                password: isFirstDemoStudent ? 'demo123' : `acs${serialNum}`,
                name: fullName,
                grade: isFirstDemoStudent ? '1st Year' : cls,
                status: isFirstDemoStudent ? 'active' : status,
                image: '',
                photo: '',
                fatherName,
                gender,
                monthlyFee: String(feeDef.tuitionFee - discountAmt),
                feeHistory: studentFeeHistory,
                fee_history: studentFeeHistory,
                results: currentResults,
                previous_results: previousResults,
                previousResults,
                attendance: {
                    total: schoolDates.length,
                    present: presentCnt,
                    absent: absentCnt,
                    late: lateCnt,
                    percentage: attPct,
                    records: attRecords
                },
                admissions: [
                    {
                        studentName: fullName,
                        fatherName,
                        gender,
                        dob,
                        bForm,
                        fatherCnic,
                        phone: phoneNum,
                        whatsapp: phoneNum,
                        address: locality,
                        admissionDate: '2025-04-10',
                        classAdmitted: isFirstDemoStudent ? '1st Year' : cls,
                        subjectTrack,
                        subTrack,
                        group: houseGroup,
                        monthlyFee: String(feeDef.tuitionFee - discountAmt),
                        remarks: hasMeritScholarship ? '25% Merit Scholarship Holder' : 'Regular Enrolment'
                    }
                ]
            });

            globalStudentCounter++;
        }
    });

    // 4. Generate 95 Walk-In Admissions Inquiries (INQ-26-001 .. INQ-26-095)
    const inquiries = [];
    for (let q = 1; q <= 95; q++) {
        const gender = rand() < 0.55 ? 'Male' : 'Female';
        const surname = pick(FAMILY_SURNAMES);
        const firstName = gender === 'Male' ? pick(MALE_FIRST_NAMES) : pick(FEMALE_FIRST_NAMES);
        const targetClass = pick(['Playgroup', '1st', '5th', '8th', '9th', '10th', '1st Year', '2nd Year']);
        const feeDef = DEFAULT_CLASS_FEE_MAP[targetClass] || DEFAULT_CLASS_FEE_MAP['9th'];
        const disc = rand() < 0.35 ? randInt(3, 8) * 100 : 0;
        const admFee = Math.max(2000, feeDef.admissionFee - disc * 2);
        const monthlyFee = Math.max(1500, feeDef.tuitionFee - disc);
        const paperFund = feeDef.examFee;
        const quotedFee = admFee + monthlyFee + paperFund;
        const isConfirmed = rand() < 0.66; // 66% funnel conversion rate
        const monthNum = randInt(3, 10);
        const dayNum = randInt(1, 28);

        inquiries.push({
            id: q,
            inquiry_no: `INQ-26-${String(q).padStart(3, '0')}`,
            name: `${firstName} ${surname}`,
            contact: `${pick(MOBILE_PREFIXES)}-${randInt(1000000, 9999999)}`,
            class_applying: targetClass,
            admission_fee: admFee,
            monthly_fee: monthlyFee,
            paper_fund: paperFund,
            quoted_fee: quotedFee,
            notes: isConfirmed
                ? `Confirmed admission; family from ${pick(FAISALABAD_LOCALITIES)}`
                : `Visited campus; requested ${disc > 0 ? 'concession review' : 'prospectus & transport info'}`,
            status: isConfirmed ? 'confirmed' : 'pending',
            created_at: `2026-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}T09:30:00Z`
        });
    }

    // 5. Generate 24 Realistic Pakistani Faculty Members
    const faculty = [
        { id: 1, name: 'Prof. Mian Muhammad Tariq Cheema', role: 'Principal & Head of Institution', department: 'Administration', qualification: 'M.Phil Education, M.Sc Mathematics', phone: '0300-8661122', joining_date: '2016-03-01', base_salary: 125000, image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop', bio: '22+ years of academic leadership across BISE Faisalabad colleges.' },
        { id: 2, name: 'Dr. Ayesha Siddiqa Bajwa', role: 'Vice Principal (Girls Wing)', department: 'Academic Leadership', qualification: 'Ph.D Chemistry (UAF)', phone: '0301-7223344', joining_date: '2018-04-15', base_salary: 98000, image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop', bio: 'Gold Medalist in Organic Chemistry; oversees Science Labs & Intermediate Girls Wing.' },
        { id: 3, name: 'Prof. Rana Zahid Mehmood', role: 'HOD Physics', department: 'Physics', qualification: 'M.Phil Physics (GCUF)', phone: '0321-6554433', joining_date: '2019-08-10', base_salary: 82000, image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop', bio: 'Specialist in F.Sc Physics board exam preparation with 15+ district merit positions.' },
        { id: 4, name: 'Prof. Hafiz Usman Ghani Warraich', role: 'HOD Biology & Pre-Medical', department: 'Biology', qualification: 'M.Phil Botany (UAF)', phone: '0333-4112299', joining_date: '2019-09-01', base_salary: 80000, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop', bio: 'MDCAT & Intermediate Biology mentor.' },
        { id: 5, name: 'Prof. Nadia Ambreen Gill', role: 'HOD Mathematics', department: 'Mathematics', qualification: 'M.Phil Mathematics', phone: '0345-7889900', joining_date: '2020-01-12', base_salary: 78000, image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop', bio: 'Leads Matric & F.Sc Pre-Engineering Mathematics.' },
        { id: 6, name: 'Prof. Bilal Hassan Randhawa', role: 'HOD Computer Science & IT', department: 'Computer Science', qualification: 'MS Computer Science (FAST)', phone: '0300-6339911', joining_date: '2020-03-20', base_salary: 85000, image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop', bio: 'Heads ICS & Computer Labs, C++ and Database Systems specialist.' },
        { id: 7, name: 'Prof. Syed Ali Raza Hashmi', role: 'Senior Lecturer Chemistry', department: 'Chemistry', qualification: 'M.Phil Analytical Chemistry', phone: '0302-5441188', joining_date: '2020-09-01', base_salary: 74000, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', bio: 'In-charge of Intermediate Chemistry Practical Labs.' },
        { id: 8, name: 'Ms. Saima Kouser Arain', role: 'HOD English Literature', department: 'English', qualification: 'M.Phil Applied Linguistics', phone: '0334-9112233', joining_date: '2021-02-01', base_salary: 68000, image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop', bio: 'Coordinates English grammar, composition, and spoken proficiency.' },
        { id: 9, name: 'Maulana Qari Abdul Majeed', role: 'HOD Islamic & Quranic Studies', department: 'Islamic Studies', qualification: 'Shahadat-ul-Aalamiyyah, MA Islamiyat', phone: '0300-4998877', joining_date: '2017-05-10', base_salary: 62000, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop', bio: 'Leads Tarjuma-tul-Quran, Nazar Quran, and Islamic Studies.' },
        { id: 10, name: 'Prof. Kashif Mahmood Chattha', role: 'Lecturer Economics & Statistics', department: 'Commerce & Stats', qualification: 'M.Sc Statistics, MA Economics', phone: '0321-7776655', joining_date: '2021-08-15', base_salary: 66000, image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop', bio: 'Instructs ICS Statistics & Economics sub-tracks.' },
        { id: 11, name: 'Ms. Riffat Parveen Virk', role: 'In-Charge Primary & Montessori Wing', department: 'Primary Wing', qualification: 'M.Ed, Montessori Diploma', phone: '0301-8884422', joining_date: '2018-09-01', base_salary: 60000, image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop', bio: '12 years experience in early childhood foundational pedagogy.' },
        { id: 12, name: 'Mr. Waqas Ahmad Toor', role: 'Senior Urdu Lecturer', department: 'Urdu', qualification: 'M.Phil Urdu (GCUF)', phone: '0345-6112200', joining_date: '2021-04-01', base_salary: 64000, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop', bio: 'In-charge of Bazm-e-Adab and Inter Urdu.' }
    ];

    // 6. Generate 6-Month Institutional Expenses Ledger
    const expenses = [];
    let expId = 1;
    billingMonths.forEach((mLabel, idx) => {
        const mNum = String(idx + 5).padStart(2, '0');
        expenses.push(
            { id: `exp-${expId++}`, title: `Faculty & Staff Monthly Payroll (${mLabel})`, amount: 645000, date: `2026-${mNum}-02`, category: 'Salaries', status: 'Paid' },
            { id: `exp-${expId++}`, title: `FESCO Commercial Electricity Bill (${mLabel})`, amount: idx <= 3 ? 115000 : 78000, date: `2026-${mNum}-12`, category: 'Utilities', status: 'Paid' },
            { id: `exp-${expId++}`, title: `Standby Generator Diesel & Maintenance`, amount: 34000, date: `2026-${mNum}-15`, category: 'Utilities', status: 'Paid' },
            { id: `exp-${expId++}`, title: `Science & Computer Lab Apparatus / Internet`, amount: 28500, date: `2026-${mNum}-18`, category: 'Maintenance', status: 'Paid' },
            { id: `exp-${expId++}`, title: `Exam Printing, Answer Sheets & Stationery`, amount: idx === 1 || idx === 5 ? 62000 : 19000, date: `2026-${mNum}-22`, category: 'Supplies', status: 'Paid' }
        );
    });

    // 7. Build Class-Scoped Weights & Terms Metadata
    const termsMap = {};
    const weightsMap = {};
    allClasses.forEach((cls) => {
        termsMap[cls] = ['First Term 2026', 'Mid Term 2026', 'First Term 2025', 'Send-Up Exam 2025'];
        weightsMap[cls] = {};
        termsMap[cls].forEach((tName) => {
            weightsMap[cls][tName] = {};
            (DEFAULT_SUBJECTS_BY_CLASS[cls] || []).forEach((sub) => {
                weightsMap[cls][tName][sub] = getSubjectMaxMarks(cls, sub);
            });
        });
    });

    const classGroups = {};
    allClasses.forEach((cls) => {
        classGroups[cls] = HOUSE_GROUPS;
    });

    const classTracks = {
        '9th': ['Biology', 'Computer', 'Arts'],
        '10th': ['Biology', 'Computer', 'Arts'],
        '1st Year': ['Pre-Medical', 'Pre-Engineering', 'ICS', 'Humanities'],
        '2nd Year': ['Pre-Medical', 'Pre-Engineering', 'ICS', 'Humanities']
    };

    const classSubTracks = {
        '9th Arts': ['Simple Arts', 'Computer Arts'],
        '10th Arts': ['Simple Arts', 'Computer Arts'],
        '1st Year ICS': ['Physics', 'Economics', 'Statistics'],
        '2nd Year ICS': ['Physics', 'Economics', 'Statistics'],
        '1st Year Humanities': ['FAIT', 'FA'],
        '2nd Year Humanities': ['FAIT', 'FA']
    };

    const facilities = [
        { id: 1, name: 'Al-Khwarizmi Computing & AI Lab', category: 'Technology', description: '60+ networked workstations with high-speed fiber internet for ICS and Matric Computer Science students.', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop' },
        { id: 2, name: 'Ibn Al-Haytham Physics & Chemistry Labs', category: 'Science', description: 'Fully equipped BISE practical laboratories for Matric and F.Sc Pre-Medical / Pre-Engineering cohorts.', image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop' },
        { id: 3, name: 'Allama Iqbal Central Library', category: 'Academic', description: '15,000+ textbooks, BISE past paper archives, MDCAT/ECAT reference banks, and quiet study halls.', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=600&fit=crop' },
        { id: 4, name: 'Quaid-e-Azam Auditorium & Seminar Hall', category: 'Events', description: 'Air-conditioned 400-seat hall for debates, prize distribution ceremonies, and parent-teacher conferences.', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop' },
        { id: 5, name: 'ACS Sports Complex & Cricket Ground', category: 'Athletics', description: 'Dedicated cricket turf, badminton courts, and physical training ground.', image: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=600&fit=crop' },
        { id: 6, name: 'Safe Fleet Student Transport Network', category: 'Transport', description: 'GPS-monitored school buses covering Painsra, Gojra Road, Jhang Road, Dijkot, and surrounding Chaks.', image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop' }
    ];

    const announcements = [
        { id: 1, title: 'Mid Term Examination 2026 Result Declaration & PTM', date: '2026-10-15', type: 'Academic', active: true, content: 'Mid Term 2026 results have been uploaded to the Student Portal and Data Warehouse. Parent-Teacher Meeting will be held this Saturday from 9:00 AM to 1:00 PM.' },
        { id: 2, title: 'BISE Faisalabad 9th & 1st Year Registration Schedule', date: '2026-10-10', type: 'Board Exam', active: true, content: 'All 9th and 1st Year students must verify their B-Form and Father CNIC digits in the Admissions Office before October 28, 2026.' },
        { id: 3, title: 'October 2026 Fee Challan Due Date Reminder', date: '2026-10-03', type: 'Finance', active: true, content: 'October 2026 fee challans are now active. Please clear dues before the 15th of the month to avoid late fines.' },
        { id: 4, title: 'Annual Inter-House Qirat, Naat & Science Exhibition', date: '2026-09-25', type: 'Events', active: true, content: 'Students from Quaid, Iqbal, Jinnah, and Sir Syed Houses are invited to submit project entries to their respective HODs.' }
    ];

    const blogs = [
        { id: 1, title: 'ACS Secures 14 Top Merit Positions in BISE Faisalabad Annual Exams 2026', category: 'Achievements', author: 'Principal Office', date: '2026-09-18', read_time: '4 min read', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=500&fit=crop', excerpt: 'Our Pre-Medical and Matric Science cohorts achieved a 99.2% pass rate with 48 students scoring A+ grades.', content: 'ACS Higher Secondary School & College Painsra continues its tradition of academic excellence in the Faisalabad Division. Through structured testing, data-driven intervention from our academic gradebook, and dedicated faculty mentorship, our students achieved record-breaking board scores.' },
        { id: 2, title: 'Launching Enterprise Data Warehouse & AI Analytics for Student Success', category: 'Education', author: 'IT & BI Department', date: '2026-10-12', read_time: '5 min read', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop', excerpt: 'How ACS combines Data Vault 2.0, Kimball Star Schemas, and Agentic AI to identify at-risk students early.', content: 'By integrating attendance logs, multi-term examination marks, and financial records into a unified enterprise data warehouse, our administration can proactively support every learner before board examinations.' },
        { id: 3, title: 'Highlights from the 2026 Annual Science & Computing Expo', category: 'Events', author: 'Prof. Bilal Hassan', date: '2026-08-29', read_time: '3 min read', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop', excerpt: 'Over 65 working robotics, chemistry, and software models exhibited by Matric and ICS students.', content: 'Students demonstrated remarkable creativity in building automated irrigation prototypes, solar trackers, and database applications.' }
    ];

    const testimonials = [
        { id: 1, name: 'Chaudhry Muhammad Tariq Cheema', role: 'Parent of 1st Year Pre-Medical Student', text: 'The discipline, daily attendance tracking, and regular test series at ACS Painsra transformed my son’s academic focus.', rating: 5 },
        { id: 2, name: 'Dr.Ayesha Noor', role: 'ACS Alumna (King Edward Medical University)', text: 'My foundation in F.Sc Pre-Medical at ACS gave me the conceptual clarity needed to clear MDCAT on my first attempt.', rating: 5 },
        { id: 3, name: 'Malik Zafar Iqbal', role: 'Parent of 9th & 6th Class Students', text: 'Transparent fee challans, instant online result cards, and caring teachers make ACS the finest institution on Jhang Road.', rating: 5 }
    ];

    return {
        schoolInfo: {
            id: 'info',
            name: 'ACS School & College',
            tagline: 'Inspiring Excellence, Empowering Leaders.',
            description: 'A premier educational institution on Jhang Road, Painsra (Faisalabad) dedicated to academic excellence, disciplined character formation, and data-driven educational leadership.',
            contact: {
                phone: '0300 1333275',
                email: 'Infoacspainsra@gmail.com',
                address: 'ACS Higher Secondary School & College, Jhang Road Painsra, Faisalabad',
                website: 'www.acscollege.edu.pk',
                hours: 'Monday - Saturday: 7:30 AM - 2:00 PM'
            },
            statistics: [
                { value: `${students.length}`, label: 'Enrolled Students' },
                { value: '98.4%', label: 'BISE Pass Rate' },
                { value: `${faculty.length}+`, label: 'Qualified Faculty' },
                { value: '16', label: 'Active Classes' }
            ]
        },
        students,
        feeRecords,
        feeTransactions,
        inquiries,
        faculty,
        facilities,
        announcements,
        blogs,
        testimonials,
        expenses,
        metadata: {
            CLASSES: allClasses,
            SECTIONS: DEFAULT_SECTIONS_CONFIG,
            SUBJECTS: DEFAULT_SUBJECTS_BY_CLASS,
            TERMS: termsMap,
            WEIGHTS: weightsMap,
            EXCLUSIONS: {},
            CLASS_SERIAL_STARTS: classSerialStarts,
            CLASS_FEE_DEFAULTS: DEFAULT_CLASS_FEE_MAP,
            CLASS_GROUPS: classGroups,
            CLASS_TRACKS: classTracks,
            CLASS_SUBTRACKS: classSubTracks,
            EXPENSES: expenses
        }
    };
}
