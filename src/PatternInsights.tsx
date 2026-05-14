// @ts-nocheck
import React, { useState } from 'react';

interface Pattern {
  type: 'seasonal' | 'correlated' | 'triggered' | 'supplement';
  title: string;
  markers: string[];
  finding: string;
  action: string;
}

interface Props {
  patterns: Pattern[];
  loading?: boolean;
  onRefresh?: () => void;
}

const TYPE_CONFIG = {
  seasonal:   { color: '#f59e0b', label: 'Seasonal', icon: '◐' },
  correlated: { color: '#34d399', label: 'Correlated', icon: '⟺' },
  triggered:  { color: '#f87171', label: 'Triggered', icon: '→' },
  supplement: { color: '#818cf8', label: 'Supplement Effect', icon: '◈' },
};

export default function PatternInsights({ patterns, loading, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (loading) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Pattern Intelligence</div>
        <div style={{ fontSize: 14, color: 'rgba(0,210,165,.55)', fontStyle: 'italic' }}>Aellux is scanning your biological history for patterns…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Pattern Intelligence</div>
          <div style={{ fontSize: 13, color: 'rgba(0,210,165,.5)' }}>Seasonal shifts, correlated markers, supplement effects</div>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} style={{ fontSize: 12, color: 'rgba(0,210,165,.6)', background: 'none', border: '1px solid rgba(0,210,165,.2)', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Rescan
          </button>
        )}
      </div>

      {!patterns.length ? (
        <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8, fontSize: 14, color: 'rgba(0,210,165,.55)', lineHeight: 1.7 }}>
          Patterns emerge with more data. Upload labs from multiple dates and Aellux will detect seasonal shifts, correlations between markers, and supplement effects across your biological timeline.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patterns.map((p, i) => {
            const cfg = TYPE_CONFIG[p.type] || { color: '#34d399', label: p.type, icon: '◎' };
            const isOpen = expanded === i;
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? null : i)}
                style={{ padding: '16px 18px', background: 'rgba(0,8,18,.5)', border: `1px solid ${isOpen ? cfg.color + '44' : 'rgba(0,210,165,.14)'}`, borderRadius: 8, cursor: 'pointer', transition: 'border-color .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isOpen ? 12 : 0 }}>
                  <span style={{ fontSize: 16, color: cfg.color }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: 'rgba(220,255,235,.95)', fontWeight: 500 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                      {cfg.label} · {p.markers.join(' × ')}
                    </div>
                  </div>
                  <span style={{ fontSize: 16, color: 'rgba(0,210,165,.4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
                </div>
                {isOpen && (
                  <>
                    <p style={{ fontSize: 15, color: 'rgba(200,245,220,.9)', lineHeight: 1.75, margin: '0 0 12px', fontWeight: 300 }}>{p.finding}</p>
                    <div style={{ padding: '10px 14px', background: cfg.color + '0d', border: `1px solid ${cfg.color}33`, borderRadius: 6 }}>
                      <div style={{ fontSize: 11, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>What to do</div>
                      <p style={{ fontSize: 14, color: 'rgba(220,255,235,.9)', lineHeight: 1.65, margin: 0 }}>{p.action}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
