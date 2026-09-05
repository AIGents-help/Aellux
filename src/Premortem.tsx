// @ts-nocheck
import React, { useState } from 'react';

interface Scenario {
  title: string;
  timeline: string;
  severity: 'watch' | 'concern' | 'critical';
  what_happens: string;
  warning_signs: string;
  the_intervention: string;
  window: string;
}

interface PremResult {
  scenarios: Scenario[];
  overall_trajectory: string;
  bright_spots: string[];
}

interface Props {
  userId?: string;
  plan?: string;
  allMarkers: any[];
  profile?: any;
}

const SEV = {
  watch:    { color: 'var(--accent-watch)', border: 'rgba(245,158,11,.25)', bg: 'rgba(245,158,11,.05)', label: 'Worth watching' },
  concern:  { color: 'var(--accent-watch)', border: 'rgba(251,146,60,.28)', bg: 'rgba(251,146,60,.06)', label: 'Needs attention' },
  critical: { color: 'var(--accent-elevated)', border: 'rgba(248,113,113,.35)', bg: 'rgba(248,113,113,.07)', label: 'Act now' },
};

export default function Premortem({ userId, plan, allMarkers, profile }: Props) {
  const [result, setResult] = useState<PremResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch('/api/premortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan, allMarkers }),
      });
      const data = await res.json();
      if (data.rateLimited) {
        // no-op — rate limit isn't an error, just don't set a result
      } else if (data.error && (!data.scenarios || data.scenarios.length === 0)) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not reach the trajectory analysis service.');
    }
    setLoading(false); setRan(true);
  };

  const markersWithHistory = allMarkers.filter(m => m.history?.length > 2).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(248,113,113,.7)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Trajectory Analysis</div>
          <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 22, color: 'var(--text-primary)', marginBottom: 6 }}>Where are you heading?</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 520 }}>
            Aellux reads your current biological trajectory and names the specific failure modes you are tracking toward — so you can change course while the window is still open.
          </div>
        </div>
        {!ran && (
          <button onClick={run} disabled={loading || markersWithHistory < 2}
            style={{ flexShrink: 0, fontSize: 14, color: markersWithHistory < 2 ? 'rgba(0,210,165,.3)' : 'rgba(248,113,113,1)', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 6, padding: '10px 20px', cursor: markersWithHistory < 2 ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            {loading ? 'Reading your trajectory…' : 'Run premortem →'}
          </button>
        )}
      </div>

      {markersWithHistory < 2 && !ran && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
          Trajectory analysis requires at least 2 lab uploads separated in time. Upload your next set of labs to unlock this feature.
        </div>
      )}

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(248,113,113,.7)', fontStyle: 'italic', marginBottom: 8 }}>Aellux is reading across your timeline…</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Analyzing marker trajectories, compliance patterns, and biological age slope</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '14px 16px', background: 'rgba(153,27,27,.06)', border: '1px solid rgba(153,27,27,.3)', borderRadius: 8, marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: '#991b1b', lineHeight: 1.6, margin: '0 0 10px' }}>{error}</p>
          <button onClick={() => { setRan(false); setError(null); }}
            style={{ fontSize: 13, color: '#991b1b', background: 'none', border: '1px solid rgba(153,27,27,.3)', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Try again
          </button>
        </div>
      )}

      {result && (
        <div>
          {/* Overall trajectory */}
          {result.overall_trajectory && (
            <div style={{ padding: '18px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderLeft: '3px solid var(--text-tertiary)', borderRadius: 8, marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Overall Read</div>
              <p style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{result.overall_trajectory}</p>
            </div>
          )}

          {/* Scenarios */}
          {result.scenarios?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: 'rgba(248,113,113,.65)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                Failure modes you are currently tracking toward
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.scenarios.map((s, i) => {
                  const cfg = SEV[s.severity] || SEV.watch;
                  const isOpen = expanded === i;
                  return (
                    <div key={i} onClick={() => setExpanded(isOpen ? null : i)}
                      style={{ padding: '16px 18px', background: cfg.bg, border: `1px solid ${isOpen ? cfg.color + '55' : cfg.border}`, borderRadius: 8, cursor: 'pointer', transition: 'border-color .2s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 8px ${cfg.color}88`, flexShrink: 0, marginTop: 5 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 18, color: 'var(--text-primary)', fontWeight: 500 }}>{s.title}</div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{cfg.label}</span>
                              <span style={{ fontSize: 14, color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Timeline: {s.timeline}</div>
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${cfg.border}` }}>
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: cfg.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>What happens</div>
                            <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.75, margin: 0, fontWeight: 300 }}>{s.what_happens}</p>
                          </div>
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: 'var(--accent-watch)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>You may already be feeling</div>
                            <p style={{ fontSize: 15, color: 'var(--accent-watch)', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{s.warning_signs}</p>
                          </div>
                          <div style={{ padding: '14px 16px', background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 7, marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: 'rgba(52,211,153,.8)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>The intervention that changes this</div>
                            <p style={{ fontSize: 15, color: 'rgba(180,255,220,.92)', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>{s.the_intervention}</p>
                          </div>
                          <div style={{ fontSize: 13, color: cfg.color, fontStyle: 'italic', lineHeight: 1.6 }}>
                            ⏱ {s.window}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bright spots */}
          {result.bright_spots?.length > 0 && (
            <div style={{ padding: '16px 18px', background: 'rgba(52,211,153,.05)', border: '1px solid rgba(52,211,153,.18)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(52,211,153,.75)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>What is working — protect these</div>
              {result.bright_spots.map((b, i) => (
                <div key={i} style={{ fontSize: 15, color: 'rgba(180,255,220,.9)', lineHeight: 1.65, marginBottom: 6, display: 'flex', gap: 10, fontWeight: 300 }}>
                  <span style={{ color: 'rgba(52,211,153,.8)', flexShrink: 0 }}>✓</span>{b}
                </div>
              ))}
            </div>
          )}

          {/* Re-run */}
          <button onClick={() => { setRan(false); setResult(null); setExpanded(null); }}
            style={{ fontSize: 13, color: 'var(--text-tertiary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Re-run with latest data
          </button>
        </div>
      )}
    </div>
  );
}
