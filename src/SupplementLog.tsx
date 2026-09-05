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
  plan?: string;
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

export default function SupplementLog({ userId, plan, allMarkers, mealStyle, cycleStartedAt, additionalGoal, protocolWatchFlags }: Props) {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Supplement>({ name: '', dose: '', frequency: 'Daily', started_date: new Date().toISOString().slice(0, 10) });
  const [editForm, setEditForm] = useState<Supplement | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stackReview, setStackReview] = useState<any>(null);
  const [stackReviewLoading, setStackReviewLoading] = useState(false);
  const [stackReviewError, setStackReviewError] = useState<string | null>(null);
  const [stackReviewSavedAt, setStackReviewSavedAt] = useState<string | null>(null);
  const [stackReviewChecked, setStackReviewChecked] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/supplement-log?userId=${userId}`)
      .then(r => r.json())
      .then(d => setSupplements(d.supplements || []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) { setStackReviewChecked(true); return; }
    fetch(`/api/stack-review?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d?.headline) { setStackReview(d); setStackReviewSavedAt(d.savedAt || null); }
        setStackReviewChecked(true);
      })
      .catch(() => setStackReviewChecked(true));
  }, [userId]);

  const runStackReview = async () => {
    setStackReviewLoading(true); setStackReviewError(null);
    try {
      const res = await fetch('/api/stack-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: plan || 'free', allMarkers }),
      });
      const data = await res.json();
      if (data.error) {
        setStackReviewError(data.error);
      } else {
        setStackReview(data);
        setStackReviewSavedAt(new Date().toISOString());
      }
    } catch (e: any) {
      setStackReviewError(e?.message || 'Could not reach the stack review service.');
    }
    setStackReviewLoading(false);
  };

  const runReview = async (s: Supplement) => {
    if (!s.id) return;
    setReviewingId(s.id);
    setError(null);
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
      } else {
        setError(`Couldn't review ${s.name}: ${data.error || 'unknown error'}. Try again — if it keeps failing, something's broken server-side, not with what you entered.`);
      }
    } catch (e: any) {
      setError(`Couldn't reach the review service for ${s.name}: ${e?.message || 'network error'}.`);
    }
    setReviewingId(null);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setError(null);
    try {
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
        runReview(saved);
      } else {
        setError(`Couldn't save ${form.name}: ${data.error || 'unknown error'}.`);
      }
    } catch (e: any) {
      setError(`Couldn't save ${form.name}: ${e?.message || 'network error'}.`);
    }
  };

  const startEdit = (s: Supplement) => {
    setEditingId(s.id || null);
    setEditForm({ ...s });
    setAdding(false);
    setError(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async () => {
    if (!editForm || !editForm.name.trim() || !editForm.id) return;
    setError(null);
    try {
      const res = await fetch('/api/supplement-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id: editForm.id, supplement: editForm }),
      });
      const data = await res.json();
      if (data.supplement) {
        const updated = { ...data.supplement, review: null, reviewed_at: null };
        setSupplements(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditingId(null); setEditForm(null);
        runReview(updated);
      } else {
        setError(`Couldn't save changes to ${editForm.name}: ${data.error || 'unknown error'}.`);
      }
    } catch (e: any) {
      setError(`Couldn't save changes to ${editForm.name}: ${e?.message || 'network error'}.`);
    }
  };

  const deleteSupplement = async (s: Supplement) => {
    if (!s.id) return;
    if (!window.confirm(`Remove ${s.name} from your log?`)) return;
    setDeletingId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/supplement-log?userId=${userId}&id=${s.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSupplements(prev => prev.filter(p => p.id !== s.id));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(`Couldn't remove ${s.name}: ${data.error || 'unknown error'}.`);
      }
    } catch (e: any) {
      setError(`Couldn't remove ${s.name}: ${e?.message || 'network error'}.`);
    }
    setDeletingId(null);
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

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(153,27,27,.07)', border: '1px solid rgba(153,27,27,.3)', borderRadius: 7, marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

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

            if (editingId === s.id && editForm) {
              return (
                <div key={s.id || i} style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--brand-dim)', borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <input value={editForm.name} onChange={e => setEditForm(f => f && ({ ...f, name: e.target.value }))} placeholder="Supplement or medication name"
                      style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                    <input value={editForm.dose} onChange={e => setEditForm(f => f && ({ ...f, dose: e.target.value }))} placeholder="Dose (e.g. 300mg)"
                      style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                    <select value={editForm.frequency} onChange={e => setEditForm(f => f && ({ ...f, frequency: e.target.value }))}
                      style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                      {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Started</label>
                      <input type="date" value={editForm.started_date} onChange={e => setEditForm(f => f && ({ ...f, started_date: e.target.value }))}
                        style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Ended (optional)</label>
                      <input type="date" value={editForm.ended_date || ''} onChange={e => setEditForm(f => f && ({ ...f, ended_date: e.target.value || undefined }))}
                        style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <input value={editForm.notes || ''} onChange={e => setEditForm(f => f && ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
                    style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: 'var(--brand)', border: 'none', borderRadius: 5, padding: '9px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Save &amp; Re-review</button>
                    <button onClick={cancelEdit} style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                </div>
              );
            }

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
                  <button onClick={() => startEdit(s)}
                    style={{ fontSize: 12, padding: '6px 12px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    Edit
                  </button>
                  <button onClick={() => deleteSupplement(s)} disabled={deletingId === s.id}
                    style={{ fontSize: 12, padding: '6px 10px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {deletingId === s.id ? '…' : '✕'}
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

      {/* ── FULL STACK REVIEW ── */}
      {supplements.length >= 2 && (
        <div style={{ marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>Full Stack Review</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 480, lineHeight: 1.6 }}>
                Redundancies, counterproductive combinations, whether anything here is actually moving your markers, lab-interference risks, and what could be masking a deficiency instead of fixing it.
              </div>
            </div>
            {stackReviewChecked && (
              <button onClick={runStackReview} disabled={stackReviewLoading}
                style={{ flexShrink: 0, fontSize: 13, padding: '8px 16px', background: 'var(--brand-ghost)', border: '1px solid var(--border-medium)', borderRadius: 6, color: 'var(--brand)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {stackReviewLoading ? 'Analyzing your whole stack…' : stackReview ? 'Re-review full stack' : 'Review full stack →'}
              </button>
            )}
          </div>

          {stackReviewSavedAt && stackReview && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Last analyzed {new Date(stackReviewSavedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — saved, no need to re-run unless your stack's changed.
            </div>
          )}

          {stackReviewError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(153,27,27,.07)', border: '1px solid rgba(153,27,27,.3)', borderRadius: 7, marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
              <span style={{ flex: 1, lineHeight: 1.5 }}>{stackReviewError}</span>
              <button onClick={() => setStackReviewError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          )}

          {stackReview && (
            <div>
              <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6, margin: '0 0 16px' }}>{stackReview.headline}</p>

              {stackReview.redundancies?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-watch)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Redundancies</div>
                  {stackReview.redundancies.map((r: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(146,64,14,.05)', border: '1px solid rgba(146,64,14,.2)', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{(r.supplements || []).join(' + ')}</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.6 }}>{r.issue}</p>
                      <p style={{ fontSize: 13, color: 'var(--accent-watch)', margin: 0, lineHeight: 1.6 }}><strong>Do:</strong> {r.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {stackReview.counterproductive_combinations?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#991b1b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Working against each other</div>
                  {stackReview.counterproductive_combinations.map((r: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(153,27,27,.05)', border: '1px solid rgba(153,27,27,.2)', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{(r.supplements || []).join(' + ')}</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.6 }}>{r.issue}</p>
                      <p style={{ fontSize: 13, color: '#991b1b', margin: 0, lineHeight: 1.6 }}><strong>Do:</strong> {r.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {stackReview.marker_correlations?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Marker correlations</div>
                  {stackReview.marker_correlations.map((r: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{r.supplement} → {r.marker}</span>
                        <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: r.supports_causation ? 'var(--accent-watch)' : 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }}>
                          {r.supports_causation ? `${r.confidence} link` : 'unlikely link'}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{r.observation}</p>
                    </div>
                  ))}
                </div>
              )}

              {stackReview.lab_interference_risks?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#991b1b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Lab interference risk</div>
                  {stackReview.lab_interference_risks.map((r: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(153,27,27,.05)', border: '1px solid rgba(153,27,27,.2)', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{r.supplement} → {r.affected_marker}</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.6 }}>{r.risk}</p>
                      <p style={{ fontSize: 13, color: '#991b1b', margin: 0, lineHeight: 1.6 }}><strong>Do:</strong> {r.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {stackReview.masking_risks?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#92400e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Could be masking, not fixing</div>
                  {stackReview.masking_risks.map((r: any, i: number) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(146,64,14,.05)', border: '1px solid rgba(146,64,14,.2)', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{r.supplement}</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.6 }}>{r.could_mask}</p>
                      <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}><strong>Instead, check:</strong> {r.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {stackReview.overall_recommendation && (
                <div style={{ padding: '14px 16px', background: 'var(--brand-ghost)', border: '1px solid var(--border-subtle)', borderRadius: 7 }}>
                  <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Bottom line</div>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.65 }}>{stackReview.overall_recommendation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
