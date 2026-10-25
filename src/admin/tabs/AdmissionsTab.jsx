import React, { useState, useEffect } from 'react';
import { Save, Trash2, Camera, User, Users, Award, CheckCircle, Printer, ChevronDown, X, PlusCircle, LayoutDashboard, ClipboardList, Filter, Search, ArrowRight, Banknote } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { getBaseClass, getPreset } from '../utils/gradeUtils';

const AdmissionsTab = ({
    admissionData, setAdmissionData, admissionInitialState,
    printAdmissionForm, printAdmissionFormBulk,
    handleAdmissionPhotoUpload, photoFileRef,
    sectionClasses, students, setStudents,
    SUBJECTS, TERMS, SECTIONS, CLASSES,
    CLASS_GROUPS, CLASS_TRACKS, CLASS_SUBTRACKS,
    inquiries, setInquiries, deleteInquiry, schoolName,
    printFeeVoucher, printInquiryRecord
}) => {
    const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard', 'admission', 'inquiry'
    const [inquiryStatusFilter, setInquiryStatusFilter] = useState('pending'); // 'pending', 'confirmed', 'all'
    const [inquirySearch, setInquirySearch] = useState('');

    const allClasses = React.useMemo(() => {
        const baseSet = Array.from(new Set(
            [...(CLASSES || sectionClasses || []), ...(students || []).map(s => s.grade)]
                .map(c => getBaseClass(c))
                .filter(Boolean)
        ));
        const getWeight = (c) => {
            const cl = String(c || '').toLowerCase();
            if (cl.includes('playgroup')) return -4;
            if (cl.includes('nursery')) return -3;
            if (cl.includes('prep')) return -2;
            if (cl.includes('kg') || cl.includes('k.g')) return -1;
            const n = cl.match(/(\d+)/);
            if (n) return parseInt(n[1], 10);
            if (cl.includes('matric') || cl.includes('10th')) return 10;
            if (cl.includes('1st year') || cl.includes('first year') || cl.includes('inter 1')) return 11;
            if (cl.includes('2nd year') || cl.includes('second year') || cl.includes('inter 2')) return 12;
            if (cl.includes('inter') || cl.includes('intermediate')) return 11.5;
            if (cl.includes('bs') || cl.includes('fa') || cl.includes('fsc')) return 13;
            return 99;
        };
        return baseSet.sort((a, b) => {
            const wA = getWeight(a);
            const wB = getWeight(b);
            if (wA !== wB) return wA - wB;
            return String(a || '').localeCompare(String(b || ''));
        });
    }, [students, sectionClasses, CLASSES]);

    // Inquiry Form State
    const [inquiryForm, setInquiryForm] = useState({
        name: '',
        contact: '',
        class_applying: allClasses?.[0] || '',
        notes: '',
        admission_fee: '',
        monthly_fee: '',
        paper_fund: '',
        quoted_fee: '', // Total amount
        status: 'pending'
    });

    const [savingInquiry, setSavingInquiry] = useState(false);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [selectedInquiryForVoucher, setSelectedInquiryForVoucher] = useState(null);
    const [voucherFees, setVoucherFees] = useState({ admissionFee: '', paperFund: '', monthlyFee: '' });

    const update = (key, value) => setAdmissionData(prev => ({ ...prev, [key]: value }));

    // Generate next Inquiry Number: INQ-YY-XXX
    const generateInquiryNo = () => {
        const year = new Date().getFullYear().toString().slice(-2);
        const yearPrefix = `INQ-${year}`;
        const yearInquiries = (inquiries || [])
            .filter(inq => inq.inquiry_no?.startsWith(yearPrefix))
            .map(inq => parseInt(inq.inquiry_no.split('-')[2]) || 0);
        
        const nextNum = yearInquiries.length > 0 ? Math.max(...yearInquiries) + 1 : 1;
        return `${yearPrefix}-${nextNum.toString().padStart(3, '0')}`;
    };

    const handleSaveInquiry = async (print = false) => {
        if (!inquiryForm.name || !inquiryForm.contact) return alert("Name and Contact are required!");
        
        setSavingInquiry(true);
        try {
            const inqNo = generateInquiryNo();
            const newInquiry = {
                ...inquiryForm,
                inquiry_no: inqNo,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase.from('inquiries').insert([newInquiry]).select();
            if (error) throw error;

            if (setInquiries) {
                await setInquiries([...(inquiries || []), data[0]]);
            }

            if (print && printInquiryRecord) {
                printInquiryRecord(data[0]);
            }

            alert(`Inquiry ${inqNo} saved successfully!`);
            // Reset form
            setInquiryForm({
                name: '', contact: '', class_applying: allClasses?.[0] || '',
                notes: '', admission_fee: '', monthly_fee: '', paper_fund: '', quoted_fee: '', status: 'pending'
            });
            setActiveSubTab('dashboard');
        } catch (err) {
            console.error("Inquiry Error:", err);
            alert("Failed to save inquiry: " + err.message);
        } finally {
            setSavingInquiry(false);
        }
    };

    const confirmAdmissionFromInquiry = (inquiry) => {
        // Transfer data to official admission form
        setAdmissionData({
            ...admissionInitialState,
            studentName: inquiry.name.toUpperCase(),
            contact: inquiry.contact,
            applyingFor: inquiry.class_applying,
            monthlyFee: inquiry.monthly_fee || inquiry.quoted_fee,
            inquiryNo: inquiry.inquiry_no // Pass the inquiry number for printing
        });
        
        // Mark as confirmed in DB
        const updateInquiry = async () => {
            const { error } = await supabase.from('inquiries').update({ status: 'confirmed' }).eq('id', inquiry.id);
            if (!error && setInquiries) {
                setInquiries(inquiries.map(i => i.id === inquiry.id ? { ...i, status: 'confirmed' } : i));
            }
        };
        updateInquiry();

        setActiveSubTab('admission');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrintVoucher = () => {
        if (!voucherFees.admissionFee || !voucherFees.monthlyFee) return alert("Please enter basic fee details.");
        if (printFeeVoucher && selectedInquiryForVoucher) {
            printFeeVoucher(selectedInquiryForVoucher, voucherFees);
            setShowVoucherModal(false);
        }
    };

    // Batch management state
    const [graduateClass, setGraduateClass] = useState(allClasses?.[0] || '');
    const [batchClass, setBatchClass] = useState(allClasses?.[0] || '');
    const [targetClass, setTargetClass] = useState(allClasses?.[1] || '');
    const [batchProcessing, setBatchProcessing] = useState(false);

    // Formatters
    const formatCNIC = (raw) => {
        const digits = raw.replace(/\D/g, '').slice(0, 13);
        if (digits.length <= 5) return digits;
        if (digits.length <= 12) return digits.slice(0, 5) + '-' + digits.slice(5);
        return digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
    };

    const formatPhone = (raw) => {
        const digits = raw.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 4) return digits;
        return digits.slice(0, 4) + '-' + digits.slice(4);
    };

    // Bulk print modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkMode, setBulkMode] = useState('class');
    const [bulkStudentId, setBulkStudentId] = useState('');
    const [bulkStudentSearch, setBulkStudentSearch] = useState('');
    const [bulkClass, setBulkClass] = useState(allClasses?.[0] || '');

    useEffect(() => {
        if (allClasses?.length > 0) {
            if (!inquiryForm.class_applying) setInquiryForm(prev => ({ ...prev, class_applying: allClasses[0] }));
            if (!graduateClass) setGraduateClass(allClasses[0]);
            if (!batchClass) setBatchClass(allClasses[0]);
            if (!targetClass) setTargetClass(allClasses[1] || allClasses[0]);
            if (!bulkClass) setBulkClass(allClasses[0]);
        }
    }, [allClasses]);

    const filteredInquiries = (inquiries || []).filter(inq => {
        const matchesStatus = inquiryStatusFilter === 'all' || inq.status === inquiryStatusFilter;
        const matchesSearch = inq.name?.toLowerCase().includes(inquirySearch.toLowerCase()) || 
                             inq.inquiry_no?.toLowerCase().includes(inquirySearch.toLowerCase()) ||
                             inq.contact?.includes(inquirySearch);
        return matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const handleBulkPrint = () => {
        if (bulkMode === 'student' && !bulkStudentId) {
            alert("Please select a student from the list first.");
            return;
        }
        const value = bulkMode === 'student' ? bulkStudentId : (bulkMode === 'class' ? bulkClass : 'all');
        printAdmissionFormBulk(bulkMode, value);
        setShowBulkModal(false);
    };

    return (
        <div className="animate-fade-in">
            {/* ── Sub-Tab Navigation ── */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '12px' }}>
                {[
                    { id: 'dashboard', label: 'Inquiry Dashboard', icon: LayoutDashboard, color: '#1e3a8a' },
                    { id: 'inquiry', label: 'New Inquiry Form', icon: PlusCircle, color: '#0891b2' },
                    { id: 'admission', label: 'Official Admission Form', icon: ClipboardList, color: '#10b981' },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        style={{
                            flex: 1, padding: '0.8rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                            fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
                            background: activeSubTab === tab.id ? tab.color : 'transparent',
                            color: activeSubTab === tab.id ? 'white' : '#64748b',
                            boxShadow: activeSubTab === tab.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ── INQUIRY DASHBOARD ── */}
            {activeSubTab === 'dashboard' && (
                <div className="animate-fade-in">
                    <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>📝 Inquiries Tracking</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage prospective students and conversions</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search inquiries..." 
                                    className="form-input" 
                                    style={{ paddingLeft: '2.5rem', width: '250px' }}
                                    value={inquirySearch}
                                    onChange={e => setInquirySearch(e.target.value)}
                                />
                            </div>
                            <select 
                                className="form-input" 
                                value={inquiryStatusFilter}
                                onChange={e => setInquiryStatusFilter(e.target.value)}
                                style={{ minWidth: '150px' }}
                            >
                                <option value="pending">⏳ Pending Only</option>
                                <option value="confirmed">✅ Confirmed Only</option>
                                <option value="all">🌐 All Inquiries</option>
                            </select>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Inquiry #</th>
                                        <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Student Detail</th>
                                        <th style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Class</th>
                                        <th style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Fee Details</th>
                                        <th style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Status</th>
                                        <th style={{ padding: '1.25rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInquiries.map((inq, idx) => (
                                        <tr key={inq.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fcfcfd', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5ff'}>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.95rem' }}>{inq.inquiry_no}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(inq.created_at).toLocaleDateString('en-GB')}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{inq.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>📞 {inq.contact}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                                <span style={{ padding: '0.25rem 0.75rem', background: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>{inq.class_applying}</span>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>Total: Rs. {inq.quoted_fee || 0}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                    Adm: {inq.admission_fee || 0} • Mon: {inq.monthly_fee || 0} • Ppr: {inq.paper_fund || 0}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800,
                                                    background: inq.status === 'pending' ? '#fffbeb' : '#ecfdf5',
                                                    color: inq.status === 'pending' ? '#b45309' : '#059669',
                                                    border: `1px solid ${inq.status === 'pending' ? '#fde68a' : '#a7f3d0'}`
                                                }}>
                                                    {inq.status === 'pending' ? '⏳ PENDING' : '✅ CONFIRMED'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => { 
                                                        setSelectedInquiryForVoucher(inq); 
                                                        setShowVoucherModal(true); 
                                                        setVoucherFees({ 
                                                            admissionFee: inq.admission_fee || '', 
                                                            paperFund: inq.paper_fund || '', 
                                                            monthlyFee: inq.monthly_fee || inq.quoted_fee || '' 
                                                        }); 
                                                    }} 
                                                        title="Print Fee Voucher"
                                                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#2563eb', background: '#eff6ff', cursor: 'pointer' }}>
                                                        <Banknote size={16} />
                                                    </button>
                                                    <button onClick={() => printInquiryRecord(inq)} title="Print Inquiry Record"
                                                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b', background: 'white', cursor: 'pointer' }}>
                                                        <Printer size={16} />
                                                    </button>
                                                    {inq.status === 'pending' && (
                                                        <button 
                                                            onClick={() => confirmAdmissionFromInquiry(inq)}
                                                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                        >
                                                            Confirm Admission <ArrowRight size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredInquiries.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                                No inquiries found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── INQUIRY FORM ── */}
            {activeSubTab === 'inquiry' && (
                <div className="animate-fade-in card" style={{ padding: '2.5rem', borderTop: '6px solid #0891b2' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>New Student Inquiry</h2>
                        <p style={{ color: '#64748b' }}>Capture details for prospective students. These will not affect your main student database until confirmed.</p>
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                        <div className="col-span-2">
                            <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 700, color: '#0369a1' }}>Assigning Inquiry Number:</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0369a1', letterSpacing: '1px' }}>{generateInquiryNo()}</div>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Prospective Student Name</label>
                            <input type="text" className="form-input" placeholder="Full name of student" 
                                value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value.toUpperCase()})} />
                        </div>
                        <div>
                            <label className="form-label">Contact / Phone Number</label>
                            <input type="text" className="form-input" placeholder="03XX-XXXXXXX" 
                                value={inquiryForm.contact} onChange={e => setInquiryForm({...inquiryForm, contact: formatPhone(e.target.value)})} maxLength={12} />
                        </div>
                        <div>
                            <label className="form-label">Class Applying For</label>
                            <select className="form-input" value={inquiryForm.class_applying} onChange={e => setInquiryForm({...inquiryForm, class_applying: e.target.value})}>
                                {sectionClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Admission Fee (Rs.)</label>
                            <input type="number" className="form-input" placeholder="e.g. 5000" 
                                value={inquiryForm.admission_fee} onChange={e => {
                                    const val = e.target.value;
                                    setInquiryForm(prev => ({...prev, admission_fee: val, quoted_fee: (Number(val)||0) + (Number(prev.monthly_fee)||0) + (Number(prev.paper_fund)||0)}));
                                }} />
                        </div>
                        <div>
                            <label className="form-label">Monthly Fee (Rs.)</label>
                            <input type="number" className="form-input" placeholder="e.g. 2500" 
                                value={inquiryForm.monthly_fee} onChange={e => {
                                    const val = e.target.value;
                                    setInquiryForm(prev => ({...prev, monthly_fee: val, quoted_fee: (Number(prev.admission_fee)||0) + (Number(val)||0) + (Number(prev.paper_fund)||0)}));
                                }} />
                        </div>
                        <div>
                            <label className="form-label">Paper Fund (Rs.)</label>
                            <input type="number" className="form-input" placeholder="e.g. 500" 
                                value={inquiryForm.paper_fund} onChange={e => {
                                    const val = e.target.value;
                                    setInquiryForm(prev => ({...prev, paper_fund: val, quoted_fee: (Number(prev.admission_fee)||0) + (Number(prev.monthly_fee)||0) + (Number(val)||0)}));
                                }} />
                        </div>
                        <div>
                            <label className="form-label">Total Agreed Fee (Rs.)</label>
                            <input type="number" className="form-input" placeholder="Calculated total" readOnly
                                value={inquiryForm.quoted_fee} style={{ background: '#f8fafc', fontWeight: 800, color: '#1e3a8a' }} />
                        </div>
                        <div className="col-span-2">
                            <label className="form-label">Additional Notes / Observation</label>
                            <textarea className="form-input" style={{ height: '100px' }} placeholder="Any remarks about the student or family..."
                                value={inquiryForm.notes} onChange={e => setInquiryForm({...inquiryForm, notes: e.target.value})} />
                        </div>
                    </div>

                    <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '2rem' }}>
                        <button 
                            onClick={() => setActiveSubTab('dashboard')} 
                            className="btn" style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}>
                            Cancel
                        </button>
                        <button 
                            onClick={() => handleSaveInquiry(false)} 
                            disabled={savingInquiry}
                            className="btn" style={{ background: '#0891b2', color: 'white', border: 'none', padding: '0.75rem 2rem' }}>
                            {savingInquiry ? 'Saving...' : '💾 Save Inquiry'}
                        </button>
                        <button 
                            onClick={() => handleSaveInquiry(true)} 
                            disabled={savingInquiry}
                            className="btn" style={{ background: '#1e3a8a', color: 'white', border: 'none', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {savingInquiry ? 'Saving...' : <><Printer size={18} /> Save & Print Record</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── OFFICIAL ADMISSION FORM ── */}
            {activeSubTab === 'admission' && (
                <div className="animate-fade-in">
                    <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>Official Admission Form</h2>
                            {admissionData.inquiryNo && (
                                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 800, display: 'inline-block', marginTop: '0.5rem', border: '1px solid #fee2e2' }}>
                                    Converting Inquiry: {admissionData.inquiryNo}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setAdmissionData(admissionInitialState)} className="btn" style={{ background: 'white', border: '1px solid var(--color-gray-300)', color: 'var(--color-gray-600)' }}>
                                <Trash2 size={16} /> Reset Form
                            </button>
                            <button onClick={() => setShowBulkModal(true)} className="btn" style={{ background: '#eff6ff', border: '1.5px solid #1e3a8a', color: '#1e3a8a', fontWeight: 700 }}>
                                <Printer size={16} /> Print Forms <ChevronDown size={14} />
                            </button>
                            <button onClick={printAdmissionForm} className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981', padding: '0.75rem 2rem', fontSize: '1rem' }}>
                                <Save size={18} /> Confirm & Print Form
                            </button>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '2rem' }}>
                        {/* Top Meta */}
                        <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '1.5rem' }}>
                            <div>
                                <label className="form-label">Applying For (Base Class)</label>
                                <select className="form-input" value={admissionData.applyingFor} onChange={e => {
                                    update('applyingFor', e.target.value);
                                    update('subjectTrack', '');
                                    update('subTrack', '');
                                }}>
                                    {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Application Date</label>
                                <input type="date" className="form-input" value={admissionData.applicationDate} onChange={e => update('applicationDate', e.target.value)} />
                            </div>

                            {/* Subject Track (if available for class) */}
                            {(() => {
                                const applyingBase = getBaseClass(admissionData.applyingFor);
                                const tracksForClass = CLASS_TRACKS?.[applyingBase] || [];
                                if (tracksForClass.length === 0) return null;
                                return (
                                    <div>
                                        <label className="form-label">Subject Track (e.g. Biology, ICS)</label>
                                        <select className="form-input" value={admissionData.subjectTrack || ''} onChange={e => {
                                            update('subjectTrack', e.target.value);
                                            update('subTrack', '');
                                        }}>
                                            <option value="">General / Default</option>
                                            {tracksForClass.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                );
                            })()}

                            {/* Sub-Track (if ICS / Humanities / Arts) */}
                            {(() => {
                                const applyingBase = getBaseClass(admissionData.applyingFor);
                                const trk = admissionData.subjectTrack;
                                const subTracksForClass = trk ? (CLASS_SUBTRACKS?.[`${applyingBase} ${trk}`] || CLASS_SUBTRACKS?.[trk] || (trk === 'ICS' ? ['Physics', 'Economics', 'Statistics'] : (trk === 'Humanities' || trk.includes('FA')) ? ['FAIT', 'FA'] : trk === 'Arts' ? ['Simple Arts', 'Computer Arts'] : [])) : [];
                                if (subTracksForClass.length === 0) return null;
                                return (
                                    <div>
                                        <label className="form-label">Sub-part (e.g. Physics, Economics, Stats, FAIT, FA, Simple Arts)</label>
                                        <select className="form-input" value={admissionData.subTrack || ''} onChange={e => update('subTrack', e.target.value)}>
                                            <option value="">None / General</option>
                                            {subTracksForClass.map(st => <option key={st} value={st}>{st}</option>)}
                                        </select>
                                    </div>
                                );
                            })()}

                            {/* Custom Group / House (Quaid / Iqbal) */}
                            {(() => {
                                const applyingBase = getBaseClass(admissionData.applyingFor);
                                const groupsForClass = CLASS_GROUPS?.[applyingBase] || [];
                                if (groupsForClass.length === 0) return null;
                                return (
                                    <div>
                                        <label className="form-label">Class Group (e.g. Quaid, Iqbal)</label>
                                        <select className="form-input" value={admissionData.group || ''} onChange={e => update('group', e.target.value)}>
                                            <option value="">Default (No Group)</option>
                                            {groupsForClass.map(g => <option key={g} value={g}>🏆 {g}</option>)}
                                        </select>
                                    </div>
                                );
                            })()}

                            <div>
                                <label className="form-label">Serial Number (Optional)</label>
                                <input type="text" className="form-input" placeholder="Enter manual serial number (must be unique)" value={admissionData.serialNumber} onChange={e => update('serialNumber', e.target.value)} />
                            </div>
                        </div>

                        {/* Student Information */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={18} /> Student's Information
                            </h3>
                            <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                                <div>
                                    <label className="form-label">Student's Name (Capital Letters)</label>
                                    <input type="text" className="form-input" placeholder="Enter full name" value={admissionData.studentName} onChange={e => update('studentName', e.target.value.toUpperCase())} />
                                </div>
                                <div>
                                    <label className="form-label">B-Form Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="35202-0000000-0"
                                        value={admissionData.bForm}
                                        onChange={e => update('bForm', formatCNIC(e.target.value))}
                                        maxLength={15}
                                        inputMode="numeric"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Date of Birth</label>
                                    <input type="date" className="form-input" value={admissionData.dob} onChange={e => update('dob', e.target.value)} />
                                </div>
                                <div>
                                    <label className="form-label">Nationality</label>
                                    <input type="text" className="form-input" placeholder="e.g. Pakistani" value={admissionData.nationality} onChange={e => update('nationality', e.target.value)} />
                                </div>
                                <div>
                                    <label className="form-label">Gender</label>
                                    <div className="flex gap-4">
                                        {['Male', 'Female', 'Others'].map(g => (
                                            <label key={g} className="flex gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="radio" name="gender" checked={admissionData.gender === g} onChange={() => update('gender', g)} /> {g}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Religion</label>
                                    <input type="text" className="form-input" placeholder="e.g. Islam" value={admissionData.religion} onChange={e => update('religion', e.target.value)} />
                                </div>
                                <div>
                                    <label className="form-label">Student Photograph</label>
                                    <div className="flex gap-4" style={{ alignItems: 'center' }}>
                                        <div style={{ width: '60px', height: '80px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {admissionData.photo ? <img src={admissionData.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={20} style={{ margin: 'auto', color: '#94a3b8' }} />}
                                        </div>
                                        <button onClick={() => photoFileRef.current.click()} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white' }}>
                                            <Camera size={14} /> Upload Photo
                                        </button>
                                    </div>
                                    <input type="file" ref={photoFileRef} style={{ display: 'none' }} accept="image/*" onChange={handleAdmissionPhotoUpload} />
                                </div>
                            </div>
                        </div>

                        {/* Health & Medical */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Award size={18} /> Health &amp; Medical Information
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {[
                                    { key: 'allergies', label: 'Any Allergies?' },
                                    { key: 'chronicCondition', label: 'Chronic Medical Condition?' },
                                    { key: 'medication', label: 'Take Regular Medication?' },
                                ].map(({ key, label }) => (
                                    <div className="grid grid-cols-2" style={{ gap: '2rem' }} key={key}>
                                        <div>
                                            <label className="form-label">{label}</label>
                                            <div className="flex gap-4">
                                                {['Yes', 'No'].map(o => (
                                                    <label key={o} className="flex gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                                        <input type="radio" checked={admissionData[key] === o} onChange={() => update(key, o)} /> {o}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Details (If any)</label>
                                            <input type="text" className="form-input" value={admissionData[`${key}Details`] || ''} onChange={e => update(`${key}Details`, e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Parent Information */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={18} /> Parents Information
                            </h3>
                            <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                                <div className="col-span-2">
                                    <label className="form-label">Father's Name (Capital Letters)</label>
                                    <input type="text" className="form-input" value={admissionData.fatherName} onChange={e => update('fatherName', e.target.value.toUpperCase())} />
                                </div>
                                <div>
                                    <label className="form-label">CNIC Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="35202-0000000-0"
                                        value={admissionData.fatherCnic}
                                        onChange={e => update('fatherCnic', formatCNIC(e.target.value))}
                                        maxLength={15}
                                        inputMode="numeric"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Contact Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0300-1234567"
                                        value={admissionData.contact}
                                        onChange={e => update('contact', formatPhone(e.target.value))}
                                        maxLength={12}
                                        inputMode="numeric"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">WhatsApp Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="0300-1234567"
                                        value={admissionData.whatsapp}
                                        onChange={e => update('whatsapp', formatPhone(e.target.value))}
                                        maxLength={12}
                                        inputMode="numeric"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Agreed Monthly Fee (RS)</label>
                                    <input type="number" className="form-input" placeholder="e.g. 1500" value={admissionData.monthlyFee || ''} onChange={e => update('monthlyFee', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="form-label">Home Address</label>
                                    <textarea className="form-input" style={{ height: '80px' }} value={admissionData.address} onChange={e => update('address', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Documents Required */}
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={18} /> Documents Required
                            </h3>
                            <div className="flex flex-col gap-3">
                                {[
                                    { key: 'photos', label: '4 Passport size photographs' },
                                    { key: 'bform', label: 'A Copy of B-Form' },
                                    { key: 'cnic', label: 'A Copy of CNIC of Parents/Guardian' },
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={admissionData.docs[key]} onChange={e => update('docs', { ...admissionData.docs, [key]: e.target.checked })} /> {label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Fee Voucher Modal ── */}
            {showVoucherModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ maxWidth: 450, width: '100%', padding: '2rem', position: 'relative', borderTop: '6px solid #1a3a6b' }}>
                        <button onClick={() => setShowVoucherModal(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}>💰 Generate Fee Voucher</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Prepare a 3-part bank voucher for inquiry <strong>{selectedInquiryForVoucher?.inquiry_no}</strong>.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Admission Fee (Rs.)</label>
                                <input type="number" className="form-input" value={voucherFees.admissionFee} onChange={e => setVoucherFees({...voucherFees, admissionFee: e.target.value})} placeholder="e.g. 5000" />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Paper Fund (Rs.)</label>
                                <input type="number" className="form-input" value={voucherFees.paperFund} onChange={e => setVoucherFees({...voucherFees, paperFund: e.target.value})} placeholder="e.g. 500" />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Monthly Fee (Rs.)</label>
                                <input type="number" className="form-input" value={voucherFees.monthlyFee} onChange={e => setVoucherFees({...voucherFees, monthlyFee: e.target.value})} placeholder="e.g. 2500" />
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#1e3a8a' }}>
                                    <span>Total Payable:</span>
                                    <span>Rs. {(Number(voucherFees.admissionFee)||0) + (Number(voucherFees.paperFund)||0) + (Number(voucherFees.monthlyFee)||0)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setShowVoucherModal(false)} className="btn" style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }}>Cancel</button>
                            <button onClick={handlePrintVoucher} className="btn" style={{ flex: 2, background: '#1a3a6b', color: 'white', border: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Printer size={18} /> Print 3-Part Voucher
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Print Modal ── */}
            {showBulkModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ maxWidth: 500, width: '100%', padding: '1.75rem', borderTop: '4px solid #1e3a8a', position: 'relative' }}>
                        <button onClick={() => setShowBulkModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e293b', marginBottom: '0.25rem' }}>🖨 Print Admission Forms</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Choose what to print — each student gets their own A4 page</div>

                        {/* Mode selector */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            {[
                                { id: 'student', label: '👤 Single Student', sub: 'By ID' },
                                { id: 'class', label: '🏫 By Class', sub: 'All in class' },
                                { id: 'college', label: '🎓 Whole College', sub: `${students?.length || 0} students` },
                            ].map(opt => (
                                <button key={opt.id} onClick={() => setBulkMode(opt.id)}
                                    style={{ flex: 1, padding: '0.65rem 0.5rem', borderRadius: '10px', border: `2px solid ${bulkMode === opt.id ? '#1e3a8a' : '#e2e8f0'}`, background: bulkMode === opt.id ? '#eff6ff' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: bulkMode === opt.id ? '#1e3a8a' : '#475569' }}>{opt.label}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>{opt.sub}</div>
                                </button>
                            ))}
                        </div>

                        {/* Student picker */}
                        {bulkMode === 'student' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Search Student</label>
                                <input type="text" className="form-input" placeholder="Type name or ID..." value={bulkStudentSearch}
                                    onChange={e => { setBulkStudentSearch(e.target.value); setBulkStudentId(''); }} style={{ width: '100%', marginBottom: '0.5rem' }} />
                                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                    {students?.filter(s => s.name?.toLowerCase().includes(bulkStudentSearch.toLowerCase())).slice(0, 20).map(s => (
                                        <div key={s.id} onClick={() => { setBulkStudentId(s.id); setBulkStudentSearch(s.name); }}
                                            style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', background: bulkStudentId === s.id ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.id} · {s.grade}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Class picker */}
                        {bulkMode === 'class' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Select Class</label>
                                <select className="form-input" value={bulkClass} onChange={e => setBulkClass(e.target.value)} style={{ width: '100%' }}>
                                    {allClasses.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button onClick={() => setShowBulkModal(false)} className="btn">Cancel</button>
                            <button onClick={handleBulkPrint} className="btn btn-primary" style={{ background: '#1e3a8a', borderColor: '#1e3a8a' }}>
                                <Printer size={16} /> Print Forms
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── End of Session Management (only in Admission tab for legacy reasons) ── */}
            <div className="card" style={{ marginTop: '2.5rem', borderTop: '5px solid #7c3aed', background: 'linear-gradient(135deg, #ffffff, #f5f3ff)' }}>
                <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
                        <Users size={24} color="#7c3aed" />
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4c1d95' }}>End of Session: Batch Management</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2.5rem' }}>
                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '15px', border: '1px solid #e9d5ff' }}>
                            <div style={{ fontWeight: 800, color: '#7c3aed', marginBottom: '1rem' }}>🎓 Graduate Entire Class</div>
                            <select className="form-input" value={graduateClass} onChange={e => setGraduateClass(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }}>
                                {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button onClick={async () => {
                                const classStudents = (students || []).filter(s => getBaseClass(s.grade) === getBaseClass(graduateClass) && (s.status || 'active') === 'active');
                                if (classStudents.length === 0) return alert(`No active students found in ${graduateClass}`);
                                if (!window.confirm(`Graduate all ${classStudents.length} students in ${graduateClass}?`)) return;
                                setBatchProcessing(true);
                                try {
                                    const updated = (students || []).map(s => (getBaseClass(s.grade) === getBaseClass(graduateClass) && (s.status || 'active') === 'active') ? { ...s, status: 'graduated' } : s);
                                    await setStudents(updated);
                                    alert(`Graduated ${classStudents.length} students!`);
                                } finally { setBatchProcessing(false); }
                            }} disabled={batchProcessing} className="btn" style={{ width: '100%', background: '#dc2626', color: 'white', fontWeight: 700 }}>
                                {batchProcessing ? 'Processing...' : 'Graduate Class'}
                            </button>
                        </div>

                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '15px', border: '1px solid #e9d5ff' }}>
                            <div style={{ fontWeight: 800, color: '#7c3aed', marginBottom: '1rem' }}>🚀 Bulk Promotion</div>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <select className="form-input" value={batchClass} onChange={e => setBatchClass(e.target.value)} style={{ flex: 1 }}>
                                    {sectionClasses.map(c => <option key={c} value={c}>From: {c}</option>)}
                                </select>
                                <select className="form-input" value={targetClass} onChange={e => setTargetClass(e.target.value)} style={{ flex: 1 }}>
                                    {sectionClasses.map(c => <option key={c} value={c}>To: {c}</option>)}
                                </select>
                            </div>
                            <button onClick={async () => {
                                const classStudents = (students || []).filter(s => getBaseClass(s.grade) === getBaseClass(batchClass) && (s.status || 'active') === 'active');
                                if (classStudents.length === 0) return alert(`No active students in ${batchClass}`);
                                if (batchClass === targetClass) return alert("Source and target must be different.");
                                if (!window.confirm(`Promote ${classStudents.length} students to ${targetClass}?`)) return;
                                setBatchProcessing(true);
                                try {
                                    const updated = (students || []).map(s => {
                                        if (getBaseClass(s.grade) === getBaseClass(batchClass) && (s.status || 'active') === 'active') {
                                            return { ...s, grade: targetClass, attendance: { present: 0, absent: 0, total: 0, percentage: 0, records: [] } };
                                        }
                                        return s;
                                    });
                                    await setStudents(updated);
                                    alert(`Promoted ${classStudents.length} students!`);
                                } finally { setBatchProcessing(false); }
                            }} disabled={batchProcessing} className="btn" style={{ width: '100%', background: '#1e3a8a', color: 'white', fontWeight: 700 }}>
                                {batchProcessing ? 'Processing...' : 'Promote Class'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdmissionsTab;
