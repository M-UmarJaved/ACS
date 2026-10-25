import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const Facilities = () => {
    const { schoolData } = useSchoolData();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [lightboxImage, setLightboxImage] = useState(null);

    const facilitiesList = schoolData?.facilities || [];
    const dynamicCats = Array.from(new Set(facilitiesList.map((f) => f.category).filter(Boolean)));
    const categories = ['All', ...(dynamicCats.length > 0 ? dynamicCats : ['Academic', 'Sports', 'Technology', 'Facilities'])];

    const filteredFacilities =
        selectedCategory === 'All'
            ? facilitiesList
            : facilitiesList.filter((f) => f.category === selectedCategory);

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
                        Campus Infrastructure
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        Laboratories, Library &amp; Campus Facilities
                    </h1>
                    <p style={{ fontSize: '0.98rem', color: '#94a3b8', maxWidth: '620px', lineHeight: 1.6, margin: 0 }}>
                        Purpose-built academic classrooms, science &amp; computer laboratories, and student amenities at our Painsra campus.
                    </p>
                </div>
            </section>

            {/* Category Filter */}
            <section style={{ padding: '1.25rem 0', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div className="container">
                    <div className="dw-subnav">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`dw-subnav-btn ${selectedCategory === cat ? 'active' : ''}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Facilities Grid */}
            <section style={{ padding: '3rem 0' }}>
                <div className="container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                            gap: '1.5rem'
                        }}
                    >
                        {filteredFacilities.map((facility) => (
                            <div
                                key={facility.id}
                                className="card"
                                style={{
                                    padding: 0,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    background: '#ffffff'
                                }}
                                onClick={() => setLightboxImage(facility)}
                            >
                                <div
                                    style={{
                                        width: '100%',
                                        height: '220px',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        background: '#f1f5f9',
                                        borderBottom: '1px solid #e2e8f0'
                                    }}
                                >
                                    {facility.image ? (
                                        <img
                                            src={facility.image}
                                            alt={facility.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                            <Building2 size={36} />
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                                        <span
                                            style={{
                                                background: 'rgba(15, 23, 42, 0.85)',
                                                color: '#ffffff',
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                padding: '3px 9px',
                                                borderRadius: '5px'
                                            }}
                                        >
                                            {facility.category}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ padding: '1.25rem 1.35rem' }}>
                                    <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '0.45rem', color: '#0f172a' }}>
                                        {facility.name}
                                    </h3>
                                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.88rem', margin: 0 }}>
                                        {facility.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Lightbox */}
            {lightboxImage && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.8)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem'
                    }}
                    onClick={() => setLightboxImage(null)}
                >
                    <div
                        style={{
                            maxWidth: '840px',
                            width: '100%',
                            background: '#ffffff',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {lightboxImage.image && (
                            <img
                                src={lightboxImage.image}
                                alt={lightboxImage.name}
                                style={{
                                    width: '100%',
                                    maxHeight: '55vh',
                                    objectFit: 'cover'
                                }}
                            />
                        )}
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                    {lightboxImage.name}
                                </h3>
                                <button
                                    onClick={() => setLightboxImage(null)}
                                    className="dw-btn-mini"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <X size={14} /> Close
                                </button>
                            </div>
                            <p style={{ fontSize: '0.94rem', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                                {lightboxImage.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Facilities;
