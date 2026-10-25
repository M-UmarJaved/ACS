import React, { useState, useMemo } from 'react';
import { Bot, RotateCcw, ArrowRight, AlertTriangle, TrendingUp, Layers } from 'lucide-react';
import { executeOlapSliceAndDice } from '../../warehouse/olapEngine';

export default function BIAnalyticsTab({ dataWarehouse, biSummary, onNavigateTab }) {
  const [dimension, setDimension] = useState('base_class');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [trackFilter, setTrackFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [drilldownKey, setDrilldownKey] = useState(null);
  const [activeSubView, setActiveSubView] = useState('olap');

  const olapGroups = useMemo(() => {
    if (!dataWarehouse) return [];
    return executeOlapSliceAndDice(dataWarehouse, {
      dimension,
      sectionFilter,
      classFilter,
      trackFilter,
      genderFilter,
      riskFilter
    });
  }, [dataWarehouse, dimension, sectionFilter, classFilter, trackFilter, genderFilter, riskFilter]);

  if (!dataWarehouse || !biSummary) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h3>Computing OLAP Cubes &amp; Executive BI Summaries...</h3>
      </div>
    );
  }

  const {
    kpis,
    student360 = [],
    classRollup = [],
    sectionRollup = [],
    subjectPerformance = [],
    trackComparison = [],
    monthlyPnL = []
  } = biSummary;

  const uniqueSections = ['ALL', ...Array.from(new Set(student360.map((s) => s.section_name).filter(Boolean)))];
  const uniqueClasses = ['ALL', ...classRollup.map((c) => c.base_class)];
  const uniqueTracks = ['ALL', ...Array.from(new Set(student360.map((s) => s.subject_track).filter(Boolean)))];

  // Grade Distribution Calculation
  const gradeDistribution = useMemo(() => {
    const dist = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    student360.forEach((s) => {
      const g = s.overallGrade || (s.avgExamPct >= 80 ? 'A+' : s.avgExamPct >= 70 ? 'A' : s.avgExamPct >= 60 ? 'B' : s.avgExamPct >= 50 ? 'C' : s.avgExamPct >= 40 ? 'D' : 'F');
      if (dist[g] !== undefined) dist[g]++;
      else dist['F']++;
    });
    return dist;
  }, [student360]);

  // Top Merit Leaders (Top 10)
  const topMeritStudents = useMemo(() => {
    return [...student360].sort((a, b) => b.avgExamPct - a.avgExamPct).slice(0, 10);
  }, [student360]);

  // At-Risk Cohort
  const atRiskStudents = useMemo(
    () => student360.filter((s) => s.riskTier === 'Critical' || s.riskTier === 'High').sort((a, b) => b.riskScore - a.riskScore),
    [student360]
  );

  // Geographic Locality Catchment Roll-Up
  const localityCatchment = useMemo(() => {
    const locMap = new Map();
    student360.forEach((s) => {
      const loc = s.locality || 'Painsra Main';
      if (!locMap.has(loc)) {
        locMap.set(loc, {
          locality: loc,
          students: 0,
          sumExam: 0,
          sumAtt: 0,
          totalPaid: 0,
          totalArrears: 0
        });
      }
      const item = locMap.get(loc);
      item.students++;
      item.sumExam += s.avgExamPct;
      item.sumAtt += s.attendancePct;
      item.totalPaid += s.totalFeePaid;
      item.totalArrears += s.totalArrears;
    });
    return Array.from(locMap.values())
      .map((item) => ({
        ...item,
        avgExam: Number((item.sumExam / item.students).toFixed(1)),
        avgAtt: Number((item.sumAtt / item.students).toFixed(1))
      }))
      .sort((a, b) => b.students - a.students);
  }, [student360]);

  // Admissions Funnel by Class
  const admissionsFunnelByClass = useMemo(() => {
    const funnelFacts = dataWarehouse?.goldStarSchema?.facts?.dw_fact_admissions_funnel || [];
    const classMap = new Map();
    funnelFacts.forEach((f) => {
      const c = f.base_class || '9th';
      if (!classMap.has(c)) {
        classMap.set(c, {
          base_class: c,
          totalInquiries: 0,
          confirmed: 0,
          pending: 0,
          quotedRevenue: 0
        });
      }
      const item = classMap.get(c);
      item.totalInquiries++;
      if (f.converted_flag === 1) item.confirmed++;
      else item.pending++;
      item.quotedRevenue += (f.total_quoted_pkg || 0);
    });
    return Array.from(classMap.values()).map((item) => ({
      ...item,
      conversionRate: item.totalInquiries > 0 ? Number(((item.confirmed / item.totalInquiries) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.totalInquiries - a.totalInquiries);
  }, [dataWarehouse]);

  // Grand Totals for OLAP View
  const olapTotals = useMemo(() => {
    return olapGroups.reduce(
      (acc, g) => {
        acc.studentCount += g.studentCount;
        acc.netBilled += g.netBilled;
        acc.collected += g.collected;
        acc.arrears += g.arrears;
        acc.highRiskCount += g.highRiskCount;
        acc.sumExam += g.avgExamPct * g.studentCount;
        acc.sumAtt += g.avgAttendancePct * g.studentCount;
        return acc;
      },
      { studentCount: 0, netBilled: 0, collected: 0, arrears: 0, highRiskCount: 0, sumExam: 0, sumAtt: 0 }
    );
  }, [olapGroups]);

  const drilledStudents = useMemo(() => {
    if (!drilldownKey) return [];
    return student360.filter((s) => {
      if (sectionFilter !== 'ALL' && s.section_name !== sectionFilter) return false;
      if (classFilter !== 'ALL' && s.base_class !== classFilter) return false;
      if (trackFilter !== 'ALL' && s.subject_track !== trackFilter) return false;
      if (genderFilter !== 'ALL' && s.gender !== genderFilter) return false;
      if (riskFilter !== 'ALL' && s.riskTier !== riskFilter) return false;
      return String(s[dimension] || 'Unspecified') === String(drilldownKey);
    });
  }, [student360, drilldownKey, dimension, sectionFilter, classFilter, trackFilter, genderFilter, riskFilter]);

  return (
    <div className="dw-workbench">
      {/* Top Executive BI Workspace Header */}
      <div className="dw-hero-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span className="dw-pill-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              NEON POSTGRESQL OLAP CUBE
            </span>
            <span className="dw-pill-badge" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
              KIMBALL STAR SCHEMA • STUDENT 360° ANALYTICS
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
              Active Cohort: {kpis.totalStudents} Students • Session 2025-2026
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Executive Business Intelligence &amp; Multidimensional OLAP Studio
          </h2>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.875rem', maxWidth: '780px', lineHeight: 1.55 }}>
            Perform interactive <strong>Roll-up, Drill-down, Slice &amp; Dice, and Cross-Domain Risk Mining</strong> across Academic Performance, Fee Recovery, Attendance, and Institutional P&amp;L.
          </p>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('ai-agent')}
            className="dw-btn dw-btn-primary"
          >
            <Bot size={15} />
            Ask Groq AI Analyst
          </button>
        )}
      </div>

      {/* 6 Executive KPI Cards */}
      <div className="dw-kpi-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="dw-kpi-card">
          <div className="dw-kpi-label">INSTITUTION ACADEMIC MEAN</div>
          <div className="dw-kpi-value">{kpis.overallExamAvg}%</div>
          <div className="dw-kpi-sub">Pass Rate: {kpis.overallPassRate}% • Distinction: {kpis.distinctionRate}%</div>
        </div>
        <div className="dw-kpi-card">
          <div className="dw-kpi-label">FEE RECOVERY RATE</div>
          <div className="dw-kpi-value" style={{ color: '#059669' }}>{kpis.collectionEfficiency}%</div>
          <div className="dw-kpi-sub">Collected: PKR {(kpis.totalCollected / 1000000).toFixed(2)}M</div>
        </div>
        <div className="dw-kpi-card">
          <div className="dw-kpi-label">FEE RECEIVABLES (ARREARS)</div>
          <div className="dw-kpi-value" style={{ color: '#dc2626' }}>PKR {(kpis.totalArrears / 1000).toFixed(0)}K</div>
          <div className="dw-kpi-sub">{kpis.defaultersCount} accounts with open balance</div>
        </div>
        <div className="dw-kpi-card">
          <div className="dw-kpi-label">MEAN ATTENDANCE RATE</div>
          <div className="dw-kpi-value">{kpis.overallAttendancePct}%</div>
          <div className="dw-kpi-sub">60-day biometric &amp; register roll-up</div>
        </div>
        <div className="dw-kpi-card">
          <div className="dw-kpi-label">CRM ADMISSIONS FUNNEL</div>
          <div className="dw-kpi-value">{kpis.inquiryConversionRate}%</div>
          <div className="dw-kpi-sub">{kpis.confirmedInquiries} Enrolled / {kpis.totalInquiries} Walk-ins</div>
        </div>
        <div className="dw-kpi-card">
          <div className="dw-kpi-label">HIGH / CRITICAL RISK COHORT</div>
          <div className="dw-kpi-value" style={{ color: '#dc2626' }}>{kpis.criticalRiskStudents}</div>
          <div className="dw-kpi-sub">Multi-fact early warning intervention cohort</div>
        </div>
      </div>

      {/* Sub-navigation (All 5 Course Requirement Sub-Tabs) */}
      <div className="dw-subnav">
        {[
          { id: 'olap', label: '1. OLAP Cube Explorer (Slice, Dice & Drill-Down)' },
          { id: 'academics', label: '2. Academic & Subject BI (Difficulty & Merit)' },
          { id: 'finance', label: '3. Financial & P&L Analytics (Monthly Cashflow)' },
          { id: 'risk360', label: `4. Predictive Early-Warning Risk (${atRiskStudents.length})` },
          { id: 'admissions', label: '5. Admissions CRM & Locality Funnel' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`dw-subnav-btn ${activeSubView === t.id ? 'active' : ''}`}
            onClick={() => setActiveSubView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: INTERACTIVE OLAP SLICE, DICE, ROLL-UP & DRILL-DOWN */}
      {activeSubView === 'olap' && (
        <div className="dw-panel">
          <div className="dw-panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 className="dw-panel-title">Multidimensional OLAP Cube Explorer</h3>
              <p className="dw-panel-subtitle">
                Choose a Roll-Up Dimension and apply Slice &amp; Dice filters. Click any aggregated row to <strong>Drill-Down</strong> into individual student records.
              </p>
            </div>
            <button
              type="button"
              className="dw-btn dw-btn-secondary"
              onClick={() => {
                setDimension('base_class');
                setSectionFilter('ALL');
                setClassFilter('ALL');
                setTrackFilter('ALL');
                setGenderFilter('ALL');
                setRiskFilter('ALL');
                setDrilldownKey(null);
              }}
            >
              <RotateCcw size={13} />
              Reset Cube Filters
            </button>
          </div>

          {/* Quick Roll-Up Dimension Hierarchy Selector */}
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Roll-Up Hierarchy:
            </span>
            {[
              { id: 'section_name', label: 'Section' },
              { id: 'base_class', label: 'Class' },
              { id: 'subject_track', label: 'Academic Track' },
              { id: 'locality', label: 'Locality' },
              { id: 'house_group', label: 'House Group' },
              { id: 'gender', label: 'Gender' },
              { id: 'riskTier', label: 'Risk Tier' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  setDimension(btn.id);
                  setDrilldownKey(null);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: dimension === btn.id ? 600 : 500,
                  background: dimension === btn.id ? '#0f172a' : '#f1f5f9',
                  color: dimension === btn.id ? '#ffffff' : '#334155',
                  border: dimension === btn.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* OLAP Controls Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              marginBottom: '16px'
            }}
          >
            <div>
              <label className="dw-filter-label">1. ROLL-UP / GROUP BY</label>
              <select
                value={dimension}
                onChange={(e) => {
                  setDimension(e.target.value);
                  setDrilldownKey(null);
                }}
                className="dw-select"
                style={{ width: '100%' }}
              >
                <option value="base_class">Class Level (Playgroup → 2nd Year)</option>
                <option value="section_name">Campus Section (Primary → Inter)</option>
                <option value="subject_track">BISE Subject Track</option>
                <option value="locality">Geographic Locality (Faisalabad)</option>
                <option value="riskTier">Student Risk Tier</option>
                <option value="gender">Gender Cohort</option>
                <option value="house_group">House / Group</option>
              </select>
            </div>

            <div>
              <label className="dw-filter-label">2. SLICE: CAMPUS SECTION</label>
              <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="dw-select" style={{ width: '100%' }}>
                {uniqueSections.map((sec) => (
                  <option key={sec} value={sec}>{sec === 'ALL' ? 'All Sections' : sec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="dw-filter-label">3. DICE: CLASS LEVEL</label>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="dw-select" style={{ width: '100%' }}>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c === 'ALL' ? 'All Classes' : c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="dw-filter-label">4. DICE: ACADEMIC TRACK</label>
              <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} className="dw-select" style={{ width: '100%' }}>
                {uniqueTracks.map((tr) => (
                  <option key={tr} value={tr}>{tr === 'ALL' ? 'All BISE Tracks' : tr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="dw-filter-label">5. DICE: GENDER</label>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="dw-select" style={{ width: '100%' }}>
                <option value="ALL">All Genders</option>
                <option value="Male">Boys (Male)</option>
                <option value="Female">Girls (Female)</option>
              </select>
            </div>

            <div>
              <label className="dw-filter-label">6. DICE: RISK TIER</label>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="dw-select" style={{ width: '100%' }}>
                <option value="ALL">All Risk Tiers</option>
                <option value="Critical">Critical Risk Only</option>
                <option value="High">High Risk Only</option>
                <option value="Moderate">Moderate Risk Only</option>
                <option value="Low">Low Risk Only</option>
              </select>
            </div>
          </div>

          {/* OLAP Aggregated Result Table with Grand Totals */}
          <div className="dw-table-scroll">
            <table className="dw-data-table">
              <thead>
                <tr>
                  <th>Dimension Value ({dimension})</th>
                  <th>Student Count</th>
                  <th>Mean Exam %</th>
                  <th>Visual Academic Bar</th>
                  <th>Mean Attendance %</th>
                  <th>Net Fee Billed (PKR)</th>
                  <th>Fee Arrears Due (PKR)</th>
                  <th>High/Critical Risk</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {olapGroups.map((grp) => {
                  const isSelected = drilldownKey === grp.dimensionKey;
                  return (
                    <tr
                      key={grp.dimensionKey}
                      onClick={() => setDrilldownKey(isSelected ? null : grp.dimensionKey)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : undefined
                      }}
                    >
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{grp.dimensionKey}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{grp.studentCount}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: grp.avgExamPct >= 75 ? '#059669' : grp.avgExamPct < 60 ? '#dc2626' : '#d97706' }}>
                        {grp.avgExamPct}%
                      </td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, grp.avgExamPct)}%`,
                              height: '100%',
                              background: grp.avgExamPct >= 75 ? '#10b981' : grp.avgExamPct < 60 ? '#ef4444' : '#f59e0b'
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{grp.avgAttendancePct}%</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{grp.netBilled.toLocaleString()}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: grp.arrears > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                        {grp.arrears.toLocaleString()}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            background: grp.highRiskCount > 0 ? '#fef2f2' : '#f0fdf4',
                            color: grp.highRiskCount > 0 ? '#dc2626' : '#059669'
                          }}
                        >
                          {grp.highRiskCount} students
                        </span>
                      </td>
                      <td>
                        <button type="button" className="dw-btn-mini">
                          {isSelected ? 'Hide Drill-Down' : 'Drill-Down'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td style={{ color: '#0f172a' }}>GRAND TOTAL ({olapGroups.length} Groups)</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{olapTotals.studentCount}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#2563eb' }}>
                    {olapTotals.studentCount > 0 ? (olapTotals.sumExam / olapTotals.studentCount).toFixed(1) : 0}%
                  </td>
                  <td>—</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {olapTotals.studentCount > 0 ? (olapTotals.sumAtt / olapTotals.studentCount).toFixed(1) : 0}%
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>PKR {olapTotals.netBilled.toLocaleString()}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#dc2626' }}>PKR {olapTotals.arrears.toLocaleString()}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#dc2626' }}>{olapTotals.highRiskCount}</td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Drill-Down Student Slice Drawer */}
          {drilldownKey && (
            <div style={{ marginTop: '18px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a' }}>
                  Drill-Down Fact Records for <strong>{dimension} = "{drilldownKey}"</strong> ({drilledStudents.length} students)
                </h4>
                <button type="button" className="dw-btn-mini" onClick={() => setDrilldownKey(null)}>
                  Close Drill-Down ✕
                </button>
              </div>
              <div className="dw-table-scroll" style={{ maxHeight: '300px' }}>
                <table className="dw-data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Full Name</th>
                      <th>Father Name</th>
                      <th>Class</th>
                      <th>Track</th>
                      <th>Locality</th>
                      <th>Exam %</th>
                      <th>Attendance %</th>
                      <th>Fee Balance</th>
                      <th>Risk Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilledStudents.slice(0, 50).map((s) => (
                      <tr key={s.student_id}>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#2563eb' }}>{s.student_id}</td>
                        <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                        <td>{s.father_name}</td>
                        <td>{s.base_class} ({s.section_name})</td>
                        <td>{s.subject_track}</td>
                        <td>{s.locality}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{s.avgExamPct}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.attendancePct}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: s.totalArrears > 0 ? '#dc2626' : '#059669' }}>
                          PKR {s.totalArrears.toLocaleString()}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: s.riskTier === 'Critical' || s.riskTier === 'High' ? '#fef2f2' : '#f0fdf4',
                              color: s.riskTier === 'Critical' || s.riskTier === 'High' ? '#dc2626' : '#059669'
                            }}
                          >
                            {s.riskTier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ACADEMIC TRACK & SUBJECT BOTTLENECK BI */}
      {activeSubView === 'academics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top: Grade Distribution & Top Merit Position Holders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Grade Distribution Histogram */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">Overall Grade Distribution Histogram</h3>
                  <p className="dw-panel-subtitle">BISE Faisalabad letter grade cohorts across 360 students</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', padding: '16px 0 8px', textAlign: 'center' }}>
                {[
                  { grade: 'A+', label: '90-100%', color: '#059669', bg: '#ecfdf5' },
                  { grade: 'A', label: '80-89%', color: '#10b981', bg: '#f0fdf4' },
                  { grade: 'B', label: '70-79%', color: '#2563eb', bg: '#eff6ff' },
                  { grade: 'C', label: '60-69%', color: '#d97706', bg: '#fffbeb' },
                  { grade: 'D', label: '50-59%', color: '#ea580c', bg: '#fff7ed' },
                  { grade: 'F', label: '< 50%', color: '#dc2626', bg: '#fef2f2' }
                ].map((item) => {
                  const count = gradeDistribution[item.grade] || 0;
                  const pct = ((count / student360.length) * 100).toFixed(1);
                  return (
                    <div key={item.grade} style={{ padding: '12px 6px', borderRadius: '8px', background: item.bg, border: `1px solid ${item.color}30` }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: item.color }}>{item.grade}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0f172a', margin: '4px 0' }}>
                        {count}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{pct}% ({item.label})</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Merit Position Holders Leaderboard */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">Top Merit Position Holders (Session 2025-2026)</h3>
                  <p className="dw-panel-subtitle">Highest composite examination averages across College &amp; School</p>
                </div>
              </div>
              <div className="dw-table-scroll" style={{ maxHeight: '220px' }}>
                <table className="dw-data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Class &amp; Track</th>
                      <th>Exam Mean %</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMeritStudents.map((s, idx) => (
                      <tr key={s.student_id}>
                        <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: idx < 3 ? '#0f172a' : '#64748b' }}>
                          #{idx + 1}
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.full_name} ({s.student_id})</td>
                        <td>{s.base_class} ({s.subject_track})</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#059669' }}>
                          {s.avgExamPct}%
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: '#ecfdf5', color: '#059669' }}>
                            {s.overallGrade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom: Subject Performance & Academic Track Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Subject Bottleneck Chart */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">BISE Subject Difficulty &amp; Failure Bottlenecks</h3>
                  <p className="dw-panel-subtitle">Ranked from lowest mean percentage (curriculum bottlenecks) to highest</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {subjectPerformance.map((sub) => (
                  <div key={sub.subject} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.84rem' }}>
                      <span>
                        <strong>{sub.subject}</strong> <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({sub.category})</span>
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                        Mean: {sub.avgPct}% • Pass: {sub.passRate}% • A+: {sub.distinctionRate}%
                      </span>
                    </div>
                    <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                      <div
                        style={{
                          width: `${Math.min(100, sub.avgPct)}%`,
                          background: sub.avgPct >= 75 ? '#10b981' : sub.avgPct >= 66 ? '#2563eb' : '#f59e0b'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Academic Track Comparison */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">BISE Faisalabad Academic Track Roll-Up</h3>
                  <p className="dw-panel-subtitle">Matric (Bio vs Comp) and Intermediate (Pre-Med vs Pre-Eng vs ICS)</p>
                </div>
              </div>
              <div className="dw-table-scroll">
                <table className="dw-data-table">
                  <thead>
                    <tr>
                      <th>Academic Track</th>
                      <th>Students</th>
                      <th>Mean Exam %</th>
                      <th>Attendance %</th>
                      <th>Arrears (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackComparison.map((tr) => (
                      <tr key={tr.trackLabel}>
                        <td style={{ fontWeight: 600 }}>{tr.trackLabel}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tr.students}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#2563eb' }}>{tr.avgExamPct}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tr.avgAttendancePct}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#dc2626' }}>{tr.arrears.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: FINANCIAL P&L & SECTION ROLL-UP */}
      {activeSubView === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Monthly P&L Statement */}
          <div className="dw-panel">
            <div className="dw-panel-header">
              <div>
                <h3 className="dw-panel-title">6-Month Institutional P&amp;L Fact Cube (`dw_fact_institutional_pnl`)</h3>
                <p className="dw-panel-subtitle">Monthly Tuition Revenue vs. Faculty Payroll &amp; Campus Operating Expenses (May 2026 – October 2026)</p>
              </div>
            </div>
            <div className="dw-table-scroll">
              <table className="dw-data-table">
                <thead>
                  <tr>
                    <th>Billing Month</th>
                    <th>Gross Fee Billed (PKR)</th>
                    <th>Scholarships (PKR)</th>
                    <th>Fee Revenue Collected (PKR)</th>
                    <th>Pending Receivables</th>
                    <th>Payroll + OpEx (PKR)</th>
                    <th>Net Surplus (PKR)</th>
                    <th>Operating Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPnL.map((m) => (
                    <tr key={m.month_label}>
                      <td style={{ fontWeight: 600 }}>{m.month_label}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{m.gross_fee_billed.toLocaleString()}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>{m.discount_scholarships.toLocaleString()}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#059669', fontWeight: 700 }}>
                        {m.fee_revenue_collected.toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#d97706' }}>
                        {m.uncollected_arrears.toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#dc2626' }}>
                        {m.total_expenses.toLocaleString()}
                      </td>
                      <td
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          color: m.net_operating_profit >= 0 ? '#059669' : '#dc2626'
                        }}
                      >
                        {m.net_operating_profit.toLocaleString()}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: m.profit_margin_pct >= 25 ? '#ecfdf5' : '#fffbeb',
                            color: m.profit_margin_pct >= 25 ? '#059669' : '#d97706'
                          }}
                        >
                          {m.profit_margin_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Class-wise Fee Recovery Bars & Section Roll-Up */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Class-wise Fee Recovery Progress */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">Class-wise Fee Recovery &amp; Arrears Breakdown</h3>
                  <p className="dw-panel-subtitle">Fee collection efficiency percentage per class cohort</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {classRollup.map((c) => (
                  <div key={c.base_class} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.84rem' }}>
                      <span style={{ fontWeight: 600 }}>{c.base_class} ({c.studentCount} students)</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: c.collectionPct >= 85 ? '#059669' : '#d97706' }}>
                        {c.collectionPct}% Collected • Pending: PKR {c.arrears.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, c.collectionPct)}%`,
                          height: '100%',
                          background: c.collectionPct >= 90 ? '#10b981' : c.collectionPct >= 80 ? '#2563eb' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Financial & Academic Roll-Up */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">Institutional Section Roll-Up (`sectionRollup`)</h3>
                  <p className="dw-panel-subtitle">Primary, Middle, Matric, and Intermediate performance matrix</p>
                </div>
              </div>
              <div className="dw-table-scroll">
                <table className="dw-data-table">
                  <thead>
                    <tr>
                      <th>Campus Section</th>
                      <th>Students</th>
                      <th>Mean Exam %</th>
                      <th>Collection Rate</th>
                      <th>Fee Arrears (PKR)</th>
                      <th>At-Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRollup.map((sec) => (
                      <tr key={sec.section_name}>
                        <td style={{ fontWeight: 600 }}>{sec.section_name}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{sec.studentCount}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{sec.avgExamPct}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#059669', fontWeight: 700 }}>{sec.collectionPct}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#dc2626' }}>
                          {sec.arrears.toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#dc2626' }}>
                          {sec.atRiskCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: STUDENT 360 EARLY WARNING RISK RADAR */}
      {activeSubView === 'risk360' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Risk Tier Distribution Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { tier: 'CRITICAL', count: student360.filter((s) => s.riskTier === 'Critical').length, desc: 'Score >= 60 | Immediate Principal Review', color: '#dc2626', bg: '#fef2f2' },
              { tier: 'HIGH', count: student360.filter((s) => s.riskTier === 'High').length, desc: 'Score 35-59 | Counselor & Parent Alert', color: '#ea580c', bg: '#fff7ed' },
              { tier: 'MODERATE', count: student360.filter((s) => s.riskTier === 'Moderate').length, desc: 'Score 18-34 | Academic Remedial Class', color: '#d97706', bg: '#fffbeb' },
              { tier: 'LOW', count: student360.filter((s) => s.riskTier === 'Low').length, desc: 'Score < 18 | Satisfactory Progress', color: '#059669', bg: '#ecfdf5' }
            ].map((r) => (
              <div key={r.tier} style={{ padding: '14px', borderRadius: '10px', background: r.bg, border: `1px solid ${r.color}35` }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: r.color, letterSpacing: '0.06em' }}>{r.tier} RISK</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#0f172a', margin: '4px 0' }}>
                  {r.count} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748b' }}>Students</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569' }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Diagnostic Indicators & Recommended Counselor Interventions */}
          <div className="dw-panel" style={{ background: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#0f172a' }}>
              Multi-Fact Risk Diagnostic Criteria &amp; Counselor Action Protocols
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.82rem' }}>1. Academic Failure Trigger (&lt; 50% Mean)</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Student enrolled in remedial tutorial sessions for Physics, Mathematics &amp; Chemistry. Bi-weekly progress review by Subject Head.
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#ea580c', fontSize: '0.82rem' }}>2. Chronic Absenteeism (&lt; 75% Attendance)</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Automated SMS &amp; telephonic call to guardian. Formal undertaking required before BISE board registration card issuance.
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#d97706', fontSize: '0.82rem' }}>3. Fee Default (&gt; 2 Months / &gt; PKR 8,000)</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Finance office counseling with installment plan options or need-based scholarship evaluation to prevent student dropout.
                </div>
              </div>
            </div>
          </div>

          {/* Table of At-Risk Students */}
          <div className="dw-panel">
            <div className="dw-panel-header">
              <div>
                <h3 className="dw-panel-title">Student 360° Early Warning &amp; Intervention Registry</h3>
                <p className="dw-panel-subtitle">
                  High-Priority Intervention Cohort ({atRiskStudents.length} students flagged across academics, attendance &amp; fee arrears)
                </p>
              </div>
            </div>

            <div className="dw-table-scroll">
              <table className="dw-data-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Class &amp; Track</th>
                    <th>Locality</th>
                    <th>Exam Mean %</th>
                    <th>Attendance %</th>
                    <th>Fee Arrears (PKR)</th>
                    <th>Risk Score</th>
                    <th>Risk Tier</th>
                    <th>Diagnostic Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {atRiskStudents.map((s) => (
                    <tr key={s.student_id}>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#2563eb' }}>{s.student_id}</td>
                      <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                      <td>{s.base_class} ({s.subject_track})</td>
                      <td>{s.locality}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: s.avgExamPct < 55 ? '#dc2626' : '#1e293b', fontWeight: 700 }}>
                        {s.avgExamPct}%
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: s.attendancePct < 78 ? '#dc2626' : '#1e293b', fontWeight: 700 }}>
                        {s.attendancePct}%
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', color: s.totalArrears > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                        {s.totalArrears.toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{s.riskScore} / 100</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            background: s.riskTier === 'Critical' ? '#fef2f2' : '#fffbeb',
                            color: s.riskTier === 'Critical' ? '#dc2626' : '#d97706',
                            border: `1px solid ${s.riskTier === 'Critical' ? '#fecaca' : '#fde68a'}`
                          }}
                        >
                          {s.riskTier}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.76rem', color: '#475569' }}>{s.riskReasons}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: ADMISSIONS CRM & LOCALITY FUNNEL */}
      {activeSubView === 'admissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Admissions KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="dw-kpi-card">
              <div className="dw-kpi-label">TOTAL WALK-IN INQUIRIES</div>
              <div className="dw-kpi-value">{kpis.totalInquiries}</div>
              <div className="dw-kpi-sub">Admissions CRM session 2026</div>
            </div>
            <div className="dw-kpi-card">
              <div className="dw-kpi-label">CONFIRMED ENROLLMENTS</div>
              <div className="dw-kpi-value" style={{ color: '#059669' }}>{kpis.confirmedInquiries}</div>
              <div className="dw-kpi-sub">Registered students in cohort</div>
            </div>
            <div className="dw-kpi-card">
              <div className="dw-kpi-label">INQUIRY CONVERSION RATE</div>
              <div className="dw-kpi-value">{kpis.inquiryConversionRate}%</div>
              <div className="dw-kpi-sub">Walk-in to fee deposition conversion</div>
            </div>
            <div className="dw-kpi-card">
              <div className="dw-kpi-label">PRIMARY CATCHMENT LOCALITIES</div>
              <div className="dw-kpi-value">{localityCatchment.length}</div>
              <div className="dw-kpi-sub">Faisalabad, Painsra, Gojra Rd, Dijkot</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Geographic Catchment Table */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">Faisalabad &amp; Painsra Geographic Catchment Analytics</h3>
                  <p className="dw-panel-subtitle">Enrollment, exam score, and fee collection performance by locality</p>
                </div>
              </div>
              <div className="dw-table-scroll">
                <table className="dw-data-table">
                  <thead>
                    <tr>
                      <th>Locality / Catchment</th>
                      <th>Students</th>
                      <th>Mean Exam %</th>
                      <th>Attendance %</th>
                      <th>Collected (PKR)</th>
                      <th>Arrears (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localityCatchment.map((loc) => (
                      <tr key={loc.locality}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{loc.locality}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{loc.students}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#2563eb' }}>{loc.avgExam}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{loc.avgAtt}%</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#059669', fontWeight: 700 }}>
                          {loc.totalPaid.toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: loc.totalArrears > 0 ? '#dc2626' : '#059669' }}>
                          {loc.totalArrears.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inquiry-to-Admission Conversion Funnel by Class */}
            <div className="dw-panel">
              <div className="dw-panel-header">
                <div>
                  <h3 className="dw-panel-title">Admissions Funnel by Class Cohort (`dw_fact_admissions_funnel`)</h3>
                  <p className="dw-panel-subtitle">Inquiries, confirmed admissions, and conversion efficiency</p>
                </div>
              </div>
              <div className="dw-table-scroll">
                <table className="dw-data-table">
                  <thead>
                    <tr>
                      <th>Class Cohort</th>
                      <th>Total Inquiries</th>
                      <th>Confirmed</th>
                      <th>Pending/Follow-up</th>
                      <th>Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissionsFunnelByClass.map((f) => (
                      <tr key={f.base_class}>
                        <td style={{ fontWeight: 600 }}>{f.base_class}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{f.totalInquiries}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#059669', fontWeight: 700 }}>{f.confirmed}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#d97706' }}>{f.pending}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: f.conversionRate >= 60 ? '#ecfdf5' : '#fffbeb',
                              color: f.conversionRate >= 60 ? '#059669' : '#d97706'
                            }}
                          >
                            {f.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
