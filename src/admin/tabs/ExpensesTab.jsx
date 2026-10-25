import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, DollarSign, TrendingUp, TrendingDown, CheckSquare, Search } from 'lucide-react';

const ExpensesTab = ({ EXPENSES, updateExpenses, students }) => {
    const [expenses, setExpenses] = useState(EXPENSES || []);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (EXPENSES) setExpenses(EXPENSES);
    }, [EXPENSES]);

    const [newExpense, setNewExpense] = useState({
        title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Utilities', status: 'Paid'
    });
    const [search, setSearch] = useState('');

    const calcRevenue = () => {
        let total = 0;
        students.forEach(s => {
            (s.feeHistory || []).forEach(h => {
                if(h.status === 'paid' || h.status === 'partial') {
                    // Try to use paidAmount, otherwise fallback
                    if (h.paidAmount !== undefined) {
                        total += Number(h.paidAmount);
                    } else if (h.status === 'paid') {
                        // legacy logic fallback if paidAmount missing
                        const t = h.tuitionFee||1000; const a = h.admissionFee||0; const an = h.annualFee||0;
                        const e = h.examFee||0; const tr = h.transportFee||0; const l = h.labFee||0;
                        const lt = h.lateFine||0; const d = h.discount||0;
                        total += (t+a+an+e+tr+l+lt-d);
                    }
                }
            });
        });
        return total;
    };

    const totalRevenue = calcRevenue();
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const handleAddExpense = async () => {
        if(!newExpense.title || !newExpense.amount) return;
        const entry = { id: Date.now().toString(), ...newExpense, amount: Number(newExpense.amount) };
        const newList = [entry, ...expenses];
        setExpenses(newList);
        await updateExpenses(newList);
        setShowForm(false);
        setNewExpense({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Utilities', status: 'Paid' });
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Delete this expense record?")) return;
        const newList = expenses.filter(e => e.id !== id);
        setExpenses(newList);
        await updateExpenses(newList);
    };

    const filtered = expenses.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>📉 Expense Tracker & P&L</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Track outgoing costs and view overall net profit</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ gap: '0.4rem' }}>
                    <PlusCircle size={16} /> Log Expense
                </button>
            </div>

            {/* Stats Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', marginTop: '0.5rem' }}>RS {totalRevenue.toLocaleString()}</div>
                    <TrendingUp size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: '#16a34a', opacity: 0.1 }} />
                </div>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Expenses</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.5rem' }}>RS {totalExpenses.toLocaleString()}</div>
                    <TrendingDown size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: '#dc2626', opacity: 0.1 }} />
                </div>
                <div style={{ background: netProfit >= 0 ? '#eff6ff' : '#fffbeb', border: `1px solid ${netProfit >= 0 ? '#bfdbfe' : '#fde68a'}`, borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ color: netProfit >= 0 ? '#2563eb' : '#d97706', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Profit</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: netProfit >= 0 ? '#1d4ed8' : '#b45309', marginTop: '0.5rem' }}>RS {netProfit.toLocaleString()}</div>
                    <DollarSign size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: netProfit >= 0 ? '#2563eb' : '#d97706', opacity: 0.1 }} />
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Log New Expense</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Expense Title</label>
                            <input type="text" className="form-input" placeholder="e.g. Electric Bill" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="form-label">Amount (RS)</label>
                            <input type="number" className="form-input" placeholder="0" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="form-label">Category</label>
                            <select className="form-input" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                                <option>Utilities (Elec/Water)</option>
                                <option>Teacher Salaries</option>
                                <option>Staff Wages</option>
                                <option>Building Rent</option>
                                <option>Stationery/Supplies</option>
                                <option>Maintenance</option>
                                <option>Event/Function</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                        </div>
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <button onClick={handleAddExpense} className="btn btn-primary" style={{ flex: 1 }}>Save Expense Record</button>
                        <button onClick={() => setShowForm(false)} className="btn" style={{ background: '#e2e8f0', color: '#475569' }}>Cancel</button>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Ledger History</h3>
                    <div className="search-box" style={{ width: '250px' }}>
                        <Search size={16} />
                        <input type="text" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Amount (RS)</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(exp => (
                            <tr key={exp.id}>
                                <td style={{ fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                                <td><span style={{ fontWeight: 700, color: '#0f172a' }}>{exp.title}</span></td>
                                <td><span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{exp.category}</span></td>
                                <td><span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><CheckSquare size={12}/> {exp.status}</span></td>
                                <td style={{ fontWeight: 800, color: '#dc2626' }}>{Number(exp.amount).toLocaleString()}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => handleDelete(exp.id)} className="action-btn delete" title="Delete Expense">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontStyle: 'italic' }}>No expenses found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpensesTab;
