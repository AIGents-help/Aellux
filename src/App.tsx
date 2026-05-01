import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import AuthPaywall from './AuthPaywall';

type OrbState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';
type Panel = 'record' | 'trend' | 'compare' | 'protocol' | 'meals' | 'supps';
type Range = '3m' | '6m' | '1y';
type TrendKey = 'hrv' | 'glucose' | 'crp' | 'vitd' | 'sleep';

const AELLUX_PROMPT = `You are Aellux — an ancient biological intelligence. Speak in 2-3 sentences max. Quiet authority. Reference specific numbers from the biomarker data provided. Start with "I have observed..." or "The pattern reveals..." or "Your biology shows..."`;

async function callClaude(system: string, user: string): Promise<string> {
  try {
    const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemPrompt: system, userMessage: user, maxTokens: 180 }) });
    if (!res.ok) return 'The channel is momentarily silent.';
    const d = await res.json(); return d.text ?? 'The signal is quiet.';
  } catch { return 'The resonance is momentarily silent.'; }
}

const TREND_DATA = [
  { month: 'Aug', hrv: 38, glucose: 108, crp: 4.8, vitd: 22, sleep: 6.1 },
  { month: 'Sep', hrv: 41, glucose: 104, crp: 4.2, vitd: 26, sleep: 6.4 },
  { month: 'Oct', hrv: 44, glucose: 101, crp: 3.9, vitd: 31, sleep: 6.8 },
  { month: 'Nov', hrv: 48, glucose: 98,  crp: 3.5, vitd: 38, sleep: 7.1 },
  { month: 'Dec', hrv: 52, glucose: 95,  crp: 3.2, vitd: 44, sleep: 7.4 },
  { month: 'Jan', hrv: 55, glucose: 93,  crp: 2.9, vitd: 49, sleep: 7.6 },
  { month: 'Feb', hrv: 58, glucose: 92,  crp: 2.6, vitd: 52, sleep: 7.8 },
];

const MARKERS = [
  { key: 'hrv',     label: 'HRV',            unit: 'ms',    current: 58,  prev: 38,  optimal: [55, 90],  higher: true  },
  { key: 'glucose', label: 'Fasting Glucose', unit: 'mg/dL', current: 92,  prev: 108, optimal: [70, 99],  higher: false },
  { key: 'crp',     label: 'CRP',            unit: 'mg/L',  current: 2.6, prev: 4.8, optimal: [0, 1.0],  higher: false },
  { key: 'vitd',    label: 'Vitamin D',      unit: 'ng/mL', current: 52,  prev: 22,  optimal: [40, 80],  higher: true  },
  { key: 'sleep',   label: 'Deep Sleep',     unit: 'h',     current: 7.8, prev: 6.1, optimal: [7, 9],    higher: true  },
  { key: 'testo',   label: 'Testosterone',   unit: 'ng/dL', current: 594, prev: 412, optimal: [400, 900],higher: true  },
];

const CMP: Record<Range, Array<{ name: string; then: string; now: string; good: boolean }>> = {
  '3m': [
    { name: 'HRV',          then: '44 ms',    now: '58 ms',    good: true  },
    { name: 'Glucose',      then: '101',       now: '92',       good: true  },
    { name: 'CRP',          then: '3.9 mg/L', now: '2.6 mg/L', good: true  },
    { name: 'Testosterone', then: '498 ng/dL',now: '594 ng/dL', good: true  },
  ],
  '6m': [
    { name: 'HRV',          then: '41 ms',    now: '58 ms',    good: true  },
    { name: 'Glucose',      then: '104',       now: '92',       good: true  },
    { name: 'CRP',          then: '4.2 mg/L', now: '2.6 mg/L', good: true  },
    { name: 'Vitamin D',    then: '26 ng/mL', now: '52 ng/mL', good: true  },
    { name: 'Testosterone', then: '412 ng/dL',now: '594 ng/dL', good: true  },
    { name: 'Deep Sleep',   then: '6.4h',     now: '7.8h',     good: true  },
  ],
  '1y': [
    { name: 'HRV',          then: '38 ms',    now: '58 ms',    good: true  },
    { name: 'Glucose',      then: '108',       now: '92',       good: true  },
    { name: 'CRP',          then: '4.8 mg/L', now: '2.6 mg/L', good: true  },
    { name: 'Vitamin D',    then: '22 ng/mL', now: '52 ng/mL', good: true  },
    { name: 'Testosterone', then: '412 ng/dL',now: '594 ng/dL', good: true  },
    { name: 'Deep Sleep',   then: '6.1h',     now: '7.8h',     good: true  },
  ],
};

