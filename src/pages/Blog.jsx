import React, { useState, useEffect } from 'react';
import { Calendar, User, ArrowRight, Clock, Search, FileText, ArrowLeft } from 'lucide-react';
import { useSchoolData } from '../context/SchoolDataContext';

const categories = ['All', 'Events', 'Achievements', 'Campus', 'Education'];

const Blog = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { schoolData } = useSchoolData();
    const blogPosts = schoolData?.blogs || [];
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPost, setSelectedPost] = useState(null);

    const filteredPosts = blogPosts.filter((post) => {
        const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
        const q = (searchQuery || '').toLowerCase();
        const titleStr = String(post?.title || '').toLowerCase();
        const excerptStr = String(post?.excerpt || '').toLowerCase();
        const matchesSearch = titleStr.includes(q) || excerptStr.includes(q);
        return matchesCategory && matchesSearch;
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Academic Session 2026';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (selectedPost) {
        return (
            <div style={{ background: '#f8fafc', color: '#0f172a', minHeight: '75vh' }}>
                <section
                    style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '3rem 0 2.5rem',
                        borderBottom: '1px solid #1e293b'
                    }}
                >
                    <div className="container" style={{ maxWidth: '820px' }}>
                        <button
                            onClick={() => setSelectedPost(null)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.4rem 0.85rem',
                                borderRadius: '6px',
                                background: '#1e293b',
                                color: '#cbd5e1',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                border: '1px solid #334155',
                                cursor: 'pointer',
                                marginBottom: '1.25rem'
                            }}
                        >
                            <ArrowLeft size={14} /> Back to Campus News
                        </button>
                        <h1 style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.25rem)', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem', lineHeight: 1.25 }}>
                            {selectedPost.title}
                        </h1>
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.84rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <User size={14} /> {selectedPost.author || 'Campus Administration'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Calendar size={14} /> {formatDate(selectedPost.date)}
                            </span>
                            {selectedPost.readTime && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Clock size={14} /> {selectedPost.readTime}
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                <section style={{ padding: '3rem 0' }}>
                    <div className="container" style={{ maxWidth: '820px' }}>
                        <div className="card" style={{ background: '#ffffff', padding: '2rem' }}>
                            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                                {selectedPost.excerpt}
                            </p>
                            <div style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-line' }}>
                                {selectedPost.content || 'For further information, please contact the ACS Administration Office during working hours.'}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

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
                        Publications &amp; Updates
                    </div>
                    <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        Campus News &amp; Academic Bulletins
                    </h1>
                    <p style={{ fontSize: '0.98rem', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.6, margin: 0 }}>
                        Official updates on BISE Faisalabad examination schedules, merit distinctions, and campus events.
                    </p>
                </div>
            </section>

            {/* Filter & Search Bar */}
            <section style={{ padding: '1.25rem 0', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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

                    <div style={{ position: 'relative', minWidth: '250px' }}>
                        <Search
                            size={15}
                            style={{
                                position: 'absolute',
                                left: '11px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#94a3b8',
                                pointerEvents: 'none'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Search bulletins..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="dw-input"
                            style={{ width: '100%', paddingLeft: '2.1rem' }}
                        />
                    </div>
                </div>
            </section>

            {/* Posts Grid */}
            <section style={{ padding: '3rem 0' }}>
                <div className="container">
                    {filteredPosts.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                            No bulletins matched your filter criteria.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                                gap: '1.25rem'
                            }}
                        >
                            {filteredPosts.map((post) => (
                                <div
                                    key={post.id}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        background: '#ffffff'
                                    }}
                                    onClick={() => setSelectedPost(post)}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                                            <span
                                                style={{
                                                    padding: '3px 9px',
                                                    borderRadius: '5px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 600,
                                                    background: '#f1f5f9',
                                                    color: '#334155',
                                                    border: '1px solid #e2e8f0'
                                                }}
                                            >
                                                {post.category || 'Bulletin'}
                                            </span>
                                            <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Calendar size={13} /> {formatDate(post.date)}
                                            </span>
                                        </div>

                                        <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                                            {post.title}
                                        </h3>

                                        <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                                            {post.excerpt}
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            paddingTop: '0.85rem',
                                            borderTop: '1px solid #f1f5f9',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: '#0f172a'
                                        }}
                                    >
                                        <span style={{ color: '#64748b', fontWeight: 500 }}>{post.author || 'Administration'}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            Read Bulletin <ArrowRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Blog;
