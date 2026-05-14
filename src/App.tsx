import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { saveDocument, getDocuments, deleteDocument, savePersonalised, getPersonalised } from './supabase';
import AuthPaywall from './AuthPaywall';
import LandingPage from './LandingPage';
import ProtocolsSection from './ProtocolsSection';
import ProfilePage from './ProfilePage';
import BodyHero from './BodyHero';
import BiomarkerDetail from './BiomarkerDetail';
import AdminDashboard from './AdminDashboard';
import PrintableReport from './PrintableReport';
import WeekView from './WeekView';
import DerivedViews from './DerivedViews';
import ProfileSetup from './ProfileSetup';

// ── TYPES ────────────────────────────────────────────────────────────────────

type OrbState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';
type Panel = 'upload' | 'dashboard' | 'trends' | 'meals' | 'supps' | 'protocol' | 'protocols' | 'week' | 'ask' | 'profile' | 'admin';

interface Marker {
  name: string;
  category: string;
  value: number;
  unit: string;
  reference_range_low?: number;
  reference_range_high?: number;
  status: string;
  trend_direction?: string;
  source_doc?: string;
  date?: string;
}

interface Document {
  id: string;
  name: string;
  date: string;
  document_type: string;
  markers: Marker[];
  summary: string;
  flags: string[];
  recommendations: string[];
  uploadedAt: string;
}

interface PersonalisedData {
  meals?: any;
  supps?: any;
  protocol?: any;
  synthesis?: any;
  week?: any;
}

const CATEGORY_COLORS: Record<string, string> = {
  metabolic:         '#ffa040',
  cardiovascular:    '#ff6464',
  hormonal:          '#b478ff',
  inflammatory:      '#ff8c5a',
  nutritional:       '#64d2ff',
  sleep:             '#8878ff',
  fitness:           '#00d2a5',
  body_composition:  '#40c8a0',
  cognitive:         '#e0c040',
  gut:               '#88c860',
  other:             '#aaaaaa',
};