const PROTOCOLS = [
  { id: 'p1', tier: 1, action: 'Morning sunlight within 30 min of waking', why: 'Cortisol rhythm anchor. Circadian phase-sets melatonin onset 14h later. Non-negotiable for your sleep quality gains.', freq: 'Daily' },
  { id: 'p2', tier: 1, action: '10g creatine monohydrate — split AM/PM', why: 'Phosphocreatine saturation directly drives your HRV ceiling. You are at week 8 — peak saturation now.', freq: 'Daily' },
  { id: 'p3', tier: 2, action: 'Zone 2 cardio — 45 min × 3 per week', why: 'Mitochondrial biogenesis. CRP drops 0.3 mg/L per 6 weeks of consistent Zone 2. Primary driver of your bio age reversal.', freq: '3×/week' },
  { id: 'p4', tier: 2, action: 'Magnesium glycinate 400mg before sleep', why: 'Glycinate crosses blood-brain barrier. Directly modulates GABA for deep sleep architecture. Your 7.8h can reach 8.5h.', freq: 'Nightly' },
  { id: 'p5', tier: 3, action: 'Time-restricted eating — 8-hour window', why: 'Fasting glucose optimization. Your 92 mg/dL reaches 85 with consistent TRE. Reduces insulin exposure ~40%.', freq: 'Daily' },
  { id: 'p6', tier: 3, action: 'Cold exposure — 3 min at 55°F post-workout', why: 'Norepinephrine spike drives testosterone synthesis. Correlates with your 594 ng/dL trajectory toward 700+.', freq: '3×/week' },
];

const MEALS = [
  {
    time: 'Breakfast', name: 'Anti-Inflammatory Power Bowl',
    why: 'Directly targets CRP 2.6 mg/L — omega-3s and turmeric combination produces proven 0.4 mg/L reduction in 6 weeks of consistent intake.',
    items: ['Wild salmon 4oz', 'Spinach + arugula base', 'Avocado ½', 'Walnuts 1oz', 'Turmeric + black pepper dressing', 'Blueberries ½ cup'],
    macros: { p: 38, c: 28, f: 32, cal: 540 }, tag: 'CRP Target', tagColor: 'rgba(255,120,80,.85)',
  },
  {
    time: 'Lunch', name: 'Testosterone Optimisation Plate',
    why: 'Zinc + D3 + healthy fats = direct androgen substrate. Engineered for your 594→700+ testosterone trajectory. Grass-fed beef provides heme iron which also supports ferritin.',
    items: ['Grass-fed beef 6oz', 'Sweet potato (medium)', 'Broccoli + cauliflower 2 cups', 'Olive oil 2 tbsp', 'Pumpkin seeds 1oz', 'Lemon juice'],
    macros: { p: 52, c: 44, f: 28, cal: 620 }, tag: 'Testosterone', tagColor: 'rgba(0,195,155,.85)',
  },
  {
    time: 'Dinner', name: 'Deep Sleep Protocol Dinner',
    why: 'High glycine from bone broth + tryptophan + natural melatonin compounds from tart cherry. Acts synergistically with your magnesium glycinate supplement.',
    items: ['Bone broth chicken thighs 6oz', 'White rice 1 cup cooked', 'Asparagus 1 cup', 'Kiwi × 2', 'Tart cherry juice 2oz'],
    macros: { p: 44, c: 62, f: 14, cal: 540 }, tag: 'Sleep Quality', tagColor: 'rgba(120,120,255,.85)',
  },
  {
    time: 'Snack', name: 'HRV Recovery Stack',
    why: 'Electrolytes + creatine timing = autonomic nervous system recovery window. Critical 30-min post-workout window for your HRV 58→70+ goal.',
    items: ['Greek yogurt full-fat 1 cup', 'Banana (potassium)', '5g creatine monohydrate', 'Honey 1 tsp', 'Cinnamon (insulin sensitivity)'],
    macros: { p: 22, c: 38, f: 8, cal: 310 }, tag: 'HRV Target', tagColor: 'rgba(0,200,220,.85)',
  },
];

