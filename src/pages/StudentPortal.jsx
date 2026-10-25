import React, { useState, useEffect } from 'react';
import {
    User, Users, Calendar, Award, BarChart3, BookOpen,
    LogOut, TrendingUp, DollarSign, CheckCircle, XCircle,
    ArrowUp, ArrowDown, Minus, BookMarked, Menu, X, ChevronLeft, ChevronRight, School
} from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';
import { calcGrade, getBaseClass, canonicalSubjectName, getStudentFullClassLabel } from '../admin/utils/gradeUtils';

const AttendanceCalendar = ({ records }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); 
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0(Sun)
    
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const thisMonthRecs = (records || []).filter(r => r.date.startsWith(monthPrefix));
    
    const presentCount = thisMonthRecs.filter(r => r.status === 'present').length;
    const absentCount = thisMonthRecs.filter(r => r.status === 'absent').length;
    const lateCount = thisMonthRecs.filter(r => r.status === 'late').length;

    const getStatusForDay = (day) => {
        const dStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
        const rec = thisMonthRecs.find(r => r.date === dStr);
        return rec ? rec.status : null;
    };

    const statusColors = {
        present: '#10b981', 
        absent: '#ef4444', 
        late: '#f59e0b', 
        leave: '#3b82f6' 
    };

    const handlePrev = () => setCurrentMonth(new Date(year, month - 1, 1));
    const handleNext = () => setCurrentMonth(new Date(year, month + 1, 1));

    // Array of days
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    return (
        <div style={{ background: '#0f172a', borderRadius: '16px', padding: '1.5rem', color: 'white', fontFamily: 'inherit', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                        <Calendar size={20} color="#3b82f6" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Attendance Calendar</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </div>
                {/* Scorecards */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{presentCount}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Present</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{absentCount}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Absent</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>{lateCount}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Late</div>
                    </div>
                </div>
            </div>

            {/* Calendar Container */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>
                        {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handlePrev} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}><ChevronLeft size={18} /></button>
                        <button onClick={handleNext} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}><ChevronRight size={18} /></button>
                    </div>
                </div>

                {/* Weekdays */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                    {blanks.map(b => <div key={`blank-${b}`} />)}
                    {daysArr.map(day => {
                        const status = getStatusForDay(day);
                        const color = status ? statusColors[status] : undefined;
                        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                        return (
                            <div key={day} style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                padding: '0.5rem', 
                                borderRadius: '8px', 
                                background: isToday ? 'rgba(59, 130, 246, 0.2)' : (status ? 'transparent' : 'rgba(255,255,255,0.02)'),
                                border: isToday ? '1px solid #3b82f6' : '1px solid transparent',
                                cursor: 'default'
                            }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: status ? 'white' : '#cbd5e1' }}>{day}</span>
                                <div style={{ 
                                    width: '6px', height: '6px', borderRadius: '50%', 
                                    background: color || 'transparent', 
                                    marginTop: '0.25rem',
                                    boxShadow: color ? `0 0 8px ${color}aa` : 'none'
                                }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors.present }} /> Present</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors.absent }} /> Absent</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors.late }} /> Late</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors.leave }} /> On Leave</div>
            </div>
        </div>
    );
};

