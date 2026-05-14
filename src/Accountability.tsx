// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';

interface Recommendation {
  id: string;
  recommendation: string;
  status: 'pending' | 'doing' | 'snoozed' | 'tried_not_working' | 'not_doing' | 'resolved';
  source: string;
  target_marker?: string;
  created_at: string;
  updated_at: string;
  user_note?: string;
  snooze_until?: string;
  declined_reason?: string;
  declined_reason_code?: string;
  acceptance_date?: string;
  approach_variant?: number;
}

interface Checkin {
  week_start: string;
  protocol_followed: number;
  energy_level: number;
  sleep_quality: number;
  mood: number;
  blockers?: string;
  notable_changes?: string;
}

interface Props { userId?: string; plan?: string; }

// ── Decline reasons ──────────────────────────────────────────────────────────
const DECLINE_REASONS = [
  { code: 'too_expensive',   label: 'Too expensive' },
  { code: 'cant_find',       label: "Can't find / source it" },
  { code: 'side_effects',    label: 'Concerned about side effects' },
  { code: 'already_tried',   label: 'Already tried — no effect' },
  { code: 'not_ready',       label: "Not ready yet" },
  { code: 'lifestyle',       label: "Doesn't fit my lifestyle" },
  { code: 'other',           label: 'Other reason' },
];

// ── Snooze options ───────────────────────────────────────────────────────────
const SNOOZE_OPTIONS = [
  { weeks: 1,  label: '1 week' },
  { weeks: 2,  label: '2 weeks' },
  { weeks: 4,  label: '1 month' },
  { weeks: 8,  label: '2 months' },
  { weeks: 12, label: '3 months' },
  { weeks: 0,  label: 'When my labs update' },
];

// ── Status display config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:           { label: 'New',             color: 'rgba(0,210,165,.7)',   bg: 'rgba(0,210,165,.05)',   border: 'rgba(0,210,165,.18)', icon: '○' },
  doing:             { label: 'Doing this',       color: 'rgba(52,211,153,.9)', bg: 'rgba(52,211,153,.06)',  border: 'rgba(52,211,153,.25)', icon: '✓' },
  snoozed:           { label: 'Snoozed',          color: 'rgba(129,140,248,.8)',bg: 'rgba(129,140,248,.05)', border: 'rgba(129,140,248,.22)', icon: '◷' },
  tried_not_working: { label: 'Tried — no effect',color: 'rgba(251,146,60,.9)', bg: 'rgba(251,146,60,.05)',  border: 'rgba(251,146,60,.25)', icon: '△' },
  not_doing:         { label: 'Declined',          color: 'rgba(248,113,113,.8)',bg: 'rgba(248,113,113,.04)', border: 'rgba(248,113,113,.2)',  icon: '✕' },
  resolved:          { label: 'Resolved',          color: 'rgba(52,211,153,.5)', bg: 'rgba(0,8,18,.3)',       border: 'rgba(0,210,165,.1)',   icon: '●' },
};

