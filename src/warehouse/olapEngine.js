// =========================================================================================
// ACS OLAP CUBE & BUSINESS INTELLIGENCE ENGINE (src/warehouse/olapEngine.js)
// Executes multi-dimensional Roll-Up, Drill-Down, Slice & Dice, Pivot, and Cross-Fact Joins
// over the Gold Kimball Star Schema.
// =========================================================================================

import { calcGrade } from '../admin/utils/gradeUtils';

/**
 * Joins Student Dimension + Exam Fact + Fee Fact + Attendance Fact into a unified 360° analytical view
 */
export function buildStudent360Cube(warehouse) {
    if (!warehouse?.goldStarSchema) return [];
    const { dw_dim_student } = warehouse.goldStarSchema.dimensions;
    const {
        dw_fact_academic_performance,
        dw_fact_fee_ledger,
        dw_fact_daily_attendance
    } = warehouse.goldStarSchema.facts;

    // Group exams by student_id
    const examByStudent = new Map();
    dw_fact_academic_performance.forEach((f) => {
        if (!examByStudent.has(f.student_id)) examByStudent.set(f.student_id, []);
        examByStudent.get(f.student_id).push(f);
    });

    // Group fees by student_id
    const feeByStudent = new Map();
    dw_fact_fee_ledger.forEach((f) => {
        if (!feeByStudent.has(f.student_id)) feeByStudent.set(f.student_id, []);
        feeByStudent.get(f.student_id).push(f);
    });

    // Group attendance by student_id
    const attByStudent = new Map();
    dw_fact_daily_attendance.forEach((f) => {
        if (!attByStudent.has(f.student_id)) attByStudent.set(f.student_id, { total: 0, present: 0, absent: 0, late: 0 });
        const acc = attByStudent.get(f.student_id);
        acc.total += 1;
        acc.present += f.present_count;
        acc.absent += f.absent_count;
        acc.late += f.late_count;
    });

    return dw_dim_student.map((stu) => {
        const exams = examByStudent.get(stu.student_id) || [];
        const currentSessionExams = exams.filter((e) => e.academic_session === '2026 Current');
        const activeExams = currentSessionExams.length > 0 ? currentSessionExams : exams;

        const avgExamPct = activeExams.length > 0
            ? Number((activeExams.reduce((s, e) => s + e.percentage, 0) / activeExams.length).toFixed(1))
            : 0;

        // Calculate trend between First Term 2026 and Mid Term 2026
        const t1 = activeExams.filter((e) => e.term_name.includes('First Term'));
        const t2 = activeExams.filter((e) => e.term_name.includes('Mid Term'));
        const t1Avg = t1.length > 0 ? t1.reduce((s, e) => s + e.percentage, 0) / t1.length : avgExamPct;
        const t2Avg = t2.length > 0 ? t2.reduce((s, e) => s + e.percentage, 0) / t2.length : avgExamPct;
        const examTrendDelta = Number((t2Avg - t1Avg).toFixed(1));

        const failedSubjects = activeExams.filter((e) => e.pass_flag === 0).map((e) => e.subject_name);
        const uniqueFailedSubjects = Array.from(new Set(failedSubjects));

        // Fees aggregation
        const fees = feeByStudent.get(stu.student_id) || [];
        const totalNetBilled = fees.reduce((s, f) => s + f.net_payable, 0);
        const totalFeePaid = fees.reduce((s, f) => s + f.collected_amount, 0);
        const totalArrears = fees.reduce((s, f) => s + f.outstanding_arrears, 0);
        const totalDiscount = fees.reduce((s, f) => s + f.discount_scholarship, 0);
        const unpaidMonthsCount = fees.filter((f) => f.outstanding_arrears > 0).length;

        // Attendance aggregation
        const att = attByStudent.get(stu.student_id) || { total: 0, present: 0, absent: 0, late: 0 };
        const attendancePct = att.total > 0 ? Number(((att.present / att.total) * 100).toFixed(1)) : 88.0;

        // Composite Risk Scoring (Academic + Attendance + Financial Default Risk)
        let riskScore = 0;
        const riskReasons = [];
        if (avgExamPct < 50) {
            riskScore += 45;
            riskReasons.push(`Low Academic Avg (${avgExamPct}%)`);
        } else if (avgExamPct < 62) {
            riskScore += 22;
            riskReasons.push(`Borderline Grades (${avgExamPct}%)`);
        }
        if (uniqueFailedSubjects.length > 0) {
            riskScore += 15 * uniqueFailedSubjects.length;
            riskReasons.push(`Failing in ${uniqueFailedSubjects.slice(0, 2).join(', ')}`);
        }
        if (attendancePct < 75) {
            riskScore += 30;
            riskReasons.push(`Chronic Absenteeism (${attendancePct}%)`);
        } else if (attendancePct < 82) {
            riskScore += 15;
            riskReasons.push(`Below Target Attendance (${attendancePct}%)`);
        }
        if (totalArrears > 8000) {
            riskScore += 25;
            riskReasons.push(`High Fee Arrears (RS ${totalArrears.toLocaleString()})`);
        } else if (totalArrears > 0) {
            riskScore += 10;
        }

        const riskTier = riskScore >= 60 ? 'Critical' : riskScore >= 35 ? 'High' : riskScore >= 18 ? 'Moderate' : 'Low';

        return {
            ...stu,
            avgExamPct,
            overallGrade: calcGrade(avgExamPct),
            examTrendDelta,
            failedSubjectsCount: uniqueFailedSubjects.length,
            failedSubjects: uniqueFailedSubjects,
            attendancePct,
            daysPresent: att.present,
            daysAbsent: att.absent,
            daysLate: att.late,
            totalNetBilled,
            totalFeePaid,
            totalArrears,
            totalDiscount,
            unpaidMonthsCount,
            feeCollectionPct: totalNetBilled > 0 ? Number(((totalFeePaid / totalNetBilled) * 100).toFixed(1)) : 100,
            riskScore: Math.min(100, riskScore),
            riskTier,
            riskReasons: riskReasons.length > 0 ? riskReasons.join(' • ') : 'On Track (Good Standing)'
        };
    });
}

