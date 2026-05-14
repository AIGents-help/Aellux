// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Recommendation {
  id: string;
  recommendation: string;
  status: 'pending' | 'doing' | 'tried_not_working' | 'not_doing' | 'resolved';
  source: string;
  target_marker?: string;
  created_at: string;
  user_note?: string;
}

interface Checkin {
  week_start: string;
  protocol_followed: number;
  energy_level: number;
  sleep_quality: number;
  mood: number;
  blockers?: string;
}

interface Props {
  userId?: string;
  plan?: string;
}

const STATUS_CONFIG = {
  pending:            { label: 'Not started',       color: 'rgba(0,210,165,.55)',  bg: 'rgba(0,210,165,.06)',  border: 'rgba(0,210,165,.18)' },
  doing:              { label: 'Doing this',         color: 'rgba(52,211,153,.9)', bg: 'rgba(52,211,153,.06)', border: 'rgba(52,211,153,.25)' },
  tried_not_working:  { label: 'Tried — not working',color: 'rgba(251,146,60,.9)', bg: 'rgba(251,146,60,.06)', border: 'rgba(251,146,60,.25)' },
  not_doing:          { label: 'Not doing this',     color: 'rgba(248,113,113,.8)', bg: 'rgba(248,113,113,.05)',border: 'rgba(248,113,113,.22)' },
  resolved:           { label: 'Resolved ✓',         color: 'rgba(52,211,153,.5)', bg: 'rgba(0,8,18,.3)',      border: 'rgba(0,210,165,.1)' },
};

const STATUS_OPTIONS = [
  { value: 'doing',             label: "I'm doing this" },
  { value: 'pending',           label: 'Not started yet' },
  { value: 'tried_not_working', label: "Tried it — not working" },
  { value: 'not_doing',         label: "Not going to do this" },
  { value: 'resolved',          label: "This is resolved" },
];

function ScoreButton({ value, selected, onClick }: { value: number; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 36, borderRadius: '50%', border: `1px solid ${selected ? 'rgba(0,225,180,.7)' : 'rgba(0,210,165,.2)'}`,
      background: selected ? 'rgba(0,225,180,.15)' : 'rgba(0,8,18,.5)',
      color: selected ? 'rgba(0,240,190,1)' : 'rgba(0,210,165,.5)',
      fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: selected ? 600 : 400,
      transition: 'all .15s',
    }}>{value}</button>
  );
}

