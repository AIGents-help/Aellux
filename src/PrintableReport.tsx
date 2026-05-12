import React from 'react';

interface Marker { name: string; value: any; unit?: string; status?: string; category?: string; }

interface PrintProps {
  section: 'meals' | 'supps' | 'protocol' | 'synthesis' | 'all' | null;
  personalised: any;
  markers: Marker[];
  userEmail?: string;
  generatedAt?: Date;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ── Aellux orb mark as inline SVG (works in print, no external dep) ──────────
const Orb = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <defs>
      <radialGradient id="orb-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#00d2a5" stopOpacity="1" />
        <stop offset="60%" stopColor="#007a5c" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#001a14" stopOpacity="1" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#orb-grad)" stroke="#003d2e" strokeWidth="1" />
    <circle cx="42" cy="40" r="10" fill="#a8ffe2" opacity="0.4" />
  </svg>
);

const SectionHeader = ({ title }: { title: string }) => (
  <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 22, color: '#003d2e', margin: '24px 0 12px', fontWeight: 500, borderBottom: '1px solid #b8d8cd', paddingBottom: 6, breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
    {title}
  </h2>
);

const Para = ({ children, italic = false, size = 13 }: any) => (
  <p style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: size, color: '#1a3a30', lineHeight: 1.6, margin: '0 0 10px', fontStyle: italic ? 'italic' : 'normal' }}>{children}</p>
);

const Label = ({ children }: any) => (
  <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 10, color: '#5a7a6d', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>{children}</div>
);

// ── Page sections ────────────────────────────────────────────────────────────
function CoverPage({ title, generatedAt }: { title: string; generatedAt: Date }) {
  return (
    <div style={{ pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '85vh', textAlign: 'center', padding: '40px 20px' }}>
      <Orb size={80} />
      <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 36, color: '#003d2e', margin: '32px 0 8px', fontWeight: 500 }}>Aellux</div>
      <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 11, color: '#5a7a6d', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 60 }}>Ancient Intelligence · Present Clarity</div>
      <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 26, color: '#1a3a30', maxWidth: 480, lineHeight: 1.3, fontWeight: 400 }}>{title}</div>
      <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 12, color: '#7a9285', letterSpacing: '0.08em', marginTop: 24 }}>Generated {fmtDate(generatedAt)}</div>
    </div>
  );
}

function SynthesisSection({ data }: { data: any }) {
  if (!data) return null;
  return (
    <section style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
      <SectionHeader title="Health Synthesis" />
      {data.aellux_voice && <Para italic size={15}>{data.aellux_voice}</Para>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '14px 0' }}>
        {data.biological_age_estimate && (
          <div style={{ padding: '10px 14px', border: '1px solid #b8d8cd', borderRadius: 4 }}>
            <Label>Biological Age</Label>
            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 20, color: '#003d2e', fontWeight: 500 }}>
              {data.biological_age_estimate}
              {data.bio_age_gap && <span style={{ fontSize: 11, marginLeft: 8, color: '#5a7a6d' }}>({data.bio_age_gap})</span>}
            </div>
          </div>
        )}
        {data.focus_priority && (
          <div style={{ padding: '10px 14px', border: '1px solid #d8c0a0', borderRadius: 4, background: '#fdf6ea' }}>
            <Label>Focus Priority</Label>
            <Para size={13}>{data.focus_priority}</Para>
          </div>
        )}
      </div>
      {data.primary_systems && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '14px 0' }}>
          {Object.entries(data.primary_systems).map(([k, v]) => (
            <div key={k} style={{ padding: '8px 10px', border: '1px solid #d4e5dc', borderRadius: 4, textAlign: 'center' }}>
              <Label>{k}</Label>
              <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 13, color: '#1a3a30' }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
      {data.critical_flags && data.critical_flags.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Label>Critical flags</Label>
          {data.critical_flags.map((f: string, i: number) => (
            <Para key={i} size={13}>• {f}</Para>
          ))}
        </div>
      )}
      {data.biggest_wins && data.biggest_wins.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Label>Biggest wins</Label>
          {data.biggest_wins.map((f: string, i: number) => (
            <Para key={i} size={13}>• {f}</Para>
          ))}
        </div>
      )}
    </section>
  );
}

