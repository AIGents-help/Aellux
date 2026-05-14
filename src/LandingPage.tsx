// @ts-nocheck
import React, { useState, useEffect } from 'react';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500&display=swap');

  .lp-root {
    background: #020810;
    color: rgba(220,255,235,.95);
    font-family: 'Inter', sans-serif;
    font-weight: 300;
    line-height: 1.6;
    overflow-x: hidden;
    min-height: 100vh;
  }
  .lp-root * { box-sizing: border-box; }

  /* NAV */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 48px;
    background: linear-gradient(to bottom, rgba(2,8,16,.95) 0%, transparent 100%);
    backdrop-filter: blur(4px);
  }
  .lp-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .lp-orb {
    width: 34px; height: 34px; border-radius: 50%;
    background: radial-gradient(ellipse at 38% 32%, rgba(0,240,185,.95) 0%, rgba(0,180,210,.75) 35%, rgba(0,8,22,.99) 100%);
    box-shadow: 0 0 20px rgba(0,210,165,.4);
    animation: lp-breathe 4s ease-in-out infinite;
    flex-shrink: 0;
  }
  .lp-brandname { font-family: 'EB Garamond', serif; font-size: 22px; color: rgba(0,210,165,.9); letter-spacing: 0.06em; }
  .lp-nav-links { display: flex; align-items: center; gap: 28px; list-style: none; }
  .lp-nav-links a { color: rgba(0,210,165,.6); text-decoration: none; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; transition: color .2s; }
  .lp-nav-links a:hover { color: rgba(0,210,165,1); }
  .lp-nav-btn {
    background: rgba(0,210,165,.1); border: 1px solid rgba(0,210,165,.4);
    color: rgba(0,240,190,1); border-radius: 4px; padding: 8px 20px;
    cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px;
    letter-spacing: 0.06em; text-transform: uppercase; transition: all .2s;
  }
  .lp-nav-btn:hover { background: rgba(0,210,165,.2); }

  /* HERO */
  .lp-hero {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    padding: 120px 24px 80px; position: relative; overflow: hidden;
  }
  .lp-hero-glow {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -60%);
    width: 700px; height: 700px;
    background: radial-gradient(ellipse, rgba(0,210,165,.07) 0%, transparent 70%);
    pointer-events: none;
  }
  .lp-hero-orb {
    width: 96px; height: 96px; border-radius: 50%;
    background: radial-gradient(ellipse at 38% 32%, rgba(0,240,185,.95) 0%, rgba(0,180,210,.75) 35%, rgba(0,8,22,.99) 100%);
    box-shadow: 0 0 60px rgba(0,210,165,.5), 0 0 120px rgba(0,210,165,.2);
    margin: 0 auto 36px; animation: lp-breathe 4s ease-in-out infinite; position: relative; z-index: 1;
  }
  .lp-eyebrow { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(0,210,165,.65); margin-bottom: 18px; }
  .lp-h1 {
    font-family: 'EB Garamond', serif; font-size: clamp(40px, 7vw, 84px);
    font-weight: 400; line-height: 1.1; color: rgba(220,255,235,1);
    margin-bottom: 24px; max-width: 880px; position: relative; z-index: 1;
  }
  .lp-h1 em { font-style: italic; color: rgba(0,210,165,.95); }
  .lp-hero-sub {
    font-size: 18px; color: rgba(180,240,210,.75); max-width: 540px;
    margin: 0 auto 44px; line-height: 1.75; position: relative; z-index: 1;
  }
  .lp-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }

  /* BUTTONS */
  .lp-btn-primary {
    font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500;
    color: rgba(2,12,20,1); background: rgba(0,225,180,.95); border: none;
    border-radius: 5px; padding: 14px 32px; cursor: pointer; letter-spacing: 0.04em;
    transition: background .2s, box-shadow .2s; text-decoration: none; display: inline-block;
  }
  .lp-btn-primary:hover { background: rgba(0,245,195,1); box-shadow: 0 0 30px rgba(0,210,165,.4); }
  .lp-btn-ghost {
    font-family: 'Inter', sans-serif; font-size: 15px; color: rgba(0,210,165,1);
    background: transparent; border: 1px solid rgba(0,210,165,.35); border-radius: 5px;
    padding: 14px 32px; cursor: pointer; letter-spacing: 0.04em;
    transition: border-color .2s, background .2s; text-decoration: none; display: inline-block;
  }
  .lp-btn-ghost:hover { border-color: rgba(0,210,165,.7); background: rgba(0,210,165,.06); }

  /* DIVIDER */
  .lp-divider { width: 100%; height: 1px; background: linear-gradient(to right, transparent, rgba(0,210,165,.2) 30%, rgba(0,210,165,.2) 70%, transparent); }

  /* SECTIONS */
  .lp-section { max-width: 1100px; margin: 0 auto; padding: 90px 24px; position: relative; z-index: 1; }
  .lp-label { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(0,210,165,.65); margin-bottom: 14px; }
  .lp-h2 { font-family: 'EB Garamond', serif; font-size: clamp(28px, 4vw, 50px); font-weight: 400; line-height: 1.2; color: rgba(220,255,235,1); margin-bottom: 18px; }
  .lp-body { font-size: 17px; color: rgba(180,240,210,.75); line-height: 1.8; max-width: 660px; }

  /* PROBLEM */
  .lp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
  .lp-quote { font-family: 'EB Garamond', serif; font-size: 24px; font-style: italic; color: rgba(220,255,235,.95); line-height: 1.75; padding-left: 24px; border-left: 3px solid rgba(0,210,165,.5); }

  /* STEPS */
  .lp-steps { margin-top: 56px; position: relative; }
  .lp-steps::before { content: ''; position: absolute; left: 22px; top: 28px; bottom: 28px; width: 1px; background: linear-gradient(to bottom, rgba(0,210,165,.08), rgba(0,210,165,.25), rgba(0,210,165,.08)); }
  .lp-step { display: flex; gap: 28px; padding: 28px 0; }
  .lp-step-num { width: 46px; height: 46px; border-radius: 50%; background: rgba(0,8,18,.8); border: 1px solid rgba(0,210,165,.35); display: flex; align-items: center; justify-content: center; font-family: 'EB Garamond', serif; font-size: 20px; color: rgba(0,210,165,.9); flex-shrink: 0; position: relative; z-index: 1; }
  .lp-step h3 { font-family: 'EB Garamond', serif; font-size: 22px; color: rgba(220,255,235,1); margin-bottom: 8px; font-weight: 500; }
  .lp-step p { font-size: 15px; color: rgba(180,240,210,.75); line-height: 1.75; }

  /* FEATURES */
  .lp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 18px; margin-top: 52px; }
  .lp-card { padding: 26px 28px; background: rgba(0,8,18,.5); border: 1px solid rgba(0,210,165,.16); border-radius: 10px; transition: border-color .2s, background .2s; }
  .lp-card:hover { border-color: rgba(0,210,165,.38); background: rgba(0,210,165,.04); }
  .lp-card-icon { font-size: 22px; margin-bottom: 14px; }
  .lp-card h3 { font-family: 'EB Garamond', serif; font-size: 19px; color: rgba(220,255,235,1); margin-bottom: 8px; font-weight: 500; }
  .lp-card p { font-size: 14px; color: rgba(180,240,210,.75); line-height: 1.7; }

  /* MOCK BIOMARKER CARDS */
  .lp-showcase { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; margin-top: 56px; }
  .lp-mock { background: rgba(0,8,18,.8); border: 1px solid rgba(0,210,165,.22); border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; }
  .lp-mock-name { font-family: 'EB Garamond', serif; font-size: 17px; color: rgba(220,255,235,1); font-weight: 500; }
  .lp-mock-cat { font-size: 10px; color: rgba(0,210,165,.5); letter-spacing: 0.12em; text-transform: uppercase; margin: 3px 0 10px; }
  .lp-mock-val { font-family: 'EB Garamond', serif; font-size: 28px; font-weight: 500; }
  .lp-mock-unit { font-size: 13px; color: rgba(0,210,165,.45); }
  .lp-bar { position: relative; height: 6px; background: rgba(0,210,165,.08); border-radius: 6px; margin-top: 12px; }
  .lp-bar-range { position: absolute; top: 0; height: 100%; background: rgba(0,210,165,.15); border-radius: 6px; }
  .lp-bar-dot { position: absolute; top: 50%; transform: translate(-50%,-50%); width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(2,12,22,1); }
  .lp-bar-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px; color: rgba(0,210,165,.4); }
  .lp-showcase-text h3 { font-family: 'EB Garamond', serif; font-size: 28px; color: rgba(220,255,235,1); margin-bottom: 14px; font-weight: 400; line-height: 1.3; }
  .lp-showcase-text p { font-size: 15px; color: rgba(180,240,210,.75); line-height: 1.8; margin-bottom: 14px; }

  /* VOICE */
  .lp-voice-box { background: linear-gradient(135deg, rgba(0,8,20,.8) 0%, rgba(0,20,35,.6) 100%); border: 1px solid rgba(0,210,165,.15); border-radius: 14px; padding: 60px; text-align: center; }
  .lp-voice-quote { font-family: 'EB Garamond', serif; font-size: clamp(20px, 2.5vw, 30px); font-style: italic; color: rgba(220,255,235,.97); line-height: 1.75; max-width: 740px; margin: 0 auto 28px; }
  .lp-voice-attr { font-size: 11px; color: rgba(0,210,165,.6); letter-spacing: 0.15em; text-transform: uppercase; }

  /* MEAL PREP */
  .lp-containers { display: flex; flex-direction: column; gap: 10px; }
  .lp-container-row { display: flex; gap: 10px; }
  .lp-container { flex: 1; padding: 14px 16px; background: rgba(0,8,18,.6); border: 1px solid rgba(0,210,165,.18); border-radius: 8px; }
  .lp-container-day { font-size: 10px; color: rgba(0,210,165,.6); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 4px; }
  .lp-container-meal { font-size: 14px; color: rgba(220,255,235,.9); margin-bottom: 3px; }
  .lp-container-flavor { font-size: 12px; color: rgba(255,200,80,.7); font-style: italic; }

  /* PHILOSOPHY */
  .lp-phil-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 52px; }
  .lp-phil { padding: 30px 26px; border-radius: 10px; border: 1px solid rgba(0,210,165,.14); background: rgba(0,8,18,.4); }
  .lp-phil-num { font-family: 'EB Garamond', serif; font-size: 44px; color: rgba(0,210,165,.12); line-height: 1; margin-bottom: 14px; }
  .lp-phil h3 { font-family: 'EB Garamond', serif; font-size: 19px; color: rgba(220,255,235,.95); margin-bottom: 8px; }
  .lp-phil p { font-size: 14px; color: rgba(180,240,210,.75); line-height: 1.75; }

  /* PRICING */
  .lp-pricing { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 52px; }
  .lp-price { padding: 38px; border-radius: 12px; background: rgba(0,8,18,.6); border: 1px solid rgba(0,210,165,.16); }
  .lp-price.featured { border-color: rgba(0,210,165,.48); background: rgba(0,30,20,.4); }
  .lp-price-tier { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(0,210,165,.65); margin-bottom: 14px; }
  .lp-price-amount { font-family: 'EB Garamond', serif; font-size: 50px; color: rgba(220,255,235,1); font-weight: 400; margin-bottom: 2px; }
  .lp-price-period { font-size: 14px; color: rgba(0,210,165,.5); margin-bottom: 26px; }
  .lp-price-features { list-style: none; margin-bottom: 32px; }
  .lp-price-features li { font-size: 14px; color: rgba(180,240,210,.8); padding: 7px 0; border-bottom: 1px solid rgba(0,210,165,.07); display: flex; gap: 10px; align-items: center; }
  .lp-price-features li::before { content: '✓'; color: rgba(0,210,165,.9); flex-shrink: 0; font-size: 12px; }

  /* FINAL CTA */
  .lp-final { text-align: center; padding: 100px 24px; }

  /* FOOTER */
  .lp-footer { border-top: 1px solid rgba(0,210,165,.1); padding: 36px 48px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }
  .lp-footer-brand { font-family: 'EB Garamond', serif; font-size: 18px; color: rgba(0,210,165,.55); }
  .lp-footer-links { display: flex; gap: 24px; list-style: none; }
  .lp-footer-links a { font-size: 12px; color: rgba(0,210,165,.35); text-decoration: none; transition: color .2s; }
  .lp-footer-links a:hover { color: rgba(0,210,165,.8); }
  .lp-footer-legal { font-size: 11px; color: rgba(0,210,165,.22); }

  @keyframes lp-breathe {
    0%, 100% { box-shadow: 0 0 20px rgba(0,210,165,.4); }
    50% { box-shadow: 0 0 35px rgba(0,210,165,.65); }
  }

  @media (max-width: 768px) {
    .lp-nav { padding: 14px 18px; }
    .lp-nav-links { display: none; }
    .lp-two-col, .lp-showcase, .lp-pricing { grid-template-columns: 1fr; }
    .lp-phil-grid { grid-template-columns: 1fr; }
    .lp-voice-box { padding: 36px 20px; }
    .lp-footer { flex-direction: column; text-align: center; }
  }
