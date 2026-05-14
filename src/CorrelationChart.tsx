// @ts-nocheck
import React, { useState, useMemo } from 'react';

interface HistoryPoint { date: string; value: any; }
interface Marker { name: string; unit?: string; history?: HistoryPoint[]; value?: any; }

interface Props {
  allMarkers: Marker[];
  userId?: string;
  plan?: string;
  profile?: any;
}

const SUGGESTED_PAIRS = [
  ['Estrogen', 'Total Testosterone'],
  ['Ferritin', 'Total Testosterone'],
  ['SHBG', 'Free Testosterone'],
  ['CRP', 'Ferritin'],
  ['Vitamin D', 'Total Testosterone'],
  ['HbA1c', 'SHBG'],
  ['Cortisol', 'Total Testosterone'],
  ['TSH', 'Ferritin'],
  ['ApoB', 'HbA1c'],
  ['Free T3', 'Ferritin'],
];

export default function CorrelationChart({ allMarkers, userId, plan, profile }: Props) {
  const [markerA, setMarkerA] = useState('');
  const [markerB, setMarkerB] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markersWithHistory = useMemo(() =>
    allMarkers.filter(m => m.history && m.history.length > 1),
    [allMarkers]
  );

  const profileCtx = profile ? [
    profile.biological_sex && `sex: ${profile.biological_sex}`,
    profile.birth_year && `age: ${new Date().getFullYear() - profile.birth_year}`,
    profile.goal && `goal: ${profile.goal}`,
  ].filter(Boolean).join(', ') : '';

  const suggestedPairs = SUGGESTED_PAIRS.filter(([a, b]) =>
    markersWithHistory.find(m => m.name === a) && markersWithHistory.find(m => m.name === b)
  ).slice(0, 4);

  const analyze = async (a?: string, b?: string) => {
    const mA = a || markerA;
    const mB = b || markerB;
    if (!mA || !mB || mA === mB) return;
    const markerObjA = allMarkers.find(m => m.name === mA);
    const markerObjB = allMarkers.find(m => m.name === mB);
    if (!markerObjA) return;
    setLoading(true); setAnalysis(null); setError(null);
    try {
      const res = await fetch('/api/correlate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, plan, markerA: mA, markerB: mB,
          historyA: markerObjA.history || [{ date: '', value: markerObjA.value }],
          historyB: markerObjB?.history || [],
          profileCtx,
          units: { a: markerObjA.unit ? ' ' + markerObjA.unit : '', b: markerObjB?.unit ? ' ' + markerObjB.unit : '' },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || 'Analysis failed'); }
      else { setAnalysis(data.analysis); setTimeline(data.timeline || []); }
    } catch { setError('Analysis unavailable — please try again.'); }
    setLoading(false);
  };

  // Dual-axis chart
  const renderChart = () => {
    if (!timeline.length) return null;
    const aVals = timeline.map(r => parseFloat(r.a)).filter(n => !isNaN(n));
    const bVals = timeline.map(r => parseFloat(r.b)).filter(n => !isNaN(n));
    if (!aVals.length) return null;

    const W = 560, H = 140, PX = 24, PY = 20;
    const aMin = Math.min(...aVals) * 0.9, aMax = Math.max(...aVals) * 1.1;
    const bMin = bVals.length ? Math.min(...bVals) * 0.9 : 0;
    const bMax = bVals.length ? Math.max(...bVals) * 1.1 : 1;

    const px = (i: number) => PX + (i / Math.max(timeline.length - 1, 1)) * (W - PX * 2);
    const pyA = (v: number) => H - PY - ((v - aMin) / ((aMax - aMin) || 1)) * (H - PY * 2);
    const pyB = (v: number) => H - PY - ((v - bMin) / ((bMax - bMin) || 1)) * (H - PY * 2);

    const ptsA = timeline.map((r, i) => parseFloat(r.a) ? `${px(i)},${pyA(parseFloat(r.a))}` : null).filter(Boolean).join(' ');
    const ptsB = timeline.map((r, i) => parseFloat(r.b) ? `${px(i)},${pyB(parseFloat(r.b))}` : null).filter(Boolean).join(' ');

    return (
      <div style={{ background: 'rgba(0,6,14,.5)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8, padding: '12px 8px 6px', marginBottom: 14 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
          {ptsA && <polyline points={ptsA} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          {ptsB && <polyline points={ptsB} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />}
          {timeline.map((r, i) => (
            <g key={i}>
              {parseFloat(r.a) && <circle cx={px(i)} cy={pyA(parseFloat(r.a))} r="3" fill="#34d399" />}
              {parseFloat(r.b) && <circle cx={px(i)} cy={pyB(parseFloat(r.b))} r="3" fill="#f87171" />}
              <text x={px(i)} y={H - 2} textAnchor="middle" fontSize="8" fill="rgba(0,210,165,.4)" fontFamily="inherit">{r.month}</text>
            </g>
          ))}
        </svg>
        <div style={{ display: 'flex', gap: 20, padding: '6px 12px 0', fontSize: 12 }}>
          <span style={{ color: '#34d399' }}>— {markerA || 'Marker A'}</span>
          <span style={{ color: '#f87171' }}>- - {markerB || 'Marker B'}</span>
          <span style={{ marginLeft: 'auto', color: 'rgba(0,210,165,.4)' }}>Dual-axis normalized</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
        Multi-Marker Correlation
      </div>
      <p style={{ fontSize: 14, color: 'rgba(0,210,165,.65)', marginBottom: 20, lineHeight: 1.6 }}>
        Select two markers to overlay their timelines and see how they interact biologically.
      </p>

      {/* Suggested pairs */}
      {suggestedPairs.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'rgba(0,210,165,.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Suggested pairs</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestedPairs.map(([a, b]) => (
              <button key={`${a}-${b}`} onClick={() => { setMarkerA(a); setMarkerB(b); analyze(a, b); }}
                style={{ fontSize: 13, padding: '6px 12px', background: 'rgba(0,210,165,.06)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 5, color: 'rgba(0,225,180,.85)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                {a} × {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 18 }}>
        <select value={markerA} onChange={e => setMarkerA(e.target.value)}
          style={{ fontSize: 14, padding: '10px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 6, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit' }}>
          <option value="">Select marker A</option>
          {markersWithHistory.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
        </select>
        <select value={markerB} onChange={e => setMarkerB(e.target.value)}
          style={{ fontSize: 14, padding: '10px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 6, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit' }}>
          <option value="">Select marker B</option>
          {markersWithHistory.filter(m => m.name !== markerA).map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
        </select>
        <button onClick={() => analyze()} disabled={!markerA || !markerB || loading}
          style={{ fontSize: 14, padding: '10px 18px', background: 'rgba(0,225,180,.12)', border: '1px solid rgba(0,225,180,.4)', borderRadius: 6, color: 'rgba(0,240,190,1)', cursor: 'pointer', fontFamily: 'inherit', opacity: (!markerA || !markerB) ? 0.4 : 1 }}>
          {loading ? '…' : 'Analyze'}
        </button>
      </div>

      {renderChart()}

      {loading && (
        <div style={{ padding: '16px', fontSize: 14, color: 'rgba(0,210,165,.65)', fontStyle: 'italic' }}>
          Aellux is reading the relationship between {markerA} and {markerB}…
        </div>
      )}
      {error && <div style={{ padding: '12px', color: 'rgba(255,150,100,.9)', fontSize: 14 }}>{error}</div>}
      {analysis && (
        <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.6)', border: '1px solid rgba(0,210,165,.2)', borderLeft: '3px solid rgba(0,225,180,.6)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(0,210,165,.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            {markerA} × {markerB} — Biological Relationship
          </div>
          <p style={{ fontSize: 16, color: 'rgba(220,255,235,.95)', lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{analysis}</p>
        </div>
      )}
    </div>
  );
}
