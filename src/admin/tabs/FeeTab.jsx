import React, { useState, useEffect } from 'react';
import { Search, X, Printer, ChevronDown, Activity, FileText, Settings, Save, Calendar, BarChart2 } from 'lucide-react';
import { getBaseClass } from '../utils/gradeUtils';

// Helper for generic avatar initials
const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';

// Clean money formatter
const formatM = (num) => {
    if (!num && num !== 0) return 'RS 0';
    return 'RS ' + Number(num).toLocaleString('en-PK');
};

// Calculate rolling historical balance (arrears or advance) BEFORE the current month 
const calculateRollingBalance = (student, currentMonthLabel) => {
    const getTime = (m) => m ? (m.startsWith('Arrears') ? new Date(m.split('-')[1]?.trim() || 0).getTime() || 0 : new Date(m).getTime()) : 0;
    const sorted = [...(student.feeHistory || [])].sort((a, b) => getTime(a.month) - getTime(b.month));
    let previousArrears = 0;
    for (let h of sorted) {
        if (h.month === currentMonthLabel) break;
        const net = ((h.tuitionFee||0)+(h.labFee||0)+(h.examFee||0)+(h.admissionFee||0)+(h.lateFine||0)+(h.annualFee||0)+(h.transportFee||0)) - (h.discount||0);
        const paid = Number(h.paidAmount) || 0;
        previousArrears += (net - paid);
    }
    return previousArrears;
};

// ── Challan / Receipt printer ──────────────────────────────────────────────
const printChallan = (student, record, schoolName = 'ACS College') => {
    const rollingArrears = calculateRollingBalance(student, record.month);
    const tuition = record.tuitionFee || 0;
    const lib = record.labFee || 0;
    const exam = record.examFee || 0;
    const adm = record.admissionFee || 0;
    const late = record.lateFine || 0;
    const disc = record.discount || 0;
    const currentMonthNet = tuition + lib + exam + adm + late - disc;
    const net = currentMonthNet + rollingArrears;
    const paid = record.paidAmount || 0;
    const balance = net - paid;

    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`<!DOCTYPE html><html><head><title>Challan - ${student.name}</title>
    <style>body{font-family:Arial,sans-serif;margin:0;padding:0;font-size:12px;}
    .page{width:360px;margin:10px auto;border:2px solid #000;padding:12px;}
    .header{text-align:center;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:8px;}
    .header h2{margin:0;font-size:16px;} .header p{margin:2px 0;color:#555;font-size:11px;}
    .info-row{display:flex;justify-content:space-between;margin:3px 0;}
    .table{width:100%;border-collapse:collapse;margin:8px 0;}
    .table th,.table td{border:1px solid #999;padding:4px 6px;text-align:left;font-size:11px;}
    .table th{background:#f0f0f0;font-weight:bold;}
    .total-row{font-weight:bold;background:#e8f5e9;}
    .balance-row{font-weight:bold;background:${balance > 0 ? '#ffebee' : '#e8f5e9'};}
    .footer{text-align:center;border-top:1px solid #000;margin-top:8px;padding-top:6px;font-size:10px;color:#777;}
    .stamp{border:2px dashed ${record.status === 'paid' ? 'green' : 'red'};padding:4px 10px;display:inline-block;color:${record.status === 'paid' ? 'green' : 'red'};font-weight:bold;font-size:14px;margin:6px 0;}
    </style></head><body>
    <div class='page'>
        <div class='header'>
            <h2>${schoolName}</h2>
            <p>Fee Challan / Receipt</p>
            <p>${record.month}</p>
        </div>
        <div class='info-row'><span><b>Student:</b> ${student.name}</span></div>
        <div class='info-row'><span><b>ID:</b> ${student.id}</span><span><b>Class:</b> ${student.grade}</span></div>
        <table class='table'>
            <tr><th>Description</th><th>Amount</th></tr>
            ${tuition > 0 ? `<tr><td>Tuition Fee</td><td>RS ${tuition.toLocaleString('en-PK')}</td></tr>` : ''}
            ${lib > 0 ? `<tr><td>Library / Lab Fee</td><td>RS ${lib.toLocaleString('en-PK')}</td></tr>` : ''}
            ${exam > 0 ? `<tr><td>Paper Fund / Exam Fee</td><td>RS ${exam.toLocaleString('en-PK')}</td></tr>` : ''}
            ${adm > 0 ? `<tr><td>Admission / Admin Fee</td><td>RS ${adm.toLocaleString('en-PK')}</td></tr>` : ''}
            ${late > 0 ? `<tr><td>Late Fine</td><td>RS ${late.toLocaleString('en-PK')}</td></tr>` : ''}
            ${disc > 0 ? `<tr><td>Discount</td><td>- RS ${disc.toLocaleString('en-PK')}</td></tr>` : ''}
            ${rollingArrears > 0 ? `<tr><td>Previous Arrears</td><td>RS ${rollingArrears.toLocaleString('en-PK')}</td></tr>` : ''}
            ${rollingArrears < 0 ? `<tr><td>Advance (Credit)</td><td>RS ${rollingArrears.toLocaleString('en-PK')}</td></tr>` : ''}
            <tr class='total-row'><td>Net Total Due</td><td>RS ${net.toLocaleString('en-PK')}</td></tr>
            <tr><td>Amount Received</td><td>RS ${paid.toLocaleString('en-PK')}</td></tr>
            <tr class='balance-row'><td>Remaining Balance</td><td>RS ${balance.toLocaleString('en-PK')}</td></tr>
        </table>
        <div style='text-align:center'>
            <div class='stamp'>${record.status === 'paid' ? '✓ PAID' : 'UNPAID'}</div>
        </div>
        ${record.paidOn ? `<div class='info-row'><span><b>Paid On:</b> ${record.paidOn}</span><span><b>Method:</b> ${record.paymentMethod || 'Cash'}</span></div>` : ''}
        <div class='footer'>This is a computer-generated challan. Keep safe for records.</div>
    </div>
    <script>window.print();window.onafterprint=()=>window.close();</script>
    </body></html>`);
    w.document.close();
};

