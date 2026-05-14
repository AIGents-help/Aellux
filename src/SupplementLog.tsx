// @ts-nocheck
import React, { useState, useEffect } from 'react';

const SB_URL = (window as any).__SUPABASE_URL__ || '';

interface Supplement {
  id?: string;
  name: string;
  dose: string;
  frequency: string;
  started_date: string;
  ended_date?: string;
  notes?: string;
}

interface Props { userId?: string; allMarkers?: any[]; }

export default function SupplementLog({ userId, allMarkers }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Supplement>({ name: '', dose: '', frequency: 'Daily', started_date: new Date().toISOString().slice(0, 10) });
  const [correlation, setCorrelation] = useState<string | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/supplement-log?userId=${userId}`)
      .then(r => r.json())
      .then(d => setSupplements(d.supplements || []))
      .catch(() => {});
  }, [userId]);

  const save = async () => {
    if (!form.name.trim()) return;
    const res = await fetch('/api/supplement-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, supplement: form }),
    });
    const data = await res.json();
    if (data.supplement) {
      setSupplements(prev => [data.supplement, ...prev]);
      setForm({ name: '', dose: '', frequency: 'Daily', started_date: new Date().toISOString().slice(0, 10) });
      setAdding(false);
    }
  };

  const analyzeCorrelations = async () => {
    if (!supplements.length || !allMarkers?.length) return;
    setCorrLoading(true); setCorrelation(null);
    const suppStr = supplements.map(s => `${s.name} ${s.dose} started ${s.started_date}`).join(', ');
    const markerStr = allMarkers.filter(m => m.history?.length > 1).slice(0, 12).map(m => {
      const readings = [...(m.history || [])].sort((a, b) => a.date.localeCompare(b.date)).map(h => `${h.date.slice(0, 7)}:${h.value}`).join('→');
      return `${m.name}: ${readings}`;
    }).join('\n');
    const res = await fetch('/api/trend-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, markerName: 'supplement correlation',
        allReadings: markerStr,
        markerSnapshot: `Supplements taken: ${suppStr}`,
        pointDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        pointValue: 'current state',
        refRange: null,
        isSignificant: true,
      }),
    });
    const data = await res.json();
    setCorrelation(data.analysis || 'No correlation analysis returned.');
    setCorrLoading(false);
  };

  const FREQS = ['Daily', 'Twice daily', 'Weekly', 'As needed', 'With meals'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Supplement & Medication Log</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Track what you take — Aellux correlates it against your biomarker changes</div>
        </div>
        <button onClick={() => setAdding(!adding)}
          style={{ fontSize: 13, padding: '7px 14px', background: 'var(--brand-ghost)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--brand)', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplement or medication name"
              style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            <input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="Dose (e.g. 300mg)"
              style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Started</label>
              <input type="date" value={form.started_date} onChange={e => setForm(f => ({ ...f, started_date: e.target.value }))}
                style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Ended (optional)</label>
              <input type="date" value={form.ended_date || ''} onChange={e => setForm(f => ({ ...f, ended_date: e.target.value || undefined }))}
                style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            </div>
          </div>
          <input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
            style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: 'var(--brand)', border: 'none', borderRadius: 5, padding: '9px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Supplement list */}
      {supplements.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {supplements.map((s, i) => (
            <div key={s.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.ended_date ? 'var(--border-medium)' : 'var(--brand)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 400 }}>{s.name}{s.dose ? ` — ${s.dose}` : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {s.frequency} · Started {s.started_date}{s.ended_date ? ` · Ended ${s.ended_date}` : ' · Active'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !adding && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--brand-ghost)', borderRadius: 7, fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 16 }}>
          No supplements logged yet. Add what you're taking and Aellux will correlate it against your biomarker changes over time.
        </div>
      )}

      {/* Correlation analysis */}
      {supplements.length > 0 && allMarkers?.some(m => m.history?.length > 1) && (
        <div>
          <button onClick={analyzeCorrelations} disabled={corrLoading}
            style={{ fontSize: 13, padding: '8px 16px', background: 'var(--brand-ghost)', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--brand)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: corrLoading || correlation ? 12 : 0 }}>
            {corrLoading ? 'Analyzing…' : '✦ Correlate supplements with marker changes'}
          </button>
          {correlation && (
            <div style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid rgba(129,140,248,.25)', borderLeft: '3px solid rgba(129,140,248,.6)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'rgba(129,140,248,.8)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Supplement × Biomarker Correlation</div>
              <p style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{correlation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
