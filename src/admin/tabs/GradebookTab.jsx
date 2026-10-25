import React, { useState, useMemo } from 'react';
import { Save, Download, Upload, Users, PlusCircle, X, Edit3, Check, Filter, Layers, Award } from 'lucide-react';
import {
    calcGrade, gradeColor, calcOverallPct, getTermResults, filterByGender,
    SECTION_PRESETS, getPreset, getBaseClass, filterStudentsByHierarchy,
    canonicalSubjectName, dedupeSubjectsList, getTrackSubjects
} from '../utils/gradeUtils';

const GradebookTab = ({
    students, selectedClass, setSelectedClass, sectionClasses,
    SECTIONS, CLASSES, CLASS_TRACKS, CLASS_SUBTRACKS, CLASS_GROUPS,
    TERMS, SUBJECTS, WEIGHTS, EXCLUSIONS,
    gbTerm, setGbTerm, gbGenderTab, setGbGenderTab,
    gbEdits, setGbEdits, gbSaving, showGbStats, setShowGbStats,
    showGbSettings, setShowGbSettings,
    newSubjectInput, setNewSubjectInput, newTermInput, setNewTermInput,
    updateClassSubjects, updateClassTerms, updateTerms, updateWeights, updateExclusions,
    saveGradebook, downloadGradebookTemplate, exportGradebookExcel,
    archiveTerm, exportResultPDF, importGradebookExcel,
    gbImportFileRef, getCellValue, handleCellEdit, saveRemarks,
    renameSubject, updateSubjectsForClasses, migrateWeightsToClassScoped
}) => {
    // ── Hierarchy Filters ──
    const [selectedTrack, setSelectedTrack] = useState('all');
    const [selectedSubTrack, setSelectedSubTrack] = useState('all');
    const [selectedGroup, setSelectedGroup] = useState('all');

    const baseClass = getBaseClass(selectedClass) || selectedClass || '9th';

    // Find current section
    const allSections = SECTIONS && SECTIONS.length > 0 ? SECTIONS : [
        { id: '1', name: 'Primary', classes: ['Nursery', 'K.G', '1st', '2nd', '3rd', '4th', '5th'] },
        { id: '2', name: 'Middle', classes: ['6th', '7th', '8th'] },
        { id: '3', name: 'Matric', classes: ['9th', '10th'] },
        { id: '4', name: 'Intermediate', classes: ['1st Year', '2nd Year'] },
        { id: '5', name: 'BS (Hons)', classes: ['BSCS', 'BS English', 'BS Math'] }
    ];

    const currentSection = allSections.find(sec =>
        (sec.classes || []).some(c => getBaseClass(c) === baseClass)
    ) || allSections[0];

    const sectionPreset = getPreset(currentSection?.name || '');

    // Available tracks for current base class
    const availableTracks = useMemo(() => {
        if (CLASS_TRACKS?.[baseClass] && Array.isArray(CLASS_TRACKS[baseClass])) {
            return CLASS_TRACKS[baseClass];
        }
        return sectionPreset.subjectGroups || [];
    }, [baseClass, CLASS_TRACKS, sectionPreset]);

    // Available sub-tracks (for ICS / Humanities)
    const availableSubTracks = useMemo(() => {
        if (selectedTrack === 'all') return [];
        const trackKey = `${baseClass} ${selectedTrack}`;
        // Use only the composite key — never fall back to bare track name (inconsistent with save path)
        if (CLASS_SUBTRACKS?.[trackKey] !== undefined) return CLASS_SUBTRACKS[trackKey] || [];
        // If no composite key saved yet, show preset defaults (all sub-tracks available)
        return sectionPreset.subTrackConfig?.[selectedTrack] || [];
    }, [baseClass, selectedTrack, CLASS_SUBTRACKS, sectionPreset]);

    // Available custom groups (Quaid, Iqbal, etc.)
    const availableGroups = useMemo(() => {
        return CLASS_GROUPS?.[baseClass] || [];
    }, [baseClass, CLASS_GROUPS]);

    // Subjects and Terms lookup (supports baseClass fallback and deduplication)
    const classSubjects = dedupeSubjectsList(SUBJECTS && !Array.isArray(SUBJECTS)
        ? (SUBJECTS[selectedClass] || SUBJECTS[baseClass] || [])
        : (Array.isArray(SUBJECTS) ? SUBJECTS : []));
    const classTerms = (TERMS && !Array.isArray(TERMS)
        ? (TERMS[selectedClass] || TERMS[baseClass] || [])
        : (Array.isArray(TERMS) ? TERMS : []));

    const handleUpdateClassTerms = (newList) => {
        if (updateClassTerms) {
            updateClassTerms(newList);
        } else if (updateTerms) {
            const current = typeof TERMS === 'object' && !Array.isArray(TERMS) ? TERMS : {};
            updateTerms({ ...current, [baseClass]: newList, ...(selectedClass && selectedClass !== baseClass ? { [selectedClass]: newList } : {}) });
        }
    };

    const isExcluded = (sub, term) => {
        const t = term || gbTerm || classTerms[0] || 'Current';
        if (!selectedClass || !EXCLUSIONS) return false;
        const canon = canonicalSubjectName(sub);
        const lower = canon.toLowerCase();
        const rawLower = String(sub).toLowerCase();
        return !!(
            EXCLUSIONS[selectedClass]?.[t]?.[sub] || 
            EXCLUSIONS[baseClass]?.[t]?.[sub] ||
            EXCLUSIONS[selectedClass]?.[t]?.[canon] || 
            EXCLUSIONS[baseClass]?.[t]?.[canon] ||
            EXCLUSIONS[selectedClass]?.[t]?.[lower] || 
            EXCLUSIONS[baseClass]?.[t]?.[lower] ||
            EXCLUSIONS[selectedClass]?.[t]?.[rawLower] || 
            EXCLUSIONS[baseClass]?.[t]?.[rawLower]
        );
    };

    const classSubjectsVisible = dedupeSubjectsList(classSubjects.filter(sub => !isExcluded(sub)));
    const [editingSubject, setEditingSubject] = useState(null); // { oldName, newName }
    const [addSubjectClasses, setAddSubjectClasses] = useState([]); // selected additional classes
    const [showClassPicker, setShowClassPicker] = useState(false);

    const getSubjectTotal = (sub, term) => {
        const t = term || gbTerm || classTerms[0] || 'Current';
        const canon = canonicalSubjectName(sub);
        if (WEIGHTS) {
            const classW = WEIGHTS[selectedClass] || WEIGHTS[baseClass];
            if (classW && classW[t] && typeof classW[t] === 'object') {
                if (classW[t][canon] !== undefined && classW[t][canon] !== '') return Number(classW[t][canon]);
                if (classW[t][sub] !== undefined && classW[t][sub] !== '') return Number(classW[t][sub]);
            }
            if (classW && typeof classW[canon] === 'number') return Number(classW[canon]);
            if (classW && typeof classW[sub] === 'number') return Number(classW[sub]);
            if (WEIGHTS[t] && typeof WEIGHTS[t] === 'object') {
                if (WEIGHTS[t][canon] !== undefined && WEIGHTS[t][canon] !== '') return Number(WEIGHTS[t][canon]);
                if (WEIGHTS[t][sub] !== undefined && WEIGHTS[t][sub] !== '') return Number(WEIGHTS[t][sub]);
            }
            if (typeof WEIGHTS[canon] === 'number') return Number(WEIGHTS[canon]);
            if (typeof WEIGHTS[sub] === 'number') return Number(WEIGHTS[sub]);
        }
        return 100;
    };

    // Filter students by baseClass, track, subTrack, customGroup, and gender
    const allClassStudents = filterStudentsByHierarchy(students, {
        baseClass,
        track: selectedTrack,
        subTrack: selectedSubTrack,
        group: selectedGroup,
        status: 'active'
    });

    const classStudents = filterStudentsByHierarchy(students, {
        baseClass,
        track: selectedTrack,
        subTrack: selectedSubTrack,
        group: selectedGroup,
        gender: gbGenderTab,
        status: 'active'
    }).slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    const termLabel = gbTerm;

    const subjectStats = classSubjectsVisible.map(sub => {
        const subTotal = getSubjectTotal(sub);
        const canonSub = canonicalSubjectName(sub);
        const vals = classStudents.map(s => {
            const termResults = getTermResults(s, termLabel);
            const r = termResults.find(r => canonicalSubjectName(r.subject).toLowerCase() === canonSub.toLowerCase() || r.subject === sub);
            const edited = gbEdits[s.id]?.[canonSub] !== undefined ? gbEdits[s.id][canonSub] : gbEdits[s.id]?.[sub];
            const rawVal = edited !== undefined ? edited : (r?.obtained ?? null);
            if (rawVal === null || rawVal === undefined || rawVal === '') return null;
            if (rawVal === 'A' || rawVal === 'a' || String(rawVal).toLowerCase() === 'absent') return 0;
            const num = Number(rawVal);
            if (isNaN(num)) return null;
            return subTotal > 0 ? Math.round((num / subTotal) * 100) : 0;
        }).filter(v => v !== null && !isNaN(v));
        const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        const high = vals.length ? Math.max(...vals) : 0;
        const pass = vals.filter(v => v >= 40).length;
        return { sub, avg, high, pass, total: vals.length };
    });

    const overallAvg = classStudents.length ? Math.round(
        classStudents.reduce((sum, s) => {
            const res = getTermResults(s, termLabel);
            return sum + calcOverallPct(res, getSubjectTotal);
        }, 0) / classStudents.length
    ) : 0;

    const passCount = classStudents.filter(s => {
        const res = getTermResults(s, termLabel);
        return calcOverallPct(res, getSubjectTotal) >= 40;
    }).length;

    const boysCount = filterStudentsByHierarchy(students, {
        baseClass,
        track: selectedTrack,
        subTrack: selectedSubTrack,
        group: selectedGroup,
        gender: 'boys',
        status: 'active'
    }).length;

    const girlsCount = filterStudentsByHierarchy(students, {
        baseClass,
        track: selectedTrack,
        subTrack: selectedSubTrack,
        group: selectedGroup,
        gender: 'girls',
        status: 'active'
    }).length;

    // Helper to get sub-tracks configured for a given track
    const getSubTracksForTrack = (trk) => {
        if (!trk || trk === 'all') return [];
        const trackKey = `${baseClass} ${trk}`;
        if (CLASS_SUBTRACKS?.[trackKey] !== undefined && Array.isArray(CLASS_SUBTRACKS[trackKey])) {
            return CLASS_SUBTRACKS[trackKey];
        }
        return sectionPreset.subTrackConfig?.[trk] || [];
    };

    // Track groups to render as separate boxes
    const trackGroupsToRender = useMemo(() => {
        const groups = [];

        const getDisplaySubTrackName = (trk, st) => {
            if (trk === 'Humanities' || trk === 'FA') {
                if (st === 'FA' || st === 'Simple' || st === 'FA Simple') return 'FA Simple';
                if (st === 'FAIT' || st === 'FA IT' || st === 'IT') return 'FAIT';
            }
            if (trk === 'Arts') {
                if (st === 'Simple Arts' || st === 'Arts') return 'Simple Arts';
                if (st === 'Computer Arts') return 'Computer Arts';
            }
            return st;
        };

        // Case 1: Specific track selected (e.g. "Pre-Medical" or "ICS" or "Humanities")
        if (selectedTrack !== 'all') {
            const subTracks = getSubTracksForTrack(selectedTrack);

            // If a specific sub-track was explicitly filtered (e.g. ICS -> Physics)
            if (selectedSubTrack !== 'all') {
                const subjects = getTrackSubjects(baseClass, selectedTrack, selectedSubTrack, classSubjectsVisible, classStudents, gbEdits, getCellValue);
                const displaySub = getDisplaySubTrackName(selectedTrack, selectedSubTrack);
                return [{
                    trackKey: `${selectedTrack}-${selectedSubTrack}`,
                    trackName: `${selectedTrack} (${displaySub})`,
                    students: classStudents,
                    subjects
                }];
            }

            // If "All Sub-tracks" is selected for this track and it has sub-tracks:
            if (subTracks.length > 0) {
                const matchedStudentIds = new Set();

                subTracks.forEach(st => {
                    const subStudents = filterStudentsByHierarchy(students, {
                        baseClass,
                        track: selectedTrack,
                        subTrack: st,
                        group: selectedGroup,
                        gender: gbGenderTab,
                        status: 'active'
                    }).slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

                    if (subStudents.length > 0) {
                        subStudents.forEach(s => matchedStudentIds.add(s.id));
                        const subjects = getTrackSubjects(baseClass, selectedTrack, st, classSubjectsVisible, subStudents, gbEdits, getCellValue);
                        const displaySub = getDisplaySubTrackName(selectedTrack, st);
                        groups.push({
                            trackKey: `${selectedTrack}-${st}`,
                            trackName: `${selectedTrack} (${displaySub})`,
                            students: subStudents,
                            subjects
                        });
                    }
                });

                // Catch unassigned students in this track and assign to primary sub-track
                const unassignedTrackStudents = classStudents.filter(s => !matchedStudentIds.has(s.id));
                if (unassignedTrackStudents.length > 0) {
                    const fallbackSub = subTracks[0] || 'Physics';
                    const subjects = getTrackSubjects(baseClass, selectedTrack, fallbackSub, classSubjectsVisible, unassignedTrackStudents, gbEdits, getCellValue);
                    const displaySub = getDisplaySubTrackName(selectedTrack, fallbackSub);
                    const existingGroup = groups.find(g => g.trackKey === `${selectedTrack}-${fallbackSub}`);
                    if (existingGroup) {
                        existingGroup.students = [...existingGroup.students, ...unassignedTrackStudents].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
                    } else {
                        groups.push({
                            trackKey: `${selectedTrack}-${fallbackSub}`,
                            trackName: `${selectedTrack} (${displaySub})`,
                            students: unassignedTrackStudents,
                            subjects
                        });
                    }
                }

                if (groups.length > 0) return groups;
            }

            // Track without sub-tracks (e.g. Pre-Medical, Pre-Engineering)
            const subjects = getTrackSubjects(baseClass, selectedTrack, 'all', classSubjectsVisible, classStudents, gbEdits, getCellValue);
            return [{
                trackKey: selectedTrack,
                trackName: selectedTrack,
                students: classStudents,
                subjects
            }];
        }

        // Case 2: "All Tracks" is selected
        if (availableTracks && availableTracks.length > 0) {
            const allMatchedStudentIds = new Set();

            availableTracks.forEach(trk => {
                const subTracks = getSubTracksForTrack(trk);

                if (subTracks.length > 0 && selectedSubTrack === 'all') {
                    // Split track into sub-track boxes (e.g. ICS Physics, ICS Economics, ICS Stats, Humanities FAIT, Humanities FA Simple)
                    subTracks.forEach(st => {
                        const subStudents = filterStudentsByHierarchy(students, {
                            baseClass,
                            track: trk,
                            subTrack: st,
                            group: selectedGroup,
                            gender: gbGenderTab,
                            status: 'active'
                        }).slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

                        if (subStudents.length > 0) {
                            subStudents.forEach(s => allMatchedStudentIds.add(s.id));
                            const subjects = getTrackSubjects(baseClass, trk, st, classSubjectsVisible, subStudents, gbEdits, getCellValue);
                            const displaySub = getDisplaySubTrackName(trk, st);
                            groups.push({
                                trackKey: `${trk}-${st}`,
                                trackName: `${trk} (${displaySub})`,
                                students: subStudents,
                                subjects
                            });
                        }
                    });

                    // Any students in this track without a matched sub-track
                    const unassignedInTrack = filterStudentsByHierarchy(students, {
                        baseClass,
                        track: trk,
                        group: selectedGroup,
                        gender: gbGenderTab,
                        status: 'active'
                    }).filter(s => !allMatchedStudentIds.has(s.id))
                      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

                    if (unassignedInTrack.length > 0) {
                        unassignedInTrack.forEach(s => allMatchedStudentIds.add(s.id));
                        const fallbackSub = subTracks[0] || 'Physics';
                        const subjects = getTrackSubjects(baseClass, trk, fallbackSub, classSubjectsVisible, unassignedInTrack, gbEdits, getCellValue);
                        const displaySub = getDisplaySubTrackName(trk, fallbackSub);
                        const existingGroup = groups.find(g => g.trackKey === `${trk}-${fallbackSub}`);
                        if (existingGroup) {
                            existingGroup.students = [...existingGroup.students, ...unassignedInTrack].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
                        } else {
                            groups.push({
                                trackKey: `${trk}-${fallbackSub}`,
                                trackName: `${trk} (${displaySub})`,
                                students: unassignedInTrack,
                                subjects
                            });
                        }
                    }
                } else {
                    // Normal track without sub-tracks (e.g. Pre-Medical, Pre-Engineering, Biology, Computer)
                    const trackStudents = filterStudentsByHierarchy(students, {
                        baseClass,
                        track: trk,
                        subTrack: selectedSubTrack,
                        group: selectedGroup,
                        gender: gbGenderTab,
                        status: 'active'
                    }).slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

                    if (trackStudents.length > 0) {
                        trackStudents.forEach(s => allMatchedStudentIds.add(s.id));
                        const subjects = getTrackSubjects(baseClass, trk, selectedSubTrack, classSubjectsVisible, trackStudents, gbEdits, getCellValue);
                        groups.push({
                            trackKey: trk,
                            trackName: trk,
                            students: trackStudents,
                            subjects
                        });
                    }
                }
            });

            // Catch any students who are not in one of the defined tracks (unassigned / general)
            const unassignedStudents = classStudents.filter(s => !allMatchedStudentIds.has(s.id));
            if (unassignedStudents.length > 0) {
                const subjects = getTrackSubjects(baseClass, 'all', 'all', classSubjectsVisible, unassignedStudents, gbEdits, getCellValue);
                groups.push({
                    trackKey: 'General',
                    trackName: 'General / Other',
                    students: unassignedStudents,
                    subjects
                });
            }

            if (groups.length > 0) return groups;
        }

        // Fallback for classes with no tracks (e.g. Primary/Middle classes like 1st, 2nd, 6th)
        return [{
            trackKey: 'all',
            trackName: selectedClass,
            students: classStudents,
            subjects: classSubjectsVisible
        }];
    }, [selectedTrack, availableTracks, classStudents, classSubjectsVisible, baseClass, selectedSubTrack, selectedGroup, gbGenderTab, students, gbEdits, getCellValue, selectedClass, CLASS_SUBTRACKS, sectionPreset]);

    // Navigation section switch
    const handleSelectSection = (sec) => {
        const firstCls = sec.classes && sec.classes.length > 0 ? getBaseClass(sec.classes[0]) : '';
        if (firstCls) {
            setSelectedClass(firstCls);
            setSelectedTrack('all');
            setSelectedSubTrack('all');
            setSelectedGroup('all');
            setGbEdits({});
        }
    };

    // Base class switch
    const handleSelectBaseClass = (cls) => {
        setSelectedClass(getBaseClass(cls));
        setSelectedTrack('all');
        setSelectedSubTrack('all');
        setSelectedGroup('all');
        setGbEdits({});
    };

    return (
        <div className="animate-fade-in">
            <input type="file" ref={gbImportFileRef} onChange={importGradebookExcel} accept=".xlsx,.xls" style={{ display: 'none' }} />

            {/* Header & Settings Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.55rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>📝 Manage Exams</h2>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                        Cascading selection: Section ➔ Class ➔ Track ➔ Sub-track ➔ Group
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowGbSettings(s => !s)} className={`btn ${showGbSettings ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        ⚙️ Setup Subjects & Terms {showGbSettings ? '▲' : '▼'}
                    </button>
                </div>
            </div>

            {/* ── CASCADING FILTER NAVIGATION CARD ── */}
            <div className="card" style={{ padding: '1.1rem 1.3rem', marginBottom: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 15px -2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

                    {/* Tier 1: Section Navigation Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '85px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Layers size={13} style={{ color: '#2563eb' }} /> Section:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {allSections.map(sec => {
                                const isCurrent = currentSection?.id === sec.id || (sec.classes || []).some(c => getBaseClass(c) === baseClass);
                                return (
                                    <button
                                        key={sec.id}
                                        onClick={() => handleSelectSection(sec)}
                                        style={{
                                            padding: '0.35rem 0.85rem',
                                            borderRadius: '8px',
                                            border: `1.5px solid ${isCurrent ? '#2563eb' : '#e2e8f0'}`,
                                            background: isCurrent ? '#eff6ff' : '#f8fafc',
                                            color: isCurrent ? '#1d4ed8' : '#64748b',
                                            fontWeight: isCurrent ? 800 : 600,
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {sec.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tier 2: Base Class Selection Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: (availableTracks.length > 0 || availableGroups.length > 0) ? '1px solid #f1f5f9' : 'none', paddingBottom: (availableTracks.length > 0 || availableGroups.length > 0) ? '0.75rem' : 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '85px' }}>
                            Class:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {((currentSection?.classes && currentSection.classes.length > 0) ? currentSection.classes : sectionClasses)
                                .map(c => getBaseClass(c))
                                .filter((c, i, arr) => arr.indexOf(c) === i)
                                .map(cls => {
                                    const isCurrent = baseClass === cls;
                                    const stuCount = filterStudentsByHierarchy(students, { baseClass: cls, status: 'active' }).length;
                                    return (
                                        <button
                                            key={cls}
                                            onClick={() => handleSelectBaseClass(cls)}
                                            style={{
                                                padding: '0.35rem 0.85rem',
                                                borderRadius: '8px',
                                                border: `1.5px solid ${isCurrent ? '#1e293b' : '#e2e8f0'}`,
                                                background: isCurrent ? '#0f172a' : 'white',
                                                color: isCurrent ? 'white' : '#334155',
                                                fontWeight: 800,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.45rem',
                                                transition: 'all 0.15s',
                                                boxShadow: isCurrent ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                                            }}
                                        >
                                            {cls}
                                            <span style={{
                                                fontSize: '0.68rem',
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '999px',
                                                background: isCurrent ? '#334155' : '#e2e8f0',
                                                color: isCurrent ? 'white' : '#475569',
                                                fontWeight: 700
                                            }}>
                                                {stuCount}
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Tier 3: Subject Track Selection (e.g. Biology / Computer or Pre-Medical / ICS / FA) */}
                    {availableTracks.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: (availableSubTracks.length > 0 || availableGroups.length > 0) ? '1px solid #f1f5f9' : 'none', paddingBottom: (availableSubTracks.length > 0 || availableGroups.length > 0) ? '0.75rem' : 0 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '85px' }}>
                                Group / Track:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                <button
                                    onClick={() => { setSelectedTrack('all'); setSelectedSubTrack('all'); }}
                                    style={{
                                        padding: '0.3rem 0.75rem',
                                        borderRadius: '6px',
                                        border: `1.5px solid ${selectedTrack === 'all' ? '#059669' : '#e2e8f0'}`,
                                        background: selectedTrack === 'all' ? '#ecfdf5' : '#f8fafc',
                                        color: selectedTrack === 'all' ? '#047857' : '#64748b',
                                        fontWeight: selectedTrack === 'all' ? 800 : 600,
                                        fontSize: '0.78rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All Tracks ({filterStudentsByHierarchy(students, { baseClass, status: 'active' }).length})
                                </button>
                                {availableTracks.map(trk => {
                                    const isCurrent = selectedTrack.toLowerCase() === trk.toLowerCase();
                                    const trkCount = filterStudentsByHierarchy(students, { baseClass, track: trk, status: 'active' }).length;
                                    return (
                                        <button
                                            key={trk}
                                            onClick={() => { setSelectedTrack(trk); setSelectedSubTrack('all'); }}
                                            style={{
                                                padding: '0.3rem 0.75rem',
                                                borderRadius: '6px',
                                                border: `1.5px solid ${isCurrent ? '#059669' : '#e2e8f0'}`,
                                                background: isCurrent ? '#059669' : 'white',
                                                color: isCurrent ? 'white' : '#334155',
                                                fontWeight: 800,
                                                fontSize: '0.78rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            }}
                                        >
                                            {trk}
                                            <span style={{
                                                fontSize: '0.65rem',
                                                padding: '0.05rem 0.35rem',
                                                borderRadius: '999px',
                                                background: isCurrent ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                                                color: isCurrent ? 'white' : '#64748b',
                                                fontWeight: 700
                                            }}>
                                                {trkCount}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tier 4: Sub-Tracks (for ICS: Physics / Economics / Statistics; FA: IT / Simple) */}
                    {availableSubTracks.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderBottom: availableGroups.length > 0 ? '1px solid #f1f5f9' : 'none', paddingBottom: availableGroups.length > 0 ? '0.75rem' : 0 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '85px' }}>
                                Sub-Parts:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                <button
                                    onClick={() => setSelectedSubTrack('all')}
                                    style={{
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '6px',
                                        border: `1.5px solid ${selectedSubTrack === 'all' ? '#7c3aed' : '#e2e8f0'}`,
                                        background: selectedSubTrack === 'all' ? '#f5f3ff' : '#f8fafc',
                                        color: selectedSubTrack === 'all' ? '#6d28d9' : '#64748b',
                                        fontWeight: selectedSubTrack === 'all' ? 800 : 600,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All Sub-Parts
                                </button>
                                {availableSubTracks.map(sub => {
                                    const isCurrent = selectedSubTrack.toLowerCase() === sub.toLowerCase();
                                    const subCount = filterStudentsByHierarchy(students, { baseClass, track: selectedTrack, subTrack: sub, status: 'active' }).length;
                                    return (
                                        <button
                                            key={sub}
                                            onClick={() => setSelectedSubTrack(sub)}
                                            style={{
                                                padding: '0.25rem 0.65rem',
                                                borderRadius: '6px',
                                                border: `1.5px solid ${isCurrent ? '#7c3aed' : '#e2e8f0'}`,
                                                background: isCurrent ? '#7c3aed' : 'white',
                                                color: isCurrent ? 'white' : '#475569',
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            }}
                                        >
                                            {sub}
                                            <span style={{
                                                fontSize: '0.62rem',
                                                padding: '0.05rem 0.3rem',
                                                borderRadius: '999px',
                                                background: isCurrent ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                                                color: isCurrent ? 'white' : '#64748b'
                                            }}>
                                                {subCount}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tier 5: Custom Groups (Quaid / Iqbal) */}
                    {availableGroups.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '85px' }}>
                                Section / Group:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                <button
                                    onClick={() => setSelectedGroup('all')}
                                    style={{
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '6px',
                                        border: `1.5px solid ${selectedGroup === 'all' ? '#d97706' : '#e2e8f0'}`,
                                        background: selectedGroup === 'all' ? '#fffbeb' : '#f8fafc',
                                        color: selectedGroup === 'all' ? '#b45309' : '#64748b',
                                        fontWeight: selectedGroup === 'all' ? 800 : 600,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All Groups
                                </button>
                                {availableGroups.map(grp => {
                                    const isCurrent = selectedGroup === grp;
                                    const grpCount = filterStudentsByHierarchy(students, { baseClass, track: selectedTrack, subTrack: selectedSubTrack, group: grp, status: 'active' }).length;
                                    return (
                                        <button
                                            key={grp}
                                            onClick={() => setSelectedGroup(grp)}
                                            style={{
                                                padding: '0.25rem 0.65rem',
                                                borderRadius: '6px',
                                                border: `1.5px solid ${isCurrent ? '#d97706' : '#e2e8f0'}`,
                                                background: isCurrent ? '#d97706' : 'white',
                                                color: isCurrent ? 'white' : '#475569',
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.35rem'
                                            }}
                                        >
                                            🏆 {grp}
                                            <span style={{
                                                fontSize: '0.62rem',
                                                padding: '0.05rem 0.3rem',
                                                borderRadius: '999px',
                                                background: isCurrent ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                                                color: isCurrent ? 'white' : '#92400e'
                                            }}>
                                                {grpCount}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Panel */}
            {showGbSettings && (
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>⚙️ Gradebook Settings</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Subjects */}
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                Subjects <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 400 }}>— for "{selectedClass}"</span>
                            </div>
                            {/* Add Subject Row */}
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                <input className="form-input" placeholder="Add subject…" value={newSubjectInput}
                                    onChange={e => setNewSubjectInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newSubjectInput.trim()) {
                                            if (addSubjectClasses.length > 0 && updateSubjectsForClasses) {
                                                updateSubjectsForClasses(newSubjectInput.trim(), [selectedClass, ...addSubjectClasses]);
                                            } else {
                                                updateClassSubjects([...classSubjects, newSubjectInput.trim()]);
                                            }
                                            setNewSubjectInput(''); setAddSubjectClasses([]);
                                        }
                                    }}
                                    style={{ flex: 1, minWidth: '120px', padding: '0.35rem 0.6rem' }} />
                                <button className="btn" style={{ padding: '0.35rem 0.6rem', background: showClassPicker ? '#e0f2fe' : '#f8fafc', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '0.75rem', fontWeight: 600 }}
                                    onClick={() => setShowClassPicker(p => !p)} title="Also add to other classes">
                                    📚 +Classes {addSubjectClasses.length > 0 ? `(${addSubjectClasses.length})` : ''}
                                </button>
                                <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem' }}
                                    onClick={() => {
                                        if (!newSubjectInput.trim()) return;
                                        if (addSubjectClasses.length > 0 && updateSubjectsForClasses) {
                                            updateSubjectsForClasses(newSubjectInput.trim(), [selectedClass, ...addSubjectClasses]);
                                        } else {
                                            updateClassSubjects([...classSubjects, newSubjectInput.trim()]);
                                        }
                                        setNewSubjectInput(''); setAddSubjectClasses([]);
                                    }}>
                                    <PlusCircle size={14} />
                                </button>
                            </div>
                            {/* Multi-class picker */}
                            {showClassPicker && (
                                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', marginBottom: '0.4rem' }}>Also add to these classes:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {sectionClasses.filter(c => c !== selectedClass).map(c => (
                                            <button key={c} onClick={() => setAddSubjectClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                                                style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1.5px solid', background: addSubjectClasses.includes(c) ? '#0369a1' : 'white', color: addSubjectClasses.includes(c) ? 'white' : '#0369a1', borderColor: '#0369a1', transition: 'all 0.15s' }}>
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Subject chips with inline edit */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {classSubjects.map(s => (
                                    editingSubject && editingSubject.oldName === s ? (
                                        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
                                            <input autoFocus value={editingSubject.newName}
                                                onChange={e => setEditingSubject(p => ({ ...p, newName: e.target.value }))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && editingSubject.newName.trim()) {
                                                        if (renameSubject) renameSubject(editingSubject.oldName, editingSubject.newName.trim());
                                                        setEditingSubject(null);
                                                    }
                                                    if (e.key === 'Escape') setEditingSubject(null);
                                                }}
                                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 700, color: '#92400e', width: `${Math.max(60, editingSubject.newName.length * 8)}px` }} />
                                            <button onClick={() => { if (renameSubject && editingSubject.newName.trim()) renameSubject(editingSubject.oldName, editingSubject.newName.trim()); setEditingSubject(null); }}
                                                style={{ background: '#f59e0b', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', borderRadius: '50%', padding: '1px' }}><Check size={11} /></button>
                                            <button onClick={() => setEditingSubject(null)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                                        </span>
                                    ) : (
                                        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '999px', padding: '0.2rem 0.5rem 0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {s}
                                            <button onClick={() => setEditingSubject({ oldName: s, newName: s })} title="Rename subject"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', display: 'flex', alignItems: 'center', opacity: 0.7, padding: '1px' }}><Edit3 size={11} /></button>
                                            <button onClick={() => updateClassSubjects(classSubjects.filter(x => x !== s))}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><X size={12} /></button>
                                        </span>
                                    )
                                ))}
                                {classSubjects.length === 0 && <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No subjects yet. Add one above.</span>}
                            </div>
                        </div>
                        {/* Terms */}
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Terms</div>
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                <input className="form-input" placeholder="Add term…" value={newTermInput}
                                    onChange={e => setNewTermInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && newTermInput.trim()) { handleUpdateClassTerms([...classTerms, newTermInput.trim()]); setNewTermInput(''); } }}
                                    style={{ flex: 1, padding: '0.35rem 0.6rem' }} />
                                <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem' }}
                                    onClick={() => { if (newTermInput.trim()) { handleUpdateClassTerms([...classTerms, newTermInput.trim()]); setNewTermInput(''); } }}>
                                    <PlusCircle size={14} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {classTerms.map(t => (
                                    <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f3e8ff', color: '#7c3aed', borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                        {t}
                                        <button onClick={() => handleUpdateClassTerms(classTerms.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', display: 'flex', alignItems: 'center' }}><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Subject Totals */}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>📝 Subject Total Marks</div>
                            {gbTerm && (
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: '999px', padding: '0.15rem 0.6rem' }}>
                                    Grand Total: {classSubjectsVisible.reduce((s, sub) => s + getSubjectTotal(sub), 0)} marks
                                </span>
                            )}
                        </div>
                        {!gbTerm ? (
                            <div style={{ padding: '0.75rem', background: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: '8px', color: '#92400e', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                                ⚠️ Select a term from the main view first to set total marks for its subjects.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.5rem' }}>
                                {classSubjects.map(sub => {
                                    const currentTerm = gbTerm;
                                    const classW = WEIGHTS && WEIGHTS[selectedClass];
                                    const fallbackW = (classW && typeof classW[sub] === 'number') ? classW[sub] : 100;
                                    let currentW = fallbackW;

                                    if (classW && classW[currentTerm] && typeof classW[currentTerm] === 'object' && classW[currentTerm][sub] !== undefined) {
                                        currentW = classW[currentTerm][sub];
                                    } else if (WEIGHTS && WEIGHTS[currentTerm] && typeof WEIGHTS[currentTerm] === 'object' && WEIGHTS[currentTerm][sub] !== undefined) {
                                        currentW = WEIGHTS[currentTerm][sub];
                                    }

                                    const excluded = isExcluded(sub, currentTerm);

                                    return (
                                        <div key={sub} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.6rem', opacity: excluded ? 0.6 : 1 }}>
                                            <input type="checkbox" checked={!excluded} 
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    const termLabel = gbTerm || classTerms[0] || 'Current';
                                                    const newE = { ...EXCLUSIONS };
                                                    if (!newE[selectedClass]) newE[selectedClass] = {};
                                                    if (!newE[selectedClass][termLabel]) newE[selectedClass][termLabel] = {};
                                                    const canon = canonicalSubjectName(sub);
                                                    
                                                    if (checked) {
                                                        delete newE[selectedClass][termLabel][sub];
                                                        delete newE[selectedClass][termLabel][canon];
                                                        delete newE[selectedClass][termLabel][sub.toLowerCase()];
                                                        delete newE[selectedClass][termLabel][canon.toLowerCase()];
                                                        if (baseClass && newE[baseClass]?.[termLabel]) {
                                                            delete newE[baseClass][termLabel][sub];
                                                            delete newE[baseClass][termLabel][canon];
                                                            delete newE[baseClass][termLabel][sub.toLowerCase()];
                                                            delete newE[baseClass][termLabel][canon.toLowerCase()];
                                                        }
                                                    } else {
                                                        newE[selectedClass][termLabel][sub] = true;
                                                        newE[selectedClass][termLabel][canon] = true;
                                                        if (baseClass && baseClass !== selectedClass) {
                                                            if (!newE[baseClass]) newE[baseClass] = {};
                                                            if (!newE[baseClass][termLabel]) newE[baseClass][termLabel] = {};
                                                            newE[baseClass][termLabel][sub] = true;
                                                            newE[baseClass][termLabel][canon] = true;
                                                        }
                                                    }
                                                    updateExclusions(newE);
                                                }}
                                                title={excluded ? "Turn ON for this term" : "Turn OFF for this term"}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
                                            {!excluded && (
                                                <input type="number" min="1" max="9999" value={currentW} placeholder={fallbackW}
                                                    onChange={e => {
                                                        const rawVal = e.target.value;
                                                        const termLabel = gbTerm || classTerms[0] || 'Current';

                                                        // Class-scoped write: WEIGHTS[selectedClass][termLabel][sub]
                                                        const newW = { ...WEIGHTS };
                                                        // Clone the class entry
                                                        newW[selectedClass] = { ...(newW[selectedClass] || {}) };
                                                        // Clone the term entry inside the class
                                                        if (!newW[selectedClass][termLabel] || typeof newW[selectedClass][termLabel] !== 'object') {
                                                            newW[selectedClass][termLabel] = {};
                                                        } else {
                                                            newW[selectedClass][termLabel] = { ...newW[selectedClass][termLabel] };
                                                        }

                                                        if (rawVal === '') {
                                                            newW[selectedClass][termLabel][sub] = '';
                                                        } else {
                                                            newW[selectedClass][termLabel][sub] = Number(rawVal);
                                                        }
                                                        updateWeights(newW);
                                                    }}
                                                    style={{ width: '60px', padding: '0.25rem 0.35rem', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700 }}
                                                />
                                            )}
                                            {!excluded && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>pts</span>}
                                            {excluded && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>OFF</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {migrateWeightsToClassScoped && (
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={migrateWeightsToClassScoped} className="btn" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.8rem', padding: '0.4rem 0.8rem', fontWeight: 700 }}>
                                    ⚡ Migrate Old Global Weights
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Term Selection Grid */}
            {!termLabel && (
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
                            Select Term / Exam Type
                        </h3>
                    </div>
                    {classTerms.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            No terms added yet. Open settings above to add a new term.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                            {classTerms.map(term => {
                                const isSelected = termLabel === term;
                                return (
                                    <button
                                        key={term}
                                        onClick={() => { setGbTerm(term); setGbEdits({}); }}
                                        className="hover-scale"
                                        style={{
                                            padding: '1.75rem 1rem',
                                            borderRadius: '16px',
                                            border: isSelected ? '2px solid #2563eb' : '2px solid transparent',
                                            background: isSelected ? '#eff6ff' : 'white',
                                            color: isSelected ? '#1d4ed8' : '#475569',
                                            fontWeight: isSelected ? 800 : 600,
                                            fontSize: '1.1rem',
                                            boxShadow: isSelected ? '0 8px 20px rgba(37,99,235,0.15)' : '0 4px 12px rgba(0,0,0,0.05)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.75rem', transition: 'transform 0.3s' }} className={isSelected ? 'scale-110' : ''}>
                                            {isSelected ? '📂' : '📁'}
                                        </span>
                                        {term}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Active Term Detail Area */}
            {termLabel && classTerms.includes(termLabel) && (
                <div className="animate-slide-in" style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)' }}>
                    {/* Header of Term Area */}
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f8fafc, white)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button onClick={() => setGbTerm('')} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', color: '#64748b' }}>
                                ← Back
                            </button>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700 }}>{selectedClass}</span>
                                {termLabel} Results
                            </h3>
                        </div>
                    </div>

                    <div style={{ padding: '2rem' }}>
                        {/* Gender Tabs */}
                        <div style={{ display: 'flex', marginBottom: '1.5rem', borderRadius: '12px 12px 0 0', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            {[
                                { id: 'boys', label: '👦 Boys', count: boysCount, color: '#0369a1', bg: '#e0f2fe' },
                                { id: 'girls', label: '👧 Girls', count: girlsCount, color: '#be185d', bg: '#fce7f3' },
                                { id: 'all', label: '👥 All Students', count: allClassStudents.length, color: '#475569', bg: '#f1f5f9' }
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setGbGenderTab(tab.id)} style={{
                                    flex: 1, padding: '0.85rem 1rem', fontWeight: gbGenderTab === tab.id ? 800 : 600, fontSize: '0.95rem',
                                    color: gbGenderTab === tab.id ? tab.color : '#94a3b8',
                                    background: gbGenderTab === tab.id ? tab.bg : 'transparent', border: 'none',
                                    borderBottom: gbGenderTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
                                    cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                }}>
                                    {tab.label}
                                    <span style={{ background: gbGenderTab === tab.id ? tab.color : '#cbd5e1', color: 'white', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            <button onClick={saveGradebook} disabled={gbSaving} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                                <Save size={16} /> {gbSaving ? 'Saving…' : 'Save Details'}
                            </button>
                            <button onClick={downloadGradebookTemplate} className="btn" style={{ background: '#10b981', color: 'white', borderColor: '#10b981', padding: '0.5rem 1rem' }}>
                                <Download size={16} /> Template
                            </button>
                            <button onClick={() => gbImportFileRef.current.click()} className="btn" style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6', padding: '0.5rem 1rem' }}>
                                <Upload size={16} /> Import
                            </button>
                            <button onClick={exportGradebookExcel} className="btn" style={{ background: '#217346', color: 'white', borderColor: '#217346', padding: '0.5rem 1rem' }}>
                                <Download size={16} /> Export Term
                            </button>
                            <button onClick={() => exportResultPDF(
                                selectedTrack !== 'all' ? classStudents : null,
                                selectedTrack !== 'all' ? selectedTrack : 'all',
                                availableTracks,
                                selectedTrack,
                                selectedSubTrack,
                                groups
                            )} className="btn" style={{ background: '#dc2626', color: 'white', borderColor: '#dc2626', padding: '0.5rem 1rem' }}>
                                📄 PDF Reports
                            </button>
                        </div>

                        {/* Class Statistics */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <button onClick={() => setShowGbStats(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s', ...(showGbStats ? {} : { background: '#f8fafc', border: '1px solid #e2e8f0' }) }}>
                                📈 Class Statistics {showGbStats ? '▲' : '▼'}
                            </button>
                            {showGbStats && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                    <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white', borderRadius: '12px', padding: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.2rem' }}>Class Average</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{overallAvg}%</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{classStudents.length} students • {calcGrade(overallAvg)} overall</div>
                                    </div>
                                    <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', borderRadius: '12px', padding: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.2rem' }}>Pass Rate</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{classStudents.length ? Math.round((passCount / classStudents.length) * 100) : 0}%</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{passCount} / {classStudents.length} passed (≥40%)</div>
                                    </div>
                                    {subjectStats.map(({ sub, avg, high, pass, total }) => {
                                        const gc = gradeColor(avg);
                                        return (
                                            <div key={sub} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', color: '#1e293b' }}>{sub}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                                                    <span>Avg: <b style={{ color: gc.text }}>{avg}%</b></span>
                                                    <span>High: <b style={{ color: '#15803d' }}>{high}%</b></span>
                                                    <span>Pass: <b>{pass}/{total}</b></span>
                                                </div>
                                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '0.5rem' }}>
                                                    <div style={{ width: `${avg}%`, height: '100%', background: gc.text, borderRadius: '999px', transition: 'width 0.8s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Gradebook Table */}
                        {classStudents.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
                                <Users size={56} style={{ margin: '0 auto 1.5rem', color: '#e2e8f0' }} />
                                <h3 style={{ fontSize: '1.2rem', color: '#475569', marginBottom: '0.5rem' }}>No Students Found</h3>
                                <p style={{ fontSize: '0.95rem' }}>There are no {gbGenderTab !== 'all' ? gbGenderTab : 'students'} in {selectedClass} yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                {Object.keys(gbEdits).length > 0 && (
                                    <div className="animate-fade-in" style={{ padding: '0.75rem 1.25rem', background: '#fef9c3', border: '1px solid #fef08a', borderRadius: '12px', color: '#854d0e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', animation: 'pulse 2s infinite' }} />
                                        You have unsaved changes. Click <b>Save Details</b> to apply.
                                    </div>
                                )}

                                {trackGroupsToRender.map((group) => {
                                    const grpStudents = group.students;
                                    const grpSubjects = group.subjects;
                                    const grpOverallAvg = grpStudents.length ? Math.round(
                                        grpStudents.reduce((sum, s) => {
                                            const res = getTermResults(s, termLabel);
                                            const pct = calcOverallPct(res, getSubjectTotal);
                                            return sum + (isNaN(pct) ? 0 : pct);
                                        }, 0) / grpStudents.length
                                    ) : 0;
                                    const grpPassCount = grpStudents.filter(s => {
                                        const res = getTermResults(s, termLabel);
                                        return calcOverallPct(res, getSubjectTotal) >= 40;
                                    }).length;

                                    return (
                                        <div key={group.trackKey} style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                                            {/* Track Box Header */}
                                            <div style={{
                                                padding: '0.9rem 1.25rem',
                                                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                                                color: 'white',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '0.75rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} />
                                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#f8fafc' }}>
                                                        {group.trackName}
                                                    </h3>
                                                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.15)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700, color: '#e2e8f0' }}>
                                                        {grpStudents.length} {grpStudents.length === 1 ? 'student' : 'students'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.65rem', borderRadius: '8px', color: '#cbd5e1' }}>
                                                        Avg: <b style={{ color: '#67e8f9' }}>{grpOverallAvg}%</b>
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.65rem', borderRadius: '8px', color: '#cbd5e1' }}>
                                                        Pass Rate: <b style={{ color: '#86efac' }}>{grpStudents.length ? Math.round((grpPassCount / grpStudents.length) * 100) : 0}%</b> ({grpPassCount}/{grpStudents.length})
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Track Table */}
                                            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh', borderBottom: '1px solid #e2e8f0' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${280 + grpSubjects.length * 110}px` }}>
                                                    <thead>
                                                        <tr style={{ background: '#1e293b', color: 'white' }}>
                                                            <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, fontSize: '0.82rem', position: 'sticky', left: 0, top: 0, background: '#1e293b', zIndex: 20, minWidth: '170px' }}>
                                                                Student
                                                            </th>
                                                            {grpSubjects.map(sub => (
                                                                <th key={sub} style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', minWidth: '105px', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                                                                    {sub}<br /><span style={{ opacity: 0.7, fontWeight: 500, fontSize: '0.72rem' }}>/{getSubjectTotal(sub, gbTerm)}</span>
                                                                </th>
                                                            ))}
                                                            <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', minWidth: '85px', background: '#0f172a', position: 'sticky', top: 0, zIndex: 10 }}>Total Obt.</th>
                                                            <th style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', minWidth: '70px', background: '#0f172a', position: 'sticky', top: 0, zIndex: 10 }}>Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {grpStudents.map((student, rowIdx) => {
                                                            const subResults = grpSubjects.map(sub => {
                                                                const rawVal = getCellValue(student, sub);
                                                                const val = gbEdits[student.id]?.[sub] !== undefined ? gbEdits[student.id][sub] : rawVal;
                                                                if (val === '' || val === undefined || val === null) return null;
                                                                const isAbsent = typeof val === 'string' && val.trim().toUpperCase() === 'A';
                                                                const numVal = isAbsent ? 0 : Number(val);
                                                                return { subject: sub, obtained: numVal, percentage: isAbsent ? 0 : Math.round((numVal / getSubjectTotal(sub)) * 100) };
                                                            }).filter(Boolean);
                                                            const rowAvg = subResults.length ? calcOverallPct(subResults, getSubjectTotal) : null;
                                                            const rowTotalObtained = subResults.reduce((sum, r) => sum + r.obtained, 0);
                                                            const rowMaxMarks = subResults.reduce((sum, r) => sum + getSubjectTotal(r.subject), 0);
                                                            const rowGrade = rowAvg !== null ? calcGrade(rowAvg) : '—';
                                                            const rowGc = rowAvg !== null ? gradeColor(rowAvg) : { bg: '#f8fafc', text: '#94a3b8' };

                                                            return (
                                                                <tr key={student.id} style={{ borderTop: '1px solid #e2e8f0', background: rowIdx % 2 === 0 ? 'white' : '#f8fafc', transition: 'background 0.2s' }}>
                                                                    <td style={{ padding: '0.7rem 1rem', position: 'sticky', left: 0, background: rowIdx % 2 === 0 ? 'white' : '#f8fafc', zIndex: 1, borderRight: '1px solid #e2e8f0' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                                                                                {student.name.charAt(0)}
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.2 }}>{student.name}</div>
                                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{student.id}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    {grpSubjects.map(sub => {
                                                                        const subTotal = getSubjectTotal(sub);
                                                                        const rawVal = getCellValue(student, sub);
                                                                        const isDirty = gbEdits[student.id]?.[sub] !== undefined;
                                                                        const val = isDirty ? gbEdits[student.id][sub] : rawVal;
                                                                        const isAbsent = typeof val === 'string' && val.trim().toUpperCase() === 'A';
                                                                        const pct = (val !== '' && val !== undefined && val !== null) ? (isAbsent ? 0 : Math.round((Number(val) / subTotal) * 100)) : null;
                                                                        const gc = pct !== null ? gradeColor(pct) : { bg: 'transparent', text: '#94a3b8' };
                                                                        const inputId = `input-${encodeURIComponent(group.trackKey)}-${encodeURIComponent(sub)}-${rowIdx}`;

                                                                        return (
                                                                            <td key={sub} style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                                                                                <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={val !== undefined && val !== null ? val : ''}
                                                                                        id={inputId}
                                                                                        onKeyDown={e => {
                                                                                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                                                                e.preventDefault();
                                                                                                const nextInput = document.getElementById(`input-${encodeURIComponent(group.trackKey)}-${encodeURIComponent(sub)}-${rowIdx + 1}`);
                                                                                                if (nextInput) {
                                                                                                    nextInput.focus();
                                                                                                    setTimeout(() => nextInput.select(), 10);
                                                                                                }
                                                                                            } else if (e.key === 'ArrowUp') {
                                                                                                e.preventDefault();
                                                                                                const prevInput = document.getElementById(`input-${encodeURIComponent(group.trackKey)}-${encodeURIComponent(sub)}-${rowIdx - 1}`);
                                                                                                if (prevInput) {
                                                                                                    prevInput.focus();
                                                                                                    setTimeout(() => prevInput.select(), 10);
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        placeholder="-"
                                                                                        onChange={e => handleCellEdit(student.id, sub, e.target.value)}
                                                                                        style={{ width: '68px', padding: '0.35rem', textAlign: 'center', borderRadius: '8px', border: isDirty ? '2px solid #3b82f6' : '1px solid #cbd5e1', background: gc.bg, color: gc.text, fontWeight: 700, fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s' }}
                                                                                    />
                                                                                    {pct !== null && (
                                                                                        <div style={{ fontSize: '0.68rem', color: gc.text, fontWeight: 700, marginTop: '3px' }}>
                                                                                            {isAbsent ? 'Absent' : `${pct}%`} · {isAbsent ? 'F' : calcGrade(pct)}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', background: rowGc.bg }}>
                                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: rowGc.text }}>{rowAvg !== null ? `${rowTotalObtained}` : '—'}</div>
                                                                        {rowAvg !== null && <div style={{ fontSize: '0.68rem', color: rowGc.text, opacity: 0.8 }}>/ {rowMaxMarks}</div>}
                                                                    </td>
                                                                    <td style={{ padding: '0.65rem 0.4rem', textAlign: 'center', background: rowGc.bg }}>
                                                                        <span style={{ display: 'inline-block', background: rowGc.text, color: 'white', borderRadius: '7px', padding: '0.2rem 0.55rem', fontWeight: 800, fontSize: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{rowGrade}</span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Global Grading Scale */}
                                <div style={{ padding: '0.85rem 1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 800 }}>Grading Scale:</span>
                                    {[['A+', '≥90', '#dcfce7', '#15803d'], ['A', '≥80', '#dcfce7', '#15803d'], ['B+', '≥70', '#dbeafe', '#1d4ed8'], ['B', '≥60', '#dbeafe', '#1d4ed8'], ['C', '≥50', '#fef9c3', '#a16207'], ['D', '≥40', '#ffedd5', '#c2410c'], ['F', '<40', '#fee2e2', '#dc2626']].map(([g, r, bg, col]) => (
                                        <span key={g} style={{ background: bg, color: col, border: `1px solid ${col}33`, borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 700 }}>{g} {r}%</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GradebookTab;
