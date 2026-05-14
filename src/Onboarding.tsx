// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from './useAuth';

interface Props {
  onComplete: (profile: any) => void;
  onSkip: () => void;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const MOTIVATIONS = [
  { id: 'prevent',      label: 'I want to stay on top of my health and prevent problems before they start' },
  { id: 'understand',   label: "I want to understand what's causing health issues I'm already experiencing" },
  { id: 'optimize',     label: 'I want to optimize my performance and longevity beyond what feels normal' },
  { id: 'missed',       label: "I'm looking for reassurance that nothing serious is being missed" },
  { id: 'protocol',     label: 'I want a specific, personalized protocol — not generic advice' },
  { id: 'recommended',  label: 'Someone I trust told me to try this' },
];

const GOALS = [
  { id: 'longevity',    label: 'Longevity & healthspan' },
  { id: 'hormones',     label: 'Hormone optimization' },
  { id: 'performance',  label: 'Athletic performance' },
  { id: 'weight',       label: 'Body composition' },
  { id: 'energy',       label: 'Energy & mental clarity' },
  { id: 'prevention',   label: 'Disease prevention' },
];

const ACTIVITY = [
  { id: 'sedentary',    label: 'Mostly sedentary',    sub: 'Desk job, little exercise' },
  { id: 'light',        label: 'Lightly active',      sub: '1–3 workouts per week' },
  { id: 'moderate',     label: 'Moderately active',   sub: '3–5 workouts per week' },
  { id: 'very_active',  label: 'Very active',         sub: '6+ workouts or physical job' },
];

const WEARABLES = [
  { id: 'apple',      label: 'Apple Watch / iPhone',  icon: '' },
  { id: 'oura',       label: 'Oura Ring',             icon: '' },
  { id: 'garmin',     label: 'Garmin',                icon: '' },
  { id: 'whoop',      label: 'Whoop',                 icon: '' },
  { id: 'fitbit',     label: 'Fitbit',                icon: '' },
  { id: 'ultrahuman', label: 'Ultrahuman',            icon: '' },
  { id: 'withings',   label: 'Withings',              icon: '' },
  { id: 'none',       label: 'I don\'t use a wearable', icon: '' },
];

// Step names — each is one focused question
const STEPS = [
  'welcome',
  'motivation',
  'sex',
  'birthyear',
  'weight_height',
  'goal',
  'activity',
  'wearables',
  'done',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / (total - 1)) * 100);
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--border-subtle)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(0,225,180,.7)', transition: 'width .4s ease', borderRadius: '0 2px 2px 0' }} />
    </div>
  );
}

function Orb() {
  return (
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 30%, #064e23 0%, #052e16 50%, #0a1a0a 100%)', boxShadow: '0 0 30px var(--text-tertiary)', flexShrink: 0 }} />
  );
}

function NextBtn({ onClick, disabled, label = 'Continue →' }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: '100%', fontSize: 17, color: disabled ? 'rgba(0,50,40,.5)' : 'rgba(0,20,14,1)', background: disabled ? 'var(--brand-ghost)' : 'var(--brand)', border: 'none', borderRadius: 10, padding: '16px 0', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all .2s', marginTop: 8 }}>
      {label}
    </button>
  );
}

function SkipBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', fontSize: 14, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '12px 0', marginTop: 2 }}>
      Skip for now
    </button>
  );
}

