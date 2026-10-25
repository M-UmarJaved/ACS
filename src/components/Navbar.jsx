import React, { useState } from 'react';
import { Menu, X, ArrowRight, GraduationCap } from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const Navbar = ({ currentPage, setCurrentPage, isLoggedIn, isAdmin, isDeveloper }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { schoolData } = useSchoolData();

    const navItems = [
        { id: 'home', label: 'Overview' },
        { id: 'about', label: 'About' },
        { id: 'faculty', label: 'Faculty' },
        { id: 'facilities', label: 'Campus & Labs' },
        { id: 'blog', label: 'News & Notices' },
        { id: 'contact', label: 'Admissions & Contact' }
    ];

    const portalLabel = isLoggedIn
        ? 'Student Portal'
        : isAdmin
        ? 'Admin Workspace'
        : isDeveloper
        ? 'System Console'
        : 'Portal Sign In';

    const handlePortalClick = () => {
        setCurrentPage(isLoggedIn ? 'portal' : isAdmin ? 'admin' : isDeveloper ? 'developer' : 'login');
    };

    return (
        <nav
            style={{
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderBottom: '1px solid #e2e8f0',
                color: '#0f172a',
                position: 'sticky',
                top: 0,
                zIndex: 1000
            }}
        >
            <div
                className="container"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    height: '72px'
                }}
            >
                {/* Institutional Brand Identity */}
                <div
                    onClick={() => setCurrentPage('home')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                >
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: '#0f172a',
                            border: '1px solid #1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}
                    >
                        <img
                            src="/logo.png"
                            alt="ACS Crest"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                }
                            }}
                        />
                        <div
                            style={{
                                display: 'none',
                                width: '100%',
                                height: '100%',
                                background: '#0f172a',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <GraduationCap size={20} color="#ffffff" />
                        </div>
                    </div>
                    <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontSize: '1.02rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
                            {schoolData?.name || 'ACS School & College'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            Jhang Road, Painsra • Faisalabad
                        </div>
                    </div>
                </div>

                {/* Desktop Links & Portal CTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div className="hidden md:flex" style={{ gap: '0.25rem', alignItems: 'center' }}>
                        {navItems.map((item) => {
                            const active = currentPage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentPage(item.id)}
                                    style={{
                                        color: active ? '#0f172a' : '#475569',
                                        background: active ? '#f1f5f9' : 'transparent',
                                        fontWeight: active ? 600 : 500,
                                        fontSize: '0.875rem',
                                        transition: 'all 0.15s ease',
                                        padding: '0.45rem 0.85rem',
                                        borderRadius: '6px'
                                    }}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden md:flex">
                        <button
                            onClick={handlePortalClick}
                            style={{
                                padding: '0.5rem 1rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                borderRadius: '7px',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                background: '#0f172a',
                                color: '#ffffff',
                                border: '1px solid #0f172a',
                                transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
                        >
                            {(isLoggedIn || isAdmin || isDeveloper) && (
                                <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                            )}
                            <span>{portalLabel}</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* Mobile Controls */}
                    <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={handlePortalClick}
                            style={{
                                padding: '0.42rem 0.8rem',
                                fontSize: '0.78rem',
                                borderRadius: '6px',
                                fontWeight: 600,
                                background: '#0f172a',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}
                        >
                            <span>{isLoggedIn ? 'Portal' : isAdmin ? 'Admin' : 'Sign In'}</span>
                        </button>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            style={{
                                color: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.35rem',
                                borderRadius: '6px'
                            }}
                        >
                            {isOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown */}
            {isOpen && (
                <div
                    className="md:hidden"
                    style={{
                        position: 'absolute',
                        top: '72px',
                        left: 0,
                        width: '100%',
                        background: '#ffffff',
                        borderBottom: '1px solid #e2e8f0',
                        padding: '0.75rem 1rem',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)'
                    }}
                >
                    <div className="flex flex-col gap-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setCurrentPage(item.id);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: '0.7rem 0.85rem',
                                    textAlign: 'left',
                                    borderRadius: '6px',
                                    background: currentPage === item.id ? '#f1f5f9' : 'transparent',
                                    color: currentPage === item.id ? '#0f172a' : '#475569',
                                    fontWeight: currentPage === item.id ? 600 : 500,
                                    fontSize: '0.9rem'
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
