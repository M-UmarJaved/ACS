import React from 'react';
import { Save, Edit3, Trash2, Camera, PlusCircle } from 'lucide-react';

const FacultyTab = ({
    schoolData, editingFacultyId, setEditingFacultyId,
    tempFacultyMember, setTempFacultyMember,
    addFaculty, saveFaculty, deleteFaculty, facultyFileRef,
}) => (
    <div className="animate-fade-in">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'var(--font-weight-bold)' }}>Manage Faculty</h2>
            <button onClick={addFaculty} className="btn btn-primary">
                <PlusCircle size={18} /> Add Faculty Member
            </button>
        </div>

        {editingFacultyId && tempFacultyMember && (
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid var(--color-primary-100)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                    {editingFacultyId === 'new' ? 'New Faculty Member' : 'Edit Faculty Member'}
                </h3>
                <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '150px', height: '150px', borderRadius: '12px', overflow: 'hidden', background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {tempFacultyMember?.image
                                ? <img src={tempFacultyMember.image} alt="Faculty" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <Camera size={40} color="#94a3b8" />}
                        </div>
                        <button onClick={() => facultyFileRef.current.click()} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white' }}>Upload Photo</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                            <div>
                                <label className="form-label">Full Name</label>
                                <input type="text" className="form-input" value={tempFacultyMember.name || ''} onChange={e => setTempFacultyMember({ ...tempFacultyMember, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Contact / Phone</label>
                                <input type="text" className="form-input" placeholder="e.g. 0300-1234567" value={tempFacultyMember.phone || ''} onChange={e => setTempFacultyMember({ ...tempFacultyMember, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Role / Designation</label>
                                <input type="text" className="form-input" value={tempFacultyMember.role || ''} onChange={e => setTempFacultyMember({ ...tempFacultyMember, role: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Department</label>
                                <input type="text" className="form-input" value={tempFacultyMember.department || ''} onChange={e => setTempFacultyMember({ ...tempFacultyMember, department: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Joining Date</label>
                                <input type="date" className="form-input" value={tempFacultyMember.joining_date || ''} onChange={e => setTempFacultyMember({ ...tempFacultyMember, joining_date: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Base Salary (/month)</label>
                                <input type="number" className="form-input" value={tempFacultyMember.base_salary || ''} onChange={e => setTempFacultyMember({ ...tempFacultyMember, base_salary: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Short Bio</label>
                            <textarea className="form-input" style={{ height: '80px' }} value={tempFacultyMember.bio || ''} onChange={e => setTempFacultyMember({ ...tempFacultyMember, bio: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
                            <button onClick={saveFaculty} className="btn btn-success"><Save size={18} /> Save Member</button>
                            <button onClick={() => { setEditingFacultyId(null); setTempFacultyMember(null); }} className="btn" style={{ background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
            {(schoolData.faculty || []).map(member => (
                <div key={member.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={member.image} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{member.name}</div>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{member.role}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{member.department}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingFacultyId(member.id); setTempFacultyMember(member); }} className="btn btn-sm btn-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Edit3 size={16} /></button>
                        <button onClick={() => deleteFaculty(member.id)} className="btn btn-sm btn-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Trash2 size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default FacultyTab;
