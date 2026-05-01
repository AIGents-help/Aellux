import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import AuthPaywall from './AuthPaywall';

// ── TYPES ──────────────────────────────────────────────────────────────────
type OrbState = 'dormant' | 'listening' | 'thinking' | 'speaking';
type Panel = 'record' | 'compare' | 'protocol';
type Range = '3m' | '6m' | '1y';

// ── CLAUDE PROXY ───────────────────────────────────────────────────────────
async function callClaude(system: string, user: string): Promise<string> {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: system, userMessage: user, maxTokens: 800 }),
    });
    if (!res.ok) return 'I cannot reach the deep resonance right now. Try again shortly.';
    const d = await res.json();
    return d.text ?? d.content?.[0]?.text ?? 'The signal is quiet.';
  } catch {
    return 'The resonance is momentarily silent.';
  }
}

// ── MOCK DATA ──────────────────────────────────────────────────────────────
const MOCK_DOCS = [
  { name: 'blood_panel_q1_2025.pdf', date: 'Jan 2025', type: 'blood' },
  { name: 'wearable_export_march.csv', date: 'Mar 2025', type: 'wearable' },
  { name: 'bloodwork_q4_2024.pdf', date: 'Oct 2024', type: 'blood' },
];

const MOCK_DELTAS = [
  { label: 'What shifted', icon: '◈', value: 'HbA1c improved 0.4 points. Ferritin normalized. CRP still elevated at 3.2 mg/L — the one thing to watch.', color: 'rgba(0,192,155,.7)' },
  { label: 'How to feel about it', icon: '◉', value: 'The metabolic picture is meaningfully better. One season of consistent sleep did more than two years of supplements.', color: 'rgba(0,160,210,.7)' },
  { label: 'What to do', icon: '◎', value: 'Address CRP through anti-inflammatory protocol. Omega-3 at 3g/day + reduce refined carbohydrates.', color: 'rgba(0,212,168,.7)' },
  { label: 'What you should be proud of', icon: '✦', value: 'Your sleep architecture. 87 avg sleep score this quarter. Most people never achieve this.', color: 'rgba(180,140,255,.6)' },
];

const CMP_DATA: Record<Range, { markers: Array<{ name: string; then: string; now: string; dir: 'up' | 'down' | 'flat'; good: boolean }> }> = {
  '3m': {
    markers: [
      { name: 'HbA1c', then: '5.9', now: '5.5', dir: 'down', good: true },
      { name: 'Ferritin', then: '14 ng/mL', now: '68 ng/mL', dir: 'up', good: true },
      { name: 'CRP', then: '2.8 mg/L', now: '3.2 mg/L', dir: 'up', good: false },
      { name: 'Vitamin D', then: '22 ng/mL', now: '54 ng/mL', dir: 'up', good: true },
    ],
  },
  '6m': {
    markers: [
      { name: 'HbA1c', then: '6.1', now: '5.5', dir: 'down', good: true },
      { name: 'Ferritin', then: '9 ng/mL', now: '68 ng/mL', dir: 'up', good: true },
      { name: 'CRP', then: '4.1 mg/L', now: '3.2 mg/L', dir: 'down', good: true },
      { name: 'Testosterone', then: '412 ng/dL', now: '594 ng/dL', dir: 'up', good: true },
      { name: 'Cortisol AM', then: '22 μg/dL', now: '16 μg/dL', dir: 'down', good: true },
    ],
  },
  '1y': {
    markers: [
      { name: 'HbA1c', then: '6.4', now: '5.5', dir: 'down', good: true },
      { name: 'Ferritin', then: '8 ng/mL', now: '68 ng/mL', dir: 'up', good: true },
      { name: 'LDL (small)', then: '142 mg/dL', now: '98 mg/dL', dir: 'down', good: true },
      { name: 'Sleep Score', then: '61', now: '87', dir: 'up', good: true },
      { name: 'Body Fat %', then: '24.1', now: '18.8', dir: 'down', good: true },
      { name: 'VO₂ Max', then: '38.4', now: '47.2', dir: 'up', good: true },
    ],
  },
};