function OptionList({ options, selected, onSelect, multi = false }: { options: any[]; selected: any; onSelect: (id: string) => void; multi?: boolean }) {
  const isSelected = (id: string) => multi ? (selected || []).includes(id) : selected === id;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map(opt => (
        <button key={opt.id} onClick={() => onSelect(opt.id)}
          style={{ padding: '16px 18px', background: isSelected(opt.id) ? 'var(--brand-ghost)' : 'var(--bg-sunken)', border: `1.5px solid ${isSelected(opt.id) ? 'var(--brand-border)' : 'var(--border-subtle)'}`, borderRadius: 10, color: isSelected(opt.id) ? 'var(--text-primary)' : 'rgba(220,255,235,.65)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .15s', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ lineHeight: 1.4 }}>{opt.label}</div>
            {opt.sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{opt.sub}</div>}
          </div>
          {isSelected(opt.id) && <span style={{ color: 'var(--brand)', fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete, onSkip }: Props) {
  const { user } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    motivation: '',
    biological_sex: '',
    birth_year: '',
    weight_kg: '',
    height_cm: '',
    goal: '',
    activity_level: '',
    wearables: [] as string[],
  });

  const step = STEPS[stepIdx];
  const totalSteps = STEPS.length;

  const set = (key: string, val: any) => setProfile(p => ({ ...p, [key]: val }));

  const toggleWearable = (id: string) => {
    setProfile(p => {
      const cur = p.wearables || [];
      if (id === 'none') return { ...p, wearables: ['none'] };
      const without_none = cur.filter(w => w !== 'none');
      return { ...p, wearables: cur.includes(id) ? without_none.filter(w => w !== id) : [...without_none, id] };
    });
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx(s => s + 1);
  };
  const back = () => { if (stepIdx > 0) setStepIdx(s => s - 1); };

  const finish = async () => {
    setSaving(true);
    if (user?.id) {
      const by = parseInt(profile.birth_year);
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          biological_sex: profile.biological_sex || null,
          birth_year: !isNaN(by) ? by : null,
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
    wrap: { position: 'fixed' as const, inset: 0, zIndex: 4000, background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    inner: { flex: 1, overflowY: 'auto' as const, padding: '52px 24px 24px', maxWidth: 480, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' as const },
    heading: { fontFamily: 'EB Garamond, Georgia, serif', fontSize: 30, color: 'var(--text-primary)', fontWeight: 400, lineHeight: 1.2, margin: '0 0 10px' } as any,
    sub: { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 28px' } as any,
    input: { width: '100%', fontSize: 17, padding: '14px 16px', background: 'var(--bg-surface)', border: '1.5px solid var(--border-medium)', borderRadius: 10, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', WebkitAppearance: 'none' as const } as any,
    label: { fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 8 },
  };

  return (
    <div style={S.wrap}>
      <ProgressBar step={stepIdx} total={totalSteps} />

      <div style={S.inner}>

        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
              <Orb />
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ancient Intelligence. Present Clarity.</div>
            </div>
            <h1 style={{ ...S.heading, fontSize: 36, marginBottom: 16 }}>
              Your biology has a protocol.
            </h1>
            <p style={{ ...S.sub, fontSize: 17 }}>
              Aellux reads your medical records, wearable data, and health history — and builds a 7-day operating system calibrated to your exact biology. Not a template. Yours.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
              {[
                'Reads blood panels, DEXA scans, genetic reports, and wearables',
                'Cross-references your markers as a biological system — not isolated numbers',
                'Generates meals, supplements, and training specific to your biomarker pattern',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--brand-dim)', flexShrink: 0, marginTop: 2 }}>◎</span>
                  <span style={{ fontSize: 15, color: 'var(--brand-dim)', lineHeight: 1.6 }}>{t}</span>
                </div>
              ))}
            </div>
            <NextBtn onClick={next} label="Let's get started →" />
            <SkipBtn onClick={onSkip} />
          </div>
        )}

        {/* ── MOTIVATION ── */}
        {step === 'motivation' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Getting to know you</p>
            <h2 style={S.heading}>What brought you to Aellux?</h2>
            <p style={S.sub}>This helps Aellux orient your first protocol around what matters most to you.</p>
            <OptionList options={MOTIVATIONS} selected={profile.motivation} onSelect={id => set('motivation', id)} />
            <div style={{ height: 20 }} />
            <NextBtn onClick={next} disabled={!profile.motivation} />
            <SkipBtn onClick={next} />
          </div>
        )}

        {/* ── BIOLOGICAL SEX ── */}
        {step === 'sex' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Your biology</p>
            <h2 style={S.heading}>What is your biological sex?</h2>
            <p style={S.sub}>Hormonal reference ranges, risk factors, and recommendations differ significantly between sexes. This is the most important input Aellux uses.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {['male', 'female'].map(s => (
                <button key={s} onClick={() => set('biological_sex', s)}
                  style={{ padding: '18px', background: profile.biological_sex === s ? 'var(--brand-ghost)' : 'var(--bg-sunken)', border: `1.5px solid ${profile.biological_sex === s ? 'var(--brand-border)' : 'var(--border-subtle)'}`, borderRadius: 10, color: profile.biological_sex === s ? 'var(--text-primary)' : 'rgba(220,255,235,.65)', fontSize: 17, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', textTransform: 'capitalize', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {s}
                  {profile.biological_sex === s && <span style={{ color: 'var(--brand)' }}>✓</span>}
                </button>
              ))}
            </div>
            <NextBtn onClick={next} disabled={!profile.biological_sex} />
            <SkipBtn onClick={next} />
          </div>
        )}

        {/* ── BIRTH YEAR ── */}
        {step === 'birthyear' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Your biology</p>
            <h2 style={S.heading}>What year were you born?</h2>
            <p style={S.sub}>Age affects what's optimal vs. what's merely normal. A testosterone level that's fine at 25 is a problem at 50.</p>
            <input
              type="number"
              value={profile.birth_year}
              onChange={e => set('birth_year', e.target.value)}
              placeholder="e.g. 1974"
              min="1920" max="2006"
              style={{ ...S.input, fontSize: 28, textAlign: 'center', letterSpacing: '0.08em', marginBottom: 8 }}
              autoFocus
            />
            {profile.birth_year && !isNaN(parseInt(profile.birth_year)) && parseInt(profile.birth_year) > 1920 && parseInt(profile.birth_year) < 2007 && (
              <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                Age: {new Date().getFullYear() - parseInt(profile.birth_year)}
              </div>
            )}
            <div style={{ height: 8 }} />
            <NextBtn onClick={next} disabled={!profile.birth_year || isNaN(parseInt(profile.birth_year))} />
            <SkipBtn onClick={next} />
          </div>
        )}

        {/* ── WEIGHT & HEIGHT ── */}
        {step === 'weight_height' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Your biology</p>
            <h2 style={S.heading}>Height and weight</h2>
            <p style={S.sub}>Used for body composition calculations and protocol caloric targets. Optional — you can add this later.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
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
            <NextBtn onClick={next} label="Continue →" />
            <SkipBtn onClick={next} />
          </div>
        )}

        {/* ── GOAL ── */}
        {step === 'goal' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Your focus</p>
            <h2 style={S.heading}>What is your primary goal?</h2>
            <p style={S.sub}>Aellux will prioritize its analysis and recommendations around this.</p>
            <OptionList options={GOALS} selected={profile.goal} onSelect={id => set('goal', id)} />
            <div style={{ height: 20 }} />
            <NextBtn onClick={next} disabled={!profile.goal} />
            <SkipBtn onClick={next} />
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {step === 'activity' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Your lifestyle</p>
            <h2 style={S.heading}>How active are you currently?</h2>
            <p style={S.sub}>This affects your protocol intensity, recovery recommendations, and caloric targets.</p>
            <OptionList options={ACTIVITY} selected={profile.activity_level} onSelect={id => set('activity_level', id)} />
            <div style={{ height: 20 }} />
            <NextBtn onClick={next} disabled={!profile.activity_level} />
            <SkipBtn onClick={next} />
          </div>
        )}

        {/* ── WEARABLES ── */}
        {step === 'wearables' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Your data sources</p>
            <h2 style={S.heading}>Do you use a wearable device?</h2>
            <p style={S.sub}>Wearable data overlaid on blood markers reveals patterns no single source can show alone. Select all that apply.</p>
            <OptionList options={WEARABLES} selected={profile.wearables} onSelect={toggleWearable} multi />
            <div style={{ height: 20 }} />
            <NextBtn onClick={next} disabled={profile.wearables.length === 0} />
            <SkipBtn onClick={next} />
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
              <Orb />
            </div>
            <h2 style={{ ...S.heading, fontSize: 34, marginBottom: 14 }}>
              Aellux is ready<br />
              <em style={{ fontStyle: 'italic', color: 'var(--brand-dim)' }}>for your biology.</em>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
              Upload your first health record — a blood panel, wearable export, or even a photo of your lab results. Aellux reads any format and extracts every biomarker automatically.
            </p>

            {/* Wearable export instructions if they selected one */}
            {profile.wearables.length > 0 && !profile.wearables.includes('none') && (
              <div style={{ marginBottom: 28, padding: '16px 18px', background: 'var(--brand-ghost)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>How to export from your wearable</div>
                {profile.wearables.includes('apple') && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
                    <strong style={{ color: 'rgba(220,255,235,.8)' }}>Apple Health:</strong> Health app → your profile icon → Export All Health Data → share the .zip file
                  </div>
                )}
                {profile.wearables.includes('oura') && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
                    <strong style={{ color: 'rgba(220,255,235,.8)' }}>Oura:</strong> Oura app → Profile → Download My Data → export CSV
                  </div>
                )}
                {profile.wearables.includes('garmin') && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
                    <strong style={{ color: 'rgba(220,255,235,.8)' }}>Garmin:</strong> connect.garmin.com → Account → Data Export
                  </div>
                )}
                {profile.wearables.includes('whoop') && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
                    <strong style={{ color: 'rgba(220,255,235,.8)' }}>Whoop:</strong> app.whoop.com → More → Profile → Export Data
                  </div>
                )}
                {profile.wearables.includes('fitbit') && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
                    <strong style={{ color: 'rgba(220,255,235,.8)' }}>Fitbit:</strong> Account → Data Export → Export Account Archive
                  </div>
                )}
                {profile.wearables.includes('ultrahuman') && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
                    <strong style={{ color: 'rgba(220,255,235,.8)' }}>Ultrahuman:</strong> app → Profile → Data Export
                  </div>
                )}
              </div>
            )}

            <NextBtn onClick={finish} disabled={saving} label={saving ? 'Setting up…' : 'Upload my first record →'} />
          </div>
        )}

        {/* Back button — not on welcome or done */}
        {stepIdx > 0 && step !== 'done' && (
          <button onClick={back}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0', marginTop: 4, textAlign: 'center' as const }}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