/**
 * Computes comprehensive school-wide BI KPIs and aggregations across all 5 Star Schema Fact Tables
 */
export function computeExecutiveBISummary(warehouse) {
    if (!warehouse?.goldStarSchema) return null;
    const {
        dw_fact_academic_performance,
        dw_fact_fee_ledger,
        dw_fact_daily_attendance,
        dw_fact_admissions_funnel,
        dw_fact_institutional_pnl
    } = warehouse.goldStarSchema.facts;

    const student360 = buildStudent360Cube(warehouse);
    const activeStudents = student360.filter((s) => s.enrollment_status === 'active');

    // 1. Academic Intelligence
    const currentExams = dw_fact_academic_performance.filter((f) => f.academic_session === '2026 Current');
    const overallExamAvg = currentExams.length > 0
        ? Number((currentExams.reduce((s, r) => s + r.percentage, 0) / currentExams.length).toFixed(1))
        : 0;
    const overallPassRate = currentExams.length > 0
        ? Number(((currentExams.filter((r) => r.pass_flag === 1).length / currentExams.length) * 100).toFixed(1))
        : 0;
    const distinctionRate = currentExams.length > 0
        ? Number(((currentExams.filter((r) => r.distinction_flag === 1).length / currentExams.length) * 100).toFixed(1))
        : 0;

    // Subject Performance Matrix
    const subjectStatsMap = new Map();
    currentExams.forEach((e) => {
        if (!subjectStatsMap.has(e.subject_name)) {
            subjectStatsMap.set(e.subject_name, {
                subject: e.subject_name,
                category: e.subject_category,
                count: 0,
                sumPct: 0,
                passCount: 0,
                distinctionCount: 0
            });
        }
        const st = subjectStatsMap.get(e.subject_name);
        st.count++;
        st.sumPct += e.percentage;
        st.passCount += e.pass_flag;
        st.distinctionCount += e.distinction_flag;
    });
    const subjectPerformance = Array.from(subjectStatsMap.values())
        .map((s) => ({
            subject: s.subject,
            category: s.category,
            assessments: s.count,
            avgPct: Number((s.sumPct / s.count).toFixed(1)),
            passRate: Number(((s.passCount / s.count) * 100).toFixed(1)),
            distinctionRate: Number(((s.distinctionCount / s.count) * 100).toFixed(1))
        }))
        .sort((a, b) => a.avgPct - b.avgPct);

    // 2. Financial & P&L Intelligence
    const totalGrossBilled = dw_fact_fee_ledger.reduce((s, f) => s + f.gross_billed, 0);
    const totalScholarships = dw_fact_fee_ledger.reduce((s, f) => s + f.discount_scholarship, 0);
    const totalNetPayable = dw_fact_fee_ledger.reduce((s, f) => s + f.net_payable, 0);
    const totalCollected = dw_fact_fee_ledger.reduce((s, f) => s + f.collected_amount, 0);
    const totalArrears = dw_fact_fee_ledger.reduce((s, f) => s + f.outstanding_arrears, 0);
    const collectionEfficiency = totalNetPayable > 0
        ? Number(((totalCollected / totalNetPayable) * 100).toFixed(1))
        : 100;

    const totalExpenses = dw_fact_institutional_pnl.reduce((s, p) => s + p.total_expenses, 0);
    const netOperatingProfit = totalCollected - totalExpenses;
    const operatingMarginPct = totalCollected > 0
        ? Number(((netOperatingProfit / totalCollected) * 100).toFixed(1))
        : 0;

    // 3. Attendance Intelligence
    const totalAttRecords = dw_fact_daily_attendance.length;
    const totalPresent = dw_fact_daily_attendance.reduce((s, a) => s + a.present_count, 0);
    const overallAttendancePct = totalAttRecords > 0
        ? Number(((totalPresent / totalAttRecords) * 100).toFixed(1))
        : 0;

    // 4. Class & Track Roll-Up Summary
    const classRollupMap = new Map();
    student360.forEach((s) => {
        const key = s.base_class;
        if (!classRollupMap.has(key)) {
            classRollupMap.set(key, {
                base_class: s.base_class,
                section_name: s.section_name,
                studentCount: 0,
                boysCount: 0,
                girlsCount: 0,
                sumExamPct: 0,
                sumAttPct: 0,
                netBilled: 0,
                collected: 0,
                arrears: 0,
                defaultersCount: 0,
                atRiskCount: 0
            });
        }
        const c = classRollupMap.get(key);
        c.studentCount++;
        if (s.gender === 'Male') c.boysCount++;
        else c.girlsCount++;
        c.sumExamPct += s.avgExamPct;
        c.sumAttPct += s.attendancePct;
        c.netBilled += s.totalNetBilled;
        c.collected += s.totalFeePaid;
        c.arrears += s.totalArrears;
        if (s.totalArrears > 0) c.defaultersCount++;
        if (s.riskTier === 'Critical' || s.riskTier === 'High') c.atRiskCount++;
    });

    const classOrder = ['Playgroup', 'Nursery', 'K.G', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '1st Year', '2nd Year'];
    const classRollup = Array.from(classRollupMap.values())
        .map((c) => ({
            ...c,
            avgExamPct: Number((c.sumExamPct / c.studentCount).toFixed(1)),
            avgAttendancePct: Number((c.sumAttPct / c.studentCount).toFixed(1)),
            collectionPct: c.netBilled > 0 ? Number(((c.collected / c.netBilled) * 100).toFixed(1)) : 100
        }))
        .sort((a, b) => classOrder.indexOf(a.base_class) - classOrder.indexOf(b.base_class));

    // 5. Section Roll-Up Summary
    const sectionRollupMap = new Map();
    classRollup.forEach((c) => {
        if (!sectionRollupMap.has(c.section_name)) {
            sectionRollupMap.set(c.section_name, {
                section_name: c.section_name,
                studentCount: 0,
                sumExamWeighted: 0,
                sumAttWeighted: 0,
                netBilled: 0,
                collected: 0,
                arrears: 0,
                atRiskCount: 0
            });
        }
        const sec = sectionRollupMap.get(c.section_name);
        sec.studentCount += c.studentCount;
        sec.sumExamWeighted += c.avgExamPct * c.studentCount;
        sec.sumAttWeighted += c.avgAttendancePct * c.studentCount;
        sec.netBilled += c.netBilled;
        sec.collected += c.collected;
        sec.arrears += c.arrears;
        sec.atRiskCount += c.atRiskCount;
    });
    const sectionRollup = Array.from(sectionRollupMap.values()).map((sec) => ({
        section_name: sec.section_name,
        studentCount: sec.studentCount,
        avgExamPct: Number((sec.sumExamWeighted / sec.studentCount).toFixed(1)),
        avgAttendancePct: Number((sec.sumAttWeighted / sec.studentCount).toFixed(1)),
        netBilled: sec.netBilled,
        collected: sec.collected,
        arrears: sec.arrears,
        collectionPct: sec.netBilled > 0 ? Number(((sec.collected / sec.netBilled) * 100).toFixed(1)) : 100,
        atRiskCount: sec.atRiskCount
    }));

    // 6. Track Comparison (Matric & Intermediate)
    const trackMap = new Map();
    student360
        .filter((s) => ['9th', '10th', '1st Year', '2nd Year'].includes(s.base_class))
        .forEach((s) => {
            const key = `${s.base_class} — ${s.subject_track}`;
            if (!trackMap.has(key)) {
                trackMap.set(key, {
                    trackLabel: key,
                    base_class: s.base_class,
                    subject_track: s.subject_track,
                    students: 0,
                    sumExam: 0,
                    sumAtt: 0,
                    arrears: 0
                });
            }
            const t = trackMap.get(key);
            t.students++;
            t.sumExam += s.avgExamPct;
            t.sumAtt += s.attendancePct;
            t.arrears += s.totalArrears;
        });
    const trackComparison = Array.from(trackMap.values()).map((t) => ({
        ...t,
        avgExamPct: Number((t.sumExam / t.students).toFixed(1)),
        avgAttendancePct: Number((t.sumAtt / t.students).toFixed(1))
    }));

    // 7. Admissions Inquiry Funnel
    const totalInquiries = dw_fact_admissions_funnel.length;
    const confirmedInquiries = dw_fact_admissions_funnel.filter((i) => i.converted_flag === 1).length;
    const inquiryConversionRate = totalInquiries > 0
        ? Number(((confirmedInquiries / totalInquiries) * 100).toFixed(1))
        : 0;

    return {
        kpis: {
            totalStudents: student360.length,
            activeStudents: activeStudents.length,
            boysCount: student360.filter((s) => s.gender === 'Male').length,
            girlsCount: student360.filter((s) => s.gender === 'Female').length,
            overallExamAvg,
            overallPassRate,
            distinctionRate,
            overallAttendancePct,
            totalGrossBilled,
            totalScholarships,
            totalNetPayable,
            totalCollected,
            totalArrears,
            collectionEfficiency,
            totalExpenses,
            netOperatingProfit,
            operatingMarginPct,
            defaultersCount: student360.filter((s) => s.totalArrears > 0).length,
            criticalRiskStudents: student360.filter((s) => s.riskTier === 'Critical' || s.riskTier === 'High').length,
            totalInquiries,
            confirmedInquiries,
            inquiryConversionRate
        },
        student360,
        classRollup,
        sectionRollup,
        subjectPerformance,
        trackComparison,
        monthlyPnL: dw_fact_institutional_pnl
    };
}

