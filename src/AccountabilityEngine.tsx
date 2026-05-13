// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import type { TrackerEntry } from './TrackerConnect';

// ─── PROTOCOL REQUIREMENTS MAP ────────────────────────────────────────────────
// What each protocol actually requires — the AI compares tracker data against this
const PROTOCOL_REQUIREMENTS: Record<string, {
  label: string;
  frequency: string;
  checks: Array<{
    metric: string;
    condition: string;
    threshold: number;
    unit: string;
    description: string;
    failMessage: string;
  }>;
}> = {
  'zone2': {
    label: 'Zone 2 Cardio',
    frequency: '3–4× per week, 45–60 min per session',
    checks: [
      { metric: 'heart_rate_avg', condition: 'between', threshold: 135, unit: 'bpm', description: 'Avg HR must stay 120–145 bpm (Zone 2)', failMessage: 'Your average HR is too high — you\'re training above Zone 2. This is cardio, not HIIT.' },
      { metric: 'workout_duration_min', condition: 'gte', threshold: 40, unit: 'min', description: 'Each session must be 40+ minutes', failMessage: 'Sessions under 40 min don\'t deliver the mitochondrial adaptation. You\'re cutting sessions short.' },
      { metric: 'workout_type', condition: 'includes', threshold: 0, unit: '', description: 'Must be aerobic (walking, cycling, running, rowing)', failMessage: 'Logged workouts aren\'t aerobic. Zone 2 requires sustained aerobic output.' },
    ],
  },
  'sleep-stack': {
    label: 'Sleep Architecture',
    frequency: 'Every night — consistency is the protocol',
    checks: [
      { metric: 'sleep_hours', condition: 'gte', threshold: 7, unit: 'hrs', description: 'Minimum 7.5 hours (ideally 9)', failMessage: 'You\'re averaging under 7.5 hrs. You cannot hack your way out of insufficient sleep duration.' },
      { metric: 'deep_sleep_hours', condition: 'gte', threshold: 1.0, unit: 'hrs', description: 'Deep sleep (N3) minimum 1 hour', failMessage: 'Deep sleep is insufficient. Check for alcohol, late meals, or blue light exposure before bed.' },
      { metric: 'hrv_ms', condition: 'trend', threshold: 0, unit: 'ms', description: 'HRV should trend up over 4+ weeks', failMessage: 'Your HRV is flat or declining. The protocol isn\'t producing the recovery adaptation it should.' },
    ],
  },
  'cold-exposure': {
    label: 'Cold Exposure',
    frequency: '3–4× per week minimum',
    checks: [
      { metric: 'workout_type', condition: 'includes_cold', threshold: 0, unit: '', description: 'Cold exposure must be logged', failMessage: 'No cold exposure sessions logged. Talking about cold plunges is not the same as doing them.' },
      { metric: 'workout_duration_min', condition: 'gte', threshold: 2, unit: 'min', description: 'Minimum 2 minutes per session', failMessage: 'Sessions are too short. Less than 90 seconds doesn\'t produce the full norepinephrine response.' },
    ],
  },
};

// ─── HONEST VERDICT ───────────────────────────────────────────────────────────
export type VerdictLevel = 'crushing_it' | 'partial' | 'half_assing' | 'not_doing_it';

interface Violation {
  metric: string;
  message: string;
  severity: 'high' | 'medium';
}

interface ComplianceReport {
  protocolId: string;
  protocolName: string;
  enrolledDays: number;
  activeDays: number;
  complianceRate: number;
  violations: Violation[];
  verdict: VerdictLevel;
  verdictLabel: string;
  verdictColor: string;
  aiCallout: string;
  trackerData: {
    sessionsLogged: number;
    avgDuration: number;
    avgHR: number;
    avgSleep: number;
    avgHRV: number;
  };
}

