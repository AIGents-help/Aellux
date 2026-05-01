import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { saveDocument, getDocuments, deleteDocument, savePersonalised, getPersonalised } from './supabase';
import AuthPaywall from './AuthPaywall';

// ── TYPES ────────────────────────────────────────────────────────────────────

type OrbState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';
type Panel = 'upload' | 'dashboard' | 'trends' | 'meals' | 'supps' | 'protocol' | 'ask';

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

export default function App() {
  const { user, isPro, signOut } = useAuth();
  const [orbState, setOrbState] = useState<OrbState>('dormant');
  const [panel, setPanel] = useState<Panel>('upload');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [personalised, setPersonalised] = useState<PersonalisedData>({});
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [asking, setAsking] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [awakened, setAwakened] = useState(false);
  const [awakePhase, setAwakePhase] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from Supabase on mount (with localStorage fallback)
  useEffect(() => {
    // Immediate localStorage load for fast UI
    try {
      const saved = localStorage.getItem('aellux_documents');
      if (saved) { const docs = JSON.parse(saved); setDocuments(docs); if (docs.length > 0) setPanel('dashboard'); }
      const savedP = localStorage.getItem('aellux_personalised');
      if (savedP) setPersonalised(JSON.parse(savedP));
    } catch {}

    // Then sync from Supabase if logged in
    if (user?.id) {
      getDocuments(user.id).then(docs => {
        if (docs.length > 0) {
          const mapped = docs.map(d => ({
            id: d.id, name: d.name, date: d.date, document_type: d.document_type,
            markers: d.markers, summary: d.summary, flags: d.flags,
            recommendations: d.recommendations, uploadedAt: d.uploaded_at,
          }));
          setDocuments(mapped);
          localStorage.setItem('aellux_documents', JSON.stringify(mapped));
          setPanel('dashboard');
        }
      });
      getPersonalised(user.id).then(p => {
        if (Object.keys(p).length > 0) {
          setPersonalised(p);
          localStorage.setItem('aellux_personalised', JSON.stringify(p));
        }
      });
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

  const flaggedMarkers = useMemo(() => allMarkers.filter(m => m.status === 'elevated' || m.status === 'low'), [allMarkers]);

  const selectedMarkerData = useMemo(() => {
    if (!selectedMarker) return null;
    return allMarkers.find(m => m.name.toLowerCase() === selectedMarker.toLowerCase()) || null;
  }, [selectedMarker, allMarkers]);

  // Save to localStorage when docs change
  const saveDocuments = useCallback((docs: Document[]) => {
    setDocuments(docs);
    try { localStorage.setItem('aellux_documents', JSON.stringify(docs)); } catch {}
    if (docs.length > 0 && panel === 'upload') setPanel('dashboard');
  }, [panel]);

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

      const updatedDocs = [...documents, newDoc];
      saveDocuments(updatedDocs);
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
    setGeneratingType(type);
    setOrbState('thinking');
    try {
      const res = await fetch('/api/personalise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markers: allMarkers, type, maxTokens: 3000 }),
      });
      const data = await res.json();
      const updated = { ...personalised, [type]: data };
      setPersonalised(updated);
      try { localStorage.setItem('aellux_personalised', JSON.stringify(updated)); } catch {}
      if (user?.id) savePersonalised(user.id, type, data);
      setOrbState('speaking');
      setResponse(data.key_insight || data.aellux_voice || 'Your personalised protocol has been generated from your health data.');
      setTimeout(() => setOrbState('idle'), 4000);
    } catch (err: any) {
      setResponse(`Generation failed: ${err.message}`);
      setOrbState('idle');
    } finally {
      setGeneratingType(null);
    }
  };

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
        }),
      });
      const data = await res.json();
      setResponse(data.text || 'The signal is quiet.');
      setOrbState('speaking');
      setTimeout(() => setOrbState('idle'), 5000);
    } catch { setResponse('The resonance is momentarily silent.'); setOrbState('idle'); }
    setAsking(false);
  }, [input, asking, allMarkers, documents.length]);

  if (!user) return <AuthPaywall />;

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
    { id: 'trends',    label: 'Biomarker Trends'                            },
    { id: 'meals',     label: 'Meal Protocol'                               },
    { id: 'supps',     label: 'Supplement Stack'                            },
    { id: 'protocol',  label: 'Daily Protocol'                              },
    { id: 'ask',       label: 'Ask Aellux'                                  },
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
      {/* ── LEFT COLUMN ── */}
      <div className="aellux-lc">
        <div style={{ marginBottom: 10 }}><Orb state={orbState} size={110} /></div>
        <div style={{ fontSize: 15, letterSpacing: 3.5, textTransform: 'uppercase', color: 'rgba(0,210,165,.78)', marginBottom: 20 }}>Aellux</div>

        <div style={{ width: '100%', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 18 }}>
          {NAV.map(({ id, label, count }) => (
            <button key={id} className={`aellux-nav-item ${panel === id ? 'active' : ''}`} onClick={() => setPanel(id)}>
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
          </div>
        )}

        {/* Ask input */}
        <div style={{ padding: '0 14px', width: '100%', position: 'relative' }}>
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
            <button onClick={signOut} style={{ width: '100%', fontSize: 12, color: 'rgba(0,140,115,.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4, textAlign: 'left' }}>Sign out</button>
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

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
                  {/* Synthesis banner */}
                  {personalised.synthesis && (
                    <div style={{ ...S.card, padding: '18px 22px', marginBottom: 22, borderColor: 'rgba(0,195,155,.2)' }}>
                      <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,175,140,.6)', marginBottom: 8 }}>Aellux Synthesis</div>
                      <p style={{ ...S.italic, margin: '0 0 12px', fontSize: 18 }}>{personalised.synthesis.aellux_voice}</p>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {personalised.synthesis.biological_age_estimate && (
                          <div style={{ fontSize: 15, color: 'rgba(0,195,155,.75)' }}>Bio age: <strong style={{ color: 'rgba(0,215,172,.9)' }}>{personalised.synthesis.biological_age_estimate}</strong></div>
                        )}
                        {personalised.synthesis.focus_priority && (
                          <div style={{ fontSize: 15, color: 'rgba(255,170,60,.75)' }}>Priority: <strong style={{ color: 'rgba(255,190,80,.9)' }}>{personalised.synthesis.focus_priority}</strong></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Flags */}
                  {flaggedMarkers.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ ...S.label, marginBottom: 12, color: 'rgba(255,160,60,.7)' }}>⚠ Needs Attention ({flaggedMarkers.length})</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {flaggedMarkers.map(m => (
                          <div key={m.name} onClick={() => { setSelectedMarker(m.name); setPanel('trends'); }} style={{ ...S.card, padding: '14px 16px', cursor: 'pointer', borderColor: 'rgba(255,130,60,.22)', transition: 'border-color .2s' }}>
                            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,150,70,.6)', marginBottom: 5 }}>{m.category}</div>
                            <div style={{ fontSize: 16, color: 'rgba(255,160,80,.88)', fontWeight: 500, marginBottom: 4 }}>{m.name}</div>
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

                  {/* Markers grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {displayMarkers.map(m => {
                      const color = CATEGORY_COLORS[m.category] || '#aaa';
                      const statusColor = STATUS_COLORS[m.status] || 'rgba(0,210,165,.85)';
                      const inRange = m.status === 'optimal' || m.status === 'normal';
                      return (
                        <div key={m.name} onClick={() => { setSelectedMarker(m.name); setPanel('trends'); }}
                          style={{ ...S.card, padding: '14px 16px', cursor: 'pointer', transition: 'border-color .2s', borderTop: `2px solid ${color}40` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: `${color}99` }}>{m.category}</div>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0, marginTop: 2 }} />
                          </div>
                          <div style={{ fontSize: 15, color: 'rgba(0,210,170,.88)', fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>{m.name}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                            <span style={{ fontSize: 28, color: statusColor, fontWeight: 500 }}>{m.value}</span>
                            <span style={{ fontSize: 13, color: 'rgba(0,160,130,.5)' }}>{m.unit}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: statusColor, letterSpacing: 1 }}>{m.status}</span>
                            {m.history && m.history.length > 1 && (
                              <SparkChart values={m.history.map(h => h.value)} color={color} />
                            )}
                          </div>
                          {m.reference_range_low !== undefined && (
                            <div style={{ marginTop: 8, height: 2, background: 'rgba(0,40,30,.5)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, ((m.value - m.reference_range_low!) / ((m.reference_range_high! - m.reference_range_low!) || 1)) * 100))}%`, background: inRange ? 'rgba(0,200,160,.6)' : 'rgba(255,140,60,.6)', borderRadius: 2 }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Generate synthesis */}
                  {!personalised.synthesis && allMarkers.length > 0 && (
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
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

          {/* ── TRENDS ── */}
          {panel === 'trends' && (
            <div>
              {allMarkers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(0,175,142,.6)', fontSize: 17 }}>Upload documents to see trends.</div>
              ) : (
                <>
                  {/* Marker selector */}
                  <div style={{ marginBottom: 22 }}>
                    <p style={{ ...S.label, marginBottom: 12 }}>Select biomarker to trend</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {allMarkers.filter(m => m.history && m.history.length > 0).map(m => (
                        <button key={m.name} onClick={() => setSelectedMarker(m.name)}
                          className={`aellux-rtab ${selectedMarker === m.name ? 'active' : ''}`}
                          style={{ fontFamily: 'inherit', borderColor: selectedMarker === m.name ? CATEGORY_COLORS[m.category] : undefined }}>
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedMarkerData && selectedMarkerData.history && selectedMarkerData.history.length > 0 ? (
                    <TrendChart marker={selectedMarkerData.name} history={selectedMarkerData.history} />
                  ) : selectedMarker ? (
                    <div style={{ ...S.card, padding: 24, color: 'rgba(0,175,142,.6)', fontSize: 16 }}>Only one data point for {selectedMarker}. Upload more documents to see the trend.</div>
                  ) : (
                    <div style={{ ...S.card, padding: 24, color: 'rgba(0,175,142,.6)', fontSize: 16 }}>Select a biomarker above to see its trend over time.</div>
                  )}

                  {/* All markers with sparklines */}
                  <div style={{ marginTop: 28 }}>
                    <p style={{ ...S.label, marginBottom: 14 }}>All Biomarkers with History</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {allMarkers.filter(m => m.history && m.history.length > 0).map(m => {
                        const sorted = [...m.history].sort((a, b) => a.date.localeCompare(b.date));
                        const first = sorted[0]?.value, last = sorted[sorted.length - 1]?.value;
                        const pct = first ? ((last - first) / first * 100).toFixed(1) : null;
                        const color = CATEGORY_COLORS[m.category] || '#aaa';
                        return (
                          <div key={m.name} onClick={() => { setSelectedMarker(m.name); window.scrollTo(0, 0); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', ...S.card, cursor: 'pointer', transition: 'border-color .2s' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <div style={{ width: 160, fontSize: 15, color: 'rgba(0,210,170,.88)' }}>{m.name}</div>
                            <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: `${color}88`, width: 110 }}>{m.category}</div>
                            <div style={{ fontSize: 22, fontWeight: 500, color: STATUS_COLORS[m.status] || 'rgba(0,210,165,.85)', width: 100 }}>{m.value}<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(0,160,130,.5)', marginLeft: 3 }}>{m.unit}</span></div>
                            <div style={{ flex: 1 }}><SparkChart values={sorted.map(h => h.value)} color={color} width={100} /></div>
                            {pct && <div style={{ fontSize: 16, fontWeight: 500, color: Number(pct) > 0 ? 'rgba(0,210,165,.85)' : 'rgba(255,120,80,.85)', width: 70, textAlign: 'right' }}>{Number(pct) > 0 ? '+' : ''}{pct}%</div>}
                            <div style={{ fontSize: 13, color: STATUS_COLORS[m.status] || 'rgba(0,185,150,.7)', width: 80, textAlign: 'right' }}>{m.status}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                  <button onClick={() => { setPersonalised(p => ({ ...p, meals: undefined })); }} style={{ marginTop: 20, fontSize: 13, color: 'rgba(0,150,120,.45)', background: 'none', border: '1px solid rgba(0,150,120,.2)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
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
                  <button onClick={() => { setPersonalised(p => ({ ...p, supps: undefined })); }} style={{ marginTop: 20, fontSize: 13, color: 'rgba(0,150,120,.45)', background: 'none', border: '1px solid rgba(0,150,120,.2)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
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
                  <button onClick={() => { setPersonalised(p => ({ ...p, protocol: undefined })); }} style={{ marginTop: 20, fontSize: 13, color: 'rgba(0,150,120,.45)', background: 'none', border: '1px solid rgba(0,150,120,.2)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
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

        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}