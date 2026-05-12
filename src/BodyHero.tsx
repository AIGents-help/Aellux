import React, { useState } from 'react';

interface Category {
  id: string; label: string; color: string;
  cx: number; cy: number; r: number;
  description: string; impact: string;
}

const CATS: Category[] = [
  { id: 'hormonal',       label: 'Hormonal',       color: '#a78bfa', cx: 50,  cy: 18,  r: 8,  description: 'Testosterone, estrogen, thyroid and cortisol regulate energy, mood, metabolism and reproductive function.', impact: 'Energy, mood, weight, libido, sleep' },
  { id: 'cardiovascular', label: 'Cardiovascular',  color: '#f87171', cx: 50,  cy: 36,  r: 9,  description: 'ApoB, LDL, HDL and Lp(a) are cardiovascular markers. Heart disease kills more people than any other cause -- risk is detectable decades in advance.', impact: 'Heart attack, stroke, longevity' },
  { id: 'metabolic',      label: 'Metabolic',       color: '#fb923c', cx: 50,  cy: 52,  r: 8,  description: 'Glucose, insulin and HbA1c track metabolic health. Insulin resistance underlies obesity, type 2 diabetes, and much of cardiovascular disease.', impact: 'Weight, energy, diabetes risk, aging' },
  { id: 'inflammatory',   label: 'Inflammatory',    color: '#f59e0b', cx: 30,  cy: 42,  r: 7,  description: 'CRP, IL-6 and fibrinogen measure inflammation. Chronic low-grade inflammation silently accelerates every major disease of aging.', impact: 'Pain, disease risk, brain fog, aging speed' },
  { id: 'nutritional',    label: 'Nutritional',     color: '#34d399', cx: 70,  cy: 42,  r: 7,  description: 'Vitamin D, B12, magnesium, iron and zinc. Deficiencies are extremely common and often invisible -- yet profoundly affect cognition, immunity and energy.', impact: 'Energy, immunity, cognition, bone health' },
  { id: 'fitness',        label: 'Fitness',          color: '#38bdf8', cx: 50,  cy: 70,  r: 9,  description: 'VO2 max, resting heart rate and HRV from wearables. Cardiorespiratory fitness is the single strongest predictor of mortality.', impact: 'Longevity, performance, mental health' },
  { id: 'other',          label: 'Other',            color: '#94a3b8', cx: 50,  cy: 87,  r: 5,  description: 'Gut microbiome, sleep quality, immune panels, heavy metals and specialized markers.', impact: 'Varies by marker' },
];

interface Props { personalised: Record<string, any>; }

export default function BodyHero({ personalised }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const cat = CATS.find(c => c.id === active);

  const counts: Record<string, number> = {};
  Object.values(personalised || {}).forEach((v: any) => {
    const k = (v?.category || 'other').toLowerCase();
    counts[k] = (counts[k] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', paddingBottom: 24, borderBottom: '1px solid rgba(0,210,165,.1)', marginBottom: 24 }}>
      <div style={{ flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" width={190} height={190} style={{ display: 'block', overflow: 'visible' }}>
          <ellipse cx="50" cy="9" rx="6" ry="7" fill="none" stroke="rgba(0,210,165,0.18)" strokeWidth="0.7"/>
          <path d="M44,16 C40,20 38,28 38,36 L37,55 C37,55 42,58 50,58 C58,58 63,55 63,55 L62,36 C62,28 60,20 56,16 Z" fill="none" stroke="rgba(0,210,165,0.18)" strokeWidth="0.7"/>
          <path d="M38,20 L28,38 L31,40 L40,25" fill="none" stroke="rgba(0,210,165,0.18)" strokeWidth="0.7"/>
          <path d="M62,20 L72,38 L69,40 L60,25" fill="none" stroke="rgba(0,210,165,0.18)" strokeWidth="0.7"/>
          <path d="M42,58 L40,80 L38,95" fill="none" stroke="rgba(0,210,165,0.18)" strokeWidth="0.7"/>
          <path d="M58,58 L60,80 L62,95" fill="none" stroke="rgba(0,210,165,0.18)" strokeWidth="0.7"/>
          {CATS.map(c => {
            const on = active === c.id;
            const cnt = counts[c.id] || 0;
            return (
              <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => setActive(active === c.id ? null : c.id)}>
                {on && <circle cx={c.cx} cy={c.cy} r={c.r + 5} fill={c.color} opacity={0.08}/>}
                <circle cx={c.cx} cy={c.cy} r={c.r + 2} fill="none" stroke={c.color} strokeWidth={on ? 1.2 : 0.4} opacity={on ? 0.9 : 0.35}/>
                <circle cx={c.cx} cy={c.cy} r={c.r - 1} fill={on ? c.color : 'rgba(2,15,25,0.85)'} stroke={c.color} strokeWidth={on ? 1.5 : 0.8} opacity={on ? 1 : 0.55}/>
                {cnt > 0 && <text x={c.cx} y={c.cy + 1.2} textAnchor="middle" dominantBaseline="middle" fontSize="3.8" fill={on ? '#020f19' : c.color} fontFamily="Georgia,serif" fontWeight="700">{cnt}</text>}
              </g>
            );
          })}
        </svg>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(0,210,165,.5)', letterSpacing: '0.1em', marginTop: 4 }}>TAP TO EXPLORE</div>
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        {cat ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }}/>
              <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: cat.color }}>{cat.label}</span>
              {counts[cat.id] > 0 && <span style={{ fontSize: 13, color: 'rgba(0,210,165,.7)', letterSpacing: '0.06em' }}>{counts[cat.id]} markers tracked</span>}
            </div>
            <p style={{ fontSize: 15, color: 'rgba(0,210,165,.88)', lineHeight: 1.7, margin: '0 0 14px' }}>{cat.description}</p>
            <div style={{ fontSize: 13, color: 'rgba(0,210,165,.65)', letterSpacing: '0.06em' }}>AFFECTS: <span style={{ color: cat.color, opacity: 0.9 }}>{cat.impact}</span></div>
            <button onClick={() => setActive(null)} style={{ marginTop: 16, fontSize: 13, color: 'rgba(0,210,165,.6)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', padding: 0 }}>← back to overview</button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 22, color: 'rgba(0,230,185,.95)', marginBottom: 10, fontWeight: 500 }}>Your Biology at a Glance</div>
            <p style={{ fontSize: 15, color: 'rgba(0,210,165,.82)', lineHeight: 1.7, margin: '0 0 16px' }}>
              {total > 0 ? total + ' biomarkers tracked across ' + Object.keys(counts).filter(k => counts[k] > 0).length + ' systems. Tap any node to understand what it means for your health.' : 'Upload your health records to see your biology mapped across all systems.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATS.map(c => (
                <button key={c.id} onClick={() => setActive(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 20, cursor: 'pointer' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, opacity: 0.7, flexShrink: 0 }}/>
                  <span style={{ fontSize: 13, color: 'rgba(0,210,165,.85)', letterSpacing: '0.04em' }}>{c.label}</span>
                  {counts[c.id] > 0 && <span style={{ fontSize: 12, color: c.color, opacity: 0.85 }}>{counts[c.id]}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