`;

interface Props { onAuth: () => void; }

export default function LandingPage({ onAuth }: Props) {
  return (
    <div className="lp-root">
      <style>{css}</style>

      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <div className="lp-orb" />
          <span className="lp-brandname">Aellux</span>
        </div>
        <ul className="lp-nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><button className="lp-nav-btn" onClick={onAuth}>Sign in →</button></li>
        </ul>
      </nav>

      {/* HERO */}
      <div className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-orb" />
        <p className="lp-eyebrow">Ancient Intelligence. Present Clarity.</p>
        <h1 className="lp-h1">Your biology has a protocol.<br /><em>Aellux finds it.</em></h1>
        <p className="lp-hero-sub">Upload your medical records and wearable data. Aellux reads everything and builds a 7-day operating system calibrated to your exact biology.</p>
        <div className="lp-actions">
          <button className="lp-btn-primary" onClick={onAuth}>Start free — upload your first record →</button>
          <a className="lp-btn-ghost" href="#how">See how it works</a>
        </div>
      </div>

      <div className="lp-divider" />

      {/* PROBLEM */}
      <div className="lp-section">
        <div className="lp-two-col">
          <div>
            <p className="lp-label">The problem</p>
            <h2 className="lp-h2">Most health apps give everyone the same plan.</h2>
            <p className="lp-body">Your blood work shows elevated estrogen suppressing free testosterone. Your thyroid T3 is suboptimal despite "normal" TSH. Your ferritin is borderline and affecting your energy.<br /><br />A generic wellness app sees none of this. It gives you the same meal plan as 10 million other users.</p>
          </div>
          <div>
            <p className="lp-quote">"Aellux is not a wellness app. It is a mirror. It reflects the truth of what your markers are saying — not what the industry wants you to believe they mean."</p>
          </div>
        </div>
      </div>

      <div className="lp-divider" />

      {/* HOW IT WORKS */}
      <div className="lp-section" id="how">
        <p className="lp-label">How it works</p>
        <h2 className="lp-h2">Three steps to your<br />Biologic Protocol.</h2>
        <div className="lp-steps">
          {[
            { n: '1', h: 'Upload your health records', p: 'Blood panels, DEXA scans, wearable exports, genetic reports, physician notes — any format. Aellux reads and extracts every biomarker automatically. No manual entry. No templates. Your actual data.' },
            { n: '2', h: 'Receive your Biologic Synthesis', p: 'Aellux cross-references your markers as a system — not in isolation. It identifies the cascades: what your elevated estrogen is doing to your free testosterone. What your suboptimal T3 explains about your energy. The upstream drivers no one explained.' },
            { n: '3', h: 'Run your 7-day protocol', p: 'Meals, supplements, training, recovery — designed from your biomarkers. Every meal targets your specific markers. Commit to 30, 60, or 90 days. Regenerate when your biology updates.' },
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
      <div className="lp-section" id="features">
        <p className="lp-label">What Aellux does</p>
        <h2 className="lp-h2">Everything your biology needs.<br />Nothing it doesn't.</h2>
        <div className="lp-grid">
          {[
            { icon: '⬡', h: 'Biomarker Intelligence', p: '73+ biomarkers tracked across hormones, lipids, thyroid, inflammatory, metabolic, and body composition. Each one explained in plain language — what it is, why it matters, what moves it.' },
            { icon: '◈', h: 'Cross-referenced Synthesis', p: 'Aellux sees how your markers interact as a biological system. The cascade effects. The upstream drivers. The real story behind your labs — not an isolated number in a box.' },
            { icon: '◎', h: '7-Day Biologic Protocol', p: 'Seven biologically distinct days: meals, supplements, training type, and recovery — all calibrated to your biomarkers. Swap individual meals freely. Run for 30, 60, or 90 days.' },
            { icon: '⊞', h: 'Meal Prepper Mode', p: 'Cook once on Sunday, eat all week. Aellux designs your menu around 2 bulk proteins and 2 sides. Portion into 21 containers. Flavor rotates daily so it never gets boring.' },
            { icon: '△', h: 'Trend Tracking', p: 'Every biomarker shows where you sit on the Low–High spectrum, your optimal zone, and your trajectory over time. Upload new labs and your trend history builds automatically.' },
            { icon: '◯', h: 'Holistic-First Guidance', p: 'Every recommendation leads with nutrition, movement, sleep, and supplementation. Medical intervention appears last — as escalation when genuinely warranted, never the opening move.' },
          ].map(f => (
            <div className="lp-card" key={f.h}>
              <div className="lp-card-icon">{f.icon}</div>
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* BIOMARKER SHOWCASE */}
      <div className="lp-section">
        <div className="lp-showcase">
          <div>
            {[
              { name: 'Total Testosterone', cat: 'Hormonal', val: '615', unit: 'ng/dL', color: '#34d399', status: 'Normal', dotPct: 58, delta: '▲ 42' },
              { name: 'Estrogen', cat: 'Hormonal', val: '34.6', unit: 'pg/mL', color: '#f87171', status: 'Elevated', dotPct: 84, delta: '▲ 4.2', flagged: true },
              { name: 'Vitamin D', cat: 'Nutritional', val: '58', unit: 'ng/mL', color: '#34d399', status: 'Optimal', dotPct: 62, delta: '▲ 8.0' },
            ].map(m => (
              <div className="lp-mock" key={m.name} style={m.flagged ? { borderColor: 'rgba(255,150,60,.3)' } : {}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span className="lp-mock-name">{m.name}</span>
                  <span style={{ fontSize: 12, color: m.color }}>{m.delta}</span>
                </div>
                <div className="lp-mock-cat">{m.cat}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                  <span className="lp-mock-val" style={{ color: m.color }}>{m.val}</span>
                  <span className="lp-mock-unit">{m.unit}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: m.color, letterSpacing: '.06em', textTransform: 'uppercase' }}>{m.status}</span>
                </div>
                <div className="lp-bar">
                  <div className="lp-bar-range" style={{ left: '15%', width: '60%' }} />
                  <div className="lp-bar-dot" style={{ left: `${m.dotPct}%`, background: m.color }} />
                </div>
                <div className="lp-bar-labels"><span>Low</span><span>High</span></div>
              </div>
            ))}
          </div>
          <div className="lp-showcase-text">
            <h3>Not just numbers. A map of how your biology is moving.</h3>
            <p>Every biomarker shows where you sit on the full reference spectrum — your dot riding the track between Low and High. Green means optimal. Orange means below range. Red means above.</p>
            <p>When you have multiple readings, the sparkline shows your trajectory. You can see if you're improving, holding, or drifting — and act before it becomes a problem.</p>
            <p>Tap any marker for the full deep-dive: what it is, why it matters, what it's doing to your other markers, and how to move it — naturally first.</p>
          </div>
        </div>
      </div>

      <div className="lp-divider" />

      {/* VOICE */}
      <div className="lp-section" style={{ padding: '80px 24px' }}>
        <div className="lp-voice-box">
          <p className="lp-voice-quote">"Your elevated estrogen at 34.6 is not an isolated problem. It is actively suppressing your free testosterone and slowing thyroid T3 conversion — one upstream imbalance creating three downstream symptoms you have been told are unrelated. This is estrogen dominance, and it is correctable without a prescription."</p>
          <p className="lp-voice-attr">— Aellux Biologic Synthesis</p>
        </div>
      </div>

      <div className="lp-divider" />

      {/* MEAL PREP */}
      <div className="lp-section">
        <div className="lp-two-col">
          <div>
            <p className="lp-label">Meal Prepper Mode</p>
            <h2 className="lp-h2">Cook once.<br />Eat all week.</h2>
            <p className="lp-body" style={{ marginBottom: 18 }}>Aellux designs your entire week around 2 bulk proteins and 2 sides. Cook Sunday in under 2 hours, portion into 21 containers, grab and go all week. Flavor rotates daily so it never gets old.</p>
            <p className="lp-body">Every container is calibrated to your biomarkers. Ground beef for testosterone and ferritin. Broccoli for estrogen clearance. It is not a meal plan — it is targeted nutrition.</p>
          </div>
          <div className="lp-containers">
            {[
              [{ day: 'Mon', meal: 'Ground Beef & Rice Bowl', flavor: 'Teriyaki + sesame' }, { day: 'Tue', meal: 'Ground Beef & Rice Bowl', flavor: 'Hot sauce + lime' }],
              [{ day: 'Wed', meal: 'Egg & Sweet Potato Box', flavor: 'Garlic + paprika' }, { day: 'Thu', meal: 'Ground Beef & Rice Bowl', flavor: 'Salsa + cumin' }],
              [{ day: 'Fri', meal: 'Egg & Sweet Potato Box', flavor: 'Ranch + chive' }, { day: '21 containers', meal: '~90 min Sunday', flavor: 'Batch cook total', featured: true }],
            ].map((row, ri) => (
              <div className="lp-container-row" key={ri}>
                {row.map((c: any) => (
                  <div className="lp-container" key={c.day} style={c.featured ? { borderColor: 'rgba(0,210,165,.35)' } : {}}>
                    <div className="lp-container-day" style={c.featured ? { color: 'rgba(0,225,180,.8)' } : {}}>{c.day}</div>
                    <div className="lp-container-meal">{c.meal}</div>
                    <div className="lp-container-flavor" style={c.featured ? { color: 'rgba(0,210,165,.6)' } : {}}>{c.flavor}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-divider" />

      {/* PHILOSOPHY */}
      <div className="lp-section">
        <p className="lp-label">Our philosophy</p>
        <h2 className="lp-h2">We are not the medical industry.</h2>
        <p className="lp-body" style={{ marginBottom: 0 }}>Aellux exists because most health information is designed to create dependency. We believe your body has intelligence. We believe the answers are usually in the biology, not the pharmacy.</p>
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
      <div className="lp-section" id="pricing">
        <p className="lp-label">Simple pricing</p>
        <h2 className="lp-h2">Start free. Go deeper<br />when you're ready.</h2>
        <div className="lp-pricing">
          {[
            { tier: 'Free', amount: '$0', period: 'forever', featured: false, features: ['Upload 3 documents', 'Extract all biomarkers', 'Health dashboard & trends', 'Day 1 protocol preview', '5 AI questions per day'], cta: 'Get started free' },
            { tier: 'Aellux Pro', amount: '$29', period: 'per month · HSA/FSA may be eligible', featured: true, features: ['Unlimited documents', 'Full 7-day Biologic Protocol', 'Meal Prepper mode', 'Unlimited AI conversations', 'Supplement stack with rationale', 'PDF export — all protocols', 'Regenerate when biology updates', 'Priority processing'], cta: 'Start Pro — $29/mo' },
          ].map(p => (
            <div className={`lp-price${p.featured ? ' featured' : ''}`} key={p.tier}>
              <p className="lp-price-tier" style={p.featured ? { color: 'rgba(0,225,180,.9)' } : {}}>{p.tier}</p>
              <div className="lp-price-amount">{p.amount}</div>
              <p className="lp-price-period">{p.period}</p>
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
        <div className="lp-hero-orb" style={{ width: 72, height: 72 }} />
        <p className="lp-label" style={{ marginTop: 28 }}>Your biology is waiting</p>
        <h2 className="lp-h2" style={{ marginBottom: 16 }}>Upload your first record.<br /><em>See what your labs actually mean.</em></h2>
        <p style={{ fontSize: 16, color: 'rgba(180,240,210,.7)', marginBottom: 36, lineHeight: 1.7 }}>Free to start. No credit card. No generic templates.</p>
        <button className="lp-btn-primary" onClick={onAuth}>Upload my first record →</button>
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
