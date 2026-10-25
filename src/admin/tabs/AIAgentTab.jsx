import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, Bot, User, Terminal, BarChart3, Send, Sparkles } from 'lucide-react';
import {
  askGroqBIAgent,
  getStoredGroqApiKey,
  setStoredGroqApiKey
} from '../../warehouse/groqAgentEngine';

const SUGGESTED_PROMPTS = [
  'How is our school performing overall in Academics, Attendance, and Fee Recovery?',
  'Compare Matric (Biology vs Computer) and Intermediate (Pre-Medical vs Pre-Engineering vs ICS) exam performance.',
  'Which students are at CRITICAL risk of dropping out or failing, and what are their fee arrears?',
  'Analyze our 6-month Financial P&L, fee defaulters by class, and geographic revenue from Painsra vs Gojra Road.',
  'Which subjects have the lowest average percentage and highest failure rates across tracks?',
  'Show me the end-to-end Data Vault 2.0 & Star Schema lineage for student STU001.'
];

export default function AIAgentTab({ dataWarehouse, biSummary, showToast }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'Enterprise Agentic BI Ready (Neon PostgreSQL)',
      content:
        'Assalam-o-Alaikum! I am your **ACS Enterprise Data Warehouse & BI AI Analyst** powered by **Groq LPU (`llama-3.3-70b-versatile`)** and connected to **Neon Serverless PostgreSQL (`neondb`)**.\n\nI have direct tool access to your **Bronze Data Lake**, **Silver Data Vault 2.0**, and **Gold Kimball Star Schema** (covering **360 Pakistani students**, multi-term BISE assessments, 6-month PKR fee challans, 60-day attendance logs, and institutional P&L).\n\nAsk me any strategic question about school operations, student risk, subject bottlenecks, or financial cashflow.',
      toolTraces: [],
      chart: null
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredGroqApiKey());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    setStoredGroqApiKey(apiKeyInput);
    setShowKeyModal(false);
    if (showToast) {
      showToast(
        apiKeyInput.trim()
          ? 'Groq API Key saved. Live LPU inference enabled.'
          : 'Cleared Groq API Key (using deterministic local DW OLAP engine).',
        'success'
      );
    }
  };

  const handleSendQuestion = async (questionText) => {
    const query = (questionText ?? inputPrompt).trim();
    if (!query || isThinking) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: query
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputPrompt('');
    setIsThinking(true);

    try {
      const response = await askGroqBIAgent(query, dataWarehouse, nextHistory);

      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: response.modelUsed || 'ACS OLAP Agent',
        content: response.text,
        toolTraces: response.toolTraces || [],
        chart: response.chart || null
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: 'Error Fallback',
          content: `Encountered an unexpected error while querying the Data Warehouse: ${err.message}`,
          toolTraces: []
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const hasGroqKey = Boolean(apiKeyInput && apiKeyInput.trim().length > 10);

  return (
    <div className="dw-workbench">
      {/* Top Workspace Banner */}
      <div className="dw-hero-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              className="dw-pill-badge"
              style={{
                background: hasGroqKey ? '#ecfdf5' : '#eff6ff',
                color: hasGroqKey ? '#059669' : '#2563eb',
                border: `1px solid ${hasGroqKey ? '#a7f3d0' : '#bfdbfe'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasGroqKey ? '#10b981' : '#2563eb' }} />
              {hasGroqKey ? 'GROQ LPU LIVE CONNECTED' : 'GROQ AGENTIC ENGINE (LOCAL OLAP + GROQ READY)'}
            </span>
            <span className="dw-pill-badge" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
              NEON POSTGRESQL DW (`neondb`)
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Agentic AI Business Intelligence Analyst (Groq API)
          </h2>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.875rem', maxWidth: '760px', lineHeight: 1.55 }}>
            Ask natural-language questions across all <strong>4 departmental databases</strong>. The agent autonomously executes SQL/OLAP tools against the Gold Star Schema &amp; Silver Data Vault and renders visual charts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="dw-btn dw-btn-secondary"
          >
            <KeyRound size={14} />
            {hasGroqKey ? 'Groq API Key Configured' : 'Configure Groq API Key'}
          </button>
        </div>
      </div>

      {/* Groq API Key Modal */}
      {showKeyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <form
            onSubmit={handleSaveApiKey}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15)',
              border: '1px solid #e2e8f0'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={18} color="#2563eb" />
              Configure Groq Cloud API Key
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
              Enter your Groq API key (<code>gsk_...</code>) from{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                console.groq.com
              </a>
              . You can also set <code>VITE_GROQ_API_KEY</code> in your <code>.env</code> file. Even without an API key, the agent runs all Data Warehouse OLAP tools locally.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="dw-input"
              style={{ width: '100%', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="dw-btn dw-btn-secondary" onClick={() => setShowKeyModal(false)}>
                Cancel
              </button>
              <button type="submit" className="dw-btn dw-btn-primary">
                Save API Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Agent Studio Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }} className="dw-agent-grid">
        {/* Left Column: Conversation Stream + Prompt Input */}
        <div className="dw-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '620px', justifyContent: 'space-between' }}>
          {/* Suggested Quick Prompts */}
          <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Executive BI Prompts
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendQuestion(prompt)}
                  disabled={isThinking}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '6px 11px',
                    fontSize: '0.76rem',
                    color: '#334155',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {prompt.length > 68 ? prompt.slice(0, 68) + '…' : prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Message Stream */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '460px', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: msg.role === 'user' ? '78%' : '94%',
                  width: msg.role === 'assistant' ? '100%' : 'auto',
                  background: msg.role === 'user' ? '#0f172a' : '#f8fafc',
                  color: msg.role === 'user' ? '#ffffff' : '#0f172a',
                  border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '15px 18px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.74rem', color: msg.role === 'user' ? '#94a3b8' : '#64748b' }}>
                  <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', color: msg.role === 'user' ? '#f8fafc' : '#0f172a' }}>
                    {msg.role === 'user' ? <User size={13} /> : <Bot size={14} color="#2563eb" />}
                    {msg.role === 'user' ? 'Executive Query' : `ACS BI Agent • ${msg.mode || ''}`}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Formatted Answer Content */}
                <div style={{ fontSize: '0.875rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>

                {/* Inline Dynamic Chart Renderer (Table or Bar) */}
                {msg.chart && msg.chart.type === 'table' && msg.chart.rows && (
                  <div style={{ marginTop: '14px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart3 size={14} color="#2563eb" />
                      {msg.chart.title}
                    </div>
                    <div className="dw-table-scroll">
                      <table className="dw-data-table">
                        <thead>
                          <tr>
                            {(msg.chart.columns || []).map((c, idx) => (
                              <th key={idx}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.chart.rows.map((r, rIdx) => (
                            <tr key={rIdx}>
                              {r.map((cell, cIdx) => (
                                <td key={cIdx}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {msg.chart && msg.chart.type === 'bar' && msg.chart.data && (
                  <div style={{ marginTop: '14px', padding: '14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart3 size={14} color="#2563eb" />
                      {msg.chart.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {msg.chart.data.map((item, idx) => {
                        const maxVal = Math.max(...msg.chart.data.map((x) => Number(x.value) || 1), 1);
                        const widthPct = Math.min(100, Math.max(8, Math.round(((Number(item.value) || 0) / maxVal) * 100)));
                        return (
                          <div key={idx} style={{ fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.label}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#2563eb' }}>
                                {item.valueLabel || item.value} {item.subLabel ? `• ${item.subLabel}` : ''}
                              </span>
                            </div>
                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${widthPct}%`, height: '100%', background: '#2563eb' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Collapsible DW Tool & SQL Execution Traces */}
                {msg.toolTraces && msg.toolTraces.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {expandedTraceId === msg.id
                        ? `Hide Data Warehouse SQL & Tool Traces (${msg.toolTraces.length})`
                        : `View Executed DW Tools & SQL Traces (${msg.toolTraces.length} tools run)`}
                    </button>

                    {expandedTraceId === msg.id && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {msg.toolTraces.map((tr, i) => (
                          <div
                            key={i}
                            style={{
                              background: '#0f172a',
                              color: '#e2e8f0',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontFamily: 'JetBrains Mono, monospace'
                            }}
                          >
                            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>
                              Tool #{i + 1}: {tr.toolName}() [{tr.layer}] — {tr.summary}
                            </div>
                            <div style={{ color: '#a7f3d0' }}>SQL Equivalent: {tr.sqlEquivalent}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}>
                Agent is querying Gold Kimball Fact tables &amp; synthesizing executive insights...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
            style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask anything about students, BISE marks, fee defaulters, attendance, or DW architecture..."
              className="dw-input"
              style={{ flex: 1, padding: '11px 14px', fontSize: '0.875rem' }}
            />
            <button
              type="submit"
              disabled={isThinking || !inputPrompt.trim()}
              className="dw-btn dw-btn-primary"
              style={{ padding: '11px 20px' }}
            >
              <Send size={14} />
              {isThinking ? 'Analyzing...' : 'Ask BI Agent'}
            </button>
          </form>
        </div>

        {/* Right Column: Live Warehouse Schema & Tool Registry */}
        <div className="dw-panel" style={{ fontSize: '0.8rem' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="#2563eb" />
            Active Agent Warehouse Tools
          </h4>
          <p style={{ margin: '0 0 14px', color: '#475569', lineHeight: 1.5 }}>
            Every prompt automatically triggers deterministic OLAP &amp; SQL tools against the live 3-tier Data Warehouse on Neon PostgreSQL before LLM synthesis:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                name: 'query_gold_executive_kpis()',
                desc: 'Queries Gold KPI Summary across 360 students, PKR tuition collections, and P&L surplus.'
              },
              {
                name: 'query_at_risk_student_360_cube()',
                desc: 'Scans Student 360° Cube for composite Academic, Attendance, and Fee Default risk.'
              },
              {
                name: 'query_fact_fee_ledger_and_pnl()',
                desc: 'Rolls up `dw_fact_fee_ledger` and `dw_fact_institutional_pnl` across 6 billing months.'
              },
              {
                name: 'query_subject_bottlenecks()',
                desc: 'Ranks BISE subjects by failure rate and distinction rate across exam terms.'
              },
              {
                name: 'inspect_silver_data_vault_lineage()',
                desc: 'Traces student hash keys (`hk_*`) across Data Vault 2.0 Hubs, Links, and Satellites.'
              }
            ].map((tool) => (
              <div
                key={tool.name}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#2563eb', fontSize: '0.74rem', marginBottom: '3px' }}>
                  {tool.name}
                </div>
                <div style={{ color: '#475569', fontSize: '0.75rem', lineHeight: 1.45 }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
