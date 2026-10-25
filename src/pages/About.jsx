import React from 'react';
import { Target, Eye, Award, CheckCircle2 } from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const About = () => {
    const { schoolData } = useSchoolData();

    const accreditations = schoolData?.about?.accreditations || [
        'Board of Intermediate and Secondary Education (BISE), Faisalabad',
        'Punjab School Education Department Registration',
        'Higher Secondary Science & Computer Laboratories Certification'
    ];

    const values = schoolData?.about?.values || [
        'Academic Rigor & Board Exam Readiness',
        'Integrity, Discipline & Character Formation',
        'Practical Scientific Inquiry & Lab Competence',
        'Partnership with Parents & Local Community',
        'Meritocracy & Need-Based Educational Access'
    ];

    return (
        <div style={{ background: '#f8fafc', color: '#0f172a' }}>
            {/* Page Header */}
            <section
                style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '3.5rem 0 3rem',
                    borderBottom: '1px solid #1e293b'
                }}
            >
                <div className="container">
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                        Institution Profile
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        About {schoolData?.name || 'ACS School & College'}
                    </h1>
                    <p style={{ fontSize: '0.98rem', color: '#94a3b8', maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
                        Committed to structured, disciplined, and accessible education from early childhood through Higher Secondary (F.Sc / ICS / FA) in Painsra, Faisalabad.
                    </p>
                </div>
            </section>

            {/* Mission & Vision */}
            <section style={{ padding: '3.5rem 0', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div className="container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '1.5rem'
                        }}
                    >
                        <div className="card" style={{ background: '#f8fafc' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    color: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'
                                }}
                            >
                                <Target size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.6rem', color: '#0f172a' }}>
                                Institutional Mission
                            </h2>
                            <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#475569', margin: 0 }}>
                                {schoolData?.about?.mission ||
                                    'To provide students in Painsra and surrounding Faisalabad localities with rigorous academic preparation, strong moral grounding, and practical analytical skills for board examinations and university studies.'}
                            </p>
                        </div>

                        <div className="card" style={{ background: '#f8fafc' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    color: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'
                                }}
                            >
                                <Eye size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.6rem', color: '#0f172a' }}>
                                Educational Vision
                            </h2>
                            <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#475569', margin: 0 }}>
                                {schoolData?.about?.vision ||
                                    'To stand as a benchmark regional institution recognized for consistent BISE Faisalabad board distinctions, disciplined campus life, and data-informed academic mentorship.'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* History & Core Values */}
            <section style={{ padding: '3.5rem 0', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div className="container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '2.5rem',
                            alignItems: 'start'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                                Institutional Background
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                                Serving Painsra &amp; District Faisalabad
                            </h2>
                            <p style={{ fontSize: '0.94rem', lineHeight: 1.8, color: '#475569', margin: 0 }}>
                                {schoolData?.about?.history ||
                                    'Established to bring quality secondary and higher secondary education directly to families along Jhang Road and Gojra Road in Painsra, ACS Higher Secondary School & College combines dedicated subject faculty, modern laboratories, and structured assessment tracking.'}
                            </p>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                                Guiding Principles
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                                Core Academic Values
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {values.map((val, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.65rem',
                                            padding: '0.75rem 1rem',
                                            background: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '0.88rem',
                                            fontWeight: 600,
                                            color: '#1e293b'
                                        }}
                                    >
                                        <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                                        <span>{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Accreditations */}
            <section style={{ padding: '3.5rem 0', background: '#ffffff' }}>
                <div className="container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                        <Award size={20} color="#0f172a" />
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            Affiliations &amp; Regulatory Standing
                        </h2>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1rem'
                        }}
                    >
                        {accreditations.map((accred, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '1.1rem 1.25rem',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.88rem',
                                    fontWeight: 600,
                                    color: '#0f172a'
                                }}
                            >
                                {accred}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
