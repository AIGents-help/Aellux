// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Supplement {
  id?: string;
  name: string;
  dose: string;
  frequency: string;
  started_date: string;
  ended_date?: string;
  notes?: string;
  review?: {
    verdict: 'agree' | 'caution' | 'disagree';
    headline: string;
    dosage_assessment: string;
    timing?: string | null;
    interactions_or_redundancies?: string[];
    connects_to_current_flags?: string | null;
    overlooked_nuance?: string;
  } | null;
  reviewed_at?: string | null;
}

interface Props {
  userId?: string;
  allMarkers?: any[];
  mealStyle?: string;
  cycleStartedAt?: string | null;
  additionalGoal?: string;
  protocolWatchFlags?: any[];
}

const VERDICT_STYLE = {
  agree: { color: '#166534', bg: 'rgba(22,101,52,.07)', border: 'rgba(22,101,52,.3)', label: 'Agree' },
  caution: { color: '#92400e', bg: 'rgba(146,64,14,.07)', border: 'rgba(146,64,14,.3)', label: 'Caution' },
  disagree: { color: '#991b1b', bg: 'rgba(153,27,27,.07)', border: 'rgba(153,27,27,.3)', label: 'Disagree' },
};

export default function SupplementLog({ userId, allMarkers, mealStyle, cycleStartedAt, additionalGoal, protocolWatchFlags }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Supplement>({ name: '', dose: '', frequency: 'Daily', started_date: new Date().toISOString().slice(0, 10) });
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/supplement-log?userId=${userId}`)
      .then(r => r.json())
      .then(d => setSupplements(d.supplements || []))
      .catch(() => {});
  }, [userId]);

  const runReview = async (s: Supplement) => {
    if (!s.id) return;
    setReviewingId(s.id);
    try {
      const res = await fetch('/api/supplement-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, supplementId: s.id,
          supplement: { name: s.name, dose: s.dose, frequency: s.frequency, notes: s.notes },
          allMarkers, mealStyle, cycleStartedAt, additionalGoal, protocolWatchFlags,
        }),
      });
      const data = await res.json();
      if (data.review) {
        setSupplements(prev => prev.map(p => p.id === s.id ? { ...p, review: data.review, reviewed_at: new Date().toISOString() } : p));
      }
    } catch {}
    setReviewingId(null);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const res = await fetch('/api/supplement-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, supplement: form }),
    });
    const data = await res.json();
    if (data.supplement) {
      const saved = data.supplement;
      setSupplements(prev => [saved, ...prev]);
      setForm({ name: '', dose: '', frequency: 'Daily', started_date: new Date().toISOString().slice(0, 10) });
      setAdding(false);
      // Review immediately — this is the whole point: don't just log it, evaluate it.
      runReview(saved);
    }
  };

  const FREQS = ['Daily', 'Twice daily', 'Weekly', 'As needed', 'With meals'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Supplement & Medication Log</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Aellux reviews each one against your full stack, flagged markers, and active protocol — not just logging it</div>
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
            <button onClick={save} style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: 'var(--brand)', border: 'none', borderRadius: 5, padding: '9px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Save &amp; Review</button>
            <button onClick={() => setAdding(false)} style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Supplement list */}
      {supplements.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {supplements.map((s, i) => {
            const vs = s.review ? VERDICT_STYLE[s.review.verdict] : null;
            return (
              <div key={s.id || i} style={{ borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-sunken)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.ended_date ? 'var(--border-medium)' : 'var(--brand)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 400 }}>{s.name}{s.dose ? ` — ${s.dose}` : ''}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {s.frequency} · Started {s.started_date}{s.ended_date ? ` · Ended ${s.ended_date}` : ' · Active'}
                    </div>
                  </div>
                  {vs && (
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: vs.color, background: vs.bg, border: `1px solid ${vs.border}`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
                      {vs.label}
                    </span>
                  )}
                  <button onClick={() => runReview(s)} disabled={reviewingId === s.id}
                    style={{ fontSize: 12, padding: '6px 12px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {reviewingId === s.id ? 'Reviewing…' : s.review ? 'Re-review' : 'Review'}
                  </button>
                </div>

                {s.review && (
                  <div style={{ padding: '14px 16px', background: vs?.bg, borderTop: `1px solid ${vs?.border}` }}>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 8px', lineHeight: 1.5 }}>{s.review.headline}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.6 }}><strong>Dose:</strong> {s.review.dosage_assessment}</p>
                    {s.review.timing && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.6 }}><strong>Timing:</strong> {s.review.timing}</p>
                    )}
                    {Array.isArray(s.review.interactions_or_redundancies) && s.review.interactions_or_redundancies.length > 0 && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.6 }}><strong>Stack check:</strong> {s.review.interactions_or_redundancies.join(' · ')}</p>
                    )}
                    {s.review.connects_to_current_flags && (
                      <p style={{ fontSize: 13, color: vs?.color, margin: '0 0 6px', lineHeight: 1.6, fontWeight: 500 }}>{s.review.connects_to_current_flags}</p>
                    )}
                    {s.review.overlooked_nuance && (
                      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>💡 {s.review.overlooked_nuance}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !adding && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--brand-ghost)', borderRadius: 7, fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 16 }}>
          No supplements logged yet. Add what you're taking and Aellux will review the dose, check it against everything else you take, and flag anything relevant to your current biomarkers.
        </div>
      )}
    </div>
  );
}