function assessCompliance(
  protocolId: string,
  enrolledDate: string,
  entries: TrackerEntry[]
): ComplianceReport | null {
  const req = PROTOCOL_REQUIREMENTS[protocolId];
  const protocolName = req?.label || protocolId;

  const start = new Date(enrolledDate);
  const now = new Date();
  const enrolledDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // Filter entries since enrollment
  const relevant = entries.filter(e => new Date(e.date) >= start);
  const activeDays = new Set(relevant.map(e => e.date)).size;

  // Compute averages
  const durations = relevant.map(e => e.metrics['workout_duration_min']).filter(v => typeof v === 'number') as number[];
  const hrs = relevant.map(e => e.metrics['heart_rate_avg']).filter(v => typeof v === 'number') as number[];
  const sleeps = relevant.map(e => e.metrics['sleep_hours']).filter(v => typeof v === 'number') as number[];
  const hrvs = relevant.map(e => e.metrics['hrv_ms']).filter(v => typeof v === 'number') as number[];

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const trackerData = {
    sessionsLogged: activeDays,
    avgDuration: avg(durations),
    avgHR: avg(hrs),
    avgSleep: avg(sleeps),
    avgHRV: avg(hrvs),
  };

  // Expected frequency check
  const expectedSessions = Math.floor(enrolledDays / 7) * 3.5; // ~3.5x/week
  const complianceRate = enrolledDays < 3 ? 1 : Math.min(1, activeDays / Math.max(1, expectedSessions));

  const violations: Violation[] = [];

  // Frequency violation
  if (enrolledDays >= 7 && complianceRate < 0.6) {
    violations.push({
      metric: 'frequency',
      message: `Protocol requires 3–4× per week. You've logged ${activeDays} sessions in ${enrolledDays} days. That's ${(activeDays / (enrolledDays / 7)).toFixed(1)}× per week.`,
      severity: 'high',
    });
  }

  // HR zone check for Zone 2
  if (protocolId === 'zone2' && trackerData.avgHR > 145 && hrs.length > 2) {
    violations.push({
      metric: 'heart_rate',
      message: `Average HR across sessions: ${trackerData.avgHR.toFixed(0)} bpm. Zone 2 requires 120–145 bpm. You're training too hard — this is cardio cosplay, not Zone 2.`,
      severity: 'high',
    });
  }

  // Duration check
  if (trackerData.avgDuration > 0 && trackerData.avgDuration < 35) {
    violations.push({
      metric: 'duration',
      message: `Average session: ${trackerData.avgDuration.toFixed(0)} min. Protocol requires 45–60 min minimum. Short sessions don't produce the mitochondrial adaptation.`,
      severity: 'medium',
    });
  }

  // Sleep check
  if (protocolId === 'sleep-stack' && trackerData.avgSleep > 0 && trackerData.avgSleep < 7) {
    violations.push({
      metric: 'sleep',
      message: `Averaging ${trackerData.avgSleep.toFixed(1)} hrs sleep. You need 7.5+ hrs for the GH pulse and memory consolidation this protocol targets.`,
      severity: 'high',
    });
  }

  // Determine verdict
  let verdict: VerdictLevel;
  let verdictLabel: string;
  let verdictColor: string;
  let aiCallout: string;

  if (enrolledDays < 3) {
    verdict = 'partial';
    verdictLabel = 'Too Early to Judge';
    verdictColor = '#64d2ff';
    aiCallout = 'Come back after 7 days of data. I need at least a week to call this honestly.';
  } else if (violations.length === 0 && complianceRate >= 0.8) {
    verdict = 'crushing_it';
    verdictLabel = 'Executing';
    verdictColor = '#00d2a5';
    aiCallout = 'The data matches the protocol. Keep stacking the days.';
  } else if (violations.length <= 1 && complianceRate >= 0.6) {
    verdict = 'partial';
    verdictLabel = 'Partial Compliance';
    verdictColor = '#ffa040';
    aiCallout = 'You\'re doing some of it. The issue is the specific gaps below are exactly where the adaptation happens.';
  } else if (complianceRate < 0.4 || violations.filter(v => v.severity === 'high').length >= 2) {
    verdict = 'not_doing_it';
    verdictLabel = 'Not Actually Doing It';
    verdictColor = '#ff6464';
    aiCallout = 'The tracker data doesn\'t support the claim that you\'re doing this protocol. The gap between intention and execution is where results go to die.';
  } else {
    verdict = 'half_assing';
    verdictLabel = 'Half-Assing It';
    verdictColor = '#ff9f43';
    aiCallout = 'You\'re showing up but not executing the protocol as designed. Half a protocol delivers a fraction of the results, not half the results.';
  }

  return {
    protocolId, protocolName, enrolledDays, activeDays,
    complianceRate, violations, verdict, verdictLabel, verdictColor,
    aiCallout, trackerData,
  };
}

