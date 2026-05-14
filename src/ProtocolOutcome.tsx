// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Props {
  userId?: string;
  plan?: string;
  currentMarkers: any[];
  protocolId?: string;
  cycleStartDate?: string;
  protocolSummary?: string;
  profile?: any;
  previousSnapshot?: any[];
}

export default function ProtocolOutcome({ userId, plan, currentMarkers, protocolId, cycleStartDate, protocolSummary, profile, previousSnapshot }: Props) {
  const [assessment, setAssessment] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<any[]>([]);
  const [regressions, setRegressions] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const profileCtx = profile ? [
    profile.biological_sex && `sex: ${profile.biological_sex}`,
    profile.birth_year && `age: ${new Date().getFullYear() - profile.birth_year}`,
    profile.goal && `goal: ${profile.goal}`,
  ].filter(Boolean).join(', ') : '';

  const run = async () => {
    if (!currentMarkers?.length || !previousSnapshot?.length) return;
    setLoading(true);
    try {
      const res = await fetch('/api/protocol-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, plan, protocolId, cycleStartDate, protocolSummary, profileCtx,
          currentMarkers, previousMarkers: previousSnapshot,
        }),
      });
      const data = await res.json();
      if (data.assessment) {
        setAssessment(data.assessment);
        setImprovements(data.improvements || []);
        setRegressions(data.regressions || []);
        setChanges(data.changes || []);
      }
    } catch {}
    setLoading(false);
    setRan(true);
  };

  if (!previousSnapshot?.length || !currentMarkers?.length) return null;

  const sigChanges = changes.filter((c: any) => Math.abs(parseFloat(c.pct || '0')) > 10);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Protocol Outcome</div>

      {!ran && !loading && (
        <div style={{ padding: '18px 20px', background: 'rgba(0,8,18,.5)', border: '1px solid rgba(0,225,180,.25)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', marginBottom: 4 }}>New labs detected since your last protocol cycle.</div>
            <div style={{ fontSize: 13, color: 'rgba(0,210,165,.6)' }}>Aellux can audit what changed and whether the protocol worked.</div>
          </div>
          <button onClick={run} style={{ flexShrink: 0, fontSize: 14, color: 'rgba(0,20,14,1)', background: 'rgba(0,225,180,.9)', border: 'none', borderRadius: 5, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            Run Audit →
          </button>
        </div>
      )}

      {loading && (
        <div style={{ padding: '16px', fontSize: 14, color: 'rgba(0,210,165,.65)', fontStyle: 'italic' }}>
          Aellux is comparing your biology before and after this protocol cycle…
        </div>
      )}

      {ran && assessment && (
        <div>
          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120, padding: '12px 16px', background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 7, textAlign: 'center' }}>
              <div style={{ fontSize: 28, color: '#34d399', fontFamily: 'EB Garamond, Georgia, serif', fontWeight: 500 }}>{improvements.length}</div>
              <div style={{ fontSize: 11, color: 'rgba(52,211,153,.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Improved</div>
            </div>
            <div style={{ flex: 1, minWidth: 120, padding: '12px 16px', background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 7, textAlign: 'center' }}>
              <div style={{ fontSize: 28, color: '#f87171', fontFamily: 'EB Garamond, Georgia, serif', fontWeight: 500 }}>{regressions.length}</div>
              <div style={{ fontSize: 11, color: 'rgba(248,113,113,.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Regressed</div>
            </div>
            <div style={{ flex: 1, minWidth: 120, padding: '12px 16px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 7, textAlign: 'center' }}>
              <div style={{ fontSize: 28, color: 'rgba(0,210,165,.9)', fontFamily: 'EB Garamond, Georgia, serif', fontWeight: 500 }}>{sigChanges.length}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Significant shifts</div>
            </div>
          </div>

          {/* Aellux verdict */}
          <div style={{ padding: '18px 20px', background: 'rgba(0,8,18,.6)', border: '1px solid rgba(0,210,165,.2)', borderLeft: '3px solid rgba(0,225,180,.6)', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Aellux Protocol Audit</div>
            <p style={{ fontSize: 16, color: 'rgba(220,255,235,.95)', lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{assessment}</p>
          </div>

          {/* Change table */}
          {sigChanges.length > 0 && (
            <div style={{ background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(0,210,165,.55)', letterSpacing: '0.12em', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,210,165,.08)' }}>
                Significant changes (&gt;10%)
              </div>
              {sigChanges.map((c: any, i: number) => {
                const up = parseFloat(c.delta) > 0;
                const improved = improvements.find((m: any) => m.name === c.name);
                const color = improved ? '#34d399' : up ? '#f87171' : '#34d399';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: i < sigChanges.length - 1 ? '1px solid rgba(0,210,165,.06)' : 'none' }}>
                    <div style={{ flex: 1, fontSize: 14, color: 'rgba(220,255,235,.9)' }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: 'rgba(0,210,165,.5)', marginRight: 16 }}>{c.previous} → {c.current}{c.unit}</div>
                    <div style={{ fontSize: 14, color, fontWeight: 500, minWidth: 70, textAlign: 'right' }}>
                      {up ? '▲' : '▼'} {Math.abs(parseFloat(c.pct))}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