export default function Accountability({ userId, plan }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [currentWeek, setCurrentWeek] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinForm, setCheckinForm] = useState({ protocolFollowed: 0, energyLevel: 0, sleepQuality: 0, mood: 0, notableChanges: '', blockers: '' });
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [tab, setTab] = useState<'recommendations' | 'checkins'>('recommendations');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/recommendations?userId=${userId}`).then(r => r.json()),
      fetch(`/api/checkin?userId=${userId}`).then(r => r.json()),
    ]).then(([recData, checkinData]) => {
      setRecs(recData.recommendations || []);
      setCheckins(checkinData.checkins || []);
      setCurrentWeek(checkinData.currentWeek || '');
      // Show check-in if no check-in this week
      const thisWeekDone = (checkinData.checkins || []).some(c => c.week_start === checkinData.currentWeek);
      if (!thisWeekDone && (checkinData.checkins || []).length > 0) setShowCheckin(true);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  const updateStatus = async (rec: Recommendation, status: string, note?: string) => {
    const res = await fetch('/api/recommendations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rec.id, userId, status, userNote: note || undefined }),
    });
    if (res.ok) {
      setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, status: status as any, user_note: note || r.user_note } : r));
      setActiveNote(null); setNoteText('');
    }
  };

  const submitCheckin = async () => {
    if (!checkinForm.protocolFollowed) return;
    setSubmittingCheckin(true);
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        protocolFollowed: checkinForm.protocolFollowed,
        energyLevel: checkinForm.energyLevel || null,
        sleepQuality: checkinForm.sleepQuality || null,
        mood: checkinForm.mood || null,
        notableChanges: checkinForm.notableChanges || null,
        blockers: checkinForm.blockers || null,
      }),
    });
    const data = await res.json();
    if (data.checkin) {
      setCheckins(prev => [data.checkin, ...prev]);
      setShowCheckin(false);
      setCheckinForm({ protocolFollowed: 0, energyLevel: 0, sleepQuality: 0, mood: 0, notableChanges: '', blockers: '' });
    }
    setSubmittingCheckin(false);
  };

  const activeRecs = recs.filter(r => r.status !== 'resolved');
  const hasCheckinThisWeek = checkins.some(c => c.week_start === currentWeek);

  if (loading) return null;

  return (
    <div>
      {/* Weekly check-in prompt */}
      {!hasCheckinThisWeek && recs.length > 0 && (
        <div style={{ marginBottom: 20, padding: '16px 20px', background: 'rgba(0,225,180,.06)', border: '1px solid rgba(0,225,180,.25)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', fontWeight: 500, marginBottom: 3 }}>Weekly check-in</div>
            <div style={{ fontSize: 13, color: 'rgba(0,210,165,.6)' }}>How did this week go? Aellux adapts your protocol based on your compliance.</div>
          </div>
          <button onClick={() => setShowCheckin(!showCheckin)}
            style={{ flexShrink: 0, fontSize: 14, color: 'rgba(0,20,14,1)', background: 'rgba(0,225,180,.9)', border: 'none', borderRadius: 5, padding: '9px 18px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            Check in →
          </button>
        </div>
      )}

      {/* Check-in form */}
      {showCheckin && (
        <div style={{ marginBottom: 20, padding: '20px 22px', background: 'rgba(0,8,18,.6)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 10 }}>
          <div style={{ fontSize: 15, color: 'rgba(220,255,235,.95)', fontWeight: 500, marginBottom: 18 }}>Week of {currentWeek}</div>

          {[
            { label: 'How closely did you follow your protocol?', key: 'protocolFollowed', sublabel: '1 = not at all · 5 = fully' },
            { label: 'Energy level this week', key: 'energyLevel', sublabel: '1 = exhausted · 5 = excellent' },
            { label: 'Sleep quality', key: 'sleepQuality', sublabel: '1 = terrible · 5 = excellent' },
            { label: 'Mood & mental clarity', key: 'mood', sublabel: '1 = poor · 5 = excellent' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: 'rgba(220,255,235,.85)', marginBottom: 4 }}>{field.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,210,165,.5)', marginBottom: 8 }}>{field.sublabel}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(v => (
                  <ScoreButton key={v} value={v} selected={checkinForm[field.key] === v} onClick={() => setCheckinForm(f => ({ ...f, [field.key]: v }))} />
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: 'rgba(220,255,235,.85)', marginBottom: 6 }}>What changed or felt different this week? (optional)</div>
            <textarea value={checkinForm.notableChanges} onChange={e => setCheckinForm(f => ({ ...f, notableChanges: e.target.value }))}
              placeholder="Energy improved, sleep worse, cravings down..."
              rows={2} style={{ width: '100%', fontSize: 14, padding: '10px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 6, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: 'rgba(220,255,235,.85)', marginBottom: 6 }}>What prevented full compliance? (optional)</div>
            <textarea value={checkinForm.blockers} onChange={e => setCheckinForm(f => ({ ...f, blockers: e.target.value }))}
              placeholder="Travel, stress, forgot supplements, couldn't find ingredients..."
              rows={2} style={{ width: '100%', fontSize: 14, padding: '10px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 6, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={submitCheckin} disabled={!checkinForm.protocolFollowed || submittingCheckin}
              style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: checkinForm.protocolFollowed ? 'rgba(0,225,180,.9)' : 'rgba(0,225,180,.4)', border: 'none', borderRadius: 5, padding: '10px 22px', cursor: checkinForm.protocolFollowed ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600 }}>
              {submittingCheckin ? 'Saving…' : 'Submit check-in'}
            </button>
            <button onClick={() => setShowCheckin(false)} style={{ fontSize: 14, color: 'rgba(0,210,165,.6)', background: 'none', border: '1px solid rgba(0,210,165,.2)', borderRadius: 5, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Later
            </button>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid rgba(0,210,165,.12)' }}>
        {[{ id: 'recommendations', label: `Recommendations (${activeRecs.length})` }, { id: 'checkins', label: 'Check-in History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            flex: 1, padding: '11px 0', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? 'rgba(0,225,180,.8)' : 'transparent'}`,
            color: tab === t.id ? 'rgba(0,240,190,1)' : 'rgba(0,210,165,.45)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', transition: 'all .2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Recommendations tab */}
      {tab === 'recommendations' && (
        <div>
          {activeRecs.length === 0 ? (
            <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8, fontSize: 14, color: 'rgba(0,210,165,.55)', lineHeight: 1.7 }}>
              No active recommendations yet. Generate your synthesis or protocol — Aellux will track specific recommendations here so you can log your compliance.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeRecs.map(rec => {
                const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.pending;
                const isNoteOpen = activeNote === rec.id;
                return (
                  <div key={rec.id} style={{ padding: '14px 16px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: 'rgba(220,255,235,.92)', lineHeight: 1.6, fontWeight: 300 }}>{rec.recommendation}</div>
                        <div style={{ fontSize: 11, color: 'rgba(0,210,165,.4)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>{rec.source}</span>
                          {rec.target_marker && <span>→ {rec.target_marker}</span>}
                          <span>{new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        {rec.user_note && (
                          <div style={{ marginTop: 6, fontSize: 13, color: cfg.color, fontStyle: 'italic' }}>"{rec.user_note}"</div>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: cfg.color, letterSpacing: '0.06em', flexShrink: 0, whiteSpace: 'nowrap', marginTop: 2 }}>{cfg.label}</span>
                    </div>

                    {/* Status buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {STATUS_OPTIONS.map(opt => (
                        <button key={opt.value}
                          onClick={() => {
                            if (opt.value === 'tried_not_working' || opt.value === 'not_doing') {
                              setActiveNote(rec.id); setNoteText('');
                            } else {
                              updateStatus(rec, opt.value);
                            }
                          }}
                          style={{
                            fontSize: 12, padding: '5px 11px',
                            background: rec.status === opt.value ? cfg.bg : 'rgba(0,8,18,.5)',
                            border: `1px solid ${rec.status === opt.value ? cfg.color : 'rgba(0,210,165,.15)'}`,
                            borderRadius: 4, color: rec.status === opt.value ? cfg.color : 'rgba(0,210,165,.5)',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Note input for declined/tried */}
                    {isNoteOpen && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <input value={noteText} onChange={e => setNoteText(e.target.value)}
                          placeholder="Tell Aellux why (helps it adapt recommendations)..."
                          style={{ flex: 1, fontSize: 13, padding: '8px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 5, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit' }} />
                        <button onClick={() => updateStatus(rec, STATUS_OPTIONS.find(o => activeNote === rec.id)?.value || rec.status, noteText)}
                          style={{ fontSize: 13, padding: '8px 14px', background: 'rgba(0,225,180,.12)', border: '1px solid rgba(0,225,180,.4)', borderRadius: 5, color: 'rgba(0,240,190,1)', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                        <button onClick={() => setActiveNote(null)} style={{ fontSize: 13, padding: '8px 10px', background: 'none', border: '1px solid rgba(0,210,165,.15)', borderRadius: 5, color: 'rgba(0,210,165,.5)', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Check-in history tab */}
      {tab === 'checkins' && (
        <div>
          {checkins.length === 0 ? (
            <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8, fontSize: 14, color: 'rgba(0,210,165,.55)', lineHeight: 1.7 }}>
              No check-ins yet. Complete your first weekly check-in above — Aellux uses this to adapt your protocol and understand what's actually working.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {checkins.map((c, i) => {
                const compliance = c.protocol_followed >= 4 ? '#34d399' : c.protocol_followed >= 2 ? '#f59e0b' : '#f87171';
                return (
                  <div key={i} style={{ padding: '14px 16px', background: 'rgba(0,8,18,.45)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 14, color: 'rgba(220,255,235,.85)' }}>Week of {c.week_start}</div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
                        <span style={{ color: compliance }}>Protocol {c.protocol_followed}/5</span>
                        {c.energy_level && <span style={{ color: 'rgba(0,210,165,.65)' }}>Energy {c.energy_level}/5</span>}
                        {c.sleep_quality && <span style={{ color: 'rgba(0,210,165,.65)' }}>Sleep {c.sleep_quality}/5</span>}
                        {c.mood && <span style={{ color: 'rgba(0,210,165,.65)' }}>Mood {c.mood}/5</span>}
                      </div>
                    </div>
                    {c.blockers && <div style={{ fontSize: 13, color: 'rgba(251,146,60,.75)', fontStyle: 'italic' }}>Blockers: "{c.blockers}"</div>}
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
