// @ts-nocheck
import React, { useState } from 'react';

interface Props {
  userName?: string;
  goal?: string;
  onUpload: () => void;
  onGuide: () => void;
  onGetTested?: () => void;
}

const GOAL_LABELS: Record<string, string> = {
  longevity: 'longevity & healthspan',
  hormones: 'hormone optimization',
  performance: 'athletic performance',
  weight: 'body composition',
  energy: 'energy & mental clarity',
  prevention: 'disease prevention',
};

const STEPS = [
  {
    n: '1',
    title: 'Upload your first health record',
    desc: 'Blood panel, wearable export, DEXA scan, physician note — any format. Aellux extracts every biomarker automatically.',
    action: 'Upload now →',
    primary: true,
    time: '2 min',
  },
  {
    n: '2',
    title: 'Receive your Biologic Synthesis',
    desc: 'Aellux cross-references your markers as a system and identifies the cascades — what one marker is doing to another.',
    action: null,
    time: 'Instant',
  },
  {
    n: '3',
    title: 'Run your 7-day protocol',
    desc: 'Meals, supplements, training, and recovery — calibrated to your exact biomarker pattern. Not a template. Yours.',
    action: null,
    time: 'Ongoing',
  },
];

const QUICK_SOURCES = [
  { icon: '🩸', label: 'Blood panel from doctor', desc: 'Upload a PDF or photo of recent labs' },
  { icon: '⌚', label: 'Apple Health / Garmin / Oura', desc: 'Export your wearable data' },
  { icon: '📄', label: 'Physician notes', desc: 'Any document with health data' },
  { icon: '🧬', label: 'Genetic report', desc: '23andMe, AncestryDNA, Nebula' },
];

export default function EmptyDashboard({ userName, goal, onUpload, onGuide, onGetTested }: Props) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const goalLabel = goal ? GOAL_LABELS[goal] : null;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 0' }}>

      {/* Personal greeting */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)', boxShadow: '0 0 40px var(--text-tertiary)', margin: '0 auto 20px', animation: 'pulse 4s ease-in-out infinite' }} />
        <h1 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 30, color: 'var(--text-primary)', fontWeight: 400, margin: '0 0 10px', lineHeight: 1.2 }}>
          {userName ? `Welcome, ${userName.split(' ')[0]}.` : 'Welcome to Aellux.'}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.65 }}>
          {goalLabel
            ? `Your focus is ${goalLabel}. Aellux will orient every recommendation around that.`
            : 'Your biology has a protocol. Let\'s find it.'}
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>
          Upload your first health record to begin — it takes about 2 minutes.
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 36, position: 'relative' }}>
        {/* Connector line */}
        <div style={{ position: 'absolute', left: 21, top: 40, bottom: 40, width: 1, background: 'linear-gradient(to bottom, rgba(0,210,165,.3), var(--brand-ghost))', zIndex: 0 }} />

        {STEPS.map((s, i) => (
          <div key={i} onMouseEnter={() => setHoveredStep(i)} onMouseLeave={() => setHoveredStep(null)}
            onClick={s.primary ? onUpload : undefined}
            style={{ display: 'flex', gap: 18, padding: '18px 0', cursor: s.primary ? 'pointer' : 'default', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: s.primary ? (hoveredStep === i ? 'rgba(0,225,180,.25)' : 'rgba(0,225,180,.12)') : 'var(--bg-surface)', border: `1.5px solid ${s.primary ? 'rgba(0,225,180,.6)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'EB Garamond, Georgia, serif', fontSize: 18, color: s.primary ? 'var(--brand)' : 'var(--text-tertiary)', transition: 'all .2s' }}>
              {s.n}
            </div>
            <div style={{ flex: 1, paddingTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, color: s.primary ? 'var(--text-primary)' : 'rgba(220,255,235,.55)', fontWeight: s.primary ? 500 : 400 }}>{s.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>{s.time}</span>
              </div>
              <p style={{ fontSize: 14, color: s.primary ? 'var(--text-secondary)' : 'var(--text-tertiary)', lineHeight: 1.65, margin: s.primary ? '0 0 12px' : 0 }}>{s.desc}</p>
              {s.primary && (
                <button onClick={onUpload}
                  style={{ fontSize: 15, color: 'rgba(0,20,14,1)', background: 'var(--brand)', border: 'none', borderRadius: 6, padding: '11px 24px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'background .2s' }}>
                  {s.action}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* What can I upload? */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>What can I upload?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {QUICK_SOURCES.map(s => (
            <div key={s.label} onClick={onUpload}
              style={{ padding: '12px 14px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,210,165,.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Don't have records? */}
      <div style={{ padding: '16px 20px', background: 'rgba(0,210,165,.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 3 }}>Don't have your labs yet?</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>See every option — from free physician requests to comprehensive 160-marker panels.</div>
        </div>
        <button onClick={onGetTested || onGuide}
          style={{ flexShrink: 0, fontSize: 13, color: 'var(--brand)', background: 'var(--brand-ghost)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
          How to get tested →
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes pulse { 0%,100%{box-shadow:0 0 20px var(--text-tertiary)} 50%{box-shadow:0 0 40px var(--text-secondary)} }' }} />
    </div>
  );
}
