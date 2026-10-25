import React, { useState } from 'react';
import { Briefcase, UserCheck } from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const Faculty = () => {
    const { schoolData } = useSchoolData();
    const [selectedDept, setSelectedDept] = useState('All');

    const facultyList = schoolData?.faculty || [];
    const dynamicDepts = Array.from(new Set(facultyList.map((f) => f.department).filter(Boolean)));
    const departments = ['All', ...(dynamicDepts.length > 0 ? dynamicDepts : ['Administration', 'Science', 'Mathematics', 'Computer Science', 'Humanities'])];

    const filteredFaculty =
        selectedDept === 'All'
            ? facultyList
            : facultyList.filter((f) => f.department === selectedDept);

    return (
        <div style={{ background: '#f8fafc', color: '#0f172a', minHeight: '75vh' }}>
            {/* Header */}
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
                        Academic Staff Directory
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        Faculty &amp; Subject Specialists
                    </h1>
                    <p style={{ fontSize: '0.98rem', color: '#94a3b8', maxWidth: '620px', lineHeight: 1.6, margin: 0 }}>
                        Experienced educators and department heads guiding students across Matriculation and Intermediate tracks.
                    </p>
                </div>
            </section>

            {/* Department Filter */}
            <section style={{ padding: '1.25rem 0', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div className="container">
                    <div className="dw-subnav">
                        {departments.map((dept) => (
                            <button
                                key={dept}
                                type="button"
                                onClick={() => setSelectedDept(dept)}
                                className={`dw-subnav-btn ${selectedDept === dept ? 'active' : ''}`}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Faculty Grid */}
            <section style={{ padding: '3rem 0' }}>
                <div className="container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.25rem'
                        }}
                    >
                        {filteredFaculty.map((member) => (
                            <div
                                key={member.id}
                                className="card"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    background: '#ffffff'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                                        {member.image ? (
                                            <img
                                                src={member.image}
                                                alt={member.name}
                                                style={{
                                                    width: '52px',
                                                    height: '52px',
                                                    borderRadius: '8px',
                                                    objectFit: 'cover',
                                                    border: '1px solid #e2e8f0',
                                                    flexShrink: 0
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '52px',
                                                    height: '52px',
                                                    borderRadius: '8px',
                                                    background: '#0f172a',
                                                    color: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '1.1rem',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {String(member.name || 'F').charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem' }}>
                                                {member.name}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                                                <Briefcase size={13} />
                                                <span>{member.role}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.86rem', margin: '0 0 1rem' }}>
                                        {member.bio}
                                    </p>
                                </div>

                                <div
                                    style={{
                                        paddingTop: '0.75rem',
                                        borderTop: '1px solid #f1f5f9',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.76rem',
                                        color: '#64748b'
                                    }}
                                >
                                    <span>Department: <strong style={{ color: '#334155' }}>{member.department}</strong></span>
                                    <UserCheck size={14} color="#059669" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Faculty;
