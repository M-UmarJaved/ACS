import React, { useState } from 'react';
import {
    Settings, Edit3, Save, LogOut, BookOpen,
    Users, Building, Info, PlusCircle, Trash2,
    BarChart3, GraduationCap, DollarSign, CheckCircle,
    XCircle, X, School, Search
} from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const DeveloperPanel = ({ setIsDeveloper, setCurrentPage }) => {
    const { schoolData, updateSchoolInfo, setFaculty: setContextFaculty, setFacilities: setContextFacilities } = useSchoolData();

    const [activeSection, setActiveSection] = useState('dashboard');
    const [isEditing, setIsEditing] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [dashboardSearch, setDashboardSearch] = useState('');

    // School info state - initialized from context
    const [schoolInfo, setSchoolInfo] = useState({
        name: schoolData.name || 'ACS School & College',
        tagline: schoolData.tagline || 'Ready to Lead. Ready to Inspire.',
        description: schoolData.description || 'A world-class education that empowers students to reach their full potential.',
        phone: schoolData.contact?.phone || '0300 1333275',
        email: schoolData.contact?.email || 'Infoacspainsra@gmail.com',
        address: schoolData.contact?.address || 'ACS School & College, Jhang Road Painsra, Pakistan',
        mission: schoolData.about?.mission || '',
        vision: schoolData.about?.vision || ''
    });

    // Faculty & Facilities use context data directly
    const [editingFacultyId, setEditingFacultyId] = useState(null);
    const faculty = schoolData.faculty || [];
    const facilities = schoolData.facilities || [];

    // Students overview (from context)
    const students = schoolData.students || [];

    const handleLogout = () => {
        setIsDeveloper(false);
        setCurrentPage('home');
    };

    const showSave = (msg) => {
        setSaveMessage(msg);
        setTimeout(() => setSaveMessage(''), 3000);
    };

    // Card style
    const cardStyle = {
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.05)'
    };

    const inputStyle = {
        width: '100%',
        padding: '0.7rem 1rem',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        background: '#f8fafc'
    };

    const labelStyle = {
        display: 'block',
        fontWeight: 600,
        fontSize: '0.85rem',
        color: '#475569',
        marginBottom: '0.4rem'
    };

    // ─── Dashboard Stats ───
    const totalStudents = students.length;
    const paidFees = students.filter(s => s.feeStatus === 'paid' || (s.feeHistory || []).some(h => h.status === 'paid')).length;
    const unpaidFees = students.filter(s => s.feeStatus === 'unpaid' || (s.feeHistory || []).some(h => h.status === 'unpaid')).length;
    const avgAttendance = totalStudents > 0
        ? (students.reduce((sum, s) => sum + (s.attendance?.percentage || 0), 0) / totalStudents).toFixed(1)
        : 0;
    const avgGrade = totalStudents > 0
        ? (students.reduce((sum, s) => {
            const res = s.results || [];
            const studentAvg = res.length > 0 ? (res.reduce((rs, r) => rs + (r.percentage || 0), 0) / res.length) : 0;
            return sum + studentAvg;
        }, 0) / totalStudents).toFixed(1)
        : 0;

    return (
        <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
            {/* Header */}
            <section style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)',
                color: 'white',
                padding: '3rem 0 2.5rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: '-50px', right: '-50px',
                    width: '180px', height: '180px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-30px', left: '15%',
                    width: '120px', height: '120px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)'
                }} />
                <div className="container">
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '14px',
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backdropFilter: 'blur(4px)'
                            }}>
                                <Settings size={28} />
                            </div>
                            <div>
                                <h1 style={{
                                    fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
                                    fontWeight: 800,
                                    marginBottom: '0.2rem',
                                    letterSpacing: '-0.02em'
                                }}>
                                    Developer Dashboard
                                </h1>
                                <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>Manage school data, faculty, and facilities</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="btn"
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                color: 'white',
                                border: '2px solid rgba(255,255,255,0.35)',
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>
            </section>

            {/* Success toast */}
            {saveMessage && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem',
                    background: '#10b981', color: 'white',
                    padding: '0.8rem 1.5rem', borderRadius: '12px',
                    fontWeight: 600, fontSize: '0.9rem',
                    boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                    zIndex: 999, display: 'flex', alignItems: 'center', gap: '0.5rem',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <CheckCircle size={18} /> {saveMessage}
                </div>
            )}

            <section className="section">
                <div className="container">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '240px 1fr',
                        gap: '2rem',
                        alignItems: 'start'
                    }}>
                        {/* Sidebar */}
                        <div style={{ ...cardStyle, position: 'sticky', top: '100px' }}>
                            <h3 style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                marginBottom: '0.75rem',
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Navigation
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {[
                                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                                    { id: 'info', label: 'School Info', icon: School },
                                    { id: 'faculty', label: 'Faculty', icon: Users },
                                    { id: 'facilities', label: 'Facilities', icon: Building },
                                    { id: 'students', label: 'Students', icon: GraduationCap },
                                    { id: 'content', label: 'Content', icon: BookOpen }
                                ].map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => { setActiveSection(section.id); setIsEditing(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.65rem',
                                            width: '100%',
                                            padding: '0.7rem 0.9rem',
                                            textAlign: 'left',
                                            fontWeight: activeSection === section.id ? 700 : 500,
                                            fontSize: '0.9rem',
                                            color: activeSection === section.id ? '#2563eb' : '#64748b',
                                            background: activeSection === section.id ? '#eff6ff' : 'transparent',
                                            borderRadius: '10px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <section.icon size={18} />
                                        {section.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div>

                            {/* ════════ DASHBOARD ════════ */}
                            {activeSection === 'dashboard' && (
                                <div className="animate-fade-in">
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>
                                        📊 Overview
                                    </h2>

                                    {/* Stat cards */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '1.25rem',
                                        marginBottom: '2rem'
                                    }}>
                                        {[
                                            { label: 'Total Students', value: totalStudents, color: '#2563eb', bg: 'linear-gradient(135deg,#2563eb,#3b82f6)', icon: GraduationCap },
                                            { label: 'Faculty Members', value: faculty.length, color: '#7c3aed', bg: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', icon: Users },
                                            { label: 'Avg Attendance', value: `${avgAttendance}%`, color: '#059669', bg: 'linear-gradient(135deg,#059669,#10b981)', icon: CheckCircle },
                                            { label: 'Avg Grade', value: `${avgGrade}%`, color: '#d97706', bg: 'linear-gradient(135deg,#d97706,#f59e0b)', icon: BarChart3 },
                                            { label: 'Fees Paid', value: paidFees, color: '#10b981', bg: 'linear-gradient(135deg,#10b981,#34d399)', icon: DollarSign },
                                            { label: 'Fees Unpaid', value: unpaidFees, color: '#ef4444', bg: 'linear-gradient(135deg,#ef4444,#f87171)', icon: XCircle }
                                        ].map((stat, idx) => (
                                            <div key={idx} style={{
                                                ...cardStyle, background: stat.bg,
                                                color: 'white', border: 'none'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
                                                        <div style={{ opacity: 0.9, marginTop: '0.35rem', fontSize: '0.85rem' }}>{stat.label}</div>
                                                    </div>
                                                    <stat.icon size={28} style={{ opacity: 0.6 }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Students list */}
                                    <div style={cardStyle}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                            <h3 style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>👥 Registered Students</h3>
                                            <div style={{ position: 'relative', minWidth: '260px' }}>
                                                <Search size={18} style={{
                                                    position: 'absolute', left: '14px', top: '50%',
                                                    transform: 'translateY(-50%)', color: '#94a3b8',
                                                    pointerEvents: 'none'
                                                }} />
                                                <input
                                                    type="text"
                                                    placeholder="Search students..."
                                                    value={dashboardSearch}
                                                    onChange={(e) => setDashboardSearch(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.65rem 1rem 0.65rem 2.6rem',
                                                        borderRadius: '10px',
                                                        border: '2px solid #e2e8f0',
                                                        fontSize: '0.9rem',
                                                        outline: 'none',
                                                        background: '#f8fafc',
                                                        transition: 'border-color 0.2s, box-shadow 0.2s'
                                                    }}
                                                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.target.style.background = 'white'; }}
                                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        {['Name', 'ID', 'Grade', 'Avg %', 'Attendance', 'Fee Status'].map(h => (
                                                            <th key={h} style={{
                                                                padding: '0.8rem 1rem', textAlign: 'left',
                                                                fontWeight: 700, fontSize: '0.8rem',
                                                                color: '#64748b', textTransform: 'uppercase',
                                                                letterSpacing: '0.04em'
                                                            }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {students.filter(s => {
                                                        if (!dashboardSearch.trim()) return true;
                                                        const q = dashboardSearch.toLowerCase();
                                                        return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.grade.toLowerCase().includes(q);
                                                    }).map((s) => {
                                                        const sAvg = (s.results.reduce((sum, r) => sum + r.percentage, 0) / s.results.length).toFixed(1);
                                                        return (
                                                            <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '0.8rem 1rem', fontWeight: 600, color: '#1e293b' }}>{s.name}</td>
                                                                <td style={{ padding: '0.8rem 1rem', color: '#64748b', fontSize: '0.9rem' }}>{s.id}</td>
                                                                <td style={{ padding: '0.8rem 1rem', color: '#64748b' }}>{s.grade}</td>
                                                                <td style={{ padding: '0.8rem 1rem' }}>
                                                                    <span style={{
                                                                        fontWeight: 700,
                                                                        color: sAvg >= 85 ? '#10b981' : sAvg >= 70 ? '#f59e0b' : '#ef4444'
                                                                    }}>{sAvg}%</span>
                                                                </td>
                                                                <td style={{ padding: '0.8rem 1rem' }}>
                                                                    <span style={{
                                                                        fontWeight: 700,
                                                                        color: s.attendance.percentage >= 95 ? '#10b981' : s.attendance.percentage >= 85 ? '#3b82f6' : '#ef4444'
                                                                    }}>{s.attendance.percentage}%</span>
                                                                </td>
                                                                <td style={{ padding: '0.8rem 1rem' }}>
                                                                    <span style={{
                                                                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                                        padding: '0.25rem 0.75rem',
                                                                        borderRadius: '999px',
                                                                        fontSize: '0.8rem', fontWeight: 700,
                                                                        background: s.feeStatus === 'paid' ? '#ecfdf5' : '#fef2f2',
                                                                        color: s.feeStatus === 'paid' ? '#059669' : '#dc2626'
                                                                    }}>
                                                                        {s.feeStatus === 'paid' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                                                                        {s.feeStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ════════ SCHOOL INFO ════════ */}
                            {activeSection === 'info' && (
                                <div className="animate-fade-in">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>🏫 School Information</h2>
                                        {!isEditing ? (
                                            <button onClick={() => setIsEditing(true)} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.6rem 1.2rem', borderRadius: '10px',
                                                background: '#2563eb', color: 'white',
                                                fontWeight: 600, fontSize: '0.9rem',
                                                border: 'none', cursor: 'pointer'
                                            }}>
                                                <Edit3 size={16} /> Edit
                                            </button>
                                        ) : (
                                            <button onClick={() => {
                                                setIsEditing(false);
                                                updateSchoolInfo({
                                                    name: schoolInfo.name,
                                                    tagline: schoolInfo.tagline,
                                                    description: schoolInfo.description,
                                                    contact: {
                                                        ...schoolData.contact,
                                                        phone: schoolInfo.phone,
                                                        email: schoolInfo.email,
                                                        address: schoolInfo.address
                                                    },
                                                    about: {
                                                        ...schoolData.about,
                                                        mission: schoolInfo.mission,
                                                        vision: schoolInfo.vision
                                                    }
                                                });
                                                showSave('School info saved!');
                                            }} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.6rem 1.2rem', borderRadius: '10px',
                                                background: '#10b981', color: 'white',
                                                fontWeight: 600, fontSize: '0.9rem',
                                                border: 'none', cursor: 'pointer'
                                            }}>
                                                <Save size={16} /> Save Changes
                                            </button>
                                        )}
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div>
                                                <label style={labelStyle}>School Name</label>
                                                <input
                                                    type="text"
                                                    value={schoolInfo.name}
                                                    onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                                                    style={{ ...inputStyle, background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Tagline</label>
                                                <input
                                                    type="text"
                                                    value={schoolInfo.tagline}
                                                    onChange={(e) => setSchoolInfo({ ...schoolInfo, tagline: e.target.value })}
                                                    style={{ ...inputStyle, background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Description</label>
                                                <textarea
                                                    value={schoolInfo.description}
                                                    onChange={(e) => setSchoolInfo({ ...schoolInfo, description: e.target.value })}
                                                    rows={3}
                                                    style={{ ...inputStyle, resize: 'vertical', background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={labelStyle}>Phone</label>
                                                    <input
                                                        type="tel"
                                                        value={schoolInfo.phone}
                                                        onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
                                                        style={{ ...inputStyle, background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                        disabled={!isEditing}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Email</label>
                                                    <input
                                                        type="email"
                                                        value={schoolInfo.email}
                                                        onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                                                        style={{ ...inputStyle, background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                        disabled={!isEditing}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Address</label>
                                                <input
                                                    type="text"
                                                    value={schoolInfo.address}
                                                    onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                                                    style={{ ...inputStyle, background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Mission Statement</label>
                                                <textarea
                                                    value={schoolInfo.mission}
                                                    onChange={(e) => setSchoolInfo({ ...schoolInfo, mission: e.target.value })}
                                                    rows={4}
                                                    style={{ ...inputStyle, resize: 'vertical', background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Vision Statement</label>
                                                <textarea
                                                    value={schoolInfo.vision}
                                                    onChange={(e) => setSchoolInfo({ ...schoolInfo, vision: e.target.value })}
                                                    rows={4}
                                                    style={{ ...inputStyle, resize: 'vertical', background: isEditing ? 'white' : '#f8fafc', borderColor: isEditing ? '#3b82f6' : '#e2e8f0' }}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ════════ FACULTY ════════ */}
                            {activeSection === 'faculty' && (
                                <div className="animate-fade-in">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>👨‍🏫 Faculty Members ({faculty.length})</h2>
                                        <button
                                            onClick={() => {
                                                const newId = Math.max(...faculty.map(f => f.id)) + 1;
                                                setContextFaculty([...faculty, {
                                                    id: newId,
                                                    name: 'New Faculty Member',
                                                    role: 'Teacher',
                                                    department: 'General',
                                                    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
                                                    bio: 'New faculty member bio'
                                                }]);
                                                setEditingFacultyId(newId);
                                                showSave('New faculty member added!');
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.6rem 1.2rem', borderRadius: '10px',
                                                background: '#10b981', color: 'white',
                                                fontWeight: 600, fontSize: '0.9rem',
                                                border: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            <PlusCircle size={16} /> Add Faculty
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {faculty.map((member) => (
                                            <div key={member.id} style={cardStyle}>
                                                {editingFacultyId === member.id ? (
                                                    // Editing mode
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                            <h3 style={{ fontWeight: 700, color: '#1e293b' }}>Editing Faculty</h3>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => { setEditingFacultyId(null); showSave('Faculty member saved!'); }}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                                        padding: '0.5rem 1rem', borderRadius: '8px',
                                                                        background: '#10b981', color: 'white',
                                                                        fontWeight: 600, fontSize: '0.85rem',
                                                                        border: 'none', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <Save size={14} /> Save
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingFacultyId(null)}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                                        padding: '0.5rem 1rem', borderRadius: '8px',
                                                                        background: '#f1f5f9', color: '#64748b',
                                                                        fontWeight: 600, fontSize: '0.85rem',
                                                                        border: 'none', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <X size={14} /> Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                            <div>
                                                                <label style={labelStyle}>Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={member.name}
                                                                    onChange={(e) => setContextFaculty(faculty.map(f => f.id === member.id ? { ...f, name: e.target.value } : f))}
                                                                    style={{ ...inputStyle, background: 'white', borderColor: '#3b82f6' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={labelStyle}>Role</label>
                                                                <input
                                                                    type="text"
                                                                    value={member.role}
                                                                    onChange={(e) => setContextFaculty(faculty.map(f => f.id === member.id ? { ...f, role: e.target.value } : f))}
                                                                    style={{ ...inputStyle, background: 'white', borderColor: '#3b82f6' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={labelStyle}>Department</label>
                                                                <input
                                                                    type="text"
                                                                    value={member.department}
                                                                    onChange={(e) => setContextFaculty(faculty.map(f => f.id === member.id ? { ...f, department: e.target.value } : f))}
                                                                    style={{ ...inputStyle, background: 'white', borderColor: '#3b82f6' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={labelStyle}>Image URL</label>
                                                                <input
                                                                    type="text"
                                                                    value={member.image}
                                                                    onChange={(e) => setContextFaculty(faculty.map(f => f.id === member.id ? { ...f, image: e.target.value } : f))}
                                                                    style={{ ...inputStyle, background: 'white', borderColor: '#3b82f6' }}
                                                                />
                                                            </div>
                                                            <div style={{ gridColumn: 'span 2' }}>
                                                                <label style={labelStyle}>Bio</label>
                                                                <input
                                                                    type="text"
                                                                    value={member.bio}
                                                                    onChange={(e) => setContextFaculty(faculty.map(f => f.id === member.id ? { ...f, bio: e.target.value } : f))}
                                                                    style={{ ...inputStyle, background: 'white', borderColor: '#3b82f6' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // View mode
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                        <img src={member.image} alt={member.name} style={{
                                                            width: '64px', height: '64px', borderRadius: '14px',
                                                            objectFit: 'cover', flexShrink: 0
                                                        }} />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>{member.name}</div>
                                                            <div style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: 600 }}>{member.role}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{member.department} • {member.bio}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                                            <button
                                                                onClick={() => setEditingFacultyId(member.id)}
                                                                style={{
                                                                    padding: '0.5rem', borderRadius: '8px',
                                                                    background: '#eff6ff', color: '#2563eb',
                                                                    border: 'none', cursor: 'pointer'
                                                                }}
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setContextFaculty(faculty.filter(f => f.id !== member.id));
                                                                    showSave('Faculty member removed');
                                                                }}
                                                                style={{
                                                                    padding: '0.5rem', borderRadius: '8px',
                                                                    background: '#fef2f2', color: '#dc2626',
                                                                    border: 'none', cursor: 'pointer'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════════ FACILITIES ════════ */}
                            {activeSection === 'facilities' && (
                                <div className="animate-fade-in">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>🏢 Facilities ({facilities.length})</h2>
                                        <button
                                            onClick={() => {
                                                const newId = Math.max(...facilities.map(f => f.id)) + 1;
                                                setContextFacilities([...facilities, {
                                                    id: newId,
                                                    name: 'New Facility',
                                                    description: 'Description here',
                                                    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=600&fit=crop',
                                                    category: 'General'
                                                }]);
                                                showSave('New facility added!');
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.6rem 1.2rem', borderRadius: '10px',
                                                background: '#10b981', color: 'white',
                                                fontWeight: 600, fontSize: '0.9rem',
                                                border: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            <PlusCircle size={16} /> Add Facility
                                        </button>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                        gap: '1.25rem'
                                    }}>
                                        {facilities.map((facility) => (
                                            <div key={facility.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                                                <img src={facility.image} alt={facility.name} style={{
                                                    width: '100%', height: '160px', objectFit: 'cover'
                                                }} />
                                                <div style={{ padding: '1.25rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                        <div>
                                                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{facility.name}</h3>
                                                            <span style={{
                                                                fontSize: '0.75rem', fontWeight: 600,
                                                                background: '#eff6ff', color: '#2563eb',
                                                                padding: '0.15rem 0.5rem', borderRadius: '999px'
                                                            }}>
                                                                {facility.category}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setContextFacilities(facilities.filter(f => f.id !== facility.id));
                                                                showSave('Facility removed');
                                                            }}
                                                            style={{
                                                                padding: '0.4rem', borderRadius: '8px',
                                                                background: '#fef2f2', color: '#dc2626',
                                                                border: 'none', cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{facility.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════════ STUDENTS ════════ */}
                            {activeSection === 'students' && (
                                <div className="animate-fade-in">
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>
                                        🎓 Student Directory ({students.length})
                                    </h2>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {students.map((s) => {
                                            const sAvg = (s.results.reduce((sum, r) => sum + r.percentage, 0) / s.results.length).toFixed(1);
                                            return (
                                                <div key={s.id} style={cardStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                                                        {/* Avatar */}
                                                        <div style={{
                                                            width: '52px', height: '52px', borderRadius: '14px',
                                                            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: 'white', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0
                                                        }}>
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: '150px' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>{s.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{s.id} • {s.grade}</div>
                                                        </div>

                                                        {/* Mini stats */}
                                                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: sAvg >= 85 ? '#10b981' : '#f59e0b' }}>{sAvg}%</div>
                                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Grade Avg</div>
                                                            </div>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.attendance.percentage >= 95 ? '#10b981' : '#3b82f6' }}>{s.attendance.percentage}%</div>
                                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Attendance</div>
                                                            </div>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                                                                    padding: '0.2rem 0.6rem', borderRadius: '999px',
                                                                    fontSize: '0.75rem', fontWeight: 700,
                                                                    background: s.feeStatus === 'paid' ? '#ecfdf5' : '#fef2f2',
                                                                    color: s.feeStatus === 'paid' ? '#059669' : '#dc2626'
                                                                }}>
                                                                    {s.feeStatus === 'paid' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                                    {s.feeStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                                                </span>
                                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>Fee Status</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Subject breakdown */}
                                                    <div style={{
                                                        display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                                                        marginTop: '1rem', paddingTop: '1rem',
                                                        borderTop: '1px solid #f1f5f9'
                                                    }}>
                                                        {s.results.map((r, ri) => (
                                                            <span key={ri} style={{
                                                                padding: '0.25rem 0.7rem',
                                                                borderRadius: '8px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                background: '#f8fafc',
                                                                color: '#475569',
                                                                border: '1px solid #e2e8f0'
                                                            }}>
                                                                {r.subject}: <strong style={{ color: r.percentage >= 85 ? '#10b981' : r.percentage >= 70 ? '#f59e0b' : '#ef4444' }}>{r.percentage}%</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ════════ CONTENT ════════ */}
                            {activeSection === 'content' && (
                                <div className="animate-fade-in">
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>
                                        📄 Website Content
                                    </h2>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* Page cards */}
                                        {[
                                            { page: 'Home Page', desc: 'Hero section, statistics, featured programs', status: 'Published', color: '#10b981' },
                                            { page: 'About Page', desc: 'Mission, vision, values, and school history', status: 'Published', color: '#10b981' },
                                            { page: 'Faculty Page', desc: 'Staff profiles, departments, and qualifications', status: 'Published', color: '#10b981' },
                                            { page: 'Facilities Page', desc: 'Campus infrastructure and resources', status: 'Published', color: '#10b981' },
                                            { page: 'Contact Page', desc: 'Contact form, address, and map', status: 'Published', color: '#10b981' },
                                            { page: 'Student Portal', desc: 'Results, attendance, and fee status for students', status: 'Active', color: '#3b82f6' },
                                            { page: 'Admin Portal', desc: 'Teacher access for marks and attendance', status: 'Restricted', color: '#f59e0b' },
                                            { page: 'Developer Panel', desc: 'Full school data management', status: 'Restricted', color: '#7c3aed' }
                                        ].map((p, idx) => (
                                            <div key={idx} style={cardStyle}>
                                                <div style={{ display: 'flex', justifySelf: 'between', alignItems: 'center' }}>
                                                    <div>
                                                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{p.page}</h3>
                                                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.2rem' }}>{p.desc}</p>
                                                    </div>
                                                    <span style={{
                                                        marginLeft: 'auto',
                                                        padding: '0.3rem 0.8rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        background: p.status === 'Published' ? '#ecfdf5' : p.status === 'Active' ? '#eff6ff' : '#fef3c7',
                                                        color: p.status === 'Published' ? '#059669' : p.status === 'Active' ? '#2563eb' : '#d97706'
                                                    }}>
                                                        {p.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DeveloperPanel;