// ─── ENROLLMENT ───────────────────────────────────────────────────────────────
export interface Enrollment {
  protocolId: string;
  protocolName: string;
  enrolledDate: string;
  targetDays: number;
  active: boolean;
}

// ─── AI DEEP CALLOUT ─────────────────────────────────────────────────────────
async function getAICallout(report: ComplianceReport, markers: any[]): Promise<string> {
  const markerContext = markers.length > 0
    ? `User's biomarkers: ${markers.slice(0, 20).map((m: any) => `${m.name}: ${m.value}${m.unit}`).join(', ')}.`
    : '';

  const prompt = `${markerContext}

The user claims to be doing the "${report.protocolName}" protocol. Here is what their tracker data actually shows:

- Days enrolled: ${report.enrolledDays}
- Sessions logged: ${report.activeDays}
- Compliance rate: ${(report.complianceRate * 100).toFixed(0)}%
- Average workout duration: ${report.trackerData.avgDuration.toFixed(0)} min
- Average heart rate: ${report.trackerData.avgHR.toFixed(0)} bpm
- Average sleep: ${report.trackerData.avgSleep.toFixed(1)} hrs
- Average HRV: ${report.trackerData.avgHRV.toFixed(0)} ms
- Violations found: ${report.violations.map(v => v.message).join(' | ')}
- Overall verdict: ${report.verdictLabel}

Write a brutally honest, specific 3-4 sentence assessment. Call out exactly what the data shows versus what the protocol requires. Be direct — not mean, but zero sugarcoating. No motivational fluff. Reference specific numbers. Use "REFUZE" when calling out a specific bad habit or excuse. End with the single most important thing they need to change starting today.`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: `You are Aellux's accountability AI. Your job is to tell people the truth about their protocol execution based on real tracker data. Be direct, specific, and honest. REFUZE to sugarcoat. Reference the actual numbers. Never be motivational-poster generic. 3-4 sentences max.`,
        userMessage: prompt,
        maxTokens: 300,
      }),
    });
    const data = await res.json();
    return data.text || '';
  } catch { return ''; }
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'rgba(0,175,142,.6)', fontFamily: 'EB Garamond,serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontFamily: 'EB Garamond,serif' }}>{value.toFixed(0)} / {max}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(0,40,30,.6)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