function MealsSection({ data }: { data: any }) {
  if (!data || !Array.isArray(data.meals)) return null;
  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader title="Personalised Meal Protocol" />
      {data.key_insight && <Para italic size={14}>{data.key_insight}</Para>}
      {data.daily_targets && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '14px 0' }}>
          {Object.entries(data.daily_targets).map(([k, v]) => (
            <div key={k} style={{ padding: '8px 10px', border: '1px solid #d4e5dc', borderRadius: 4, textAlign: 'center' }}>
              <Label>{k}</Label>
              <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 18, color: '#003d2e', fontWeight: 500 }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
      {data.meals.map((m: any, i: number) => (
        <div key={i} style={{ marginBottom: 14, padding: '12px 16px', border: '1px solid #d4e5dc', borderRadius: 4, pageBreakInside: 'avoid' }}>
          <Label>{m.time}</Label>
          <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 18, color: '#003d2e', fontWeight: 500, marginBottom: 6 }}>{m.name}</div>
          {m.why && <Para italic size={13}>{m.why}</Para>}
          {m.items && m.items.length > 0 && (
            <div style={{ margin: '8px 0' }}>
              {m.items.map((it: string, idx: number) => (
                <Para key={idx} size={13}>• {it}</Para>
              ))}
            </div>
          )}
          {m.macros && (
            <div style={{ fontSize: 11, color: '#5a7a6d', marginTop: 6 }}>
              {m.macros.cal} cal · P {m.macros.p}g · C {m.macros.c}g · F {m.macros.f}g
            </div>
          )}
        </div>
      ))}
      {data.foods_to_avoid && data.foods_to_avoid.length > 0 && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#fdf3f0', border: '1px solid #e8c4b8', borderRadius: 4 }}>
          <Label>Foods to avoid</Label>
          {data.foods_to_avoid.map((f: string, i: number) => (
            <Para key={i} size={13}>✕ {f}</Para>
          ))}
        </div>
      )}
    </section>
  );
}

function SuppsSection({ data }: { data: any }) {
  if (!data || !Array.isArray(data.supplements)) return null;
  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader title="Personalised Supplement Stack" />
      {data.key_insight && <Para italic size={14}>{data.key_insight}</Para>}
      {[1, 2, 3].map(tier => {
        const tierSupps = data.supplements.filter((s: any) => s.priority === tier);
        if (tierSupps.length === 0) return null;
        const tierLabel = tier === 1 ? 'Priority 1 — Foundation' : tier === 2 ? 'Priority 2 — Optimisation' : 'Priority 3 — Optional';
        return (
          <div key={tier} style={{ marginBottom: 14 }}>
            <Label>{tierLabel}</Label>
            {tierSupps.map((s: any, i: number) => (
              <div key={i} style={{ marginBottom: 10, padding: '12px 16px', border: '1px solid #d4e5dc', borderRadius: 4, pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 17, color: '#003d2e', fontWeight: 500 }}>{s.name}</div>
                  {s.cost_monthly && <div style={{ fontSize: 11, color: '#5a7a6d' }}>{s.cost_monthly}/mo</div>}
                </div>
                <div style={{ fontSize: 12, color: '#5a7a6d', marginBottom: 4 }}>{s.dose} · {s.timing}</div>
                {s.why && <Para italic size={13}>{s.why}</Para>}
                {s.expected_impact && <Para size={12}><strong>Expected impact:</strong> {s.expected_impact}</Para>}
                {s.contraindications && s.contraindications.length > 0 && (
                  <Para size={11}>⚠ {s.contraindications.join('; ')}</Para>
                )}
              </div>
            ))}
          </div>
        );
      })}
      {data.total_foundation_cost && (
        <div style={{ padding: '10px 14px', background: '#eef7f3', border: '1px solid #b8d8cd', borderRadius: 4, marginTop: 10 }}>
          <Label>Foundation stack monthly cost</Label>
          <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 18, color: '#003d2e', fontWeight: 500 }}>{data.total_foundation_cost}</div>
        </div>
      )}
    </section>
  );
}

