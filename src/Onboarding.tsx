// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';

interface Props {
  onComplete: (profile: any) => void;
  onSkip: () => void;
}

const GOALS = [
  { id: 'longevity',     label: 'Longevity & healthspan',    icon: '◎' },
  { id: 'hormones',      label: 'Hormone optimization',      icon: '⬡' },
  { id: 'performance',   label: 'Athletic performance',      icon: '△' },
  { id: 'weight',        label: 'Body composition',          icon: '◈' },
  { id: 'energy',        label: 'Energy & mental clarity',   icon: '✦' },
  { id: 'prevention',    label: 'Disease prevention',        icon: '◐' },
];

const ACTIVITY = [
  { id: 'sedentary',   label: 'Mostly sedentary',         sub: 'Desk job, minimal exercise' },
  { id: 'light',       label: 'Lightly active',           sub: '1-3 workouts per week' },
  { id: 'moderate',    label: 'Moderately active',        sub: '3-5 workouts per week' },
  { id: 'very_active', label: 'Very active',              sub: '6+ workouts, physical job' },
];

const STEP_COUNT = 4;

function ProgressDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 20 : 6, height: 6, borderRadius: 3,
          background: i <= step ? 'rgba(0,225,180,.9)' : 'rgba(0,210,165,.15)',
          transition: 'all .3s ease',
        }} />
      ))}
    </div>
  );
}

