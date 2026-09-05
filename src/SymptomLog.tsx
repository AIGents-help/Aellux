// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Symptom {
  id?: string;
  symptom: string;
  frequency: string;
  notes?: string;
  started_date: string;
  ended_date?: string;
  review?: {
    urgency: 'routine' | 'soon' | 'urgent';
    headline: string;
    considerations?: Array<{ explanation: string; supporting_evidence: string; against_evidence?: string | null; fit: 'strong' | 'possible' | 'weak'; citation_pmid?: string | null }>;
    missing_info_question?: string | null;
    what_to_ask_your_doctor?: string;
  } | null;
  reviewed_at?: string | null;
}

interface Props {
  userId?: string;
  allMarkers?: any[];
  mealStyle?: string;
  cycleStartedAt?: string | null;
  additionalGoal?: string;
}

const URGENCY_STYLE = {
  urgent: { color: '#991b1b', bg: 'rgba(153,27,27,.07)', border: 'rgba(153,27,27,.3)', label: 'Urgent' },
  soon: { color: '#92400e', bg: 'rgba(146,64,14,.07)', border: 'rgba(146,64,14,.3)', label: 'See a doctor soon' },
  routine: { color: '#166534', bg: 'rgba(22,101,52,.07)', border: 'rgba(22,101,52,.3)', label: 'Routine' },
};

const FIT_LABEL = { strong: 'Strong fit', possible: 'Possible', weak: 'Weak fit' };

const FREQS = ['Constant', 'Daily', 'Several times a week', 'Occasional', 'Only under specific conditions'];

