// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

  .lp * { box-sizing: border-box; }

  .lp {
    background: #f7f6f2;
    color: #0f1a0f;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 300;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* NAV */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 48px; height: 60px;
    background: rgba(247,246,242,.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,.06);
  }
  .lp-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .lp-brandname { font-family: 'EB Garamond', serif; font-size: 20px; color: #0f1a0f; letter-spacing: 0.02em; }
  .lp-nav-links { display: flex; align-items: center; gap: 32px; list-style: none; }
  .lp-nav-links a { color: #4a5e4a; text-decoration: none; font-size: 14px; font-weight: 400; transition: color .15s; }
  .lp-nav-links a:hover { color: #0f1a0f; }
  .lp-nav-btn {
    background: #0f1a0f; color: #f7f6f2; border: none;
    border-radius: 6px; padding: 9px 20px; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    transition: background .15s;
  }
  .lp-nav-btn:hover { background: #0a3d25; }

  /* HERO */
  .lp-hero {
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    padding: 100px 24px 80px;
    position: relative;
    overflow: hidden;
  }

  .lp-hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 500; letter-spacing: 0.1em;
    text-transform: uppercase; color: #0a3d25;
    background: rgba(10,61,37,.07); border: 1px solid rgba(10,61,37,.15);
    border-radius: 100px; padding: 6px 14px; margin-bottom: 32px;
  }
  .lp-hero-eyebrow span { width: 6px; height: 6px; border-radius: 50%; background: #0a3d25; animation: lp-pulse 2s ease-in-out infinite; }

  .lp-h1 {
    font-family: 'EB Garamond', serif;
    font-size: clamp(48px, 7vw, 96px);
    font-weight: 400; line-height: 1.05;
    color: #0f1a0f; margin-bottom: 24px; max-width: 900px;
    letter-spacing: -0.02em;
  }
  .lp-h1 em { font-style: italic; color: #0a3d25; }

  .lp-hero-sub {
    font-size: 19px; color: #4a5e4a; max-width: 540px;
    margin: 0 auto 44px; line-height: 1.7; font-weight: 300;
  }

  .lp-hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  .lp-btn-primary {
    font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500;
    color: #f7f6f2; background: #0f1a0f; border: none;
    border-radius: 8px; padding: 14px 32px; cursor: pointer;
    text-decoration: none; display: inline-block; transition: background .15s;
  }
  .lp-btn-primary:hover { background: #0a3d25; }

  .lp-btn-ghost {
    font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 400;
    color: #0f1a0f; background: transparent;
    border: 1px solid rgba(0,0,0,.18); border-radius: 8px;
    padding: 14px 32px; cursor: pointer; text-decoration: none;
    display: inline-block; transition: border-color .15s, background .15s;
  }
  .lp-btn-ghost:hover { border-color: rgba(0,0,0,.35); background: rgba(0,0,0,.03); }

  /* DATA STRIP */
  .lp-data-strip {
    display: flex; gap: 0; border: 1px solid rgba(0,0,0,.08);
    border-radius: 12px; overflow: hidden; margin: 64px auto 0;
    max-width: 760px; background: #fff;
  }
  .lp-data-cell {
    flex: 1; padding: 24px 28px; border-right: 1px solid rgba(0,0,0,.06);
    text-align: center;
  }
  .lp-data-cell:last-child { border-right: none; }
  .lp-data-num {
    font-family: 'EB Garamond', serif; font-size: 38px;
    color: #0f1a0f; font-weight: 500; line-height: 1; margin-bottom: 6px;
  }
  .lp-data-label { font-size: 12px; color: #8a9e8a; font-weight: 400; letter-spacing: 0.04em; }

  /* DIVIDER */
  .lp-divider { width: 100%; height: 1px; background: rgba(0,0,0,.06); }

  /* SECTIONS */
  .lp-section { max-width: 1100px; margin: 0 auto; padding: 100px 32px; }
  .lp-section-sm { max-width: 760px; margin: 0 auto; padding: 80px 32px; }
  .lp-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #0a3d25; margin-bottom: 16px; }
  .lp-h2 { font-family: 'EB Garamond', serif; font-size: clamp(34px, 4vw, 56px); font-weight: 400; line-height: 1.1; color: #0f1a0f; margin-bottom: 20px; letter-spacing: -0.01em; }
  .lp-body { font-size: 17px; color: #4a5e4a; line-height: 1.8; max-width: 620px; font-weight: 300; }

  /* PROBLEM */
  .lp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
  .lp-quote {
    font-family: 'EB Garamond', serif; font-size: 24px; font-style: italic;
    color: #0a3d25; line-height: 1.7;
    padding: 28px 32px; background: rgba(10,61,37,.04);
    border-left: 3px solid #0a3d25; border-radius: 0 8px 8px 0;
  }

  /* HOW IT WORKS */
  .lp-steps { margin-top: 60px; position: relative; }
  .lp-step { display: grid; grid-template-columns: 64px 1fr; gap: 24px; margin-bottom: 40px; }
  .lp-step-num {
    width: 48px; height: 48px; border-radius: 50%;
    background: #0f1a0f; color: #f7f6f2;
    display: flex; align-items: center; justify-content: center;
    font-family: 'EB Garamond', serif; font-size: 22px;
    flex-shrink: 0; margin-top: 2px;
  }
  .lp-step h3 { font-family: 'EB Garamond', serif; font-size: 24px; color: #0f1a0f; margin-bottom: 8px; font-weight: 500; }
  .lp-step p { font-size: 16px; color: #4a5e4a; line-height: 1.75; font-weight: 300; }

  /* FEATURES GRID */
  .lp-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(0,0,0,.06); border: 1px solid rgba(0,0,0,.06); border-radius: 16px; overflow: hidden; margin-top: 56px; }
  .lp-feature { padding: 32px 28px; background: #fff; transition: background .15s; }
  .lp-feature:hover { background: #faf9f6; }
  .lp-feature-num { font-family: 'EB Garamond', serif; font-size: 13px; color: #8a9e8a; margin-bottom: 16px; }
  .lp-feature h3 { font-family: 'EB Garamond', serif; font-size: 20px; color: #0f1a0f; margin-bottom: 10px; font-weight: 500; }
  .lp-feature p { font-size: 14px; color: #4a5e4a; line-height: 1.7; font-weight: 300; }

  /* MOCK BIOMARKER */
  .lp-mock-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .lp-mock { background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
  .lp-mock-header { padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,.06); }
  .lp-mock-title { font-family: 'EB Garamond', serif; font-size: 15px; color: #0f1a0f; font-weight: 500; }
  .lp-mock-date { font-size: 12px; color: #8a9e8a; margin-top: 2px; }
  .lp-mock-row { display: flex; align-items: center; padding: 14px 24px; border-bottom: 1px solid rgba(0,0,0,.04); }
  .lp-mock-row:last-child { border-bottom: none; }
  .lp-mock-marker { flex: 1; font-size: 14px; color: #0f1a0f; font-weight: 400; }
  .lp-mock-val { font-family: 'EB Garamond', serif; font-size: 18px; font-weight: 500; margin-right: 12px; }
  .lp-mock-badge { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.04em; }
  .lp-badge-elevated { background: #fef0ee; color: #c0392b; }
  .lp-badge-normal { background: #eef6ee; color: #1a7a3a; }
  .lp-badge-watch { background: #fef8ee; color: #c47c0a; }

  /* VOICE SECTION */
  .lp-voice { max-width: 860px; margin: 0 auto; padding: 80px 32px; text-align: center; }
  .lp-voice-text {
    font-family: 'EB Garamond', serif; font-size: clamp(22px, 3vw, 34px);
    font-style: italic; color: #0f1a0f; line-height: 1.65;
    margin-bottom: 24px;
  }
  .lp-voice-attr { font-size: 12px; color: #8a9e8a; letter-spacing: 0.12em; text-transform: uppercase; }

  /* INTELLIGENCE SECTION - scrolling marquee feel */
  .lp-intel-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 48px; }
  .lp-intel-card {
    background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 10px;
    padding: 22px 20px; position: relative;
  }
  .lp-intel-label { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8a9e8a; margin-bottom: 10px; }
  .lp-intel-text { font-family: 'EB Garamond', serif; font-size: 16px; color: #0f1a0f; line-height: 1.65; font-style: italic; }
  .lp-intel-marker { display: inline-block; margin-top: 12px; font-size: 11px; font-weight: 500; color: #0a3d25; background: rgba(10,61,37,.07); padding: 2px 8px; border-radius: 100px; }

  /* PRICING */
  .lp-pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 800px; margin: 48px auto 0; }
  .lp-price-card { padding: 36px; border-radius: 14px; border: 1px solid rgba(0,0,0,.08); background: #fff; }
  .lp-price-card.featured { border-color: #0f1a0f; border-width: 1.5px; }
  .lp-price-tier { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #4a5e4a; margin-bottom: 16px; }
  .lp-price-amount { font-family: 'EB Garamond', serif; font-size: 52px; color: #0f1a0f; font-weight: 400; line-height: 1; margin-bottom: 4px; }
  .lp-price-period { font-size: 14px; color: #8a9e8a; margin-bottom: 6px; }
  .lp-price-hsa { font-size: 12px; color: #0a3d25; background: rgba(10,61,37,.07); border: 1px solid rgba(10,61,37,.15); display: inline-block; padding: 2px 8px; border-radius: 100px; margin-bottom: 24px; }
  .lp-price-features { list-style: none; margin-bottom: 32px; }
  .lp-price-features li { font-size: 14px; color: #4a5e4a; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,.05); display: flex; gap: 10px; font-weight: 300; }
  .lp-price-features li::before { content: '✓'; color: #0a3d25; flex-shrink: 0; font-weight: 500; }

  /* FOOTER */
  .lp-footer { border-top: 1px solid rgba(0,0,0,.06); padding: 40px 48px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; background: #fff; }
  .lp-footer-brand { font-family: 'EB Garamond', serif; font-size: 18px; color: #0f1a0f; }
  .lp-footer-links { display: flex; gap: 24px; list-style: none; }
  .lp-footer-links a { font-size: 13px; color: #8a9e8a; text-decoration: none; transition: color .15s; }
  .lp-footer-links a:hover { color: #0f1a0f; }
  .lp-footer-legal { font-size: 12px; color: #c0c8c0; }

  /* PHILOSOPHY */
  .lp-phil-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 56px; }
  .lp-phil-num { font-family: 'EB Garamond', serif; font-size: 48px; color: rgba(0,0,0,.06); line-height: 1; margin-bottom: 16px; }
  .lp-phil h3 { font-family: 'EB Garamond', serif; font-size: 20px; color: #0f1a0f; margin-bottom: 10px; }
  .lp-phil p { font-size: 14px; color: #4a5e4a; line-height: 1.75; font-weight: 300; }

  /* FINAL CTA */
  .lp-final { text-align: center; padding: 120px 24px; background: #0f1a0f; }
  .lp-final .lp-h2 { color: #f7f6f2; }
  .lp-final .lp-body { color: rgba(247,246,242,.65); margin: 0 auto 44px; }
  .lp-final .lp-eyebrow { color: #1a7a3a; }
  .lp-final-btn {
    font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 500;
    color: #0f1a0f; background: #f7f6f2; border: none;
    border-radius: 8px; padding: 16px 40px; cursor: pointer;
    text-decoration: none; display: inline-block; transition: background .15s;
  }
  .lp-final-btn:hover { background: #e8f5ee; }

  @keyframes lp-pulse {
    0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
  }

  @media (max-width: 768px) {
    .lp-nav { padding: 0 20px; }
    .lp-nav-links { display: none; }
    .lp-two-col, .lp-mock-wrap, .lp-pricing-grid { grid-template-columns: 1fr; gap: 40px; }
    .lp-features { grid-template-columns: 1fr; }
    .lp-intel-grid { grid-template-columns: 1fr; }
    .lp-phil-grid { grid-template-columns: 1fr; gap: 32px; }
    .lp-data-strip { flex-direction: column; }
    .lp-data-cell { border-right: none; border-bottom: 1px solid rgba(0,0,0,.06); }
    .lp-data-cell:last-child { border-bottom: none; }
    .lp-footer { flex-direction: column; text-align: center; padding: 32px 24px; }
    .lp-section, .lp-section-sm { padding: 64px 20px; }
    .lp-final { padding: 80px 20px; }
  }
`;

interface Props { onAuth: () => void; }

export default function LandingPage({ onAuth }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const Orb = () => (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 30%, #1a7a3a 0%, #0a3d25 50%, #0a1a0a 100%)', flexShrink: 0 }} />
  );

  return (
    <div className="lp">
      <style>{css}</style>

      {/* NAV */}
      <nav className="lp-nav" style={{ boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,.08)' : 'none' }}>
        <div className="lp-brand">
          <Orb />
          <span className="lp-brandname">Aellux</span>
        </div>
        <ul className="lp-nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#intelligence">Intelligence</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><button className="lp-nav-btn" onClick={onAuth}>Sign in</button></li>
        </ul>
      </nav>

      {/* HERO */}
      <div className="lp-hero">
        <div className="lp-hero-eyebrow">
          <span />
          Health intelligence, built on your biology
        </div>
        <h1 className="lp-h1">
          Your labs. Your data.<br />
          <em>Your protocol.</em>
        </h1>
        <p className="lp-hero-sub">
          Upload your medical records and wearable data. Aellux reads everything and builds a 7-day operating system calibrated to your exact biology — not a template, not population averages. Yours.
        </p>
        <div className="lp-hero-actions">
          <button className="lp-btn-primary" onClick={onAuth}>Get started free →</button>
          <a className="lp-btn-ghost" href="#how">See how it works</a>
        </div>
        <div className="lp-data-strip">
          {[
            { n: '73+', label: 'Biomarkers analyzed' },
            { n: '7', label: 'Day biologic protocol' },
            { n: '6', label: 'Intelligence layers' },
            { n: '$29', label: 'Per month, Pro' },
          ].map(d => (
            <div className="lp-data-cell" key={d.label}>
              <div className="lp-data-num">{d.n}</div>
              <div className="lp-data-label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* PROBLEM */}
      <div className="lp-section">
        <div className="lp-two-col">
          <div>
            <p className="lp-eyebrow">The problem</p>
            <h2 className="lp-h2">Most health apps give everyone the same plan.</h2>
            <p className="lp-body">
              Your blood work shows elevated estrogen suppressing free testosterone. Your thyroid T3 is suboptimal despite a "normal" TSH. Your ferritin is affecting your energy and recovery. A generic wellness app sees none of this. It gives you the same meal plan as 10 million other users.
            </p>
          </div>
          <div className="lp-quote">
            "Aellux is not a wellness app. It is a mirror — reflecting the truth of what your markers are saying, not what the industry wants you to believe they mean."
          </div>
        </div>
      </div>

      <div className="lp-divider" />

      {/* HOW IT WORKS */}
      <div className="lp-section" id="how">
        <p className="lp-eyebrow">How it works</p>
        <h2 className="lp-h2">Three steps to your<br />Biologic Protocol.</h2>
        <div className="lp-steps">
          {[
            { n: '1', h: 'Upload your health records', p: 'Blood panels, DEXA scans, wearable exports, genetic reports, physician notes — any format. Aellux reads and extracts every biomarker automatically. No manual entry. No templates.' },
            { n: '2', h: 'Receive your Biologic Synthesis', p: 'Aellux cross-references your markers as a system. It identifies the cascades — what your elevated estrogen is doing to your free testosterone. What your suboptimal T3 explains about your energy. The upstream drivers no one explained.' },
            { n: '3', h: 'Run your 7-day protocol', p: 'Meals, supplements, training, recovery — designed from your biomarkers, not a template. Every meal targets your specific markers. Commit to 30, 60, or 90 days. Regenerate when your biology updates.' },
          ].map(s => (
            <div className="lp-step" key={s.n}>
              <div className="lp-step-num">{s.n}</div>
              <div><h3>{s.h}</h3><p>{s.p}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* FEATURES */}
      <div className="lp-section">
        <p className="lp-eyebrow">What Aellux does</p>
        <h2 className="lp-h2">Six layers of intelligence,<br />working together.</h2>
        <div className="lp-features">
          {[
            { n: '01', h: 'Biomarker analysis', p: '73+ biomarkers tracked across hormones, lipids, thyroid, inflammatory, metabolic, and body composition. Each one cross-referenced as part of a system.' },
            { n: '02', h: 'Cascade detection', p: 'Aellux sees how your markers interact — what one is doing to another. The upstream root causes, not the downstream symptoms everyone else treats.' },
            { n: '03', h: '7-day protocol', p: 'Meals, supplements, training, and recovery — all calibrated to your biomarkers. Swap individual meals. Run for 30, 60, or 90 days.' },
            { n: '04', h: 'Trajectory analysis', p: 'Where is your biology heading? Aellux analyzes your trend lines and names the specific failure modes you are tracking toward — before they become irreversible.' },
            { n: '05', h: 'Accountability tracking', p: 'Every recommendation is tracked. Say yes, snooze it, or decline with a reason. Aellux adapts — never re-suggesting the same approach after you\'ve tried and rejected it.' },
            { n: '06', h: 'Pattern intelligence', p: 'Seasonal shifts, correlated markers, supplement effects — detected automatically across your full biological history.' },
          ].map(f => (
            <div className="lp-feature" key={f.n}>
              <div className="lp-feature-num">{f.n}</div>
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* MOCK UI */}
      <div className="lp-section" id="intelligence">
        <div className="lp-mock-wrap">
          <div>
            <p className="lp-eyebrow">Your data, your story</p>
            <h2 className="lp-h2">Not just numbers. A map of how your biology moves.</h2>
            <p className="lp-body">Every biomarker shows where you sit on the full reference spectrum — your dot riding the track between Low and High. Tap any marker to see the deep analysis: what it is, why it matters, what it's doing to your other markers.</p>
          </div>
          <div className="lp-mock">
            <div className="lp-mock-header">
              <div className="lp-mock-title">Health Dashboard</div>
              <div className="lp-mock-date">Last updated May 2026 · 14 markers</div>
            </div>
            {[
              { name: 'Estrogen', val: '34.6', unit: 'pg/mL', status: 'Elevated', badge: 'lp-badge-elevated', delta: '▲ 4.2' },
              { name: 'Total Testosterone', val: '615', unit: 'ng/dL', status: 'Normal', badge: 'lp-badge-normal', delta: '▲ 42' },
              { name: 'Free T3', val: '2.8', unit: 'pg/mL', status: 'Watch', badge: 'lp-badge-watch', delta: '▼ 0.3' },
              { name: 'Ferritin', val: '231', unit: 'ng/mL', status: 'Elevated', badge: 'lp-badge-elevated', delta: '▲ 18' },
              { name: 'Vitamin D', val: '58', unit: 'ng/mL', status: 'Normal', badge: 'lp-badge-normal', delta: '▲ 12' },
            ].map(m => (
              <div className="lp-mock-row" key={m.name}>
                <div className="lp-mock-marker">{m.name}</div>
                <span className="lp-mock-val" style={{ color: m.badge === 'lp-badge-elevated' ? '#c0392b' : m.badge === 'lp-badge-watch' ? '#c47c0a' : '#1a7a3a' }}>{m.val}</span>
                <span style={{ fontSize: 12, color: '#8a9e8a', marginRight: 12 }}>{m.unit}</span>
                <span className={`lp-mock-badge ${m.badge}`}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-divider" />

      {/* VOICE */}
      <div className="lp-voice">
        <p className="lp-eyebrow" style={{ textAlign: 'center', marginBottom: 32 }}>Aellux Synthesis</p>
        <p className="lp-voice-text">
          "Your elevated estrogen at 34.6 is not an isolated problem. It is actively suppressing your free testosterone and slowing thyroid T3 conversion — one upstream imbalance creating three downstream symptoms you have been told are unrelated. This is correctable without a prescription."
        </p>
        <p className="lp-voice-attr">Generated from your actual biomarker data</p>
      </div>

      <div className="lp-divider" />

      {/* INTELLIGENCE CARDS */}
      <div className="lp-section">
        <p className="lp-eyebrow">Intelligence layer</p>
        <h2 className="lp-h2">Aellux sees across your timeline,<br />not just your last lab result.</h2>
        <div className="lp-intel-grid">
          {[
            { label: 'Trend analysis', text: 'Your estrogen spiked 83% in a single month — from 18.9 to 34.6 pg/mL. This isn\'t noise. Your body shifted. The culprit sits in your ferritin at 231 and your SHBG at 41.3.', marker: 'Estrogen × Ferritin' },
            { label: 'Pattern detection', text: 'Your testosterone consistently dips in November–December. This is a seasonal pattern, likely Vitamin D and light exposure. Three years of data confirm it.', marker: 'Seasonal pattern' },
            { label: 'Premortem', text: 'If your estrogen trajectory continues at its current rate, you will cross 48 pg/mL by Q4 2026. At that level, the aromatase cycle becomes self-reinforcing.', marker: 'Trajectory analysis' },
          ].map(c => (
            <div className="lp-intel-card" key={c.label}>
              <div className="lp-intel-label">{c.label}</div>
              <div className="lp-intel-text">"{c.text}"</div>
              <div className="lp-intel-marker">{c.marker}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* PHILOSOPHY */}
      <div className="lp-section">
        <p className="lp-eyebrow">Our philosophy</p>
        <h2 className="lp-h2">We are not the medical industry.</h2>
        <p className="lp-body" style={{ marginBottom: 0 }}>Aellux exists because most health information is designed to create dependency, not independence. We believe your body has intelligence. We believe the answers are usually in the biology, not the pharmacy.</p>
        <div className="lp-phil-grid">
          {[
            { n: 'I', h: 'Holistic first', p: 'Every recommendation leads with food, movement, sleep, and targeted supplementation. Medical intervention appears last — as escalation when genuinely warranted, not the opening move.' },
            { n: 'II', h: 'Your data, your truth', p: 'Aellux builds from your actual biomarkers — not population averages or templates. The same marker means different things in different bodies. Your protocol is yours alone.' },
            { n: 'III', h: 'Protocol as ownership', p: 'Your Biologic Protocol is yours to keep. Run it for 30, 60, or 90 days. Regenerate when your biology updates. We are trying to make you independent of everything that kept you sick.' },
          ].map(p => (
            <div className="lp-phil" key={p.n}>
              <div className="lp-phil-num">{p.n}</div>
              <h3>{p.h}</h3>
              <p>{p.p}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* PRICING */}
      <div className="lp-section-sm" id="pricing" style={{ textAlign: 'center' }}>
        <p className="lp-eyebrow">Simple pricing</p>
        <h2 className="lp-h2">Start free.<br />Go deeper when you're ready.</h2>
        <div className="lp-pricing-grid">
          {[
            { tier: 'Free', amount: '$0', period: 'forever', hsa: false, featured: false, features: ['Upload 3 documents', 'Extract all biomarkers', 'Health dashboard', 'Day 1 protocol preview', '5 AI questions per day'], cta: 'Get started free' },
            { tier: 'Aellux Pro', amount: '$29', period: 'per month', hsa: true, featured: true, features: ['Unlimited documents', 'Full 7-day Biologic Protocol', 'Meal Prepper mode', 'Unlimited AI conversations', 'Supplement stack with rationale', 'Trajectory & premortem analysis', 'PDF export', 'Practitioner share link'], cta: 'Start Pro' },
          ].map(p => (
            <div className={`lp-price-card ${p.featured ? 'featured' : ''}`} key={p.tier}>
              <div className="lp-price-tier">{p.tier}</div>
              <div className="lp-price-amount">{p.amount}</div>
              <div className="lp-price-period">{p.period}</div>
              {p.hsa && <div className="lp-price-hsa">HSA / FSA eligible</div>}
              <ul className="lp-price-features">
                {p.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <button className={p.featured ? 'lp-btn-primary' : 'lp-btn-ghost'} onClick={onAuth} style={{ width: '100%', textAlign: 'center' }}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* FINAL CTA */}
      <div className="lp-final">
        <p className="lp-eyebrow">Your biology is waiting</p>
        <h2 className="lp-h2" style={{ marginBottom: 20 }}>Upload your first record.<br /><em style={{ color: '#1a7a3a' }}>See what your labs actually mean.</em></h2>
        <p className="lp-body" style={{ color: 'rgba(247,246,242,.6)', margin: '0 auto 40px', textAlign: 'center' }}>Free to start. No credit card. No generic templates.</p>
        <button className="lp-final-btn" onClick={onAuth}>Upload my first record →</button>
      </div>

      {/* FOOTER */}
      <footer className="lp-footer">
        <span className="lp-footer-brand">Aellux</span>
        <ul className="lp-footer-links">
          <li><a href="mailto:contact@aigents.help">Contact</a></li>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
        </ul>
        <span className="lp-footer-legal">© 2026 AIGents. Educational use only — not medical advice.</span>
      </footer>
    </div>
  );
}
