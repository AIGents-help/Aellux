// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Props { userId?: string; chronologicalAge?: number; currentBioAge?: string; }

export default function BiologicalAgeChart({ userId, chronologicalAge, currentBioAge }: Props) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/bio-age-track?userId=${userId}`)
      .then(r => r.json())
      .then(d => { setHistory(d.history || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) return null;
  if (history.length < 2 && !currentBioAge) return null;

  const all = currentBioAge
    ? [...history, { biological_age: parseFloat(currentBioAge), created_at: new Date().toISOString(), chronological_age: chronologicalAge }]
    : history;

  if (all.length < 1) return null;

  const bioAges = all.map(r => parseFloat(r.biological_age));
  const minAge = Math.min(...bioAges, chronologicalAge || Infinity) - 3;
  const maxAge = Math.max(...bioAges, chronologicalAge || 0) + 3;

  const W = 560, H = 120, PX = 24, PY = 16;
  const px = (i: number) => PX + (i / Math.max(all.length - 1, 1)) * (W - PX * 2);
  const py = (v: number) => H - PY - ((v - minAge) / ((maxAge - minAge) || 1)) * (H - PY * 2);

  const pts = all.map((r, i) => `${px(i)},${py(parseFloat(r.biological_age))}`).join(' ');
  const chronoPts = all.map((r, i) => `${px(i)},${py(r.chronological_age || chronologicalAge || 0)}`).join(' ');

  const latestBio = bioAges[bioAges.length - 1];
  const gap = chronologicalAge ? latestBio - chronologicalAge : null;
  const gapColor = gap === null ? 'var(--accent-optimal)' : gap < -2 ? 'var(--accent-optimal)' : gap > 2 ? 'var(--accent-elevated)' : 'var(--accent-watch)';
  const gapLabel = gap === null ? '' : gap < 0 ? `${Math.abs(gap).toFixed(1)} years younger` : gap > 0 ? `${gap.toFixed(1)} years older` : 'Exact chronological age';

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Biological Age Trajectory</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>How your cellular age is moving over time</div>
        </div>
        {gap !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 32, color: gapColor, fontWeight: 500 }}>{latestBio.toFixed(1)}</div>
            <div style={{ fontSize: 13, color: gapColor }}>{gapLabel} than calendar age</div>
          </div>
        )}
      </div>

      {all.length > 1 ? (
        <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 8px 6px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
            {/* Chronological age reference line */}
            {chronologicalAge && (
              <>
                <polyline points={chronoPts} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" strokeDasharray="5,4" />
                <text x={W - PX + 2} y={py(chronologicalAge) + 4} fontSize="9" fill="rgba(255,255,255,.25)" fontFamily="inherit">Calendar</text>
              </>
            )}
            {/* Bio age line */}
            <polyline points={pts} fill="none" stroke={gapColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {all.map((r, i) => (
              <g key={i}>
                <circle cx={px(i)} cy={py(parseFloat(r.biological_age))} r="4" fill={gapColor} stroke="var(--bg-surface)" strokeWidth="2" />
                <text x={px(i)} y={py(parseFloat(r.biological_age)) - 10} textAnchor="middle" fontSize="10" fill={gapColor} fontFamily="inherit" fontWeight="600">
                  {parseFloat(r.biological_age).toFixed(1)}
                </text>
                <text x={px(i)} y={H - 2} textAnchor="middle" fontSize="8" fill="var(--text-tertiary)" fontFamily="inherit">
                  {formatDate(r.created_at)}
                </text>
              </g>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 20, padding: '4px 12px 0', fontSize: 12 }}>
            <span style={{ color: gapColor }}>— Biological age</span>
            {chronologicalAge && <span style={{ color: 'rgba(255,255,255,.25)' }}>- - Calendar age ({chronologicalAge})</span>}
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
          Generate your Biologic Synthesis again to add another data point. Once you have 2+ readings, your biological age trajectory will appear here.
        </div>
      )}
    </div>
  );
}