// ─── REPORT CARD ─────────────────────────────────────────────────────────────
function ReportCard({ report, markers }: { report: ComplianceReport; markers: any[] }) {
  const [aiText, setAiText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setLoadingAI(true);
    getAICallout(report, markers).then(t => { setAiText(t); setLoadingAI(false); });
  }, [report.protocolId]);

  const S: React.CSSProperties = { fontFamily: 'EB Garamond, Georgia, serif' };
  const vc = report.verdictColor;

  const VERDICT_ICONS: Record<VerdictLevel, string> = {
    crushing_it: '✓',
    partial: '◑',
    half_assing: '⚠',
    not_doing_it: '✕',
  };

  return (
    <div style={{ background: 'rgba(0,6,14,.82)', border: `1px solid rgba(0,165,132,.14)`, borderTop: `2px solid ${vc}`, borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${vc}18`, border: `1.5px solid ${vc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: vc, flexShrink: 0 }}>
          {VERDICT_ICONS[report.verdict]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...S, fontSize: 18, color: 'rgba(0,215,172,.94)', fontWeight: 500, marginBottom: 2 }}>{report.protocolName}</div>
          <div style={{ ...S, fontSize: 13, color: 'rgba(0,175,142,.55)' }}>Day {report.enrolledDays} · {report.activeDays} sessions logged</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...S, fontSize: 13, color: vc, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{report.verdictLabel}</div>
          <div style={{ ...S, fontSize: 22, color: vc, fontWeight: 500 }}>{(report.complianceRate * 100).toFixed(0)}%</div>
        </div>
        <div style={{ color: 'rgba(0,165,132,.4)', fontSize: 14, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(0,165,132,.1)' }}>

          {/* AI Callout */}
          <div style={{ background: report.verdict === 'crushing_it' ? 'rgba(0,210,165,.06)' : 'rgba(255,100,100,.06)', border: `1px solid ${report.verdict === 'crushing_it' ? 'rgba(0,210,165,.2)' : 'rgba(255,100,100,.2)'}`, borderRadius: 5, padding: '14px 16px', margin: '16px 0' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: report.verdict === 'crushing_it' ? '#00d2a5' : '#ff6464', marginBottom: 8, ...S }}>
              🔬 Aellux Accountability
            </div>
            {loadingAI ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64d2ff', ...S }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#64d2ff', animation: 'aellux-star-twinkle 1s infinite' }} />
                Analyzing your data…
              </div>
            ) : (
              <div style={{ fontSize: 14, color: report.verdict === 'crushing_it' ? 'rgba(0,215,172,.85)' : 'rgba(220,160,160,.9)', lineHeight: 1.7, ...S }}
                dangerouslySetInnerHTML={{ __html: (aiText || report.aiCallout).replace(/REFUZE/g, '<strong style="color:#ff6464">REFUZE</strong>') }} />
            )}
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Sessions', value: report.activeDays, suffix: `/ ${Math.ceil(report.enrolledDays / 7 * 3.5)} expected`, color: '#00d2a5' },
              { label: 'Avg Duration', value: report.trackerData.avgDuration > 0 ? `${report.trackerData.avgDuration.toFixed(0)}m` : '—', suffix: 'per session', color: '#64d2ff' },
              { label: 'Avg HR', value: report.trackerData.avgHR > 0 ? `${report.trackerData.avgHR.toFixed(0)}` : '—', suffix: 'bpm', color: '#a78bfa' },
              { label: 'Avg Sleep', value: report.trackerData.avgSleep > 0 ? `${report.trackerData.avgSleep.toFixed(1)}h` : '—', suffix: 'per night', color: '#64d2ff' },
              { label: 'Avg HRV', value: report.trackerData.avgHRV > 0 ? `${report.trackerData.avgHRV.toFixed(0)}` : '—', suffix: 'ms', color: '#00d2a5' },
              { label: 'Compliance', value: `${(report.complianceRate * 100).toFixed(0)}%`, suffix: 'overall', color: report.verdictColor },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(0,4,12,.7)', border: '1px solid rgba(0,165,132,.1)', borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'rgba(0,165,132,.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, ...S }}>{s.label}</div>
                <div style={{ fontSize: 22, color: s.color, fontWeight: 500, ...S, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(0,155,125,.4)', marginTop: 2, ...S }}>{s.suffix}</div>
              </div>
            ))}
          </div>

          {/* Violations */}
          {report.violations.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ff6464', marginBottom: 10, ...S }}>
                What the data says you're doing wrong
              </div>
              {report.violations.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(255,100,100,.05)', border: '1px solid rgba(255,100,100,.14)', borderRadius: 4, marginBottom: 8 }}>
                  <span style={{ color: '#ff6464', flexShrink: 0, fontSize: 16 }}>↳</span>
                  <div style={{ fontSize: 14, color: 'rgba(220,160,160,.85)', lineHeight: 1.6, ...S }}
                    dangerouslySetInnerHTML={{ __html: v.message.replace(/REFUZE/g, '<strong style="color:#ff6464">REFUZE</strong>') }} />
                </div>
              ))}
            </div>
          )}

          {report.verdict === 'crushing_it' && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 4 }}>
              <span style={{ fontSize: 16 }}>🎯</span>
              <div style={{ fontSize: 14, color: 'rgba(0,215,172,.8)', lineHeight: 1.6, ...S }}>
                Protocol execution is on point. The adaptation data (HRV, sleep quality, performance) will reflect this over the next 4–6 weeks if you hold the line.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ENROLL IN PROTOCOL MODAL ────────────────────────────────────────────────