const STATUS_COLORS: Record<string, string> = {
  optimal:    'rgba(0,210,165,.9)',
  normal:     'rgba(0,190,155,.8)',
  borderline: 'rgba(255,190,60,.9)',
  elevated:   'rgba(255,130,60,.9)',
  low:        'rgba(120,160,255,.9)',
};

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
      const aa = state === 'dormant' ? 0.04 : state === 'speaking' ? 0.18 : 0.1;
      const aura = ctx.createRadialGradient(cx, cy, cr * 0.5, cx, cy, cr * 1.7);
      aura.addColorStop(0, `rgba(0,210,165,${aa})`); aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, cr * 1.7, 0, Math.PI * 2); ctx.fillStyle = aura; ctx.fill();
      const g = ctx.createRadialGradient(cx - cr * 0.2, cy - cr * 0.2, cr * 0.05, cx, cy, cr);
      if (state === 'dormant') { g.addColorStop(0, 'rgba(0,75,60,0.7)'); g.addColorStop(0.5, 'rgba(0,22,36,0.92)'); g.addColorStop(1, 'rgba(0,5,14,0.98)'); }
      else if (state === 'thinking') { const p = (Math.sin(t * 0.003) + 1) / 2; g.addColorStop(0, `rgba(0,${Math.round(170 + p * 60)},${Math.round(140 + p * 30)},0.92)`); g.addColorStop(0.5, 'rgba(0,90,130,0.85)'); g.addColorStop(1, 'rgba(0,5,18,0.98)'); }
      else if (state === 'speaking') { g.addColorStop(0, 'rgba(0,245,185,0.96)'); g.addColorStop(0.35, 'rgba(0,185,215,0.82)'); g.addColorStop(1, 'rgba(0,8,22,0.98)'); }
      else { g.addColorStop(0, 'rgba(0,225,175,0.90)'); g.addColorStop(0.4, 'rgba(0,165,205,0.72)'); g.addColorStop(1, 'rgba(0,8,22,0.98)'); }
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.strokeStyle = state === 'dormant' ? 'rgba(0,100,80,0.2)' : 'rgba(0,210,165,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      if (state !== 'dormant') {
        for (let v = 0; v < (state === 'thinking' ? 7 : 4); v++) {
          const ang = (v / 7) * Math.PI * 2 + t * (v % 2 === 0 ? 0.0004 : -0.0003);
          const va = state === 'thinking' ? 0.2 + Math.abs(Math.sin(t * 0.002 + v)) * 0.3 : 0.1 + Math.abs(Math.sin(t * 0.001 + v)) * 0.18;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * cr * 0.25, cy + Math.sin(ang) * cr * 0.25);
          ctx.bezierCurveTo(cx + Math.cos(ang + 0.5) * cr * 0.65, cy + Math.sin(ang + 0.5) * cr * 0.65, cx + Math.cos(ang - 0.2) * cr * 0.88, cy + Math.sin(ang - 0.2) * cr * 0.88, cx + Math.cos(ang) * cr * 0.97, cy + Math.sin(ang) * cr * 0.97);
          ctx.strokeStyle = `rgba(0,210,165,${va})`; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
      if (state === 'thinking') { for (let s = 0; s < 6; s++) { const sa = (s / 6) * Math.PI * 2 + t * 0.002; const sr = cr * (0.55 + Math.sin(t * 0.004 + s * 1.3) * 0.35); ctx.beginPath(); ctx.arc(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr, 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,230,180,${0.35 + Math.sin(t * 0.005 + s) * 0.3})`; ctx.fill(); } }
      if (state === 'listening') { const lp = (t * 0.001) % 1; ctx.beginPath(); ctx.arc(cx, cy, cr * (1 + lp * 0.9), 0, Math.PI * 2); ctx.strokeStyle = `rgba(0,210,165,${0.5 * (1 - lp)})`; ctx.lineWidth = 1.5; ctx.stroke(); }
      const iris = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 0.38);
      iris.addColorStop(0, state === 'dormant' ? 'rgba(0,55,45,0.6)' : 'rgba(0,255,200,0.92)');
      iris.addColorStop(0.4, state === 'dormant' ? 'rgba(0,28,22,0.35)' : 'rgba(0,205,168,0.62)');
      iris.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, cr * 0.38, 0, Math.PI * 2); ctx.fillStyle = iris; ctx.fill();
      const spec = ctx.createRadialGradient(cx - cr * 0.24, cy - cr * 0.24, 0, cx - cr * 0.24, cy - cr * 0.24, cr * 0.32);
      spec.addColorStop(0, 'rgba(255,255,255,0.07)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx - cr * 0.24, cy - cr * 0.24, cr * 0.32, 0, Math.PI * 2); ctx.fillStyle = spec; ctx.fill();
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [state, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />;
}

// ── MINI SPARK CHART ─────────────────────────────────────────────────────────

function SparkChart({ values, color, width = 80, height = 30 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={(values.length - 1) / (values.length - 1) * width} cy={height - ((values[values.length - 1] - min) / range) * height} r="2.5" fill={color} />
    </svg>
  );
}

// ── FULL TREND CHART ─────────────────────────────────────────────────────────

function TrendChart({ marker, history }: { marker: string; history: Array<{ date: string; value: number; unit: string }> }) {
  if (history.length < 2) return <div style={{ color: 'rgba(0,165,132,.5)', fontSize: 14, padding: 20 }}>Need at least 2 data points to show trend.</div>;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const vals = sorted.map(d => d.value);
  const min = Math.min(...vals) * 0.9, max = Math.max(...vals) * 1.1;
  const W = 520, H = 180, pl = 60, pr = 20, pt = 20, pb = 40;
  const iW = W - pl - pr, iH = H - pt - pb;
  const px = (i: number) => pl + (i / (sorted.length - 1)) * iW;
  const py = (v: number) => pt + iH - ((v - min) / (max - min)) * iH;
  const pts = sorted.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  const first = vals[0], last = vals[vals.length - 1];
  const change = ((last - first) / first * 100).toFixed(1);
  const improving = last < first ? true : last > first; // simplified — ideally direction-aware

  return (
    <div style={{ background: 'rgba(0,6,14,.85)', border: '1px solid rgba(0,175,138,.14)', borderRadius: 7, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,185,148,.65)', marginBottom: 4 }}>{marker}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 38, color: '#00d2a5', fontWeight: 500 }}>{last}</span>
            <span style={{ fontSize: 15, color: 'rgba(0,175,140,.5)' }}>{sorted[0].unit}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: change.startsWith('-') ? 'rgba(255,120,80,.9)' : 'rgba(0,210,165,.9)' }}>
            {Number(change) > 0 ? '+' : ''}{change}%
          </div>
          <div style={{ fontSize: 13, color: 'rgba(0,160,130,.5)' }}>{sorted[0].date} → {sorted[sorted.length - 1].date}</div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d2a5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00d2a5" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const yv = min + (max - min) * t;
          return (
            <g key={t}>
              <line x1={pl} y1={py(yv)} x2={pl + iW} y2={py(yv)} stroke="rgba(0,175,138,.07)" strokeWidth="1" />
              <text x={pl - 5} y={py(yv) + 4} textAnchor="end" fontSize="10" fill="rgba(0,175,138,.4)" fontFamily="EB Garamond, Georgia, serif">{yv.toFixed(1)}</text>
            </g>
          );
        })}
        <polygon points={`${pl},${pt + iH} ${pts} ${pl + iW},${pt + iH}`} fill="url(#trend-grad)" />
        <polyline points={pts} fill="none" stroke="#00d2a5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {sorted.map((d, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(d.value)} r="5" fill="#00d2a5" opacity="0.9" />
            <title>{d.date}: {d.value} {d.unit}</title>
            <text x={px(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="rgba(0,175,138,.55)" fontFamily="EB Garamond, Georgia, serif">
              {d.date.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}


// ── MULTI-MARKER OVERLAY CHART ─────────────────────────────────────────────────

function MultiTrendChart({ markers, activeKeys, allDates }: {
  markers: Array<{ name: string; category: string; history: Array<{ date: string; value: number; unit: string }>; color: string }>;
  activeKeys: Set<string>;
  allDates: string[];
}) {
  const W = 640, H = 240, pl = 52, pr = 24, pt = 24, pb = 44;
  const iW = W - pl - pr, iH = H - pt - pb;
  const activeMarkers = markers.filter(m => activeKeys.has(m.name) && m.history.length > 1);
  const normalise = (marker: typeof markers[0]) => {
    const sorted = [...marker.history].sort((a, b) => a.date.localeCompare(b.date));
    const vals = sorted.map(d => d.value);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const range = hi - lo || 1;
    return sorted.map(d => ({ date: d.date, norm: ((d.value - lo) / range) * 100, value: d.value, unit: d.unit }));
  };
  const px = (date: string) => {
    const i = allDates.indexOf(date);
    if (i < 0 || allDates.length < 2) return pl;
    return pl + (i / (allDates.length - 1)) * iW;
  };
  const py = (norm: number) => pt + iH - (norm / 100) * iH;
  if (activeMarkers.length === 0) return (
    <div style={{ background: 'rgba(0,4,12,.9)', border: '1px solid rgba(0,175,138,.12)', borderRadius: 8, padding: '48px 0', textAlign: 'center', color: 'rgba(0,165,132,.4)', fontSize: 14 }}>
      Toggle markers below to display trends
    </div>
  );
  return (
    <div style={{ background: 'rgba(0,4,12,.9)', border: '1px solid rgba(0,175,138,.12)', borderRadius: 8, padding: '0 0 4px' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          {activeMarkers.map(m => (
            <linearGradient key={m.name} id={`mg-${m.name.replace(/\s/g,'_')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={m.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={m.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 25, 50, 75, 100].map(pct => (
          <g key={pct}>
            <line x1={pl} y1={py(pct)} x2={pl + iW} y2={py(pct)} stroke="rgba(0,175,138,.06)" strokeWidth="1" />
            <text x={pl - 6} y={py(pct) + 4} textAnchor="end" fontSize="9" fill="rgba(0,175,138,.3)" fontFamily="EB Garamond, Georgia, serif">{pct === 0 ? 'low' : pct === 100 ? 'high' : ''}</text>
          </g>
        ))}
        {allDates.map((d) => (
          <text key={d} x={px(d)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(0,175,138,.5)" fontFamily="EB Garamond, Georgia, serif">
            {d.slice(0, 7)}
          </text>
        ))}
        {allDates.map(d => (
          <line key={d} x1={px(d)} y1={pt} x2={px(d)} y2={pt + iH} stroke="rgba(0,175,138,.04)" strokeWidth="1" strokeDasharray="2,4" />
        ))}
        {activeMarkers.map(m => {
          const pts = normalise(m);
          const polyPts = pts.map(p => `${px(p.date)},${py(p.norm)}`).join(' ');
          const areaClose = `${px(pts[pts.length-1].date)},${pt+iH} ${px(pts[0].date)},${pt+iH}`;
          return (
            <g key={m.name}>
              <polygon points={`${polyPts} ${areaClose}`} fill={`url(#mg-${m.name.replace(/\s/g,'_')})`} />
              <polyline points={polyPts} fill="none" stroke={m.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={px(p.date)} cy={py(p.norm)} r="4" fill={m.color} opacity="0.85" />
                  <title>{m.name}: {p.value} {p.unit} ({p.date})</title>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────


// ── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { user } = useAuth();

  const handleUpgrade = async () => {
    const e = user?.email || email;
    if (!e) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,16,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'rgba(0,10,22,.98)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 10, padding: '40px 36px', maxWidth: 440, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
        <h2 style={{ fontSize: 26, color: 'rgba(0,215,172,.95)', fontWeight: 400, margin: '0 0 12px' }}>Aellux Pro</h2>
        <p style={{ fontSize: 16, color: 'rgba(0,185,150,.68)', lineHeight: 1.75, marginBottom: 28 }}>
          Unlock AI-generated meal protocols, supplement stacks, daily protocols, and unlimited Aellux conversations — all personalised to your actual biomarkers.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {['Personalised meal protocol from your markers', 'Supplement stack with full dosing rationale', 'Daily protocol ranked by biomarker impact', 'Unlimited AI conversations with your data'].map(f => (
            <div key={f} style={{ fontSize: 15, color: 'rgba(0,205,165,.82)', textAlign: 'left', display: 'flex', gap: 10 }}>
              <span style={{ color: 'rgba(0,195,155,.7)' }}>✦</span>{f}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 32, color: 'rgba(0,215,172,.96)', marginBottom: 6, fontWeight: 400 }}>$29<span style={{ fontSize: 16, color: 'rgba(0,175,142,.5)', fontWeight: 400 }}>/month</span></div>
        <div style={{ fontSize: 14, color: 'rgba(0,155,125,.45)', marginBottom: 24 }}>Cancel anytime · Powered by Stripe</div>
        <button onClick={handleUpgrade} disabled={loading}
          style={{ width: '100%', fontSize: 17, color: '#020810', background: 'rgba(0,200,160,.88)', border: 'none', borderRadius: 5, padding: '14px 0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, marginBottom: 12 }}>
          {loading ? 'Opening Stripe...' : 'Upgrade to Pro →'}
        </button>
        <button onClick={onClose} style={{ fontSize: 14, color: 'rgba(0,155,125,.45)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Maybe later</button>
      </div>
    </div>
  );
}

// ── PRO GATE ─────────────────────────────────────────────────────────────────
function ProGate({ isPro, onUpgrade, feature }: { isPro: boolean; onUpgrade: () => void; feature: string }) {
  if (isPro) return null;
  return (
    <div style={{ background: 'rgba(0,8,16,.85)', border: '1px solid rgba(0,195,155,.2)', borderRadius: 8, padding: '36px 28px', textAlign: 'center', marginBottom: 24 }}>
      <div style={{ fontSize: 28, marginBottom: 14 }}>✦</div>
      <div style={{ fontSize: 20, color: 'rgba(0,215,172,.92)', marginBottom: 10, fontWeight: 500 }}>{feature} is a Pro feature</div>
      <p style={{ fontSize: 16, color: 'rgba(0,175,142,.65)', lineHeight: 1.75, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
        Upgrade to Aellux Pro to get this personalised to your actual biomarkers.
      </p>
      <button onClick={onUpgrade}
        style={{ fontSize: 17, color: '#020810', background: 'rgba(0,200,160,.88)', border: 'none', borderRadius: 5, padding: '13px 32px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
        Upgrade to Pro — $29/mo →
      </button>
    </div>
  );
}

function isProfileComplete(p: any): boolean {
  // Tier 1 essentials required before generation
  return !!(p && p.biological_sex && p.birth_year && p.height_cm && p.weight_kg);
}

// Drops cached entries that are error payloads or wrong shape (from buggy older
// code that stored {error: "..."} responses to the personalised table).
function sanitisePersonalised(p: any): any {
  if (!p || typeof p !== 'object') return {};
  const out: any = {};
  for (const [type, data] of Object.entries(p)) {
    if (!data || typeof data !== 'object') continue;
    if ((data as any).error) continue;
    const shapeOk =
      (type === 'meals'     && Array.isArray((data as any).meals)) ||
      (type === 'supps'     && Array.isArray((data as any).supplements)) ||
      (type === 'protocol'  && Array.isArray((data as any).protocols)) ||
      (type === 'synthesis' && ((data as any).aellux_voice || (data as any).focus_priority)) ||
      (type === 'week'      && Array.isArray((data as any).days) && (data as any).days.length > 0);
    if (shapeOk) out[type] = data;
  }
  return out;
}

// Materializes the user's meal swap selections into a new personalised payload.
// Each swap key is "dayIdx|slot" → swap reason ('nutrient_match' | 'cheaper' | etc.) or ''
function applyMealSwaps(p: any, swaps: Record<string, string>): any {
  if (!p?.week || !Array.isArray(p.week.days)) return p;
  if (!swaps || Object.keys(swaps).length === 0) return p;
  const week = {
    ...p.week,
    days: p.week.days.map((day: any, dayIdx: number) => {
      if (!day?.meals) return day;
      const meals = { ...day.meals };
      for (const slot of ['breakfast', 'lunch', 'dinner']) {
        const swapKey = swaps[`${dayIdx}|${slot}`];
        const original = meals[slot];
        if (!swapKey || !original) continue;
        const alt = original.alternatives?.find((a: any) => a.swap === swapKey);
        if (!alt) continue;
        meals[slot] = {
          ...original,
          name: alt.name,
          // tag so the PDF can mark it as swapped if desired (no UI change for now)
          _swapped_from: original.name,
          _swap_reason: alt.why,
        };
      }
      return { ...day, meals };
    }),
  };
  return { ...p, week };
}

export default function App() {
  const { user, isPro, signOut } = useAuth();
  const [orbState, setOrbState] = useState<OrbState>('dormant');
  const [panel, setPanel] = useState<Panel>('upload');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [personalised, setPersonalised] = useState<PersonalisedData>({});
  const [mealPreference, setMealPreference] = React.useState<string>('none');
  const [showRecords, setShowRecords] = React.useState(false);
  const [selectedMarker, setSelectedMarker] = React.useState<any>(null);
  const isAdmin = user?.email === 'contact@aigents.help' || (user as any)?.is_admin === true;
  const [trendsFilter, setTrendsFilter] = React.useState<string>('All');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
    const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [printSection, setPrintSection] = useState<'meals' | 'supps' | 'protocol' | 'synthesis' | 'week' | 'all' | null>(null);
  const [mealSwaps, setMealSwaps] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('aellux_meal_swaps');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const handleMealSwap = useCallback((dayIdx: number, slot: 'breakfast' | 'lunch' | 'dinner', swapKey: string) => {
    setMealSwaps(prev => {
      const next = { ...prev, [`${dayIdx}|${slot}`]: swapKey };
      try { localStorage.setItem('aellux_meal_swaps', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // v1.5: Biologic Protocol generation state
  const [weekStreamDays, setWeekStreamDays] = useState<any[]>([]);  // Days emitted so far during streaming
  const [weekStreamStatus, setWeekStreamStatus] = useState<string>('');
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [bpMealStyle, setBpMealStyle] = useState<string>(() => {
    try { return localStorage.getItem('aellux_bp_meal_style') || 'none'; } catch { return 'none'; }
  });
  const [bpAdditionalGoal, setBpAdditionalGoal] = useState<string>('');
  const [bpCycleLengthDays, setBpCycleLengthDays] = useState<number>(30);
  const [bpMealPrep, setBpMealPrep] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [bpGoalExpanded, setBpGoalExpanded] = useState(false);

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [asking, setAsking] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  // v1.7 mobile chrome
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [askSheetOpen, setAskSheetOpen] = useState(false);
  const [awakened, setAwakened] = useState(false);
  const [awakePhase, setAwakePhase] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dragOver, setDragOver] = useState(false);
  const [activeMarkerKeys, setActiveMarkerKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from Supabase on mount (with localStorage fallback)
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    // Immediate localStorage load for fast UI
    try {
      const saved = localStorage.getItem('aellux_documents');
      const savedP = localStorage.getItem('aellux_personalised');
      const hasP = !!(savedP && JSON.parse(savedP).week);
      if (saved) {
        const docs = JSON.parse(saved);
        setDocuments(docs);
        if (docs.length > 0) {
          // Mobile users land on Today (week) if they have a protocol, else dashboard
          setPanel(isMobile && hasP ? 'week' : 'dashboard');
        }
      }
      if (savedP) setPersonalised(sanitisePersonalised(JSON.parse(savedP)));
    } catch {}

    // Then sync from Supabase if logged in
    if (user?.id) {
      getDocuments(user.id).then(docs => {
        if (docs.length > 0) {
          const mapped = docs.map(d => ({
            id: d.id, name: d.name, date: d.date, document_type: d.document_type,
            markers: Array.isArray(d.markers) ? d.markers : [],
            summary: d.summary, flags: d.flags,
            recommendations: d.recommendations, uploadedAt: d.uploaded_at,
          }));
          setDocuments(mapped);
          localStorage.setItem('aellux_documents', JSON.stringify(mapped));
          // Don't override panel here if user has already navigated
          setPanel(p => p === 'upload' ? (isMobile ? 'week' : 'dashboard') : p);
        }
      });
      getPersonalised(user.id).then(p => {
        const clean = sanitisePersonalised(p);
        if (Object.keys(clean).length > 0) {
          setPersonalised(clean);
          localStorage.setItem('aellux_personalised', JSON.stringify(clean));
        }
      });
      // Load saved Biologic Protocol from meal_plans (persists across sessions)
      fetch(`/api/protocol-load?userId=${user.id}`)
        .then(r => r.json())
        .then(d => {
          if (d?.protocol?.weekData) {
            setPersonalised(prev => {
              // Only set if we don't already have a week (localStorage may have beaten us here)
              if (prev.week && Array.isArray(prev.week.days) && prev.week.days.length > 0) return prev;
              const updated = { ...prev, week: d.protocol.weekData };
              try { localStorage.setItem('aellux_personalised', JSON.stringify(updated)); } catch {}
              return updated;
            });
            // Restore meal style preference from saved protocol
            if (d.protocol.mealStyle && d.protocol.mealStyle !== 'none') {
              setBpMealStyle(d.protocol.mealStyle);
            }
            if (d.protocol.cycleLengthDays) {
              setBpCycleLengthDays(d.protocol.cycleLengthDays);
            }
            if (d.protocol.mealPrep) {
              setBpMealPrep(true);
            }
          }
        })
        .catch(() => {/* non-fatal */});
      // Load user profile (sex, age, weight, conditions, meds — used by all generators)
      fetch(`/api/profile?userId=${user.id}`)
        .then(r => r.json())
        .then(d => {
          const p = d?.profile || null;
          setProfile(p);
          setProfileLoaded(true);
          // Show onboarding if profile is incomplete and user has no documents yet
          if (!p?.biological_sex && !localStorage.getItem('aellux_onboarded')) {
            setShowOnboarding(true);
          }
        })
        .catch(() => { setProfile(null); setProfileLoaded(true); });
    }
  }, [user?.id]);

  // Awakening sequence
  useEffect(() => {
    if (!user) return;
    const t1 = setTimeout(() => setAwakePhase(1), 500);
    const t2 = setTimeout(() => { setAwakePhase(2); setOrbState('listening'); }, 1800);
    const t3 = setTimeout(() => { setAwakePhase(3); setOrbState('speaking'); setResponse('Upload your medical records and wearable data. I will read everything and synthesise your complete biology.'); }, 3000);
    const t4 = setTimeout(() => { setAwakePhase(4); setOrbState('idle'); setAwakened(true); }, 5800);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [user]);

  // All markers aggregated across documents
  const allMarkers = useMemo(() => {
    const map = new Map<string, Marker & { history: Array<{ date: string; value: number; unit: string }> }>();
    for (const doc of documents) {
      if (!Array.isArray(doc.markers)) continue;
      for (const m of doc.markers) {
        const key = m.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, { ...m, source_doc: doc.name, date: doc.date, history: [] });
        }
        const existing = map.get(key)!;
        // Always keep latest value
        if (!existing.date || (doc.date && doc.date > existing.date)) {
          Object.assign(existing, { ...m, source_doc: doc.name, date: doc.date });
        }
        if (doc.date && m.value !== undefined) {
          existing.history.push({ date: doc.date, value: m.value, unit: m.unit });
        }
      }
    }
    return Array.from(map.values());
  }, [documents]);

  const markersByCategory = useMemo(() => {
    const cats: Record<string, typeof allMarkers> = {};
    for (const m of allMarkers) {
      const cat = m.category || 'other';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(m);
    }
    return cats;
  }, [allMarkers]);

  // Filter out wearable signal-quality metrics (GPS accuracy, signal strength etc.)
  // These are device readings, not health biomarkers — showing them as health flags destroys trust.
  const DEVICE_NOISE = /horizontal.acc|vertical.acc|gps.acc|gps.signal|gps.route|elevation.gain|elevation.change|route.duration|ecg.*raw|raw.signal|lead.*raw|signal.qual|status.code|supplemental.drop|leafy.green|microgreen|protein.intake|pathogenic.*count|uncertain.signif.*count/i;
  const healthMarkers = useMemo(() => allMarkers.filter(m => !DEVICE_NOISE.test(String(m.name || ''))), [allMarkers]);
  const flaggedMarkers = useMemo(() => healthMarkers.filter(m => m.status === 'elevated' || m.status === 'low'), [healthMarkers]);

  // Keep activeMarkerKeys in sync
  useEffect(() => {
    setActiveMarkerKeys(prev => {
      const next = new Set(prev);
      for (const doc of documents) {
        for (const m of doc.markers) next.add(m.name);
      }
      return next;
    });
  }, [documents]);

  // Save to localStorage when docs change
  const saveDocuments = useCallback((docOrDocs: Document | Document[]) => {
    const append = !Array.isArray(docOrDocs);
    setDocuments(prev => {
      const docs = append ? [...prev, docOrDocs as Document] : docOrDocs as Document[];
      try { localStorage.setItem('aellux_documents', JSON.stringify(docs)); } catch {}
      if (docs.length > 0) setPanel(p => p === 'upload' ? 'dashboard' : p);
      return docs;
    });
  }, []);

  const saveDocumentToDb = useCallback(async (doc: Document) => {
    if (!user?.id) return;
    await saveDocument(user.id, {
      name: doc.name, date: doc.date, document_type: doc.document_type,
      markers: doc.markers, summary: doc.summary, flags: doc.flags,
      recommendations: doc.recommendations, uploaded_at: doc.uploadedAt,
    });
  }, [user?.id]);

  // ── FILE PROCESSING ──────────────────────────────────────────────────────

  const processFile = async (file: File) => {
    setUploading(true);
    setOrbState('thinking');
    setUploadStatus(`Reading ${file.name}...`);

    try {
      let fileContent: string;
      const fileType = file.type;

      if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
        // Convert to base64
        fileContent = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
      } else {
        // Text/CSV
        fileContent = await file.text();
      }

      setUploadStatus(`Aellux is reading ${file.name}...`);

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent, fileType, fileName: file.name, maxTokens: 4000 }),
      });

      const extracted = await extractRes.json();

      if (extracted.error) {
        setUploadStatus(`Error: ${extracted.error}`);
        setOrbState('idle');
        setUploading(false);
        return;
      }

      const newDoc: Document = {
        id: `doc_${Date.now()}`,
        name: file.name,
        date: extracted.document_date || new Date().toISOString().slice(0, 10),
        document_type: extracted.document_type || 'other',
        markers: extracted.markers || [],
        summary: extracted.summary || '',
        flags: extracted.flags || [],
        recommendations: extracted.recommendations || [],
        uploadedAt: new Date().toISOString(),
      };

      saveDocuments(newDoc);
      saveDocumentToDb(newDoc);
      setUploadStatus(`✓ ${file.name} — extracted ${newDoc.markers.length} markers`);
      setOrbState('speaking');
      setResponse(extracted.summary || `I have extracted ${newDoc.markers.length} biomarkers from ${file.name}.`);
      setTimeout(() => setOrbState('idle'), 4000);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
      setOrbState('idle');
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(f => processFile(f));
  };

  // ── PERSONALISATION GENERATION ────────────────────────────────────────────

  const generatePersonalised = async (type: 'meals' | 'supps' | 'protocol' | 'synthesis') => {
    if (allMarkers.length === 0) { alert('Upload health documents first.'); return; }
    // Profile gate — Aellux can't generate calibrated recommendations without sex/age/weight
    if (profileLoaded && !isProfileComplete(profile)) {
      setShowProfileSetup(true);
      return;
    }
    setGeneratingType(type);
    setGenerationError(null);
    setOrbState('thinking');
    try {
      const res = await fetch('/api/personalise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: allMarkers,
          type,
          preference: type === 'meals' ? mealPreference : null,
          userId: user?.id,
          plan: isPro ? 'pro' : 'free',
        }),
      });
      const data = await res.json();
      // Surface API-level errors instead of silently storing a broken payload
      if (data && data.error) {
        console.error('[personalise] API error', data);
        const msg = `Generation failed: ${data.error}${data.raw ? ` — raw: ${String(data.raw).slice(0, 140)}` : ''}`;
        setGenerationError(msg);
        setResponse(msg);
        setOrbState('idle');
        return;
      }
      // Validate shape per-type so we never render a broken object
      const shapeOk =
        (type === 'meals' && Array.isArray(data.meals)) ||
        (type === 'supps' && Array.isArray(data.supplements)) ||
        (type === 'protocol' && Array.isArray(data.protocols)) ||
        (type === 'synthesis' && (data.aellux_voice || data.focus_priority));
      if (!shapeOk) {
        console.warn('[personalise] unexpected shape', { type, data });
        const msg = 'Aellux returned an unexpected response shape. Tap regenerate.';
        setGenerationError(msg);
        setResponse(msg);
        setOrbState('idle');
        return;
      }
      const updated = { ...personalised, [type]: data };
      setPersonalised(updated);
      try { localStorage.setItem('aellux_personalised', JSON.stringify(updated)); } catch {}
      if (user?.id) savePersonalised(user.id, type, data);
      setOrbState('speaking');
      setResponse(data.key_insight || data.aellux_voice || 'Your personalised protocol has been generated from your health data.');
      setTimeout(() => setOrbState('idle'), 4000);
    } catch (err: any) {
      console.error('[personalise] fetch failed', err);
      const msg = `Generation failed: ${err?.message || 'network error'}`;
      setGenerationError(msg);
      setResponse(msg);
      setOrbState('idle');
    } finally {
      setGeneratingType(null);
    }
  };

  // ── BIOLOGIC PROTOCOL (week, streaming) ─────────────────────────────────
  const generateBiologicProtocol = async () => {
    if (allMarkers.length === 0) { alert('Upload health documents first.'); return; }
    if (profileLoaded && !isProfileComplete(profile)) {
      setShowProfileSetup(true);
      return;
    }
    // Persist meal style preference for future generations
    try { localStorage.setItem('aellux_bp_meal_style', bpMealStyle); } catch {}

    setGeneratingType('week');
    setGenerationError(null);
    setOrbState('thinking');
    setWeekStreamDays([]);
    setWeekStreamStatus('Aellux is consulting your biology…');
    // Clear prior week so the UI shows streaming-in-progress state
    setPersonalised(p => ({ ...p, week: undefined }));

    try {
      const dayOnly = !isPro;
      const res = await fetch('/api/week-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markers: allMarkers,
          userId: user?.id,
          plan: isPro ? 'pro' : 'free',
          mealStyle: bpMealStyle,
          additionalGoal: bpAdditionalGoal.trim().slice(0, 240),
          dayOnly,
          isRegenerate: !!(personalised.week && Array.isArray(personalised.week.days) && personalised.week.days.length > 0),
          cycleLengthDays: bpCycleLengthDays,
          mealPrep: bpMealPrep,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: any = null;
      let receivedDays: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const eventMatch = evt.match(/^event: (.+)$/m);
          const dataMatch = evt.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const eventName = eventMatch[1].trim();
          let data: any;
          try { data = JSON.parse(dataMatch[1]); } catch { continue; }

          if (eventName === 'start') {
            setWeekStreamStatus(data.dayOnly ? 'Designing your Day 1 preview…' : 'Designing your 7-day protocol…');
          } else if (eventName === 'cached') {
            setWeekStreamStatus('Loading from cache…');
          } else if (eventName === 'day') {
            receivedDays = [...receivedDays.slice(0, data.index), data.day, ...receivedDays.slice(data.index + 1)];
            setWeekStreamDays([...receivedDays]);
            setWeekStreamStatus(`Day ${data.index + 1} ready · ${data.day.day}${data.day.theme ? ` (${data.day.theme})` : ''}`);
          } else if (eventName === 'parsing') {
            setWeekStreamStatus('Finalizing…');
          } else if (eventName === 'complete') {
            finalResult = data.result;
          } else if (eventName === 'error') {
            throw new Error(data.message || 'Generation error');
          }
        }
      }

      if (!finalResult || !Array.isArray(finalResult.days) || finalResult.days.length === 0) {
        throw new Error('No complete protocol received from server');
      }

      // Save final
      const updated = { ...personalised, week: finalResult };
      setPersonalised(updated);
      try { localStorage.setItem('aellux_personalised', JSON.stringify(updated)); } catch {}
      if (user?.id) savePersonalised(user.id, 'week', finalResult);

      // Clear any meal swaps from the prior week
      setMealSwaps({});
      try { localStorage.removeItem('aellux_meal_swaps'); } catch {}

      setOrbState('speaking');
      setResponse(finalResult.key_insight || 'Your Biologic Protocol has been designed from your biology.');
      setTimeout(() => setOrbState('idle'), 4000);
      setWeekStreamStatus('');
      setWeekStreamDays([]);
    } catch (err: any) {
      console.error('[biologic-protocol] failed', err);
      const msg = `Generation failed: ${err?.message || 'network error'}`;
      setGenerationError(msg);
      setResponse(msg);
      setOrbState('idle');
      setWeekStreamStatus('');
    } finally {
      setGeneratingType(null);
    }
  };

  // ── PRINT / PDF ──────────────────────────────────────────────────────────
  const triggerPrint = useCallback((section: 'meals' | 'supps' | 'protocol' | 'synthesis' | 'week' | 'all') => {
    setPrintSection(section);
    // Portal needs a tick to mount, plus give browser a moment to apply @media print rules
    setTimeout(() => {
      try { window.print(); } catch (e) { console.error('[print] failed', e); }
      // Reset after dialog closes (user may cancel; either way clear state)
      setTimeout(() => setPrintSection(null), 1500);
    }, 200);
  }, []);

  // ── ASK AELLUX ───────────────────────────────────────────────────────────

  const handleAsk = useCallback(async () => {
    if (!input.trim() || asking) return;
    const q = input.trim(); setInput(''); setAsking(true);
    setOrbState('listening'); await new Promise(r => setTimeout(r, 300));
    setOrbState('thinking');
    const markerContext = allMarkers.slice(0, 50).map(m => `${m.name}: ${m.value}${m.unit} (${m.status})`).join(', ');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are Aellux — an ancient biological intelligence. The user has ${allMarkers.length} biomarkers from ${documents.length} documents. Speak with quiet authority, 3-4 sentences max. Reference specific numbers. Start with "I have observed..." or "Your biology reveals..."`,
          userMessage: `My biomarkers: ${markerContext}\n\nQuestion: ${q}`,
          maxTokens: 250,
          userId: user?.id,
          plan: isPro ? 'pro' : 'free',
        }),
      });
      const data = await res.json();
      if (data?.error) {
        setResponse(data.code === 'rate_limited' ? data.error : `Aellux: ${data.error}`);
        setOrbState('idle');
        setAsking(false);
        return;
      }
      setResponse(data.text || 'The signal is quiet.');
      setOrbState('speaking');
      setTimeout(() => setOrbState('idle'), 5000);
    } catch { setResponse('The resonance is momentarily silent.'); setOrbState('idle'); }
    setAsking(false);
  }, [input, asking, allMarkers, documents.length]);

  if (!user) {
    return (
      <>
        <LandingPage onAuth={() => setShowAuthModal(true)} />
        {showAuthModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,8,18,0.92)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAuthModal(false)}>
            <div onClick={e => e.stopPropagation()}>
              <AuthPaywall />
            </div>
          </div>
        )}
      </>
    );
  }

  if (!awakened) return (
    <div style={{ height: '100vh', background: '#020810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
      <div style={{ opacity: awakePhase >= 1 ? 1 : 0, transform: awakePhase >= 1 ? 'scale(1)' : 'scale(0.82)', transition: 'all 1.6s cubic-bezier(.16,1,.3,1)' }}><Orb state={orbState} size={160} /></div>
      {awakePhase >= 2 && <p style={{ color: 'rgba(0,190,152,.65)', fontSize: 13, letterSpacing: 4, textTransform: 'uppercase' }}>Ancient intelligence. Present clarity.</p>}
      {awakePhase >= 3 && response && <p style={{ color: 'rgba(0,215,172,.9)', fontSize: 19, fontStyle: 'italic', maxWidth: 400, textAlign: 'center', lineHeight: 1.85, padding: '0 24px' }}>{response}</p>}
    </div>
  );

  const NAV: Array<{ id: Panel; label: string; count?: number }> = [
    { id: 'upload',    label: '+ Upload Records',  count: documents.length },
    { id: 'dashboard', label: 'Health Dashboard',  count: allMarkers.length },
    { id: 'week',      label: 'Biologic Protocol'                           },
    // Legacy — admin only
    ...(isAdmin ? [
      { id: 'protocols' as Panel, label: 'Protocols & Plans (legacy)' },
      { id: 'ask'       as Panel, label: 'Ask Aellux (full)' },
      { id: 'meals'     as Panel, label: 'Meal Protocol (legacy)' },
      { id: 'supps'     as Panel, label: 'Supp Stack (legacy)' },
      { id: 'protocol'  as Panel, label: 'Daily Protocol (legacy)' },
      { id: 'admin'     as Panel, label: 'Admin' },
    ] : []),
  ];

  const S = {
    label:  { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: 'rgba(0,175,140,.65)' },
    card:   { background: 'rgba(0,6,14,.82)', border: '1px solid rgba(0,165,132,.14)', borderRadius: 6 },
    italic: { fontSize: 17, fontStyle: 'italic' as const, color: 'rgba(0,210,170,.88)', lineHeight: 1.9 },
  };

  const categories = Object.keys(markersByCategory);
  const displayMarkers = categoryFilter === 'all' ? allMarkers : (markersByCategory[categoryFilter] || []);

  return (
    <div className="aellux-layout">
      {/* ── MOBILE TOP BAR (visible only <768px) ── */}
      <div className="aellux-mobile-topbar">
        <button className="aellux-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="aellux-mobile-title">
          {panel === 'upload' && 'Upload'}
          {panel === 'dashboard' && 'Dashboard'}
          {panel === 'week' && 'Biologic Protocol'}
          {panel === 'trends' && 'Health Dashboard'}
          {panel === 'protocols' && 'Protocols'}
          {panel === 'profile' && 'Profile'}
          {panel === 'ask' && 'Ask Aellux'}
          {panel === 'meals' && 'Meal Protocol'}
          {panel === 'supps' && 'Supp Stack'}
          {panel === 'protocol' && 'Daily Protocol'}
          {panel === 'admin' && 'Admin'}
        </div>
        <div className="aellux-mobile-orb" />
      </div>

      {/* ── DRAWER BACKDROP (mobile only) ── */}
      <div className={`aellux-mobile-backdrop ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />

      {/* ── LEFT COLUMN / DRAWER ── */}
      <div className={`aellux-lc ${drawerOpen ? 'open' : ''}`}>
        <div onClick={() => { setPanel('upload'); setDrawerOpen(false); }} style={{ cursor: 'pointer', marginBottom: 22 }}><Orb state={orbState} size={110} /></div>

        <div style={{ width: '100%', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 18 }}>
          {NAV.map(({ id, label, count }) => (
            <button key={id} className={`aellux-nav-item ${panel === id ? 'active' : ''}`} onClick={() => { setPanel(id); setDrawerOpen(false); }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: panel === id ? 'rgba(0,210,165,.9)' : 'rgba(0,130,105,.3)', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ flex: 1 }}>{label}</span>
              {count !== undefined && count > 0 && (
                <span style={{ fontSize: 10, background: 'rgba(0,195,155,.12)', color: 'rgba(0,195,155,.65)', padding: '1px 6px', borderRadius: 10, letterSpacing: 0 }}>{count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="aellux-divider" style={{ margin: '0 auto 16px' }} />

        {/* Stats summary */}
        {documents.length > 0 && (
          <div style={{ padding: '0 14px', width: '100%', marginBottom: 14 }}>
            <div style={{ background: 'rgba(0,8,18,.6)', border: '1px solid rgba(0,165,132,.1)', borderRadius: 4, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,165,132,.5)', marginBottom: 6 }}>Health Profile</div>
              <div style={{ fontSize: 14, color: 'rgba(0,200,165,.75)', marginBottom: 3 }}>{allMarkers.length} biomarkers</div>
              <div style={{ fontSize: 14, color: 'rgba(0,185,150,.6)', marginBottom: 3 }}>{documents.length} documents</div>
              {flaggedMarkers.length > 0 && <div style={{ fontSize: 14, color: 'rgba(255,160,60,.8)' }}>⚠ {flaggedMarkers.length} need attention</div>}
            </div>
            {profileLoaded && !isProfileComplete(profile) && (
              <button onClick={() => setShowProfileSetup(true)}
                style={{ width: '100%', marginTop: 8, fontSize: 11, letterSpacing: '0.06em', color: 'rgba(255,210,100,1)', background: 'rgba(255,200,80,.08)', border: '1px solid rgba(255,200,80,.4)', borderRadius: 4, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                ⚠ Complete your profile →<br />
                <span style={{ fontSize: 10, color: 'rgba(255,210,100,.65)', letterSpacing: 0 }}>Aellux needs sex, age, weight</span>
              </button>
            )}
          </div>
        )}

        <div className="aellux-speak-wrapper" style={{ padding: '0 14px', width: '100%', position: 'relative' }}>
          <input className="aellux-speak-input" placeholder="Ask Aellux..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            onFocus={() => !asking && setOrbState('listening')}
            onBlur={() => orbState === 'listening' && setOrbState('idle')}
          />
          <button onClick={handleAsk} disabled={asking || !input.trim()} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,180,145,.55)', fontSize: 15, fontFamily: 'inherit' }}>↵</button>
        </div>

        {response && (
          <div style={{ padding: '10px 14px 0', width: '100%' }}>
            <div className={`aellux-response ${response ? 'visible' : ''}`}>{response}</div>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 14px', width: '100%', marginBottom: 12 }}>
          <div style={{ background: 'rgba(0,6,14,.7)', border: '1px solid rgba(0,165,132,.1)', borderRadius: 4, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 13, color: 'rgba(0,190,155,.72)' }}>{user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 11, padding: '2px 8px', border: isPro ? '1px solid rgba(0,195,155,.4)' : '1px solid rgba(0,155,125,.2)', borderRadius: 10, color: isPro ? 'rgba(0,210,165,.85)' : 'rgba(0,155,125,.5)', letterSpacing: 1, textTransform: 'uppercase' }}>{isPro ? 'Pro' : 'Free'}</div>
            </div>
            {!isPro && (
              <button onClick={() => setShowUpgrade(true)} style={{ width: '100%', fontSize: 13, color: 'rgba(0,210,165,.85)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.25)', borderRadius: 3, padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>Upgrade to Pro →</button>
            )}
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,210,165,.14)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => setPanel('profile')} style={{ width: '100%', fontSize: 13, color: 'rgba(0,225,180,.9)', background: 'rgba(0,195,155,.08)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>⚙</span> Profile &amp; Settings
              </button>
              <button onClick={signOut} style={{ width: '100%', fontSize: 13, color: 'rgba(255,110,110,.9)', background: 'rgba(255,80,80,.06)', border: '1px solid rgba(255,90,90,.2)', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>→</span> Sign Out
              </button>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', width: 1.5, height: 1.5, borderRadius: '50%', background: 'rgba(0,200,160,.2)', left: `${12 + (i * 19.3) % 70}%`, top: `${8 + (i * 22.7) % 80}%`, animation: `aellux-star-twinkle ${3 + (i % 4)}s ${i * 0.5}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#020810' }}>
        <div className="aellux-topbar">
          <span style={{ fontSize: 15, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(0,195,155,.78)' }}>
            {NAV.find(n => n.id === panel)?.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(0,200,160,.75)', boxShadow: '0 0 6px rgba(0,200,160,.4)' }} />
            <span style={{ fontSize: 12, letterSpacing: 2, color: 'rgba(0,165,135,.62)', textTransform: 'uppercase' }}>Live</span>
          </div>
        </div>

        <div className="aellux-main" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── UPLOAD ── */}
          {panel === 'upload' && (
            <div>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'rgba(0,210,165,.6)' : 'rgba(0,175,138,.2)'}`,
                  borderRadius: 8, padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'rgba(0,40,32,.3)' : 'rgba(0,6,14,.6)',
                  transition: 'all .2s', marginBottom: 28,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>⊕</div>
                <div style={{ fontSize: 20, color: 'rgba(0,210,165,.85)', marginBottom: 8, fontWeight: 500 }}>Drop your health records here</div>
                <div style={{ fontSize: 16, color: 'rgba(0,175,142,.6)', marginBottom: 16, lineHeight: 1.7 }}>
                  Blood panels · DEXA scans · Sleep reports · Microbiome results<br />
                  Wearable exports · Physician notes · Lab results
                </div>
                <div style={{ fontSize: 14, color: 'rgba(0,155,125,.45)' }}>PDF · CSV · JPG · PNG · TXT — Aellux reads everything</div>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.csv,.txt,.json,.jpg,.jpeg,.png,.xml" style={{ display: 'none' }} onChange={e => e.target.files && handleFiles(e.target.files)} />
              </div>

              {uploading && (
                <div style={{ ...S.card, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,200,165,.8)', animation: 'aellux-star-twinkle 1s ease-in-out infinite' }} />
                    <div style={{ fontSize: 16, color: 'rgba(0,200,165,.85)' }}>{uploadStatus}</div>
                  </div>
                </div>
              )}

              {/* Uploaded documents */}
              {documents.length > 0 && (
                <div>
                  <p style={{ ...S.label, marginBottom: 14 }}>Uploaded Documents ({documents.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {documents.map(doc => (
                      <div key={doc.id} style={{ ...S.card, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                              <span style={{ fontSize: 17, color: 'rgba(0,215,172,.92)', fontWeight: 500 }}>{doc.name}</span>
                              <span style={{ fontSize: 11, padding: '2px 8px', border: '1px solid rgba(0,175,138,.25)', borderRadius: 2, color: 'rgba(0,185,148,.6)', letterSpacing: 1, textTransform: 'uppercase' }}>{doc.document_type}</span>
                            </div>
                            <div style={{ fontSize: 14, color: 'rgba(0,175,142,.6)', marginBottom: 8 }}>{doc.date} · {doc.markers.length} markers extracted</div>
                            {doc.summary && <div style={{ fontSize: 15, fontStyle: 'italic', color: 'rgba(0,195,160,.72)', lineHeight: 1.75 }}>{doc.summary}</div>}
                            {doc.flags.length > 0 && (
                              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {doc.flags.map((f, i) => (
                                  <span key={i} style={{ fontSize: 13, padding: '3px 10px', background: 'rgba(255,130,60,.08)', border: '1px solid rgba(255,130,60,.25)', borderRadius: 3, color: 'rgba(255,160,80,.85)' }}>⚠ {f}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => saveDocuments(documents.filter(d => d.id !== doc.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,150,120,.35)', fontSize: 16, padding: 4 }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {documents.length === 0 && (
                <div style={{ ...S.card, padding: '24px', marginTop: 20 }}>
                  <div style={{ ...S.label, marginBottom: 14 }}>What Aellux reads and understands</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {[
                      ['🩸 Blood Panels', 'CBC, CMP, lipids, hormones, vitamins, minerals, inflammatory markers'],
                      ['📊 Wearable Data', 'Apple Health, Garmin, Oura, Whoop CSV exports — HRV, sleep, steps, VO2max'],
                      ['🧬 DEXA / Body Comp', 'Body fat %, lean mass, bone density, visceral fat estimates'],
                      ['😴 Sleep Reports', 'Sleep stages, deep sleep duration, sleep efficiency, disturbances'],
                      ['🦠 Microbiome', 'Gut bacteria ratios, diversity scores, pathogen flags'],
                      ['📋 Physician Notes', 'Clinical observations, diagnoses, medication effects'],
                    ].map(([title, desc]) => (
                      <div key={String(title)} style={{ padding: '14px 16px', background: 'rgba(0,8,16,.5)', border: '1px solid rgba(0,165,132,.1)', borderRadius: 5 }}>
                        <div style={{ fontSize: 16, color: 'rgba(0,210,170,.85)', marginBottom: 5 }}>{title}</div>
                        <div style={{ fontSize: 14, color: 'rgba(0,165,132,.6)', lineHeight: 1.6 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {panel === 'dashboard' && (
            <div>
              {allMarkers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: 18, color: 'rgba(0,185,150,.6)', marginBottom: 12 }}>No health data yet</div>
                  <button onClick={() => setPanel('upload')} style={{ fontSize: 16, color: 'rgba(0,210,165,.85)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 4, padding: '10px 24px', cursor: 'pointer', fontFamily: 'inherit' }}>Upload your first document →</button>
                </div>
              ) : (
                <>
                  <BodyHero personalised={personalised} />
                  {/* ── AELLUX DEEP SYNTHESIS ── */}
                  {personalised.synthesis && (() => {
                    const syn = personalised.synthesis;
                    return (
                      <div style={{ marginBottom: 28 }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,210,165,.55)', marginBottom: 4 }}>Aellux Synthesis</div>
                            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 22, color: 'rgba(220,255,235,.95)', fontWeight: 500 }}>Your Biologic Read</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => triggerPrint('synthesis')} style={{ fontSize: 12, color: 'rgba(0,225,180,.95)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.35)', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>↓ PDF</button>
                            <button onClick={() => triggerPrint('all')} style={{ fontSize: 12, color: 'rgba(0,225,180,.75)', background: 'rgba(0,195,155,.06)', border: '1px solid rgba(0,195,155,.2)', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Full Report</button>
                          </div>
                        </div>

                        {/* Opening voice */}
                        <div style={{ padding: '22px 26px', background: 'rgba(0,8,18,.6)', border: '1px solid rgba(0,210,165,.2)', borderLeft: '3px solid rgba(0,225,180,.6)', borderRadius: 8, marginBottom: 14 }}>
                          <p style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 20, color: 'rgba(220,255,235,.97)', lineHeight: 1.85, margin: 0, fontStyle: 'italic' }}>{syn.aellux_voice}</p>
                        </div>

                        {/* Bio age + focus strip */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                          {syn.biological_age_estimate && (
                            <div style={{ flex: 1, minWidth: 140, padding: '12px 16px', background: 'rgba(0,210,165,.06)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 7 }}>
                              <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Biological age</div>
                              <div style={{ fontSize: 24, color: 'rgba(0,240,190,1)', fontFamily: 'EB Garamond, Georgia, serif', fontWeight: 500 }}>{syn.biological_age_estimate}</div>
                              {syn.bio_age_gap && <div style={{ fontSize: 13, color: 'rgba(0,210,165,.65)', marginTop: 2 }}>{syn.bio_age_gap}</div>}
                            </div>
                          )}
                          {syn.focus_priority && (
                            <div style={{ flex: 3, minWidth: 200, padding: '12px 16px', background: 'rgba(255,190,60,.05)', border: '1px solid rgba(255,190,60,.25)', borderRadius: 7 }}>
                              <div style={{ fontSize: 11, color: 'rgba(255,190,80,.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Your focus this week</div>
                              <div style={{ fontSize: 16, color: 'rgba(255,220,120,1)', lineHeight: 1.5, fontWeight: 500 }}>{syn.focus_priority}</div>
                            </div>
                          )}
                        </div>

                        {/* What you are feeling */}
                        {syn.what_you_are_feeling && (
                          <div style={{ padding: '18px 22px', background: 'rgba(167,139,250,.04)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 8, marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: 'rgba(167,139,250,.8)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>What you are likely feeling right now</div>
                            <p style={{ fontSize: 16, color: 'rgba(220,200,255,.92)', lineHeight: 1.75, margin: 0 }}>{syn.what_you_are_feeling}</p>
                          </div>
                        )}

                        {/* The real story */}
                        {syn.the_real_story && (
                          <div style={{ padding: '18px 22px', background: 'rgba(0,8,18,.5)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 8, marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>The real story — what your markers are saying together</div>
                            <p style={{ fontSize: 16, color: 'rgba(200,245,225,.9)', lineHeight: 1.8, margin: 0 }}>{syn.the_real_story}</p>
                          </div>
                        )}

                        {/* System dance — marker interactions */}
                        {syn.system_dance && syn.system_dance.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>How your systems are dancing together</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {syn.system_dance.map((dance: any, i: number) => (
                                <div key={i} style={{ padding: '16px 20px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 15, color: 'rgba(220,255,235,.95)', fontWeight: 500 }}>{dance.title}</div>
                                    {dance.markers_involved && dance.markers_involved.map((mk: string) => (
                                      <span key={mk} style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(0,210,165,.1)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 10, color: 'rgba(0,225,180,.85)', letterSpacing: '0.04em' }}>{mk}</span>
                                    ))}
                                  </div>
                                  <p style={{ fontSize: 15, color: 'rgba(180,240,210,.88)', lineHeight: 1.7, margin: '0 0 6px' }}>{dance.explanation}</p>
                                  {dance.impact && <p style={{ fontSize: 14, color: 'rgba(255,200,100,.8)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>→ {dance.impact}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Honest combat */}
                        {syn.honest_combat && syn.honest_combat.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>How to honestly move the needle</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {syn.honest_combat.sort((a: any, b: any) => (a.priority || 9) - (b.priority || 9)).map((combat: any, i: number) => (
                                <div key={i} style={{ padding: '16px 20px', background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.18)', borderRadius: 8, display: 'flex', gap: 14 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: 'rgba(52,211,153,.9)', fontFamily: 'EB Garamond, Georgia, serif', fontWeight: 600 }}>{i + 1}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 15, color: 'rgba(180,255,210,.95)', fontWeight: 500, marginBottom: 6 }}>{combat.lever}</div>
                                    <p style={{ fontSize: 14, color: 'rgba(140,230,180,.8)', lineHeight: 1.65, margin: '0 0 6px', fontStyle: 'italic' }}>{combat.why_it_works}</p>
                                    <p style={{ fontSize: 15, color: 'rgba(200,245,220,.9)', lineHeight: 1.7, margin: 0 }}>{combat.how}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* What's working */}
                        {syn.what_is_working && syn.what_is_working.length > 0 && (
                          <div style={{ padding: '16px 20px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 8 }}>
                            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>What is working — protect these</div>
                            {syn.what_is_working.map((win: string, i: number) => (
                              <div key={i} style={{ fontSize: 15, color: 'rgba(180,255,220,.9)', lineHeight: 1.65, marginBottom: 5, display: 'flex', gap: 8 }}>
                                <span style={{ color: 'rgba(52,211,153,.8)', flexShrink: 0 }}>✓</span> {win}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Flags */}
                  {flaggedMarkers.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,175,70,.9)', marginBottom: 14, fontWeight: 500 }}>⚠ Needs Attention ({flaggedMarkers.length})</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {flaggedMarkers.map(m => (
                          <div key={m.name} onClick={() => setSelectedMarker(m)} style={{ ...S.card, padding: '14px 16px', cursor: 'pointer', borderColor: 'rgba(255,130,60,.32)', transition: 'border-color .2s' }}>
                            <div style={{ fontSize: 18, color: 'rgba(255,215,155,1)', fontWeight: 500, marginBottom: 6, lineHeight: 1.2 }}>{m.name}</div>
                            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,185,100,.8)', marginBottom: 6 }}>{m.category}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                              <span style={{ fontSize: 26, color: STATUS_COLORS[m.status] || 'rgba(255,140,60,.9)', fontWeight: 500 }}>{m.value}</span>
                              <span style={{ fontSize: 13, color: 'rgba(0,160,130,.5)' }}>{m.unit}</span>
                            </div>
                            {m.reference_range_low !== undefined && (
                              <div style={{ fontSize: 13, color: 'rgba(0,155,125,.45)', marginTop: 4 }}>Ref: {m.reference_range_low}–{m.reference_range_high}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category filter */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                    <button className={`aellux-rtab ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')} style={{ fontFamily: 'inherit' }}>All ({allMarkers.length})</button>
                    {categories.map(cat => (
                      <button key={cat} className={`aellux-rtab ${categoryFilter === cat ? 'active' : ''}`} onClick={() => setCategoryFilter(cat)} style={{ fontFamily: 'inherit', borderColor: `${CATEGORY_COLORS[cat]}40`, color: categoryFilter === cat ? CATEGORY_COLORS[cat] : 'rgba(0,160,130,.55)' }}>
                        {cat} ({markersByCategory[cat]?.length})
                      </button>
                    ))}
                  </div>

                  {/* Markers grid — unified with trend data */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                    {displayMarkers.map(m => {
                      const history: {value: any; date: string}[] = ((m as any).history) || [{ value: m.value, date: (m as any).date || '' }];
                      const nums = history.map((v: any) => parseFloat(v.value)).filter((n: any) => !isNaN(n));
                      const numVal = parseFloat(String(m.value ?? 0));
                      const REF_CARD: Record<string, {low:number;high:number}> = {
                        'Total Testosterone':{low:250,high:900},'Free Testosterone':{low:46,high:224},
                        'Estrogen':{low:15,high:32},'SHBG':{low:10,high:57},'Free T3':{low:2.3,high:4.4},
                        'Ferritin':{low:30,high:300},'Vitamin D':{low:20,high:80},'ApoB':{low:40,high:120},
                        'LDL':{low:0,high:160},'HDL':{low:40,high:100},'Triglycerides':{low:0,high:200},
                        'HbA1c':{low:4.5,high:6.5},'Fasting Glucose':{low:70,high:126},'CRP':{low:0,high:10},
                        'TSH':{low:0.4,high:4.0},'IGF-1':{low:100,high:300},'DHEA-S':{low:70,high:430},
                        'HDL Cholesterol':{low:40,high:100},'LDL Cholesterol':{low:0,high:160},
                        'Total Cholesterol':{low:0,high:200},'Triglycerides/HDL Ratio':{low:0,high:3.5},
                      };
                      const ref = REF_CARD[m.name] || (m.reference_range_low != null ? {low: m.reference_range_low!, high: m.reference_range_high!} : null);
                      const statusColor = !isNaN(numVal) && ref
                        ? (numVal < ref.low ? '#fb923c' : numVal > ref.high ? '#f87171' : '#34d399')
                        : (m.status === 'elevated' || m.status === 'high' ? '#f87171' : m.status === 'low' ? '#fb923c' : 'rgba(0,210,165,.8)');
                      const trend = nums.length > 1 ? nums[nums.length-1] - nums[0] : 0;
                      const tLabel = trend === 0 ? '' : (trend > 0 ? '▲' : '▼') + ' ' + Math.abs(trend).toFixed(1);
                      const sMin = nums.length ? Math.min(...nums) : 0;
                      const sMax = nums.length ? Math.max(...nums) : 1;
                      const sRange = sMax - sMin || 1;
                      const SW = 72, SH = 26;
                      const sPts = nums.map((v:number,i:number) => `${(i/Math.max(nums.length-1,1))*SW},${SH-3-((v-sMin)/sRange)*(SH-6)}`).join(' ');
                      const isFlagged = m.status === 'elevated' || m.status === 'high' || m.status === 'low';
                      let barEl = null;
                      if (ref && !isNaN(numVal)) {
                        const pad = (ref.high - ref.low) * 0.15;
                        const dMin = Math.max(0, ref.low - pad), dMax = ref.high + pad;
                        const dSpan = dMax - dMin;
                        const pct = (v:number) => Math.min(100,Math.max(0,((v-dMin)/dSpan)*100));
                        barEl = (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ position:'relative',height:6,borderRadius:6,background:'rgba(0,210,165,.08)' }}>
                              <div style={{ position:'absolute',top:0,height:'100%',borderRadius:6,left:`${pct(ref.low)}%`,width:`${Math.max(0,pct(ref.high)-pct(ref.low))}%`,background:'rgba(0,210,165,.14)' }} />
                              <div style={{ position:'absolute',top:'50%',left:`${pct(numVal)}%`,transform:'translate(-50%,-50%)',width:12,height:12,borderRadius:'50%',background:statusColor,border:'2px solid rgba(2,12,22,1)',boxShadow:`0 0 6px ${statusColor}88`,zIndex:2 }} />
                            </div>
                            <div style={{ display:'flex',justifyContent:'space-between',marginTop:4 }}>
                              <span style={{ fontSize:11,color:'rgba(0,210,165,.4)' }}>Low {ref.low}</span>
                              <span style={{ fontSize:11,color:'rgba(0,210,165,.4)' }}>High {ref.high}{m.unit ? ' '+m.unit : ''}</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={m.name} onClick={() => setSelectedMarker(m)}
                          style={{ background:'rgba(0,210,165,.04)', border:`1px solid ${isFlagged ? 'rgba(255,150,60,.3)' : 'rgba(0,210,165,.16)'}`, borderRadius:10, padding:'16px 18px', cursor:'pointer', transition:'border-color .2s,background .2s' }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,225,180,.45)';e.currentTarget.style.background='rgba(0,210,165,.08)';}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=isFlagged?'rgba(255,150,60,.3)':'rgba(0,210,165,.16)';e.currentTarget.style.background='rgba(0,210,165,.04)';}}>
                          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3 }}>
                            <div style={{ fontSize:16,color:'rgba(220,255,235,1)',fontFamily:'EB Garamond,Georgia,serif',fontWeight:500,lineHeight:1.3,flex:1,paddingRight:8 }}>{m.name}</div>
                            {tLabel && <span style={{ fontSize:12,color:trend>0?'#34d399':'#f87171',flexShrink:0,marginTop:2 }}>{tLabel}</span>}
                          </div>
                          <div style={{ fontSize:11,color:'rgba(0,210,165,.45)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10 }}>{m.category}</div>
                          <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8,marginBottom:2 }}>
                            <div>
                              <div style={{ display:'flex',alignItems:'baseline',gap:5 }}>
                                <span style={{ fontSize:26,color:statusColor,fontFamily:'EB Garamond,Georgia,serif',fontWeight:500 }}>{m.value}</span>
                                <span style={{ fontSize:13,color:'rgba(0,210,165,.4)' }}>{m.unit}</span>
                              </div>
                              {m.status && <div style={{ fontSize:11,color:statusColor,letterSpacing:'0.06em',textTransform:'uppercase',marginTop:2 }}>{m.status}</div>}
                            </div>
                            {nums.length > 1 && (
                              <svg viewBox={`0 0 ${SW} ${SH}`} width={SW} height={SH} style={{ flexShrink:0,opacity:0.8 }}>
                                <polyline points={sPts} fill="none" stroke={statusColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                {nums.map((v:number,i:number)=><circle key={i} cx={(i/Math.max(nums.length-1,1))*SW} cy={SH-3-((v-sMin)/sRange)*(SH-6)} r="2" fill={statusColor}/>)}
                              </svg>
                            )}
                          </div>
                          {barEl}
                          {!barEl && <div style={{ marginTop:10,height:4,borderRadius:4,background:'rgba(0,210,165,.06)' }} />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Generate synthesis */}
                  {!personalised.synthesis && allMarkers.length > 0 && (
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      {generationError && (
                        <div style={{ marginBottom: 16, padding: '12px 18px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 6, color: 'rgba(255,200,180,1)', fontSize: 14, textAlign: 'left', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,160,100,.85)', marginBottom: 4 }}>⚠ Generation Error</div>
                          {generationError}
                        </div>
                      )}
                      <button onClick={() => generatePersonalised('synthesis')} disabled={generatingType === 'synthesis'}
                        style={{ fontSize: 16, color: 'rgba(0,210,165,.9)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '12px 28px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {generatingType === 'synthesis' ? 'Aellux is synthesising...' : 'Generate full health synthesis →'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── MEALS ── */}
          {panel === 'meals' && (
            <div>
              {!isPro ? (
                <ProGate isPro={isPro} onUpgrade={() => setShowUpgrade(true)} feature="Meal Protocol" />
              ) : !personalised.meals ? (
                <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                  <p style={{ fontSize: 18, color: 'rgba(0,190,155,.75)', marginBottom: 10, lineHeight: 1.7 }}>
                    {allMarkers.length === 0 ? 'Upload your health documents first.' : `Aellux will design your meal protocol from your ${allMarkers.length} biomarkers.`}
                  </p>
                  <p style={{ fontSize: 15, color: 'rgba(0,165,132,.5)', marginBottom: 28, lineHeight: 1.7 }}>
                    Every meal will be specifically engineered to address your actual results — not a generic template.
                  </p>
                  {generationError && (
                    <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 6, color: 'rgba(255,200,180,1)', fontSize: 14, textAlign: 'left', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,160,100,.85)', marginBottom: 4 }}>⚠ Generation Error</div>
                      {generationError}
                    </div>
                  )}
                  <button onClick={() => generatePersonalised('meals')} disabled={generatingType === 'meals' || allMarkers.length === 0}
                    style={{ fontSize: 17, color: 'rgba(0,210,165,.9)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '14px 32px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {generatingType === 'meals' ? '⟳ Aellux is designing your meals...' : 'Generate my personalised meal protocol →'}
                  </button>
                </div>
              ) : (
                <div>
                  {personalised.meals.key_insight && (
                    <div style={{ ...S.card, padding: '18px 22px', marginBottom: 22, borderColor: 'rgba(0,195,155,.2)' }}>
                      <div style={{ ...S.label, marginBottom: 8 }}>Key Nutritional Insight</div>
                      <p style={{ ...S.italic, margin: 0 }}>{personalised.meals.key_insight}</p>
                    </div>
                  )}
                  {personalised.meals.daily_targets && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
                      {Object.entries(personalised.meals.daily_targets).map(([k, v]) => (
                        <div key={k} style={{ ...S.card, flex: 1, padding: '14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, color: 'rgba(0,215,172,.9)', fontWeight: 500 }}>{String(v)}</div>
                          <div style={{ ...S.label, fontSize: 11, marginTop: 4 }}>{k}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(personalised.meals.meals || []).map((meal: any, i: number) => {
                    const isOpen = expandedItem === `meal-${i}`;
                    return (
                      <div key={i} style={{ ...S.card, marginBottom: 10, overflow: 'hidden', border: `1px solid ${isOpen ? 'rgba(0,192,152,.28)' : 'rgba(0,165,132,.13)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', cursor: 'pointer' }} onClick={() => setExpandedItem(isOpen ? null : `meal-${i}`)}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                              <span style={{ ...S.label }}>{meal.time}</span>
                              {meal.targets?.map((t: string, ti: number) => <span key={ti} style={{ fontSize: 11, padding: '2px 8px', border: '1px solid rgba(0,175,138,.25)', borderRadius: 2, color: 'rgba(0,185,148,.65)', letterSpacing: 1 }}>{t}</span>)}
                            </div>
                            <div style={{ fontSize: 20, color: 'rgba(0,215,172,.94)', fontWeight: 500 }}>{meal.name}</div>
                          </div>
                          {meal.macros && (
                            <div style={{ display: 'flex', gap: 16, fontSize: 15, color: 'rgba(0,175,142,.72)' }}>
                              <span>{meal.macros.cal} cal</span>
                              <span>{meal.macros.p}g protein</span>
                            </div>
                          )}
                          <div style={{ fontSize: 20, color: 'rgba(0,175,140,.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</div>
                        </div>
                        {isOpen && (
                          <div style={{ padding: '0 22px 22px', borderTop: '1px solid rgba(0,165,132,.1)' }}>
                            <p style={{ fontSize: 16, fontStyle: 'italic', color: 'rgba(0,200,162,.78)', lineHeight: 1.8, margin: '16px 0 18px', paddingLeft: 14, borderLeft: '2px solid rgba(0,190,152,.28)' }}>{meal.why}</p>
                            {meal.items && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
                                {meal.items.map((item: string, ii: number) => (
                                  <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: 'rgba(0,200,165,.85)' }}>
                                    <span style={{ color: 'rgba(0,175,140,.4)', fontSize: 10 }}>◆</span>{item}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {personalised.meals.foods_to_avoid?.length > 0 && (
                    <div style={{ ...S.card, padding: '18px 22px', marginTop: 20 }}>
                      <div style={{ ...S.label, color: 'rgba(255,150,60,.65)', marginBottom: 14 }}>Foods to avoid based on your markers</div>
                      {personalised.meals.foods_to_avoid.map((f: string, i: number) => (
                        <div key={i} style={{ fontSize: 15, color: 'rgba(255,160,70,.78)', marginBottom: 7, paddingLeft: 12, borderLeft: '2px solid rgba(255,130,60,.2)' }}>✕ {f}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,210,165,.5)', letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>Diet Style</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {[['none','No Preference'],['vegetarian','Vegetarian'],['vegan','Vegan'],['mediterranean','Mediterranean'],['paleo','Paleo'],['keto','Keto'],['indian','Indian'],['mexican','Mexican'],['japanese','Japanese'],['halal','Halal']].map(([val, label]) => (
                        <button key={val} onClick={() => setMealPreference(val)}
                          style={{ padding: '5px 14px', borderRadius: 20, border: mealPreference === val ? '1px solid rgba(0,210,165,.7)' : '1px solid rgba(0,210,165,.2)', background: mealPreference === val ? 'rgba(0,210,165,.12)' : 'transparent', color: mealPreference === val ? 'rgba(0,210,165,.95)' : 'rgba(0,210,165,.5)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => triggerPrint('meals')} style={{ fontSize: 13, color: 'rgba(0,225,180,.95)', background: 'rgba(0,195,155,.14)', border: '1px solid rgba(0,195,155,.45)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>↓ Download / Print</button>
                    <button onClick={() => triggerPrint('all')} style={{ fontSize: 13, color: 'rgba(0,225,180,.85)', background: 'rgba(0,195,155,.08)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>Full Aellux Report</button>
                    <button onClick={() => { setPersonalised(p => ({ ...p, meals: undefined })); }} style={{ fontSize: 13, color: 'rgba(0,150,120,.45)', background: 'none', border: '1px solid rgba(0,150,120,.2)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUPPLEMENTS ── */}
          {panel === 'supps' && (
            <div>
              {!personalised.supps ? (
                <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                  <p style={{ fontSize: 18, color: 'rgba(0,190,155,.75)', marginBottom: 10, lineHeight: 1.7 }}>
                    {allMarkers.length === 0 ? 'Upload your health documents first.' : `Aellux will build your supplement stack from your ${allMarkers.length} biomarkers.`}
                  </p>
                  <p style={{ fontSize: 15, color: 'rgba(0,165,132,.5)', marginBottom: 28, lineHeight: 1.7 }}>No generic recommendations. Only what your actual biology requires.</p>
                  {generationError && (
                    <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 6, color: 'rgba(255,200,180,1)', fontSize: 14, textAlign: 'left', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,160,100,.85)', marginBottom: 4 }}>⚠ Generation Error</div>
                      {generationError}
                    </div>
                  )}
                  <button onClick={() => generatePersonalised('supps')} disabled={generatingType === 'supps' || allMarkers.length === 0}
                    style={{ fontSize: 17, color: 'rgba(0,210,165,.9)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '14px 32px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {generatingType === 'supps' ? '⟳ Aellux is building your stack...' : 'Generate my personalised supplement stack →'}
                  </button>
                </div>
              ) : (
                <div>
                  {personalised.supps.key_insight && (
                    <div style={{ ...S.card, padding: '18px 22px', marginBottom: 22, borderColor: 'rgba(0,195,155,.2)' }}>
                      <div style={{ ...S.label, marginBottom: 8 }}>Key Insight</div>
                      <p style={{ ...S.italic, margin: 0 }}>{personalised.supps.key_insight}</p>
                    </div>
                  )}
                  {[1, 2, 3].map(priority => {
                    const supps = (personalised.supps.supplements || []).filter((s: any) => s.priority === priority);
                    if (!supps.length) return null;
                    const pLabel = priority === 1 ? 'Priority 1 — Foundation' : priority === 2 ? 'Priority 2 — Optimisation' : 'Priority 3 — Optional';
                    return (
                      <div key={priority} style={{ marginBottom: 28 }}>
                        <p style={{ ...S.label, marginBottom: 12 }}>{pLabel}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {supps.map((s: any, i: number) => {
                            const isOpen = expandedItem === `supp-${priority}-${i}`;
                            const sc = s.status === 'active' ? 'rgba(0,200,162,.85)' : s.status === 'consider' ? 'rgba(255,190,60,.85)' : 'rgba(0,165,132,.55)';
                            return (
                              <div key={i} style={{ ...S.card, overflow: 'hidden', border: `1px solid ${isOpen ? 'rgba(0,192,152,.28)' : 'rgba(0,165,132,.13)'}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', cursor: 'pointer' }} onClick={() => setExpandedItem(isOpen ? null : `supp-${priority}-${i}`)}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                                      <span style={{ fontSize: 19, fontWeight: 500, color: 'rgba(0,215,172,.94)' }}>{s.name}</span>
                                      <span style={{ fontSize: 11, padding: '2px 8px', border: `1px solid ${sc}`, borderRadius: 2, color: sc, letterSpacing: 1, textTransform: 'uppercase' }}>{s.status}</span>
                                      {s.evidence_level && <span style={{ fontSize: 11, color: 'rgba(0,165,132,.5)', letterSpacing: 1 }}>{s.evidence_level} evidence</span>}
                                    </div>
                                    <div style={{ fontSize: 15, color: 'rgba(0,178,145,.72)' }}>{s.dose} · {s.timing}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    {s.expected_impact && <div style={{ fontSize: 15, color: 'rgba(0,200,162,.78)' }}>{s.expected_impact}</div>}
                                    {s.cost_monthly && <div style={{ fontSize: 14, color: 'rgba(0,155,125,.48)' }}>{s.cost_monthly}/mo</div>}
                                  </div>
                                  <div style={{ fontSize: 20, color: 'rgba(0,175,140,.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginLeft: 8 }}>⌄</div>
                                </div>
                                {isOpen && (
                                  <div style={{ padding: '0 22px 22px', borderTop: '1px solid rgba(0,165,132,.1)' }}>
                                    <p style={{ fontSize: 16, color: 'rgba(0,205,165,.84)', lineHeight: 1.88, margin: '16px 0 12px', fontStyle: 'italic', paddingLeft: 14, borderLeft: '2px solid rgba(0,190,152,.28)' }}>{s.why}</p>
                                    {s.synergies?.length > 0 && <div style={{ fontSize: 14, color: 'rgba(0,175,142,.6)' }}>Synergises with: {s.synergies.join(', ')}</div>}
                                    {s.contraindications?.length > 0 && <div style={{ fontSize: 14, color: 'rgba(255,150,60,.65)', marginTop: 6 }}>⚠ {s.contraindications.join('; ')}</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {personalised.supps.total_foundation_cost && (
                    <div style={{ ...S.card, padding: '16px 22px', marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 16, color: 'rgba(0,178,145,.7)' }}>Foundation stack total</div>
                        <div style={{ fontSize: 28, color: 'rgba(0,215,172,.92)', fontWeight: 500 }}>{personalised.supps.total_foundation_cost}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => triggerPrint('supps')} style={{ fontSize: 13, color: 'rgba(0,225,180,.95)', background: 'rgba(0,195,155,.14)', border: '1px solid rgba(0,195,155,.45)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>↓ Download / Print</button>
                    <button onClick={() => triggerPrint('all')} style={{ fontSize: 13, color: 'rgba(0,225,180,.85)', background: 'rgba(0,195,155,.08)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>Full Aellux Report</button>
                    <button onClick={() => { setPersonalised(p => ({ ...p, supps: undefined })); }} style={{ fontSize: 13, color: 'rgba(0,150,120,.45)', background: 'none', border: '1px solid rgba(0,150,120,.2)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROTOCOL ── */}
          {panel === 'protocol' && (
            <div>
              {!personalised.protocol ? (
                <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                  <p style={{ fontSize: 18, color: 'rgba(0,190,155,.75)', marginBottom: 10, lineHeight: 1.7 }}>
                    {allMarkers.length === 0 ? 'Upload your health documents first.' : `Aellux will design your daily protocol from your ${allMarkers.length} biomarkers.`}
                  </p>
                  <p style={{ fontSize: 15, color: 'rgba(0,165,132,.5)', marginBottom: 28, lineHeight: 1.7 }}>What you should actually do every day — ranked by impact on your specific biology.</p>
                  {generationError && (
                    <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 6, color: 'rgba(255,200,180,1)', fontSize: 14, textAlign: 'left', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,160,100,.85)', marginBottom: 4 }}>⚠ Generation Error</div>
                      {generationError}
                    </div>
                  )}
                  <button onClick={() => generatePersonalised('protocol')} disabled={generatingType === 'protocol' || allMarkers.length === 0}
                    style={{ fontSize: 17, color: 'rgba(0,210,165,.9)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '14px 32px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {generatingType === 'protocol' ? '⟳ Aellux is designing your protocol...' : 'Generate my daily protocol →'}
                  </button>
                </div>
              ) : (
                <div>
                  {personalised.protocol.biggest_lever && (
                    <div style={{ ...S.card, padding: '18px 22px', marginBottom: 22, borderColor: 'rgba(0,195,155,.22)' }}>
                      <div style={{ ...S.label, color: 'rgba(255,200,60,.65)', marginBottom: 8 }}>Biggest Lever</div>
                      <p style={{ fontSize: 18, color: 'rgba(255,215,80,.88)', margin: 0, lineHeight: 1.75 }}>{personalised.protocol.biggest_lever}</p>
                    </div>
                  )}
                  {/* Compliance ring */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 24 }}>
                    <div style={{ position: 'relative', width: 76, height: 76 }}>
                      <svg viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)', width: 76, height: 76 }}>
                        <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(0,48,38,.6)" strokeWidth="5" />
                        <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(0,200,160,.72)" strokeWidth="5"
                          strokeDasharray={`${(done.size / Math.max(1, (personalised.protocol.protocols || []).length)) * 201.1} 201.1`} strokeLinecap="round" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'rgba(0,200,160,.88)', fontWeight: 500 }}>{done.size}/{(personalised.protocol.protocols || []).length}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 20, color: 'rgba(0,215,172,.9)', marginBottom: 4 }}>Your Daily Protocol</div>
                      <div style={{ fontSize: 13, letterSpacing: 2, color: 'rgba(0,165,132,.55)', textTransform: 'uppercase' }}>Generated from your biomarkers</div>
                    </div>
                    <button onClick={() => setDone(new Set())} style={{ fontSize: 13, color: 'rgba(0,150,120,.48)', background: 'none', border: '1px solid rgba(0,150,120,.22)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(personalised.protocol.protocols || []).map((p: any, i: number) => (
                      <div key={p.id || i} className={`aellux-proto-item ${done.has(p.id || String(i)) ? 'completed' : ''}`}
                        onClick={() => setDone(prev => { const n = new Set(prev); const key = p.id || String(i); n.has(key) ? n.delete(key) : n.add(key); return n; })}>
                        <div className={`aellux-check ${done.has(p.id || String(i)) ? 'checked' : ''}`}>
                          {done.has(p.id || String(i)) && <span style={{ fontSize: 10, color: 'rgba(0,200,160,.92)' }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <span style={{ fontSize: 17, color: done.has(p.id || String(i)) ? 'rgba(0,175,140,.5)' : 'rgba(0,215,172,.92)', lineHeight: 1.4 }}>{p.action}</span>
                            {p.tier && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 2, background: 'rgba(0,195,155,.1)', color: 'rgba(0,195,155,.68)', border: '1px solid rgba(0,195,155,.18)', letterSpacing: 1, flexShrink: 0 }}>T{p.tier}</span>}
                            {p.time_of_day && <span style={{ fontSize: 11, color: 'rgba(0,165,132,.5)', letterSpacing: 1, textTransform: 'uppercase' }}>{p.time_of_day}</span>}
                          </div>
                          <p style={{ fontSize: 15, color: 'rgba(0,178,145,.65)', margin: '0 0 4px', lineHeight: 1.7, fontStyle: 'italic' }}>{p.why}</p>
                          {p.expected_impact && <div style={{ fontSize: 14, color: 'rgba(0,200,162,.65)' }}>Expected: {p.expected_impact}</div>}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(0,155,125,.48)', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0, textAlign: 'right' }}>{p.frequency}</div>
                      </div>
                    ))}
                  </div>
                  {personalised.protocol.avoid?.length > 0 && (
                    <div style={{ ...S.card, padding: '18px 22px', marginTop: 20 }}>
                      <div style={{ ...S.label, color: 'rgba(255,150,60,.65)', marginBottom: 12 }}>Stop doing — based on your markers</div>
                      {personalised.protocol.avoid.map((a: string, i: number) => (
                        <div key={i} style={{ fontSize: 15, color: 'rgba(255,160,70,.78)', marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid rgba(255,130,60,.2)' }}>✕ {a}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => triggerPrint('protocol')} style={{ fontSize: 13, color: 'rgba(0,225,180,.95)', background: 'rgba(0,195,155,.14)', border: '1px solid rgba(0,195,155,.45)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>↓ Download / Print</button>
                    <button onClick={() => triggerPrint('all')} style={{ fontSize: 13, color: 'rgba(0,225,180,.85)', background: 'rgba(0,195,155,.08)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>Full Aellux Report</button>
                    <button onClick={() => { setPersonalised(p => ({ ...p, protocol: undefined })); }} style={{ fontSize: 13, color: 'rgba(0,150,120,.45)', background: 'none', border: '1px solid rgba(0,150,120,.2)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROTOCOLS ── */}
          {panel === 'protocols' && (
            <div>
              <ProtocolsSection markers={allMarkers} />
            </div>
          )}

          {/* ── WEEK ── */}
          {panel === 'week' && (
            <div>
              {!personalised.week && !weekStreamDays.length ? (
                /* ============ PRE-GENERATION STATE ============ */
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 60px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,225,180,.65)', marginBottom: 10 }}>The flagship Aellux output</div>
                    <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 36, color: 'rgba(220,255,235,1)', fontWeight: 500, margin: '0 0 14px', lineHeight: 1.15 }}>Your Biologic Protocol</h1>
                    <p style={{ fontSize: 16, color: 'rgba(0,210,165,.78)', lineHeight: 1.7, margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
                      {allMarkers.length === 0
                        ? 'Upload your health documents first to begin.'
                        : `Aellux will design 7 biologically distinct days from your ${allMarkers.length} biomarkers. Meals, supplements, training and recovery — woven together as one weekly operating system.`}
                    </p>
                    {!isPro && allMarkers.length > 0 && (
                      <p style={{ fontSize: 13, color: 'rgba(255,200,80,.85)', marginTop: 14, lineHeight: 1.6 }}>
                        Free plan: Day 1 preview only. Pro ($29/mo) unlocks all 7 days + alternatives + grocery list + printable PDF.
                      </p>
                    )}
                  </div>

                  {allMarkers.length > 0 && (
                    <div style={{ background: 'rgba(0,8,18,.5)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 8, padding: '22px 26px', marginBottom: 20 }}>
                      {/* Meal style selector */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,210,165,.7)', marginBottom: 8 }}>Meal style</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {[
                            { val: 'none',        label: 'No preference' },
                            { val: 'mediterranean', label: 'Mediterranean' },
                            { val: 'vegetarian',  label: 'Vegetarian' },
                            { val: 'vegan',       label: 'Vegan' },
                            { val: 'pescatarian', label: 'Pescatarian' },
                            { val: 'carnivore',   label: 'Carnivore' },
                            { val: 'keto',        label: 'Keto' },
                            { val: 'paleo',       label: 'Paleo' },
                          ].map(s => (
                            <button key={s.val} type="button" onClick={() => setBpMealStyle(s.val)}
                              style={{
                                fontSize: 12,
                                padding: '7px 13px',
                                background: bpMealStyle === s.val ? 'rgba(0,225,180,.14)' : 'rgba(0,8,18,.5)',
                                border: `1px solid ${bpMealStyle === s.val ? 'rgba(0,225,180,.55)' : 'rgba(0,210,165,.22)'}`,
                                borderRadius: 14,
                                color: bpMealStyle === s.val ? 'rgba(0,255,200,1)' : 'rgba(0,210,165,.65)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                letterSpacing: '0.02em',
                              }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Meal Prepper toggle */}
                      <div style={{ marginBottom: 18, paddingTop: 18, borderTop: '1px solid rgba(0,210,165,.1)' }}>
                        <button
                          type="button"
                          onClick={() => setBpMealPrep(!bpMealPrep)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                            padding: '12px 16px',
                            background: bpMealPrep ? 'rgba(0,225,180,.1)' : 'rgba(0,8,18,.4)',
                            border: `1px solid ${bpMealPrep ? 'rgba(0,225,180,.5)' : 'rgba(0,210,165,.2)'}`,
                            borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                            background: bpMealPrep ? 'rgba(0,225,180,.9)' : 'transparent',
                            border: `2px solid ${bpMealPrep ? 'rgba(0,225,180,.9)' : 'rgba(0,210,165,.4)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {bpMealPrep && <span style={{ color: '#000', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                          </div>
                          <div>
                            <div style={{ fontSize: 15, color: bpMealPrep ? 'rgba(0,255,200,1)' : 'rgba(220,255,235,.85)', fontWeight: 500 }}>Meal Prepper mode</div>
                            <div style={{ fontSize: 13, color: 'rgba(0,210,165,.6)', marginTop: 3, lineHeight: 1.5 }}>
                              Cook once on Sunday, eat all week. Aellux designs your menu around 2 bulk proteins + 2 sides — portion into containers, grab and go.
                            </div>
                          </div>
                        </button>
                        {bpMealPrep && (
                          <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 6, fontSize: 13, color: 'rgba(0,210,165,.75)', lineHeight: 1.6 }}>
                            💡 You'll get a batch cook plan: 2 proteins, 2 carbs, 1–2 vegs, 21 containers. Flavor rotates daily so it doesn't get boring.
                          </div>
                        )}
                      </div>

                      {/* Additional Goal toggle */}
                      <div>
                        <button type="button" onClick={() => setBpGoalExpanded(!bpGoalExpanded)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(0,210,165,.7)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0 }}>
                          <span style={{ fontSize: 14, transform: bpGoalExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }}>▸</span>
                          Add a focus for this week (optional)
                        </button>
                        {bpGoalExpanded && (
                          <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', lineHeight: 1.6, margin: '0 0 10px' }}>
                              Your profile already drives the primary goal. Add anything *specific* you want this particular week to optimize for — Aellux will weave it into the design alongside your biomarker priorities.
                            </p>
                            <input
                              value={bpAdditionalGoal}
                              onChange={e => setBpAdditionalGoal(e.target.value.slice(0, 240))}
                              placeholder="e.g. prepping for travel, training for a 10K, cutting sugar cravings"
                              style={{ width: '100%', background: 'rgba(0,8,18,.7)', border: '1px solid rgba(0,210,165,.22)', borderRadius: 5, color: 'rgba(220,255,235,.95)', fontSize: 14, fontFamily: 'inherit', padding: '10px 14px', outline: 'none', marginBottom: 8 }}
                            />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {['More energy', 'Better sleep', 'Cut sugar cravings', 'Improve focus', 'Reduce stress', 'Prep for travel'].map(chip => (
                                <button key={chip} type="button" onClick={() => setBpAdditionalGoal(chip)}
                                  style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 12, color: 'rgba(0,210,165,.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {generationError && (
                    <div style={{ marginBottom: 18, padding: '12px 18px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 6, color: 'rgba(255,200,180,1)', fontSize: 14, lineHeight: 1.5 }}>
                      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,160,100,.85)', marginBottom: 4 }}>⚠ Generation Error</div>
                      {generationError}
                    </div>
                  )}

                  {/* Cycle commitment selector */}
                  {isPro && allMarkers.length > 0 && (
                    <div style={{ marginBottom: 18, padding: '14px 18px', background: 'rgba(0,8,18,.5)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,210,165,.7)', marginBottom: 10 }}>How long will you run this protocol?</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[30, 60, 90].map(days => (
                          <button key={days} type="button" onClick={() => setBpCycleLengthDays(days)}
                            style={{
                              flex: 1, padding: '10px 0', fontSize: 15, fontFamily: 'EB Garamond, Georgia, serif',
                              background: bpCycleLengthDays === days ? 'rgba(0,225,180,.14)' : 'rgba(0,8,18,.5)',
                              border: `1px solid ${bpCycleLengthDays === days ? 'rgba(0,225,180,.6)' : 'rgba(0,210,165,.2)'}`,
                              borderRadius: 6, color: bpCycleLengthDays === days ? 'rgba(0,255,200,1)' : 'rgba(0,210,165,.55)',
                              cursor: 'pointer',
                            }}>
                            {days} days
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(0,210,165,.45)', marginTop: 8, lineHeight: 1.5 }}>
                        Your protocol is yours to keep. Regenerate when your cycle completes or when you upload new medical records.
                      </div>
                    </div>
                  )}

                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={generateBiologicProtocol}
                      disabled={generatingType === 'week' || allMarkers.length === 0}
                      style={{ fontSize: 17, color: 'rgba(0,255,200,1)', background: 'rgba(0,195,155,.16)', border: '1px solid rgba(0,225,180,.55)', borderRadius: 5, padding: '14px 36px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}
                    >
                      {generatingType === 'week'
                        ? '⟳ Designing…'
                        : (isPro ? 'Generate my Biologic Protocol →' : 'Generate Day 1 preview →')}
                    </button>
                  </div>
                </div>
              ) : weekStreamDays.length > 0 && !personalised.week ? (
                /* ============ STREAMING IN PROGRESS ============ */
                <div>
                  <div style={{ marginBottom: 18, padding: '14px 20px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,225,180,.3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)', flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'rgba(0,225,180,.95)', letterSpacing: '0.04em', marginBottom: 2 }}>{weekStreamStatus || 'Aellux is designing your protocol…'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)' }}>{weekStreamDays.length} of {isPro ? 7 : 1} day{(isPro ? 7 : 1) === 1 ? '' : 's'} ready · Tap any meal once it appears for alternatives</div>
                    </div>
                  </div>
                  <WeekView
                    data={{ days: weekStreamDays, key_insight: '' }}
                    selectedMealKeys={mealSwaps}
                    onSwap={handleMealSwap}
                    isPreview={!isPro}
                    onUpgrade={() => setShowUpgrade(true)}
                  />
                </div>
              ) : (
                /* ============ COMPLETED — TABBED VIEW ============ */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 26, color: 'rgba(220,255,235,1)', fontWeight: 500, lineHeight: 1.1 }}>{isPro ? 'Your Biologic Protocol' : 'Day 1 Preview'}</div>
                      <div style={{ fontSize: 12, color: 'rgba(0,210,165,.65)', marginTop: 4, letterSpacing: '0.04em' }}>
                        Designed from your {allMarkers.length} biomarkers
                        {bpMealStyle !== 'none' && <> · {bpMealStyle.charAt(0).toUpperCase() + bpMealStyle.slice(1)}</>}
                        {bpAdditionalGoal && <> · Focus: {bpAdditionalGoal}</>}
                      </div>
                    </div>
                    {isPro && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => triggerPrint('week')} style={{ fontSize: 13, color: 'rgba(0,225,180,1)', background: 'rgba(0,195,155,.14)', border: '1px solid rgba(0,225,180,.55)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>↓ Download / Print</button>
                        <button onClick={() => setShowRegenConfirm(true)}
                          style={{ fontSize: 13, color: 'rgba(255,210,100,.85)', background: 'rgba(255,200,80,.05)', border: '1px solid rgba(255,200,80,.4)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >Regenerate</button>
                      </div>
                    )}
                  </div>

                  <DerivedViews
                    weekData={personalised.week}
                    selectedMealKeys={mealSwaps}
                    weekView={
                      <WeekView
                        data={personalised.week}
                        selectedMealKeys={mealSwaps}
                        onSwap={handleMealSwap}
                        isPreview={!isPro}
                        onUpgrade={() => setShowUpgrade(true)}
                      />
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* ── ASK ── */}
          {panel === 'ask' && (
            <div>
              <p style={{ ...S.label, marginBottom: 8 }}>Ask Aellux anything about your health</p>
              <p style={{ fontSize: 16, color: 'rgba(0,175,142,.6)', marginBottom: 24, lineHeight: 1.7 }}>
                {allMarkers.length > 0 ? `Aellux has ${allMarkers.length} of your biomarkers in context from ${documents.length} documents.` : 'Upload health documents first for personalised answers.'}
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                <input
                  style={{ flex: 1, background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,175,138,.22)', borderRadius: 5, color: 'rgba(0,220,175,.92)', fontSize: 17, fontFamily: 'inherit', padding: '14px 18px', outline: 'none' }}
                  placeholder="What should I focus on? Why is my CRP elevated? What does my testosterone trend mean?"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAsk()}
                />
                <button onClick={handleAsk} disabled={asking || !input.trim()}
                  style={{ fontSize: 16, color: 'rgba(0,210,165,.9)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '14px 22px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {asking ? '⟳' : 'Ask →'}
                </button>
              </div>
              {response && (
                <div style={{ ...S.card, padding: '20px 24px', borderColor: 'rgba(0,195,155,.2)' }}>
                  <p style={{ ...S.italic, margin: 0, fontSize: 18 }}>{response}</p>
                </div>
              )}
              {/* Quick questions */}
              <div style={{ marginTop: 28 }}>
                <p style={{ ...S.label, marginBottom: 14 }}>Quick questions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'What is my biggest health risk right now?',
                    'What single change would have the most impact on my biology?',
                    'What do my inflammatory markers tell you?',
                    'How does my sleep data affect my other markers?',
                    'What should I stop doing based on my results?',
                    'What does my hormonal profile reveal?',
                  ].map(q => (
                    <button key={q} onClick={() => { setInput(q); }} style={{ textAlign: 'left', fontSize: 16, color: 'rgba(0,195,158,.75)', background: 'rgba(0,8,16,.6)', border: '1px solid rgba(0,165,132,.12)', borderRadius: 4, padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .2s' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        {panel === 'profile' && (
          <ProfilePage
            user={user}
            isPro={isPro}
            signOut={signOut}
            documents={documents}
            personalised={personalised}
            setPanel={setPanel}
          />
        )}

        {panel === 'admin' && isAdmin && (
          <AdminDashboard supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY || ''} />
        )}

        {selectedMarker && (
          <BiomarkerDetail
            marker={{ ...selectedMarker, allMarkers, userId: user?.id, plan: isPro ? 'pro' : 'free' }}
            onClose={() => setSelectedMarker(null)}
            profile={profile}
          />
        )}

        </div>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <div className="aellux-mobile-tabbar">
        <button className={`aellux-tab ${panel === 'week' ? 'active' : ''}`} onClick={() => setPanel('week')}>
          <span className="aellux-tab-icon">📅</span>
          <span>Today</span>
        </button>
        <button className={`aellux-tab ${panel === 'dashboard' ? 'active' : ''}`} onClick={() => setPanel('dashboard')}>
          <span className="aellux-tab-icon">⊕</span>
          <span>Biology</span>
        </button>
        <button className={`aellux-tab ${panel === 'profile' ? 'active' : ''}`} onClick={() => setPanel('profile')}>
          <span className="aellux-tab-icon">◉</span>
          <span>Profile</span>
        </button>
      </div>

      {/* ── MOBILE FLOATING ACTION BUTTON (Ask Aellux) ── */}
      <button className="aellux-mobile-fab" onClick={() => setAskSheetOpen(true)} aria-label="Ask Aellux">
        ✦
      </button>

      {/* ── ASK AELLUX BOTTOM SHEET (mobile FAB target) ── */}
      {askSheetOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1800, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(2,10,20,.85)', backdropFilter: 'blur(8px)' }} onClick={() => setAskSheetOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, background: 'rgba(2,12,22,.98)', borderTop: '1px solid rgba(0,225,180,.3)', borderRadius: '14px 14px 0 0', padding: '20px 18px calc(20px + env(safe-area-inset-bottom))', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: 'rgba(0,225,180,.3)', borderRadius: 2, margin: '0 auto 14px' }} />
            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 22, color: 'rgba(220,255,235,1)', fontWeight: 500, marginBottom: 6 }}>Ask Aellux</div>
            <div style={{ fontSize: 13, color: 'rgba(0,210,165,.65)', marginBottom: 14, lineHeight: 1.5 }}>
              {allMarkers.length > 0 ? `${allMarkers.length} of your biomarkers in context from ${documents.length} documents.` : 'Upload health documents first for personalised answers.'}
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="What would you like to know about your health?"
              style={{ width: '100%', minHeight: 80, padding: 12, background: 'rgba(0,8,18,.7)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 6, color: 'rgba(220,255,235,.95)', fontSize: 16, fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { handleAsk(); setAskSheetOpen(false); }} disabled={asking || !input.trim()}
                style={{ flex: 1, fontSize: 15, color: 'rgba(0,255,200,1)', background: 'rgba(0,195,155,.16)', border: '1px solid rgba(0,225,180,.55)', borderRadius: 5, padding: '12px 0', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
                {asking ? 'Aellux is reading…' : 'Ask Aellux →'}
              </button>
              <button onClick={() => setAskSheetOpen(false)}
                style={{ fontSize: 13, color: 'rgba(0,180,140,.7)', background: 'none', border: '1px solid rgba(0,180,140,.25)', borderRadius: 5, padding: '12px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
            </div>
            {response && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,225,180,.2)', borderRadius: 6, color: 'rgba(220,255,235,.92)', fontSize: 14, lineHeight: 1.65 }}>
                {response}
              </div>
            )}
          </div>
        </div>
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {showProfileSetup && (
        <ProfileSetup
          initial={profile}
          onSave={async (patch) => {
            const res = await fetch(`/api/profile?userId=${user?.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patch),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Save failed');
            setProfile(data.profile);
            setShowProfileSetup(false);
          }}
          onSkip={() => setShowProfileSetup(false)}
        />
      )}

      {/* ── ONBOARDING MODAL ── */}
      {showOnboarding && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,8,18,0.96)', backdropFilter: 'blur(12px)', padding: 20 }}>
          <div style={{ background: 'rgba(2,12,22,0.99)', border: '1px solid rgba(0,210,165,.3)', borderRadius: 14, padding: '36px 40px', maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)', margin: '0 auto 20px' }} />
            <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 28, color: 'rgba(220,255,235,1)', fontWeight: 500, margin: '0 0 10px' }}>Welcome to Aellux</h2>
            <p style={{ fontSize: 16, color: 'rgba(0,210,165,.8)', lineHeight: 1.7, margin: '0 0 28px' }}>
              Ancient intelligence, built around your biology. Here's how to get started in 3 steps:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, textAlign: 'left' }}>
              {[
                { n: '1', title: 'Upload your health records', desc: 'Blood panels, wearable exports, DEXA scans, physician notes — any format. Aellux reads and extracts your biomarkers automatically.' },
                { n: '2', title: 'Set your health profile', desc: 'Age, weight, goals, medications. Takes 2 minutes and makes every recommendation 10× more accurate.' },
                { n: '3', title: 'Generate your Biologic Protocol', desc: 'A full 7-day operating system — meals, supplements, training and recovery — designed from your actual biology.' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,225,180,.15)', border: '1px solid rgba(0,225,180,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'rgba(0,255,200,1)', fontFamily: 'EB Garamond, Georgia, serif' }}>{step.n}</div>
                  <div>
                    <div style={{ fontSize: 16, color: 'rgba(220,255,235,.95)', fontWeight: 500, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 14, color: 'rgba(0,210,165,.7)', lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowOnboarding(false); localStorage.setItem('aellux_onboarded', '1'); setPanel('upload'); }}
                style={{ flex: 1, fontSize: 16, color: 'rgba(0,20,14,1)', background: 'rgba(0,225,180,.9)', border: 'none', borderRadius: 7, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Upload my first record →
              </button>
              <button onClick={() => { setShowOnboarding(false); localStorage.setItem('aellux_onboarded', '1'); }}
                style={{ fontSize: 14, color: 'rgba(0,210,165,.6)', background: 'none', border: '1px solid rgba(0,210,165,.2)', borderRadius: 7, padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Explore first
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegenConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,10,20,0.92)', backdropFilter: 'blur(8px)', padding: 16 }}>
          <div style={{ background: 'rgba(2,12,22,0.98)', border: '1px solid rgba(0,210,165,.3)', borderRadius: 12, padding: '28px 32px', maxWidth: 480, width: '100%' }}>
            <div style={{ fontSize: 11, color: 'rgba(0,225,180,.75)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Start a new cycle</div>
            <h3 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 22, color: 'rgba(220,255,235,1)', margin: '0 0 12px', fontWeight: 500 }}>Regenerate your Biologic Protocol?</h3>
            <p style={{ fontSize: 14, color: 'rgba(0,210,165,.78)', lineHeight: 1.6, margin: '0 0 12px' }}>
              Protocols are designed to run <strong style={{ color: 'rgba(220,255,235,.95)' }}>30–90 days</strong>. Deep biological adaptation takes time — the same protocol, consistently applied, produces better results than frequent changes.
            </p>
            <p style={{ fontSize: 13, color: 'rgba(0,210,165,.62)', lineHeight: 1.6, margin: '0 0 20px' }}>
              If you just want different meals, use the swap options inside each day — free and unlimited, no regeneration needed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowRegenConfirm(false); generateBiologicProtocol(); }}
                style={{ flex: 1, fontSize: 14, color: 'rgba(0,255,200,1)', background: 'rgba(0,195,155,.14)', border: '1px solid rgba(0,225,180,.5)', borderRadius: 5, padding: '11px 18px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
                Yes, start a new cycle
              </button>
              <button onClick={() => setShowRegenConfirm(false)}
                style={{ fontSize: 13, color: 'rgba(0,180,140,.7)', background: 'none', border: '1px solid rgba(0,180,140,.25)', borderRadius: 5, padding: '11px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Keep current protocol
              </button>
            </div>
          </div>
        </div>
      )}

      <PrintableReport
        section={printSection}
        personalised={applyMealSwaps(personalised, mealSwaps)}
        markers={allMarkers}
        userEmail={user?.email}
      />
    </div>
  );
}