import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, Users, User, FileText, ChevronRight, ChevronLeft, ChevronDown, Filter, LayoutGrid, Check, MessageSquare, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getBaseClass, getStudentFullClassLabel } from '../utils/gradeUtils';

const ReportsTab = ({
    students,
    CLASSES,
    TERMS,
    SECTIONS,
    selectedClasses, setSelectedClasses,
    reportTerm, setReportTerm,
    reportGender, setReportGender,
    reportStatus, setReportStatus,
    reportSearch, setReportSearch,
    downloadStudentReport,
    printBulkReports,
    saveRemark
}) => {
    const [expandedSections, setExpandedSections] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [editingRemarks, setEditingRemarks] = useState({}); // { studentId: 'remark text' }

    const toggleSectionExpand = (sectionName) => {
        setExpandedSections(prev =>
            prev.includes(sectionName)
                ? prev.filter(s => s !== sectionName)
                : [...prev, sectionName]
        );
    };

    const handleSectionCheckbox = (section) => {
        const sectionClasses = section.classes || [];
        const allSelected = sectionClasses.every(c => selectedClasses.includes(c));

        if (allSelected) {
            setSelectedClasses(prev => prev.filter(c => !sectionClasses.includes(c)));
        } else {
            setSelectedClasses(prev => Array.from(new Set([...prev, ...sectionClasses])));
        }
    };

    const handleClassCheckbox = (className) => {
        setSelectedClasses(prev =>
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };

    const isSectionChecked = (section) => {
        const sClasses = section.classes || [];
        if (sClasses.length === 0) return false;
        return sClasses.every(c => selectedClasses.some(sc => getBaseClass(sc) === getBaseClass(c)));
    };

    const isSectionIndeterminate = (section) => {
        const sClasses = section.classes || [];
        const selectedCount = sClasses.filter(c => selectedClasses.some(sc => getBaseClass(sc) === getBaseClass(c))).length;
        return selectedCount > 0 && selectedCount < sClasses.length;
    };

    // Filtering Logic
    const filteredStudents = (students || []).filter(s => {
        const matchesClass = selectedClasses.length === 0 || selectedClasses.some(c => getBaseClass(c) === getBaseClass(s.grade));
        const matchesGender = reportGender === 'all' || s.gender === reportGender;
        const matchesStatus = (s.status || 'active') === 'active';
        const matchesSearch = !reportSearch ||
            s.name?.toLowerCase().includes(reportSearch.toLowerCase()) ||
            s.id?.toLowerCase().includes(reportSearch.toLowerCase());
        return matchesClass && matchesGender && matchesStatus && matchesSearch;
    });

    const studentCount = filteredStudents.length;

    // Get terms aggregated for all selected classes (or all classes if none selected)
    const availableTerms = useMemo(() => {
        const termSet = new Set();
        const targetClasses = selectedClasses.length > 0 ? selectedClasses : (CLASSES || []);
        
        targetClasses.forEach(cls => {
            const base = getBaseClass(cls) || cls;
            const classTerms = (TERMS && !Array.isArray(TERMS))
                ? (TERMS[cls] || TERMS[base] || [])
                : (Array.isArray(TERMS) ? TERMS : []);
            (classTerms || []).forEach(t => { if (t && typeof t === 'string') termSet.add(t.trim()); });
        });

        // Also recover any term present on the students currently visible
        (filteredStudents || []).forEach(s => {
            (s.results || []).forEach(r => { if (r.term && typeof r.term === 'string') termSet.add(r.term.trim()); });
            (s.previous_results || s.previousResults || []).forEach(pr => { if (pr.term && typeof pr.term === 'string') termSet.add(pr.term.trim()); });
        });

        return Array.from(termSet);
    }, [TERMS, selectedClasses, CLASSES, filteredStudents]);

    const hasStudentTermResults = (student, term) => {
        if (!student) return false;
        if (!term || term === 'All Terms') {
            return ((student.results || []).length > 0 || (student.previous_results || student.previousResults || []).length > 0);
        }
        const cleanT = term.trim().toLowerCase();
        const inCurrent = (student.results || []).some(r => (r.term || 'Current').trim().toLowerCase() === cleanT);
        const inPrev = (student.previous_results || student.previousResults || []).some(pr => (pr.term || '').trim().toLowerCase() === cleanT);
        return inCurrent || inPrev;
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: '600px', background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>

            {/* Left Sidebar - Class Selection */}
            <div style={{
                width: isSidebarOpen ? '270px' : '0px',
                flexShrink: 0,
                background: '#f8fafc',
                borderRight: isSidebarOpen ? '1px solid #e2e8f0' : 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                {/* Header + Search */}
                <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid #e2e8f0', minWidth: '270px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <LayoutGrid size={14} color="#2563eb" /> Select Classes
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={sidebarSearch}
                            onChange={e => {
                                setSidebarSearch(e.target.value);
                                if (e.target.value) setExpandedSections((SECTIONS || []).map(s => s.name));
                                else setExpandedSections([]);
                            }}
                            style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 1.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', background: 'white', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Sections Tree */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem', minWidth: '270px' }}>
                    {(SECTIONS || []).filter(section => {
                        if (!sidebarSearch) return true;
                        const q = sidebarSearch.toLowerCase();
                        if (section.name.toLowerCase().includes(q)) return true;
                        if ((section.classes || []).some(c => c.toLowerCase().includes(q))) return true;
                        return false;
                    }).map(section => {
                        const expanded = expandedSections.includes(section.name);
                        const checked = isSectionChecked(section);
                        const indeterminate = isSectionIndeterminate(section);

                        return (
                            <div key={section.name} style={{ marginBottom: '0.25rem' }}>
                                {/* Section Row */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 0.6rem', borderRadius: '8px',
                                    background: checked ? '#eff6ff' : indeterminate ? '#f0f9ff' : 'transparent',
                                    cursor: 'pointer', transition: 'all 0.15s'
                                }}>
                                    <button
                                        onClick={() => toggleSectionExpand(section.name)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', color: '#64748b', flexShrink: 0 }}
                                    >
                                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }} onClick={() => handleSectionCheckbox(section)}>
                                        <div style={{
                                            width: '16px', height: '16px', border: '2px solid',
                                            borderColor: checked || indeterminate ? '#2563eb' : '#cbd5e1',
                                            borderRadius: '3px',
                                            background: checked ? '#2563eb' : (indeterminate ? '#93c5fd' : 'white'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, transition: 'all 0.15s'
                                        }}>
                                            {checked && <Check size={10} color="white" strokeWidth={3.5} />}
                                            {indeterminate && <div style={{ width: '7px', height: '2px', background: 'white', borderRadius: '1px' }} />}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: checked ? '#1e40af' : '#334155', userSelect: 'none' }}>
                                            {section.name}
                                        </span>
                                    </div>
                                </div>

                                {/* Classes under section */}
                                {expanded && (
                                    <div style={{ marginLeft: '1.6rem', marginTop: '0.15rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                                        {(section.classes || []).map(className => {
                                            const isChecked = selectedClasses.includes(className);
                                            return (
                                                <div
                                                    key={className}
                                                    onClick={() => handleClassCheckbox(className)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        padding: '0.35rem 0.5rem', borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        background: isChecked ? '#eff6ff' : 'transparent',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '14px', height: '14px', border: '2px solid',
                                                        borderColor: isChecked ? '#2563eb' : '#d1d5db',
                                                        borderRadius: '3px',
                                                        background: isChecked ? '#2563eb' : 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {isChecked && <Check size={9} color="white" strokeWidth={3.5} />}
                                                    </div>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isChecked ? '#2563eb' : '#475569', userSelect: 'none' }}>
                                                        {className}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sidebar Toggle Tab — glued to right edge of sidebar */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title={isSidebarOpen ? 'Collapse class panel' : 'Expand class panel'}
                style={{
                    position: 'absolute',
                    left: isSidebarOpen ? '270px' : '0px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 20,
                    width: '18px',
                    height: '56px',
                    borderRadius: '0 6px 6px 0',
                    background: '#2563eb',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '2px 0 8px rgba(37,99,235,0.18)',
                    color: 'white'
                }}
            >
                {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto', padding: '1.5rem', background: 'white' }}>

                {/* Top Controls Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Report Cards</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                            {selectedClasses.length === 0 ? 'All Classes' : `${selectedClasses.length} class(es) selected`} • {studentCount} students
                        </p>
                    </div>

                    <button
                        onClick={() => printBulkReports(filteredStudents, reportTerm)}
                        disabled={studentCount === 0}
                        className="btn hover-scale"
                        style={{
                            background: '#1a3a6b',
                            color: 'white',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(26, 58, 107, 0.2)',
                            opacity: studentCount === 0 ? 0.6 : 1,
                            cursor: studentCount === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Printer size={18} /> Print Bulk Reports
                    </button>
                </div>

                {/* Filters Row */}
                <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', background: 'white' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                        {/* Search */}
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Quick Search</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Name or ID..."
                                    className="form-input"
                                    style={{ padding: '0 0.85rem 0 2.5rem', borderRadius: '10px', height: '42px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', background: '#f8fafc', boxSizing: 'border-box' }}
                                    value={reportSearch}
                                    onChange={e => setReportSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Term Select */}
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Select Term</label>
                            <select
                                className="form-input"
                                style={{ padding: '0 1.75rem 0 0.85rem', borderRadius: '10px', height: '42px', border: '1.5px solid #e2e8f0', fontWeight: 700, fontSize: '0.88rem', width: '100%', textOverflow: 'ellipsis', background: '#f8fafc', color: '#1e293b', boxSizing: 'border-box' }}
                                value={reportTerm}
                                onChange={e => setReportTerm(e.target.value)}
                            >
                                <option value="All Terms">All Terms Summary</option>
                                {availableTerms.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>


                        {/* Gender Toggle */}
                        <div style={{ flex: '0 0 auto' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Gender</label>
                            <div style={{ display: 'flex', background: '#f8fafc', padding: '0.2rem', borderRadius: '10px', border: '1.5px solid #f1f5f9' }}>
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'Male', label: 'Boys' },
                                    { id: 'Female', label: 'Girls' }
                                ].map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setReportGender(g.id)}
                                        style={{
                                            flex: 1, padding: '0.4rem 0.5rem', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                            background: reportGender === g.id ? 'white' : 'transparent',
                                            color: reportGender === g.id ? '#2563eb' : '#64748b',
                                            boxShadow: reportGender === g.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Students List */}
                <div style={{ flex: 1, background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Student Info</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Class & ID</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', minWidth: '200px' }}>Remarks</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                            <div style={{ marginBottom: '1rem' }}><Users size={48} opacity={0.2} style={{ margin: '0 auto' }} /></div>
                                            <p style={{ fontWeight: 600 }}>No students found matching your criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((s, idx) => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fcfcfd' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{
                                                        width: '45px', height: '45px', borderRadius: '12px', background: s.gender === 'Female' ? '#fdf2f8' : '#eff6ff',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.gender === 'Female' ? '#db2777' : '#2563eb',
                                                        fontWeight: 800, fontSize: '1.1rem', overflow: 'hidden'
                                                    }}>
                                                        {s.photo ? <img src={s.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : s.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{s.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                                                            <Users size={12} /> {s.fatherName || 'Guardian Info N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, width: 'fit-content' }}>
                                                        {getStudentFullClassLabel(s)}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginLeft: '0.2rem' }}>{s.id}</span>
                                                </div>
                                            </td>
                                            {/* Remarks Column */}
                                            <td style={{ padding: '0.75rem 1rem', minWidth: '200px' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Write remark..."
                                                        value={editingRemarks[s.id] !== undefined ? editingRemarks[s.id] : (s.remarks || '')}
                                                        onChange={e => setEditingRemarks(prev => ({ ...prev, [s.id]: e.target.value }))}
                                                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: 1.4 }}
                                                    />
                                                    {editingRemarks[s.id] !== undefined && (
                                                        <button
                                                            onClick={async () => {
                                                                await saveRemark(s.id, editingRemarks[s.id]);
                                                                setEditingRemarks(prev => { const n = { ...prev }; delete n[s.id]; return n; });
                                                            }}
                                                            title="Save Remark"
                                                            style={{ background: '#2563eb', border: 'none', color: 'white', borderRadius: '6px', padding: '0.35rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: '2px' }}
                                                        >
                                                            <Save size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                {hasStudentTermResults(s, reportTerm) ? (
                                                    <button
                                                        onClick={() => downloadStudentReport(s.id, reportTerm)}
                                                        className="btn hover-scale"
                                                        style={{
                                                            background: 'white', border: '1.5px solid #1a3a6b', color: '#1a3a6b',
                                                            padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700,
                                                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
                                                        }}
                                                    >
                                                        <FileText size={16} /> Print Report
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <AlertCircle size={13} color="#94a3b8" /> No Marks in Term
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsTab;
