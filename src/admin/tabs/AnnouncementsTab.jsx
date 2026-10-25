import React from 'react';
import { BellPlus, Megaphone, Trash2 } from 'lucide-react';

const AnnouncementsTab = ({ schoolData, newAnnouncement, setNewAnnouncement, addAnnouncement, deleteAnnouncement }) => (
    <div className="animate-fade-in">
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'var(--font-weight-bold)', marginBottom: '1.5rem' }}>Manage Announcements</h2>
        <div className="grid grid-cols-2" style={{ gap: '2rem', alignItems: 'start' }}>
            {/* Add form */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-primary)' }}>Post New Announcement</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label className="form-label">Announcement Title</label>
                        <input type="text" className="form-input" placeholder="e.g., Summer Vacation Notice"
                            value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Publication Date</label>
                        <input type="date" className="form-input"
                            value={newAnnouncement.date} onChange={e => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })} />
                    </div>
                    <div>
                        <label className="form-label">Content / Details</label>
                        <textarea className="form-input" style={{ height: '120px', resize: 'vertical' }}
                            placeholder="Provide detailed information here..."
                            value={newAnnouncement.content} onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} />
                    </div>
                    <button onClick={addAnnouncement} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                        <BellPlus size={18} /> Post Announcement
                    </button>
                </div>
            </div>

            {/* Active list */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Active Announcements</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(!schoolData.announcements || schoolData.announcements.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-gray-400)' }}>
                            <Megaphone size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>No active announcements.</p>
                        </div>
                    ) : (
                        (schoolData.announcements || []).map(ann => (
                            <div key={ann.id} style={{ padding: '1rem', border: '1px solid var(--color-gray-100)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.25rem' }}>{ann.date}</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>{ann.title}</div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', lineHeight: 1.5, margin: 0 }}>{ann.content}</p>
                                    </div>
                                    <button onClick={() => deleteAnnouncement(ann.id)} style={{ padding: '0.4rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
);

export default AnnouncementsTab;