const SUPPS = [
  { name: 'Creatine Monohydrate', dose: '10g/day', timing: '5g AM · 5g post-workout', why: 'Primary HRV driver. Peak saturation at week 8. Your data shows the 20ms HRV gain — creatine is the foundation of this.', impact: 'HRV +8–12ms', priority: 1, status: 'active', cost: '$18' },
  { name: 'Magnesium Glycinate', dose: '400mg elemental', timing: '60 min before sleep', why: 'Glycinate form crosses blood-brain barrier. Directly modulates GABA receptors for deep sleep. Malate or oxide will not achieve the same result.', impact: 'Deep sleep +0.6h', priority: 1, status: 'active', cost: '$22' },
  { name: 'Vitamin D3 + K2', dose: '5,000 IU D3 · 200mcg K2', timing: 'With largest fat-containing meal', why: 'Your D went 22→52 ng/mL. K2 (MK-7) ensures calcium goes to bones not arteries. Never take D3 without K2.', impact: 'Testosterone +60–80', priority: 1, status: 'active', cost: '$24' },
  { name: 'Omega-3 EPA+DHA', dose: '3g EPA+DHA daily', timing: 'With meals to reduce GI impact', why: 'At 3g dose you get clinical anti-inflammatory effect. Your CRP should reach <1.0 mg/L in 12 weeks of consistent dosing.', impact: 'CRP −0.8–1.2 mg/L', priority: 1, status: 'active', cost: '$31' },
  { name: 'Tongkat Ali (LJ100)', dose: '200mg standardised extract', timing: 'Morning with food', why: 'SHBG reduction → free testosterone increase. At 594 ng/dL total T, your free T ratio matters more. LJ100 standardisation is critical.', impact: 'Free T +15–25%', priority: 2, status: 'consider', cost: '$38' },
  { name: 'Berberine', dose: '500mg × 3/day', timing: 'Before each main meal', why: 'Glucose disposal agent comparable to metformin in clinical trials. Your 92 mg/dL reaches 82–85 in 8 weeks. Activates AMPK pathway.', impact: 'Glucose −8–12', priority: 2, status: 'consider', cost: '$28' },
  { name: 'Ashwagandha KSM-66', dose: '600mg/day', timing: '2h before sleep', why: 'Cortisol modulation addresses HRV ceiling. KSM-66 reduces cortisol 28% in RCTs over 8 weeks. Also synergistic with testosterone goals.', impact: 'HRV +5–8ms', priority: 2, status: 'consider', cost: '$26' },
  { name: 'Apigenin', dose: '50mg', timing: '30 min before sleep', why: 'CD38 inhibitor → NAD+ preservation → circadian rhythm entrainment. Acts synergistically with magnesium. Andrew Huberman stack addition.', impact: 'Sleep onset −15 min', priority: 3, status: 'optional', cost: '$14' },
];

// ── ORB ──────────────────────────────────────────────────────────────────────

