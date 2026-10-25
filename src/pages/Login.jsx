import React, { useState } from 'react';
import { User, Lock, AlertCircle, GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { developerCredentials } from '../data/schoolData';
import { useSchoolData } from '../context/SchoolDataContext';

const Login = ({ setIsLoggedIn, setIsAdmin, setIsDeveloper, setCurrentPage, setLoggedInStudent }) => {
    const { schoolData, adminCredentials } = useSchoolData();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const authenticate = (rawUser, rawPass) => {
        setError('');
        const cleanUsername = (rawUser || '').trim();
        const cleanPassword = (rawPass || '').trim();

        // 1. Check Developer
        if (cleanUsername === developerCredentials.username && cleanPassword === developerCredentials.password) {
            setIsDeveloper(true);
            setCurrentPage('developer');
            return;
        }

        // 2. Check Admin (from database or default fallback)
        const adminUser = adminCredentials?.username || 'admin';
        const adminPass = adminCredentials?.password || 'admin123';
        if (cleanUsername === adminUser && cleanPassword === adminPass) {
            setIsAdmin(true);
            setCurrentPage('admin');
            return;
        }

        // 3. Check Student (match by student ID, serial_number, or serialNumber)
        const student = (schoolData.students || []).find((s) => {
            const idMatch = s.id === cleanUsername;
            const serialMatch =
                String(s.serial_number ?? '') === cleanUsername ||
                String(s.serialNumber ?? '') === cleanUsername;
            const passMatch = s.password === cleanPassword;
            return (idMatch || serialMatch) && passMatch;
        });
        if (student) {
            setIsLoggedIn(true);
            setLoggedInStudent(student);
            setCurrentPage('portal');
            return;
        }

        setError('Invalid credentials. Please verify your ID and password.');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        authenticate(credentials.username, credentials.password);
    };

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError('');
    };

    const handleQuickDemoLogin = (role) => {
        if (role === 'admin') {
            const u = adminCredentials?.username || 'admin';
            const p = adminCredentials?.password || 'admin123';
            setCredentials({ username: u, password: p });
            authenticate(u, p);
        } else if (role === 'student') {
            const demoStu = (schoolData.students || []).find((s) => s.id === 'STU001') || (schoolData.students || [])[0];
            const u = demoStu ? demoStu.id : 'STU001';
            const p = demoStu ? demoStu.password : 'password123';
            setCredentials({ username: u, password: p });
            authenticate(u, p);
        } else if (role === 'developer') {
            setCredentials({ username: developerCredentials.username, password: developerCredentials.password });
            authenticate(developerCredentials.username, developerCredentials.password);
        }
    };

    return (
        <div
            style={{
                minHeight: 'calc(100vh - 72px)',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1rem'
            }}
        >
            <div
                className="animate-fade-in"
                style={{
                    width: '100%',
                    maxWidth: '880px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    overflow: 'hidden'
                }}
            >
                {/* Left Column: Institutional Context */}
                <div
                    style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '2.5rem 2.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.75rem' }}>
                            <div
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <GraduationCap size={18} color="#f8fafc" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                                    ACS School &amp; College
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Painsra • Faisalabad
                                </div>
                            </div>
                        </div>

                        <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                            Institutional ERP, Data Warehouse &amp; Student Portal
                        </h2>
                        <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                            Authorized portal for school administration, BI &amp; OLAP analytics, faculty gradebook management, and student academic records.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                <CheckCircle2 size={15} color="#10b981" />
                                <span>3-Tier Data Warehouse (Bronze, Data Vault 2.0, Star Schema)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                <CheckCircle2 size={15} color="#10b981" />
                                <span>Multidimensional OLAP Cube &amp; Groq AI Analyst</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                <CheckCircle2 size={15} color="#10b981" />
                                <span>Student Gradebook, Attendance &amp; Fee Challan Ledger</span>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            marginTop: '2rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #1e293b',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}
                    >
                        <span>Neon PostgreSQL Connected</span>
                        <span>Session 2025–2026</span>
                    </div>
                </div>

                {/* Right Column: Sign-In Form */}
                <div style={{ padding: '2.5rem 2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                            Sign in to your account
                        </h1>
                        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                            Enter your staff username or student registration ID
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                                Username or Student ID
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User
                                    size={16}
                                    style={{
                                        position: 'absolute',
                                        left: '0.85rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#94a3b8'
                                    }}
                                />
                                <input
                                    type="text"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    className="dw-input"
                                    style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.4rem', fontSize: '0.88rem' }}
                                    required
                                    placeholder="admin or STU001"
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    size={16}
                                    style={{
                                        position: 'absolute',
                                        left: '0.85rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#94a3b8'
                                    }}
                                />
                                <input
                                    type="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className="dw-input"
                                    style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.4rem', fontSize: '0.88rem' }}
                                    required
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div
                                style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '7px',
                                    padding: '0.65rem 0.85rem',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    gap: '0.5rem',
                                    alignItems: 'center',
                                    color: '#dc2626',
                                    fontSize: '0.82rem',
                                    fontWeight: 500
                                }}
                            >
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="dw-btn dw-btn-primary"
                            style={{
                                width: '100%',
                                padding: '0.7rem 1rem',
                                fontSize: '0.88rem'
                            }}
                        >
                            <span>Sign In</span>
                            <ArrowRight size={15} />
                        </button>
                    </form>

                    {/* Clean Demo Role Switcher */}
                    <div
                        style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.25rem',
                            borderTop: '1px solid #e2e8f0'
                        }}
                    >
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.55rem' }}>
                            Quick Evaluation Sign-In:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.45rem' }}>
                            <button
                                type="button"
                                onClick={() => handleQuickDemoLogin('admin')}
                                className="dw-btn-mini"
                                style={{ padding: '0.48rem 0.5rem', textAlign: 'center' }}
                            >
                                Admin &amp; BI
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickDemoLogin('student')}
                                className="dw-btn-mini"
                                style={{ padding: '0.48rem 0.5rem', textAlign: 'center' }}
                            >
                                Student (STU001)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickDemoLogin('developer')}
                                className="dw-btn-mini"
                                style={{ padding: '0.48rem 0.5rem', textAlign: 'center' }}
                            >
                                System Console
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
