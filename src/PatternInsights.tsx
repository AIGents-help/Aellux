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
  seasonal:   { color: 'var(--accent-watch)', label: 'Seasonal', icon: '◐' },
  correlated: { color: 'var(--accent-optimal)', label: 'Correlated', icon: '⟺' },
  triggered:  { color: 'var(--accent-elevated)', label: 'Triggered', icon: '→' },
  supplement: { color: '#818cf8', label: 'Supplement Effect', icon: '◈' },
};

export default function PatternInsights({ patterns, loading, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (loading) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Pattern Intelligence</div>
        <div style={{ fontSize: 14, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Aellux is scanning your biological history for patterns…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Pattern Intelligence</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Seasonal shifts, correlated markers, supplement effects</div>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Rescan
          </button>
        )}
      </div>

      {!patterns.length ? (
        <div style={{ padding: '16px 18px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
          Patterns emerge with more data. Upload labs from multiple dates and Aellux will detect seasonal shifts, correlations between markers, and supplement effects across your biological timeline.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patterns.map((p, i) => {
            const cfg = TYPE_CONFIG[p.type] || { color: 'var(--accent-optimal)', label: p.type, icon: '◎' };
            const isOpen = expanded === i;
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? null : i)}
                style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: `1px solid ${isOpen ? cfg.color + '44' : 'var(--border-subtle)'}`, borderRadius: 8, cursor: 'pointer', transition: 'border-color .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isOpen ? 12 : 0 }}>
                  <span style={{ fontSize: 16, color: cfg.color }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                      {cfg.label} · {p.markers.join(' × ')}
                    </div>
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
                </div>
                {isOpen && (
                  <>
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 12px', fontWeight: 300 }}>{p.finding}</p>
                    <div style={{ padding: '10px 14px', background: cfg.color + '0d', border: `1px solid ${cfg.color}33`, borderRadius: 6 }}>
                      <div style={{ fontSize: 11, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>What to do</div>
                      <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65, margin: 0 }}>{p.action}</p>
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