function ProtocolSection({ data }: { data: any }) {
  if (!data || !Array.isArray(data.protocols)) return null;
  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeader title="Daily Protocol" />
      {data.biggest_lever && (
        <div style={{ padding: '12px 16px', background: '#fdf6ea', border: '1px solid #d8c0a0', borderRadius: 4, marginBottom: 14 }}>
          <Label>Biggest lever</Label>
          <Para size={14}>{data.biggest_lever}</Para>
        </div>
      )}
      {data.key_insight && <Para italic size={13}>{data.key_insight}</Para>}
      {data.protocols.map((p: any, i: number) => (
        <div key={i} style={{ marginBottom: 10, padding: '12px 16px', border: '1px solid #d4e5dc', borderRadius: 4, pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Label>Tier {p.tier} · {p.time_of_day} · {p.frequency}</Label>
            {p.duration && <div style={{ fontSize: 11, color: '#5a7a6d' }}>{p.duration}</div>}
          </div>
          <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 16, color: '#003d2e', fontWeight: 500, marginBottom: 4 }}>{p.action}</div>
          {p.why && <Para italic size={13}>{p.why}</Para>}
          {p.expected_impact && <Para size={12}><strong>Expected impact:</strong> {p.expected_impact}</Para>}
        </div>
      ))}
      {data.avoid && data.avoid.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fdf3f0', border: '1px solid #e8c4b8', borderRadius: 4 }}>
          <Label>Avoid</Label>
          {data.avoid.map((a: string, i: number) => (
            <Para key={i} size={13}>✕ {a}</Para>
          ))}
        </div>
      )}
    </section>
  );
}

function BiomarkerTable({ markers }: { markers: Marker[] }) {
  if (!markers || markers.length === 0) return null;
  return (
    <section style={{ marginBottom: 24, pageBreakBefore: 'always' }}>
      <SectionHeader title="Your Biomarker Snapshot" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'EB Garamond, Georgia, serif', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #b8d8cd' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#5a7a6d', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Marker</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#5a7a6d', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Category</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5a7a6d', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Value</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5a7a6d', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {markers.map((m, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e8f0ec' }}>
              <td style={{ padding: '5px 8px', color: '#1a3a30' }}>{m.name}</td>
              <td style={{ padding: '5px 8px', color: '#5a7a6d' }}>{m.category || '—'}</td>
              <td style={{ padding: '5px 8px', color: '#003d2e', textAlign: 'right', fontWeight: 500 }}>{m.value} {m.unit || ''}</td>
              <td style={{ padding: '5px 8px', color: m.status === 'optimal' || m.status === 'normal' ? '#1a7a4c' : '#a04020', textAlign: 'right', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>{m.status || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function PrintableReport({ section, personalised, markers, userEmail, generatedAt }: PrintProps) {
  if (!section) return null;
  const date = generatedAt || new Date();

  const titles: Record<string, string> = {
    meals: 'Your Personalised Meal Protocol',
    supps: 'Your Personalised Supplement Stack',
    protocol: 'Your Daily Protocol',
    synthesis: 'Your Health Synthesis',
    all: 'Your Complete Aellux Protocol Report',
  };

  return (
    <div id="aellux-print-root" className="aellux-print-root">
      <CoverPage title={titles[section]} generatedAt={date} />

      <div className="aellux-print-page" style={{ padding: '0 30px' }}>
        {/* Running header on every printed page (browsers handle this differently;
            we visually include it once at top of content as a fallback) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid #d4e5dc', marginBottom: 18 }}>
          <Orb size={28} />
          <div>
            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 18, color: '#003d2e', fontWeight: 500, lineHeight: 1 }}>Aellux</div>
            <div style={{ fontSize: 9, color: '#7a9285', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3 }}>Personalised from your biology</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 10, color: '#7a9285' }}>{fmtDate(date)}</div>
        </div>

        {(section === 'synthesis' || section === 'all') && <SynthesisSection data={personalised?.synthesis} />}
        {(section === 'meals' || section === 'all') && <MealsSection data={personalised?.meals} />}
        {(section === 'supps' || section === 'all') && <SuppsSection data={personalised?.supps} />}
        {(section === 'protocol' || section === 'all') && <ProtocolSection data={personalised?.protocol} />}
        {section === 'all' && <BiomarkerTable markers={markers} />}

        {/* Last-page footer with user attribution + medical disclaimer */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #d4e5dc', fontFamily: 'EB Garamond, Georgia, serif', pageBreakInside: 'avoid' }}>
          <Para size={10}>
            <em>This is a personalised intelligence report, not medical advice. Consult your physician before making health decisions or starting any new protocol, supplement, or medication.</em>
          </Para>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 9, color: '#c0d0c8' }}>
            <span>aellux.health</span>
            {userEmail && <span>Generated for {userEmail} on {fmtDate(date)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
