import React from 'react';
import { Phone, Mail, MapPin, Clock, GraduationCap } from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const Footer = ({ setCurrentPage }) => {
    const { schoolData } = useSchoolData();

    const navLinks = [
        { id: 'home', label: 'Campus Overview' },
        { id: 'about', label: 'About & Accreditation' },
        { id: 'faculty', label: 'Academic Faculty' },
        { id: 'facilities', label: 'Laboratories & Library' },
        { id: 'blog', label: 'News & Announcements' },
        { id: 'contact', label: 'Admissions & Contact' },
        { id: 'login', label: 'Staff & Student Portal' }
    ];

    return (
        <footer
            style={{
                background: '#0f172a',
                color: '#94a3b8',
                padding: '3.5rem 0 2rem',
                borderTop: '1px solid #1e293b',
                fontSize: '0.875rem'
            }}
        >
            <div className="container">
                <div
                    className="grid grid-cols-3"
                    style={{
                        gap: '2.5rem',
                        paddingBottom: '2.5rem',
                        borderBottom: '1px solid #1e293b'
                    }}
                >
                    {/* Column 1: Institutional Summary */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                            <div
                                style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '7px',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#f8fafc'
                                }}
                            >
                                <GraduationCap size={18} />
                            </div>
                            <span style={{ color: '#f8fafc', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                                {schoolData?.name || 'ACS Higher Secondary School & College'}
                            </span>
                        </div>
                        <p style={{ lineHeight: 1.7, color: '#94a3b8', marginBottom: '1rem', maxWidth: '360px' }}>
                            {schoolData?.description ||
                                'Affiliated with BISE Faisalabad, providing structured education from Playgroup and Matriculation to Intermediate (F.Sc, ICS, and Humanities).'}
                        </p>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            BISE Faisalabad Affiliated Institution • Painsra Campus
                        </div>
                    </div>

                    {/* Column 2: Navigation */}
                    <div>
                        <h4
                            style={{
                                color: '#f8fafc',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: '1rem'
                            }}
                        >
                            Institution Directory
                        </h4>
                        <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {navLinks.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (setCurrentPage) {
                                                setCurrentPage(item.id);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                        style={{
                                            color: '#94a3b8',
                                            fontSize: '0.85rem',
                                            textAlign: 'left',
                                            padding: 0,
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'color 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f8fafc'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Campus Contact */}
                    <div>
                        <h4
                            style={{
                                color: '#f8fafc',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: '1rem'
                            }}
                        >
                            Campus Office
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                <MapPin size={16} style={{ marginTop: '3px', flexShrink: 0, color: '#64748b' }} />
                                <span>{schoolData?.contact?.address || 'Main Jhang Road, Painsra, District Faisalabad'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                <Phone size={16} style={{ flexShrink: 0, color: '#64748b' }} />
                                <span>{schoolData?.contact?.phone || '0300-1202275'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                <Mail size={16} style={{ flexShrink: 0, color: '#64748b' }} />
                                <span>{schoolData?.contact?.email || 'info@acspainsra.edu.pk'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                <Clock size={16} style={{ flexShrink: 0, color: '#64748b' }} />
                                <span>{schoolData?.contact?.hours || 'Mon – Sat: 7:30 AM – 2:30 PM'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        paddingTop: '1.5rem',
                        fontSize: '0.8rem',
                        color: '#64748b'
                    }}
                >
                    <span>
                        &copy; {new Date().getFullYear()} {schoolData?.name || 'ACS School & College'}. All rights reserved.
                    </span>
                    <span>Academic ERP &amp; Institutional Analytics Suite</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