// ── Class Fee Report printer ──────────────────────────────────────────────
const printClassReport = (students, monthLabel, className, schoolName = 'ACS College') => {
    const classStudents = (className === 'All' ? students : students.filter(s => getBaseClass(s.grade) === getBaseClass(className))).filter(s => (s.status || 'active') === 'active');
    let totalDue = 0, totalPaid = 0;

    const rows = classStudents.map(s => {
        const h = (s.feeHistory || []).find(r => r.month === monthLabel);
        const net = h ? ((h.tuitionFee || 0) + (h.labFee || 0) + (h.examFee || 0) + (h.admissionFee || 0) + (h.lateFine || 0) - (h.discount || 0)) : 0;
        const paid = h ? (Number(h.paidAmount) || 0) : 0;
        const status = h ? (h.status || 'unpaid') : 'no record';
        totalDue += net;
        totalPaid += paid;
        return { name: s.name, id: s.id, grade: s.grade, net, paid, status };
    });

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`<!DOCTYPE html><html><head><title>Fee Report - ${monthLabel}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
    h2{text-align:center;} p{text-align:center;color:#555;margin:2px 0;}
    table{width:100%;border-collapse:collapse;margin-top:15px;}
    th,td{border:1px solid #999;padding:5px 8px;text-align:left;}
    th{background:#e8eaf6;font-weight:bold;} .paid{color:green;font-weight:bold;} .unpaid{color:red;font-weight:bold;} .partial{color:orange;font-weight:bold;}
    .total-row{background:#f5f5f5;font-weight:bold;}
    </style></head><body>
    <h2>${schoolName}</h2>
    <p>Fee Collection Report — ${monthLabel}</p>
    <p>Class: ${className} | Generated: ${new Date().toLocaleString()}</p>
    <table>
        <tr><th>#</th><th>Student Name</th><th>Class</th><th>Student ID</th><th>Amount Due</th><th>Amount Paid</th><th>Balance</th><th>Status</th></tr>
        ${rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td><td>${r.name}</td><td>${r.grade}</td><td>${r.id}</td>
                <td>RS ${r.net.toLocaleString('en-PK')}</td>
                <td>RS ${r.paid.toLocaleString('en-PK')}</td>
                <td>RS ${(r.net - r.paid).toLocaleString('en-PK')}</td>
                <td class='${r.status}'>${r.status.toUpperCase()}</td>
            </tr>`).join('')}
        <tr class='total-row'><td colspan='4'>TOTAL</td><td>RS ${totalDue.toLocaleString('en-PK')}</td><td>RS ${totalPaid.toLocaleString('en-PK')}</td><td>RS ${(totalDue - totalPaid).toLocaleString('en-PK')}</td><td></td></tr>
    </table>
    <script>window.print();window.onafterprint=()=>window.close();</script>
    </body></html>`);
    w.document.close();
};

// ── Student Full History Ledger printer ──────────────────────────────────
const printStudentStatement = (student, schoolName = 'ACS College') => {
    const getTime = (m) => m ? (m.startsWith('Arrears') ? new Date(m.split('-')[1]?.trim() || 0).getTime() || 0 : new Date(m).getTime()) : 0;
    const history = [...(student.feeHistory || [])].sort((a, b) => getTime(a.month) - getTime(b.month));
    
    let grandTotalDue = 0;
    let grandTotalPaid = 0;
    
    const rows = history.map(h => {
        const net = ((h.tuitionFee||0)+(h.labFee||0)+(h.examFee||0)+(h.admissionFee||0)+(h.lateFine||0)+(h.annualFee||0)+(h.transportFee||0)) - (h.discount||0);
        const paid = Number(h.paidAmount) || 0;
        grandTotalDue += net;
        grandTotalPaid += paid;
        return { month: h.month, net, paid, status: h.status || 'unpaid', transactions: h.transactions || [] };
    });

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`<!DOCTYPE html><html><head><title>Ledger - ${student.name}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px;}
    h2{text-align:center;} p{text-align:center;color:#555;margin:2px 0;}
    table{width:100%;border-collapse:collapse;margin-top:15px;}
    th,td{border:1px solid #999;padding:6px 8px;text-align:left;}
    th{background:#f0fdf4;font-weight:bold;color:#166534;}
    .paid{color:green;font-weight:bold;} .unpaid{color:red;font-weight:bold;} .partial{color:orange;font-weight:bold;}
    .total-row{background:#f5f5f5;font-weight:bold;}
    .tx-list{font-size:10px;color:#666;margin:0;padding-left:12px;}
    </style></head><body>
    <h2>${schoolName}</h2>
    <p>Student Ledger History Statement</p>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;margin-top:15px;padding-bottom:5px;">
        <div><b>Student:</b> ${student.name} (${student.id})</div>
        <div><b>Class:</b> ${student.grade}</div>
        <div><b>Date:</b> ${new Date().toLocaleDateString()}</div>
    </div>
    <table>
        <tr><th>Month / Record</th><th>Total Billed</th><th>Total Received</th><th>Balance</th><th>Transactions</th><th>Status</th></tr>
        ${rows.map(r => `
            <tr>
                <td><b>${r.month}</b></td>
                <td>RS ${r.net.toLocaleString('en-PK')}</td>
                <td>RS ${r.paid.toLocaleString('en-PK')}</td>
                <td>RS ${(r.net - r.paid).toLocaleString('en-PK')}</td>
                <td>
                    ${r.transactions.length > 0 ? `<ul class="tx-list">${r.transactions.map(t => `<li>${t.date}: + RS ${t.amount}</li>`).join('')}</ul>` : '—'}
                </td>
                <td class='${r.status}'>${r.status.toUpperCase()}</td>
            </tr>`).join('')}
        <tr class='total-row'><td colspan='1'>GRANT TOTAL</td><td>RS ${grandTotalDue.toLocaleString('en-PK')}</td><td>RS ${grandTotalPaid.toLocaleString('en-PK')}</td><td>RS ${(grandTotalDue - grandTotalPaid).toLocaleString('en-PK')}</td><td colspan='2'></td></tr>
    </table>
    <script>window.print();window.onafterprint=()=>window.close();</script>
    </body></html>`);
    w.document.close();
};


const MONTH_LABEL = (y, m) => new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

const StudentSidebar = ({ activeStudent, setActiveStudentId, CLASS_FEE_DEFAULTS, updateStudentFeeRecord, handlePrintReceipt }) => {
    const history = activeStudent.feeHistory || [];
    // Sort months chronologically (regular months first, arrears last)
    const regularMonths = history.filter(h => h.month && !h.month.startsWith('Arrears'));
    const arrearsMonths = history.filter(h => h.month && h.month.startsWith('Arrears'));

    // Default to the latest unpaid regular month, or last regular month, or first
    const defaultMonth = (regularMonths.find(h => h.status !== 'paid') || regularMonths[regularMonths.length - 1])?.month || history[0]?.month || '';

    const [selectedMonthLabel, setSelectedMonthLabel] = useState(defaultMonth);

    // When student changes, reset to their latest unpaid
    useEffect(() => {
        const defMonth = (regularMonths.find(h => h.status !== 'paid') || regularMonths[regularMonths.length - 1])?.month || history[0]?.month || '';
        setSelectedMonthLabel(defMonth);
    }, [activeStudent.id]);

    const activeRecord = history.find(h => h.month === selectedMonthLabel) || { month: 'No Records' };

    const cDef = (CLASS_FEE_DEFAULTS && CLASS_FEE_DEFAULTS[activeStudent.grade]) || { tuitionFee: 0, labFee: 0, examFee: 0, admissionFee: 0 };
    const customTuition = activeStudent.monthlyFee;
    const hasRecords = history.length > 0;

    const defaultTuition = activeRecord.tuitionFee ?? (customTuition ? Number(customTuition) : (cDef.tuitionFee ?? 0));
    const defaultLib = activeRecord.labFee ?? (cDef.labFee ?? 0);
    const defaultExam = activeRecord.examFee ?? (cDef.examFee ?? 0);
    const defaultAd = activeRecord.admissionFee ?? (cDef.admissionFee ?? 0);
    const lateAmt = activeRecord.lateFine ?? 0;
    const discAmt = activeRecord.discount ?? 0;

    const isPaid = activeRecord.status === 'paid';

    const [arrearsInput, setArrearsInput] = useState('');
    const [receiveAmountInput, setReceiveAmountInput] = useState('');
    const [isEditing, setIsEditing] = useState(!hasRecords);
    const [form, setForm] = useState({ tuitionFee: 0, labFee: 0, examFee: 0, admissionFee: 0, lateFine: 0, discount: 0 });

    useEffect(() => {
        setIsEditing(!hasRecords);
        setForm({ tuitionFee: defaultTuition, labFee: defaultLib, examFee: defaultExam, admissionFee: defaultAd, lateFine: lateAmt, discount: discAmt });
        setReceiveAmountInput('');
    }, [activeStudent.id, selectedMonthLabel, defaultTuition, defaultLib, defaultExam, defaultAd, lateAmt, discAmt]);

    const monthNet = (form.tuitionFee + form.labFee + form.examFee + form.admissionFee + form.lateFine) - form.discount;
    const rollingArrears = calculateRollingBalance(activeStudent, selectedMonthLabel);
    const netTotal = monthNet + rollingArrears;
    const alreadyPaidAmount = Number(activeRecord.paidAmount) || 0;
    const balance = Math.max(0, netTotal - alreadyPaidAmount);

    const handleSaveFees = () => {
        const now = new Date();
        const monthLabel = hasRecords ? activeRecord.month : MONTH_LABEL(now.getFullYear(), now.getMonth() + 1);
        updateStudentFeeRecord(activeStudent.id, monthLabel, { month: monthLabel, ...form, status: activeRecord.status || 'unpaid' });
        setIsEditing(false);
    };


    return (
        <div style={{ width: '340px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <button onClick={() => setActiveStudentId(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={16} /></button>

            {/* Profile Header */}
            <div style={{ padding: '2rem 1.5rem 1.5rem', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e5e7eb', margin: '0 auto 1rem', overflow: 'hidden' }}>
                    {activeStudent.photo ? <img src={activeStudent.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'white', fontWeight: 700, background: '#9ca3af' }}>{getInitials(activeStudent.name)}</div>}
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{activeStudent.name}</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span>Student ID</span><span style={{ color: '#111827' }}>{activeStudent.id}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span>Class</span><span style={{ color: '#111827' }}>{activeStudent.grade}</span></div>
                </div>
            </div>

            {/* Details Content */}
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>

                {/* Month Selector */}
                {history.length > 0 && (
                    <div style={{ marginBottom: '1rem', background: '#f8fafc', borderRadius: '8px', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.3rem' }}>Viewing Month</label>
                        <select
                            value={selectedMonthLabel}
                            onChange={e => { setSelectedMonthLabel(e.target.value); setIsEditing(false); }}
                            style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#111827', background: 'white', cursor: 'pointer' }}
                        >
                            {regularMonths.length > 0 && <optgroup label="Monthly Fee Records">
                                {regularMonths.map(h => (
                                    <option key={h.month} value={h.month}>
                                        {h.month} — {h.status === 'paid' ? '✓ Paid' : h.status === 'partial' ? '◑ Partial' : '✗ Unpaid'}
                                    </option>
                                ))}
                            </optgroup>}
                            {arrearsMonths.length > 0 && <optgroup label="Arrears">
                                {arrearsMonths.map(h => (
                                    <option key={h.month} value={h.month}>
                                        {h.month} — {h.status === 'paid' ? '✓ Paid' : '✗ Unpaid'}
                                    </option>
                                ))}
                            </optgroup>}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', margin: 0 }}>Fee Breakdown <span style={{ color: '#6b7280', fontWeight: 500 }}>(Total: {formatM(netTotal)})</span></h4>
                    {!isPaid && !isEditing && (
                        <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: '#4338ca', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{hasRecords ? 'Edit' : '+ Add Fee'}</button>
                    )}
                </div>


                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#4b5563', marginBottom: '1.5rem' }}>
                    {['tuitionFee', 'labFee', 'examFee', 'admissionFee'].map((field, idx) => {
                        const labels = ['Tuition Fee', 'Library Fee', 'Paper Fund / Exam', 'Lab / Admin Fee'];
                        return (
                            <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{labels[idx]}</span>
                                {isEditing ? (
                                    <input type="number" value={form[field]} onChange={e => setForm({ ...form, [field]: Number(e.target.value) })} style={{ width: '70px', textAlign: 'right', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.2rem', outline: 'none', fontSize: '0.8rem' }} />
                                ) : (
                                    <span style={{ fontWeight: 600, color: '#111827' }}>{formatM(form[field])}</span>
                                )}
                            </div>
                        );
                    })}
                    {isEditing && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.75rem', marginRight: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSaveFees} style={{ background: '#4338ca', border: 'none', color: 'white', fontSize: '0.75rem', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Save Fees</button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Current Due</span><span style={{ fontWeight: 600, color: '#111827' }}>{formatM(monthNet)}</span></div>
                    {rollingArrears !== 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>{rollingArrears > 0 ? 'Previous Arrears' : 'Advance Credit'}</span><span style={{ fontWeight: 600, color: rollingArrears > 0 ? '#dc2626' : '#16a34a' }}>{formatM(rollingArrears)}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Net Total Due</span><span style={{ fontWeight: 700, color: '#111827' }}>{formatM(netTotal)}</span></div>
                    {alreadyPaidAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Amount Received</span><span style={{ fontWeight: 600, color: '#16a34a' }}>{formatM(alreadyPaidAmount)}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Remaining Balance</span><span style={{ fontWeight: 800, color: isPaid ? '#16a34a' : (balance > 0 ? '#dc2626' : '#111827') }}>{isPaid ? formatM(0) : formatM(balance)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Status</span><span style={{ fontWeight: 700, color: isPaid ? '#16a34a' : (activeRecord.status === 'partial' ? '#f59e0b' : '#dc2626') }}>{isPaid ? 'Paid' : (activeRecord.status === 'partial' ? 'Partial' : 'Unpaid')}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Month</span><span style={{ fontWeight: 600, color: '#111827' }}>{activeRecord.month}</span></div>
                </div>

                {balance > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Receive Payment Breakdown</label>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>Total Ready: <span style={{ color: '#10b981', fontWeight: 800 }}>{formatM(Number(receiveAmountInput || 0))}</span></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                           <input type="number" placeholder={`Amount (e.g. ${balance})`} value={receiveAmountInput} onChange={e => setReceiveAmountInput(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.85rem' }} />
                        </div>
                        <button onClick={() => {
                            const payAmt = receiveAmountInput === '' ? balance : Number(receiveAmountInput);
                            if (payAmt <= 0) return;
                            const newTotalPaid = alreadyPaidAmount + payAmt;
                            const newStatus = newTotalPaid >= netTotal ? 'paid' : 'partial';
                            const now = new Date();
                            const todayStr = new Date().toLocaleDateString();
                            const monthLabel = hasRecords ? activeRecord.month : MONTH_LABEL(now.getFullYear(), now.getMonth() + 1);
                            
                            const newTx = { date: todayStr, amount: payAmt, note: "Itemized UI pending full ledger integration" };
                            const transactions = [...(activeRecord.transactions || []), newTx];
                            
                            updateStudentFeeRecord(activeStudent.id, monthLabel, { 
                                month: monthLabel, 
                                ...form, 
                                paidAmount: newTotalPaid, 
                                status: newStatus, 
                                paidOn: todayStr,
                                transactions 
                            });
                            setReceiveAmountInput('');
                        }} style={{ padding: '0.6rem 1rem', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: '0.4rem' }}>
                            Mark Received
                        </button>
                    </div>
                )}

                {/* Transaction Ledger */}
                {activeRecord.transactions?.length > 0 && (
                    <div style={{ marginBottom: '1rem', background: '#f0fdf4', padding: '0.8rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', margin: '0 0 0.5rem', textTransform: 'uppercase' }}>Ledger History</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {activeRecord.transactions.map((tx, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151', borderBottom: idx === activeRecord.transactions.length - 1 ? 'none' : '1px dashed #86efac', paddingBottom: idx === activeRecord.transactions.length - 1 ? 0 : '0.3rem' }}>
                                    <span style={{color: '#166534'}}>{tx.date}</span>
                                    <span style={{ fontWeight: 700, color: '#15803d' }}>+ {formatM(tx.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                    {isPaid ? (
                        <button onClick={() => handlePrintReceipt(activeStudent, activeRecord)} style={{ flex: 1, padding: '0.6rem', background: '#4338ca', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Print Invoice</button>
                    ) : null}
                    <button onClick={() => handlePrintReceipt(activeStudent, activeRecord)} style={{ flex: 1, padding: '0.6rem', background: '#4338ca', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: !hasRecords ? 0.5 : 1 }}>Print Receipt</button>
                </div>
                
                <button onClick={() => printStudentStatement(activeStudent)} disabled={!hasRecords} style={{ width: '100%', padding: '0.6rem', background: 'white', color: '#166534', borderRadius: '6px', border: '1px solid #166534', fontWeight: 700, fontSize: '0.8rem', cursor: hasRecords ? 'pointer' : 'not-allowed', marginBottom: '1.5rem', opacity: !hasRecords ? 0.5 : 1 }}>
                    <Activity size={12} style={{marginRight:'4px'}} /> Print History Ledger
                </button>

                {/* Arrears Section */}
                {(() => {
                    const totalArrears = history
                        .filter(h => h.month && h.month.startsWith('Arrears'))
                        .reduce((sum, h) => sum + (Number(h.tuitionFee) || 0), 0);
                    return (
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Arrears Section <span style={{ color: '#6b7280', fontWeight: 500 }}>({formatM(totalArrears)})</span></h4>
                    );
                })()}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input type="number" placeholder="RS 0" min="0" value={arrearsInput} onChange={e => setArrearsInput(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', flex: 1, fontSize: '0.85rem' }} />
                    <button onClick={() => {
                        const amt = Number(arrearsInput);
                        if (!amt || amt <= 0) { alert('Please enter a valid amount.'); return; }
                        const label = `Arrears - ${new Date().toLocaleDateString()}`;
                        updateStudentFeeRecord(activeStudent.id, label, { month: label, tuitionFee: amt, status: 'unpaid' });
                        setArrearsInput('');
                    }} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                </div>

                {/* Recent Activity */}
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', margin: '0 0 1rem' }}>Recent Activity</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {history.slice(-4).reverse().map((h, i) => {
                        const rowNet = (h.tuitionFee || 0) + (h.labFee || 0) + (h.examFee || 0) + (h.admissionFee || 0);
                        return (
                            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: '28px', height: '28px', background: h.status === 'paid' ? '#dcfce7' : '#fee2e2', color: h.status === 'paid' ? '#16a34a' : '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FileText size={12} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.month}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{h.status === 'paid' ? `Paid on ${h.paidOn || 'N/A'}` : 'Pending'}</div>
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: h.status === 'paid' ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
                                    {formatM(rowNet)}
                                </div>
                            </div>
                        );
                    })}
                    {history.length === 0 && <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No recent activity</div>}
                </div>
            </div>
        </div>
    );
};

const FEE_FIELDS = [
    { key: 'tuitionFee', label: 'Monthly Tuition Fee' },
    { key: 'labFee', label: 'Library / Lab Fee' },
    { key: 'examFee', label: 'Paper Fund / Exam Fee' },
    { key: 'admissionFee', label: 'Admission / Admin Fee' },
    { key: 'annualFee', label: 'Annual Fee' },
    { key: 'transportFee', label: 'Transport Fee' },
];

const FeeSettingsPanel = ({ sectionClasses, CLASS_FEE_DEFAULTS, updateClassFeeDefaults }) => {
    const [selectedSettingsClass, setSelectedSettingsClass] = useState(sectionClasses?.[0] || '');
    const [form, setForm] = useState({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const existing = (CLASS_FEE_DEFAULTS && CLASS_FEE_DEFAULTS[selectedSettingsClass]) || {};
        const defaults = {};
        FEE_FIELDS.forEach(f => { defaults[f.key] = existing[f.key] ?? 0; });
        setForm(defaults);
        setSaved(false);
    }, [selectedSettingsClass, CLASS_FEE_DEFAULTS]);

    const handleSave = async () => {
        const updated = { ...(CLASS_FEE_DEFAULTS || {}), [selectedSettingsClass]: form };
        await updateClassFeeDefaults(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Settings size={20} color="#4338ca" />
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>Class Fee Defaults</h2>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '2rem', marginTop: '0.25rem' }}>
                Set the default fee breakdown for each class. These amounts are automatically applied when you open a new month.
                You can always override them per-student from their individual sidebar.
            </p>

            {/* Class selector */}
            <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select Class</label>
                <select value={selectedSettingsClass} onChange={e => setSelectedSettingsClass(e.target.value)}
                    style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '0.9rem', background: 'white', outline: 'none', cursor: 'pointer', width: '300px' }}>
                    {(sectionClasses || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Fee fields grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
                {FEE_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>RS</span>
                            <input type="number" min="0" value={form[key] ?? 0}
                                onChange={e => setForm({ ...form, [key]: Number(e.target.value) })}
                                style={{ width: '100%', paddingLeft: '42px', padding: '0.6rem 0.75rem 0.6rem 42px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#4338ca', color: 'white', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                    <Save size={16} /> Save Defaults for {selectedSettingsClass}
                </button>
                {saved && <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>✓ Saved successfully!</span>}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8faff', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#4338ca', fontWeight: 600 }}>💡 How this works</p>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.8 }}>
                    <li>These defaults are used when you click <strong>"+ Open Month"</strong>.</li>
                    <li>If a student has a custom tuition fee set in their Admission form, that overrides the tuition field only.</li>
                    <li>You can edit individual student fees anytime from the student sidebar (click a student row, then click <strong>Edit</strong> on any unpaid month).</li>
                </ul>
            </div>
        </div>
    );
};

// Sort classes from Playgroup → 2nd Year
const CLASS_ORDER = [
    'playgroup', 'nursery', 'prep', 'kg', 'k.g',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'matric', 'intermediate', 'inter', 'first year', 'second year', '1st year', '2nd year',
    'bs', 'fa', 'fsc'
];
const sortClassesSchoolOrder = (classes) => {
    return [...classes].sort((a, b) => {
        const al = a.toLowerCase();
        const bl = b.toLowerCase();
        // check numeric first
        const aNum = al.match(/(\d+)/);
        const bNum = bl.match(/(\d+)/);
        const getWeight = (c) => {
            if (c.includes('playgroup')) return -4;
            if (c.includes('nursery')) return -3;
            if (c.includes('prep')) return -2;
            if (c.includes('kg') || c.includes('k.g')) return -1;
            const n = c.match(/(\d+)/);
            if (n) return parseInt(n[1], 10);
            if (c.includes('matric') || c.includes('10th')) return 10;
            if (c.includes('1st year') || c.includes('first year') || c.includes('inter 1')) return 11;
            if (c.includes('2nd year') || c.includes('second year') || c.includes('inter 2')) return 12;
            if (c.includes('inter') || c.includes('intermediate')) return 11.5;
            if (c.includes('bs') || c.includes('fa') || c.includes('fsc')) return 13;
            return 99;
        };
        const wA = getWeight(al);
        const wB = getWeight(bl);
        if (wA !== wB) return wA - wB;
        return a.localeCompare(b);
    });
};

const FeeTab = ({
    students, selectedClass, setSelectedClass, sectionClasses,
    openFeeMonthRange, markAllPaidForMonth, markAllUnpaidForMonth,
    updateStudentFeeRecord, bulkUpdateFeeRecords, CLASS_FEE_DEFAULTS, updateClassFeeDefaults
}) => {
    // Derive class list from actual student grades — always in sync with data
    const studentGrades = React.useMemo(() => {
        const unique = Array.from(new Set((students || []).map(s => s.grade).filter(Boolean)));
        return sortClassesSchoolOrder(unique);
    }, [students]);
    // Use sectionClasses from DB as fallback if no students yet
    const feeClassList = studentGrades.length > 0 ? studentGrades : (sectionClasses || []);
    const [activeView, setActiveView] = useState('students');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [tableClassFilter, setTableClassFilter] = useState('All');
    const [activeStudentId, setActiveStudentId] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkModalClass, setBulkModalClass] = useState('All');
    const [bulkStartYM, setBulkStartYM] = useState('2026-01');
    const [bulkEndYM, setBulkEndYM] = useState(() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    });
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkMarkPaid, setBulkMarkPaid] = useState(false);
    const [useCustomFees, setUseCustomFees] = useState(false);
    const [customFees, setCustomFees] = useState({ tuitionFee: 0, labFee: 0, examFee: 0, admissionFee: 0 });
    const [reportMonth, setReportMonth] = useState('');
    const [reportClass, setReportClass] = useState('All');
    const [showReportBar, setShowReportBar] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkActMonth, setBulkActMonth] = useState('');
    const [bulkActClass, setBulkActClass] = useState('All');
    const [bulkActLoading, setBulkActLoading] = useState(false);
    
    // Grid View States
    const [bulkGridClass, setBulkGridClass] = useState('All');
    const [bulkGridMonth, setBulkGridMonth] = useState('');
    const [bulkDrafts, setBulkDrafts] = useState({});

    // Gather all distinct months from all fee records — sorted chronologically, arrears last
    const allMonths = Array.from(new Set(
        students.flatMap(s => (s.feeHistory || []).map(h => h.month))
    )).filter(Boolean).sort((a, b) => {
        if (a.startsWith('Arrears') && !b.startsWith('Arrears')) return 1;
        if (!a.startsWith('Arrears') && b.startsWith('Arrears')) return -1;
        return new Date(a) - new Date(b);
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    
    // Reset page on filter change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, tableClassFilter, statusFilter]);

    const activeStudent = students.find(s => s.id === activeStudentId);

    // Filter students
    let filteredStudents = (students || []).filter(s => (s.status || 'active') === 'active');
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredStudents = filteredStudents.filter(s =>
            s.name.toLowerCase().includes(q) ||
            String(s.id).toLowerCase().includes(q) ||
            (s.grade || '').toLowerCase().includes(q)
        );
    }
    if (tableClassFilter !== 'All') {
        filteredStudents = filteredStudents.filter(s => getBaseClass(s.grade) === getBaseClass(tableClassFilter));
    }
    if (statusFilter === 'defaulters') {
        filteredStudents = filteredStudents.filter(s => {
            const history = s.feeHistory || [];
            return history.some(h => h.status === 'unpaid' || h.status === 'partial');
        });
    }

    // Sort students class-wise from Playgroup to 2nd year, then by name
    const classSortWeight = (grade) => {
        if (!grade) return 999;
        const g = grade.toLowerCase();
        if (g.includes('playgroup')) return -3;
        if (g.includes('nursery')) return -2;
        if (g.includes('prep')) return -1;
        const match = grade.match(/\d+/);
        if (match) return parseInt(match[0], 10);
        return 999;
    };

    filteredStudents.sort((a, b) => {
        const wA = classSortWeight(a.grade);
        const wB = classSortWeight(b.grade);
        if (wA !== wB) return wA - wB;
        return (a.name || '').localeCompare(b.name || '');
    });

    // Stats calculations
    let totalExpected = 0;
    let totalCollected = 0;
    let defaultersCount = 0;

    students.forEach(s => {
        const history = s.feeHistory || [];
        const hasUnpaid = history.some(h => h.status === 'unpaid' || h.status === 'partial');
        if (hasUnpaid) defaultersCount++;

        history.forEach(h => {
            const classDefs = (CLASS_FEE_DEFAULTS && CLASS_FEE_DEFAULTS[s.grade]) || { tuitionFee: 0 };
            const mFee = s.monthlyFee;
            const tuition = h.tuitionFee ?? (mFee ? Number(mFee) : classDefs.tuitionFee);
            const ad = h.admissionFee ?? classDefs.admissionFee ?? 0;
            const an = h.annualFee ?? classDefs.annualFee ?? 0;
            const ex = h.examFee ?? classDefs.examFee ?? 0;
            const tr = h.transportFee ?? classDefs.transportFee ?? 0;
            const lb = h.labFee ?? classDefs.labFee ?? 0;
            const late = h.lateFine ?? 0;
            const disc = h.discount ?? 0;

            const net = (tuition + ad + an + ex + tr + lb) + late - disc;
            totalExpected += net;
            totalCollected += (Number(h.paidAmount) || 0);
        });
    });

    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // Small sparkline SVG component
    const Sparkline = ({ color }) => (
        <svg width="80" height="30" viewBox="0 0 100 30" style={{ stroke: color, fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            <path d="M0 20 Q 15 5, 30 20 T 60 15 T 100 10" />
            <path d="M0 20 Q 15 5, 30 20 T 60 15 T 100 10 L 100 30 L 0 30 Z" style={{ stroke: 'none', fill: color, opacity: 0.1 }} />
        </svg>
    );

    const StatCard = ({ title, value, color }) => (
        <div style={{ flex: 1, minWidth: '200px', background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.75rem' }}>{title}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
                <Sparkline color={color} />
            </div>
        </div>
    );

    const handlePrintReceipt = (student, h) => {
        if (!h || h.month === 'No Records') { alert('No fee record to print.'); return; }
        printChallan(student, h);
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb', fontFamily: '"Inter", sans-serif' }}>

            {/* Top Stats Row */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <StatCard title="Total Expected Revenue" value={formatM(totalExpected)} color="#3b82f6" />
                <StatCard title="Total Revenue Collected" value={formatM(totalCollected)} color="#3b82f6" />
                <StatCard title="Collection Rate" value={`${collectionRate}%`} color="#3b82f6" />
                <StatCard title="Defaulters" value={defaultersCount} color="#ef4444" />
            </div>

            {/* Top-level View Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveView('students')} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', background: activeView === 'students' ? '#4338ca' : 'white', color: activeView === 'students' ? 'white' : '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    Students
                </button>
                <button onClick={() => setActiveView('settings')} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: activeView === 'settings' ? '#4338ca' : 'white', color: activeView === 'settings' ? 'white' : '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <Settings size={14} /> Fee Settings
                </button>
                <button onClick={() => setActiveView('bulk')} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: activeView === 'bulk' ? '#10b981' : 'white', color: activeView === 'bulk' ? 'white' : '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <Activity size={14} /> Fast Entry Grid
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setShowBulkActions(b => !b); setShowReportBar(false); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: showBulkActions ? '#059669' : 'white', color: showBulkActions ? 'white' : '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        ✓ Bulk Actions
                    </button>
                    <button onClick={() => { setShowReportBar(r => !r); setShowBulkActions(false); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: showReportBar ? '#4338ca' : 'white', color: showReportBar ? 'white' : '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <BarChart2 size={14} /> Print Report
                    </button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {showBulkActions && (
                <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065f46', marginBottom: '0.75rem' }}>✓ Bulk Mark Fee Status — Select a month and class to update all students at once</div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={bulkActClass} onChange={e => setBulkActClass(e.target.value)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #6ee7b7', fontSize: '0.85rem', background: 'white' }}>
                            <option value='All'>All Classes</option>
                            {feeClassList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={bulkActMonth} onChange={e => setBulkActMonth(e.target.value)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #6ee7b7', fontSize: '0.85rem', background: 'white', minWidth: '160px' }}>
                            <option value=''>— Select Month —</option>
                            {allMonths.filter(m => !m.startsWith('Arrears')).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <button disabled={bulkActLoading || !bulkActMonth} onClick={async () => {
                            if (!bulkActMonth) { alert('Please select a month.'); return; }
                            if (!window.confirm(`Mark ALL ${bulkActClass === 'All' ? 'students' : bulkActClass + ' students'} as PAID for ${bulkActMonth}?`)) return;
                            setBulkActLoading(true);
                            await markAllPaidForMonth(bulkActMonth, bulkActClass);
                            setBulkActLoading(false);
                        }} style={{ padding: '0.4rem 1rem', background: bulkActLoading || !bulkActMonth ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: bulkActMonth ? 'pointer' : 'not-allowed' }}>
                            {bulkActLoading ? 'Updating...' : '✓ Mark All Paid'}
                        </button>
                        <button disabled={bulkActLoading || !bulkActMonth} onClick={async () => {
                            if (!bulkActMonth) { alert('Please select a month.'); return; }
                            if (!window.confirm(`Reset ALL ${bulkActClass === 'All' ? 'students' : bulkActClass + ' students'} to UNPAID for ${bulkActMonth}?`)) return;
                            setBulkActLoading(true);
                            await markAllUnpaidForMonth(bulkActMonth, bulkActClass);
                            setBulkActLoading(false);
                        }} style={{ padding: '0.4rem 1rem', background: bulkActLoading || !bulkActMonth ? '#9ca3af' : '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: bulkActMonth ? 'pointer' : 'not-allowed' }}>
                            ✕ Reset All Unpaid
                        </button>
                    </div>
                </div>
            )}

            {/* Report Bar */}
            {showReportBar && (
                <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#3730a3' }}>Print Fee Report:</span>
                    <select value={reportClass} onChange={e => setReportClass(e.target.value)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #a5b4fc', fontSize: '0.85rem' }}>
                        <option value='All'>All Classes</option>
                        {feeClassList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #a5b4fc', fontSize: '0.85rem' }}>
                        <option value=''>— Select Month —</option>
                        {allMonths.filter(m => !m.startsWith('Arrears')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={() => { if (!reportMonth) { alert('Please select a month first!'); return; } printClassReport(students, reportMonth, reportClass); }} style={{ padding: '0.4rem 1rem', background: '#4338ca', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Printer size={14} /> Generate Report
                    </button>
                </div>
            )}


            {/* Settings View */}
            {activeView === 'settings' && (
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <FeeSettingsPanel
                        sectionClasses={sectionClasses}
                        CLASS_FEE_DEFAULTS={CLASS_FEE_DEFAULTS}
                        updateClassFeeDefaults={updateClassFeeDefaults}
                    />
                </div>
            )}

            {/* Bulk Fast Entry Grid */}
            {activeView === 'bulk' && (
                <div style={{ flex: 1, overflowY: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>Bulk Fast Entry Grid</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Easily drop amounts directly into student records without opening each profile.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select value={bulkGridClass} onChange={e => { setBulkGridClass(e.target.value); setBulkDrafts({}); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: 'white' }}>
                                <option value="All">All Classes</option>
                                {feeClassList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={bulkGridMonth} onChange={e => { setBulkGridMonth(e.target.value); setBulkDrafts({}); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: 'white', minWidth: '160px' }}>
                                <option value="">— Select Month —</option>
                                {allMonths.filter(m => !m.startsWith('Arrears')).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <button disabled={!bulkGridMonth || Object.keys(bulkDrafts).length === 0} onClick={() => {
                                if (!bulkUpdateFeeRecords) return alert("Bulk system pending engine hookup");
                                const updates = Object.keys(bulkDrafts).map(studentId => {
                                    const s = students.find(x => x.id === studentId);
                                    const h = (s?.feeHistory || []).find(r => r.month === bulkGridMonth) || {};
                                    const cDef = (CLASS_FEE_DEFAULTS && CLASS_FEE_DEFAULTS[s?.grade]) || {};
                                    const defaultTuition = h.tuitionFee ?? (s?.admissions?.[0]?.monthlyFee || cDef.tuitionFee || 0);
                                    
                                    const form = {
                                        tuitionFee: Number(defaultTuition), labFee: Number(h.labFee ?? cDef.labFee ?? 0), 
                                        examFee: Number(h.examFee ?? cDef.examFee ?? 0), admissionFee: Number(h.admissionFee ?? cDef.admissionFee ?? 0),
                                        lateFine: h.lateFine ?? 0, discount: h.discount ?? 0
                                    };
                                    
                                    const net = (form.tuitionFee + form.labFee + form.examFee + form.admissionFee + form.lateFine) - form.discount;
                                    const prevPaid = Number(h.paidAmount || 0);
                                    
                                    const payAmt = bulkDrafts[studentId];
                                    const newTotalPaid = prevPaid + payAmt;
                                    const newStatus = newTotalPaid >= net ? 'paid' : 'partial';
                                    const todayStr = new Date().toLocaleDateString();
                                    
                                    return {
                                        studentId,
                                        monthLabel: bulkGridMonth,
                                        newRecordData: {
                                            ...form,
                                            paidAmount: newTotalPaid,
                                            status: newStatus,
                                            paidOn: todayStr,
                                            transactions: [...(h.transactions || []), { date: todayStr, amount: payAmt, note: 'Bulk Fast Entry' }]
                                        }
                                    };
                                });
                                bulkUpdateFeeRecords(updates);
                                setBulkDrafts({});
                            }} style={{ padding: '0.5rem 1.25rem', background: (!bulkGridMonth || Object.keys(bulkDrafts).length === 0) ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: (!bulkGridMonth || Object.keys(bulkDrafts).length === 0) ? 'not-allowed' : 'pointer' }}>
                                Process {Object.keys(bulkDrafts).length} Payments
                            </button>
                        </div>
                    </div>
                    
                    {bulkGridMonth ? (
                        <div style={{ overflow: 'auto' }}>
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb', background: 'white' }}>
                                        <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Student</th>
                                        <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Amount Due</th>
                                        <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Amount Paid</th>
                                        <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Balance</th>
                                        <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Received Today (RS)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.filter(s => bulkGridClass === 'All' || getBaseClass(s.grade) === getBaseClass(bulkGridClass)).map(s => {
                                        const h = (s.feeHistory || []).find(r => r.month === bulkGridMonth);
                                        const cDef = (CLASS_FEE_DEFAULTS && (CLASS_FEE_DEFAULTS[s.grade] || CLASS_FEE_DEFAULTS[getBaseClass(s.grade)])) || {};
                                        const net = h ? ((h.tuitionFee||0)+(h.labFee||0)+(h.examFee||0)+(h.admissionFee||0)+(h.lateFine||0)-(h.discount||0)) : 
                                                        (Number(s.admissions?.[0]?.monthlyFee || cDef.tuitionFee || 0) + (cDef.labFee||0) + (cDef.examFee||0) + (cDef.admissionFee||0));
                                        
                                        const paid = h ? (Number(h.paidAmount) || 0) : 0;
                                        const bal = Math.max(0, net - paid);
                                        if (bal === 0) return null; // Only show pending students
                                        
                                        return (
                                            <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{s.name} <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 400 }}>{s.grade} | {s.id}</div></td>
                                                <td style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', color: '#374151' }}>{formatM(net)}</td>
                                                <td style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>{formatM(paid)}</td>
                                                <td style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', color: '#dc2626', fontWeight: 700 }}>{formatM(bal)}</td>
                                                <td style={{ padding: '0.6rem 1.25rem' }}>
                                                    <input type="number" placeholder={bal} value={bulkDrafts[s.id] || ''} onChange={e => {
                                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                                        setBulkDrafts(prev => { 
                                                            const nd = {...prev}; 
                                                            if (val !== undefined) nd[s.id] = val; else delete nd[s.id]; 
                                                            return nd; 
                                                        });
                                                    }} style={{ width: '100px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.3rem', fontSize: '0.85rem', outline: 'none' }} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Please select a month (and optionally a class) from the top right to start receiving bulk payments.</div>
                    )}
                </div>
            )}

            {/* Main Content Area (Student list) */}
            {activeView === 'students' && <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>

                {/* Left Table Section */}
                <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Header + Search */}
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Students Fee Overview</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search style={{ position: 'absolute', left: '10px', top: '8px', color: '#9ca3af' }} size={16} />
                                <input type="text" placeholder="Search Students, ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: '0.4rem 1rem 0.4rem 2rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', width: '180px', outline: 'none' }} />
                            </div>
                            <select value={tableClassFilter} onChange={e => setTableClassFilter(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', outline: 'none', background: 'white' }}>
                                <option value="All">All Classes</option>
                                {feeClassList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button onClick={() => setShowBulkModal(true)} style={{ background: '#4338ca', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Calendar size={14} /> Open Month(s)
                            </button>
                        </div>
                    </div>

                    {/* Bulk Month Modal */}
                    {showBulkModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Open Fee Month(s)</h3>
                                    <button onClick={() => setShowBulkModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>Apply to Class</label>
                                        <select value={bulkModalClass} onChange={e => setBulkModalClass(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem' }}>
                                            <option value='All'>All Classes (Whole College)</option>
                                            {feeClassList.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>From Month</label>
                                            <input type='month' value={bulkStartYM} onChange={e => setBulkStartYM(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>To Month</label>
                                            <input type='month' value={bulkEndYM} onChange={e => setBulkEndYM(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>

                                    {/* Custom fee toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                        <input type='checkbox' id='customFeeToggle' checked={useCustomFees} onChange={e => setUseCustomFees(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                        <label htmlFor='customFeeToggle' style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                                            Enter custom fee amounts (overrides class defaults)
                                        </label>
                                    </div>

                                    {useCustomFees && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                                            {[
                                                { key: 'tuitionFee', label: 'Tuition Fee' },
                                                { key: 'labFee', label: 'Library / Lab Fee' },
                                                { key: 'examFee', label: 'Paper Fund / Exam' },
                                                { key: 'admissionFee', label: 'Admin / Other Fee' },
                                            ].map(({ key, label }) => (
                                                <div key={key}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#9ca3af' }}>RS</span>
                                                        <input type='number' min='0' value={customFees[key]} onChange={e => setCustomFees({ ...customFees, [key]: Number(e.target.value) })} style={{ width: '100%', paddingLeft: '30px', padding: '0.4rem 0.5rem 0.4rem 30px', border: '1px solid #6ee7b7', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Mark as already paid toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: bulkMarkPaid ? '#d1fae5' : '#fafafa', border: `1px solid ${bulkMarkPaid ? '#6ee7b7' : '#e5e7eb'}`, borderRadius: '8px' }}>
                                        <input type='checkbox' id='markPaidToggle' checked={bulkMarkPaid} onChange={e => setBulkMarkPaid(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                        <label htmlFor='markPaidToggle' style={{ fontSize: '0.85rem', fontWeight: 600, color: bulkMarkPaid ? '#065f46' : '#374151', cursor: 'pointer' }}>
                                            ✓ Mark all as already Paid (for historical records)
                                        </label>
                                    </div>

                                    {/* Date range validation warning */}
                                    {bulkStartYM && bulkEndYM && bulkStartYM > bulkEndYM && (
                                        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                                            ⚠️ "To Month" must be equal to or after "From Month".
                                        </div>
                                    )}

                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#166534' }}>
                                        💡 Months that already exist for a student will be skipped automatically.
                                    </div>
                                    <button
                                        disabled={bulkLoading || (bulkStartYM && bulkEndYM && bulkStartYM > bulkEndYM)}
                                        onClick={async () => {
                                            if (bulkStartYM > bulkEndYM) { return; }
                                            setBulkLoading(true);
                                            const overrides = useCustomFees ? customFees : null;
                                            await openFeeMonthRange(bulkStartYM, bulkEndYM, bulkModalClass, overrides, bulkMarkPaid);
                                            setBulkLoading(false);
                                            setShowBulkModal(false);
                                        }}
                                        style={{ background: bulkLoading || (bulkStartYM > bulkEndYM) ? '#9ca3af' : (bulkMarkPaid ? '#059669' : '#4338ca'), color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: (bulkLoading || bulkStartYM > bulkEndYM) ? 'not-allowed' : 'pointer' }}>
                                        {bulkLoading ? 'Generating...' : bulkMarkPaid ? '✓ Generate & Mark Paid' : '✓ Generate Fee Records'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Status filter tabs */}
                    <div style={{ display: 'flex', padding: '0 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
                        <button onClick={() => setStatusFilter('all')} style={{ padding: '1rem 0', marginRight: '1.5rem', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.85rem', color: statusFilter === 'all' ? '#4338ca' : '#6b7280', borderBottom: statusFilter === 'all' ? '2px solid #4338ca' : '2px solid transparent', cursor: 'pointer' }}>
                            All Students (Selected, {students.length})
                        </button>
                        <button onClick={() => setStatusFilter('defaulters')} style={{ padding: '1rem 0', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.85rem', color: statusFilter === 'defaulters' ? '#4338ca' : '#6b7280', borderBottom: statusFilter === 'defaulters' ? '2px solid #4338ca' : '2px solid transparent', cursor: 'pointer' }}>
                            Defaulters ({defaultersCount})
                        </button>
                    </div>

                    {/* Table */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Student Name <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
                                    <th style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Class <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
                                    <th style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Student ID <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
                                    <th style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount Due <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
                                    <th style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount Paid <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
                                    <th style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Payment Status <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></th>
                                    <th style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // Current month label e.g. "April 2026"
                                    const nowD = new Date();
                                    const currentMonthLabel = nowD.toLocaleString('en-US', { month: 'long', year: 'numeric' });

                                    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
                                    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                                    return paginatedStudents.map(student => {
                                        const history = student.feeHistory || [];

                                        // ── Current month record ──
                                        const currentRec = history.find(h => h.month === currentMonthLabel && !h.month.startsWith('Arrears'));

                                        // ── Current month amounts ──
                                        let currentDue = 0, currentPaid = 0, currentStatus = 'No Record';
                                        if (currentRec) {
                                            const t = currentRec.tuitionFee ?? 0;
                                            const ad = currentRec.admissionFee ?? 0;
                                            const an = currentRec.annualFee ?? 0;
                                            const ex = currentRec.examFee ?? 0;
                                            const lb = currentRec.labFee ?? 0;
                                            const tr = currentRec.transportFee ?? 0;
                                            const late = currentRec.lateFine ?? 0;
                                            const net = (t + ad + an + ex + lb + tr) + late - (currentRec.discount ?? 0);
                                            currentPaid = Number(currentRec.paidAmount) || 0;
                                            currentDue = Math.max(0, net - currentPaid);
                                            currentStatus = currentRec.status === 'paid' ? 'Paid' : currentRec.status === 'partial' ? 'Partial' : 'Unpaid';
                                        }

                                        // ── History: count OLD pending months (not current) ──
                                        const oldPendingMonths = history.filter(h =>
                                            h.month !== currentMonthLabel &&
                                            !h.month.startsWith('Arrears') &&
                                            (h.status === 'unpaid' || h.status === 'partial')
                                        ).length;
                                        const arrearsPending = history.filter(h => h.month.startsWith('Arrears') && h.status !== 'paid').length;

                                        const isSelected = activeStudentId === student.id;

                                        return (
                                            <tr key={student.id} onClick={() => setActiveStudentId(student.id)} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#e0e7ff' : 'white' }}>
                                                <td style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700, overflow: 'hidden' }}>
                                                        {student.admissions?.[0]?.photo ? <img src={student.admissions[0].photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : getInitials(student.name)}
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{student.name}</span>
                                                        {(oldPendingMonths > 0 || arrearsPending > 0) && (
                                                            <div style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 700, marginTop: '0.1rem' }}>
                                                                📋 {oldPendingMonths > 0 ? `${oldPendingMonths} old month${oldPendingMonths > 1 ? 's' : ''}` : ''}{oldPendingMonths > 0 && arrearsPending > 0 ? ' + ' : ''}{arrearsPending > 0 ? `${arrearsPending} arrear${arrearsPending > 1 ? 's' : ''}` : ''} unpaid
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#374151' }}>{student.grade}</td>
                                                <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#374151' }}>{student.id}</td>
                                                <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
                                                    <div>{currentRec ? formatM(currentDue) : <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.75rem' }}>No record</span>}</div>
                                                    <div style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: 400 }}>{currentMonthLabel}</div>
                                                </td>
                                                <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#374151' }}>
                                                    {currentRec ? formatM(currentPaid) : <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '0.85rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                                                        <span style={{
                                                            background: currentStatus === 'Paid' ? '#dcfce7' : currentStatus === 'Unpaid' ? '#fee2e2' : currentStatus === 'Partial' ? '#fef3c7' : '#f3f4f6',
                                                            color: currentStatus === 'Paid' ? '#16a34a' : currentStatus === 'Unpaid' ? '#dc2626' : currentStatus === 'Partial' ? '#d97706' : '#6b7280',
                                                            padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700
                                                        }}>
                                                            {currentStatus}
                                                        </span>
                                                        {isSelected && <span style={{ fontSize: '0.65rem', color: '#4338ca', fontWeight: 600 }}>● Selected</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.85rem 1.25rem' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveStudentId(student.id); }} style={{ border: '1px solid #d1d5db', background: 'white', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                                        <Activity size={12} /> History
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Footer */}
                    <div style={{ padding: '0.8rem 1.25rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            Showing <span style={{fontWeight:600}}>{filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span style={{fontWeight:600}}>{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span style={{fontWeight:600}}>{filteredStudents.length}</span> students
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1}
                                style={{ padding: '0.4rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', background: currentPage === 1 ? '#f3f4f6' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                                Previous
                            </button>
                            <span style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                                Page {currentPage} of {Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredStudents.length / itemsPerPage), p + 1))} 
                                disabled={currentPage === Math.ceil(filteredStudents.length / itemsPerPage) || filteredStudents.length === 0}
                                style={{ padding: '0.4rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', background: currentPage === Math.ceil(filteredStudents.length / itemsPerPage) || filteredStudents.length === 0 ? '#f3f4f6' : 'white', cursor: currentPage === Math.ceil(filteredStudents.length / itemsPerPage) || filteredStudents.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                {activeStudent && (
                    <StudentSidebar
                        activeStudent={activeStudent}
                        setActiveStudentId={setActiveStudentId}
                        CLASS_FEE_DEFAULTS={CLASS_FEE_DEFAULTS}
                        updateStudentFeeRecord={updateStudentFeeRecord}
                        handlePrintReceipt={handlePrintReceipt}
                    />
                )}
            </div>}
        </div>
    );
};

export default FeeTab;