export default function Onboarding({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    biological_sex: '',
    birth_year: '',
    weight_kg: '',
    height_cm: '',
    goal: '',
    activity_level: '',
  });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const set = (key: string, val: any) => setProfile(p => ({ ...p, [key]: val }));

  const canNext = () => {
    if (step === 0) return true; // welcome — always can proceed
    if (step === 1) return !!profile.biological_sex && !!profile.birth_year;
    if (step === 2) return !!profile.goal;
    if (step === 3) return !!profile.activity_level;
    return true;
  };

  const next = () => {
    if (step < STEP_COUNT - 1) setStep(s => s + 1);
    else finish();
  };

  const finish = async () => {
    setSaving(true);
    // Save profile via API
    if (user?.id) {
      const birthYear = parseInt(profile.birth_year);
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          biological_sex: profile.biological_sex || null,
          birth_year: !isNaN(birthYear) ? birthYear : null,
          weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
          height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
          goal: profile.goal || null,
          activity_level: profile.activity_level || null,
        }),
      }).catch(() => {});
    }
    localStorage.setItem('aellux_onboarded', '1');
    setSaving(false);
    onComplete(profile);
  };

  const S = {
    heading: { fontFamily: 'EB Garamond, Georgia, serif', fontSize: 28, color: 'rgba(220,255,235,1)', fontWeight: 500, lineHeight: 1.2, margin: '0 0 10px' } as any,
    sub: { fontSize: 15, color: 'rgba(0,210,165,.7)', lineHeight: 1.7, margin: '0 0 28px' } as any,
    label: { fontSize: 13, color: 'rgba(0,210,165,.6)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 10 },
    input: { width: '100%', fontSize: 16, padding: '12px 14px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 7, color: 'rgba(220,255,235,.95)', fontFamily: 'inherit', outline: 'none' } as any,
    btnPrimary: { width: '100%', fontSize: 16, color: 'rgba(0,20,14,1)', background: 'rgba(0,225,180,.92)', border: 'none', borderRadius: 8, padding: '14px 0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'opacity .2s' } as any,
    btnGhost: { width: '100%', fontSize: 14, color: 'rgba(0,210,165,.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0', marginTop: 4 } as any,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,14,.97)', backdropFilter: 'blur(16px)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Orb */}
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)', boxShadow: '0 0 40px rgba(0,210,165,.4)', margin: '0 auto 24px', animation: 'pulse 4s ease-in-out infinite' }} />

        <ProgressDots step={step} />

        {/* ── STEP 0 — Welcome ── */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ ...S.heading, fontSize: 34, marginBottom: 14 }}>
              Your biology has a protocol.<br />
              <em style={{ color: 'rgba(0,210,165,.9)', fontStyle: 'italic' }}>Aellux finds it.</em>
            </h1>
            <p style={{ ...S.sub, maxWidth: 380, margin: '0 auto 32px' }}>
              Upload your medical records and wearable data. Aellux reads everything — blood panels, genetics, physician notes — and builds a 7-day operating system calibrated to your exact biology.
            </p>

            {/* Value props */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32, textAlign: 'left' }}>
              {[
                { icon: '◎', text: 'Cross-references your markers — not as isolated numbers, but as a system in conversation' },
                { icon: '✦', text: 'Generates meals, supplements, and training specific to your biomarker pattern' },
                { icon: '◈', text: 'Tracks compliance, adapts recommendations, and shows you where you\'re heading' },
              ].map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.14)', borderRadius: 8 }}>
                  <span style={{ fontSize: 18, color: 'rgba(0,225,180,.7)', flexShrink: 0 }}>{v.icon}</span>
                  <span style={{ fontSize: 14, color: 'rgba(0,210,165,.8)', lineHeight: 1.6 }}>{v.text}</span>
                </div>
              ))}
            </div>

            <button onClick={next} style={S.btnPrimary}>Get started — takes 2 minutes →</button>
            <button onClick={onSkip} style={S.btnGhost}>Skip setup and explore</button>
          </div>
        )}

        {/* ── STEP 1 — Basic biology ── */}
        {step === 1 && (
          <div>
            <h2 style={S.heading}>Tell Aellux about your biology</h2>
            <p style={S.sub}>This makes every recommendation specific to you — not a generic template.</p>

            {/* Sex */}
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Biological sex</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['male', 'female'].map(s => (
                  <button key={s} onClick={() => set('biological_sex', s)}
                    style={{ padding: '12px 0', background: profile.biological_sex === s ? 'rgba(0,225,180,.12)' : 'rgba(0,8,18,.6)', border: `1px solid ${profile.biological_sex === s ? 'rgba(0,225,180,.6)' : 'rgba(0,210,165,.2)'}`, borderRadius: 7, color: profile.biological_sex === s ? 'rgba(0,240,190,1)' : 'rgba(0,210,165,.6)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all .15s' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Year of birth */}
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Year of birth</label>
              <input type="number" value={profile.birth_year} onChange={e => set('birth_year', e.target.value)}
                placeholder="e.g. 1974" min="1920" max="2005" style={S.input} />
            </div>

            {/* Height + Weight */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              <div>
                <label style={S.label}>Height (cm)</label>
                <input type="number" value={profile.height_cm} onChange={e => set('height_cm', e.target.value)}
                  placeholder="e.g. 180" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Weight (kg)</label>
                <input type="number" value={profile.weight_kg} onChange={e => set('weight_kg', e.target.value)}
                  placeholder="e.g. 82" style={S.input} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,210,165,.35)', marginBottom: 24 }}>Height and weight are optional — used for body composition calculations</div>

            <button onClick={next} disabled={!canNext()} style={{ ...S.btnPrimary, opacity: canNext() ? 1 : 0.4 }}>Continue →</button>
            <button onClick={() => setStep(s => s - 1)} style={S.btnGhost}>Back</button>
          </div>
        )}

        {/* ── STEP 2 — Primary goal ── */}
        {step === 2 && (
          <div>
            <h2 style={S.heading}>What is your primary goal?</h2>
            <p style={S.sub}>Aellux prioritizes recommendations around what matters most to you.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
              {GOALS.map(g => (
                <button key={g.id} onClick={() => set('goal', g.id)}
                  style={{ padding: '14px 12px', background: profile.goal === g.id ? 'rgba(0,225,180,.1)' : 'rgba(0,8,18,.5)', border: `1px solid ${profile.goal === g.id ? 'rgba(0,225,180,.55)' : 'rgba(0,210,165,.15)'}`, borderRadius: 8, color: profile.goal === g.id ? 'rgba(0,240,190,1)' : 'rgba(0,210,165,.6)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 18, opacity: 0.8 }}>{g.icon}</span>
                  <span style={{ lineHeight: 1.3 }}>{g.label}</span>
                </button>
              ))}
            </div>

            <button onClick={next} disabled={!profile.goal} style={{ ...S.btnPrimary, opacity: profile.goal ? 1 : 0.4 }}>Continue →</button>
            <button onClick={() => setStep(s => s - 1)} style={S.btnGhost}>Back</button>
          </div>
        )}

        {/* ── STEP 3 — Activity level ── */}
        {step === 3 && (
          <div>
            <h2 style={S.heading}>How active are you?</h2>
            <p style={S.sub}>Affects your protocol intensity, recovery recommendations, and caloric targets.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
              {ACTIVITY.map(a => (
                <button key={a.id} onClick={() => set('activity_level', a.id)}
                  style={{ padding: '14px 16px', background: profile.activity_level === a.id ? 'rgba(0,225,180,.08)' : 'rgba(0,8,18,.5)', border: `1px solid ${profile.activity_level === a.id ? 'rgba(0,225,180,.5)' : 'rgba(0,210,165,.15)'}`, borderRadius: 8, color: 'rgba(220,255,235,.9)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s' }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(0,210,165,.5)' }}>{a.sub}</div>
                </button>
              ))}
            </div>

            <button onClick={next} disabled={!profile.activity_level || saving}
              style={{ ...S.btnPrimary, opacity: profile.activity_level ? 1 : 0.4 }}>
              {saving ? 'Saving…' : 'Take me to my dashboard →'}
            </button>
            <button onClick={() => setStep(s => s - 1)} style={S.btnGhost}>Back</button>
          </div>
        )}

        <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 20px rgba(0,210,165,.4)} 50%{box-shadow:0 0 40px rgba(0,210,165,.65)} }`}</style>
      </div>
    </div>
  );
}
