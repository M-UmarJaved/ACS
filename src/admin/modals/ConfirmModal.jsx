import React from 'react';

const ConfirmModal = ({ modal, onClose }) => {
    if (!modal.open) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card animate-fade-in" style={{ maxWidth: '460px', width: '100%', padding: '2rem', textAlign: 'center', borderTop: `4px solid ${modal.danger ? '#ef4444' : '#2563eb'}` }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>{modal.title}</div>
                <div style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>{modal.message}</div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button onClick={onClose}
                        style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                        Cancel
                    </button>
                    <button onClick={() => { modal.onConfirm?.(); onClose(); }}
                        style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: modal.danger ? '#ef4444' : '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                        {modal.danger ? '🗑 Delete' : '✓ Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
