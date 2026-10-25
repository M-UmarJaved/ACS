import React from 'react';
import {
    ArrowRight,
    Users,
    Award,
    BookOpen,
    GraduationCap,
    CheckCircle2,
    Building2,
    Calendar,
    MapPin,
    Phone,
    ShieldCheck,
    FileSpreadsheet
} from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const Home = ({ setCurrentPage }) => {
    const { schoolData, biSummary } = useSchoolData();

    const academicDivisions = [
        {
            level: 'Early Years & Primary Wing',
            classes: 'Playgroup to Class 5',
            focus: 'Foundational literacy in English & Urdu, numeracy, Nazra Quran, and structured character formation.',
            code: 'PRI-01'
        },
        {
            level: 'Middle School Division',
            classes: 'Class 6 to Class 8',
            focus: 'Pre-secondary STEM readiness, General Science, Computer literacy, Tarjuma-tul-Quran, and analytical writing.',
            code: 'MID-02'
        },
        {
            level: 'Secondary School (Matriculation)',
            classes: '9th & 10th (BISE Faisalabad)',
            focus: 'Board-oriented Science (Biology & Computer Science) and Humanities tracks with weekly test series.',
            code: 'MAT-03'
        },
        {
            level: 'Higher Secondary (Intermediate)',
            classes: '1st Year & 2nd Year (F.Sc / ICS / FA)',
            focus: 'Pre-Medical, Pre-Engineering, ICS (Physics/Stats/Econ), and Humanities with dedicated laboratory practicals.',
            code: 'INT-04'
        }
    ];

    const totalStudents = biSummary?.kpis?.totalStudents || schoolData?.students?.length || 360;

    return (
        <div style={{ background: '#f8fafc', color: '#0f172a' }}>
            {/* ═══════ INSTITUTIONAL HERO SECTION ═══════ */}
            <section
                style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '4.5rem 0 4rem',
                    borderBottom: '1px solid #1e293b'
                }}
            >
                <div className="container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '3rem',
                            alignItems: 'center'
                        }}
                    >
                        {/* Left Column: Editorial Headline & CTAs */}
                        <div>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#cbd5e1',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    marginBottom: '1.25rem'
                                }}
                            >
                                <span>BISE Faisalabad Affiliated</span>
                                <span style={{ color: '#475569' }}>•</span>
                                <span>Admissions Open 2026</span>
                            </div>

                            <h1
                                style={{
                                    fontSize: 'clamp(2rem, 4vw, 3.1rem)',
                                    fontWeight: 800,
                                    color: '#f8fafc',
                                    lineHeight: 1.15,
                                    letterSpacing: '-0.03em',
                                    marginBottom: '1.15rem'
                                }}
                            >
                                Rigorous Academics &amp; Character Formation from Playgroup to Intermediate.
                            </h1>

                            <p
                                style={{
                                    fontSize: '1.02rem',
                                    color: '#94a3b8',
                                    lineHeight: 1.7,
                                    marginBottom: '2rem',
                                    maxWidth: '580px'
                                }}
                            >
                                {schoolData?.description ||
                                    'ACS Higher Secondary School & College serves the Painsra and Faisalabad community with structured board preparation, dedicated science & computer laboratories, and transparent academic tracking.'}
                            </p>

                            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setCurrentPage('contact')}
                                    style={{
                                        background: '#ffffff',
                                        color: '#0f172a',
                                        fontWeight: 600,
                                        borderRadius: '7px',
                                        padding: '0.75rem 1.4rem',
                                        fontSize: '0.9rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        border: '1px solid #ffffff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>Inquire for Admission</span>
                                    <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage('login')}
                                    style={{
                                        background: '#1e293b',
                                        color: '#f8fafc',
                                        fontWeight: 600,
                                        borderRadius: '7px',
                                        padding: '0.75rem 1.4rem',
                                        fontSize: '0.9rem',
                                        border: '1px solid #334155',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Student &amp; Staff Portal
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Institutional Fact Sheet Card */}
                        <div
                            style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '10px',
                                padding: '1.75rem'
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingBottom: '1rem',
                                    marginBottom: '1.25rem',
                                    borderBottom: '1px solid #334155'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Institutional Fact Sheet
                                    </div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                                        Academic Session 2025–2026
                                    </div>
                                </div>
                                <GraduationCap size={22} color="#94a3b8" />
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem',
                                    marginBottom: '1.25rem'
                                }}
                            >
                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                        Active Enrollment
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                                        {totalStudents}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                        Playgroup to 2nd Year
                                    </div>
                                </div>

                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                        Board Pass Rate
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                                        98.2%
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                        BISE Faisalabad
                                    </div>
                                </div>

                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                        Academic Divisions
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                                        4 Wings
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                        Primary, Middle, Matric, Inter
                                    </div>
                                </div>

                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                        Campus Location
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
                                        Painsra
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                        Main Jhang Road, FSD
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.78rem',
                                    color: '#94a3b8',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid #334155'
                                }}
                            >
                                <span>Separate Boys &amp; Girls Sections</span>
                                <span>Mon – Sat: 7:30 AM – 2:30 PM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════ ACADEMIC DIVISIONS & PROGRAMS ═══════ */}
            <section style={{ padding: '4rem 0', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div className="container">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                                Academic Structure
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                                Four-Tier Educational Pathway
                            </h2>
                        </div>
                        <button
                            onClick={() => setCurrentPage('about')}
                            className="btn btn-outline btn-sm"
                        >
                            View Curriculum &amp; Affiliation
                        </button>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '1.25rem'
                        }}
                    >
                        {academicDivisions.map((div) => (
                            <div
                                key={div.code}
                                className="card"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '1rem',
                                    background: '#ffffff'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <span
                                            style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                padding: '3px 8px',
                                                borderRadius: '5px',
                                                background: '#f1f5f9',
                                                color: '#334155',
                                                border: '1px solid #e2e8f0'
                                            }}
                                        >
                                            {div.classes}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}>
                                            {div.code}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                                        {div.level}
                                    </h3>
                                    <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                                        {div.focus}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ OFFICIAL ANNOUNCEMENTS & NOTICE BOARD ═══════ */}
            {schoolData.announcements && schoolData.announcements.length > 0 && (
                <section style={{ padding: '4rem 0', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div className="container">
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                flexWrap: 'wrap',
                                gap: '1rem',
                                marginBottom: '2rem'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                                    Campus Circulars
                                </div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                                    Official Notice Board
                                </h2>
                            </div>
                            <button onClick={() => setCurrentPage('blog')} className="btn btn-outline btn-sm">
                                All Campus News
                            </button>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '1.25rem'
                            }}
                        >
                            {schoolData.announcements.slice(0, 3).map((ann) => (
                                <div
                                    key={ann.id}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        background: '#ffffff'
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#64748b',
                                                marginBottom: '0.65rem'
                                            }}
                                        >
                                            <Calendar size={13} />
                                            <span>{ann.date}</span>
                                        </div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                                            {ann.title}
                                        </h3>
                                        <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                                            {ann.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ═══════ WHY FAMILIES CHOOSE ACS ═══════ */}
            <section style={{ padding: '4rem 0', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div className="container">
                    <div style={{ marginBottom: '2.25rem', maxWidth: '640px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                            Institutional Standards
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                            Built for Academic Discipline &amp; Measurable Outcomes
                        </h2>
                        <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                            Every classroom, laboratory, and assessment cycle is structured to prepare students for BISE board examinations and university entrance.
                        </p>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.25rem'
                        }}
                    >
                        {[
                            {
                                icon: BookOpen,
                                title: 'BISE Board Test Series',
                                description: 'Structured monthly and terminal examination cycles modeled on BISE Faisalabad marking rubrics.'
                            },
                            {
                                icon: Users,
                                title: 'Subject-Specialist Faculty',
                                description: 'Experienced M.Phil and M.Sc subject specialists in Physics, Chemistry, Biology, Mathematics, and Computer Science.'
                            },
                            {
                                icon: Building2,
                                title: 'Science & Computer Labs',
                                description: 'Dedicated practical laboratories for Matric and F.Sc / ICS cohorts alongside a quiet reference library.'
                            },
                            {
                                icon: FileSpreadsheet,
                                title: 'Digital Gradebook & Attendance',
                                description: 'Real-time student attendance tracking, term-wise transcript generation, and transparent fee ledgers.'
                            },
                            {
                                icon: Award,
                                title: 'Merit & Need Scholarships',
                                description: 'Tuition fee concessions for board position holders, high achievers, and deserving families.'
                            },
                            {
                                icon: ShieldCheck,
                                title: 'Safe & Disciplined Campus',
                                description: 'Dedicated wings for boys and girls with daily attendance verification and parent communication.'
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="card" style={{ background: '#f8fafc' }}>
                                <div
                                    style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '8px',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#0f172a',
                                        marginBottom: '1rem'
                                    }}
                                >
                                    <feature.icon size={18} />
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                                    {feature.title}
                                </h3>
                                <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ COMMUNITY FEEDBACK ═══════ */}
            {schoolData.testimonials && schoolData.testimonials.length > 0 && (
                <section style={{ padding: '4rem 0', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div className="container">
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                                Parent &amp; Alumni Perspectives
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                                Trusted Across Painsra &amp; Faisalabad
                            </h2>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '1.25rem'
                            }}
                        >
                            {schoolData.testimonials.map((testimonial) => (
                                <div
                                    key={testimonial.id}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '1.25rem',
                                        background: '#ffffff'
                                    }}
                                >
                                    <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#334155', margin: 0 }}>
                                        &ldquo;{testimonial?.text || ''}&rdquo;
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                                        <div
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                background: '#0f172a',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#ffffff',
                                                fontWeight: 700,
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            {String(testimonial?.name || 'A').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                                {testimonial?.name || 'Parent'}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                {testimonial?.role || 'Community Member'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ═══════ ADMISSIONS & CAMPUS VISIT CTA ═══════ */}
            <section style={{ padding: '4rem 0', background: '#ffffff' }}>
                <div className="container">
                    <div
                        style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            borderRadius: '12px',
                            padding: '2.75rem 2.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '2rem'
                        }}
                    >
                        <div style={{ maxWidth: '580px' }}>
                            <h2 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                                Admissions &amp; Campus Visits
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                                Visit the Admissions Office on Main Jhang Road, Painsra between 7:30 AM and 2:30 PM (Monday–Saturday) or submit an online admission inquiry.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setCurrentPage('contact')}
                                style={{
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    borderRadius: '7px',
                                    padding: '0.75rem 1.35rem',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Contact Admissions Office
                            </button>
                            <button
                                onClick={() => setCurrentPage('login')}
                                style={{
                                    background: '#1e293b',
                                    color: '#f8fafc',
                                    border: '1px solid #334155',
                                    fontWeight: 600,
                                    borderRadius: '7px',
                                    padding: '0.75rem 1.35rem',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Staff &amp; Student Login
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