export default function SymptomLog({ userId, allMarkers, mealStyle, cycleStartedAt, additionalGoal }: Props) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Symptom>({ symptom: '', frequency: 'Daily', started_date: new Date().toISOString().slice(0, 10) });
  const [editForm, setEditForm] = useState<Symptom | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/symptom-log?userId=${userId}`)
      .then(r => r.json())
      .then(d => setSymptoms(d.symptoms || []))
      .catch(() => {});
  }, [userId]);

  const runReview = async (s: Symptom) => {
    if (!s.id) return;
    setReviewingId(s.id);
    setError(null);
    try {
      const res = await fetch('/api/symptom-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, symptomId: s.id,
          symptom: { symptom: s.symptom, frequency: s.frequency, notes: s.notes, started_date: s.started_date },
          allMarkers, mealStyle, cycleStartedAt, additionalGoal,
        }),
      });
      const data = await res.json();
      if (data.review) {
        setSymptoms(prev => prev.map(p => p.id === s.id ? { ...p, review: data.review, reviewed_at: new Date().toISOString() } : p));
      } else {
        setError(`Couldn't analyze "${s.symptom}": ${data.error || 'unknown error'}. Try again — if it keeps failing, something's broken server-side, not with what you entered.`);
      }
    } catch (e: any) {
      setError(`Couldn't reach the analysis service for "${s.symptom}": ${e?.message || 'network error'}.`);
    }
    setReviewingId(null);
  };

  const save = async () => {
    if (!form.symptom.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/symptom-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, symptom: form }),
      });
      const data = await res.json();
      if (data.symptom) {
        const saved = data.symptom;
        setSymptoms(prev => [saved, ...prev]);
        setForm({ symptom: '', frequency: 'Daily', started_date: new Date().toISOString().slice(0, 10) });
        setAdding(false);
        runReview(saved);
      } else {
        setError(`Couldn't save "${form.symptom}": ${data.error || 'unknown error'}.`);
      }
    } catch (e: any) {
      setError(`Couldn't save "${form.symptom}": ${e?.message || 'network error'}.`);
    }
  };

  const startEdit = (s: Symptom) => { setEditingId(s.id || null); setEditForm({ ...s }); setAdding(false); setError(null); };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async () => {
    if (!editForm || !editForm.symptom.trim() || !editForm.id) return;
    setError(null);
    try {
      const res = await fetch('/api/symptom-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id: editForm.id, symptom: editForm }),
      });
      const data = await res.json();
      if (data.symptom) {
        const updated = { ...data.symptom, review: null, reviewed_at: null };
        setSymptoms(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditingId(null); setEditForm(null);
        runReview(updated);
      } else {
        setError(`Couldn't save changes: ${data.error || 'unknown error'}.`);
      }
    } catch (e: any) {
      setError(`Couldn't save changes: ${e?.message || 'network error'}.`);
    }
  };

  const deleteSymptom = async (s: Symptom) => {
    if (!s.id) return;
    if (!window.confirm(`Remove "${s.symptom}" from your log?`)) return;
    setDeletingId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/symptom-log?userId=${userId}&id=${s.id}`, { method: 'DELETE' });
      if (res.ok) setSymptoms(prev => prev.filter(p => p.id !== s.id));
      else { const d = await res.json().catch(() => ({})); setError(`Couldn't remove "${s.symptom}": ${d.error || 'unknown error'}.`); }
    } catch (e: any) {
      setError(`Couldn't remove "${s.symptom}": ${e?.message || 'network error'}.`);
    }
    setDeletingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Symptom Journal</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Log what you're feeling — Aellux cross-references it against every marker's timeline, not just the obvious ones.</div>
        </div>
        <button onClick={() => setAdding(!adding)}
          style={{ fontSize: 13, padding: '7px 14px', background: 'var(--brand-ghost)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--brand)', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Log symptom
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(153,27,27,.07)', border: '1px solid rgba(153,27,27,.3)', borderRadius: 7, marginBottom: 14, fontSize: 13, color: '#991b1b' }}>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {adding && (
        <div style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
            <input value={form.symptom} onChange={e => setForm(f => ({ ...f, symptom: e.target.value }))} placeholder="What are you feeling? (e.g. shortness of breath, need for deep breaths)"
              style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Started (best guess is fine)</label>
              <input type="date" value={form.started_date} onChange={e => setForm(f => ({ ...f, started_date: e.target.value }))}
                style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Ended (optional)</label>
              <input type="date" value={form.ended_date || ''} onChange={e => setForm(f => ({ ...f, ended_date: e.target.value || undefined }))}
                style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            </div>
          </div>
          <input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything else worth noting (optional)"
            style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: 'var(--brand)', border: 'none', borderRadius: 5, padding: '9px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Save &amp; Analyze</button>
            <button onClick={() => setAdding(false)} style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {symptoms.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {symptoms.map((s, i) => {
            const us = s.review ? URGENCY_STYLE[s.review.urgency] : null;

            if (editingId === s.id && editForm) {
              return (
                <div key={s.id || i} style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--brand-dim)', borderRadius: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <input value={editForm.symptom} onChange={e => setEditForm(f => f && ({ ...f, symptom: e.target.value }))}
                      style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                    <select value={editForm.frequency} onChange={e => setEditForm(f => f && ({ ...f, frequency: e.target.value }))}
                      style={{ fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                      {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <input type="date" value={editForm.started_date} onChange={e => setEditForm(f => f && ({ ...f, started_date: e.target.value }))}
                      style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                    <input type="date" value={editForm.ended_date || ''} onChange={e => setEditForm(f => f && ({ ...f, ended_date: e.target.value || undefined }))}
                      style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                  </div>
                  <input value={editForm.notes || ''} onChange={e => setEditForm(f => f && ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: 'var(--brand)', border: 'none', borderRadius: 5, padding: '9px 20px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Save &amp; Re-analyze</button>
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
                    <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 400 }}>{s.symptom}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {s.frequency} · Started {s.started_date}{s.ended_date ? ` · Ended ${s.ended_date}` : ' · Ongoing'}
                    </div>
                  </div>
                  {us && (
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: us.color, background: us.bg, border: `1px solid ${us.border}`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
                      {us.label}
                    </span>
                  )}
                  <button onClick={() => runReview(s)} disabled={reviewingId === s.id}
                    style={{ fontSize: 12, padding: '6px 12px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {reviewingId === s.id ? 'Analyzing…' : s.review ? 'Re-analyze' : 'Analyze'}
                  </button>
                  <button onClick={() => startEdit(s)}
                    style={{ fontSize: 12, padding: '6px 12px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    Edit
                  </button>
                  <button onClick={() => deleteSymptom(s)} disabled={deletingId === s.id}
                    style={{ fontSize: 12, padding: '6px 10px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 5, color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {deletingId === s.id ? '…' : '✕'}
                  </button>
                </div>

                {s.review && (
                  <div style={{ padding: '16px 18px', background: us?.bg, borderTop: `1px solid ${us?.border}` }}>
                    <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 12px', lineHeight: 1.6 }}>{s.review.headline}</p>

                    {s.review.considerations && s.review.considerations.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Differential considerations</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {s.review.considerations.map((c, ci) => (
                            <div key={ci} style={{ padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {c.explanation}
                                  {c.citation_pmid && (
                                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${c.citation_pmid}/`} target="_blank" rel="noopener noreferrer"
                                      style={{ marginLeft: 6, color: 'var(--brand)', textDecoration: 'none', fontWeight: 600, fontSize: 12 }}>
                                      [PMID:{c.citation_pmid}]
                                    </a>
                                  )}
                                </span>
                                <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }}>{FIT_LABEL[c.fit] || c.fit}</span>
                              </div>
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.6 }}><strong>For:</strong> {c.supporting_evidence}</p>
                              {c.against_evidence && (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}><strong>Against:</strong> {c.against_evidence}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.review.missing_info_question && (
                      <div style={{ padding: '10px 14px', background: 'rgba(146,64,14,.08)', border: '1px solid rgba(146,64,14,.25)', borderRadius: 6, marginBottom: 12 }}>
                        <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}><strong>Aellux needs to know:</strong> {s.review.missing_info_question}</p>
                      </div>
                    )}

                    {s.review.what_to_ask_your_doctor && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}><strong>Bring to your doctor:</strong> {s.review.what_to_ask_your_doctor}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !adding && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--brand-ghost)', borderRadius: 7, fontSize: 14, color: 'var(--text-tertiary)' }}>
          No symptoms logged yet. Log what you're feeling — even things you've dismissed as unrelated — and Aellux will check it against every marker's timeline, not just the obvious ones.
        </div>
      )}
    </div>
  );
}
