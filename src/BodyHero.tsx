// @ts-nocheck
import React, { useState } from 'react';

const CATS = [
  { id: 'hormonal',       label: 'Hormonal',       color: '#7c3aed', cx: 50, cy: 18, r: 8,  description: 'Testosterone, estrogen, thyroid and cortisol regulate energy, mood, metabolism and reproductive function.', impact: 'Energy, mood, weight, libido, sleep' },
  { id: 'cardiovascular', label: 'Cardiovascular',  color: '#dc2626', cx: 50, cy: 36, r: 9,  description: 'ApoB, LDL, HDL and Lp(a) are cardiovascular markers. Heart disease kills more people than any other cause — risk is detectable decades in advance.', impact: 'Heart attack, stroke, longevity' },
  { id: 'metabolic',      label: 'Metabolic',       color: '#ea580c', cx: 50, cy: 52, r: 8,  description: 'Glucose, insulin and HbA1c track metabolic health. Insulin resistance underlies obesity, type 2 diabetes, and much of cardiovascular disease.', impact: 'Weight, energy, diabetes risk, aging' },
  { id: 'inflammatory',   label: 'Inflammatory',    color: '#d97706', cx: 30, cy: 42, r: 7,  description: 'CRP, IL-6 and fibrinogen measure inflammation. Chronic low-grade inflammation silently accelerates every major disease of aging.', impact: 'Pain, disease risk, brain fog, aging speed' },
  { id: 'nutritional',    label: 'Nutritional',     color: '#166534', cx: 70, cy: 42, r: 7,  description: 'Vitamin D, B12, magnesium, iron and zinc. Deficiencies are extremely common and often invisible — yet profoundly affect cognition, immunity and energy.', impact: 'Energy, immunity, cognition, bone health' },
  { id: 'fitness',        label: 'Fitness',          color: '#0369a1', cx: 50, cy: 70, r: 9,  description: 'VO2 max, resting heart rate and HRV from wearables. Cardiorespiratory fitness is the single strongest predictor of mortality.', impact: 'Longevity, performance, mental health' },
  { id: 'other',          label: 'Other',            color: '#64748b', cx: 50, cy: 87, r: 5,  description: 'Gut microbiome, sleep quality, immune panels, heavy metals and specialized markers.', impact: 'Varies by marker' },
];

// Map marker category strings to our category IDs
function categorise(cat: string): string {
  const c = (cat || '').toLowerCase();
  if (c.includes('hormon') || c.includes('thyroid') || c.includes('sex') || c.includes('reproduct')) return 'hormonal';
  if (c.includes('cardio') || c.includes('heart') || c.includes('lipid') || c.includes('vascular')) return 'cardiovascular';
  if (c.includes('metabol') || c.includes('glucose') || c.includes('insulin') || c.includes('diabetes')) return 'metabolic';
  if (c.includes('inflam') || c.includes('immune') || c.includes('crp') || c.includes('cytokine')) return 'inflammatory';
  if (c.includes('nutri') || c.includes('vitamin') || c.includes('mineral') || c.includes('micronutri')) return 'nutritional';
  if (c.includes('fitness') || c.includes('vo2') || c.includes('hrv') || c.includes('activity') || c.includes('sport')) return 'fitness';
  return 'other';
}

interface Props { markers?: any[]; }

