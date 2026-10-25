import React, { useState, useRef } from 'react';
import { Download, Printer, X, ChevronDown, ChevronRight, ChevronLeft, Edit3, Save, Check, Search, LayoutGrid, Zap, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { getBaseClass } from '../utils/gradeUtils';

/* ─────────────────────────────────────────────
   PRINT HELPER  – opens a new window with a
   fully-styled, printer-ready HTML document.
───────────────────────────────────────────── */
function openPrintWindow(htmlBody, title = 'Attendance Report') {
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;color:#0f172a;background:#fff;padding:32px 40px;font-size:13px}
  .report-header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #1e3a5f;padding-bottom:16px;margin-bottom:22px}
  .school-badge{width:54px;height:54px;background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;flex-shrink:0}
  .school-name{font-size:20px;font-weight:800;color:#1e3a5f;line-height:1.2}
  .school-sub{font-size:11px;color:#64748b;margin-top:3px;font-weight:500}
  .report-title{text-align:right;margin-left:auto}
  .report-title h2{font-size:18px;font-weight:700;color:#1e3a5f}
  .report-title p{font-size:11px;color:#64748b;margin-top:4px}
  .meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}
  .meta-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;text-align:center}
  .meta-card .val{font-size:22px;font-weight:800;color:#1e3a5f}
  .meta-card .lbl{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
  .meta-card.green .val{color:#15803d} .meta-card.red .val{color:#dc2626} .meta-card.amber .val{color:#b45309}
  table{width:100%;border-collapse:collapse;margin-bottom:22px}
  thead tr{background:#1e3a5f;color:#fff}
  thead th{padding:8px 10px;font-size:11px;font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:.3px}
  tbody tr:nth-child(even){background:#f8fafc}
  tbody td{padding:7px 10px;font-size:12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700}
  .badge.present{background:#dcfce7;color:#15803d}
  .badge.absent{background:#fee2e2;color:#dc2626}
  .badge.leave{background:#ede9fe;color:#7c3aed}
  .badge.holiday{background:#e0f2fe;color:#0369a1}
  .badge.unmarked{background:#fef9c3;color:#92400e}
  .pct-bar-wrap{background:#e2e8f0;border-radius:4px;height:7px;width:80px;display:inline-block;vertical-align:middle;overflow:hidden;}
  .pct-bar{height:100%;border-radius:4px}
  .section-title{font-size:14px;font-weight:700;color:#1e3a5f;border-left:4px solid #2563eb;padding-left:10px;margin:18px 0 10px}
  .monthly-day-grid{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
  .day-chip{padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700}
  .day-chip.p{background:#dcfce7;color:#15803d}
  .day-chip.a{background:#fee2e2;color:#dc2626}
  .day-chip.l{background:#ede9fe;color:#7c3aed}
  .day-chip.h{background:#e0f2fe;color:#0369a1}
  .footer{margin-top:28px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
  @media print{
    body{padding:16px 20px}
    @page{margin:1.5cm}
  }
</style>
</head>
<body>
${htmlBody}
<div class="footer">
  <span>Generated: ${new Date().toLocaleString()}</span>
  <button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;padding:6px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🖨 Print</button>
  <span>ACS School Management System</span>
</div>
<style>@media print{.footer button{display:none!important}}</style>
</body>
</html>`);
    win.document.close();
}

/* Numeric-aware class name sort: "9th A" before "10th B" */
function classSort(a, b) {
    const numA = parseInt((a || '').match(/\d+/)?.[0] || '999');
    const numB = parseInt((b || '').match(/\d+/)?.[0] || '999');
    return numA !== numB ? numA - numB : (a || '').localeCompare(b || '');
}

/* ─────────────────────────────────────────────
   BUILD REPORT HTML HELPERS
───────────────────────────────────────────── */
function schoolHeader(schoolName, reportTitle, reportSub, schoolLogo) {
    const logoHTML = schoolLogo
        ? `<img src="${schoolLogo}" style="width:54px;height:54px;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';this.nextSibling.style.display='flex';" /><div class="school-badge" style="display:none;">🏫</div>`
        : `<div class="school-badge">🏫</div>`;
    return `
<div class="report-header">
  <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">${logoHTML}</div>
  <div>
    <div class="school-name">${schoolName || 'School'}</div>
    <div class="school-sub">Official Attendance Report</div>
  </div>
  <div class="report-title">
    <h2>${reportTitle}</h2>
    <p>${reportSub}</p>
  </div>
</div>`;
}

function pctBar(pct) {
    const color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#2563eb' : pct >= 60 ? '#d97706' : '#dc2626';
    return `<span class="pct-bar-wrap"><span class="pct-bar" style="width:${pct}%;background:${color}"></span></span> <strong style="color:${color}">${pct}%</strong>`;
}

/* ── Daily class report ───────────────────── */
function buildDailyClassHTML(students, className, date, schoolName, genderFilter, schoolLogo) {
    const filtered = students
        .filter(s => getBaseClass(s.grade) === getBaseClass(className))
        .filter(s => {
            if (genderFilter === 'boys') return s.admissions?.[0]?.gender === 'Male';
            if (genderFilter === 'girls') return s.admissions?.[0]?.gender === 'Female';
            return true;
        })
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    const markedStudents = filtered.filter(s => (s.attendance?.records || []).some(r => r.date === date));
    const presentList = markedStudents.filter(s => (s.attendance?.records || []).some(r => r.date === date && (r.status === 'present' || r.status === 'late')));
    const absentList = markedStudents.filter(s => (s.attendance?.records || []).some(r => r.date === date && r.status === 'absent'));
    const leaveList = markedStudents.filter(s => (s.attendance?.records || []).some(r => r.date === date && r.status === 'leave'));

    const rows = markedStudents.map((s, i) => {
        const rec = (s.attendance?.records || []).find(r => r.date === date);
        const status = rec?.status || 'unmarked';
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${s.name}</strong></td>
          <td style="color:#64748b">${s.id}</td>
          <td>${s.admissions?.[0]?.gender || '—'}</td>
          <td>${s.admissions?.[0]?.fatherName || '—'}</td>
          <td><span class="badge ${status}">${status === 'present' ? '✓ Present' : status === 'absent' ? '✗ Absent' : status === 'leave' ? '📋 Leave' : status === 'late' ? '⏰ Late' : status === 'holiday' ? '🌴 Holiday' : '—'}</span></td>
          <td style="text-align:center; font-weight:700; color:#dc2626">${s.attendance?.absent || 0}</td>
          <td>${pctBar(s.attendance?.percentage || 0)}</td>
        </tr>`;
    }).join('');

    return `
${schoolHeader(schoolName, 'Daily Attendance Report', `Class: ${className} | Date: ${date} | Filter: ${genderFilter === 'all' ? 'All Students' : genderFilter === 'boys' ? 'Boys' : 'Girls'}`, schoolLogo)}
<div class="meta-grid">
  <div class="meta-card"><div class="val">${markedStudents.length}</div><div class="lbl">Total Marked</div></div>
  <div class="meta-card green"><div class="val">${presentList.length}</div><div class="lbl">Present</div></div>
  <div class="meta-card red"><div class="val">${absentList.length}</div><div class="lbl">Absent</div></div>
  <div class="meta-card amber"><div class="val">${leaveList.length}</div><div class="lbl">On Leave</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Student Name</th><th>ID</th><th>Gender</th><th>Father Name</th><th>Status</th><th style="text-align:center">Absents</th><th>Overall %</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
${absentList.length > 0 ? `
<div class="section-title">⚠ Absent Students (${absentList.length})</div>
<p style="font-size:12px;color:#64748b;margin-bottom:12px">${absentList.map(s => s.name).join(' • ')}</p>
` : ''}`;
}

/* ── Monthly class report ─────────────────── */
function buildMonthlyClassHTML(students, className, year, month, schoolName, genderFilter, schoolLogo) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const filtered = students
        .filter(s => getBaseClass(s.grade) === getBaseClass(className))
        .filter(s => {
            if (genderFilter === 'boys') return s.admissions?.[0]?.gender === 'Male';
            if (genderFilter === 'girls') return s.admissions?.[0]?.gender === 'Female';
            return true;
        })
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    const allDays = [...new Set(
        filtered.flatMap(s => (s.attendance?.records || []).filter(r => r.date.startsWith(prefix)).map(r => r.date))
    )].sort();

    const activeInMonth = filtered.filter(s => (s.attendance?.records || []).some(r => r.date.startsWith(prefix)));

    const rows = activeInMonth.map((s, i) => {
        const monthRecs = (s.attendance?.records || []).filter(r => r.date.startsWith(prefix));
        const academicRecs = monthRecs.filter(r => r.status !== 'holiday');
        const present = academicRecs.filter(r => r.status === 'present' || r.status === 'late').length;
        const absent = academicRecs.filter(r => r.status === 'absent').length;
        const leave = academicRecs.filter(r => r.status === 'leave').length;
        const pct = academicRecs.length > 0 ? parseFloat(((present / academicRecs.length) * 100).toFixed(1)) : 0;
        const chips = allDays.map(d => {
            const rec = monthRecs.find(r => r.date === d);
            const cls = rec ? (rec.status === 'present' ? 'p' : rec.status === 'absent' ? 'a' : rec.status === 'leave' ? 'l' : rec.status === 'holiday' ? 'h' : 'lt') : '';
            const label = d.slice(8);
            return `<span class="day-chip ${cls}" title="${d}">${label}</span>`;
        }).join('');
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${s.name}</strong></td>
          <td style="color:#64748b">${s.id}</td>
          <td>${present}</td>
          <td>${absent}</td>
          <td>${leave}</td>
          <td>${academicRecs.length}</td>
          <td>${pctBar(pct)}</td>
          <td><div class="monthly-day-grid">${chips}</div></td>
        </tr>`;
    }).join('');

    const totalPresent = activeInMonth.reduce((sum, s) => sum + (s.attendance?.records || []).filter(r => r.date.startsWith(prefix) && (r.status === 'present' || r.status === 'late')).length, 0);
    const totalAbsent = activeInMonth.reduce((sum, s) => sum + (s.attendance?.records || []).filter(r => r.date.startsWith(prefix) && r.status === 'absent').length, 0);
    const avgPct = activeInMonth.length > 0
        ? Math.round(activeInMonth.reduce((sum, s) => {
            const recs = (s.attendance?.records || []).filter(r => r.date.startsWith(prefix) && r.status !== 'holiday');
            return sum + (recs.length > 0 ? (recs.filter(r => r.status === 'present' || r.status === 'late').length / recs.length) * 100 : 0);
        }, 0) / activeInMonth.length)
        : 0;

    return `
${schoolHeader(schoolName, 'Monthly Attendance Report', `Class: ${className} | Month: ${monthLabel} | Filter: ${genderFilter === 'all' ? 'All Students' : genderFilter === 'boys' ? 'Boys' : 'Girls'}`, schoolLogo)}
<div class="meta-grid">
  <div class="meta-card"><div class="val">${activeInMonth.length}</div><div class="lbl">Students Marked</div></div>
  <div class="meta-card green"><div class="val">${totalPresent}</div><div class="lbl">Total Present</div></div>
  <div class="meta-card red"><div class="val">${totalAbsent}</div><div class="lbl">Total Absent</div></div>
  <div class="meta-card ${avgPct >= 75 ? 'green' : 'red'}"><div class="val">${avgPct}%</div><div class="lbl">Class Avg</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Student Name</th><th>ID</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total Days</th><th>Month %</th><th>Attendance Grid</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

/* ── Individual student — daily ───────────── */
function buildStudentDailyHTML(student, date, schoolName, schoolLogo) {
    const rec = (student.attendance?.records || []).find(r => r.date === date);
    const status = rec ? rec.status : 'unmarked';
    const pct = student.attendance?.percentage || 0;
    const adm = student.admissions?.[0] || {};
    return `
${schoolHeader(schoolName, 'Student Daily Attendance', `${student.name} (${student.id}) | Date: ${date}`, schoolLogo)}
<div class="meta-grid">
  <div class="meta-card"><div class="val">${student.grade || '—'}</div><div class="lbl">Class</div></div>
  <div class="meta-card ${status === 'present' ? 'green' : status === 'absent' ? 'red' : 'amber'}">
    <div class="val">${status === 'present' ? '✓' : status === 'absent' ? '✗' : '—'}</div>
    <div class="lbl">${status.toUpperCase()}</div>
  </div>
  <div class="meta-card ${pct >= 75 ? 'green' : 'red'}"><div class="val">${pct}%</div><div class="lbl">Overall %</div></div>
  <div class="meta-card"><div class="val">${student.attendance?.total || 0}</div><div class="lbl">Total Days</div></div>
</div>
<table>
  <thead><tr><th>Field</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>Full Name</td><td><strong>${student.name}</strong></td></tr>
    <tr><td>Student ID</td><td>${student.id}</td></tr>
    <tr><td>Class</td><td>${student.grade || '—'}</td></tr>
    <tr><td>Gender</td><td>${adm.gender || '—'}</td></tr>
    <tr><td>Father Name</td><td>${adm.fatherName || '—'}</td></tr>
    <tr><td>Contact</td><td>${adm.contact || '—'}</td></tr>
    <tr><td>Status on ${date}</td><td><span class="badge ${status}">${status === 'present' ? '✓ Present' : status === 'absent' ? '✗ Absent' : status === 'holiday' ? '🌴 Holiday' : '— Not Marked'}</span></td></tr>
    <tr><td>Overall Attendance</td><td>${pctBar(pct)} (${student.attendance?.present || 0} Present / ${student.attendance?.absent || 0} Absent / ${student.attendance?.total || 0} Days)</td></tr>
  </tbody>
</table>`;
}

/* ── Individual student — monthly ─────────── */
function buildStudentMonthlyHTML(student, year, month, schoolName, schoolLogo) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const adm = student.admissions?.[0] || {};
    const monthRecs = (student.attendance?.records || [])
        .filter(r => r.date.startsWith(prefix))
        .sort((a, b) => a.date.localeCompare(b.date));
    const academicRecs = monthRecs.filter(r => r.status !== 'holiday');
    const present = academicRecs.filter(r => r.status === 'present').length;
    const absent = academicRecs.filter(r => r.status === 'absent').length;
    const pct = academicRecs.length > 0 ? parseFloat(((present / academicRecs.length) * 100).toFixed(1)) : 0;

    const recRows = monthRecs.map((r, i) =>
        `<tr><td>${i + 1}</td><td>${r.date}</td><td>${new Date(r.date).toLocaleDateString('default', { weekday: 'long' })}</td><td><span class="badge ${r.status}">${r.status === 'present' ? '✓ Present' : r.status === 'holiday' ? '🌴 Holiday' : '✗ Absent'}</span></td></tr>`
    ).join('');

    return `
${schoolHeader(schoolName, 'Student Monthly Attendance Report', `${student.name} (${student.id}) | Month: ${monthLabel}`, schoolLogo)}
<div class="meta-grid">
  <div class="meta-card green"><div class="val">${present}</div><div class="lbl">Days Present</div></div>
  <div class="meta-card red"><div class="val">${absent}</div><div class="lbl">Days Absent</div></div>
  <div class="meta-card"><div class="val">${academicRecs.length}</div><div class="lbl">Academic Days</div></div>
  <div class="meta-card ${pct >= 75 ? 'green' : 'red'}"><div class="val">${pct}%</div><div class="lbl">Month Attendance</div></div>
</div>
<table>
  <thead><tr><th>Field</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>Full Name</td><td><strong>${student.name}</strong></td></tr>
    <tr><td>Student ID</td><td>${student.id}</td></tr>
    <tr><td>Class</td><td>${student.grade || '—'}</td></tr>
    <tr><td>Father Name</td><td>${adm.fatherName || '—'}</td></tr>
  </tbody>
</table>
<div class="section-title">Day-by-Day Record — ${monthLabel}</div>
${monthRecs.length === 0
            ? '<p style="color:#94a3b8;font-style:italic;font-size:12px">No attendance records found for this month.</p>'
            : `<table><thead><tr><th>#</th><th>Date</th><th>Day</th><th>Status</th></tr></thead><tbody>${recRows}</tbody></table>`}`;
}

/* ── Generalized status report (present OR absent) ── */
function studentRow(s, i, statusType) {
    const pct = s.attendance?.percentage || 0;
    const badgeClass = statusType === 'absent' ? 'absent' : 'present';
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${s.name}</strong></td>
      <td style="color:#64748b">${s.id}</td>
      <td>${s.grade || '—'}</td>
      <td>${s.admissions?.[0]?.gender || '—'}</td>
      <td>${s.admissions?.[0]?.fatherName || '—'}</td>
      <td>${s.admissions?.[0]?.contact || '—'}</td>
      <td><span class="badge ${badgeClass}">${pct}%</span></td>
    </tr>`;
}

function statusTable(list, statusType) {
    if (list.length === 0) {
        const msg = statusType === 'absent'
            ? '✓ All students are present today!'
            : 'No students marked present for this date.';
        const color = statusType === 'absent' ? '#16a34a' : '#b45309';
        return `<p style="color:${color};font-weight:700;font-size:14px;text-align:center;padding:20px">${msg}</p>`;
    }
    const rows = list.map((s, i) => studentRow(s, i, statusType)).join('');
    return `<table>
  <thead><tr><th>#</th><th>Student Name</th><th>ID</th><th>Class</th><th>Gender</th><th>Father Name</th><th>Contact</th><th>Overall %</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

/* ── Status report — single class ────── */
function buildStatusClassHTML(students, className, date, schoolName, statusType, schoolLogo) {
    const markedInClass = students.filter(s => getBaseClass(s.grade) === getBaseClass(className) && (s.attendance?.records || []).some(r => r.date === date));
    const filtered = markedInClass.filter(s => (s.attendance?.records || []).some(r => r.date === date && r.status === statusType));
    const totalMarked = markedInClass.length;
    const totalPresent = markedInClass.filter(s => (s.attendance?.records || []).some(r => r.date === date && (r.status === 'present' || r.status === 'late'))).length;
    const rate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
    const label = statusType === 'absent' ? 'Absent' : 'Present';

    return `
${schoolHeader(schoolName, `${label} Students Report`, `Class: ${className} | Date: ${date}`, schoolLogo)}
<div class="meta-grid">
  <div class="meta-card"><div class="val">${totalMarked}</div><div class="lbl">Total Marked</div></div>
  <div class="meta-card green"><div class="val">${totalPresent}</div><div class="lbl">Present</div></div>
  <div class="meta-card red"><div class="val">${totalMarked - totalPresent}</div><div class="lbl">Absent</div></div>
  <div class="meta-card ${rate >= 75 ? 'green' : 'red'}"><div class="val">${rate}%</div><div class="lbl">Attendance Rate</div></div>
</div>
<div class="section-title">${statusType === 'absent' ? '⚠' : '✓'} ${label} Students — ${className} (${date})</div>
${statusTable(filtered, statusType)}`;
}

/* ── Status report — section-wise ────── */
function buildStatusSectionHTML(students, sections, date, schoolName, statusType, schoolLogo) {
    const label = statusType === 'absent' ? 'Absent' : 'Present';
    const allMarked = students.filter(s => (s.attendance?.records || []).some(r => r.date === date));
    const totalMarked = allMarked.length;
    const totalPresent = allMarked.filter(s => (s.attendance?.records || []).some(r => r.date === date && (r.status === 'present' || r.status === 'late'))).length;

    let sectionBlocks = '';
    (sections || []).forEach(sec => {
        const secStudents = students.filter(s => (sec.classes || []).map(c => getBaseClass(c)).includes(getBaseClass(s.grade)));
        const secFiltered = secStudents.filter(s => (s.attendance?.records || []).some(r => r.date === date && r.status === statusType))
            .sort((a, b) => classSort(a.grade, b.grade) || a.id.localeCompare(b.id, undefined, { numeric: true }));
        const secPresent = secStudents.filter(s => (s.attendance?.records || []).some(r => r.date === date && r.status === 'present')).length;
        const secRate = secStudents.length > 0 ? Math.round((secPresent / secStudents.length) * 100) : 0;

        sectionBlocks += `
<div class="section-title">📚 ${sec.name || 'Section'} — ${secFiltered.length} ${label.toLowerCase()} out of ${secStudents.length} (${secRate}% attendance)</div>`;

        if (secFiltered.length === 0) {
            sectionBlocks += statusType === 'absent'
                ? '<p style="color:#16a34a;font-weight:600;font-size:12px;padding:8px 14px">✓ No absentees in this section</p>'
                : '<p style="color:#b45309;font-weight:600;font-size:12px;padding:8px 14px">No students marked present in this section</p>';
        } else {
            const byClass = {};
            secFiltered.forEach(s => {
                const cls = getBaseClass(s.grade) || 'Unassigned';
                if (!byClass[cls]) byClass[cls] = [];
                byClass[cls].push(s);
            });
            Object.keys(byClass).sort(classSort).forEach(cls => {
                const list = byClass[cls];
                const classTotal = secStudents.filter(s => getBaseClass(s.grade) === getBaseClass(cls)).length;
                sectionBlocks += `<p style="font-size:11px;font-weight:700;color:#475569;margin:10px 0 4px;padding-left:14px">${cls} — ${list.length} ${label.toLowerCase()} / ${classTotal} total</p>`;
                sectionBlocks += statusTable(list, statusType);
            });
        }
    });

    return `
${schoolHeader(schoolName, `Section-Wise ${label} Report`, `Date: ${date} | All Sections`, schoolLogo)}
<div class="meta-grid">
  <div class="meta-card"><div class="val">${totalMarked}</div><div class="lbl">Total Marked</div></div>
  <div class="meta-card green"><div class="val">${totalPresent}</div><div class="lbl">Present</div></div>
  <div class="meta-card red"><div class="val">${totalMarked - totalPresent}</div><div class="lbl">Absent</div></div>
  <div class="meta-card ${totalMarked > 0 && ((totalPresent / totalMarked) * 100) >= 75 ? 'green' : 'red'}"><div class="val">${totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0}%</div><div class="lbl">College Attendance</div></div>
</div>
${sectionBlocks}`;
}

/* ── Status report — whole college ────── */
function buildStatusCollegeHTML(students, date, schoolName, statusType, schoolLogo) {
    const label = statusType === 'absent' ? 'Absent' : 'Present';
    const allMarked = students.filter(s => (s.attendance?.records || []).some(r => r.date === date));
    const allFiltered = allMarked.filter(s => (s.attendance?.records || []).some(r => r.date === date && r.status === statusType));
    const totalMarked = allMarked.length;
    const totalPresent = allMarked.filter(s => (s.attendance?.records || []).some(r => r.date === date && (r.status === 'present' || r.status === 'late'))).length;

    const grouped = {};
    allFiltered.forEach(s => {
        const cls = getBaseClass(s.grade) || 'Unassigned';
        if (!grouped[cls]) grouped[cls] = [];
        grouped[cls].push(s);
    });

    let classSections = '';
    Object.keys(grouped).sort(classSort).forEach(cls => {
        const list = grouped[cls];
        const classTotal = students.filter(s => getBaseClass(s.grade) === getBaseClass(cls)).length;
        classSections += `<div class="section-title">${cls} — ${list.length} ${label.toLowerCase()} out of ${classTotal}</div>`;
        classSections += statusTable(list, statusType);
    });

    const emptyMsg = statusType === 'absent'
        ? '✓ No absentees across the entire college today!'
        : 'No students marked present for this date.';

    return `
${schoolHeader(schoolName, `College-Wide ${label} Report`, `Date: ${date} | All Classes`, schoolLogo)}
<div class="meta-grid">
  <div class="meta-card"><div class="val">${totalMarked}</div><div class="lbl">Total Marked</div></div>
  <div class="meta-card green"><div class="val">${totalPresent}</div><div class="lbl">Present Today</div></div>
  <div class="meta-card red"><div class="val">${totalMarked - totalPresent}</div><div class="lbl">Absent Today</div></div>
  <div class="meta-card ${totalMarked > 0 && ((totalPresent / totalMarked) * 100) >= 75 ? 'green' : 'red'}"><div class="val">${totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0}%</div><div class="lbl">College Attendance</div></div>
</div>
${allFiltered.length === 0
            ? `<p style="color:${statusType === 'absent' ? '#16a34a' : '#b45309'};font-weight:700;font-size:14px;text-align:center;padding:20px">${emptyMsg}</p>`
            : classSections}`;
}

/* ══════════════════════════════════════════ */

const AttendanceTab = ({
    students, selectedClasses, setSelectedClasses, sectionClasses,
    attDateFilter, setAttDateFilter,
    markAttendance, removeAttendanceRecord, exportAttendanceExcel,
    fetchData, showSaveMessage, openConfirm,
    schoolName, sections, schoolLogo,
}) => {
    const [expandedSections, setExpandedSections] = useState([]);
    const [genderTab, setGenderTab] = useState('all');
    const [showPrintMenu, setShowPrintMenu] = useState(false);
    const [printMode, setPrintMode] = useState(null);
    const [printMonth, setPrintMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [attSearchQuery, setAttSearchQuery] = useState('');
    const [expandedHistoryIds, setExpandedHistoryIds] = useState({});
    const toggleStudentHistory = (id) => setExpandedHistoryIds(prev => ({ ...prev, [id]: !prev[id] }));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarSearch, setSidebarSearch] = useState('');

    // ── Quick ID Entry & Scanner States ──
    const [idPrefix, setIdPrefix] = useState('ACS-2026-');
    const [idInput, setIdInput] = useState('');
    const [scannedIds, setScannedIds] = useState([]);
    const [scanFeedback, setScanFeedback] = useState(null);
    const [instantMark, setInstantMark] = useState(false);
    const [instantStatus, setInstantStatus] = useState('present');
    const idInputRef = useRef(null);

    const toggleSectionExpand = (sectionName) => {
        setExpandedSections(prev =>
            prev.includes(sectionName)
                ? prev.filter(s => s !== sectionName)
                : [...prev, sectionName]
        );
    };

    const handleSectionCheckbox = (section) => {
        const sClasses = section.classes || [];
        const allSelected = sClasses.every(c => selectedClasses.includes(c));
        if (allSelected) {
            setSelectedClasses(prev => prev.filter(c => !sClasses.includes(c)));
        } else {
            setSelectedClasses(prev => Array.from(new Set([...prev, ...sClasses])));
        }
    };

    const handleClassCheckbox = (className) => {
        setSelectedClasses(prev =>
            prev.includes(className)
                ? prev.filter(c => c !== className)
                : [...prev, className]
        );
    };

    const isSectionChecked = (section) => {
        const sClasses = section.classes || [];
        if (sClasses.length === 0) return false;
        return sClasses.every(c => selectedClasses.includes(c));
    };

    const isSectionIndeterminate = (section) => {
        const sClasses = section.classes || [];
        const selectedCount = sClasses.filter(c => selectedClasses.includes(c)).length;
        return selectedCount > 0 && selectedCount < sClasses.length;
    };

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const today = new Date().toISOString().split('T')[0];
    const filterDate = attDateFilter || today;

    const normalizedSelectedClasses = selectedClasses.map(c => getBaseClass(c) || c);
    const allClassStudents = students
        .filter(s => (s.status || 'active') === 'active' && (
            selectedClasses.includes(s.grade) ||
            normalizedSelectedClasses.includes(getBaseClass(s.grade) || s.grade)
        ))
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    const searchedClassStudents = attSearchQuery.trim()
        ? allClassStudents.filter(s => {
            const query = attSearchQuery.trim().toLowerCase();
            const sName = (s.name || '').toLowerCase();
            const sId = String(s.id || '').toLowerCase();
            const sFather = (s.admissions?.[0]?.fatherName || '').toLowerCase();
            const sGrade = (s.grade || '').toLowerCase();
            const sSerial = String(s.serialNumber || s.serial_number || '').toLowerCase();

            return sName.includes(query) ||
                sId.includes(query) ||
                sFather.includes(query) ||
                sGrade.includes(query) ||
                sSerial === query ||
                (query.length > 1 && sSerial.includes(query));
        })
        : allClassStudents;

    const classStudents = searchedClassStudents.filter(s => {
        if (genderTab === 'boys') return s.admissions?.[0]?.gender === 'Male';
        if (genderTab === 'girls') return s.admissions?.[0]?.gender === 'Female';
        return true;
    });

    const boysCount = allClassStudents.filter(s => s.admissions?.[0]?.gender === 'Male').length;
    const girlsCount = allClassStudents.filter(s => s.admissions?.[0]?.gender === 'Female').length;

    const totalDays = [...new Set(
        allClassStudents.flatMap(s => (s.attendance?.records || []).map(r => r.date))
    )].length;

    const excelBtnStyle = { padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', fontWeight: 'var(--font-weight-semibold)', border: '2px solid', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', transition: 'all var(--transition-base)' };

    const markAll = async (status) => {
        const updates = classStudents.map(s => {
            const records = [...(s.attendance?.records || [])];
            const idx = records.findIndex(r => r.date === filterDate);
            if (idx >= 0) records[idx] = { date: filterDate, status };
            else records.push({ date: filterDate, status });
            const present = records.filter(r => r.status === 'present').length;
            const absent = records.filter(r => r.status === 'absent').length;
            const leave = records.filter(r => r.status === 'leave').length;
            const late = records.filter(r => r.status === 'late').length;
            const holiday = records.filter(r => r.status === 'holiday').length;
            const presentForPct = present + leave + late;
            const total = records.filter(r => r.status !== 'holiday').length;
            const percentage = total > 0 ? parseFloat(((presentForPct / total) * 100).toFixed(1)) : 0;
            return supabase.from('students').update({
                attendance: { records, total, present, absent, leave, late, holiday, percentage }
            }).eq('id', s.id);
        });
        try {
            const results = await Promise.all(updates);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                console.error('Batch markAll errors:', errors.map(e => e.error));
                throw new Error('Some database updates failed');
            }
            fetchData();
            const label = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : status === 'leave' ? 'Leave' : status === 'holiday' ? 'Holiday' : 'Late';
            showSaveMessage(`All ${classStudents.length} students marked ${label} for ${filterDate}!`);
        } catch (error) {
            console.error('Error in markAll:', error);
            alert(`Critical Error: Failed to mark all ${status}. Reverting changes...`);
            fetchData();
        }
    };

    const unmarkAll = async () => {
        const updates = classStudents.map(s => {
            const records = [...(s.attendance?.records || [])].filter(r => r.date !== filterDate);
            const present = records.filter(r => r.status === 'present').length;
            const absent = records.filter(r => r.status === 'absent').length;
            const leave = records.filter(r => r.status === 'leave').length;
            const late = records.filter(r => r.status === 'late').length;
            const holiday = records.filter(r => r.status === 'holiday').length;
            const presentForPct = present + leave + late;
            const total = records.filter(r => r.status !== 'holiday').length;
            const percentage = total > 0 ? parseFloat(((presentForPct / total) * 100).toFixed(1)) : 0;
            return supabase.from('students').update({
                attendance: { records, total, present, absent, leave, late, holiday, percentage }
            }).eq('id', s.id);
        });
        try {
            const results = await Promise.all(updates);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                console.error('Batch unmarkAll errors:', errors.map(e => e.error));
                throw new Error('Some database updates failed');
            }
            fetchData();
            showSaveMessage(`All ${classStudents.length} students unmarked for ${filterDate}!`);
        } catch (error) {
            console.error('Error in unmarkAll:', error);
            alert(`Critical Error: Failed to unmark students. Reverting changes...`);
            fetchData();
        }
    };

    // ── Quick ID Scanner Handlers ──
    const scannedStudents = scannedIds.map(id => students.find(s => s.id === id)).filter(Boolean);

    const handleAddId = (e) => {
        if (e) e.preventDefault();
        const raw = idInput.trim();
        if (!raw) return;

        const query = raw.toUpperCase();
        const prefix = (idPrefix || '').trim().toUpperCase();

        // 1. Direct match on full ID
        let found = students.find(s => (s.id || '').toUpperCase() === query);

        // 2. Try prefix + raw input (e.g. ACS-2026- + 001 or 45)
        if (!found && prefix) {
            const fullCandidate = `${prefix}${raw}`.toUpperCase();
            found = students.find(s => (s.id || '').toUpperCase() === fullCandidate);
        }

        // 3. Try prefix + padded 3 or 4 digits (e.g. ACS-2026-001 for input "1")
        if (!found && prefix && /^\d+$/.test(raw)) {
            const paddedCandidate3 = `${prefix}${raw.padStart(3, '0')}`.toUpperCase();
            found = students.find(s => (s.id || '').toUpperCase() === paddedCandidate3);
            if (!found) {
                const paddedCandidate4 = `${prefix}${raw.padStart(4, '0')}`.toUpperCase();
                found = students.find(s => (s.id || '').toUpperCase() === paddedCandidate4);
            }
        }

        // 4. Try matching suffix of student ID or serial/roll number
        if (!found) {
            found = students.find(s => {
                const sId = (s.id || '').toUpperCase();
                const sSerial = String(s.serialNumber || s.serial_number || '').toUpperCase();
                const sRoll = String(s.rollNumber || s.roll_number || '').toUpperCase();
                return sId.endsWith(`-${query}`) ||
                    (/^\d+$/.test(raw) && sId.endsWith(`-${raw.padStart(3, '0')}`)) ||
                    sSerial === query ||
                    sRoll === query;
            });
        }

        if (!found) {
            setScanFeedback({ type: 'error', text: `❌ No student found with ID / code: "${raw}"` });
            return;
        }

        // Student found!
        if (scannedIds.includes(found.id)) {
            if (instantMark) {
                markAttendance(found.id, instantStatus, filterDate);
                setScanFeedback({ type: 'success', text: `✓ ${found.name} (${found.id}) updated to ${instantStatus} for ${filterDate}!` });
            } else {
                setScanFeedback({ type: 'warning', text: `ℹ️ ${found.name} (${found.id}) is already in the selected list.` });
            }
        } else {
            setScannedIds(prev => [found.id, ...prev]);
            if (instantMark) {
                markAttendance(found.id, instantStatus, filterDate);
                setScanFeedback({ type: 'success', text: `✓ ${found.name} (${found.id}) marked ${instantStatus} for ${filterDate}!` });
            } else {
                setScanFeedback({ type: 'success', text: `✓ Added: ${found.name} (${found.id}) — ${found.grade || 'No class'}` });
            }
        }

        setIdInput('');
        setTimeout(() => idInputRef.current?.focus(), 10);
    };

    const markScannedQueue = async (status) => {
        if (scannedStudents.length === 0) return;
        const updates = scannedStudents.map(s => {
            const records = [...(s.attendance?.records || [])];
            const idx = records.findIndex(r => r.date === filterDate);
            if (idx >= 0) records[idx] = { date: filterDate, status };
            else records.push({ date: filterDate, status });
            const present = records.filter(r => r.status === 'present').length;
            const absent = records.filter(r => r.status === 'absent').length;
            const leave = records.filter(r => r.status === 'leave').length;
            const late = records.filter(r => r.status === 'late').length;
            const holiday = records.filter(r => r.status === 'holiday').length;
            const presentForPct = present + leave + late;
            const total = records.filter(r => r.status !== 'holiday').length;
            const percentage = total > 0 ? parseFloat(((presentForPct / total) * 100).toFixed(1)) : 0;
            return supabase.from('students').update({
                attendance: { records, total, present, absent, leave, late, holiday, percentage }
            }).eq('id', s.id);
        });

        try {
            const results = await Promise.all(updates);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) throw new Error('Some database updates failed');
            fetchData();
            const label = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : status === 'leave' ? 'Leave' : status === 'holiday' ? 'Holiday' : 'Late';
            showSaveMessage(`${scannedStudents.length} selected students marked ${label} for ${filterDate}!`);
            setScanFeedback({ type: 'success', text: `✓ All ${scannedStudents.length} selected students marked ${label} for ${filterDate}!` });
        } catch (err) {
            console.error('Batch scan mark error:', err);
            alert('Failed to mark selected students.');
            fetchData();
        }
    };

    const clearScannedQueue = () => {
        setScannedIds([]);
        setScanFeedback(null);
    };

    const removeScannedStudent = (id) => {
        setScannedIds(prev => prev.filter(item => item !== id));
    };

    const genderTabs = [
        { id: 'boys', label: '👦 Boys', count: boysCount, color: '#0369a1', bg: '#e0f2fe' },
        { id: 'girls', label: '👧 Girls', count: girlsCount, color: '#be185d', bg: '#fce7f3' },
        { id: 'all', label: '👥 All Students', count: allClassStudents.length, color: '#475569', bg: '#f1f5f9' },
    ];

    const presentToday = classStudents.filter(s => (s.attendance?.records || []).some(r => r.date === filterDate && r.status === 'present')).length;
    const absentToday = classStudents.filter(s => (s.attendance?.records || []).some(r => r.date === filterDate && r.status === 'absent')).length;
    const leaveToday = classStudents.filter(s => (s.attendance?.records || []).some(r => r.date === filterDate && r.status === 'leave')).length;
    const lateToday = classStudents.filter(s => (s.attendance?.records || []).some(r => r.date === filterDate && r.status === 'late')).length;
    const holidayToday = classStudents.filter(s => (s.attendance?.records || []).some(r => r.date === filterDate && r.status === 'holiday')).length;
    const unmarkedToday = classStudents.length - presentToday - absentToday - leaveToday - lateToday - holidayToday;

    const doPrint = () => {
        const sName = schoolName || 'School';
        const sLogo = schoolLogo || '/logo.png';
        const [yr, mo] = printMonth.split('-').map(Number);

        if (printMode === 'daily-class') {
            const htmls = selectedClasses.map(cls => buildDailyClassHTML(students, cls, filterDate, sName, genderTab, sLogo));
            openPrintWindow(htmls.join('<div style="page-break-after:always;"></div>'), `Daily Reports - ${selectedClasses.length} Classes`);
        } else if (printMode === 'monthly-class') {
            const htmls = selectedClasses.map(cls => buildMonthlyClassHTML(students, cls, yr, mo, sName, genderTab, sLogo));
            openPrintWindow(htmls.join('<div style="page-break-after:always;"></div>'), `Monthly Reports - ${selectedClasses.length} Classes`);
        } else if (printMode === 'student-daily') {
            const st = students.find(s => s.id === selectedStudentId);
            if (!st) return alert('Please select a student.');
            openPrintWindow(buildStudentDailyHTML(st, filterDate, sName, sLogo), `${st.name} - Daily Report`);
        } else if (printMode === 'student-monthly') {
            const st = students.find(s => s.id === selectedStudentId);
            if (!st) return alert('Please select a student.');
            openPrintWindow(buildStudentMonthlyHTML(st, yr, mo, sName, sLogo), `${st.name} - Monthly Report`);
        }
        setPrintMode(null);
    };

    const filteredStudentsForSearch = allClassStudents.filter(s => {
        const q = studentSearchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            (s.admissions?.[0]?.fatherName || '').toLowerCase().includes(q);
    });

    const isStudentMode = printMode === 'student-daily' || printMode === 'student-monthly';
    const isMonthMode = printMode === 'monthly-class' || printMode === 'student-monthly';

    return (
        <div className="animate-fade-in" style={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: '600px', background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>

            {/* Left Sidebar - Class Selection */}
            <div style={{
                width: isSidebarOpen ? '270px' : '0px',
                flexShrink: 0,
                background: '#f8fafc',
                borderRight: isSidebarOpen ? '1px solid #e2e8f0' : 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                {/* Header + Search */}
                <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid #e2e8f0', minWidth: '270px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <LayoutGrid size={14} color="#2563eb" /> Select Classes
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={sidebarSearch}
                            onChange={e => {
                                setSidebarSearch(e.target.value);
                                if (e.target.value) setExpandedSections((sections || []).map(s => s.name));
                                else setExpandedSections([]);
                            }}
                            style={{ width: '100%', padding: '0.45rem 0.5rem 0.45rem 1.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', background: 'white', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Sections Tree */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem', minWidth: '270px' }}>
                    {(sections || []).filter(section => {
                        if (!sidebarSearch) return true;
                        const q = sidebarSearch.toLowerCase();
                        if (section.name.toLowerCase().includes(q)) return true;
                        if ((section.classes || []).some(c => c.toLowerCase().includes(q))) return true;
                        return false;
                    }).map(section => {
                        const expanded = expandedSections.includes(section.name);
                        const checked = isSectionChecked(section);
                        const indeterminate = isSectionIndeterminate(section);

                        return (
                            <div key={section.name} style={{ marginBottom: '0.25rem' }}>
                                {/* Section Row */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem 0.6rem',
                                    borderRadius: '8px',
                                    background: checked ? '#eff6ff' : indeterminate ? '#f0f9ff' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}>
                                    {/* Expand arrow */}
                                    <button
                                        onClick={() => toggleSectionExpand(section.name)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', color: '#64748b', flexShrink: 0 }}
                                    >
                                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {/* Checkbox + Section Name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }} onClick={() => handleSectionCheckbox(section)}>
                                        <div style={{
                                            width: '16px', height: '16px', border: '2px solid',
                                            borderColor: checked || indeterminate ? '#2563eb' : '#cbd5e1',
                                            borderRadius: '3px',
                                            background: checked ? '#2563eb' : (indeterminate ? '#93c5fd' : 'white'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, transition: 'all 0.15s'
                                        }}>
                                            {checked && <Check size={10} color="white" strokeWidth={3.5} />}
                                            {indeterminate && <div style={{ width: '7px', height: '2px', background: 'white', borderRadius: '1px' }} />}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: checked ? '#1e40af' : '#334155', userSelect: 'none' }}>
                                            {section.name}
                                        </span>
                                    </div>
                                </div>

                                {/* Classes under section */}
                                {expanded && (
                                    <div style={{ marginLeft: '1.6rem', marginTop: '0.15rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                                        {(section.classes || []).map(className => {
                                            const isChecked = selectedClasses.includes(className);
                                            return (
                                                <div
                                                    key={className}
                                                    onClick={() => handleClassCheckbox(className)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        padding: '0.35rem 0.5rem', borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        background: isChecked ? '#eff6ff' : 'transparent',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '14px', height: '14px', border: '2px solid',
                                                        borderColor: isChecked ? '#2563eb' : '#d1d5db',
                                                        borderRadius: '3px',
                                                        background: isChecked ? '#2563eb' : 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {isChecked && <Check size={9} color="white" strokeWidth={3.5} />}
                                                    </div>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isChecked ? '#2563eb' : '#475569', userSelect: 'none' }}>
                                                        {className}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sidebar Toggle Tab - inline in flex row */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title={isSidebarOpen ? 'Close class panel' : 'Open class panel'}
                style={{
                    flexShrink: 0,
                    width: '20px',
                    height: '60px',
                    alignSelf: 'center',
                    borderRadius: '0 8px 8px 0',
                    background: '#2563eb',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '2px 0 8px rgba(37,99,235,0.25)',
                    color: 'white',
                    zIndex: 5
                }}
            >
                {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'block', minWidth: 0, overflowY: 'auto', padding: '1.5rem', background: 'white' }}>


                {/* ── Print Modal ── */}
                {printMode && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div className="card animate-fade-in" style={{ maxWidth: 480, width: '100%', padding: '1.75rem', borderTop: '4px solid #2563eb', position: 'relative' }}>
                            <button onClick={() => setPrintMode(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e293b', marginBottom: 4 }}>🖨 Print Attendance Report</div>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                                {printMode === 'daily-class' && `Daily report for ${selectedClasses.length} selected classes on ${filterDate}`}
                                {printMode === 'monthly-class' && `Monthly report for ${selectedClasses.length} selected classes`}
                                {printMode === 'student-daily' && `Individual daily report for ${filterDate}`}
                                {printMode === 'student-monthly' && `Individual monthly report`}
                            </div>

                            {isMonthMode && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Select Month</label>
                                    <input type="month" value={printMonth} onChange={e => setPrintMonth(e.target.value)}
                                        className="form-input" style={{ width: '100%' }} />
                                </div>
                            )}

                            {isStudentMode && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Search & Select Student</label>
                                    <input
                                        type="text"
                                        placeholder="Type name or ID..."
                                        className="form-input"
                                        value={studentSearchQuery}
                                        onChange={e => { setStudentSearchQuery(e.target.value); setSelectedStudentId(''); }}
                                        style={{ width: '100%', marginBottom: '0.5rem' }}
                                    />
                                    <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                        {filteredStudentsForSearch.length === 0 && (
                                            <div style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>No students found</div>
                                        )}
                                        {filteredStudentsForSearch.map(s => (
                                            <div key={s.id} onClick={() => { setSelectedStudentId(s.id); setStudentSearchQuery(s.name); }}
                                                style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', background: selectedStudentId === s.id ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                                onMouseEnter={e => { if (selectedStudentId !== s.id) e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={e => { if (selectedStudentId !== s.id) e.currentTarget.style.background = 'transparent'; }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{s.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.id} · {s.admissions?.[0]?.gender || '—'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(printMode === 'daily-class' || printMode === 'student-daily') && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Date</label>
                                    <input type="date" value={filterDate} onChange={e => setAttDateFilter(e.target.value)} className="form-input" style={{ width: '100%' }} />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button onClick={() => setPrintMode(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={doPrint} style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Printer size={16} /> Print Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>📅 Attendance</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>{selectedClasses.length} class(es) selected — {totalDays} day{totalDays !== 1 ? 's' : ''} recorded</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Selected Date with Quick Jump */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.65rem' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>Date:</label>
                            <input type="date" value={attDateFilter || today} onChange={e => setAttDateFilter(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', cursor: 'pointer' }} />
                            {attDateFilter && attDateFilter !== today && (
                                <button onClick={() => setAttDateFilter(today)} style={{ padding: '0.2rem 0.5rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Today</button>
                            )}
                        </div>

                        <button onClick={exportAttendanceExcel} style={{ ...excelBtnStyle, background: '#217346', color: 'white', borderColor: '#217346' }}>
                            <Download size={16} /> Export
                        </button>

                        {/* Print dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowPrintMenu(p => !p)}
                                style={{ ...excelBtnStyle, background: '#1e3a5f', color: 'white', borderColor: '#1e3a5f' }}>
                                <Printer size={16} /> Print <ChevronDown size={14} />
                            </button>
                            {showPrintMenu && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 260, overflow: 'hidden', maxHeight: '70vh', overflowY: 'auto' }}>
                                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc' }}>Class Reports</div>
                                    {[
                                        { id: 'daily-class', label: '📋 Daily Class Report', sub: `${filterDate}` },
                                        { id: 'monthly-class', label: '📆 Monthly Class Report', sub: 'Choose month' },
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => { setPrintMode(opt.id); setShowPrintMenu(false); }}
                                            style={{ display: 'block', width: '100%', padding: '0.6rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{opt.sub}</div>
                                        </button>
                                    ))}
                                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc' }}>Individual Student</div>
                                    {[
                                        { id: 'student-daily', label: '👤 Student Daily Report', sub: `${filterDate}` },
                                        { id: 'student-monthly', label: '👤 Student Monthly Report', sub: 'Choose month' },
                                    ].map(opt => (
                                        <button key={opt.id} onClick={() => { setPrintMode(opt.id); setStudentSearchQuery(''); setSelectedStudentId(''); setShowPrintMenu(false); }}
                                            style={{ display: 'block', width: '100%', padding: '0.6rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{opt.sub}</div>
                                        </button>
                                    ))}

                                    {/* ── ABSENT REPORTS ── */}
                                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#fef2f2' }}>🚫 Absent Reports</div>
                                    {[
                                        {
                                            label: 'Absent — Selected Classes', sub: `${selectedClasses.length} classes on ${filterDate}`, action: () => {
                                                const htmls = selectedClasses.map(cls => buildStatusClassHTML(students, cls, filterDate, schoolName || 'School', 'absent', schoolLogo || '/logo.png'));
                                                openPrintWindow(htmls.join('<div style="page-break-after:always;"></div>'), 'Absent Reports');
                                            }
                                        },
                                        { label: 'Absent — Section Wise', sub: `Matric / Inter on ${filterDate}`, action: () => openPrintWindow(buildStatusSectionHTML(students, sections, filterDate, schoolName || 'School', 'absent', schoolLogo || '/logo.png'), 'Section-Wise Absent Report') },
                                        { label: 'Absent — Whole College', sub: `All classes on ${filterDate}`, action: () => openPrintWindow(buildStatusCollegeHTML(students, filterDate, schoolName || 'School', 'absent', schoolLogo || '/logo.png'), 'College-Wide Absent Report') },
                                    ].map((opt, i) => (
                                        <button key={`abs-${i}`} onClick={() => { opt.action(); setShowPrintMenu(false); }}
                                            style={{ display: 'block', width: '100%', padding: '0.6rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.88rem' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{opt.sub}</div>
                                        </button>
                                    ))}

                                    {/* ── PRESENT REPORTS ── */}
                                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f0fdf4' }}>✓ Present Reports</div>
                                    {[
                                        {
                                            label: 'Present — Selected Classes', sub: `${selectedClasses.length} classes on ${filterDate}`, action: () => {
                                                const htmls = selectedClasses.map(cls => buildStatusClassHTML(students, cls, filterDate, schoolName || 'School', 'present', schoolLogo || '/logo.png'));
                                                openPrintWindow(htmls.join('<div style="page-break-after:always;"></div>'), 'Present Reports');
                                            }
                                        },
                                        { label: 'Present — Section Wise', sub: `Matric / Inter on ${filterDate}`, action: () => openPrintWindow(buildStatusSectionHTML(students, sections, filterDate, schoolName || 'School', 'present', schoolLogo || '/logo.png'), 'Section-Wise Present Report') },
                                        { label: 'Present — Whole College', sub: `All classes on ${filterDate}`, action: () => openPrintWindow(buildStatusCollegeHTML(students, filterDate, schoolName || 'School', 'present', schoolLogo || '/logo.png'), 'College-Wide Present Report') },
                                    ].map((opt, i) => (
                                        <button key={`prs-${i}`} onClick={() => { opt.action(); setShowPrintMenu(false); }}
                                            style={{ display: 'block', width: '100%', padding: '0.6rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.88rem' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{opt.sub}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Search bar — after Print */}
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} size={16} />
                            <input
                                type="text"
                                placeholder="Search students, ID..."
                                value={attSearchQuery}
                                onChange={e => setAttSearchQuery(e.target.value)}
                                style={{ padding: '0.5rem 0.8rem 0.5rem 2.1rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem', width: '190px', outline: 'none', background: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Gender Tabs ── */}
                <div style={{ display: 'flex', marginBottom: '1.5rem', borderRadius: '12px 12px 0 0', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    {genderTabs.map(tab => (
                        <button key={tab.id} onClick={() => setGenderTab(tab.id)} style={{
                            flex: 1, padding: '0.85rem 1rem', fontWeight: genderTab === tab.id ? 800 : 600, fontSize: '0.95rem',
                            color: genderTab === tab.id ? tab.color : '#94a3b8',
                            background: genderTab === tab.id ? tab.bg : 'transparent', border: 'none',
                            borderBottom: genderTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
                            cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}>
                            {tab.label}
                            <span style={{ background: genderTab === tab.id ? tab.color : '#cbd5e1', color: 'white', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── Date Stats (Compact Row) ── */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {[
                        { label: 'Total', val: classStudents.length, color: '#2563eb', bg: '#eff6ff' },
                        { label: 'Present', val: presentToday, color: '#16a34a', bg: '#f0fdf4' },
                        { label: 'Absent', val: absentToday, color: '#dc2626', bg: '#fef2f2' },
                        { label: 'Leave', val: leaveToday, color: '#7c3aed', bg: '#f5f3ff' },
                        { label: 'Late', val: lateToday, color: '#d97706', bg: '#fffbeb' },
                        { label: 'Unmarked', val: unmarkedToday, color: '#b45309', bg: '#fef3c7' },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: '12px', padding: '0.65rem 1rem', textAlign: 'center', flex: 1, minWidth: '100px' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                    ))}
                    <div style={{ background: '#e0f2fe', border: '1px solid #0369a122', borderRadius: '12px', padding: '0.65rem 1rem', textAlign: 'center', minWidth: '100px' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0369a1' }}>{totalDays}</div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Days</div>
                    </div>
                </div>

                {/* ── Table (Moved up) ── */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '1.5rem' }}>
                    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '55vh' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ background: '#0f172a', color: 'white' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white', fontSize: '0.85rem', fontWeight: 700, position: 'sticky', top: 0, left: 0, background: '#0f172a', zIndex: 30, minWidth: '180px' }}>Student</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: 'white', fontSize: '0.85rem', fontWeight: 700, position: 'sticky', top: 0, background: '#0f172a', zIndex: 20 }}>Attendance ({filterDate})</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: '#fca5a5', fontSize: '0.85rem', fontWeight: 700, position: 'sticky', top: 0, background: '#0f172a', zIndex: 20 }}>✗ Absents</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white', fontSize: '0.85rem', fontWeight: 700, position: 'sticky', top: 0, background: '#0f172a', zIndex: 20 }}>Overall %</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'white', fontSize: '0.85rem', fontWeight: 700, position: 'sticky', top: 0, background: '#0f172a', zIndex: 20 }}>Recent Records</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: 'white', fontSize: '0.85rem', fontWeight: 700, position: 'sticky', top: 0, background: '#0f172a', zIndex: 20 }}>Print</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStudents.map((student, rowIdx) => {
                                    const records = (student.attendance?.records || []).sort((a, b) => b.date.localeCompare(a.date));
                                    const todayRecord = records.find(r => r.date === filterDate);
                                    const pct = student.attendance?.percentage || 0;
                                    const pctColor = pct >= 90 ? '#16a34a' : pct >= 75 ? '#2563eb' : pct >= 60 ? '#d97706' : '#dc2626';
                                    return (
                                        <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9', background: rowIdx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                            <td style={{ padding: '0.85rem 1rem', position: 'sticky', left: 0, background: rowIdx % 2 === 0 ? 'white' : '#f8fafc', zIndex: 1, borderRight: '1px solid #e2e8f0' }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{student.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{student.id}</div>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', minWidth: '220px' }}>
                                                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <button onClick={() => markAttendance(student.id, 'present', filterDate)} title={`Mark Present for ${filterDate}`}
                                                        style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', background: todayRecord?.status === 'present' ? '#16a34a' : '#dcfce7', color: todayRecord?.status === 'present' ? 'white' : '#16a34a', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>✓ P</button>
                                                    <button onClick={() => markAttendance(student.id, 'absent', filterDate)} title={`Mark Absent for ${filterDate}`}
                                                        style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', background: todayRecord?.status === 'absent' ? '#dc2626' : '#fee2e2', color: todayRecord?.status === 'absent' ? 'white' : '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>✗ A</button>
                                                    <button onClick={() => markAttendance(student.id, 'holiday', filterDate)} title={`Mark Holiday for ${filterDate}`}
                                                        style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', background: todayRecord?.status === 'holiday' ? '#0284c7' : '#e0f2fe', color: todayRecord?.status === 'holiday' ? 'white' : '#0284c7', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>🌴 H</button>
                                                    <button onClick={() => markAttendance(student.id, 'leave', filterDate)} title={`Mark Leave for ${filterDate}`}
                                                        style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', background: todayRecord?.status === 'leave' ? '#7c3aed' : '#f5f3ff', color: todayRecord?.status === 'leave' ? 'white' : '#7c3aed', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>📋 L</button>
                                                    <button onClick={() => markAttendance(student.id, 'late', filterDate)} title={`Mark Late for ${filterDate}`}
                                                        style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', background: todayRecord?.status === 'late' ? '#d97706' : '#fffbeb', color: todayRecord?.status === 'late' ? 'white' : '#d97706', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>⏰ Lt</button>
                                                    {todayRecord && (
                                                        <button onClick={() => removeAttendanceRecord(student.id, filterDate)} title={`Clear attendance record for ${filterDate}`}
                                                            style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>↩</button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', minWidth: '100px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '0.3rem 0.8rem',
                                                        borderRadius: '999px',
                                                        fontWeight: 800,
                                                        fontSize: '1.05rem',
                                                        background: (student.attendance?.absent || 0) === 0 ? '#f0fdf4' : (student.attendance?.absent || 0) <= 3 ? '#fef3c7' : '#fee2e2',
                                                        color: (student.attendance?.absent || 0) === 0 ? '#16a34a' : (student.attendance?.absent || 0) <= 3 ? '#d97706' : '#dc2626',
                                                        border: `2px solid ${(student.attendance?.absent || 0) === 0 ? '#86efac' : (student.attendance?.absent || 0) <= 3 ? '#fcd34d' : '#fca5a5'}`,
                                                        minWidth: '42px',
                                                    }}>
                                                        {student.attendance?.absent || 0}
                                                    </span>
                                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>of {student.attendance?.total || 0} days</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', minWidth: '130px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pctColor, minWidth: '38px' }}>{pct}%</span>
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                    {student.attendance?.present || 0}P / {student.attendance?.absent || 0}A / {student.attendance?.total || 0} days
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                {(() => {
                                                    const isExpanded = expandedHistoryIds[student.id];
                                                    const currentMonthRecs = records.filter(r => r.date.startsWith(currentMonthPrefix));
                                                    const displayRecs = isExpanded ? records : currentMonthRecs;
                                                    return (
                                                        <div>
                                                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxWidth: '360px', marginBottom: '0.3rem' }}>
                                                                {displayRecs.map(r => {
                                                                    const chipColor = r.status === 'present' ? { bg: '#dcfce7', color: '#15803d', border: '#86efac' }
                                                                        : r.status === 'absent' ? { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' }
                                                                            : r.status === 'leave' ? { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' }
                                                                                : r.status === 'late' ? { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' }
                                                                                    : { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' };
                                                                    const statusIcon = r.status === 'present' ? '✓' : r.status === 'absent' ? '✗' : r.status === 'leave' ? '📋' : r.status === 'late' ? '⏰' : '?';
                                                                    return (
                                                                        <span key={r.date} title={`${r.date} — click to remove`}
                                                                            onClick={() => openConfirm('Remove Record', `Remove attendance record for ${student.name} on ${r.date}?`, () => removeAttendanceRecord(student.id, r.date), false)}
                                                                            style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', background: chipColor.bg, color: chipColor.color, border: `1px solid ${chipColor.border}` }}>
                                                                            {r.date.slice(5)} {statusIcon}
                                                                        </span>
                                                                    );
                                                                })}
                                                                {displayRecs.length === 0 && !isExpanded && <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontStyle: 'italic' }}>No records this month</span>}
                                                            </div>
                                                            {records.length > 0 && (
                                                                <button onClick={() => toggleStudentHistory(student.id)} style={{ fontSize: '0.68rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                                                                    {isExpanded ? '▲ Hide History' : `📂 History (${records.length} total)`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            {/* Per-row print buttons */}
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', minWidth: 120 }}>
                                                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    <button
                                                        title="Print daily report for this student"
                                                        onClick={() => {
                                                            const sName = schoolName || 'School';
                                                            const sLogo = schoolLogo || '/logo.png';
                                                            openPrintWindow(buildStudentDailyHTML(student, filterDate, sName, sLogo), `${student.name} - Daily`);
                                                        }}
                                                        style={{ padding: '0.3rem 0.5rem', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        📋 Daily
                                                    </button>
                                                    <button
                                                        title="Print monthly report for this student"
                                                        onClick={() => { setSelectedStudentId(student.id); setStudentSearchQuery(student.name); setPrintMode('student-monthly'); }}
                                                        style={{ padding: '0.3rem 0.5rem', borderRadius: 6, background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        📆 Monthly
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {classStudents.length === 0 && (
                                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No students found for selected filter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Quick ID Entry & Selection Panel ── */}
                <div className="card" style={{
                    background: '#ffffff',
                    border: '2px solid #3b82f6',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={22} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>
                                    ⚡ Quick ID Entry & Selection
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    Enter student IDs/codes to build a selection list & mark attendance for <strong style={{ color: '#2563eb' }}>{filterDate}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Instant Mode Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={instantMark}
                                    onChange={e => setInstantMark(e.target.checked)}
                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                                Instant Mark on Enter
                            </label>
                            {instantMark && (
                                <select
                                    value={instantStatus}
                                    onChange={e => setInstantStatus(e.target.value)}
                                    style={{ padding: '0.25rem 0.55rem', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, background: 'white', color: '#1e293b' }}
                                >
                                    <option value="present">✓ Present</option>
                                    <option value="absent">✗ Absent</option>
                                    <option value="leave">📋 Leave</option>
                                    <option value="late">⏰ Late</option>
                                    <option value="holiday">🌴 Holiday</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Input Form with fixed prefix */}
                    <form onSubmit={handleAddId} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #3b82f6', borderRadius: '10px', overflow: 'hidden', background: 'white', flex: 1, minWidth: '280px', maxWidth: '580px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                padding: '0.6rem 0.85rem',
                                borderRight: '1.5px solid #bfdbfe',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                userSelect: 'none'
                            }}>
                                <input
                                    type="text"
                                    value={idPrefix}
                                    onChange={e => setIdPrefix(e.target.value)}
                                    title="Edit ID Prefix (default: ACS-2026-)"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#1d4ed8',
                                        fontWeight: 800,
                                        fontSize: '0.92rem',
                                        width: '95px',
                                        outline: 'none',
                                        cursor: 'text'
                                    }}
                                />
                            </div>
                            <input
                                ref={idInputRef}
                                type="text"
                                value={idInput}
                                onChange={e => setIdInput(e.target.value)}
                                placeholder="Enter code (e.g. 001, 045)..."
                                autoFocus
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    padding: '0.6rem 0.85rem',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    outline: 'none',
                                    color: '#0f172a'
                                }}
                            />
                            {idInput && (
                                <button
                                    type="button"
                                    onClick={() => { setIdInput(''); idInputRef.current?.focus(); }}
                                    style={{ background: 'none', border: 'none', padding: '0 0.6rem', cursor: 'pointer', color: '#94a3b8' }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <button
                            type="submit"
                            style={{
                                padding: '0.62rem 1.3rem',
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                            }}
                        >
                            <Plus size={16} /> Add ID
                        </button>

                        {scannedIds.length > 0 && (
                            <button
                                type="button"
                                onClick={clearScannedQueue}
                                style={{
                                    padding: '0.62rem 1rem',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                }}
                            >
                                <Trash2 size={15} /> Clear List ({scannedIds.length})
                            </button>
                        )}
                    </form>

                    {/* Live Feedback banner */}
                    {scanFeedback && (
                        <div style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            marginBottom: '0.75rem',
                            display: 'inline-block',
                            background: scanFeedback.type === 'success' ? '#dcfce7' : scanFeedback.type === 'error' ? '#fee2e2' : '#fef3c7',
                            color: scanFeedback.type === 'success' ? '#15803d' : scanFeedback.type === 'error' ? '#dc2626' : '#b45309',
                            border: `1px solid ${scanFeedback.type === 'success' ? '#86efac' : scanFeedback.type === 'error' ? '#fca5a5' : '#fcd34d'}`
                        }}>
                            {scanFeedback.text}
                        </div>
                    )}

                    {/* Selected Students Table / Queue */}
                    {scannedStudents.length > 0 && (
                        <div style={{ marginTop: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', overflow: 'hidden' }}>
                            {/* Batch Action Bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <span style={{ background: '#2563eb', color: 'white', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem' }}>
                                        {scannedStudents.length}
                                    </span>
                                    Selected Students:
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <button onClick={() => markScannedQueue('present')} style={{ padding: '0.45rem 0.85rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>✓ Mark Present</button>
                                    <button onClick={() => markScannedQueue('absent')} style={{ padding: '0.45rem 0.85rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>✗ Mark Absent</button>
                                    <button onClick={() => markScannedQueue('leave')} style={{ padding: '0.45rem 0.85rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>📋 Mark Leave</button>
                                    <button onClick={() => markScannedQueue('late')} style={{ padding: '0.45rem 0.85rem', background: '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>⏰ Mark Late</button>
                                    <button onClick={() => markScannedQueue('holiday')} style={{ padding: '0.45rem 0.85rem', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>🌴 Mark Holiday</button>
                                </div>
                            </div>

                            {/* List Table */}
                            <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                                    <thead>
                                        <tr style={{ background: '#0f172a', color: 'white' }}>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>#</th>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Student ID</th>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Name</th>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Class</th>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 700 }}>Father Name</th>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Status ({filterDate})</th>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Quick Mark</th>
                                            <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>Remove</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scannedStudents.map((st, idx) => {
                                            const rec = (st.attendance?.records || []).find(r => r.date === filterDate);
                                            const stStatus = rec?.status || 'unmarked';
                                            const badgeStyle = stStatus === 'present' ? { bg: '#dcfce7', color: '#15803d', label: '✓ Present' }
                                                : stStatus === 'absent' ? { bg: '#fee2e2', color: '#dc2626', label: '✗ Absent' }
                                                : stStatus === 'leave' ? { bg: '#ede9fe', color: '#7c3aed', label: '📋 Leave' }
                                                : stStatus === 'late' ? { bg: '#fef3c7', color: '#d97706', label: '⏰ Late' }
                                                : stStatus === 'holiday' ? { bg: '#e0f2fe', color: '#0369a1', label: '🌴 Holiday' }
                                                : { bg: '#f1f5f9', color: '#94a3b8', label: '— Unmarked' };
                                            return (
                                                <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                                    <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 800, color: '#1d4ed8' }}>{st.id}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#1e293b' }}>{st.name}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', color: '#475569', fontWeight: 600 }}>{st.grade || '—'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{st.admissions?.[0]?.fatherName || '—'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700, background: badgeStyle.bg, color: badgeStyle.color }}>
                                                            {badgeStyle.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                            <button onClick={() => markAttendance(st.id, 'present', filterDate)} style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: stStatus === 'present' ? '#16a34a' : '#dcfce7', color: stStatus === 'present' ? 'white' : '#16a34a', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}>✓ P</button>
                                                            <button onClick={() => markAttendance(st.id, 'absent', filterDate)} style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: stStatus === 'absent' ? '#dc2626' : '#fee2e2', color: stStatus === 'absent' ? 'white' : '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}>✗ A</button>
                                                            <button onClick={() => markAttendance(st.id, 'leave', filterDate)} style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: stStatus === 'leave' ? '#7c3aed' : '#f5f3ff', color: stStatus === 'leave' ? 'white' : '#7c3aed', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}>📋 L</button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                        <button onClick={() => removeScannedStudent(st.id)} title="Remove from list" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.2rem' }}>
                                                            <X size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Mark All (Moved down) ── */}
                <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>Mark <span style={{ color: '#7c3aed' }}>{genderTab === 'all' ? 'All Students' : genderTab === 'boys' ? 'Boys' : 'Girls'}</span> for: <span style={{ color: '#2563eb' }}>{filterDate}</span></div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>Click to mark all {classStudents.length} students at once</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => markAll('present')} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>✓ All Present</button>
                        <button onClick={() => markAll('absent')} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>✗ All Absent</button>
                        <button onClick={() => markAll('holiday')} style={{ padding: '0.5rem 1rem', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>🌴 All Holiday</button>
                        <button onClick={() => openConfirm('Unmark All', `Remove attendance records for all ${classStudents.length} students on ${filterDate}?`, unmarkAll, true)} style={{ padding: '0.5rem 1rem', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>↩ Unmark All</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTab;
