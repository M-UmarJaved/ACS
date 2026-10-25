import React, { useState } from 'react';
import { ChevronRight, Upload, Download, PlusCircle, Users, Edit3, Trash2, X, Hash, Check, Search, Key } from 'lucide-react';
import { getBaseClass, filterStudentsByHierarchy, getStudentTrack, getStudentSubTrack, getPreset, getStudentCardAcademicDetails } from '../utils/gradeUtils';

const ClassListsTab = ({
    students, setStudents,
    SECTIONS, CLASSES,
    updateSections, updateClasses,
    CLASS_GROUPS, CLASS_TRACKS, CLASS_SUBTRACKS,
    updateClassGroups, updateClassTracks, updateClassSubTracks,
    selectedClassForList, setSelectedClassForList,
    viewingClass, setViewingClass,
    classDetailTab, setClassDetailTab,
    selectedSectionId, setSelectedSectionId,
    editingStudentId, setEditingStudentId,
    editStudentData, setEditStudentData,
    classImportFileRef, importStudentsExcel,
    exportClassRoster, exportPasswordsPDF,
    setActiveTab, setAdmissionData,
    showSaveMessage, openConfirm,
    CLASS_SERIAL_STARTS, updateClassSerialStarts,
    uploadImage, deleteStudent,
}) => {
    const [editingSerialStudentId, setEditingSerialStudentId] = useState(null);
    const [editingSerialValue, setEditingSerialValue] = useState('');

    const [showSerialConfig, setShowSerialConfig] = useState(false);
    const [serialStartBoysInput, setSerialStartBoysInput] = useState('');
    const [serialStartGirlsInput, setSerialStartGirlsInput] = useState('');
    const [classListSearch, setClassListSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'left', 'graduated'
    const [activeSectionTab, setActiveSectionTab] = useState('all'); // 'all' or sectionId
    const [rosterTrack, setRosterTrack] = useState('all');
    const [rosterSubTrack, setRosterSubTrack] = useState('all');
    const [rosterGroup, setRosterGroup] = useState('all');
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [bulkSelection, setBulkSelection] = useState([]);
    const [bulkTargetClass, setBulkTargetClass] = useState('');
    const [bulkTargetStatus, setBulkTargetStatus] = useState('');

    const classStartSerialObj = viewingClass ? (CLASS_SERIAL_STARTS?.[viewingClass] ?? {}) : {};
    const classStartSerialBoys = typeof classStartSerialObj === 'object' && classStartSerialObj !== null ? (classStartSerialObj.boys || '') : (typeof classStartSerialObj === 'string' ? classStartSerialObj : '');
    const classStartSerialGirls = typeof classStartSerialObj === 'object' && classStartSerialObj !== null ? (classStartSerialObj.girls || '') : '';
    const classStartSerialStr = [
        classStartSerialBoys ? `👦 ${classStartSerialBoys}` : '',
        classStartSerialGirls ? `👧 ${classStartSerialGirls}` : ''
    ].filter(Boolean).join(' • ');

    const saveStudentSerial = (studentId, newSerial) => {
        // Global uniqueness check
        if (newSerial) {
            const conflict = students.find(s => s.id !== studentId && String(s.serialNumber) === String(newSerial));
            if (conflict) {
                alert(`Serial number ${newSerial} is already assigned to "${conflict.name}" (${conflict.grade}). Serial numbers must be unique across the entire college.`);
                return;
            }
        }
        const updatedStudents = students.map(s =>
            s.id === studentId ? { ...s, serialNumber: newSerial || null } : s
        );
        setStudents(updatedStudents); // State update is now optimistic in context
        setEditingSerialStudentId(null);
        showSaveMessage('Serial number updated!');
    };

    const handleSaveSerialStart = () => {
        if (!viewingClass) return;
        const bInput = serialStartBoysInput.trim();
        const gInput = serialStartGirlsInput.trim();
        
        let newStudents = [...students];
        const classStudentsMale = students.filter(s => getBaseClass(s.grade) === getBaseClass(viewingClass) && (s.status || 'active') === 'active' && s.admissions?.[0]?.gender === 'Male').sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        const classStudentsFemale = students.filter(s => getBaseClass(s.grade) === getBaseClass(viewingClass) && (s.status || 'active') === 'active' && s.admissions?.[0]?.gender === 'Female').sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        const allNewSerials = [];
        
        const applySerials = (studentsList, startVal) => {
            if (!startVal) return null;
            let startNum = parseInt(startVal, 10);
            if (isNaN(startNum)) return 'invalid';
            const mapped = studentsList.map((s, i) => ({ id: s.id, serial: String(startNum + i) }));
            allNewSerials.push(...mapped.map(m => m.serial));
            return mapped;
        };

        const malesApplied = applySerials(classStudentsMale, bInput);
        const femalesApplied = applySerials(classStudentsFemale, gInput);

        if (malesApplied === 'invalid' || femalesApplied === 'invalid') {
            alert("Please enter a valid numeric starting serial or leave empty.");
            return;
        }

        if (allNewSerials.length > 0) {
            const conflict = students.find(s => getBaseClass(s.grade) !== getBaseClass(viewingClass) && allNewSerials.includes(String(s.serialNumber)));
            if (conflict) {
                alert(`Cannot set starting serials. Auto-incrementing would assign ${conflict.serialNumber} which is already in use by "${conflict.name}" (${conflict.grade}).`);
                return;
            }

            const malesObj = malesApplied ? Object.fromEntries(malesApplied.map(m => [m.id, m.serial])) : {};
            const femalesObj = femalesApplied ? Object.fromEntries(femalesApplied.map(f => [f.id, f.serial])) : {};

            newStudents = newStudents.map(s => {
                if (malesObj[s.id] !== undefined) return { ...s, serialNumber: malesObj[s.id] };
                if (femalesObj[s.id] !== undefined) return { ...s, serialNumber: femalesObj[s.id] };
                return s;
            });
            setStudents(newStudents);
        }

        const newMap = { ...(CLASS_SERIAL_STARTS || {}), [viewingClass]: { boys: bInput || null, girls: gInput || null } };
        updateClassSerialStarts(newMap);
        setShowSerialConfig(false);
        showSaveMessage(`Starting serials for "${viewingClass}" updated and auto-assigned to students`);
    };

    const getFilteredRosterStudents = (className = viewingClass) => {
        return filterStudentsByHierarchy(students, {
            baseClass: getBaseClass(className),
            track: rosterTrack,
            subTrack: rosterSubTrack,
            group: rosterGroup,
            gender: classDetailTab,
            status: statusFilter,
            search: classListSearch
        }).sort((a, b) => {
            const sA = parseInt(a.serialNumber || a.serial_number, 10);
            const sB = parseInt(b.serialNumber || b.serial_number, 10);
            if (!isNaN(sA) && !isNaN(sB) && sA !== sB) return sA - sB;
            return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true });
        });
    };

    const printIDCards = (className, customStudents = null) => {
        const sourceList = Array.isArray(customStudents)
            ? customStudents
            : students.filter(s => getBaseClass(s.grade) === getBaseClass(className) && (s.status || 'active') === 'active');

        const targetStudents = sourceList.slice().sort((a, b) => {
            const sA = parseInt(a.serialNumber || a.serial_number, 10);
            const sB = parseInt(b.serialNumber || b.serial_number, 10);
            if (!isNaN(sA) && !isNaN(sB) && sA !== sB) return sA - sB;
            return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true });
        });

        if (targetStudents.length === 0) {
            openConfirm('No Students', 'There are no students in this class/filter to print ID cards for.', null, false);
            return;
        }

        const websiteDomain = 'acscollege.com';

        const cardsHTML = targetStudents.map(s => {
            const info = getStudentCardAcademicDetails(s);
            const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Student')}&background=dbeafe&color=1e3a8a&bold=true`;
            const photoSrc = s.image || s.photo || s.admissions?.[0]?.photo || avatarFallback;
            const loginPwd = s.password || (s.id + '123');

            return `
            <div class="id-card">
                <div class="top-accent"></div>
                <div class="id-header">
                    <div class="header-brand">
                        <img src="/logo.png" class="school-logo" alt="ACS" onerror="this.style.display='none'" />
                        <div class="school-titles">
                            <div class="school-name">ACS SCHOOL &amp; COLLEGE</div>
                            <div class="school-sub">Main Jhang Road, Painsra, Faisalabad</div>
                        </div>
                    </div>
                    <div class="card-type-badge">STUDENT ID CARD</div>
                </div>

                <div class="profile-row">
                    <div class="photo-box">
                        <img src="${photoSrc}" alt="${s.name}" onerror="this.src='${avatarFallback}'" />
                    </div>
                    <div class="profile-meta">
                        ${info.serialNumber !== '—' ? `<div class="badges-line"><span class="serial-tag">Roll / S# ${info.serialNumber}</span></div>` : ''}
                        <div class="stu-name">${s.name}</div>
                        <div class="stu-father">S/D of: <strong>${info.fatherName}</strong></div>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="d-item">
                        <span class="d-lbl">Class Level</span>
                        <span class="d-val navy">${info.classLevel}</span>
                    </div>
                    <div class="d-item">
                        <span class="d-lbl">Stream / Group</span>
                        <span class="d-val emerald">${info.fullGroupDisplay}</span>
                    </div>
                    <div class="d-item">
                        <span class="d-lbl">Gender</span>
                        <span class="d-val ${info.isFemale ? 'pink' : (info.isMale ? 'blue' : '')}">${info.genderLabel}</span>
                    </div>
                    <div class="d-item">
                        <span class="d-lbl">B-Form / CNIC</span>
                        <span class="d-val">${info.bForm}</span>
                    </div>
                </div>

                <div class="portal-strip">
                    <div class="portal-col">
                        <span class="p-lbl">Login ID / Roll No</span>
                        <span class="p-val">${s.id}</span>
                    </div>
                    <div class="portal-divider"></div>
                    <div class="portal-col">
                        <span class="p-lbl">Portal Password</span>
                        <span class="p-val pwd">${loginPwd}</span>
                    </div>
                </div>

                <div class="id-footer">
                    <div class="web-row">
                        <span>🌐 Official Website: <strong>www.${websiteDomain}</strong></span>
                        <span>📞 0300-1333275</span>
                    </div>
                    <div class="web-sub">Manage &amp; view attendance, exam results &amp; fee records online at <strong>${websiteDomain}</strong></div>
                </div>
            </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Student ID Cards - ${className}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Inter', 'Segoe UI', sans-serif;
        background: #e2e8f0;
        color: #0f172a;
        padding: 72px 20px 40px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .toolbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        background: #0f172a;
        color: white;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .toolbar-title { font-size: 15px; font-weight: 800; color: #f8fafc; }
    .toolbar-sub { font-size: 12px; color: #94a3b8; font-weight: 600; }
    .btn-print {
        padding: 9px 22px;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(124,58,237,0.35);
    }
    .btn-print:hover { background: #6d28d9; }

    .cards-grid {
        max-width: 210mm;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .id-card {
        background: #ffffff;
        border-radius: 12px;
        border: 1.5px dashed #94a3b8;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        page-break-inside: avoid;
        break-inside: avoid;
        box-shadow: 0 4px 10px rgba(15,23,42,0.07);
    }
    .top-accent {
        height: 4px;
        background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #dc2626 100%);
    }
    .id-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
        color: white;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    .header-brand {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .school-logo {
        width: 32px;
        height: 32px;
        object-fit: contain;
        background: white;
        border-radius: 6px;
        padding: 2px;
        flex-shrink: 0;
    }
    .school-name {
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.4px;
        line-height: 1.1;
    }
    .school-sub {
        font-size: 8.5px;
        color: #93c5fd;
        font-weight: 600;
        margin-top: 2px;
    }
    .card-type-badge {
        background: #dc2626;
        color: white;
        font-size: 8.5px;
        font-weight: 900;
        padding: 3px 7px;
        border-radius: 4px;
        letter-spacing: 0.5px;
        white-space: nowrap;
    }

    .profile-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px 8px;
    }
    .photo-box {
        width: 62px;
        height: 68px;
        border-radius: 8px;
        border: 2px solid #1e3a8a;
        overflow: hidden;
        background: #f1f5f9;
        flex-shrink: 0;
    }
    .photo-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .profile-meta {
        flex: 1;
        min-width: 0;
    }
    .badges-line {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 3px;
    }
    .gender-pill {
        font-size: 9px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 999px;
        text-transform: uppercase;
    }
    .gender-pill.male { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    .gender-pill.female { background: #fce7f3; color: #be185d; border: 1px solid #f9a8d4; }
    .gender-pill.neutral { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .serial-tag {
        font-size: 9px;
        font-weight: 800;
        background: #f5f3ff;
        color: #6d28d9;
        border: 1px solid #ddd6fe;
        padding: 2px 7px;
        border-radius: 999px;
    }
    .stu-name {
        font-size: 14.5px;
        font-weight: 900;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stu-father {
        font-size: 10px;
        color: #475569;
        font-weight: 600;
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .stu-class-banner {
        display: inline-block;
        margin-top: 4px;
        background: #eff6ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
        font-size: 9.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 5px;
    }

    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px 10px;
        margin: 0 12px 8px;
        padding: 7px 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
    }
    .d-item {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
    .d-lbl {
        font-size: 8px;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }
    .d-val {
        font-size: 10.5px;
        font-weight: 800;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .d-val.navy { color: #1e3a8a; }
    .d-val.emerald { color: #047857; }
    .d-val.blue { color: #1d4ed8; }
    .d-val.pink { color: #be185d; }

    .portal-strip {
        margin: 0 12px 8px;
        background: #f0f9ff;
        border: 1.5px solid #bae6fd;
        border-radius: 8px;
        padding: 6px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .portal-col {
        flex: 1;
        text-align: center;
    }
    .portal-divider {
        width: 1px;
        height: 24px;
        background: #bae6fd;
        margin: 0 8px;
    }
    .p-lbl {
        display: block;
        font-size: 8px;
        font-weight: 800;
        color: #0369a1;
        text-transform: uppercase;
    }
    .p-val {
        display: block;
        font-size: 12px;
        font-weight: 900;
        color: #0f172a;
        font-family: 'Consolas', 'Courier New', monospace;
        margin-top: 1px;
    }
    .p-val.pwd { color: #2563eb; }

    .id-footer {
        background: #0f172a;
        color: white;
        padding: 6px 12px;
        text-align: center;
    }
    .web-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 9.5px;
        font-weight: 700;
        color: #e2e8f0;
    }
    .web-row strong {
        color: #38bdf8;
        font-weight: 900;
        letter-spacing: 0.3px;
    }
    .web-sub {
        font-size: 8px;
        color: #94a3b8;
        margin-top: 2px;
    }
    .web-sub strong { color: #fde68a; }

    @page { size: A4 portrait; margin: 8mm; }
    @media print {
        .no-print { display: none !important; }
        body { background: white; padding: 0; }
        .cards-grid { max-width: 100%; gap: 8px; }
        .id-card { box-shadow: none !important; border: 1.5px dashed #64748b !important; }
    }
</style>
</head>
<body>
    <div class="toolbar no-print">
        <div>
            <div class="toolbar-title">🪪 Student Identity &amp; Portal Cards (${targetStudents.length} Students — ${className})</div>
            <div class="toolbar-sub">Includes Official Website (acscollege.com), Gender Badge, Class Level &amp; Academic Stream/Sub-Track</div>
        </div>
        <button class="btn-print" onclick="window.print()">🖨️ Print ID Cards</button>
    </div>
    <div class="cards-grid">
        ${cardsHTML}
    </div>
</body>
</html>`;
        const win = window.open('', '_blank');
        if (!win) {
            alert("Popup blocked! Please allow popups to print ID cards.");
            return;
        }
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 600);
    };


    const handleApplyBulk = () => {
        if (bulkSelection.length === 0) return;
        if (!bulkTargetClass && !bulkTargetStatus) {
            alert("Please select a target Class or Status to apply.");
            return;
        }

        const confirmMsg = `Are you sure you want to update ${bulkSelection.length} students?` +
            (bulkTargetClass ? `\n- New Class: ${bulkTargetClass}` : '') +
            (bulkTargetStatus ? `\n- New Status: ${bulkTargetStatus}` : '');

        if (!window.confirm(confirmMsg)) return;

        const updatedStudents = students.map(s => {
            if (!bulkSelection.includes(s.id)) return s;
            return {
                ...s,
                grade: bulkTargetClass || s.grade,
                status: bulkTargetStatus || s.status
            };
        });

        setStudents(updatedStudents);
        setIsBulkEditing(false);
        setBulkSelection([]);
        setBulkTargetClass('');
        setBulkTargetStatus('');
        showSaveMessage(`Bulk update applied to ${bulkSelection.length} students!`);
    };



    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── HEADER: nav tabs + Academic Settings shortcut ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

            <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', padding: '0.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                <button 
                    onClick={() => { setActiveSectionTab('all'); setViewingClass(null); setClassListSearch(''); }}
                    style={{ 
                        padding: '0.6rem 1.25rem', borderRadius: '12px', border: '1px solid', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                        background: activeSectionTab === 'all' && !viewingClass ? '#2563eb' : 'white',
                        color: activeSectionTab === 'all' && !viewingClass ? 'white' : '#64748b',
                        borderColor: activeSectionTab === 'all' && !viewingClass ? '#2563eb' : '#e2e8f0',
                        boxShadow: activeSectionTab === 'all' && !viewingClass ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
                    }}
                >
                    🏢 All Classes
                </button>
                {(SECTIONS || []).map(sec => {
                    const isParentOfViewing = viewingClass && sec.classes.includes(viewingClass);
                    const isActive = (activeSectionTab === sec.id || isParentOfViewing) && !viewingClass;
                    return (
                        <button
                            key={sec.id}
                            onClick={() => { setActiveSectionTab(sec.id); setViewingClass(null); setSelectedSectionId(sec.id); }}
                            style={{ 
                                padding: '0.6rem 1.1rem', borderRadius: '12px',
                                border: '1px solid', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                                background: isActive ? '#2563eb' : (isParentOfViewing ? '#eff6ff' : 'white'),
                                color: isActive ? 'white' : (isParentOfViewing ? '#2563eb' : '#64748b'),
                                borderColor: isActive ? '#2563eb' : (isParentOfViewing ? '#bfdbfe' : '#e2e8f0'),
                                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
                            }}
                        >
                            {sec.name}
                        </button>
                    );
                })}
            </div>

                {/* Academic Settings shortcut button */}
                <button
                    onClick={() => setActiveTab('academic-settings')}
                    style={{
                        flexShrink: 0, padding: '0.55rem 1rem', borderRadius: '10px',
                        border: '1.5px solid #c4b5fd', background: '#f5f3ff', color: '#7c3aed',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                    }}
                >
                    ⚙️ Academic Settings
                </button>
            </div>

            {/* Main Content Area */}
            <div style={{ minWidth: 0 }}>
            {
                viewingClass ? (
                    /* ── CLASS ROSTER VIEW (Specific Class List) ── */
                    <div className="card animate-fade-in" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        {/* Header */}
                        <div style={{ background: 'linear-gradient(to right, #f8fafc, #edf2f7)', borderBottom: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button onClick={() => { setViewingClass(null); setActiveSectionTab(SECTIONS.find(s => s.classes.includes(viewingClass))?.id || 'all'); }} className="btn" style={{ padding: '0.4rem 0.6rem', color: '#64748b' }}>
                                    <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back
                                </button>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{viewingClass}</h3>
                                        <select 
                                            value={statusFilter} 
                                            onChange={e => setStatusFilter(e.target.value)} 
                                            className="form-input" 
                                            style={{ width: '130px', borderRadius: '8px', background: 'white', fontSize: '0.8rem', height: '30px', padding: '0 0.5rem' }}
                                        >
                                            <option value="active">🟢 Active</option>
                                            <option value="left">🔴 Inactive</option>
                                            <option value="graduated">🎓 Passout</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                                        <span>{SECTIONS.find(s => s.classes.includes(viewingClass))?.name || 'Unassigned'}</span>
                                        <span>•</span>
                                        <span style={{ fontWeight: 700, color: statusFilter === 'graduated' ? '#7c3aed' : (statusFilter === 'active' ? '#059669' : '#dc2626') }}>
                                            {students.filter(s => s.grade === viewingClass && (s.status || 'active') === statusFilter).length} {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                                        </span>
                                        {classStartSerialStr && (
                                            <>
                                                <span>•</span>
                                                <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                                                    <Hash size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Starts: {classStartSerialStr}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                             <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button onClick={() => { setIsBulkEditing(!isBulkEditing); setBulkSelection([]); }} className="btn"
                                        style={{ background: isBulkEditing ? '#3b82f6' : '#f8fafc', color: isBulkEditing ? 'white' : '#2563eb', borderColor: '#bfdbfe', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                                        {isBulkEditing ? 'Cancel Bulk' : <><Check size={15} /> Bulk Actions</>}
                                    </button>
                                    <button onClick={() => { setShowSerialConfig(s => !s); setSerialStartBoysInput(String(classStartSerialBoys)); setSerialStartGirlsInput(String(classStartSerialGirls)); }} className="btn"
                                        style={{ background: showSerialConfig ? '#ede9fe' : '#f8fafc', color: '#7c3aed', borderColor: '#c4b5fd', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                                        <Hash size={15} /> Serial
                                    </button>
                                    <button onClick={() => { setSelectedClassForList(viewingClass); classImportFileRef.current.click(); }} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                                        <Upload size={14} /> Import
                                    </button>
                                    <button onClick={() => { setSelectedClassForList(viewingClass); setTimeout(exportClassRoster, 100); }} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                                        <Download size={14} /> Export
                                    </button>
                                    <button onClick={() => { setSelectedClassForList(viewingClass); exportPasswordsPDF(viewingClass, getFilteredRosterStudents(viewingClass)); }} className="btn" style={{ background: '#059669', color: 'white', borderColor: '#059669', fontSize: '0.85rem' }}>
                                        <Key size={14} /> Passwords
                                    </button>
                                    <button onClick={() => { setSelectedClassForList(viewingClass); printIDCards(viewingClass, getFilteredRosterStudents(viewingClass)); }} className="btn" style={{ background: '#7c3aed', color: 'white', borderColor: '#7c3aed', fontSize: '0.85rem' }}>
                                        🪪 ID Cards
                                    </button>
                                    <button onClick={() => { setSelectedClassForList(viewingClass); setAdmissionData(prev => ({ ...prev, applyingFor: viewingClass })); setActiveTab('admissions'); }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                                        <PlusCircle size={14} /> Add
                                    </button>
                                </div>
                            </div>

                        {/* Serial Config Panel */}
                        {showSerialConfig && (
                            <div style={{ background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#5b21b6' }}>Serial Number Configuration</div>
                                    <div style={{ fontSize: '0.75rem', color: '#7c3aed' }}>Set starting roll numbers for boys and girls in this class</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                    <input type="number" placeholder="Boys Start" value={serialStartBoysInput} onChange={e => setSerialStartBoysInput(e.target.value)} className="form-input" style={{ width: '100px', height: '34px' }} />
                                    <input type="number" placeholder="Girls Start" value={serialStartGirlsInput} onChange={e => setSerialStartGirlsInput(e.target.value)} className="form-input" style={{ width: '100px', height: '34px' }} />
                                    <button onClick={handleSaveSerialStart} className="btn btn-primary" style={{ background: '#7c3aed', height: '34px' }}>Save</button>
                                </div>
                            </div>
                        )}

                        {/* Gender and Track/Group filters */}
                        <div style={{ padding: '0.6rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {/* Gender tabs */}
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                {['all', 'boys', 'girls'].map(tab => {
                                    const label = tab === 'all' ? '👥 All Students' : (tab === 'boys' ? '👦 Boys' : '👧 Girls');
                                    const count = filterStudentsByHierarchy(students, {
                                        baseClass: getBaseClass(viewingClass),
                                        track: rosterTrack,
                                        subTrack: rosterSubTrack,
                                        group: rosterGroup,
                                        gender: tab,
                                        status: statusFilter
                                    }).length;
                                    return (
                                        <button key={tab} onClick={() => setClassDetailTab(tab)} style={{
                                            padding: '0.6rem 0', background: 'none', border: 'none',
                                            borderBottom: classDetailTab === tab ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                            color: classDetailTab === tab ? '#1d4ed8' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem'
                                        }}>
                                            {label} <span style={{ background: classDetailTab === tab ? '#dbeafe' : '#f1f5f9', color: classDetailTab === tab ? '#1d4ed8' : '#64748b', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Track / Group sub-filters */}
                            {(() => {
                                const viewingBase = getBaseClass(viewingClass);
                                const viewingSection = (SECTIONS || []).find(s => (s.classes || []).some(c => getBaseClass(c) === viewingBase));
                                const viewingPreset = getPreset(viewingSection?.name || '');
                                const viewingTracks = CLASS_TRACKS?.[viewingBase] || viewingPreset.subjectGroups || [];
                                const viewingSubTracks = rosterTrack !== 'all'
                                    ? (CLASS_SUBTRACKS?.[`${viewingBase} ${rosterTrack}`] !== undefined
                                        ? (CLASS_SUBTRACKS[`${viewingBase} ${rosterTrack}`] || [])
                                        : (viewingPreset.subTrackConfig?.[rosterTrack] || []))
                                    : [];
                                const viewingGroups = CLASS_GROUPS?.[viewingBase] || [];

                                if (viewingTracks.length === 0 && viewingGroups.length === 0) return null;

                                return (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
                                        {/* Tracks */}
                                        {viewingTracks.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669' }}>Track:</span>
                                                <button onClick={() => { setRosterTrack('all'); setRosterSubTrack('all'); }}
                                                    style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${rosterTrack === 'all' ? '#059669' : '#e2e8f0'}`, background: rosterTrack === 'all' ? '#ecfdf5' : 'white', color: rosterTrack === 'all' ? '#047857' : '#64748b', cursor: 'pointer' }}>
                                                    All
                                                </button>
                                                {viewingTracks.map(trk => (
                                                    <button key={trk} onClick={() => { setRosterTrack(trk); setRosterSubTrack('all'); }}
                                                        style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${rosterTrack === trk ? '#059669' : '#e2e8f0'}`, background: rosterTrack === trk ? '#059669' : 'white', color: rosterTrack === trk ? 'white' : '#64748b', cursor: 'pointer' }}>
                                                        {trk}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Sub-Tracks */}
                                        {viewingSubTracks.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed' }}>Sub-part:</span>
                                                <button onClick={() => setRosterSubTrack('all')}
                                                    style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${rosterSubTrack === 'all' ? '#7c3aed' : '#e2e8f0'}`, background: rosterSubTrack === 'all' ? '#f5f3ff' : 'white', color: rosterSubTrack === 'all' ? '#6d28d9' : '#64748b', cursor: 'pointer' }}>
                                                    All
                                                </button>
                                                {viewingSubTracks.map(sub => (
                                                    <button key={sub} onClick={() => setRosterSubTrack(sub)}
                                                        style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${rosterSubTrack === sub ? '#7c3aed' : '#e2e8f0'}`, background: rosterSubTrack === sub ? '#7c3aed' : 'white', color: rosterSubTrack === sub ? 'white' : '#64748b', cursor: 'pointer' }}>
                                                        {sub}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Groups */}
                                        {viewingGroups.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706' }}>Group:</span>
                                                <button onClick={() => setRosterGroup('all')}
                                                    style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${rosterGroup === 'all' ? '#d97706' : '#e2e8f0'}`, background: rosterGroup === 'all' ? '#fffbeb' : 'white', color: rosterGroup === 'all' ? '#b45309' : '#64748b', cursor: 'pointer' }}>
                                                    All
                                                </button>
                                                {viewingGroups.map(grp => (
                                                    <button key={grp} onClick={() => setRosterGroup(grp)}
                                                        style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${rosterGroup === grp ? '#d97706' : '#e2e8f0'}`, background: rosterGroup === grp ? '#d97706' : 'white', color: rosterGroup === grp ? 'white' : '#64748b', cursor: 'pointer' }}>
                                                        🏆 {grp}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Bulk Action Footer */}
                        {isBulkEditing && (
                            <div style={{ padding: '1rem 1.5rem', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af' }}>{bulkSelection.length} Selected</span>
                                <select onChange={e => setBulkTargetClass(e.target.value)} value={bulkTargetClass} className="form-input" style={{ width: '150px' }}>
                                    <option value="">Move to Class</option>
                                    {(CLASSES || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select onChange={e => setBulkTargetStatus(e.target.value)} value={bulkTargetStatus} className="form-input" style={{ width: '150px' }}>
                                    <option value="">Change Status</option>
                                    <option value="active">Active</option>
                                    <option value="left">Inactive</option>
                                    <option value="graduated">Passout</option>
                                </select>
                                <button onClick={handleApplyBulk} className="btn btn-primary" style={{ background: '#2563eb' }}>Apply Bulk</button>
                            </div>
                        )}

                        {/* Student list table */}
                        <div style={{ padding: '0', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                 <thead>
                                    <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9', background: '#fafafa' }}>
                                        {isBulkEditing && (
                                            <th style={{ padding: '1rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    onChange={e => {
                                                        const rosterFiltered = filterStudentsByHierarchy(students, {
                                                            baseClass: getBaseClass(viewingClass),
                                                            track: rosterTrack,
                                                            subTrack: rosterSubTrack,
                                                            group: rosterGroup,
                                                            gender: classDetailTab,
                                                            status: statusFilter,
                                                            search: classListSearch
                                                        });
                                                        if (e.target.checked) {
                                                            setBulkSelection(rosterFiltered.map(s => s.id));
                                                        } else {
                                                            setBulkSelection([]);
                                                        }
                                                    }}
                                                    checked={bulkSelection.length > 0 && bulkSelection.length === filterStudentsByHierarchy(students, {
                                                        baseClass: getBaseClass(viewingClass),
                                                        track: rosterTrack,
                                                        subTrack: rosterSubTrack,
                                                        group: rosterGroup,
                                                        gender: classDetailTab,
                                                        status: statusFilter,
                                                        search: classListSearch
                                                    }).length}
                                                />
                                            </th>
                                        )}
                                        <th style={{ padding: '1rem' }}>S#</th>
                                        <th style={{ padding: '1rem' }}>Student ID</th>
                                        <th style={{ padding: '1rem' }}>Name</th>
                                        <th style={{ padding: '1rem' }}>Father Name</th>
                                        <th style={{ padding: '1rem' }}>Track / Group</th>
                                        <th style={{ padding: '1rem' }}>Gender</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filterStudentsByHierarchy(students, {
                                        baseClass: getBaseClass(viewingClass),
                                        track: rosterTrack,
                                        subTrack: rosterSubTrack,
                                        group: rosterGroup,
                                        gender: classDetailTab,
                                        status: statusFilter,
                                        search: classListSearch
                                    })
                                        .sort((a,b) => {
                                            const sA = parseInt(a.serialNumber, 10);
                                            const sB = parseInt(b.serialNumber, 10);
                                            if (!isNaN(sA) && !isNaN(sB)) return sA - sB;
                                            return a.id.localeCompare(b.id, undefined, {numeric: true});
                                        })
                                        .map((student, idx) => {
                                            const stuTrack = getStudentTrack(student);
                                            const stuSubTrack = getStudentSubTrack(student);
                                            const stuGroup = student.group || student.admissions?.[0]?.group;
                                            return (
                                            <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fcfcfc' }}>
                                                {isBulkEditing && (
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={bulkSelection.includes(student.id)} 
                                                            onChange={() => setBulkSelection(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])} 
                                                        />
                                                    </td>
                                                )}
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    {editingSerialStudentId === student.id ? (
                                                        <input 
                                                            autoFocus type="text" value={editingSerialValue} onChange={e => setEditingSerialValue(e.target.value)}
                                                            onBlur={() => saveStudentSerial(student.id, editingSerialValue)}
                                                            onKeyDown={e => e.key === 'Enter' && saveStudentSerial(student.id, editingSerialValue)}
                                                            style={{ width: '45px', padding: '0.1rem 0.3rem', border: '2px solid #7c3aed', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 800 }}
                                                        />
                                                    ) : (
                                                        <div onClick={() => { setEditingSerialStudentId(student.id); setEditingSerialValue(student.serialNumber || ''); }}
                                                             style={{ cursor: 'pointer', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', borderRadius: '4px', width: '32px', textAlign: 'center' }}>
                                                            {student.serialNumber || '—'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.85rem' }}>{student.id}</td>
                                                <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{student.name}</td>
                                                <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>{student.fatherName || student.admissions?.[0]?.fatherName || '—'}</td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                        {stuTrack && <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{stuTrack}</span>}
                                                        {stuSubTrack && <span style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{stuSubTrack}</span>}
                                                        {stuGroup && <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>🏆 {stuGroup}</span>}
                                                        {!stuTrack && !stuSubTrack && !stuGroup && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: (student.gender || student.admissions?.[0]?.gender) === 'Male' ? '#2563eb' : '#db2777' }}>
                                                        {(student.gender || student.admissions?.[0]?.gender) === 'Male' ? '👦 Boy' : '👧 Girl'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                        <button title="Print Student Credential Card" onClick={() => exportPasswordsPDF(viewingClass, [student])} className="btn icon-btn" style={{ color: '#059669' }}><Key size={15} /></button>
                                                        <button title="Edit Student" onClick={() => { setEditingStudentId(student.id); setEditStudentData(JSON.parse(JSON.stringify(student))); }} className="btn icon-btn" style={{ color: '#2563eb' }}><Edit3 size={15} /></button>
                                                        <button title="Delete Student" onClick={() => { 
                                                            if(window.confirm(`Are you sure you want to PERMANENTLY delete ${student.name}? This cannot be undone.`)) {
                                                                deleteStudent(student.id);
                                                                showSaveMessage(`Student ${student.name} deleted permanently.`);
                                                            }
                                                        }} className="btn icon-btn" style={{ color: '#ef4444' }}><Trash2 size={15} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeSectionTab === 'all' ? (
                    /* ── GLOBAL STUDENT VIEW ── */
                    <div className="card animate-fade-in" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>Global Student Index</h3>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Students: {students.length}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button onClick={() => { setIsBulkEditing(!isBulkEditing); setBulkSelection([]); }} className="btn"
                                    style={{ background: isBulkEditing ? '#3b82f6' : '#f8fafc', color: isBulkEditing ? 'white' : '#2563eb', borderColor: '#bfdbfe', padding: '0.4rem 0.75rem', fontSize: '0.85rem', height: '38px' }}>
                                    {isBulkEditing ? 'Cancel Bulk' : <><Check size={15} /> Bulk Actions</>}
                                </button>
                                <div style={{ position: 'relative', width: '220px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="text" placeholder="Global search..." value={classListSearch} onChange={e => setClassListSearch(e.target.value)} className="form-input" style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }} />
                                </div>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ width: '130px', borderRadius: '8px', background: 'white', fontSize: '0.85rem' }}>
                                    <option value="active">🟢 Active</option>
                                    <option value="left">🔴 Inactive</option>
                                    <option value="graduated">🎓 Passout</option>
                                </select>
                                <select value={selectedClassForList} onChange={e => setSelectedClassForList(e.target.value)} className="form-input" style={{ width: '160px', borderRadius: '8px', background: 'white', fontSize: '0.85rem' }}>
                                    <option value="">All Classes</option>
                                    {(CLASSES || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>
                                        {isBulkEditing && (
                                            <th style={{ padding: '0.75rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            const filteredIds = students
                                                                .filter(s => (s.status || 'active') === statusFilter)
                                                                .filter(s => !selectedClassForList || getBaseClass(s.grade) === getBaseClass(selectedClassForList))
                                                                .filter(s => {
                                                                    if(!classListSearch) return true;
                                                                    const q = classListSearch.toLowerCase();
                                                                    return s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q) || (s.admissions?.[0]?.fatherName || '').toLowerCase().includes(q);
                                                                })
                                                                .map(s => s.id);
                                                            setBulkSelection(filteredIds);
                                                        } else {
                                                            setBulkSelection([]);
                                                        }
                                                    }}
                                                    checked={bulkSelection.length > 0 && bulkSelection.length === students.filter(s => (s.status || 'active') === statusFilter && (!selectedClassForList || getBaseClass(s.grade) === getBaseClass(selectedClassForList)) && (!classListSearch || (s.name?.toLowerCase().includes(classListSearch.toLowerCase()) || s.id?.toLowerCase().includes(classListSearch.toLowerCase()) || (s.admissions?.[0]?.fatherName || '').toLowerCase().includes(classListSearch.toLowerCase())))).length}
                                                />
                                            </th>
                                        )}
                                        <th style={{ padding: '0.75rem' }}>ID</th>
                                        <th style={{ padding: '0.75rem' }}>Name</th>
                                        <th style={{ padding: '0.75rem' }}>Class</th>
                                        <th style={{ padding: '0.75rem' }}>Gender</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students
                                        .filter(s => (s.status || 'active') === statusFilter)
                                        .filter(s => !selectedClassForList || getBaseClass(s.grade) === getBaseClass(selectedClassForList))
                                        .filter(s => {
                                            if(!classListSearch) return true;
                                            const q = classListSearch.toLowerCase();
                                            return s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q) || (s.admissions?.[0]?.fatherName || '').toLowerCase().includes(q);
                                        })
                                        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
                                        .map(student => (
                                            <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                {isBulkEditing && (
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={bulkSelection.includes(student.id)} 
                                                            onChange={() => setBulkSelection(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])} 
                                                        />
                                                    </td>
                                                )}
                                                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{student.id}</td>
                                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{student.name}</td>
                                                <td style={{ padding: '0.75rem' }}><span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>{student.grade}</span></td>
                                                <td style={{ padding: '0.75rem' }}>{student.admissions?.[0]?.gender}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                        <button onClick={() => { setViewingClass(student.grade); setSelectedClassForList(student.grade); }} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#7c3aed', border: '1px solid #ddd6fe' }}>View Class</button>
                                                        <button onClick={() => { setEditingStudentId(student.id); setEditStudentData(JSON.parse(JSON.stringify(student))); }} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#2563eb', border: '1px solid #bfdbfe' }}><Edit3 size={12} /> Edit</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Bulk Action Bar for Global Index */}
                        {isBulkEditing && bulkSelection.length > 0 && (
                            <div style={{ position: 'sticky', bottom: '0', background: 'white', border: '2.5px solid #2563eb', borderRadius: '12px', padding: '1rem', marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', boxShadow: '0 10px 25px rgba(37,99,235,0.2)', zIndex: 100 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e40af' }}>{bulkSelection.length} Selected</div>
                                <div style={{ flex: 1, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <select value={bulkTargetClass} onChange={e => setBulkTargetClass(e.target.value)} className="form-input" style={{ width: '160px', fontSize: '0.85rem', height: '38px' }}>
                                        <option value="">Move to Class...</option>
                                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select value={bulkTargetStatus} onChange={e => setBulkTargetStatus(e.target.value)} className="form-input" style={{ width: '160px', fontSize: '0.85rem', height: '38px' }}>
                                        <option value="">Set Status...</option>
                                        <option value="active">Active</option>
                                        <option value="left">Inactive (Left)</option>
                                        <option value="graduated">Passout</option>
                                    </select>
                                </div>
                                <button onClick={handleApplyBulk} className="btn btn-primary" style={{ height: '38px', padding: '0 1.5rem' }}>
                                    Apply to All
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── SECTION VIEW (read-only) ── */
                    <div className="animate-fade-in">
                        {(() => {
                            const sec = SECTIONS.find(s => s.id === activeSectionTab);
                            if (!sec) return <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Select a section above</div>;
                            return (
                                <>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.25rem' }}>{sec.name}</h3>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{sec.classes.length} Classes &bull; To add or remove classes, use <strong>Academic Settings</strong>.</div>
                                    </div>
                                    {(() => {
                                        const uniqueBaseClasses = Array.from(new Set((sec.classes || []).map(c => getBaseClass(c)).filter(Boolean)));
                                        if (uniqueBaseClasses.length === 0) {
                                            return (
                                                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                                    No classes in this section yet. Go to <strong>Academic Settings</strong> to add classes.
                                                </div>
                                            );
                                        }
                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                                {uniqueBaseClasses.map(cls => {
                                                    const activeCount = filterStudentsByHierarchy(students, { baseClass: cls, status: 'active' }).length;
                                                    const tracks = CLASS_TRACKS?.[cls] || getPreset(sec.name).subjectGroups || [];
                                                    const groups = CLASS_GROUPS?.[cls] || [];
                                                    return (
                                                        <div
                                                            key={cls}
                                                            onClick={() => { setViewingClass(cls); setSelectedClassForList(cls); setRosterTrack('all'); setRosterSubTrack('all'); setRosterGroup('all'); }}
                                                            className="card"
                                                            style={{ padding: '1.25rem', cursor: 'pointer', border: '1.5px solid #e2e8f0', transition: 'all 0.2s', borderTop: '4px solid #2563eb', borderRadius: '12px' }}
                                                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                                                        >
                                                            <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0f172a', marginBottom: '0.25rem' }}>{cls}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.6rem' }}>
                                                                {activeCount} active student{activeCount !== 1 ? 's' : ''}
                                                            </div>
                                                            {tracks.length > 0 && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                                                    {tracks.map(trk => (
                                                                        <span key={trk} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                                                                            {trk}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {groups.length > 0 && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                                                    {groups.map(g => (
                                                                        <span key={g} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#fffbeb', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a' }}>
                                                                            🏆 {g}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                View Roster →
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </>
                            );
                        })()}
                    </div>
                )
            }
            </div>
        </div>
    );
};

export default ClassListsTab;