const PROTOS = [
  { id: 1, tier: 'HIGH', label: 'Morning light protocol', detail: '10 min outdoor light within 30 min of waking. Anchors cortisol timing.', prog: 0.78 },
  { id: 2, tier: 'HIGH', label: 'Omega-3 supplementation', detail: '3g EPA+DHA daily. Directly addresses elevated CRP signal.', prog: 0.55 },
  { id: 3, tier: 'MED', label: 'Zone 2 cardio — 45 min 3×/wk', detail: 'Your VO₂ trajectory suggests strong mitochondrial response to steady-state work.', prog: 0.62 },
  { id: 4, tier: 'MED', label: 'Dinner before 7pm window', detail: 'Time-restricted eating window supports the HbA1c improvement you\'ve already begun.', prog: 0.44 },
  { id: 5, tier: 'LOW', label: 'Monthly bloodwork cadence', detail: 'CRP resolution timeline requires quarterly verification minimum.', prog: 0.33 },
];

const NOTIF_POOL = [
  { id: 'n1', urgency: 'high', title: 'Pattern detected', body: 'Your CRP has been elevated for 90+ days. This is the threshold where intervention accelerates recovery.', action: 'See protocol' },
  { id: 'n2', urgency: 'low', title: 'Consistency signal', body: 'You\'ve logged 14 consecutive days of Zone 2 work. Your VO₂ response will materialize within 6–8 weeks.', action: 'View trajectory' },
];

// ── STAR FIELD ─────────────────────────────────────────────────────────────
const StarField = () => {
  const stars = useRef(Array.from({ length: 48 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 100,
    op: 0.08 + Math.random() * 0.25,
    dur: 3 + Math.random() * 6,
    delay: Math.random() * 5,
  }))).current;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: 1.5, height: 1.5, borderRadius: '50%',
          background: `rgba(0,192,155,${s.op})`,
          animation: `ae-star ${s.dur}s ${s.delay}s ease-in-out infinite`,
          '--op': s.op,
        } as React.CSSProperties} />
      ))}
    </div>
  );
};

// ── ORB SVG VEINS ──────────────────────────────────────────────────────────
const Veins = ({ orbState }: { orbState: OrbState }) => {
  const active = orbState !== 'dormant';
  const col = orbState === 'listening' ? 'rgba(0,192,155,' : orbState === 'thinking' ? 'rgba(80,160,255,' : orbState === 'speaking' ? 'rgba(0,212,168,' : 'rgba(0,80,65,';
  return (
    <svg viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: active ? 1 : 0.15, transition: 'opacity 1.2s' }}>
      <path d="M60,60 Q45,40 38,22" stroke={`${col}0.22)`} strokeWidth=".7" fill="none" />
      <path d="M60,60 Q75,42 82,20" stroke={`${col}0.18)`} strokeWidth=".5" fill="none" />
      <path d="M60,60 Q30,55 15,50" stroke={`${col}0.2)`} strokeWidth=".6" fill="none" />
      <path d="M60,60 Q90,58 105,52" stroke={`${col}0.18)`} strokeWidth=".5" fill="none" />
      <path d="M60,60 Q50,80 44,98" stroke={`${col}0.2)`} strokeWidth=".6" fill="none" />
      <path d="M60,60 Q70,82 76,100" stroke={`${col}0.18)`} strokeWidth=".5" fill="none" />
      <path d="M60,60 Q40,48 28,35 Q22,28 18,18" stroke={`${col}0.12)`} strokeWidth=".4" fill="none" />
      <path d="M60,60 Q80,48 92,36 Q98,28 102,18" stroke={`${col}0.1)`} strokeWidth=".35" fill="none" />
      <circle cx="60" cy="60" r="3" fill={`${col}${active ? '0.9' : '0.2'})`} />
      <circle cx="60" cy="60" r="8" fill="none" stroke={`${col}0.12)`} strokeWidth=".5" />
    </svg>
  );
};

