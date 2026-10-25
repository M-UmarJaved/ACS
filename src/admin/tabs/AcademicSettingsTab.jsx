import React, { useState } from "react";
import { PlusCircle, Trash2, X, Edit3, Check, Sparkles } from "lucide-react";
import { SECTION_PRESETS, getPreset, getBaseClass, cleanDuplicateClasses, filterStudentsByHierarchy } from "../utils/gradeUtils";

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({ on, onToggle }) => (
    <div onClick={onToggle} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", userSelect: "none" }}>
        <div style={{ position: "relative", width: "40px", height: "20px", borderRadius: "999px", transition: "background 0.2s", background: on ? "#2563eb" : "#cbd5e1" }}>
            <div style={{ position: "absolute", top: "2px", left: on ? "20px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
        </div>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: on ? "#1d4ed8" : "#94a3b8" }}>{on ? "ON" : "OFF"}</span>
    </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const AcademicSettingsTab = ({
    SECTIONS, CLASSES, CLASS_GROUPS, CLASS_TRACKS, CLASS_SUBTRACKS,
    updateSections, updateClasses, updateClassGroups, updateClassTracks, updateClassSubTracks,
    students, setStudents, showSaveMessage,
}) => {
    const allSections = SECTIONS || [];

    // ── Local state ──
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [showAddSection, setShowAddSection] = useState(false);
    const [addSectionInput, setAddSectionInput] = useState("");
    const [renamingSection, setRenamingSection] = useState(null); // { id, value }
    const [renamingClass, setRenamingClass] = useState(null);    // { sectionId, oldName, value }
    const [showAddClass, setShowAddClass] = useState({});        // { sectionId: bool }
    const [addingClassInput, setAddingClassInput] = useState({}); // { sectionId: string }
    const [addGroupInput, setAddGroupInput] = useState({});      // { className: string }

    const displaySection =
        allSections.find(s => s.id === activeSectionId) || allSections[0] || null;

    const sectionColors = ["#2563eb","#059669","#7c3aed","#dc2626","#d97706","#0891b2","#0d9488"];
    const getColor = (idx) => sectionColors[idx % sectionColors.length];

    const ibtn = (color) => ({
        border: "none", background: "transparent", cursor: "pointer",
        color, padding: "0.15rem 0.3rem", borderRadius: "5px",
        display: "inline-flex", alignItems: "center"
    });

    // ── Section handlers ──────────────────────────────────────────────────────
    const handleAddSection = () => {
        const name = addSectionInput.trim();
        if (!name) return;
        if (allSections.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            alert("Section already exists."); return;
        }
        const newId = Date.now().toString();
        const preset = getPreset(name);
        updateSections([...allSections, { id: newId, name, classes: preset.baseClasses }]);
        if (preset.baseClasses.length > 0)
            updateClasses(Array.from(new Set([...(CLASSES || []), ...preset.baseClasses])));
        setAddSectionInput("");
        setShowAddSection(false);
        setActiveSectionId(newId);
        showSaveMessage(`Section "${name}" added!`);
    };

    const handleRenameSection = (sec) => {
        const newName = (renamingSection?.value || "").trim();
        if (!newName || newName === sec.name) { setRenamingSection(null); return; }
        if (allSections.some(s => s.id !== sec.id && s.name.toLowerCase() === newName.toLowerCase())) {
            alert("Another section already has that name."); return;
        }
        updateSections(allSections.map(s => s.id === sec.id ? { ...s, name: newName } : s));
        setRenamingSection(null);
        showSaveMessage(`Section renamed to "${newName}"`);
    };

    const handleDeleteSection = (sec) => {
        const cnt = (students || []).filter(s => sec.classes.some(c => getBaseClass(s.grade) === c)).length;
        const msg = cnt > 0
            ? `Delete section "${sec.name}"? ${cnt} student(s) inside will become unassigned. Students stay safe.`
            : `Delete section "${sec.name}"?`;
        if (!window.confirm(msg)) return;
        const upd = allSections.filter(s => s.id !== sec.id);
        updateSections(upd);
        if (activeSectionId === sec.id) setActiveSectionId(upd[0]?.id || null);
        showSaveMessage(`Section "${sec.name}" deleted.`);
    };

    // ── Class handlers ────────────────────────────────────────────────────────
    const handleAddClass = (sectionId) => {
        const rawName = (addingClassInput[sectionId] || "").trim();
        if (!rawName) return;
        const name = getBaseClass(rawName);
        const sec = allSections.find(s => s.id === sectionId);
        if (!sec) return;
        if (sec.classes.includes(name)) { alert("Class already exists in this section."); return; }
        updateSections(allSections.map(s => s.id === sectionId ? { ...s, classes: [...s.classes, name] } : s));
        updateClasses(Array.from(new Set([...(CLASSES || []), name])));
        setAddingClassInput(p => ({ ...p, [sectionId]: "" }));
        setShowAddClass(p => ({ ...p, [sectionId]: false }));
        showSaveMessage(`Class "${name}" added!`);
    };

    const handleRenameClass = () => {
        if (!renamingClass) return;
        const { sectionId, oldName, value } = renamingClass;
        const newName = getBaseClass(value.trim());
        if (!newName || newName === oldName) { setRenamingClass(null); return; }
        const cnt = (students || []).filter(s => getBaseClass(s.grade) === oldName).length;
        if (cnt > 0 && !window.confirm(`Rename "${oldName}" → "${newName}"? This updates ${cnt} student record(s).`)) return;
        updateSections((SECTIONS || []).map(s =>
            s.id === sectionId ? { ...s, classes: s.classes.map(c => c === oldName ? newName : c) } : s));
        updateClasses((CLASSES || []).map(c => c === oldName ? newName : c));
        if (cnt > 0) setStudents((students || []).map(s => getBaseClass(s.grade) === oldName ? { ...s, grade: newName } : s));
        if (CLASS_GROUPS?.[oldName] !== undefined) {
            const g = { ...CLASS_GROUPS, [newName]: CLASS_GROUPS[oldName] };
            delete g[oldName];
            updateClassGroups(g);
        }
        if (CLASS_TRACKS?.[oldName] !== undefined && updateClassTracks) {
            const t = { ...CLASS_TRACKS, [newName]: CLASS_TRACKS[oldName] };
            delete t[oldName];
            updateClassTracks(t);
        }
        setRenamingClass(null);
        showSaveMessage(`Renamed "${oldName}" → "${newName}"`);
    };

    const handleRemoveClass = (sectionId, cls) => {
        const cnt = (students || []).filter(s => getBaseClass(s.grade) === cls).length;
        if (!window.confirm(cnt > 0
            ? `"${cls}" has ${cnt} student(s). Removing hides it from rosters but students stay safe. Continue?`
            : `Remove class "${cls}"?`)) return;
        updateSections((SECTIONS || []).map(s =>
            s.id === sectionId ? { ...s, classes: s.classes.filter(c => c !== cls) } : s));
        updateClasses((CLASSES || []).filter(c => c !== cls));
        showSaveMessage(`"${cls}" removed.`);
    };

    // ── Consolidate & Clean Duplicate Classes ───────────────────────────────────
    const handleConsolidateDuplicates = () => {
        const { cleanedSections, cleanedClasses } = cleanDuplicateClasses(SECTIONS || [], CLASSES || []);
        updateSections(cleanedSections);
        updateClasses(cleanedClasses);

        // Also normalize students with duplicated grade names (e.g. "9th Bio" -> "9th" with track "Biology")
        let updatedCount = 0;
        const updatedStudents = (students || []).map(s => {
            const base = getBaseClass(s.grade);
            if (base && s.grade !== base) {
                updatedCount++;
                const isFait = s.grade.toLowerCase().includes('fait') || s.grade.toLowerCase().includes('fa it') || s.grade.toLowerCase().includes('fa-it');
                const isFa = s.grade.toLowerCase().includes('fa') || s.grade.toLowerCase().includes('arts');
                const track = s.admissions?.[0]?.subjectTrack || s.subjectTrack || (
                    s.grade.toLowerCase().includes('bio') ? 'Biology' :
                    s.grade.toLowerCase().includes('comp') ? 'Computer' :
                    s.grade.toLowerCase().includes('pre-med') ? 'Pre-Medical' :
                    s.grade.toLowerCase().includes('pre-eng') ? 'Pre-Engineering' :
                    s.grade.toLowerCase().includes('ics') ? 'ICS' :
                    (isFait || isFa) ? ((base === '1st Year' || base === '2nd Year') ? 'Humanities' : 'Arts') : ''
                );
                const subTrack = s.admissions?.[0]?.subTrack || s.subTrack || (
                    isFait ? 'FAIT' : isFa ? 'FA' : ''
                );
                return {
                    ...s,
                    grade: base,
                    subjectTrack: track,
                    subTrack: subTrack || undefined,
                    admissions: s.admissions?.length ? [{ ...s.admissions[0], subjectTrack: track, subTrack: subTrack || undefined }] : undefined
                };
            }
            return s;
        });

        if (updatedCount > 0) {
            setStudents(updatedStudents);
        }

        showSaveMessage(`Classes consolidated! Cleaned ${cleanedClasses.length} base classes and updated ${updatedCount} student records.`);
    };

    // ── Groups toggle ─────────────────────────────────────────────────────────
    const isGroupsEnabled = (cls) => CLASS_GROUPS != null && cls in CLASS_GROUPS;

    const handleToggleGroups = (cls) => {
        if (isGroupsEnabled(cls)) {
            const grps = CLASS_GROUPS[cls] || [];
            if (grps.length > 0 && !window.confirm(`Turning off groups for "${cls}" will remove ${grps.length} group(s). Continue?`)) return;
            const upd = { ...CLASS_GROUPS };
            delete upd[cls];
            updateClassGroups(upd);
        } else {
            updateClassGroups({ ...(CLASS_GROUPS || {}), [cls]: ["Quaid", "Iqbal"] });
        }
    };

    const handleAddGroup = (cls) => {
        const name = (addGroupInput[cls] || "").trim();
        if (!name) return;
        const cur = CLASS_GROUPS?.[cls] || [];
        if (cur.includes(name)) { alert("Group already exists."); return; }
        updateClassGroups({ ...(CLASS_GROUPS || {}), [cls]: [...cur, name] });
        setAddGroupInput(p => ({ ...p, [cls]: "" }));
        showSaveMessage(`Group "${name}" added!`);
    };

    const handleRemoveGroup = (cls, grp) => {
        const cur = CLASS_GROUPS?.[cls] || [];
        updateClassGroups({ ...(CLASS_GROUPS || {}), [cls]: cur.filter(g => g !== grp) });
    };

    // ── Subject group toggle (Stores in CLASS_TRACKS, NOT duplicating class names) ──
    const handleToggleSubjectGroup = (cls, track) => {
        const curTracks = CLASS_TRACKS?.[cls] || (
            // Default enabled tracks if none configured yet
            getPreset(displaySection?.name || '').subjectGroups || []
        );
        const isCurrentlyOn = curTracks.includes(track);
        const newTracks = isCurrentlyOn
            ? curTracks.filter(t => t !== track)
            : [...curTracks, track];

        if (updateClassTracks) {
            updateClassTracks({ ...(CLASS_TRACKS || {}), [cls]: newTracks });
        }
        showSaveMessage(`${track} ${isCurrentlyOn ? "disabled" : "enabled"} for ${cls}`);
    };

    // ── Sub-track toggle (ICS Physics/Economics, FA IT/Simple) ────────────────
    const handleToggleSubTrack = (key, sub) => {
        const cur = CLASS_SUBTRACKS?.[key] || [];
        const exists = cur.includes(sub);
        const newSubs = exists ? cur.filter(t => t !== sub) : [...cur, sub];
        updateClassSubTracks({ ...(CLASS_SUBTRACKS || {}), [key]: newSubs });
        showSaveMessage(`${sub} ${exists ? "removed from" : "added to"} ${key}`);
    };

    // ── Class card ────────────────────────────────────────────────────────────
    const renderClassCard = (rawCls, sectionId, secIdx) => {
        const cls = getBaseClass(rawCls);
        const sec = (SECTIONS || []).find(s => s.id === sectionId);
        const preset = getPreset(sec?.name || "");
        const accentColor = getColor(secIdx);
        const groupsOn = isGroupsEnabled(cls);
        const groups = CLASS_GROUPS?.[cls] || [];
        const activeCount = filterStudentsByHierarchy(students, { baseClass: cls, status: 'active' }).length;
        const isRenaming = renamingClass?.sectionId === sectionId && renamingClass?.oldName === cls;

        // Tracks enabled for this class
        const enabledTracks = CLASS_TRACKS?.[cls] !== undefined
            ? (CLASS_TRACKS[cls] || [])
            : preset.subjectGroups;

        return (
            <div key={cls} style={{ background: "white", border: "1.5px solid #e2e8f0", borderTop: `4px solid ${accentColor}`, borderRadius: "12px", padding: "1.1rem", flex: "1 1 240px", minWidth: "240px", maxWidth: "340px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>

                {/* Class name row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    {isRenaming ? (
                        <div style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
                            <input autoFocus value={renamingClass.value}
                                onChange={e => setRenamingClass(p => ({ ...p, value: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") handleRenameClass(); if (e.key === "Escape") setRenamingClass(null); }}
                                className="form-input" style={{ flex: 1, fontSize: "0.85rem", padding: "0.25rem 0.45rem", fontWeight: 700 }} />
                            <button onClick={handleRenameClass} style={ibtn("#059669")}><Check size={14} /></button>
                            <button onClick={() => setRenamingClass(null)} style={ibtn("#ef4444")}><X size={14} /></button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#0f172a" }}>{cls}</div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>{activeCount} active student{activeCount !== 1 ? 's' : ''}</div>
                            </div>
                            <div style={{ display: "flex", gap: "0.15rem" }}>
                                <button onClick={() => setRenamingClass({ sectionId, oldName: cls, value: cls })} style={ibtn("#2563eb")} title="Rename"><Edit3 size={13} /></button>
                                <button onClick={() => handleRemoveClass(sectionId, cls)} style={ibtn("#ef4444")} title="Remove"><Trash2 size={13} /></button>
                            </div>
                        </>
                    )}
                </div>

                {/* Groups toggle (e.g. Quaid / Iqbal) */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem", marginTop: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: groupsOn ? "0.45rem" : 0 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569" }}>Custom Groups (Quaid / Iqbal)</span>
                        <Toggle on={groupsOn} onToggle={() => handleToggleGroups(cls)} />
                    </div>
                    {groupsOn && (
                        <div>
                            {groups.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
                                    {groups.map(g => (
                                        <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#eff6ff", border: "1.5px solid #bfdbfe", color: "#1d4ed8", borderRadius: "6px", padding: "0.2rem 0.45rem", fontSize: "0.75rem", fontWeight: 800 }}>
                                            🏆 {g}
                                            <button onClick={() => handleRemoveGroup(cls, g)} style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: 0, display: "flex" }}><X size={10} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: "flex", gap: "0.3rem" }}>
                                <input
                                    type="text" placeholder="Add group (e.g. Quaid, Iqbal)…"
                                    value={addGroupInput[cls] || ""}
                                    onChange={e => setAddGroupInput(p => ({ ...p, [cls]: e.target.value }))}
                                    onKeyDown={e => e.key === "Enter" && handleAddGroup(cls)}
                                    className="form-input"
                                    style={{ flex: 1, fontSize: "0.75rem", padding: "0.25rem 0.45rem" }}
                                />
                                <button onClick={() => handleAddGroup(cls)} style={{ background: accentColor, border: "none", borderRadius: "6px", padding: "0.25rem 0.5rem", cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}>
                                    <PlusCircle size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Subject groups (Tracks like Biology, Computer, Pre-Medical, ICS, FA) */}
                {preset.subjectGroups.length > 0 && (
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem", marginTop: "0.6rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569", marginBottom: "0.45rem" }}>
                            Subject Groups (Tracks)
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            {preset.subjectGroups.map(track => {
                                const isEnabled = enabledTracks.includes(track);
                                const subTracks = preset.subTrackConfig[track];
                                const subKey = `${cls} ${track}`;
                                // Always use composite key "1st Year ICS", never bare "ICS"
                                // If no entry exists yet, default to all sub-tracks enabled (preset defaults)
                                const enabledSubs = CLASS_SUBTRACKS?.[subKey] !== undefined
                                    ? (CLASS_SUBTRACKS[subKey] || [])
                                    : (subTracks || []);
                                const trackCount = filterStudentsByHierarchy(students, { baseClass: cls, track, status: 'active' }).length;

                                return (
                                    <div key={track} style={{ background: isEnabled ? `${accentColor}08` : "#f8fafc", border: `1.5px solid ${isEnabled ? accentColor : "#e2e8f0"}`, borderRadius: "8px", padding: "0.35rem 0.55rem", transition: "all 0.2s" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 800, color: isEnabled ? accentColor : "#64748b" }}>
                                            <input type="checkbox" checked={isEnabled} onChange={() => handleToggleSubjectGroup(cls, track)} style={{ accentColor, width: "15px", height: "15px" }} />
                                            <span>{track}</span>
                                            {isEnabled && trackCount > 0 && (
                                                <span style={{ marginLeft: "auto", fontSize: "0.65rem", padding: "0.08rem 0.35rem", borderRadius: "999px", background: accentColor, color: "white", fontWeight: 900 }}>{trackCount}</span>
                                            )}
                                        </label>

                                        {/* Nested Sub-tracks (e.g. for ICS: Physics, Economics, Statistics) */}
                                        {isEnabled && subTracks && subTracks.length > 0 && (
                                            <div style={{ marginLeft: "1.4rem", marginTop: "0.3rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                                {subTracks.map(sub => {
                                                    const subOn = enabledSubs.includes(sub);
                                                    return (
                                                        <label key={sub} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.45rem", borderRadius: "6px", border: `1px solid ${subOn ? "#7c3aed" : "#cbd5e1"}`, background: subOn ? "#f5f3ff" : "white", color: subOn ? "#7c3aed" : "#64748b" }}>
                                                            <input type="checkbox" checked={subOn} onChange={() => handleToggleSubTrack(subKey, sub)} style={{ accentColor: "#7c3aed" }} />
                                                            {sub}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Page header */}
            <div className="card" style={{ padding: "1.2rem 1.5rem", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0 }}>⚙️ Class & Subject Settings</h2>
                    <p style={{ fontSize: "0.82rem", margin: "0.2rem 0 0", opacity: 0.9 }}>
                        Structured hierarchy: Section ➔ Base Class (9th, 10th, 1st Year) ➔ Subject Tracks (Bio, Comp, ICS, FA) ➔ Sub-parts.
                    </p>
                </div>
                <button
                    onClick={handleConsolidateDuplicates}
                    className="btn"
                    style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: "8px", padding: "0.45rem 0.9rem", fontSize: "0.8rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", backdropFilter: "blur(4px)" }}
                    title="Consolidate duplicate track classes (like 9th Bio, 1st Year Pre-Med) into clean base classes"
                >
                    <Sparkles size={14} /> Consolidate & Clean Duplicate Classes
                </button>
            </div>

            {/* Sections bar */}
            <div className="card" style={{ padding: "0.9rem 1.1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#475569", marginRight: "0.2rem" }}>Sections:</span>

                    {allSections.map((sec, idx) => {
                        const isActive = displaySection?.id === sec.id;
                        const color = getColor(idx);
                        const isRenaming = renamingSection?.id === sec.id;
                        return (
                            <div key={sec.id} style={{ display: "flex", alignItems: "center" }}>
                                {isRenaming ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                                        <input autoFocus value={renamingSection.value}
                                            onChange={e => setRenamingSection(p => ({ ...p, value: e.target.value }))}
                                            onKeyDown={e => { if (e.key === "Enter") handleRenameSection(sec); if (e.key === "Escape") setRenamingSection(null); }}
                                            className="form-input"
                                            style={{ fontSize: "0.8rem", padding: "0.22rem 0.45rem", width: "120px" }} />
                                        <button onClick={() => handleRenameSection(sec)} style={ibtn("#059669")}><Check size={12} /></button>
                                        <button onClick={() => setRenamingSection(null)} style={ibtn("#ef4444")}><X size={12} /></button>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${isActive ? color : "#e2e8f0"}`, borderRadius: "8px", overflow: "hidden" }}>
                                        <button onClick={() => setActiveSectionId(sec.id)} style={{ padding: "0.3rem 0.75rem", border: "none", cursor: "pointer", background: isActive ? color : "white", color: isActive ? "white" : "#475569", fontWeight: 700, fontSize: "0.8rem" }}>{sec.name}</button>
                                        <button onClick={() => setRenamingSection({ id: sec.id, value: sec.name })} style={{ padding: "0.3rem 0.28rem", border: "none", borderLeft: `1px solid ${isActive ? "rgba(255,255,255,0.25)" : "#e2e8f0"}`, cursor: "pointer", background: isActive ? `${color}cc` : "white", color: isActive ? "rgba(255,255,255,0.85)" : "#64748b", display: "flex", alignItems: "center" }} title="Rename"><Edit3 size={10} /></button>
                                        <button onClick={() => handleDeleteSection(sec)} style={{ padding: "0.3rem 0.28rem", border: "none", borderLeft: `1px solid ${isActive ? "rgba(255,255,255,0.25)" : "#fecaca"}`, cursor: "pointer", background: isActive ? `${color}cc` : "#fef2f2", color: isActive ? "rgba(255,255,255,0.85)" : "#ef4444", display: "flex", alignItems: "center" }} title="Remove"><X size={10} /></button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add section */}
                    {showAddSection ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                            {Object.keys(SECTION_PRESETS).map(p => (
                                <button key={p} onClick={() => setAddSectionInput(p)} style={{ padding: "0.2rem 0.45rem", borderRadius: "5px", border: "1px solid #e2e8f0", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", background: addSectionInput === p ? "#eff6ff" : "#f8fafc", color: addSectionInput === p ? "#2563eb" : "#64748b" }}>{p}</button>
                            ))}
                            <input autoFocus type="text" placeholder="Section name…" value={addSectionInput}
                                onChange={e => setAddSectionInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleAddSection(); if (e.key === "Escape") setShowAddSection(false); }}
                                className="form-input" style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", width: "140px" }} />
                            <button onClick={handleAddSection} style={{ background: "#2563eb", border: "none", borderRadius: "6px", padding: "0.28rem 0.55rem", cursor: "pointer", color: "white", display: "flex" }}><PlusCircle size={13} /></button>
                            <button onClick={() => setShowAddSection(false)} style={ibtn("#64748b")}><X size={14} /></button>
                        </div>
                    ) : (
                        <button onClick={() => setShowAddSection(true)} style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem", color: "#2563eb", border: "1.5px dashed #bfdbfe", background: "#eff6ff", borderRadius: "8px", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <PlusCircle size={13} /> Add Section
                        </button>
                    )}
                </div>
            </div>

            {/* No sections yet */}
            {allSections.length === 0 && (
                <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                    No sections yet. Click <strong>Add Section</strong> above to get started.
                </div>
            )}

            {/* Active section content */}
            {displaySection && (() => {
                const sec = displaySection;
                const secIdx = allSections.findIndex(s => s.id === sec.id);
                const color = getColor(secIdx);
                const preset = getPreset(sec.name);
                const activeStuCount = (students || []).filter(s => sec.classes.some(c => getBaseClass(s.grade) === getBaseClass(c)) && (s.status || "active") === "active").length;

                return (
                    <div className="card" style={{ padding: "1.25rem", borderTop: `4px solid ${color}` }}>
                        {/* Section header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>
                            <div>
                                <h3 style={{ fontWeight: 800, fontSize: "1.15rem", color: "#1e293b", margin: 0 }}>
                                    <span style={{ color, marginRight: "0.4rem" }}>◼</span>{sec.name}
                                </h3>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.1rem" }}>
                                    {sec.classes.length} class(es) &bull; {activeStuCount} active students
                                    {preset.subjectGroups.length > 0 && <span style={{ color: "#7c3aed", marginLeft: "0.5rem" }}>• Subject groups available</span>}
                                </div>
                            </div>
                        </div>

                        {/* Class cards */}
                        {sec.classes.length === 0 ? (
                            <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #e2e8f0", marginBottom: "0.75rem" }}>
                                No classes yet. Add one below.
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", marginBottom: "0.85rem" }}>
                                {sec.classes.map(cls => renderClassCard(cls, sec.id, secIdx))}
                            </div>
                        )}

                        {/* Add class */}
                        {showAddClass[sec.id] ? (
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <input autoFocus type="text" placeholder="Class name (e.g. 9th, 1st Year, K.G)"
                                    value={addingClassInput[sec.id] || ""}
                                    onChange={e => setAddingClassInput(p => ({ ...p, [sec.id]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === "Enter") handleAddClass(sec.id); if (e.key === "Escape") setShowAddClass(p => ({ ...p, [sec.id]: false })); }}
                                    className="form-input" style={{ flex: 1, fontSize: "0.85rem" }} />
                                <button onClick={() => handleAddClass(sec.id)} className="btn btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}>
                                    <PlusCircle size={13} /> Add
                                </button>
                                <button onClick={() => setShowAddClass(p => ({ ...p, [sec.id]: false }))} style={ibtn("#64748b")}><X size={15} /></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowAddClass(p => ({ ...p, [sec.id]: true }))} style={{ padding: "0.38rem 0.85rem", fontSize: "0.8rem", color, border: `1.5px dashed ${color}55`, background: `${color}06`, borderRadius: "8px", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                <PlusCircle size={13} /> Add Class to {sec.name}
                            </button>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

export default AcademicSettingsTab;