function EnrollModal({ onClose, onEnroll, existingIds }: { onClose: () => void; onEnroll: (e: Enrollment) => void; existingIds: string[] }) {
  const ENROLLABLE = [
    { id: 'zone2', name: 'Zone 2 Cardio', icon: '🫀' },
    { id: 'sleep-stack', name: 'Sleep Architecture', icon: '😴' },
    { id: 'cold-exposure', name: 'Cold Exposure', icon: '🧊' },
  ];
  const [selected, setSelected] = useState('');
  const [days, setDays] = useState('90');

  const S: React.CSSProperties = { fontFamily: 'EB Garamond, Georgia, serif' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,16,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24 }}>
      <div style={{ background: 'rgba(0,10,22,.98)', border: '1px solid rgba(0,165,132,.2)', borderTop: '3px solid #00d2a5', borderRadius: 8, width: '100%', maxWidth: 480, padding: 28 }}>
        <div style={{ ...S, fontSize: 26, color: 'rgba(0,215,172,.96)', fontWeight: 500, marginBottom: 6 }}>Enroll in a Protocol</div>
        <div style={{ fontSize: 14, color: 'rgba(0,175,142,.55)', marginBottom: 22, ...S, lineHeight: 1.6 }}>
          Aellux will track your execution against what the protocol actually requires — and call you out if the data doesn't match.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {ENROLLABLE.filter(e => !existingIds.includes(e.id)).map(p => (
            <div key={p.id} onClick={() => setSelected(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: selected === p.id ? 'rgba(0,210,165,.08)' : 'rgba(0,6,14,.82)', border: `1px solid ${selected === p.id ? '#00d2a5' : 'rgba(0,165,132,.14)'}`, borderRadius: 4, cursor: 'pointer' }}>
              <span style={{ fontSize: 20 }}>{p.icon}</span>
              <span style={{ fontSize: 16, color: selected === p.id ? '#00d2a5' : 'rgba(0,215,172,.85)', ...S }}>{p.name}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'rgba(0,175,142,.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, ...S }}>Commitment Window</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['30', '60', '90'].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ flex: 1, background: days === d ? 'rgba(0,200,160,.88)' : 'rgba(0,6,14,.82)', color: days === d ? '#020810' : 'rgba(0,175,142,.6)', border: `1px solid ${days === d ? '#00d2a5' : 'rgba(0,165,132,.14)'}`, fontFamily: 'EB Garamond,serif', fontSize: 15, padding: '9px 0', borderRadius: 3, cursor: 'pointer' }}>
                {d} days
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            disabled={!selected}
            onClick={() => {
              const p = ENROLLABLE.find(e => e.id === selected);
              if (!p) return;
              onEnroll({ protocolId: p.id, protocolName: p.name, enrolledDate: new Date().toISOString().slice(0,10), targetDays: parseInt(days), active: true });
              onClose();
            }}
            style={{ flex: 1, background: selected ? 'rgba(0,200,160,.88)' : 'rgba(0,40,30,.4)', color: selected ? '#020810' : 'rgba(0,155,125,.3)', border: 'none', fontFamily: 'EB Garamond,serif', fontSize: 17, padding: 14, borderRadius: 3, cursor: selected ? 'pointer' : 'not-allowed', fontWeight: 500 }}>
            Commit to {days} Days →
          </button>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(0,165,132,.2)', color: 'rgba(0,155,125,.5)', fontFamily: 'EB Garamond,serif', fontSize: 13, padding: '14px 18px', borderRadius: 3, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ACCOUNTABILITY ENGINE ───────────────────────────────────────────────