// ── ORB COMPONENT ───────────────────────────────────────────────────────────
const Orb = ({ orbState, size = 140 }: { orbState: OrbState; size?: number }) => {
  const isDorm = orbState === 'dormant';
  const isListen = orbState === 'listening';
  const isThink = orbState === 'thinking';
  const isSpeak = orbState === 'speaking';

  return (
    <div className="ae-orb-wrap" style={{ width: size, height: size }}>
      {/* Rings */}
      {isListen && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              border: '.5px solid rgba(0,192,155,.45)',
              animation: `ae-listen-ring 2s ${i * 0.66}s ease-out infinite`,
            }} />
          ))}
        </div>
      )}
      {isSpeak && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {[0, 1].map(i => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              border: '.5px solid rgba(0,212,168,.35)',
              animation: `ae-speak-ring 2.2s ${i * 1.1}s ease-out infinite`,
            }} />
          ))}
        </div>
      )}
      {isThink && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              position: 'absolute', width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(80,160,255,.7)',
              animation: `ae-think 1.5s ${i * 0.25}s ease-in-out infinite`,
              transform: `rotate(${i * 60}deg) translateX(${size * 0.55}px)`,
            }} />
          ))}
        </div>
      )}
      {isDorm && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', borderRadius: '50%', border: '.5px solid rgba(0,80,60,0)', animation: 'ae-dorm 5s ease-in-out infinite', width: '80%', height: '80%' }} />
        </div>
      )}

      {/* Orb Body */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
        <div className="ae-orb-mem" />
        {!isDorm && <Veins orbState={orbState} />}
        <div className="ae-orb-iris" style={{ opacity: isDorm ? 0.12 : 1, transition: 'opacity 1.5s' }} />
        <div className="ae-orb-spec" style={{ width: '38%', height: '30%' }} />
      </div>
      <div className="ae-orb-rim" />
    </div>
  );
};