function Orb({ state, size = 110 }: { state: OrbState; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2, cy = size / 2, r = size * 0.42;
    function draw(t: number) {
      ctx.clearRect(0, 0, size, size);
      const cr = r * (1 + Math.sin(t * 0.0008) * 0.03);
      const aa = state === 'dormant' ? 0.03 : state === 'speaking' ? 0.16 : 0.09;
      const aura = ctx.createRadialGradient(cx, cy, cr * 0.5, cx, cy, cr * 1.7);
      aura.addColorStop(0, `rgba(0,210,165,${aa})`); aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, cr * 1.7, 0, Math.PI * 2); ctx.fillStyle = aura; ctx.fill();
      const g = ctx.createRadialGradient(cx - cr * 0.2, cy - cr * 0.2, cr * 0.05, cx, cy, cr);
      if (state === 'dormant') { g.addColorStop(0, 'rgba(0,75,60,0.7)'); g.addColorStop(0.5, 'rgba(0,22,36,0.92)'); g.addColorStop(1, 'rgba(0,5,14,0.98)'); }
      else if (state === 'thinking') { const p = (Math.sin(t * 0.003) + 1) / 2; g.addColorStop(0, `rgba(0,${Math.round(170 + p * 60)},${Math.round(140 + p * 30)},0.92)`); g.addColorStop(0.5, 'rgba(0,90,130,0.85)'); g.addColorStop(1, 'rgba(0,5,18,0.98)'); }
      else if (state === 'speaking') { g.addColorStop(0, 'rgba(0,245,185,0.96)'); g.addColorStop(0.35, 'rgba(0,185,215,0.82)'); g.addColorStop(1, 'rgba(0,8,22,0.98)'); }
      else { g.addColorStop(0, 'rgba(0,225,175,0.90)'); g.addColorStop(0.4, 'rgba(0,165,205,0.72)'); g.addColorStop(1, 'rgba(0,8,22,0.98)'); }
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.strokeStyle = state === 'dormant' ? 'rgba(0,100,80,0.2)' : 'rgba(0,210,165,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      if (state !== 'dormant') {
        for (let v = 0; v < (state === 'thinking' ? 7 : 4); v++) {
          const ang = (v / 7) * Math.PI * 2 + t * (v % 2 === 0 ? 0.0004 : -0.0003);
          const va = state === 'thinking' ? 0.18 + Math.abs(Math.sin(t * 0.002 + v)) * 0.28 : 0.1 + Math.abs(Math.sin(t * 0.001 + v)) * 0.18;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * cr * 0.25, cy + Math.sin(ang) * cr * 0.25);
          ctx.bezierCurveTo(cx + Math.cos(ang + 0.5) * cr * 0.65, cy + Math.sin(ang + 0.5) * cr * 0.65, cx + Math.cos(ang - 0.2) * cr * 0.88, cy + Math.sin(ang - 0.2) * cr * 0.88, cx + Math.cos(ang) * cr * 0.97, cy + Math.sin(ang) * cr * 0.97);
          ctx.strokeStyle = `rgba(0,210,165,${va})`; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
      if (state === 'thinking') { for (let s = 0; s < 6; s++) { const sa = (s / 6) * Math.PI * 2 + t * 0.002; const sr = cr * (0.55 + Math.sin(t * 0.004 + s * 1.3) * 0.35); ctx.beginPath(); ctx.arc(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr, 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,230,180,${0.35 + Math.sin(t * 0.005 + s) * 0.3})`; ctx.fill(); } }
      if (state === 'listening') { const lp = (t * 0.001) % 1; ctx.beginPath(); ctx.arc(cx, cy, cr * (1 + lp * 0.9), 0, Math.PI * 2); ctx.strokeStyle = `rgba(0,210,165,${0.5 * (1 - lp)})`; ctx.lineWidth = 1.5; ctx.stroke(); }
      const iris = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 0.38); iris.addColorStop(0, state === 'dormant' ? 'rgba(0,55,45,0.6)' : 'rgba(0,255,200,0.92)'); iris.addColorStop(0.4, state === 'dormant' ? 'rgba(0,28,22,0.35)' : 'rgba(0,205,168,0.62)'); iris.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, cr * 0.38, 0, Math.PI * 2); ctx.fillStyle = iris; ctx.fill();
      const spec = ctx.createRadialGradient(cx - cr * 0.24, cy - cr * 0.24, 0, cx - cr * 0.24, cy - cr * 0.24, cr * 0.32); spec.addColorStop(0, 'rgba(255,255,255,0.07)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx - cr * 0.24, cy - cr * 0.24, cr * 0.32, 0, Math.PI * 2); ctx.fillStyle = spec; ctx.fill();
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [state, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />;
}

// ── TREND CHART ───────────────────────────────────────────────────────────────

function TrendChart({ metric }: { metric: TrendKey }) {
  const cfg: Record<TrendKey, { label: string; unit: string; color: string; good: 'up' | 'down' }> = {
    hrv:     { label: 'HRV',            unit: 'ms',    color: '#00d2a5', good: 'up'   },
    glucose: { label: 'Fasting Glucose',unit: 'mg/dL', color: '#ffa040', good: 'down' },
    crp:     { label: 'CRP',            unit: 'mg/L',  color: '#ff6464', good: 'down' },
    vitd:    { label: 'Vitamin D',      unit: 'ng/mL', color: '#64b4ff', good: 'up'   },
    sleep:   { label: 'Deep Sleep',     unit: 'h',     color: '#a078ff', good: 'up'   },
  };
  const { label, unit, color, good } = cfg[metric];
  const vals = TREND_DATA.map(d => d[metric] as number);
  const min = Math.min(...vals) * 0.9, max = Math.max(...vals) * 1.1;
  const W = 500, H = 160, pl = 52, pr = 20, pt = 20, pb = 36;
  const iW = W - pl - pr, iH = H - pt - pb;
  const px = (i: number) => pl + (i / (vals.length - 1)) * iW;
  const py = (v: number) => pt + iH - ((v - min) / (max - min)) * iH;
  const pts = vals.map((v, i) => `${px(i)},${py(v)}`).join(' ');
  const last = vals[vals.length - 1], first = vals[0];
  const improving = good === 'up' ? last > first : last < first;
  const pct = Math.abs(((last - first) / first) * 100).toFixed(0);
  return (
    <div style={{ background: 'rgba(0,6,14,.85)', border: '1px solid rgba(0,175,138,.14)', borderRadius: 7, padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,185,148,.65)', marginBottom: 4 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 36, color, fontWeight: 500 }}>{last}</span>
            <span style={{ fontSize: 15, color: 'rgba(0,175,140,.5)' }}>{unit}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, color: improving ? '#00d2a5' : '#ff7850', fontWeight: 500 }}>{improving ? '↑' : '↓'} {pct}%</div>
          <div style={{ fontSize: 13, color: 'rgba(0,160,130,.5)', letterSpacing: 1 }}>6 months</div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(t => <line key={t} x1={pl} y1={pt + iH * (1 - t)} x2={pl + iW} y2={pt + iH * (1 - t)} stroke="rgba(0,175,138,.07)" strokeWidth="1" />)}
        <polygon points={`${pl},${pt + iH} ${pts} ${pl + iW},${pt + iH}`} fill={`url(#g-${metric})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {vals.map((v, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(v)} r="5" fill={color} opacity="0.9" />
            <text x={px(i)} y={H - 6} textAnchor="middle" fontSize="12" fill="rgba(0,175,138,.55)" fontFamily="EB Garamond, Georgia, serif">{TREND_DATA[i].month}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { user } = useAuth();
  const [orbState, setOrbState] = useState<OrbState>('dormant');
  const [panel, setPanel] = useState<Panel>('record');
  const [range, setRange] = useState<Range>('6m');
  const [trendMetric, setTrendMetric] = useState<TrendKey>('hrv');
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [awakened, setAwakened] = useState(false);
  const [awakePhase, setAwakePhase] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [expandedSupp, setExpandedSupp] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const t1 = setTimeout(() => setAwakePhase(1), 500);
    const t2 = setTimeout(() => { setAwakePhase(2); setOrbState('listening'); }, 1800);
    const t3 = setTimeout(() => { setAwakePhase(3); setOrbState('speaking'); setResponse('I notice three significant shifts in your biology. Would you like to begin there?'); }, 3200);
    const t4 = setTimeout(() => { setAwakePhase(4); setOrbState('idle'); setAwakened(true); }, 5800);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [user]);

  const handleAsk = useCallback(async () => {
    if (!input.trim() || asking) return;
    const q = input.trim(); setInput(''); setAsking(true);
    setOrbState('listening'); await new Promise(r => setTimeout(r, 300));
    setOrbState('thinking'); setResponse('');
    const ms = MARKERS.map(m => `${m.label}: ${m.current}${m.unit}`).join(', ');
    const ans = await callClaude(AELLUX_PROMPT, `Biomarkers: ${ms}. Question: ${q}`);
    setOrbState('speaking'); setResponse(ans); setAsking(false);
    setTimeout(() => setOrbState('idle'), 4000);
  }, [input, asking]);

  if (!user) return <AuthPaywall />;

  if (!awakened) return (
    <div style={{ height: '100vh', background: '#020810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
      <div style={{ opacity: awakePhase >= 1 ? 1 : 0, transform: awakePhase >= 1 ? 'scale(1)' : 'scale(0.82)', transition: 'all 1.6s cubic-bezier(.16,1,.3,1)' }}><Orb state={orbState} size={160} /></div>
      {awakePhase >= 2 && <p style={{ color: 'rgba(0,190,152,.65)', fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', animation: 'aellux-fade-up 1s ease forwards' }}>Ancient intelligence. Present clarity.</p>}
      {awakePhase >= 3 && response && <p style={{ color: 'rgba(0,215,172,.9)', fontSize: 19, fontStyle: 'italic', maxWidth: 380, textAlign: 'center', lineHeight: 1.85, animation: 'aellux-fade-up .8s ease forwards', padding: '0 24px' }}>{response}</p>}
    </div>
  );

  const NAV: Array<{ id: Panel; label: string }> = [
    { id: 'record',   label: 'Living Record'    },
    { id: 'trend',    label: 'Bio Trend Graph'  },
    { id: 'compare',  label: 'Bio Distance'     },
    { id: 'meals',    label: 'Meal Protocol'    },
    { id: 'supps',    label: 'Supplement Stack' },
    { id: 'protocol', label: 'Daily Protocol'   },
  ];

  const S = { // shared inline style shortcuts
    label: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: 'rgba(0,175,140,.65)' },
    card:  { background: 'rgba(0,6,14,.82)', border: '1px solid rgba(0,165,132,.13)', borderRadius: 6 },
    dim:   { fontSize: 14, color: 'rgba(0,165,132,.55)' },
    val:   { fontSize: 20, color: 'rgba(0,215,172,.92)', fontWeight: 500 as const },
    italic:{ fontSize: 17, fontStyle: 'italic' as const, color: 'rgba(0,210,170,.88)', lineHeight: 1.9 },
    tag:   (c: string) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 2, border: `1px solid ${c}`, color: c, letterSpacing: 1, textTransform: 'uppercase' as const }),
  };

  return (
    <div className="aellux-layout">
      {/* LEFT COLUMN */}
      <div className="aellux-lc">
        <div style={{ marginBottom: 10 }}><Orb state={orbState} size={110} /></div>
        <div style={{ fontSize: 15, letterSpacing: 3.5, textTransform: 'uppercase', color: 'rgba(0,210,165,.78)', marginBottom: 20 }}>Aellux</div>

        <div style={{ width: '100%', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 18 }}>
          {NAV.map(({ id, label }) => (
            <button key={id} className={`aellux-nav-item ${panel === id ? 'active' : ''}`} onClick={() => setPanel(id)}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: panel === id ? 'rgba(0,210,165,.9)' : 'rgba(0,130,105,.3)', flexShrink: 0, display: 'inline-block' }} />
              {label}
            </button>
          ))}
        </div>

        <div className="aellux-divider" style={{ margin: '0 auto 16px' }} />

        <div style={{ padding: '0 14px', width: '100%', position: 'relative' }}>
          <input ref={inputRef} className="aellux-speak-input" placeholder="Ask Aellux anything..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            onFocus={() => !asking && setOrbState('listening')}
            onBlur={() => orbState === 'listening' && setOrbState('idle')}
          />
          <button onClick={handleAsk} disabled={asking || !input.trim()} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,180,145,.55)', fontSize: 15, fontFamily: 'inherit' }}>↵</button>
        </div>

        {response && (
          <div style={{ padding: '12px 14px 0', width: '100%' }}>
            <div className={`aellux-response ${response ? 'visible' : ''}`}>{response}</div>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', width: 1.5, height: 1.5, borderRadius: '50%', background: 'rgba(0,200,160,.22)', left: `${12 + (i * 19.3) % 70}%`, top: `${8 + (i * 22.7) % 80}%`, animation: `aellux-star-twinkle ${3 + (i % 4)}s ${i * 0.5}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>

      {/* MAIN PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#020810' }}>
        <div className="aellux-topbar">
          <span style={{ fontSize: 15, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(0,195,155,.78)' }}>{NAV.find(n => n.id === panel)?.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(0,200,160,.75)', boxShadow: '0 0 6px rgba(0,200,160,.4)' }} />
            <span style={{ fontSize: 12, letterSpacing: 2, color: 'rgba(0,165,135,.62)', textTransform: 'uppercase' }}>Live</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* LIVING RECORD */}
          {panel === 'record' && (
            <div>
              <p style={{ ...S.label, marginBottom: 20 }}>Current Biomarkers</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 26 }}>
                {MARKERS.map(m => {
                  const inRange = m.current >= m.optimal[0] && m.current <= m.optimal[1];
                  const delta = m.current - m.prev;
                  const improved = m.higher ? delta > 0 : delta < 0;
                  return (
                    <div key={m.key} style={{ ...S.card, padding: '18px 20px' }}>
                      <div style={{ ...S.label, marginBottom: 8 }}>{m.label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 34, color: inRange ? 'rgba(0,218,175,.96)' : 'rgba(255,148,58,.92)', fontWeight: 500 }}>{m.current}</span>
                        <span style={{ fontSize: 14, color: 'rgba(0,160,130,.55)' }}>{m.unit}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, color: improved ? 'rgba(0,200,162,.82)' : 'rgba(255,120,80,.82)' }}>
                          {delta > 0 ? '+' : ''}{typeof delta === 'number' && delta % 1 !== 0 ? delta.toFixed(1) : delta} from before
                        </span>
                        <span style={{ fontSize: 12, color: inRange ? 'rgba(0,185,150,.58)' : 'rgba(255,130,60,.58)', letterSpacing: 1 }}>{inRange ? '✓ optimal' : '⚠ watch'}</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(0,48,38,.5)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, ((m.current - m.optimal[0]) / (m.optimal[1] - m.optimal[0])) * 100))}%`, background: inRange ? 'rgba(0,200,160,.65)' : 'rgba(255,140,60,.65)', borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="aellux-syn-box">
                <div style={{ ...S.label, marginBottom: 14 }}>Aellux Synthesis</div>
                <p style={{ ...S.italic, margin: 0 }}>Your HRV gain of 20ms signals significant autonomic recovery — I observe this in fewer than 12% of biological records. The glucose correction from 108 to 92 mg/dL reflects sustained metabolic discipline. CRP at 2.6 mg/L remains your primary target; the omega-3 protocol will close this gap.</p>
              </div>
            </div>
          )}

          {/* BIO TREND GRAPH */}
          {panel === 'trend' && (
            <div>
              <p style={{ ...S.label, marginBottom: 16 }}>6-Month Biological Trajectory</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
                {(['hrv', 'glucose', 'crp', 'vitd', 'sleep'] as TrendKey[]).map(m => {
                  const labels: Record<TrendKey, string> = { hrv: 'HRV', glucose: 'Glucose', crp: 'CRP', vitd: 'Vitamin D', sleep: 'Sleep' };
                  return <button key={m} className={`aellux-rtab ${trendMetric === m ? 'active' : ''}`} onClick={() => setTrendMetric(m)} style={{ fontFamily: 'inherit' }}>{labels[m]}</button>;
                })}
              </div>
              <TrendChart metric={trendMetric} />
              <div style={{ marginTop: 26 }}>
                <p style={{ ...S.label, marginBottom: 14 }}>All Markers — 6 Month Summary</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {MARKERS.map(m => {
                    const delta = m.current - m.prev;
                    const improved = m.higher ? delta > 0 : delta < 0;
                    const pct = Math.abs((delta / m.prev) * 100).toFixed(0);
                    return (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', ...S.card }}>
                        <div style={{ width: 130, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,180,145,.72)' }}>{m.label}</div>
                        <div style={{ fontSize: 15, color: 'rgba(0,155,125,.5)', width: 90 }}>{m.prev}{m.unit}</div>
                        <div style={{ fontSize: 18, color: 'rgba(0,140,112,.4)' }}>→</div>
                        <div style={{ fontSize: 20, fontWeight: 500, color: 'rgba(0,215,172,.94)', flex: 1 }}>{m.current}{m.unit}</div>
                        <div style={{ fontSize: 18, fontWeight: 500, color: improved ? '#00d2a5' : '#ff7850' }}>{improved ? '↑' : '↓'} {pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* BIO DISTANCE */}
          {panel === 'compare' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['3m', '6m', '1y'] as Range[]).map(r => (
                  <button key={r} className={`aellux-rtab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)} style={{ fontFamily: 'inherit' }}>
                    {r === '3m' ? '3 Months' : r === '6m' ? '6 Months' : '1 Year'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 26 }}>
                {[
                  { label: 'Chronological Age', val: '36', sub: 'years old' },
                  { label: 'Biological Age',    val: range === '3m' ? '34.2' : range === '6m' ? '33.1' : '31.8', sub: 'years old' },
                  { label: 'Years Reversed',    val: range === '3m' ? '1.8'  : range === '6m' ? '2.9'  : '4.2',  sub: 'biological years' },
                ].map(item => (
                  <div key={item.label} style={{ ...S.card, padding: '20px', textAlign: 'center' }}>
                    <div style={{ ...S.label, marginBottom: 10 }}>{item.label}</div>
                    <div style={{ fontSize: 44, color: item.label === 'Years Reversed' ? 'rgba(0,215,172,.97)' : 'rgba(0,195,158,.88)', fontWeight: 500, lineHeight: 1 }}>{item.val}</div>
                    <div style={{ fontSize: 14, color: 'rgba(0,155,125,.5)', marginTop: 6 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
              <p style={{ ...S.label, marginBottom: 14 }}>Marker Comparison — Then vs Now</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {CMP[range].map(m => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', ...S.card }}>
                    <div style={{ width: 140, fontSize: 15, color: 'rgba(0,188,152,.78)' }}>{m.name}</div>
                    <div style={{ fontSize: 16, color: 'rgba(0,150,120,.5)', width: 110 }}>{m.then}</div>
                    <div style={{ fontSize: 20, color: 'rgba(0,135,110,.4)' }}>→</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: m.good ? 'rgba(0,215,172,.96)' : 'rgba(255,130,60,.92)', flex: 1 }}>{m.now}</div>
                    <div style={{ fontSize: 22, color: m.good ? '#00d2a5' : '#ff7850' }}>{m.good ? '↑' : '↓'}</div>
                  </div>
                ))}
              </div>
              <div className="aellux-syn-box">
                <div style={{ ...S.label, marginBottom: 14 }}>Aellux Synthesis</div>
                <p style={{ ...S.italic, margin: 0 }}>
                  {range === '3m' ? 'Three months of sustained intervention shifted your biological markers measurably across every tracked system. The velocity of change suggests momentum, not plateau.' :
                   range === '6m' ? 'Six months reveals a pattern I have observed in fewer than 8% of records: simultaneous improvement across metabolic, inflammatory, hormonal, and recovery axes. This is systematic biological reconstruction.' :
                   'One year of data reveals deliberate biological reversal. Your chronological age is 36. Your biological systems perform at 31.8. This 4.2-year gap is earned — not inherited.'}
                </p>
              </div>
            </div>
          )}

          {/* MEAL PROTOCOL */}
          {panel === 'meals' && (
            <div>
              <p style={{ ...S.label, marginBottom: 6 }}>Biomarker-Targeted Meal Protocol</p>
              <p style={{ fontSize: 16, color: 'rgba(0,185,150,.65)', marginBottom: 24, lineHeight: 1.7 }}>Every meal is engineered to your specific markers. Tap to expand full ingredients and rationale.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MEALS.map(meal => {
                  const isOpen = expandedMeal === meal.time;
                  return (
                    <div key={meal.time} style={{ ...S.card, border: `1px solid ${isOpen ? 'rgba(0,192,152,.28)' : 'rgba(0,165,132,.13)'}`, overflow: 'hidden', transition: 'border-color .2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', cursor: 'pointer' }} onClick={() => setExpandedMeal(isOpen ? null : meal.time)}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <span style={{ ...S.label }}>{meal.time}</span>
                            <span style={S.tag(meal.tagColor)}>{meal.tag}</span>
                          </div>
                          <div style={{ fontSize: 20, color: 'rgba(0,215,172,.94)', fontWeight: 500 }}>{meal.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 18, fontSize: 15, color: 'rgba(0,175,142,.7)' }}>
                          <span>{meal.macros.cal} cal</span>
                          <span>{meal.macros.p}g protein</span>
                        </div>
                        <div style={{ fontSize: 20, color: 'rgba(0,175,140,.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 22px 22px', borderTop: '1px solid rgba(0,165,132,.1)' }}>
                          <p style={{ fontSize: 16, fontStyle: 'italic', color: 'rgba(0,200,162,.78)', lineHeight: 1.8, margin: '16px 0 18px', paddingLeft: 14, borderLeft: '2px solid rgba(0,190,152,.28)' }}>{meal.why}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
                            {meal.items.map(item => (
                              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: 'rgba(0,200,165,.85)' }}>
                                <span style={{ color: 'rgba(0,175,140,.4)', fontSize: 10 }}>◆</span>{item}
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 24 }}>
                            {[['Protein', meal.macros.p, 'g'], ['Carbs', meal.macros.c, 'g'], ['Fat', meal.macros.f, 'g'], ['Calories', meal.macros.cal, '']].map(([l, v, u]) => (
                              <div key={String(l)} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 22, color: 'rgba(0,210,170,.9)', fontWeight: 500 }}>{v}{u}</div>
                                <div style={{ fontSize: 12, color: 'rgba(0,160,130,.5)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{l}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUPPLEMENT STACK */}
          {panel === 'supps' && (
            <div>
              <p style={{ ...S.label, marginBottom: 6 }}>Personalised Supplement Stack</p>
              <p style={{ fontSize: 16, color: 'rgba(0,185,150,.65)', marginBottom: 24, lineHeight: 1.7 }}>Ranked by impact on your specific biomarkers. Tap for full dosing rationale.</p>
              {[{ label: 'Priority 1 — Foundation', p: 1 }, { label: 'Priority 2 — Optimisation', p: 2 }, { label: 'Priority 3 — Optional', p: 3 }].map(group => (
                <div key={group.label} style={{ marginBottom: 28 }}>
                  <p style={{ ...S.label, marginBottom: 12 }}>{group.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {SUPPS.filter(s => s.priority === group.p).map(s => {
                      const isOpen = expandedSupp === s.name;
                      const sc = s.status === 'active' ? 'rgba(0,200,162,.85)' : s.status === 'consider' ? 'rgba(255,190,60,.85)' : 'rgba(0,165,132,.55)';
                      return (
                        <div key={s.name} style={{ ...S.card, border: `1px solid ${isOpen ? 'rgba(0,192,152,.28)' : 'rgba(0,165,132,.13)'}`, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', cursor: 'pointer' }} onClick={() => setExpandedSupp(isOpen ? null : s.name)}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                                <span style={{ fontSize: 19, fontWeight: 500, color: 'rgba(0,215,172,.94)' }}>{s.name}</span>
                                <span style={S.tag(sc)}>{s.status}</span>
                              </div>
                              <div style={{ fontSize: 15, color: 'rgba(0,178,145,.72)' }}>{s.dose} · {s.timing}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 15, color: 'rgba(0,200,162,.78)' }}>{s.impact}</div>
                              <div style={{ fontSize: 14, color: 'rgba(0,155,125,.48)' }}>{s.cost}/mo</div>
                            </div>
                            <div style={{ fontSize: 20, color: 'rgba(0,175,140,.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginLeft: 8 }}>⌄</div>
                          </div>
                          {isOpen && (
                            <div style={{ padding: '0 22px 22px', borderTop: '1px solid rgba(0,165,132,.1)' }}>
                              <p style={{ fontSize: 16, color: 'rgba(0,205,165,.84)', lineHeight: 1.88, margin: '16px 0 0', fontStyle: 'italic', paddingLeft: 14, borderLeft: '2px solid rgba(0,190,152,.28)' }}>{s.why}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ ...S.card, padding: '18px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 16, color: 'rgba(0,178,145,.72)', marginBottom: 4 }}>Foundation stack — 4 supplements</div>
                    <div style={{ fontSize: 15, color: 'rgba(0,160,130,.5)' }}>$18 + $22 + $24 + $31</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, color: 'rgba(0,215,172,.92)', fontWeight: 500 }}>$95/mo</div>
                    <div style={{ fontSize: 13, color: 'rgba(0,158,128,.48)' }}>Foundation total</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DAILY PROTOCOL */}
          {panel === 'protocol' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 26 }}>
                <div style={{ position: 'relative', width: 76, height: 76 }}>
                  <svg viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)', width: 76, height: 76 }}>
                    <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(0,48,38,.6)" strokeWidth="5" />
                    <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(0,200,160,.72)" strokeWidth="5"
                      strokeDasharray={`${(done.size / PROTOCOLS.length) * 201.1} 201.1`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'rgba(0,200,160,.88)', fontWeight: 500 }}>{done.size}/{PROTOCOLS.length}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, color: 'rgba(0,215,172,.9)', marginBottom: 4 }}>Daily Protocol</div>
                  <div style={{ fontSize: 13, letterSpacing: 2, color: 'rgba(0,165,132,.55)', textTransform: 'uppercase' }}>Leverage-ranked by biomarker impact</div>
                </div>
                <button onClick={() => setDone(new Set())} style={{ fontSize: 13, color: 'rgba(0,150,120,.48)', background: 'none', border: '1px solid rgba(0,150,120,.22)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 }}>Reset</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROTOCOLS.map(p => (
                  <div key={p.id} className={`aellux-proto-item ${done.has(p.id) ? 'completed' : ''}`}
                    onClick={() => setDone(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}>
                    <div className={`aellux-check ${done.has(p.id) ? 'checked' : ''}`}>
                      {done.has(p.id) && <span style={{ fontSize: 10, color: 'rgba(0,200,160,.92)' }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <span style={{ fontSize: 17, color: done.has(p.id) ? 'rgba(0,175,140,.5)' : 'rgba(0,215,172,.92)', lineHeight: 1.4 }}>{p.action}</span>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 2, background: 'rgba(0,195,155,.1)', color: 'rgba(0,195,155,.68)', border: '1px solid rgba(0,195,155,.18)', letterSpacing: 1, flexShrink: 0 }}>T{p.tier}</span>
                      </div>
                      <p style={{ fontSize: 15, color: 'rgba(0,178,145,.65)', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>{p.why}</p>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(0,155,125,.48)', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0, textAlign: 'right' }}>{p.freq}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