interface Props {
  trackerEntries: TrackerEntry[];
  markers: any[];
}

export default function AccountabilityEngine({ trackerEntries, markers }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => {
    try { return JSON.parse(localStorage.getItem('aellux_enrollments') || '[]'); } catch { return []; }
  });
  const [showEnroll, setShowEnroll] = useState(false);

  // Persist enrollments
  useEffect(() => {
    localStorage.setItem('aellux_enrollments', JSON.stringify(enrollments));
  }, [enrollments]);

  function addEnrollment(e: Enrollment) {
    setEnrollments(prev => [...prev.filter(x => x.protocolId !== e.protocolId), e]);
  }

  function removeEnrollment(id: string) {
    setEnrollments(prev => prev.filter(e => e.protocolId !== id));
  }

  const reports = enrollments
    .filter(e => e.active)
    .map(e => assessCompliance(e.protocolId, e.enrolledDate, trackerEntries))
    .filter(Boolean) as ComplianceReport[];

  const S: React.CSSProperties = { fontFamily: 'EB Garamond, Georgia, serif' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,100,100,.7)', marginBottom: 4, ...S }}>Real Talk</div>
          <div style={{ fontSize: 22, color: 'rgba(0,215,172,.94)', fontWeight: 500, ...S, display: 'flex', alignItems: 'center', gap: 12 }}>
            Accountability
            <span style={{ fontSize: 11, padding: '3px 9px', background: 'rgba(255,100,100,.1)', border: '1px solid rgba(255,100,100,.25)', color: '#ff6464', borderRadius: 2, letterSpacing: '0.14em', textTransform: 'uppercase' }}>No BS Mode</span>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(0,175,142,.5)', marginTop: 4, ...S }}>
            Your tracker data vs. what the protocol actually requires
          </div>
        </div>
        <button onClick={() => setShowEnroll(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,200,160,.88)', color: '#020810', border: 'none', fontFamily: 'EB Garamond,serif', fontSize: 15, padding: '10px 20px', borderRadius: 3, cursor: 'pointer', fontWeight: 500 }}>
          + Enroll in Protocol
        </button>
      </div>

      {/* Empty state */}
      {enrollments.length === 0 && (
        <div style={{ background: 'rgba(0,6,14,.82)', border: '1px solid rgba(0,165,132,.14)', borderRadius: 6, padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 18, color: 'rgba(0,215,172,.88)', fontWeight: 500, marginBottom: 10, ...S }}>Enroll in a protocol to start tracking</div>
          <div style={{ fontSize: 15, color: 'rgba(0,175,142,.55)', lineHeight: 1.7, marginBottom: 22, maxWidth: 420, margin: '0 auto 22px', ...S }}>
            Once enrolled, Aellux cross-references your tracker data against what the protocol actually requires — and calls you out if the numbers don't match what you claim.
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Frequency violations', 'Intensity mismatches', 'Duration shortcuts', 'Sleep debt exposure'].map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, color: 'rgba(0,195,158,.65)', ...S }}>
                <span style={{ color: '#ff6464' }}>↳</span>{b}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active reports */}
      {reports.map(r => <ReportCard key={r.protocolId} report={r} markers={markers} />)}

      {/* Unenroll options */}
      {enrollments.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {enrollments.map(e => (
            <button key={e.protocolId} onClick={() => removeEnrollment(e.protocolId)}
              style={{ background: 'none', border: '1px solid rgba(0,165,132,.12)', color: 'rgba(0,155,125,.35)', fontFamily: 'EB Garamond,serif', fontSize: 12, padding: '4px 12px', borderRadius: 2, cursor: 'pointer', marginRight: 8, marginBottom: 6 }}>
              Unenroll: {e.protocolName}
            </button>
          ))}
        </div>
      )}

      {showEnroll && (
        <EnrollModal
          onClose={() => setShowEnroll(false)}
          onEnroll={addEnrollment}
          existingIds={enrollments.map(e => e.protocolId)}
        />
      )}
    </div>
  );
}