// ── AWAKEN SCREEN ──────────────────────────────────────────────────────────
const AwakenScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<'dormant' | 'proximity' | 'awakening' | 'speaking'>('dormant');
  const [orbState, setOrbState] = useState<OrbState>('dormant');
  const [text, setText] = useState('');
  const [ripples, setRipples] = useState(false);
  const fullText = 'I notice three things. Would you like to begin there?';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('proximity'), 1800);
    const t2 = setTimeout(() => {
      setPhase('awakening');
      setOrbState('thinking');
      setRipples(true);
    }, 3200);
    const t3 = setTimeout(() => {
      setPhase('speaking');
      setOrbState('speaking');
    }, 5200);
    const t4 = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setText(fullText.slice(0, ++i));
        if (i >= fullText.length) {
          clearInterval(iv);
          setTimeout(onComplete, 2800);
        }
      }, 38);
    }, 6000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <div className="ae-awaken-bg">
      <StarField />
      {ripples && [0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', borderRadius: '50%',
          border: '.5px solid rgba(0,192,155,.35)',
          animation: `ae-awaken 2.8s ${i * 0.9}s ease-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, zIndex: 2 }}>
        <div style={{ opacity: phase === 'dormant' ? 0.5 : 1, transition: 'opacity 1.5s' }}>
          <Orb orbState={orbState} size={160} />
        </div>

        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          {phase === 'dormant' && (
            <p className="ae-label" style={{ color: 'rgba(0,140,110,.28)', animation: 'ae-hint 3s ease-in-out infinite' }}>
              ancient intelligence. dormant.
            </p>
          )}
          {phase === 'proximity' && (
            <p className="ae-label" style={{ color: 'rgba(0,160,128,.45)', animation: 'ae-fade-up .6s ease forwards' }}>
              presence detected
            </p>
          )}
          {phase === 'awakening' && (
            <p className="ae-label" style={{ color: 'rgba(0,180,145,.6)', animation: 'ae-fade-up .5s ease forwards' }}>
              awakening
            </p>
          )}
          {phase === 'speaking' && text && (
            <p style={{
              fontSize: 18, color: 'rgba(0,202,162,.78)', fontStyle: 'italic',
              lineHeight: 1.85, letterSpacing: '.4px', minHeight: 52,
              animation: 'ae-fade-up .5s ease forwards',
            }}>
              {text}
              <span style={{ opacity: 0.5, animation: 'ae-iris 1s ease-in-out infinite' }}>|</span>
            </p>
          )}
        </div>

        {phase === 'dormant' && (
          <button
            onClick={() => { setPhase('proximity'); }}
            style={{
              background: 'transparent', border: '.5px solid rgba(0,172,138,.2)',
              color: 'rgba(0,172,138,.5)', padding: '6px 16px', borderRadius: 3,
              font: 'inherit', fontSize: 16, letterSpacing: 2.5, textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all .28s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,192,155,.45)'; (e.target as HTMLElement).style.color = 'rgba(0,192,155,.75)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,172,138,.2)'; (e.target as HTMLElement).style.color = 'rgba(0,172,138,.5)'; }}
          >
            approach
          </button>
        )}
      </div>
    </div>
  );
};

// ── LIVING RECORD PANEL ────────────────────────────────────────────────────
const RecordPanel = ({ onOrbState }: { onOrbState: (s: OrbState) => void }) => {
  const [docs, setDocs] = useState(MOCK_DOCS);
  const [response, setResponse] = useState('');
  const [showDeltas, setShowDeltas] = useState(true);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setResponse(''); onOrbState('thinking');
    const r = await callClaude(
      'You are Aellux — an ancient biological intelligence speaking with quiet authority. Your voice is calm, specific, poetic but never vague. Respond in 2–3 sentences maximum. Reference biological data directly when relevant.',
      q
    );
    setResponse(r); setLoading(false); onOrbState('speaking');
    setTimeout(() => onOrbState('dormant'), 6000);
  }, [onOrbState]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { ask(query); setQuery(''); }
  };

  return (
    <div className="ae-panel">
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingTop: 16 }}>
        <div>
          <p className="ae-label" style={{ color: 'rgba(0,192,155,.78)', marginBottom: 3 }}>Living Record</p>
          <p className="ae-micro" style={{ color: 'rgba(0,135,108,.35)' }}>3 documents · last signal 2h ago</p>
        </div>
        <label className="ae-upload" style={{ display: 'block' }}>
          <input type="file" accept=".pdf,.csv,.json" style={{ display: 'none' }} multiple onChange={e => {
            const files = Array.from(e.target.files ?? []);
            setDocs(d => [...d, ...files.map(f => ({ name: f.name, date: 'Now', type: 'upload' }))]);
            if (files.length) {
              onOrbState('thinking');
              setTimeout(() => { ask(`I just uploaded ${files.map(f => f.name).join(', ')}. What do you notice?`); }, 400);
            }
          }} />
          <p className="ae-micro" style={{ color: 'rgba(0,172,138,.45)', marginBottom: 2 }}>+ upload</p>
          <p style={{ fontSize: 12, color: 'rgba(0,130,105,.25)', letterSpacing: .8 }}>pdf · csv · json</p>
        </label>
      </div>

      {/* Uploaded docs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
        {docs.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 9px', borderRadius: 3,
            border: '.5px solid rgba(0,172,138,.07)', background: 'rgba(0,8,16,.5)',
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: d.type === 'blood' ? 'rgba(0,192,155,.55)' : d.type === 'wearable' ? 'rgba(80,160,255,.55)' : 'rgba(212,168,0,.55)', flexShrink: 0 }} />
            <p style={{ fontSize: 11.5, color: 'rgba(0,172,138,.58)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
            <p className="ae-micro" style={{ color: 'rgba(0,130,105,.3)', flexShrink: 0 }}>{d.date}</p>
          </div>
        ))}
      </div>

      {/* Aellux speak input */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          className="ae-input"
          placeholder="ask aellux anything about your biology…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => onOrbState('listening')}
          onBlur={() => !loading && onOrbState('dormant')}
        />
        <button
          onClick={() => { ask(query); setQuery(''); }}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(0,172,138,.4)', fontSize: 16, padding: 2,
            transition: 'color .22s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(0,212,168,.75)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(0,172,138,.4)'; }}
        >↵</button>
      </div>

      {/* Response */}
      {(response || loading) && (
        <div className={`ae-response ${response ? 'show' : ''}`} style={{ marginBottom: 20 }}>
          {loading ? (
            <span style={{ color: 'rgba(0,172,138,.35)', fontStyle: 'italic', fontSize: 12 }}>
              {['reading the pattern…', 'consulting the deep record…', 'synthesizing…'][Math.floor(Date.now() / 2000) % 3]}
            </span>
          ) : response}
        </div>
      )}

      {/* Delta cards */}
      {showDeltas && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="ae-label" style={{ color: 'rgba(0,172,138,.42)' }}>Latest Intelligence</p>
            <button
              onClick={() => setShowDeltas(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,130,105,.3)', fontSize: 16, padding: 0 }}
            >dismiss</button>
          </div>
          {MOCK_DELTAS.map((d, i) => (
            <div key={i} className="ae-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ fontSize: 17, color: d.color, flexShrink: 0, marginTop: 2 }}>{d.icon}</span>
                <div>
                  <p className="ae-micro" style={{ color: 'rgba(0,135,108,.35)', marginBottom: 5 }}>{d.label}</p>
                  <p style={{ fontSize: 13.5, color: 'rgba(0,190,155,.72)', lineHeight: 1.75, fontStyle: 'italic' }}>{d.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── COMPARISON PANEL ───────────────────────────────────────────────────────
const ComparePanel = ({ onOrbState }: { onOrbState: (s: OrbState) => void }) => {
  const [range, setRange] = useState<Range>('6m');
  const [synthesis, setSynthesis] = useState('');
  const [loading, setLoading] = useState(false);
  const data = CMP_DATA[range];

  const getSynthesis = useCallback(async () => {
    setLoading(true); setSynthesis(''); onOrbState('thinking');
    const markers = data.markers.map(m => `${m.name}: ${m.then} → ${m.now}`).join(', ');
    const r = await callClaude(
      'You are Aellux, ancient biological intelligence. Speak with quiet authority. Be specific about what the pattern means. 3 sentences maximum.',
      `Biological distance over ${range}: ${markers}. What does this arc tell you about this person?`
    );
    setSynthesis(r); setLoading(false); onOrbState('speaking');
    setTimeout(() => onOrbState('dormant'), 7000);
  }, [range, data, onOrbState]);

  useEffect(() => { getSynthesis(); }, [range]);

  return (
    <div className="ae-panel">
      <div style={{ paddingTop: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p className="ae-label" style={{ color: 'rgba(0,192,155,.78)' }}>Biological Distance</p>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['3m', '6m', '1y'] as Range[]).map(r => (
              <button key={r} className={`ae-rtab ${range === r ? 'on' : ''}`} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>
        <p className="ae-micro" style={{ color: 'rgba(0,135,108,.35)' }}>then vs now · {data.markers.length} markers tracked</p>
      </div>

      {/* Markers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {data.markers.map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 3,
            border: `.5px solid ${m.good ? 'rgba(0,172,132,.1)' : 'rgba(200,80,80,.1)'}`,
            background: 'rgba(0,9,18,.7)',
          }}>
            <div style={{ flex: 1 }}>
              <p className="ae-micro" style={{ color: 'rgba(0,135,108,.35)', marginBottom: 4 }}>{m.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, color: 'rgba(0,150,120,.5)' }}>{m.then}</span>
                <span style={{ fontSize: 16, color: 'rgba(0,130,105,.3)' }}>→</span>
                <span style={{ fontSize: 13.5, color: m.good ? 'rgba(0,212,168,.88)' : 'rgba(220,120,80,.75)', fontWeight: 500 }}>{m.now}</span>
              </div>
            </div>
            <span style={{ fontSize: 17, color: m.good ? 'rgba(0,212,168,.7)' : 'rgba(220,100,80,.6)' }}>
              {m.dir === 'up' ? '↑' : m.dir === 'down' ? '↓' : '→'}
            </span>
          </div>
        ))}
      </div>

      {/* Synthesis */}
      <div className="ae-syn">
        <p className="ae-micro" style={{ color: 'rgba(0,135,108,.35)', marginBottom: 10 }}>aellux synthesis</p>
        <div className={`ae-response ${synthesis ? 'show' : ''}`} style={{ marginBottom: 0, border: 'none', background: 'none', padding: '0' }}>
          {loading ? (
            <span style={{ color: 'rgba(0,152,125,.32)', fontStyle: 'italic', fontSize: 12 }}>reading your arc…</span>
          ) : synthesis}
        </div>
        <button
          onClick={getSynthesis}
          style={{
            marginTop: 10, background: 'none', border: '.5px solid rgba(0,150,120,.14)',
            color: 'rgba(0,150,120,.4)', padding: '4px 10px', borderRadius: 2,
            font: 'inherit', fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all .22s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,192,155,.3)'; (e.target as HTMLElement).style.color = 'rgba(0,192,155,.65)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,150,120,.14)'; (e.target as HTMLElement).style.color = 'rgba(0,150,120,.4)'; }}
        >re-synthesize</button>
      </div>
    </div>
  );
};

// ── PROTOCOL PANEL ─────────────────────────────────────────────────────────
const ProtocolPanel = ({ onOrbState }: { onOrbState: (s: OrbState) => void }) => {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (id: number) => {
    const n = new Set(completed);
    n.has(id) ? n.delete(id) : n.add(id);
    setCompleted(n);
  };

  const score = Math.round((completed.size / PROTOS.length) * 100);
  const circumference = 2 * Math.PI * 22;
  const dash = circumference - (score / 100) * circumference;

  const tierColor = (t: string) => t === 'HIGH' ? 'rgba(0,212,168,.6)' : t === 'MED' ? 'rgba(80,160,255,.5)' : 'rgba(0,150,120,.35)';

  return (
    <div className="ae-panel">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 16, marginBottom: 22 }}>
        <div>
          <p className="ae-label" style={{ color: 'rgba(0,192,155,.78)', marginBottom: 3 }}>Living Protocol</p>
          <p className="ae-micro" style={{ color: 'rgba(0,135,108,.35)' }}>{PROTOS.length} interventions · ranked by leverage</p>
        </div>
        {/* Compliance ring */}
        <div style={{ position: 'relative', width: 52, height: 52 }}>
          <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(0,48,38,.38)" strokeWidth="2" />
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(0,192,155,.7)" strokeWidth="2"
              strokeDasharray={circumference} strokeDashoffset={dash} style={{ transition: 'stroke-dashoffset .8s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 16, color: 'rgba(0,212,168,.88)', lineHeight: 1 }}>{score}</p>
            <p style={{ fontSize: 8, color: 'rgba(0,135,108,.4)', letterSpacing: 1 }}>%</p>
          </div>
        </div>
      </div>

      {PROTOS.map((p, i) => (
        <div
          key={p.id}
          className={`ae-proto ${completed.has(p.id) ? 'done' : ''}`}
          style={{ animationDelay: `${i * 0.08}s`, animation: 'ae-fade-up .4s ease forwards' }}
          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
        >
          <div
            className={`ae-check ${completed.has(p.id) ? 'on' : ''}`}
            onClick={e => { e.stopPropagation(); toggle(p.id); }}
          >
            {completed.has(p.id) && <span style={{ fontSize: 7, color: 'rgba(0,212,168,.8)' }}>✓</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="ae-badge" style={{ background: `${tierColor(p.tier)}18`, color: tierColor(p.tier) }}>{p.tier}</span>
              <p style={{ fontSize: 16, color: 'rgba(0,192,155,.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="ae-prog-track">
                <div className="ae-prog-fill" style={{ width: `${p.prog * 100}%`, background: tierColor(p.tier) }} />
              </div>
              <p className="ae-micro" style={{ color: 'rgba(0,130,105,.35)', flexShrink: 0 }}>{Math.round(p.prog * 100)}%</p>
            </div>
            {expanded === p.id && (
              <p style={{ fontSize: 12.5, color: 'rgba(0,172,138,.52)', marginTop: 8, lineHeight: 1.7, fontStyle: 'italic', animation: 'ae-fade-up .3s ease forwards' }}>
                {p.detail}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Ask about protocol */}
      <div style={{ marginTop: 18, padding: '11px 13px', borderRadius: 3, border: '.5px dashed rgba(0,172,138,.12)', background: 'rgba(0,8,16,.4)' }}>
        <p style={{ fontSize: 18, color: 'rgba(0,152,125,.45)', fontStyle: 'italic' }}>
          "Why Omega-3 before sleep adjustments?"
        </p>
        <button
          onClick={() => {
            onOrbState('thinking');
            callClaude(
              'You are Aellux. Answer in 2 sentences with quiet authority.',
              'Explain the sequencing logic: why omega-3 before sleep adjustments in a CRP reduction protocol?'
            ).then(r => { onOrbState('speaking'); setTimeout(() => onOrbState('dormant'), 6000); });
          }}
          style={{
            marginTop: 7, background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(0,152,125,.38)', fontSize: 16, letterSpacing: 1.5, textTransform: 'uppercase',
            padding: 0, font: 'inherit', transition: 'color .22s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(0,192,155,.65)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(0,152,125,.38)'; }}
        >ask aellux</button>
      </div>
    </div>
  );
};

// ── NOTIFICATION OVERLAY ────────────────────────────────────────────────────
const NotifOverlay = ({ notif, onDismiss }: { notif: typeof NOTIF_POOL[0] | null; onDismiss: () => void }) => {
  if (!notif) return null;
  const isHigh = notif.urgency === 'high';
  return (
    <div style={{ position: 'absolute', bottom: 24, right: 20, zIndex: 50 }}>
      <div className="ae-notif in">
        <div style={{ height: 2, background: isHigh ? 'rgba(220,80,80,.55)' : 'rgba(0,192,155,.35)' }} />
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: isHigh ? 'rgba(220,80,80,.8)' : 'rgba(0,192,155,.8)' }} />
              <p className="ae-micro" style={{ color: isHigh ? 'rgba(220,100,80,.65)' : 'rgba(0,192,155,.55)' }}>
                {isHigh ? 'signal · high urgency' : 'signal · low urgency'}
              </p>
            </div>
            <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,130,105,.3)', fontSize: 18, padding: 0 }}>×</button>
          </div>
          <p style={{ fontSize: 16, color: 'rgba(0,192,155,.85)', marginBottom: 6 }}>{notif.title}</p>
          <p style={{ fontSize: 12.5, color: 'rgba(0,165,135,.6)', lineHeight: 1.72, fontStyle: 'italic', marginBottom: 11 }}>{notif.body}</p>
          <button
            style={{
              background: 'rgba(0,48,38,.22)', border: '.5px solid rgba(0,192,155,.18)',
              color: 'rgba(0,192,155,.7)', padding: '4px 10px', borderRadius: 2,
              font: 'inherit', fontSize: 16, letterSpacing: 1.8, textTransform: 'uppercase', cursor: 'pointer',
            }}
            onClick={onDismiss}
          >{notif.action}</button>
        </div>
      </div>
    </div>
  );
};

// ── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [awakened, setAwakened] = useState(false);
  const [panel, setPanel] = useState<Panel>('record');
  const [orbState, setOrbState] = useState<OrbState>('dormant');
  const [notif, setNotif] = useState<typeof NOTIF_POOL[0] | null>(null);

  // Show notification after awakening
  useEffect(() => {
    if (!awakened) return;
    const t = setTimeout(() => setNotif(NOTIF_POOL[0]), 4000);
    return () => clearTimeout(t);
  }, [awakened]);

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020810' }}>
        <div style={{ textAlign: 'center' }}>
          <Orb orbState="thinking" size={80} />
          <p className="ae-label" style={{ color: 'rgba(0,150,120,.35)', marginTop: 16 }}>awakening</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPaywall />;

  if (!awakened) return <AwakenScreen onComplete={() => setAwakened(true)} />;

  const navItems: Array<{ id: Panel; label: string; icon: string }> = [
    { id: 'record', label: 'Living Record', icon: '◈' },
    { id: 'compare', label: 'Bio Distance', icon: '◎' },
    { id: 'protocol', label: 'Protocol', icon: '◉' },
  ];

  return (
    <div className="ae-layout" style={{ position: 'relative' }}>
      <StarField />

      {/* ── LEFT COLUMN ── */}
      <aside className="ae-lc">
        {/* Orb */}
        <div style={{ marginBottom: 20 }}>
          <Orb orbState={orbState} size={130} />
        </div>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <p style={{ fontSize: 16, letterSpacing: 2.5, color: 'rgba(0,192,155,.72)', marginBottom: 2 }}>AELLUX</p>
          <div className="ae-divider" style={{ margin: '0 auto' }} />
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 158, marginBottom: 'auto' }}>
          {navItems.map(n => (
            <button
              key={n.id}
              className={`ae-nav ${panel === n.id ? 'active' : ''}`}
              onClick={() => setPanel(n.id)}
            >
              <span style={{ fontSize: 11 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>

        {/* Notif queue items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 158, marginTop: 18 }}>
          {NOTIF_POOL.map((n, i) => (
            <div
              key={n.id}
              className="ae-nqi show"
              style={{ transitionDelay: `${i * 0.15 + 0.5}s` }}
              onClick={() => setNotif(n)}
            >
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: n.urgency === 'high' ? 'rgba(220,80,80,.7)' : 'rgba(0,192,155,.7)', flexShrink: 0 }} />
              <p style={{ fontSize: 16, color: 'rgba(0,162,132,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
            </div>
          ))}
        </div>

        {/* Orb state label */}
        <p className="ae-micro" style={{ color: 'rgba(0,120,95,.28)', marginTop: 14 }}>
          {orbState === 'dormant' ? 'watching' : orbState === 'listening' ? 'listening…' : orbState === 'thinking' ? 'reading your arc…' : 'speaking'}
        </p>
      </aside>

      {/* ── RIGHT SIDE ── */}
      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Topbar */}
        <div className="ae-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,192,155,.6)', animation: 'ae-iris 4s ease-in-out infinite' }} />
            <p className="ae-label" style={{ color: 'rgba(0,162,132,.48)' }}>
              {navItems.find(n => n.id === panel)?.label ?? 'Aellux'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <p className="ae-micro" style={{ color: 'rgba(0,130,105,.25)' }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <div style={{ width: .5, height: 14, background: 'rgba(0,155,125,.12)' }} />
            <p className="ae-micro" style={{ color: 'rgba(0,130,105,.25)' }}>{user?.email?.split('@')[0] ?? 'observer'}</p>
          </div>
        </div>

        {/* Panel content */}
        {panel === 'record' && <RecordPanel onOrbState={setOrbState} />}
        {panel === 'compare' && <ComparePanel onOrbState={setOrbState} />}
        {panel === 'protocol' && <ProtocolPanel onOrbState={setOrbState} />}

        {/* Notification overlay */}
        <NotifOverlay notif={notif} onDismiss={() => setNotif(null)} />
      </main>
    </div>
  );
}