export default function BodyHero({ markers = [] }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const cat = CATS.find(c => c.id === active);

  // Count markers per category from actual marker data
  const counts: Record<string, number> = {};
  markers.forEach((m: any) => {
    const k = categorise(m.category || m.type || '');
    counts[k] = (counts[k] || 0) + 1;
  });
  const total = markers.length;
  const systemsWithData = Object.keys(counts).filter(k => counts[k] > 0).length;

  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', paddingBottom: 24, borderBottom: '1px solid var(--border-subtle)', marginBottom: 24, flexWrap: 'wrap' }}>
      {/* SVG body map */}
      <div style={{ flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" width={180} height={180} style={{ display: 'block', overflow: 'visible' }}>
          {/* Body outline */}
          <ellipse cx="50" cy="9" rx="6" ry="7" fill="none" stroke="var(--border-medium)" strokeWidth="0.8"/>
          <path d="M44,16 C40,20 38,28 38,36 L37,55 C37,55 42,58 50,58 C58,58 63,55 63,55 L62,36 C62,28 60,20 56,16 Z" fill="none" stroke="var(--border-medium)" strokeWidth="0.8"/>
          <path d="M38,20 L28,38 L31,40 L40,25" fill="none" stroke="var(--border-medium)" strokeWidth="0.8"/>
          <path d="M62,20 L72,38 L69,40 L60,25" fill="none" stroke="var(--border-medium)" strokeWidth="0.8"/>
          <path d="M42,58 L40,80 L38,95" fill="none" stroke="var(--border-medium)" strokeWidth="0.8"/>
          <path d="M58,58 L60,80 L62,95" fill="none" stroke="var(--border-medium)" strokeWidth="0.8"/>
          {CATS.map(c => {
            const on = active === c.id;
            const cnt = counts[c.id] || 0;
            const hasData = cnt > 0;
            return (
              <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => setActive(active === c.id ? null : c.id)}>
                {on && <circle cx={c.cx} cy={c.cy} r={c.r + 5} fill={c.color} opacity={0.12}/>}
                <circle cx={c.cx} cy={c.cy} r={c.r + 2} fill="none" stroke={c.color} strokeWidth={on ? 1.5 : hasData ? 0.8 : 0.4} opacity={on ? 1 : hasData ? 0.6 : 0.25}/>
                <circle cx={c.cx} cy={c.cy} r={c.r - 1} fill={on ? c.color : hasData ? `${c.color}22` : 'var(--bg-sunken)'} stroke={c.color} strokeWidth={on ? 1.5 : 1} opacity={on ? 1 : hasData ? 0.8 : 0.35}/>
                {hasData && <text x={c.cx} y={c.cy + 1.2} textAnchor="middle" dominantBaseline="middle" fontSize="3.8" fill={on ? '#fff' : c.color} fontFamily="inherit" fontWeight="700">{cnt}</text>}
              </g>
            );
          })}
        </svg>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Tap to explore</div>
      </div>

      {/* Info panel */}
      <div style={{ flex: 1, minWidth: 200, paddingTop: 4 }}>
        {cat ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }}/>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>{cat.label}</span>
              {counts[cat.id] > 0 && <span style={{ fontSize: 12, color: cat.color, fontWeight: 600, background: `${cat.color}15`, padding: '2px 8px', borderRadius: 10 }}>{counts[cat.id]} markers</span>}
            </div>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 14px' }}>{cat.description}</p>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.06em', marginBottom: 16 }}>
              AFFECTS: <span style={{ color: cat.color, fontWeight: 500 }}>{cat.impact}</span>
            </div>
            <button onClick={() => setActive(null)} style={{ fontSize: 13, color: 'var(--brand-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>← back to overview</button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 400 }}>Your Biology at a Glance</div>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 16px' }}>
              {total > 0
                ? `${total} biomarkers tracked across ${systemsWithData} system${systemsWithData !== 1 ? 's' : ''}. Tap any node to understand what it means for your health.`
                : 'Upload your health records to see your biology mapped across all systems.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {CATS.map(c => {
                const cnt = counts[c.id] || 0;
                return (
                  <button key={c.id} onClick={() => setActive(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: cnt > 0 ? `${c.color}10` : 'transparent', border: `1px solid ${cnt > 0 ? c.color + '40' : 'var(--border-subtle)'}`, borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, opacity: cnt > 0 ? 1 : 0.3, flexShrink: 0 }}/>
                    <span style={{ fontSize: 13, color: cnt > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: cnt > 0 ? 500 : 400 }}>{c.label}</span>
                    {cnt > 0 && <span style={{ fontSize: 12, color: c.color, fontWeight: 700 }}>{cnt}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