const StudentPortal = ({ student, setIsLoggedIn, setCurrentPage, setLoggedInStudent }) => {
    const { schoolData, TERMS, WEIGHTS } = useSchoolData();
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedPrevTerm, setSelectedPrevTerm] = useState(0);
    const classTerms = (TERMS && !Array.isArray(TERMS)
        ? (TERMS[student?.grade] || TERMS[getBaseClass(student?.grade)] || [])
        : (Array.isArray(TERMS) ? TERMS : []));
    const [selectedTerm, setSelectedTerm] = useState(classTerms[0] || '');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        setIsLoggedIn(false);
        setLoggedInStudent(null);
        setCurrentPage('home');
    };

    useEffect(() => {
        if (!student) {
            setCurrentPage('login');
        }
    }, [student, setCurrentPage]);

    if (!student) return null;

    // Use live data from context if available (updated by teacher), otherwise use the student prop
    const studentsData = schoolData?.students;
    const rawStudent = studentsData ? studentsData.find(s => s.id === student.id) || student : student;

    const getSubjectTotalForClass = (className, sub, term) => {
        const t = term || 'Current';
        if (WEIGHTS) {
            const classW = WEIGHTS[className];
            if (classW && classW[t] && typeof classW[t] === 'object' && classW[t][sub] !== undefined && classW[t][sub] !== '') return Number(classW[t][sub]);
            if (classW && typeof classW[sub] === 'number') return Number(classW[sub]);
            if (WEIGHTS[t] && typeof WEIGHTS[t] === 'object' && WEIGHTS[t][sub] !== undefined && WEIGHTS[t][sub] !== '') return Number(WEIGHTS[t][sub]);
            if (typeof WEIGHTS[sub] === 'number') return Number(WEIGHTS[sub]);
        }
        return 100;
    };

    // Dynamically recalculate all student results based on current weights/total marks with canonical deduplication
    const resMap = new Map();
    (rawStudent.results || []).forEach(r => {
        if (!r || !r.subject) return;
        const canonSub = canonicalSubjectName(r.subject);
        const termName = r.term || 'Current';
        const key = `${termName.trim().toLowerCase()}__${canonSub.toLowerCase()}`;
        const subTotal = getSubjectTotalForClass(rawStudent.grade, canonSub, termName);
        const obtained = r.obtained;
        const numObtained = obtained === 'A' ? 0 : Number(obtained || 0);
        const pct = subTotal > 0 ? Math.round((numObtained / subTotal) * 100) : 0;
        const grade = obtained === 'A' ? 'F' : calcGrade(pct);
        resMap.set(key, {
            ...r,
            subject: canonSub,
            total: subTotal,
            percentage: pct,
            grade: grade
        });
    });
    const recalculatedResults = Array.from(resMap.values());

    const liveStudent = {
        ...rawStudent,
        results: recalculatedResults
    };

    // Get results for a specific term
    const getTermResults = (termLabel) => {
        return (liveStudent.results || []).filter(r => r.term === termLabel);
    };

    // Get results for the currently selected term (or all if none selected)
    const currentTermResults = selectedTerm ? getTermResults(selectedTerm) : (liveStudent.results || []);

    // Calculate grade average for selected term
    const avgPercentage = currentTermResults.length > 0
        ? (currentTermResults.reduce((sum, r) => sum + r.percentage, 0) / currentTermResults.length).toFixed(1)
        : '0.0';

    // Best & weakest subjects for selected term
    const sortedResults = [...currentTermResults].sort((a, b) => b.percentage - a.percentage);
    const bestSubject = sortedResults[0] || { subject: 'N/A', percentage: 0, obtained: 0, total: 100, grade: '-' };
    const weakestSubject = sortedResults[sortedResults.length - 1] || { subject: 'N/A', percentage: 0, obtained: 0, total: 100, grade: '-' };

    // Attendance ring helpers
    const attendancePercent = liveStudent.attendance.percentage;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (attendancePercent / 100) * circumference;
    const attendanceColor = attendancePercent >= 95 ? '#10b981' : attendancePercent >= 85 ? '#3b82f6' : attendancePercent >= 75 ? '#f59e0b' : '#ef4444';

    // Grade color helper
    const getGradeColor = (pct) => {
        if (pct >= 90) return '#10b981';
        if (pct >= 80) return '#3b82f6';
        if (pct >= 70) return '#f59e0b';
        return '#ef4444';
    };

    // Trend arrow between previous term and current selected term
    const getTrend = (subject) => {
        const prev = liveStudent.previousResults;
        if (!prev || prev.length === 0) return null;
        const lastTerm = prev[prev.length - 1].results.find(r => r.subject === subject);
        const current = currentTermResults.find(r => r.subject === subject);
        if (!lastTerm || !current) return null;
        const diff = current.percentage - lastTerm.percentage;
        if (diff > 0) return { icon: ArrowUp, color: '#10b981', diff: `+${diff}%` };
        if (diff < 0) return { icon: ArrowDown, color: '#ef4444', diff: `${diff}%` };
        return { icon: Minus, color: '#9ca3af', diff: '0%' };
    };

    // Card style
    const cardStyle = {
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.05)'
    };

    const studentTabs = [
        { id: 'overview', label: 'Dashboard', icon: BarChart3, desc: 'Your academic overview and quick stats.' },
        { id: 'results', label: 'Term Results', icon: Award, desc: 'View your detailed grades and performance.' },
        { id: 'attendance', label: 'Attendance Record', icon: Calendar, desc: 'Track your presence and absences.' },
        { id: 'history', label: 'Previous Results', icon: BookMarked, desc: 'Review your historical academic performance.' },
        { id: 'fees', label: 'Fee Status', icon: DollarSign, desc: 'Check your current fee payments.' },
        { id: 'profile', label: 'My Profile', icon: User, desc: 'View your complete personal details.' }
    ];

    return (
        <div className="dashboard-container">
            {/* ── MOBILE OVERLAY ── */}
            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

            {/* ── LEFT SIDEBAR (MINIMAL ENTERPRISE STUDENT PORTAL) ── */}
            <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ background: '#0f172a', borderRight: '1px solid #1e293b' }}>
                <div style={{ padding: '1.35rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem', borderBottom: '1px solid #1e293b', position: 'relative' }}>

                    <button className="mobile-menu-btn" style={{ position: 'absolute', top: '10px', right: '10px', color: '#f8fafc', background: 'transparent', border: 'none' }} onClick={() => setIsSidebarOpen(false)}>
                        <X size={20} />
                    </button>

                    <div style={{
                        width: '54px', height: '54px', borderRadius: '12px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8'
                    }}>
                        {liveStudent.name.charAt(0)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#f8fafc' }}>{liveStudent.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500, fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                            {getStudentFullClassLabel(liveStudent)} • {liveStudent.id}
                        </div>
                    </div>
                </div>

                <nav style={{ padding: '0.85rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto', flex: 1 }}>
                    <div style={{ margin: '0.25rem 0 0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        STUDENT ACADEMIC PORTAL
                    </div>

                    {studentTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} className="btn" style={{
                                justifyContent: 'flex-start',
                                padding: '0.62rem 0.85rem',
                                background: isActive ? '#1e293b' : 'transparent',
                                color: isActive ? '#ffffff' : '#94a3b8',
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.83rem',
                                borderRadius: '6px',
                                width: '100%',
                                textAlign: 'left',
                                transition: 'all 0.15s ease'
                            }}>
                                <tab.icon size={16} style={{ marginRight: '0.65rem', color: isActive ? '#38bdf8' : '#64748b' }} /> {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <div style={{ padding: '0.85rem', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <button onClick={() => setCurrentPage('home')} className="btn" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.78rem', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px' }}>
                        <School size={14} /> Campus Website
                    </button>
                    <button onClick={handleLogout} className="btn" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px' }}>
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="dashboard-main" style={{ background: '#f8fafc' }}>

                {/* Minimal Enterprise Header */}
                <header className="dashboard-header" style={{ padding: '1.1rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu size={22} />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    {studentTabs.find(t => t.id === activeTab)?.label}
                                </h1>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                                    STUDENT 360° CUBE
                                </span>
                            </div>
                            <p style={{ color: '#64748b', margin: '0.15rem 0 0', fontSize: '0.83rem' }}>
                                {studentTabs.find(t => t.id === activeTab)?.desc}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content" style={{ padding: '1.5rem 2rem' }}>

                    {/* ════════════════ OVERVIEW TAB ════════════════ */}
                    {activeTab === 'overview' && (
                        <div className="animate-fade-in">
                            {/* Enterprise Student Workspace Header */}
                            <div className="dw-hero-banner" style={{ marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span className="dw-pill-badge" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                                            STUDENT 360° ACADEMIC &amp; ATTENDANCE ANALYTICS
                                        </span>
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                        Assalam-o-Alaikum, {liveStudent.name}
                                    </h2>
                                    <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.875rem' }}>
                                        Live academic transcript, attendance metrics, and fee ledger summary for <strong>{selectedTerm}</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Quick Enterprise KPI Row */}
                            <div className="dw-kpi-grid" style={{ marginBottom: '1.75rem' }}>
                                <div className="dw-kpi-card">
                                    <div className="dw-kpi-label">TERM AVERAGE PERCENTAGE</div>
                                    <div className="dw-kpi-value">{avgPercentage}%</div>
                                    <div className="dw-kpi-sub">Active Term: {selectedTerm}</div>
                                </div>
                                <div className="dw-kpi-card">
                                    <div className="dw-kpi-label">CUMULATIVE ATTENDANCE</div>
                                    <div className="dw-kpi-value">{liveStudent.attendance.percentage}%</div>
                                    <div className="dw-kpi-sub">{liveStudent.attendance.present} Present / {liveStudent.attendance.total} Days</div>
                                </div>
                                <div className="dw-kpi-card">
                                    <div className="dw-kpi-label">STRONGEST SUBJECT</div>
                                    <div className="dw-kpi-value">{bestSubject.percentage}%</div>
                                    <div className="dw-kpi-sub">{bestSubject.subject} (Grade {bestSubject.grade})</div>
                                </div>
                                <div className="dw-kpi-card">
                                    <div className="dw-kpi-label">FEE LEDGER STATUS</div>
                                    <div className="dw-kpi-value" style={{ textTransform: 'uppercase', color: liveStudent.feeStatus === 'paid' ? '#059669' : '#dc2626' }}>
                                        {liveStudent.feeStatus || 'N/A'}
                                    </div>
                                    <div className="dw-kpi-sub">Monthly Tuition Account</div>
                                </div>
                            </div>

                            {/* Two-column: Subject Performance + Attendance Ring */}
                            <div className="dashboard-grid-2col">
                                {/* Subject Performance Cards */}
                                <div style={cardStyle}>
                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>
                                        Subject Performance
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                        {currentTermResults.map((result, idx) => {
                                            const trend = getTrend(result.subject);
                                            return (
                                                <div key={idx} style={{
                                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                                    padding: '0.65rem 0',
                                                    borderBottom: idx < currentTermResults.length - 1 ? '1px solid #f1f5f9' : 'none'
                                                }}>
                                                    <div style={{ width: '120px', fontWeight: 600, fontSize: '0.95rem', color: '#334155' }}>
                                                        {result.subject}
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div style={{
                                                        flex: 1, height: '10px',
                                                        background: '#f1f5f9',
                                                        borderRadius: '999px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${result.percentage}%`,
                                                            height: '100%',
                                                            borderRadius: '999px',
                                                            background: `linear-gradient(90deg, ${getGradeColor(result.percentage)}, ${getGradeColor(result.percentage)}cc)`,
                                                            transition: 'width 1s ease-out'
                                                        }} />
                                                    </div>
                                                    <div style={{ width: '80px', textAlign: 'right', fontWeight: 700, color: getGradeColor(result.percentage), fontSize: '0.8rem' }}>
                                                        {result.obtained !== undefined ? `${result.obtained}/${result.total || 100}` : `${result.percentage}%`}
                                                    </div>
                                                    <span style={{
                                                        background: '#f1f5f9', borderRadius: '6px',
                                                        padding: '0.2rem 0.6rem', fontSize: '0.8rem',
                                                        fontWeight: 700, color: getGradeColor(result.percentage)
                                                    }}>
                                                        {result.grade}
                                                    </span>
                                                    {/* Trend */}
                                                    {trend && (
                                                        <span style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.2rem',
                                                            fontSize: '0.75rem', fontWeight: 600, color: trend.color
                                                        }}>
                                                            <trend.icon size={14} />
                                                            {trend.diff}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Attendance Ring */}
                                <div style={{ ...cardStyle, textAlign: 'center' }}>
                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
                                        Attendance Summary
                                    </h2>
                                    <svg width="140" height="140" style={{ margin: '0 auto', display: 'block' }}>
                                        <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                        <circle
                                            cx="70" cy="70" r={radius} fill="none"
                                            stroke={attendanceColor} strokeWidth="10"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={offset}
                                            strokeLinecap="round"
                                            transform="rotate(-90 70 70)"
                                            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
                                        />
                                        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1e293b">
                                            {attendancePercent}%
                                        </text>
                                        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#64748b">
                                            Attendance
                                        </text>
                                    </svg>

                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: '0.75rem', marginTop: '1.25rem'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                                                {liveStudent.attendance.present}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Present</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
                                                {liveStudent.attendance.absent}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Absent</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>
                                                {liveStudent.attendance.total}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════ RESULTS TAB ════════════════ */}
                    {activeTab === 'results' && (
                        <div className="animate-fade-in">
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                                Term Results
                            </h2>
                            <p style={{ color: '#64748b', marginBottom: '1rem' }}>Your academic performance separated by term</p>

                            {/* Term selector */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                {classTerms.map(t => {
                                    const termRes = getTermResults(t);
                                    const hasData = termRes.length > 0;
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setSelectedTerm(t)}
                                            style={{
                                                padding: '0.6rem 1.5rem',
                                                borderRadius: '999px',
                                                fontWeight: 700,
                                                fontSize: '0.9rem',
                                                border: selectedTerm === t ? '2px solid #2563eb' : '2px solid #e2e8f0',
                                                background: selectedTerm === t ? '#2563eb' : 'white',
                                                color: selectedTerm === t ? 'white' : '#475569',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                opacity: hasData ? 1 : 0.5
                                            }}
                                        >
                                            {t} {hasData ? `(${termRes.length})` : '(No data)'}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Summary bar */}
                            <div style={{
                                ...cardStyle,
                                display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap',
                                gap: '1rem', marginBottom: '1.5rem',
                                background: 'linear-gradient(135deg, #f0f9ff, #eff6ff)',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb' }}>{avgPercentage}%</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Average</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{bestSubject.subject}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Highest ({bestSubject.percentage}%)</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{weakestSubject.subject}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Needs Focus ({weakestSubject.obtained !== undefined ? `${weakestSubject.obtained}/${weakestSubject.total}` : `${weakestSubject.percentage}%`})</div>
                                </div>
                            </div>

                            {/* Subject Cards Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '1.25rem'
                            }}>
                                {currentTermResults.length > 0 ? currentTermResults.map((result, idx) => {
                                    const trend = getTrend(result.subject);
                                    return (
                                        <div key={idx} style={{
                                            ...cardStyle,
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Colored top accent */}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                                                background: getGradeColor(result.percentage)
                                            }} />
                                            <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>
                                                    {result.subject}
                                                </h3>
                                                <span style={{
                                                    background: getGradeColor(result.percentage) + '1a',
                                                    color: getGradeColor(result.percentage),
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700
                                                }}>
                                                    {result.grade}
                                                </span>
                                            </div>

                                            {/* Large percentage */}
                                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: getGradeColor(result.percentage), marginBottom: '0.2rem' }}>
                                                {result.percentage}%
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>
                                                {result.obtained !== undefined ? `${result.obtained} / ${result.total || 100}` : 'Marks obtained'}
                                            </div>

                                            {/* Progress bar */}
                                            <div style={{
                                                height: '8px', background: '#f1f5f9',
                                                borderRadius: '999px', overflow: 'hidden',
                                                marginBottom: '0.75rem'
                                            }}>
                                                <div style={{
                                                    width: `${result.percentage}%`,
                                                    height: '100%',
                                                    borderRadius: '999px',
                                                    background: getGradeColor(result.percentage),
                                                    transition: 'width 1s ease-out'
                                                }} />
                                            </div>

                                            {/* Trend comparison */}
                                            {trend && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                    fontSize: '0.8rem', color: trend.color, fontWeight: 600
                                                }}>
                                                    <trend.icon size={14} />
                                                    {trend.diff} from last term
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div style={{
                                        ...cardStyle,
                                        textAlign: 'center',
                                        padding: '3rem',
                                        color: '#94a3b8',
                                        gridColumn: '1 / -1'
                                    }}>
                                        <Award size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                                        <p style={{ fontWeight: 600 }}>No results available for {selectedTerm} yet.</p>
                                        <p style={{ fontSize: '0.85rem' }}>Results will appear here once your teacher enters marks for this term.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ════════════════ ATTENDANCE TAB ════════════════ */}
                    {activeTab === 'attendance' && (
                        <div className="animate-fade-in">
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                                Attendance Record
                            </h2>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Detailed breakdown of your attendance this academic year</p>

                            {/* Big ring + stat grid side by side */}
                            <div className="dashboard-grid-2col" style={{ marginBottom: '2rem' }}>
                                {/* Ring card */}
                                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="200" height="200">
                                        <circle cx="100" cy="100" r="80" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                                        <circle
                                            cx="100" cy="100" r="80" fill="none"
                                            stroke={attendanceColor} strokeWidth="14"
                                            strokeDasharray={2 * Math.PI * 80}
                                            strokeDashoffset={2 * Math.PI * 80 - (attendancePercent / 100) * 2 * Math.PI * 80}
                                            strokeLinecap="round"
                                            transform="rotate(-90 100 100)"
                                            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                                        />
                                        <text x="100" y="94" textAnchor="middle" fontSize="32" fontWeight="800" fill="#1e293b">
                                            {attendancePercent}%
                                        </text>
                                        <text x="100" y="118" textAnchor="middle" fontSize="13" fill="#94a3b8">
                                            Attendance Rate
                                        </text>
                                    </svg>
                                    <p style={{
                                        marginTop: '1rem', fontSize: '0.95rem', color: '#64748b',
                                        fontWeight: 500, textAlign: 'center'
                                    }}>
                                        {attendancePercent >= 95
                                            ? '🌟 Outstanding attendance! Keep it up!'
                                            : attendancePercent >= 85
                                                ? '👍 Good attendance. Try to improve further!'
                                                : '⚠️ Attendance needs improvement. Please be regular.'}
                                    </p>
                                </div>

                                {/* Stat cards */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {[
                                        {
                                            label: 'Days Present', value: liveStudent.attendance.present,
                                            color: '#10b981', bg: '#ecfdf5', icon: CheckCircle,
                                            desc: 'Days you attended classes'
                                        },
                                        {
                                            label: 'Days Absent', value: liveStudent.attendance.absent,
                                            color: '#ef4444', bg: '#fef2f2', icon: XCircle,
                                            desc: 'Days you were absent'
                                        },
                                        {
                                            label: 'Total School Days', value: liveStudent.attendance.total,
                                            color: '#3b82f6', bg: '#eff6ff', icon: Calendar,
                                            desc: 'Total working days this year'
                                        }
                                    ].map((stat, idx) => (
                                        <div key={idx} style={{
                                            ...cardStyle,
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            background: stat.bg,
                                            border: `1px solid ${stat.color}25`
                                        }}>
                                            <div style={{
                                                width: '52px', height: '52px', borderRadius: '14px',
                                                background: stat.color + '20',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <stat.icon size={24} color={stat.color} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                                                    {stat.value}
                                                </div>
                                                <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>{stat.label}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{stat.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Monthly Calendar View */}
                            <AttendanceCalendar records={liveStudent.attendance.records} />
                        </div>
                    )}

                    {/* ════════════════ PREVIOUS RESULTS TAB ════════════════ */}
                    {activeTab === 'history' && (
                        <div className="animate-fade-in">
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                                Previous Results
                            </h2>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Review your performance across past terms</p>

                            {/* Term selector */}
                            {liveStudent.previousResults && liveStudent.previousResults.length > 0 ? (
                                <>
                                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                        {liveStudent.previousResults.map((term, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedPrevTerm(idx)}
                                                style={{
                                                    padding: '0.6rem 1.5rem',
                                                    borderRadius: '999px',
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem',
                                                    border: selectedPrevTerm === idx ? '2px solid #2563eb' : '2px solid #e2e8f0',
                                                    background: selectedPrevTerm === idx ? '#2563eb' : 'white',
                                                    color: selectedPrevTerm === idx ? 'white' : '#475569',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {term.term}
                                            </button>
                                        ))}
                                        {/* Also add current term button */}
                                        <button
                                            onClick={() => setSelectedPrevTerm(-1)}
                                            style={{
                                                padding: '0.6rem 1.5rem',
                                                borderRadius: '999px',
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                                border: selectedPrevTerm === -1 ? '2px solid #10b981' : '2px solid #e2e8f0',
                                                background: selectedPrevTerm === -1 ? '#10b981' : 'white',
                                                color: selectedPrevTerm === -1 ? 'white' : '#475569',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            Current Term
                                        </button>
                                    </div>

                                    {/* Results Table */}
                                    {(() => {
                                        const termResults = selectedPrevTerm === -1
                                            ? liveStudent.results
                                            : liveStudent.previousResults[selectedPrevTerm].results;
                                        const termAvg = (termResults.reduce((s, r) => s + r.percentage, 0) / termResults.length).toFixed(1);

                                        return (
                                            <>
                                                {/* Term average banner */}
                                                <div className="flex-between term-average-banner" style={{
                                                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                                                    color: 'white',
                                                    marginBottom: '1.5rem',
                                                    padding: '1.5rem',
                                                    borderRadius: '16px'
                                                }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                                            {selectedPrevTerm === -1 ? 'Current Term' : liveStudent.previousResults[selectedPrevTerm].term}
                                                        </div>
                                                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>
                                                            Average: {termAvg}%
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        fontSize: '3rem', fontWeight: 800,
                                                        background: 'rgba(255,255,255,0.1)',
                                                        borderRadius: '16px',
                                                        padding: '0.5rem 1.5rem'
                                                    }}>
                                                        {termAvg >= 90 ? 'A' : termAvg >= 80 ? 'B' : termAvg >= 70 ? 'C' : 'D'}
                                                    </div>
                                                </div>

                                                {/* Subject cards */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                    gap: '1.25rem'
                                                }}>
                                                    {termResults.map((result, idx) => (
                                                        <div key={idx} style={{
                                                            ...cardStyle,
                                                            position: 'relative',
                                                            overflow: 'hidden'
                                                        }}>
                                                            <div style={{
                                                                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                                                                background: getGradeColor(result.percentage)
                                                            }} />
                                                            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                                                <h3 style={{ fontWeight: 700, color: '#1e293b' }}>{result.subject}</h3>
                                                                <span style={{
                                                                    background: getGradeColor(result.percentage) + '1a',
                                                                    color: getGradeColor(result.percentage),
                                                                    padding: '0.2rem 0.7rem',
                                                                    borderRadius: '999px',
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: 700
                                                                }}>{result.grade}</span>
                                                            </div>
                                                            <div style={{
                                                                fontSize: '2rem', fontWeight: 800,
                                                                color: getGradeColor(result.percentage), marginBottom: '0.5rem'
                                                            }}>
                                                                {result.percentage}%
                                                            </div>
                                                            <div style={{
                                                                height: '6px', background: '#f1f5f9',
                                                                borderRadius: '999px', overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${result.percentage}%`,
                                                                    height: '100%',
                                                                    borderRadius: '999px',
                                                                    background: getGradeColor(result.percentage),
                                                                    transition: 'width 0.8s ease-out'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            ) : (
                                <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    No previous results available.
                                </div>
                            )}
                        </div>
                    )
                    }

                    {/* ════════════════ FEE STATUS TAB ════════════════ */}
                    {
                        activeTab === 'fees' && (() => {
                            const feeHistory = liveStudent.feeHistory || [];
                            const unpaidMonths = feeHistory.filter(h => h.status === 'unpaid');
                            const paidMonths = feeHistory.filter(h => h.status === 'paid');

                            return (
                                <div className="animate-fade-in">
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                                        Fee History
                                    </h2>
                                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Your month-by-month fee payment records</p>

                                    {/* Summary banner */}
                                    {unpaidMonths.length > 0 ? (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                            border: '1px solid #fca5a5',
                                            borderRadius: '14px',
                                            padding: '1.25rem 1.5rem',
                                            marginBottom: '1.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            flexWrap: 'wrap'
                                        }}>
                                            <XCircle size={32} style={{ color: '#dc2626', flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>
                                                    ⚠ {unpaidMonths.length} Month{unpaidMonths.length > 1 ? 's' : ''} Overdue
                                                </div>
                                                <div style={{ color: '#9f1239', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                                    Please contact the school office to clear your dues: {unpaidMonths.map(h => h.month).join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    ) : feeHistory.length > 0 ? (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                            border: '1px solid #86efac',
                                            borderRadius: '14px',
                                            padding: '1.25rem 1.5rem',
                                            marginBottom: '1.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem'
                                        }}>
                                            <CheckCircle size={32} style={{ color: '#16a34a', flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.1rem' }}>All Fees Cleared!</div>
                                                <div style={{ color: '#166534', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                                    All {paidMonths.length} month{paidMonths.length > 1 ? 's' : ''} paid. Thank you!
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Stats */}
                                    {feeHistory.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            {[
                                                { label: 'Total Months', val: feeHistory.length, color: '#2563eb', bg: '#eff6ff' },
                                                { label: 'Paid', val: paidMonths.length, color: '#16a34a', bg: '#f0fdf4' },
                                                { label: 'Unpaid / Dues', val: unpaidMonths.length, color: '#dc2626', bg: '#fef2f2' },
                                            ].map(s => (
                                                <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '0.85rem', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.1rem' }}>{s.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Month cards */}
                                    {feeHistory.length === 0 ? (
                                        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                            <DollarSign size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                                            <p style={{ fontWeight: 600 }}>No fee records yet.</p>
                                            <p style={{ fontSize: '0.85rem' }}>Your monthly fee history will appear here once the school opens fee months.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                            {[...feeHistory].reverse().map(h => (
                                                <div key={h.month} style={{
                                                    ...cardStyle,
                                                    border: `1.5px solid ${h.status === 'paid' ? '#86efac' : '#fca5a5'}`,
                                                    background: h.status === 'paid' ? '#f0fdf4' : '#fef2f2',
                                                    padding: '1.25rem'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{h.month}</div>
                                                        <span style={{
                                                            padding: '0.2rem 0.6rem',
                                                            borderRadius: '999px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 800,
                                                            background: h.status === 'paid' ? '#dcfce7' : '#fee2e2',
                                                            color: h.status === 'paid' ? '#16a34a' : '#dc2626'
                                                        }}>
                                                            {h.status === 'paid' ? '✓ PAID' : '✗ UNPAID'}
                                                        </span>
                                                    </div>
                                                    {h.status === 'paid' && h.paidOn ? (
                                                        <div style={{ fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <CheckCircle size={12} /> Paid on {h.paidOn}
                                                        </div>
                                                    ) : h.status === 'unpaid' ? (
                                                        <div style={{ fontSize: '0.8rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <XCircle size={12} /> Contact school office
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    }

                    {/* ════════════════ PROFILE TAB ════════════════ */}
                    {
                        activeTab === 'profile' && (() => {
                            const adm = liveStudent.admissions?.[0] || {};
                            const DataRow = ({ label, value }) => (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{value || '—'}</span>
                                </div>
                            );

                            return (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {/* Header Banner */}
                                    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white', display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
                                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f8fafc', border: '4px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                            {(liveStudent.photo || liveStudent.image) ? (
                                                <img src={liveStudent.photo || liveStudent.image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '3rem', fontWeight: 800, color: '#3b82f6' }}>{liveStudent.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{liveStudent.name}</h2>
                                            <div style={{ fontSize: '1rem', opacity: 0.9, marginTop: '0.2rem' }}>Class: {liveStudent.grade} | ID: {liveStudent.id}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                        {/* Personal Details */}
                                        <div style={cardStyle}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                                                <User size={18} /> Personal Details
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                <DataRow label="Gender" value={adm.gender} />
                                                <DataRow label="Date of Birth" value={adm.dob} />
                                                <DataRow label="B-Form Number" value={adm.bForm} />
                                                <DataRow label="Nationality" value={adm.nationality} />
                                                <DataRow label="Religion" value={adm.religion} />
                                                <DataRow label="Admitted On" value={adm.admissionDate || '—'} />
                                            </div>
                                        </div>

                                        {/* Father / Guardian Info */}
                                        <div style={cardStyle}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                                                <Users size={18} /> Parent Information
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <DataRow label="Father's Name" value={adm.fatherName} />
                                                </div>
                                                <DataRow label="Father's CNIC" value={adm.fatherCnic} />
                                                <DataRow label="Contact Number" value={adm.contact} />
                                                <DataRow label="WhatsApp" value={adm.whatsapp} />
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <DataRow label="Home Address" value={adm.address} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Health & Medical */}
                                        <div style={cardStyle}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                                                <Award size={18} /> Health & Medical
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Allergies</div>
                                                    {adm.allergies === 'Yes' ? (
                                                        <div style={{ color: '#dc2626', fontWeight: 600 }}>Yes: {adm.allergiesDetails || 'Details not provided'}</div>
                                                    ) : <div style={{ color: '#16a34a', fontWeight: 600 }}>None</div>}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Chronic Medical Conditions</div>
                                                    {adm.chronicCondition === 'Yes' ? (
                                                        <div style={{ color: '#dc2626', fontWeight: 600 }}>Yes: {adm.chronicConditionDetails || 'Details not provided'}</div>
                                                    ) : <div style={{ color: '#16a34a', fontWeight: 600 }}>None</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '1rem' }}>
                                        To update any of these details, please contact the school administration office.
                                    </div>
                                </div>
                            );
                        })()
                    }
                </div >
            </main >
        </div >
    );
};

export default StudentPortal;
