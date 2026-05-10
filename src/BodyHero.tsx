import React, { useState } from 'react';

interface Category {
  id: string;
  label: string;
  color: string;
  glow: string;
  cx: number; cy: number; r: number;
  description: string;
}

const CATEGORIES: Category[] = [
  { id: 'hormonal',       label: 'Hormonal',       color: '#a78bfa', glow: 'rgba(167,139,250,0.6)', cx: 50,  cy: 22,  r: 9,  description: 'Testosterone, Estrogen, Thyroid hormones and more. These chemical messengers regulate energy, mood, metabolism, and reproductive health.' },
  { id: 'cardiovascular', label: 'Cardiovascular',  color: '#f87171', glow: 'rgba(248,113,113,0.6)', cx: 50,  cy: 38,  r: 10, description: 'Heart health markers including ApoB, LDL, HDL, and CRP. Cardiovascular biomarkers predict risk of heart disease and stroke decades in advance.' },
  { id: 'metabolic',      label: 'Metabolic',       color: '#fb923c', glow: 'rgba(251,146,60,0.6)',  cx: 50,  cy: 52,  r: 9,  description: 'Blood sugar, insulin sensitivity, and energy metabolism. Metabolic dysfunction underlies most chronic disease and aging acceleration.' },
  { id: 'inflammatory',   label: 'Inflammatory',    color: '#f59e0b', glow: 'rgba(245,158,11,0.6)',  cx: 32,  cy: 45,  r: 7,  description: 'Systemic inflammation markers like CRP, IL-6, and fibrinogen. Chronic low-grade inflammation drives aging and most modern disease.' },
  { id: 'nutritional',    label: 'Nutritional',     color: '#34d399', glow: 'rgba(52,211,153,0.6)',  cx: 68,  cy: 45,  r: 7,  description: 'Vitamins, minerals, and essential nutrients. Deficiencies are common, often silent, and profoundly impact energy, immunity, and cognition.' },
  { id: 'fitness',        label: 'Fitness',          color: '#38bdf8', glow: 'rgba(56,189,248,0.6)',  cx: 50,  cy: 72,  r: 10, description: 'VO2 max, strength markers, and physical performance data. Fitness is the single strongest predictor of longevity and healthspan.' },
  { id: 'other',          label: 'Other',            color: '#94a3b8', glow: 'rgba(148,163,184,0.5)', cx: 50,  cy: 88,  r: 6,  description: 'Additional biomarkers including sleep quality, gut health, immune function, and specialized lab values.' },
];

interface Props {
  personalised: Record<string, any>;
  onCategoryClick?: (id: string) => void;
}

export default function BodyHero({ personalised, onCategoryClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const activeId = selected || hovered;
  const activeCat = CATEGORIES.find(c => c.id === activeId);

  // Count biomarkers by category
  const counts: Record<string, number> = {};
  Object.entries(personalised || {}).forEach(([key, val]: [string, any]) => {
    const cat = (val?.category || 'other').toLowerCase();
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '28px 0 20px', maxWidth: 900 }}>
      {/* Body SVG */}
      <div style={{ position: 'relative', flexShrink: 0, width: 220 }}>
        <svg viewBox="0 0 100 100" width="220" height="220" style={{ display: 'block' }}>
          {/* Glow filters */}
          <defs>
            {CATEGORIES.map(cat => (
              <filter key={cat.id} id={`glow-${cat.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            ))}
          </defs>

          {/* Human body silhouette */}
          <ellipse cx="50" cy="10" rx="6.5" ry="7.5" fill="rgba(0,210,165,0.08)" stroke="rgba(0,210,165,0.25)" strokeWidth="0.8"/>
          <line x1="50" y1="17" x2="50" y2="58" stroke="rgba(0,210,165,0.2)" strokeWidth="0.8"/>
          <line x1="50" y1="25" x2="30" y2="42" stroke="rgba(0,210,165,0.2)" strokeWidth="0.8"/>
          <line x1="50" y1="25" x2="70" y2="42" stroke="rgba(0,210,165,0.2)" strokeWidth="0.8"/>
          <path d="M 42 58 Q 40 72 38 86 Q 37 90 39 92" stroke="rgba(0,210,165,0.2)" strokeWidth="0.8" fill="none"/>
          <path d="M 58 58 Q 60 72 62 86 Q 63 90 61 92" stroke="rgba(0,210,165,0.2)" strokeWidth="0.8" fill="none"/>
          <path d="M 42 58 Q 50 62 58 58" stroke="rgba(0,210,165,0.2)" strokeWidth="0.8" fill="none"/>

          {/* Category nodes */}
          {CATEGORIES.map(cat => {
            const isActive = activeId === cat.id;
            const count = counts[cat.id] || 0;
            return (
              <g key={cat.id} style={{ cursor: 'pointer' }}
                onClick={() => { setSelected(selected === cat.id ? null : cat.id); onCategoryClick?.(cat.id); }}
                onMouseEnter={() => setHovered(cat.id)}
                onMouseLeave={() => setHovered(null)}>
                {/* Outer glow ring */}
                <circle cx={cat.cx} cy={cat.cy} r={cat.r + (isActive ? 4 : 2)}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 0.8 : 0.3}
                />
                {/* Main dot */}
                <circle cx={cat.cx} cy={cat.cy} r={cat.r - 1}
                  fill={isActive ? cat.color : 'rgba(2,15,25,0.8)'}
                  stroke={cat.color}
                  strokeWidth={isActive ? 1.5 : 1}
                  opacity={isActive ? 1 : 0.6}
                />
                {/* Count badge */}
                {count > 0 && (
                  <text x={cat.cx} y={cat.cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize="3.5" fill={isActive ? '#020f19' : cat.color} fontFamily="Georgia,serif" fontWeight="600">
                    {count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Category list + description */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: 'rgba(0,210,165,.5)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Health Overview</h2>
          <p style={{ color: activeCat ? activeCat.color : 'rgba(0,210,165,.6)', fontSize: 14, fontFamily: 'Georgia,serif', margin: '0 0 6px', transition: 'color 0.2s' }}>
            {activeCat ? activeCat.label : 'Select a system to learn more'}
          </p>
          <p style={{ color: 'rgba(0,210,165,.55)', fontSize: 13, lineHeight: 1.65, margin: 0, minHeight: 52, transition: 'opacity 0.2s' }}>
            {activeCat ? activeCat.description : 'Your biology mapped across 7 systems. Tap any glowing node to understand what each biomarker category means for your health.'}
          </p>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(cat => {
            const count = counts[cat.id] || 0;
            const isActive = activeId === cat.id;
            return (
              <button key={cat.id}
                onClick={() => setSelected(selected === cat.id ? null : cat.id)}
                onMouseEnter={() => setHovered(cat.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px',
                  background: isActive ? `${cat.color}18` : 'rgba(0,210,165,.05)',
                  border: `1px solid ${isActive ? cat.color : 'rgba(0,210,165,.15)'}`,
                  borderRadius: 20, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color, flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                <span style={{ fontSize: 11, color: isActive ? cat.color : 'rgba(0,210,165,.65)', letterSpacing: '0.05em', fontFamily: 'inherit' }}>
                  {cat.label}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 10, color: isActive ? cat.color : 'rgba(0,210,165,.4)', marginLeft: 2 }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
