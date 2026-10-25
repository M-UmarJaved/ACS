import React from 'react';
import { Save, Edit3, Trash2, Camera, PlusCircle } from 'lucide-react';

const FacilitiesTab = ({
    schoolData, editingFacilityId, setEditingFacilityId,
    tempFacility, setTempFacility,
    addFacility, saveFacility, deleteFacility, facilityFileRef,
}) => (
    <div className="animate-fade-in">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'var(--font-weight-bold)' }}>Manage Facilities</h2>
            <button onClick={addFacility} className="btn btn-primary">
                <PlusCircle size={18} /> Add Facility
            </button>
        </div>

        {editingFacilityId && tempFacility && (
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid var(--color-primary-100)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                    {editingFacilityId === 'new' ? 'New Facility' : 'Edit Facility'}
                </h3>
                <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', background: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {tempFacility?.image
                                ? <img src={tempFacility.image} alt="Facility" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <Camera size={40} color="#94a3b8" />}
                        </div>
                        <button onClick={() => facilityFileRef.current.click()} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white' }}>Upload Photo</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Facility Name</label>
                            <input type="text" className="form-input" value={tempFacility.name || ''} onChange={e => setTempFacility({ ...tempFacility, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Category</label>
                            <input type="text" className="form-input" value={tempFacility.category || ''} onChange={e => setTempFacility({ ...tempFacility, category: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Description</label>
                            <textarea className="form-input" style={{ height: '100px' }} value={tempFacility.description || ''} onChange={e => setTempFacility({ ...tempFacility, description: e.target.value })} />
                        </div>
                        <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                            <button onClick={saveFacility} className="btn btn-success" style={{ flex: 1 }}><Save size={18} /> Save Facility</button>
                            <button onClick={() => { setEditingFacilityId(null); setTempFacility(null); }} className="btn" style={{ background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>
            {(schoolData.facilities || []).map(fac => (
                <div key={fac.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ height: '160px', width: '100%', position: 'relative' }}>
                        <img src={fac.image} alt={fac.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
                            <button onClick={() => { setEditingFacilityId(fac.id); setTempFacility(fac); }} className="btn btn-sm btn-icon" style={{ background: 'white', color: '#2563eb', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}><Edit3 size={14} /></button>
                            <button onClick={() => deleteFacility(fac.id)} className="btn btn-sm btn-icon" style={{ background: 'white', color: '#dc2626', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{fac.category}</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{fac.name}</div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>{fac.description}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default FacilitiesTab;
