// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Flag {
  marker: string;
  value: string;
  labeled_as: string;
  why_concerning: string;
  severity: 'watch' | 'concern' | 'act';
  action: string;
}

interface Props {
  document: any;
  allMarkers: any[];
  userId?: string;
  plan?: string;
  profile?: any;
}

const SEVERITY_CONFIG = {
  watch:   { color: '#f59e0b', label: 'Worth watching',   bg: 'rgba(245,158,11,.06)',   border: 'rgba(245,158,11,.25)' },
  concern: { color: '#fb923c', label: 'Needs attention',  bg: 'rgba(251,146,60,.06)',   border: 'rgba(251,146,60,.28)' },
  act:     { color: '#f87171', label: 'Act on this',      bg: 'rgba(248,113,113,.07)',  border: 'rgba(248,113,113,.32)' },
};

export default function DoctorMissed({ document, allMarkers, userId, plan, profile }: Props) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const profileCtx = profile ? [
    profile.biological_sex && `sex: ${profile.biological_sex}`,
    profile.birth_year && `age: ${new Date().getFullYear() - profile.birth_year}`,
    profile.weight_kg && `weight: ${profile.weight_kg}kg`,
    profile.goal && `goal: ${profile.goal}`,
  ].filter(Boolean).join(', ') : '';

  const analyze = async () => {
    if (!document?.markers?.length) return;
    setLoading(true);
    try {
      const res = await fetch('/api/doctor-missed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, plan,
          docMarkers: document.markers,
          allMarkers,
          profileCtx,
          docSummary: document.summary,
          docType: document.document_type,
        }),
      });
      const data = await res.json();
      setFlags(data.flags || []);
    } catch {}
    setLoading(false);
    setRan(true);
  };

  if (!document?.markers?.length) return null;

  return (
    <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(0,8,18,.5)', border: '1px solid rgba(0,210,165,.14)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ran ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(220,255,235,.9)', fontWeight: 500 }}>
            What your doctor may have missed
          </div>
          {!ran && (
            <div style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', marginTop: 3 }}>
              Aellux cross-references these results against your full biological picture
            </div>
          )}
        </div>
        {!ran && !loading && (
          <button onClick={analyze}
            style={{ flexShrink: 0, fontSize: 13, padding: '7px 14px', background: 'rgba(0,210,165,.08)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 5, color: 'rgba(0,225,180,.85)', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 12 }}>
            Analyze →
          </button>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: 'rgba(0,210,165,.6)', fontStyle: 'italic' }}>
          Aellux is reading between the lines…
        </div>
      )}

      {ran && flags.length === 0 && (
        <div style={{ fontSize: 13, color: 'rgba(52,211,153,.75)' }}>
          ✓ Nothing hidden here — these results are genuinely clean given your full biological context.
        </div>
      )}

      {ran && flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {flags.map((flag, i) => {
            const cfg = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.watch;
            const isOpen = expanded === i;
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? null : i)}
                style={{ padding: '12px 14px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 7, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}88` }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, color: 'rgba(220,255,235,.95)', fontWeight: 500 }}>{flag.marker}</span>
                      <span style={{ fontSize: 12, color: cfg.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', marginTop: 2 }}>
                      {flag.value} — labeled "{flag.labeled_as}"
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: 10 }}>
                        <p style={{ fontSize: 14, color: 'rgba(220,255,235,.9)', lineHeight: 1.7, margin: '0 0 10px', fontWeight: 300 }}>
                          {flag.why_concerning}
                        </p>
                        <div style={{ padding: '8px 12px', background: cfg.color + '12', border: `1px solid ${cfg.color}33`, borderRadius: 5 }}>
                          <div style={{ fontSize: 11, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>What to do</div>
                          <p style={{ fontSize: 13, color: 'rgba(220,255,235,.88)', lineHeight: 1.65, margin: 0 }}>{flag.action}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(0,210,165,.35)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>⌄</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
