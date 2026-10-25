import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, showDetails: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    background: '#f8fafc',
                    color: '#0f172a',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        maxWidth: '560px',
                        width: '100%',
                        background: 'white',
                        padding: '2.5rem',
                        borderRadius: '16px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏫</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#1e293b' }}>
                            ACS School & College
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                            We encountered an issue while loading the application.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                style={{
                                    background: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.75rem',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                                }}
                            >
                                🔄 Reload Page
                            </button>
                            <button
                                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                                style={{
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {this.state.showDetails ? 'Hide Error Details' : 'View Error Details'}
                            </button>
                        </div>
                        {this.state.showDetails && this.state.error && (
                            <div style={{
                                marginTop: '1.5rem',
                                padding: '1rem',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                textAlign: 'left',
                                overflowX: 'auto'
                            }}>
                                <p style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                                    {String(this.state.error?.message || this.state.error)}
                                </p>
                                {this.state.error?.stack && (
                                    <pre style={{ fontSize: '0.75rem', color: '#7f1d1d', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {this.state.error.stack}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
