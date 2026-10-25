import React, { useRef, useState } from 'react';
import { Save, User, Users, Award, Camera, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { getBaseClass } from '../utils/gradeUtils';

const formatCNIC = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return digits.slice(0, 5) + '-' + digits.slice(5);
    return digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
};

const formatDateForInput = (val) => {
    if (!val) return '';
    let s = String(val).trim();
    
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    
    // If it's DD/MM/YYYY or DD-MM-YYYY
    const match = s.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})$/);
    if (match) {
        const day = match[1];
        const month = match[2];
        const year = match[3];
        return `${year}-${month}-${day}`;
    }
    
    // If it's Excel serial number
    if (/^\d{5}$/.test(s)) {
        const excelSerial = parseInt(s, 10);
        const date = new Date((excelSerial - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    // Fallback: try native Date parsing
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    
    return '';
};

/**
 * StudentEditModal
 * Full-screen overlay modal for editing all student details.
 * Supports class transfer: auto-assigns a new globally unique serial
 * and resets subjects to match the new class when the student is moved.
 */
const StudentEditModal = ({
    editStudentData,
    setEditStudentData,
    editingStudentId,
    setEditingStudentId,
    students,
    setStudents,
    showSaveMessage,
    handleStudentPhotoUpload,
    sectionClasses,
    SUBJECTS,
    CLASS_SERIAL_STARTS,
    CLASS_GROUPS,
    CLASS_TRACKS,
    CLASS_SUBTRACKS,
    SECTIONS,
}) => {
    const photoRef = useRef(null);
    const [classChangeWarning, setClassChangeWarning] = useState(null);

    if (!editingStudentId || !editStudentData) return null;

    const originalStudent = students.find(s => s.id === editingStudentId);
    const originalClass = originalStudent?.grade;
    const isClassChanged = editStudentData.grade && editStudentData.grade !== originalClass;

    const adm = (prev, key, val) => ({
        ...prev,
        admissions: [{ ...(prev.admissions?.[0] || {}), [key]: val }]
    });

    const onClose = () => {
        setEditingStudentId(null);
        setEditStudentData(null);
        setClassChangeWarning(null);
    };

    const handlePhotoChange = (e) => {
        handleStudentPhotoUpload(e, setEditStudentData);
    };

    // Called when admin selects a new class from the dropdown
    const handleClassChange = (newClass) => {
        if (newClass === originalClass) {
            // Reverted back — restore original serial and results
            setEditStudentData(p => ({
                ...p,
                grade: newClass,
                serialNumber: originalStudent.serialNumber,
                serial_number: originalStudent.serial_number,
                results: originalStudent.results || [],
            }));
            setClassChangeWarning(null);
            return;
        }

        // Compute new globally unique serial for the new class
        let newSerial = null;
        const classStart = CLASS_SERIAL_STARTS?.[newClass];
        if (classStart !== undefined && classStart !== null) {
            const floor = parseInt(classStart, 10) - 1;
            // Global max excluding this student (they'll vacate their current serial)
            const globalMaxSerial = students
                .filter(s => s.id !== editingStudentId)
                .reduce((max, s) => {
                    const sn = parseInt(s.serialNumber, 10);
                    return !isNaN(sn) ? Math.max(max, sn) : max;
                }, floor);
            newSerial = String(Math.max(floor, globalMaxSerial) + 1);
        }

        // Build new results based on new class subjects (blank marks, same terms)
        const newClassSubjects = (SUBJECTS && !Array.isArray(SUBJECTS)) ? (SUBJECTS[newClass] || []) : [];
        const newResults = newClassSubjects.map(sub => ({
            subject: sub,
            obtained: 0,
            total: 100,
            percentage: 0,
            grade: 'F',
            term: ''
        }));

        setEditStudentData(p => ({
            ...p,
            grade: newClass,
            serialNumber: newSerial,
            serial_number: newSerial,
            results: newResults,
        }));

        setClassChangeWarning({
            from: originalClass,
            to: newClass,
            newSerial,
            subjectCount: newClassSubjects.length,
        });
    };

    const handleSave = async () => {
        // Validate serial uniqueness (only if it changed)
        const newSerial = editStudentData.serialNumber || editStudentData.serial_number;
        const originalSerial = originalStudent?.serialNumber;
        if (newSerial && newSerial !== originalSerial) {
            const conflict = students.find(s => s.id !== editingStudentId && String(s.serialNumber) === String(newSerial));
            if (conflict) {
                alert(`Serial number ${newSerial} is already assigned to "${conflict.name}" (${conflict.grade}). Please use a unique serial.`);
                return;
            }
        }
        const updated = students.map(s => s.id === editingStudentId ? editStudentData : s);
        await setStudents(updated);
        if (isClassChanged && classChangeWarning) {
            showSaveMessage(`✅ ${editStudentData.name} transferred from ${classChangeWarning.from} → ${classChangeWarning.to}! Serial: ${classChangeWarning.newSerial || 'unchanged'}`);
        } else {
            showSaveMessage(`✅ ${editStudentData.name} updated successfully!`);
        }
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            overflowY: 'auto', padding: '2rem 1rem'
        }}>
            <div style={{
                background: 'white', borderRadius: '16px',
                width: '100%', maxWidth: '860px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                overflow: 'hidden', marginBottom: '2rem'
            }}>
                {/* ── Header ── */}
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.3rem' }}>✏️ Edit: {editStudentData.name}</h2>
                        <p style={{ margin: '0.25rem 0 0', opacity: 0.8, fontSize: '0.85rem' }}>
                            ID: {editStudentData.id} • Class: {originalClass}
                            {isClassChanged && (
                                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.1rem 0.5rem', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                                    → {editStudentData.grade}
                                </span>
                            )}
                        </p>
                    </div>
                    <button onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}>
                        ✕
                    </button>
                </div>

                <div style={{ padding: '2rem' }}>

                    {/* ── Class Change Warning Banner ── */}
                    {classChangeWarning && (
                        <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                            <div>
                                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                                    Class Transfer: {classChangeWarning.from} → {classChangeWarning.to}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6 }}>
                                    • Serial number will change to <strong>{classChangeWarning.newSerial || 'unassigned'}</strong> (globally unique)<br />
                                    • Results will be reset with <strong>{classChangeWarning.subjectCount}</strong> subject(s) from {classChangeWarning.to}<br />
                                    • Previous results will be preserved in the archive
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Photo + Class ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '120px', height: '140px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {(editStudentData.photo || editStudentData.image)
                                    ? <img src={editStudentData.photo || editStudentData.image} alt={editStudentData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <Camera size={32} color="#94a3b8" />}
                            </div>
                            <button onClick={() => photoRef.current?.click()}
                                className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white', fontSize: '0.8rem' }}>
                                <Camera size={13} /> Upload Photo
                            </button>
                            {(editStudentData.photo || editStudentData.image) && (
                                <button onClick={() => setEditStudentData(p => ({ ...p, photo: '', image: '' }))}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer' }}>
                                    Remove photo
                                </button>
                            )}
                            <input type="file" ref={photoRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Class selector */}
                            <div>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <ArrowRightLeft size={14} color="#7c3aed" /> Base Class
                                </label>
                                <select className="form-input" value={editStudentData.grade || ''}
                                    onChange={e => handleClassChange(e.target.value)}
                                    style={{ borderColor: isClassChanged ? '#f59e0b' : undefined, fontWeight: isClassChanged ? 700 : undefined }}>
                                    {sectionClasses.map(c => <option key={c} value={c}>{c}{c === originalClass ? ' (current)' : ''}</option>)}
                                </select>
                                {isClassChanged && (
                                    <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem', fontWeight: 600 }}>
                                        ⚠️ Changing class will reset subjects and auto-assign a new serial
                                    </div>
                                )}
                            </div>

                            {/* Subject Track / Group */}
                            <div>
                                <label className="form-label">Subject Track (e.g. Biology, Pre-Medical, ICS, Humanities)</label>
                                <select className="form-input" 
                                    value={editStudentData.subjectTrack || editStudentData.admissions?.[0]?.subjectTrack || ''}
                                    onChange={e => {
                                        const trk = e.target.value;
                                        setEditStudentData(p => adm({ ...p, subjectTrack: trk }, 'subjectTrack', trk));
                                    }}>
                                    <option value="">Standard / General</option>
                                    {(CLASS_TRACKS?.[editStudentData.grade] || CLASS_TRACKS?.[getBaseClass(editStudentData.grade)] || ['Biology', 'Computer', 'Arts', 'Pre-Medical', 'Pre-Engineering', 'ICS', 'Humanities']).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sub-Track (for ICS: Physics/Econ/Stats, Humanities: FAIT/FA, Arts: Simple Arts/Computer Arts) */}
                            {(() => {
                                const trk = editStudentData.subjectTrack || editStudentData.admissions?.[0]?.subjectTrack;
                                const isICS = trk === 'ICS';
                                const isHumanities = trk === 'Humanities' || trk === 'FA' || trk === 'FAIT' || trk === 'FA IT';
                                const isArts = trk === 'Arts';
                                if (!isICS && !isHumanities && !isArts) return null;
                                const subOptions = isICS 
                                    ? ['Physics', 'Economics', 'Statistics'] 
                                    : isHumanities 
                                    ? ['FAIT', 'FA'] 
                                    : ['Simple Arts', 'Computer Arts'];
                                return (
                                    <div>
                                        <label className="form-label">Sub-part (e.g. Physics, Economics, Stats, FAIT, FA, Simple Arts)</label>
                                        <select className="form-input"
                                            value={editStudentData.subTrack || editStudentData.admissions?.[0]?.subTrack || ''}
                                            onChange={e => {
                                                const sub = e.target.value;
                                                setEditStudentData(p => adm({ ...p, subTrack: sub }, 'subTrack', sub));
                                            }}>
                                            <option value="">All / None</option>
                                            {subOptions.map(st => (
                                                <option key={st} value={st}>{st}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })()}

                            {/* Status selector */}
                            <div>
                                <label className="form-label">Enrollment Status</label>
                                <select className="form-input" value={editStudentData.status || 'active'}
                                    onChange={e => setEditStudentData(p => ({ ...p, status: e.target.value }))}
                                    style={{
                                        color: editStudentData.status === 'graduated' ? '#15803d' : editStudentData.status === 'left' ? '#dc2626' : '#1e3a8a',
                                        fontWeight: 700,
                                        borderColor: editStudentData.status !== 'active' ? '#cbd5e1' : undefined
                                    }}>
                                    <option value="active">🟢 Active Student</option>
                                    <option value="graduated">🎓 Graduated (Passed Out)</option>
                                    <option value="left">🔴 Left College (Dropped / Left)</option>
                                </select>
                            </div>

                            {/* Class Group / Section */}
                            <div>
                                <label className="form-label">Custom Group / House (Quaid / Iqbal)</label>
                                <select className="form-input" value={editStudentData.group || editStudentData.admissions?.[0]?.group || ''}
                                    onChange={e => {
                                        const grp = e.target.value;
                                        setEditStudentData(p => adm({ ...p, group: grp }, 'group', grp));
                                    }}>
                                    <option value="">Default (No Group)</option>
                                    {(CLASS_GROUPS?.[editStudentData.grade] || CLASS_GROUPS?.[getBaseClass(editStudentData.grade)] || ['Quaid', 'Iqbal']).map(g => (
                                        <option key={g} value={g}>🏆 {g}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Serial number */}
                            <div>
                                <label className="form-label">Serial Number</label>
                                <input className="form-input" placeholder="Unique serial number"
                                    value={editStudentData.serialNumber || editStudentData.serial_number || ''}
                                    readOnly={isClassChanged}
                                    style={{ background: isClassChanged ? '#f1f5f9' : undefined, color: isClassChanged ? '#7c3aed' : undefined, fontWeight: isClassChanged ? 700 : undefined }}
                                    onChange={e => !isClassChanged && setEditStudentData(p => ({ ...p, serialNumber: e.target.value, serial_number: e.target.value }))} />
                                {isClassChanged && (
                                    <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.2rem' }}>
                                        Auto-assigned for the new class
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Student Info ── */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={16} /> Student's Information
                        </h3>
                        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                            <div>
                                <label className="form-label">Student's Name (Capital Letters)</label>
                                <input className="form-input" value={editStudentData.name || ''}
                                    onChange={e => setEditStudentData(p => ({ ...p, name: e.target.value.toUpperCase() }))} />
                            </div>
                            <div>
                                <label className="form-label">B-Form Number</label>
                                <input className="form-input" placeholder="35202-0000000-0"
                                    value={editStudentData.admissions?.[0]?.bForm || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'bForm', formatCNIC(e.target.value)))} />
                            </div>
                            <div>
                                <label className="form-label">Date of Birth</label>
                                <input type="date" className="form-input"
                                    value={formatDateForInput(editStudentData.admissions?.[0]?.dob || '')}
                                    onChange={e => setEditStudentData(p => adm(p, 'dob', e.target.value))} />
                            </div>
                            <div>
                                <label className="form-label">Nationality</label>
                                <input className="form-input" placeholder="e.g. Pakistani"
                                    value={editStudentData.admissions?.[0]?.nationality || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'nationality', e.target.value))} />
                            </div>
                            <div>
                                <label className="form-label">Gender</label>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem' }}>
                                    {['Male', 'Female', 'Others'].map(g => (
                                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input type="radio" name="edit_gender"
                                                checked={editStudentData.admissions?.[0]?.gender === g}
                                                onChange={() => setEditStudentData(p => adm(p, 'gender', g))} /> {g}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Religion</label>
                                <input className="form-input" placeholder="e.g. Islam"
                                    value={editStudentData.admissions?.[0]?.religion || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'religion', e.target.value))} />
                            </div>
                        </div>
                    </div>

                    {/* ── Health & Medical ── */}
                    <div style={{ marginBottom: '2rem', background: '#f8fafc', borderRadius: '10px', padding: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Award size={16} /> Health &amp; Medical
                        </h3>
                        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                            <div>
                                <label className="form-label">Any Allergies?</label>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem' }}>
                                    {['Yes', 'No'].map(o => (
                                        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input type="radio" name="edit_allergy"
                                                checked={(editStudentData.admissions?.[0]?.allergies || 'No') === o}
                                                onChange={() => setEditStudentData(p => adm(p, 'allergies', o))} /> {o}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Allergy Details</label>
                                <input className="form-input"
                                    value={editStudentData.admissions?.[0]?.allergiesDetails || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'allergiesDetails', e.target.value))} />
                            </div>
                            <div>
                                <label className="form-label">Chronic Medical Condition?</label>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem' }}>
                                    {['Yes', 'No'].map(o => (
                                        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input type="radio" name="edit_chronic"
                                                checked={(editStudentData.admissions?.[0]?.chronicCondition || 'No') === o}
                                                onChange={() => setEditStudentData(p => adm(p, 'chronicCondition', o))} /> {o}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Condition Details</label>
                                <input className="form-input"
                                    value={editStudentData.admissions?.[0]?.chronicConditionDetails || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'chronicConditionDetails', e.target.value))} />
                            </div>
                        </div>
                    </div>

                    {/* ── Parent Info ── */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={16} /> Parent's Information
                        </h3>
                        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                            <div className="col-span-2">
                                <label className="form-label">Father's Name (Capital Letters)</label>
                                <input className="form-input"
                                    value={editStudentData.admissions?.[0]?.fatherName || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'fatherName', e.target.value.toUpperCase()))} />
                            </div>
                            <div>
                                <label className="form-label">Father's CNIC</label>
                                <input className="form-input" placeholder="35202-0000000-0"
                                    value={editStudentData.admissions?.[0]?.fatherCnic || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'fatherCnic', formatCNIC(e.target.value)))} />
                            </div>
                            <div>
                                <label className="form-label">Contact Number</label>
                                <input className="form-input"
                                    value={editStudentData.admissions?.[0]?.contact || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'contact', e.target.value))} />
                            </div>
                            <div>
                                <label className="form-label">WhatsApp Number</label>
                                <input className="form-input"
                                    value={editStudentData.admissions?.[0]?.whatsapp || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'whatsapp', e.target.value))} />
                            </div>
                            <div className="col-span-2">
                                <label className="form-label">Home Address</label>
                                <textarea className="form-input" style={{ height: '80px' }}
                                    value={editStudentData.admissions?.[0]?.address || ''}
                                    onChange={e => setEditStudentData(p => adm(p, 'address', e.target.value))} />
                            </div>
                        </div>
                    </div>

                    {/* ── Actions ── */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                        <button onClick={onClose}
                            className="btn" style={{ background: '#f1f5f9', color: '#64748b', padding: '0.6rem 1.5rem' }}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" style={{ padding: '0.6rem 2rem', fontWeight: 700, background: isClassChanged ? '#d97706' : undefined, borderColor: isClassChanged ? '#d97706' : undefined }}
                            onClick={handleSave}>
                            {isClassChanged
                                ? <><ArrowRightLeft size={16} /> Transfer &amp; Save</>
                                : <><Save size={16} /> Update Student</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentEditModal;