/**
 * Dynamic OLAP Slice, Dice & Roll-Up Query Executor
 * Supports grouping by any dimension attribute and filtering by multiple slices
 */
export function executeOlapSliceAndDice(warehouse, {
    dimension = 'base_class', // 'section_name' | 'base_class' | 'subject_track' | 'gender' | 'house_group' | 'locality' | 'riskTier'
    sectionFilter = 'ALL',
    classFilter = 'ALL',
    trackFilter = 'ALL',
    genderFilter = 'ALL',
    riskFilter = 'ALL'
} = {}) {
    const cube = buildStudent360Cube(warehouse);
    const filtered = cube.filter((row) => {
        if (sectionFilter !== 'ALL' && row.section_name !== sectionFilter) return false;
        if (classFilter !== 'ALL' && row.base_class !== classFilter) return false;
        if (trackFilter !== 'ALL' && row.subject_track !== trackFilter) return false;
        if (genderFilter !== 'ALL' && row.gender !== genderFilter) return false;
        if (riskFilter !== 'ALL' && row.riskTier !== riskFilter) return false;
        return true;
    });

    const groups = new Map();
    filtered.forEach((r) => {
        const key = r[dimension] || 'Unspecified';
        if (!groups.has(key)) {
            groups.set(key, {
                dimensionKey: key,
                studentCount: 0,
                sumExamPct: 0,
                sumAttPct: 0,
                netBilled: 0,
                collected: 0,
                arrears: 0,
                scholarships: 0,
                highRiskCount: 0
            });
        }
        const g = groups.get(key);
        g.studentCount++;
        g.sumExamPct += r.avgExamPct;
        g.sumAttPct += r.attendancePct;
        g.netBilled += r.totalNetBilled;
        g.collected += r.totalFeePaid;
        g.arrears += r.totalArrears;
        g.scholarships += r.totalDiscount;
        if (r.riskTier === 'Critical' || r.riskTier === 'High') g.highRiskCount++;
    });

    return Array.from(groups.values())
        .map((g) => ({
            dimensionKey: g.dimensionKey,
            studentCount: g.studentCount,
            avgExamPct: Number((g.sumExamPct / g.studentCount).toFixed(1)),
            avgAttendancePct: Number((g.sumAttPct / g.studentCount).toFixed(1)),
            netBilled: g.netBilled,
            collected: g.collected,
            arrears: g.arrears,
            scholarships: g.scholarships,
            collectionRatePct: g.netBilled > 0 ? Number(((g.collected / g.netBilled) * 100).toFixed(1)) : 100,
            highRiskCount: g.highRiskCount
        }))
        .sort((a, b) => b.studentCount - a.studentCount);
}