// ── Modal ────────────────────────────────────────────────────────────────────
function ActionModal({ rec, onClose, onUpdate }: { rec: Recommendation; onClose: () => void; onUpdate: (id: string, patch: any) => void }) {
  const [step, setStep] = useState<'main' | 'snooze' | 'decline' | 'tried'>('main');
  const [snoozeWeeks, setSnoozeWeeks] = useState<number | null>(null);
  const [declineCode, setDeclineCode] = useState('');
  const [declineNote, setDeclineNote] = useState('');
  const [triedNote, setTriedNote] = useState('');

  const patch = async (data: any) => { await onUpdate(rec.id, data); onClose(); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,8,18,.92)', backdropFilter: 'blur(8px)', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'rgba(2,12,22,.99)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 12, padding: '24px 28px', maxWidth: 480, width: '100%' }}
        onClick={e => e.stopPropagation()}>

        {/* Rec text */}
        <div style={{ fontSize: 15, color: 'rgba(220,255,235,.92)', lineHeight: 1.65, marginBottom: 20, fontWeight: 300 }}>{rec.recommendation}</div>

        {/* ── MAIN step ── */}
        {step === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Would you like to try this?</div>

            <button onClick={() => patch({ status: 'doing' })}
              style={{ padding: '13px 16px', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.4)', borderRadius: 7, color: 'rgba(52,211,153,1)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', fontWeight: 500 }}>
              ✓ Yes — I'll do this
              <div style={{ fontSize: 12, color: 'rgba(52,211,153,.6)', marginTop: 3, fontWeight: 300 }}>Aellux will track this and watch for your marker to respond</div>
            </button>

            <button onClick={() => setStep('snooze')}
              style={{ padding: '13px 16px', background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.3)', borderRadius: 7, color: 'rgba(167,139,250,.9)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              ◷ Remind me later
              <div style={{ fontSize: 12, color: 'rgba(129,140,248,.55)', marginTop: 3, fontWeight: 300 }}>Snooze this — Aellux will resurface it on your schedule</div>
            </button>

            <button onClick={() => setStep('tried')}
              style={{ padding: '13px 16px', background: 'rgba(251,146,60,.07)', border: '1px solid rgba(251,146,60,.28)', borderRadius: 7, color: 'rgba(251,146,60,.9)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              △ I tried this — it didn't work
              <div style={{ fontSize: 12, color: 'rgba(251,146,60,.55)', marginTop: 3, fontWeight: 300 }}>Aellux will find a different approach, not re-suggest the same thing</div>
            </button>

            <button onClick={() => setStep('decline')}
              style={{ padding: '13px 16px', background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.22)', borderRadius: 7, color: 'rgba(248,113,113,.85)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              ✕ No — this isn't for me
              <div style={{ fontSize: 12, color: 'rgba(248,113,113,.5)', marginTop: 3, fontWeight: 300 }}>Tell Aellux why — it will find a different path to the same goal</div>
            </button>

            <button onClick={onClose} style={{ marginTop: 4, fontSize: 13, color: 'rgba(0,210,165,.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Dismiss for now
            </button>
          </div>
        )}

        {/* ── SNOOZE step ── */}
        {step === 'snooze' && (
          <div>
            <div style={{ fontSize: 11, color: 'rgba(129,140,248,.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Remind me in…</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {SNOOZE_OPTIONS.map(opt => (
                <button key={opt.weeks} onClick={() => setSnoozeWeeks(opt.weeks)}
                  style={{ padding: '11px 16px', background: snoozeWeeks === opt.weeks ? 'rgba(129,140,248,.15)' : 'rgba(0,8,18,.5)', border: `1px solid ${snoozeWeeks === opt.weeks ? 'rgba(129,140,248,.55)' : 'rgba(0,210,165,.15)'}`, borderRadius: 7, color: snoozeWeeks === opt.weeks ? 'rgba(167,139,250,1)' : 'rgba(0,210,165,.6)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => snoozeWeeks !== null && patch({ status: 'snoozed', snoozeWeeks: snoozeWeeks || 99 })}
                disabled={snoozeWeeks === null}
                style={{ flex: 1, padding: '11px 0', background: snoozeWeeks !== null ? 'rgba(129,140,248,.2)' : 'rgba(0,8,18,.4)', border: '1px solid rgba(129,140,248,.4)', borderRadius: 6, color: 'rgba(167,139,250,1)', fontSize: 14, cursor: snoozeWeeks !== null ? 'pointer' : 'default', fontFamily: 'inherit', opacity: snoozeWeeks === null ? 0.5 : 1 }}>
                Snooze →
              </button>
              <button onClick={() => setStep('main')} style={{ padding: '11px 16px', background: 'none', border: '1px solid rgba(0,210,165,.15)', borderRadius: 6, color: 'rgba(0,210,165,.5)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
            </div>
          </div>
        )}

        {/* ── TRIED step ── */}
        {step === 'tried' && (
          <div>
            <div style={{ fontSize: 11, color: 'rgba(251,146,60,.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>What happened when you tried it?</div>
            <textarea value={triedNote} onChange={e => setTriedNote(e.target.value)}
              placeholder="Gave me GI issues, didn't notice any change, tried for 3 weeks with no effect..."
              rows={3} style={{ width: '100%', fontSize: 14, padding: '10px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(251,146,60,.3)', borderRadius: 6, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit', resize: 'vertical', marginBottom: 14 }} />
            <div style={{ fontSize: 12, color: 'rgba(251,146,60,.6)', marginBottom: 16, lineHeight: 1.6 }}>
              Aellux will never re-suggest this exact approach. It will find a different mechanism targeting the same outcome.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => patch({ status: 'tried_not_working', userNote: triedNote })}
                style={{ flex: 1, padding: '11px 0', background: 'rgba(251,146,60,.12)', border: '1px solid rgba(251,146,60,.4)', borderRadius: 6, color: 'rgba(251,146,60,1)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Save feedback →
              </button>
              <button onClick={() => setStep('main')} style={{ padding: '11px 16px', background: 'none', border: '1px solid rgba(0,210,165,.15)', borderRadius: 6, color: 'rgba(0,210,165,.5)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
            </div>
          </div>
        )}

        {/* ── DECLINE step ── */}
        {step === 'decline' && (
          <div>
            <div style={{ fontSize: 11, color: 'rgba(248,113,113,.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>What's the reason?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {DECLINE_REASONS.map(r => (
                <button key={r.code} onClick={() => setDeclineCode(r.code)}
                  style={{ padding: '10px 14px', background: declineCode === r.code ? 'rgba(248,113,113,.12)' : 'rgba(0,8,18,.5)', border: `1px solid ${declineCode === r.code ? 'rgba(248,113,113,.45)' : 'rgba(0,210,165,.12)'}`, borderRadius: 6, color: declineCode === r.code ? 'rgba(248,113,113,1)' : 'rgba(0,210,165,.6)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s' }}>
                  {r.label}
                </button>
              ))}
            </div>
            <textarea value={declineNote} onChange={e => setDeclineNote(e.target.value)}
              placeholder="Additional context (optional)..."
              rows={2} style={{ width: '100%', fontSize: 13, padding: '9px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 6, color: 'rgba(220,255,235,.85)', fontFamily: 'inherit', resize: 'vertical', marginBottom: 14 }} />
            <div style={{ fontSize: 12, color: 'rgba(248,113,113,.55)', marginBottom: 14, lineHeight: 1.6 }}>
              {declineCode === 'too_expensive' && "Aellux will find a free or lower-cost alternative targeting the same marker."}
              {declineCode === 'cant_find' && "Aellux will suggest options available in standard grocery stores or pharmacies."}
              {declineCode === 'side_effects' && "Aellux will find a gentler approach with a different mechanism."}
              {declineCode === 'already_tried' && "Aellux will acknowledge this and escalate to a more targeted intervention."}
              {declineCode === 'lifestyle' && "Aellux will find something that fits how you actually live, not how you should live."}
              {(!declineCode || declineCode === 'not_ready' || declineCode === 'other') && "Aellux will respect this — and if the marker still requires attention, it will approach from a different angle."}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => declineCode && patch({ status: 'not_doing', declinedReasonCode: declineCode, declinedReason: declineNote || undefined })}
                disabled={!declineCode}
                style={{ flex: 1, padding: '11px 0', background: declineCode ? 'rgba(248,113,113,.1)' : 'rgba(0,8,18,.4)', border: `1px solid ${declineCode ? 'rgba(248,113,113,.4)' : 'rgba(0,210,165,.1)'}`, borderRadius: 6, color: declineCode ? 'rgba(248,113,113,1)' : 'rgba(0,210,165,.3)', fontSize: 14, cursor: declineCode ? 'pointer' : 'default', fontFamily: 'inherit', opacity: declineCode ? 1 : 0.5 }}>
                Decline →
              </button>
              <button onClick={() => setStep('main')} style={{ padding: '11px 16px', background: 'none', border: '1px solid rgba(0,210,165,.15)', borderRadius: 6, color: 'rgba(0,210,165,.5)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Score button for check-in ─────────────────────────────────────────────────
function ScoreBtn({ value, selected, onClick }: { value: number; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 38, height: 38, borderRadius: '50%',
      border: `1px solid ${selected ? 'rgba(0,225,180,.7)' : 'rgba(0,210,165,.2)'}`,
      background: selected ? 'rgba(0,225,180,.15)' : 'rgba(0,8,18,.5)',
      color: selected ? 'rgba(0,240,190,1)' : 'rgba(0,210,165,.5)',
      fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: selected ? 600 : 400, transition: 'all .15s',
    }}>{value}</button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Accountability({ userId, plan }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [currentWeek, setCurrentWeek] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<Recommendation | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinForm, setCheckinForm] = useState({ protocolFollowed: 0, energyLevel: 0, sleepQuality: 0, mood: 0, notableChanges: '', blockers: '' });
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'recs' | 'checkins'>('recs');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/recommendations?userId=${userId}`).then(r => r.json()),
      fetch(`/api/checkin?userId=${userId}`).then(r => r.json()),
    ]).then(([rd, cd]) => {
      setRecs(rd.recommendations || []);
      setCheckins(cd.checkins || []);
      setCurrentWeek(cd.currentWeek || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  const updateRec = useCallback(async (id: string, patch: any) => {
    await fetch('/api/recommendations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, userId, ...patch }),
    });
    setRecs(prev => prev.map(r => r.id === id ? { ...r, ...patch, status: patch.status || r.status } : r));
  }, [userId]);

  const submitCheckin = async () => {
    if (!checkinForm.protocolFollowed) return;
    setSubmitting(true);
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, protocolFollowed: checkinForm.protocolFollowed, energyLevel: checkinForm.energyLevel || null, sleepQuality: checkinForm.sleepQuality || null, mood: checkinForm.mood || null, notableChanges: checkinForm.notableChanges || null, blockers: checkinForm.blockers || null }),
    });
    const data = await res.json();
    if (data.checkin) { setCheckins(p => [data.checkin, ...p]); setShowCheckin(false); }
    setSubmitting(false);
  };

  const activeRecs = recs.filter(r => r.status !== 'resolved');
  const hasCheckinThisWeek = checkins.some(c => c.week_start === currentWeek);
  const byStatus = {
    new: activeRecs.filter(r => r.status === 'pending'),
    doing: activeRecs.filter(r => r.status === 'doing'),
    snoozed: activeRecs.filter(r => r.status === 'snoozed'),
    tried: activeRecs.filter(r => r.status === 'tried_not_working'),
    declined: activeRecs.filter(r => r.status === 'not_doing'),
  };

  if (loading) return null;

  return (
    <div>
      {activeModal && (
        <ActionModal rec={activeModal} onClose={() => setActiveModal(null)} onUpdate={updateRec} />
      )}

      {/* Weekly check-in nudge */}
      {!hasCheckinThisWeek && recs.length > 0 && !showCheckin && (
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(0,225,180,.05)', border: '1px solid rgba(0,225,180,.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, color: 'rgba(220,255,235,.9)', fontWeight: 500 }}>Weekly check-in due</div>
            <div style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', marginTop: 2 }}>How did this week go? Aellux adapts when it knows your compliance.</div>
          </div>
          <button onClick={() => setShowCheckin(true)}
            style={{ flexShrink: 0, fontSize: 13, color: 'rgba(0,20,14,1)', background: 'rgba(0,225,180,.85)', border: 'none', borderRadius: 5, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            Check in →
          </button>
        </div>
      )}

      {/* Check-in form */}
      {showCheckin && (
        <div style={{ marginBottom: 20, padding: '20px 22px', background: 'rgba(0,8,18,.6)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 10 }}>
          <div style={{ fontSize: 15, color: 'rgba(220,255,235,.95)', fontWeight: 500, marginBottom: 18 }}>Week of {currentWeek}</div>
          {[
            { label: 'Protocol adherence', key: 'protocolFollowed', sub: '1 = skipped · 5 = followed fully' },
            { label: 'Energy level', key: 'energyLevel', sub: '1 = exhausted · 5 = excellent' },
            { label: 'Sleep quality', key: 'sleepQuality', sub: '1 = terrible · 5 = excellent' },
            { label: 'Mood & clarity', key: 'mood', sub: '1 = poor · 5 = sharp' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: 'rgba(220,255,235,.85)', marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,210,165,.45)', marginBottom: 8 }}>{f.sub}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(v => <ScoreBtn key={v} value={v} selected={checkinForm[f.key] === v} onClick={() => setCheckinForm(p => ({ ...p, [f.key]: v }))} />)}
              </div>
            </div>
          ))}
          <textarea value={checkinForm.blockers} onChange={e => setCheckinForm(p => ({ ...p, blockers: e.target.value }))}
            placeholder="What prevented full compliance? (helps Aellux adapt)" rows={2}
            style={{ width: '100%', fontSize: 13, padding: '9px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 6, color: 'rgba(220,255,235,.85)', fontFamily: 'inherit', resize: 'vertical', marginBottom: 12 }} />
          <textarea value={checkinForm.notableChanges} onChange={e => setCheckinForm(p => ({ ...p, notableChanges: e.target.value }))}
            placeholder="What changed or felt different this week?" rows={2}
            style={{ width: '100%', fontSize: 13, padding: '9px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 6, color: 'rgba(220,255,235,.85)', fontFamily: 'inherit', resize: 'vertical', marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={submitCheckin} disabled={!checkinForm.protocolFollowed || submitting}
              style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: checkinForm.protocolFollowed ? 'rgba(0,225,180,.9)' : 'rgba(0,225,180,.4)', border: 'none', borderRadius: 5, padding: '10px 22px', cursor: checkinForm.protocolFollowed ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600 }}>
              {submitting ? 'Saving…' : 'Submit →'}
            </button>
            <button onClick={() => setShowCheckin(false)} style={{ fontSize: 14, color: 'rgba(0,210,165,.55)', background: 'none', border: '1px solid rgba(0,210,165,.18)', borderRadius: 5, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>Later</button>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,210,165,.12)', marginBottom: 18 }}>
        {[{ id: 'recs', label: `Recommendations (${activeRecs.length})` }, { id: 'checkins', label: 'Check-in History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, padding: '11px 0', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'rgba(0,225,180,.8)' : 'transparent'}`, color: tab === t.id ? 'rgba(0,240,190,1)' : 'rgba(0,210,165,.4)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>{t.label}</button>
        ))}
      </div>

      {/* ── RECOMMENDATIONS TAB ── */}
      {tab === 'recs' && (
        <div>
          {activeRecs.length === 0 ? (
            <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.1)', borderRadius: 8, fontSize: 14, color: 'rgba(0,210,165,.5)', lineHeight: 1.7 }}>
              No active recommendations yet. Generate your synthesis or protocol — Aellux will track specific recommendations here for you to act on.
            </div>
          ) : (
            <>
              {/* Status buckets */}
              {[
                { recs: byStatus.new, label: 'New recommendations', color: 'rgba(0,210,165,.7)' },
                { recs: byStatus.doing, label: 'In progress', color: 'rgba(52,211,153,.9)' },
                { recs: byStatus.tried, label: 'Tried — not working', color: 'rgba(251,146,60,.85)' },
                { recs: byStatus.declined, label: 'Declined', color: 'rgba(248,113,113,.8)' },
                { recs: byStatus.snoozed, label: 'Snoozed', color: 'rgba(129,140,248,.75)' },
              ].filter(b => b.recs.length > 0).map(bucket => (
                <div key={bucket.label} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: bucket.color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {bucket.label} ({bucket.recs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bucket.recs.map(rec => {
                      const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.pending;
                      return (
                        <div key={rec.id} onClick={() => setActiveModal(rec)}
                          style={{ padding: '13px 16px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = cfg.color + '66'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = cfg.border}>
                          <span style={{ fontSize: 16, color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, color: 'rgba(220,255,235,.9)', lineHeight: 1.6, fontWeight: 300 }}>{rec.recommendation}</div>
                            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.35)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <span>{rec.source}</span>
                              {rec.target_marker && <span>→ {rec.target_marker}</span>}
                              {rec.snooze_until && <span>Until {rec.snooze_until}</span>}
                              {rec.declined_reason && <span>Reason: {rec.declined_reason}</span>}
                              {rec.approach_variant && rec.approach_variant > 1 && <span>Approach #{rec.approach_variant}</span>}
                            </div>
                            {rec.user_note && <div style={{ fontSize: 12, color: cfg.color, fontStyle: 'italic', marginTop: 4 }}>"{rec.user_note}"</div>}
                          </div>
                          <span style={{ fontSize: 11, color: 'rgba(0,210,165,.3)', flexShrink: 0 }}>Tap →</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── CHECK-IN HISTORY TAB ── */}
      {tab === 'checkins' && (
        <div>
          {checkins.length === 0 ? (
            <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.1)', borderRadius: 8, fontSize: 14, color: 'rgba(0,210,165,.5)', lineHeight: 1.7 }}>
              No check-ins yet. Submit your first check-in — Aellux uses this to understand what's actually working and what's getting in the way.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {checkins.map((c, i) => {
                const score = c.protocol_followed;
                const col = score >= 4 ? '#34d399' : score >= 2 ? '#f59e0b' : '#f87171';
                return (
                  <div key={i} style={{ padding: '14px 16px', background: 'rgba(0,8,18,.45)', border: '1px solid rgba(0,210,165,.1)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 14, color: 'rgba(220,255,235,.85)' }}>Week of {c.week_start}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 13, flexWrap: 'wrap' }}>
                        <span style={{ color: col }}>Protocol {score}/5</span>
                        {c.energy_level && <span style={{ color: 'rgba(0,210,165,.6)' }}>Energy {c.energy_level}/5</span>}
                        {c.sleep_quality && <span style={{ color: 'rgba(0,210,165,.6)' }}>Sleep {c.sleep_quality}/5</span>}
                        {c.mood && <span style={{ color: 'rgba(0,210,165,.6)' }}>Mood {c.mood}/5</span>}
                      </div>
                    </div>
                    {c.blockers && <div style={{ fontSize: 12, color: 'rgba(251,146,60,.7)', fontStyle: 'italic' }}>Blockers: "{c.blockers}"</div>}
                    {c.notable_changes && <div style={{ fontSize: 12, color: 'rgba(52,211,153,.7)', fontStyle: 'italic', marginTop: 3 }}>Changed: "{c.notable_changes}"</div>}
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
