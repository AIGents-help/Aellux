// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { track } from './analytics';
import './LandingPage.css';

type AuthVariant = 'signin' | 'signup-free' | 'signup-pro';
interface Props { onAuth: (variant?: AuthVariant) => void; }

export default function LandingPage({ onAuth }: Props) {
  const [scrolled, setScrolled] = useState(false);

  // Curated Unsplash imagery — premium lifestyle, editorial framing
  // All hotlinked from Unsplash CDN (free for commercial use, no attribution required)
  // Filtered hard for: editorial > stock, desaturated > saturated, hands/details > faces
  const img = {
    hero:       'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=1800&q=80&fm=webp',                 // soft morning light through linen — atmospheric
    problem:    'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=900&q=85&fm=webp',                  // hand holding glass of water, editorial
    howBanner:  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1800&q=85&fm=webp',                 // overhead flatlay of food/ingredients — premium editorial
    practice1:  'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=700&q=85&fm=webp',                     // hands preparing food, top-down
    practice2:  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=85&fm=webp',                  // person running silhouette, calm tones
    practice3:  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=85&fm=webp',                  // meditation/calm body, soft light
    mockSide:   'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=900&q=85&fm=webp',                  // hands holding cup, contemplative
    voice:      'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1600&q=80&fm=webp',                 // soft botanical close-up
    philosophy: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1800&q=85&fm=webp',                 // forest light, holistic-first signal
    finalCta:   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1800&q=80&fm=webp',                 // mountain landscape — aspirational
  };

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Wrap onAuth so every CTA fires an explicit auth_modal_opened event with the
  // CTA position. Lets us tell which sections drive conversions.
  const openAuth = (variant: AuthVariant, position: string) => {
    track('auth_modal_opened', { variant, position });
    onAuth(variant);
  };

  // Fire landing_viewed once per mount. PostHog auto-captures pageviews, but
  // this gives us an explicit, semantically-named event for funnel building.
  useEffect(() => {
    track('landing_viewed');
  }, []);

  const Orb = () => (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 30%, #064e23 0%, #052e16 50%, #0a1a0a 100%)', flexShrink: 0 }} />
  );

  return (
    <div className="lp">
      
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
          <li><button className="lp-nav-btn" onClick={() => openAuth('signin', 'nav')}>Sign in</button></li>
        </ul>
      </nav>

      {/* HERO */}
      <div className="lp-hero">
        <div className="lp-hero-bg" style={{ backgroundImage: `url(${img.hero})` }} />
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
          <button className="lp-btn-primary" onClick={() => openAuth('signup-free', 'hero')}>Get started free →</button>
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
            <div className="lp-quote" style={{ marginTop: 28 }}>
              "Aellux is not a wellness app. It is a mirror — reflecting the truth of what your markers are saying, not what the industry wants you to believe they mean."
            </div>
          </div>
          <div className="lp-paired-img" style={{ backgroundImage: `url(${img.problem})` }} role="img" aria-label="Editorial photograph" />
        </div>
      </div>

      <div className="lp-divider" />

      {/* HOW IT WORKS */}
      <div className="lp-section" id="how">
        <div className="lp-banner" style={{ backgroundImage: `url(${img.howBanner})`, marginBottom: 64 }} role="img" aria-label="Editorial flatlay">
          <div className="lp-banner-caption">Your biology, mapped — every marker calibrated to a specific lever you can actually pull.</div>
        </div>
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

      {/* IN PRACTICE — TRIPTYCH */}
      <div className="lp-section" style={{ paddingBottom: 0 }}>
        <p className="lp-eyebrow" style={{ textAlign: 'center' }}>In practice</p>
        <h2 className="lp-h2" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>Your protocol shows up<br/>in the way you live.</h2>
      </div>
      <div className="lp-triptych">
        <div className="lp-triptych-img" style={{ backgroundImage: `url(${img.practice1})` }} role="img" aria-label="Meal preparation">
          <div className="lp-triptych-cap">Meals · Calibrated to your markers</div>
        </div>
        <div className="lp-triptych-img" style={{ backgroundImage: `url(${img.practice2})` }} role="img" aria-label="Movement">
          <div className="lp-triptych-cap">Movement · Tuned to your recovery</div>
        </div>
        <div className="lp-triptych-img" style={{ backgroundImage: `url(${img.practice3})` }} role="img" aria-label="Recovery">
          <div className="lp-triptych-cap">Recovery · Built on your biology</div>
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
            <div className="lp-mock-side-img" style={{ backgroundImage: `url(${img.mockSide})` }} role="img" aria-label="Contemplative editorial" />
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
                <span className="lp-mock-val" style={{ color: m.badge === 'lp-badge-elevated' ? '#c0392b' : m.badge === 'lp-badge-watch' ? '#c47c0a' : '#064e23' }}>{m.val}</span>
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
        <div className="lp-voice-bg" style={{ backgroundImage: `url(${img.voice})` }} />
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
        <div className="lp-phil-img" style={{ backgroundImage: `url(${img.philosophy})` }} role="img" aria-label="Holistic biology" />
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
              <button className={p.featured ? 'lp-btn-primary' : 'lp-btn-ghost'} onClick={() => openAuth(p.featured ? 'signup-pro' : 'signup-free', 'pricing')} style={{ width: '100%', textAlign: 'center' }}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* FINAL CTA */}
      <div className="lp-final">
        <div className="lp-final-bg" style={{ backgroundImage: `url(${img.finalCta})` }} />
        <p className="lp-eyebrow">Your biology is waiting</p>
        <h2 className="lp-h2" style={{ marginBottom: 20 }}>Upload your first record.<br /><em style={{ color: '#064e23' }}>See what your labs actually mean.</em></h2>
        <p className="lp-body" style={{ color: 'rgba(247,246,242,.6)', margin: '0 auto 40px', textAlign: 'center' }}>Free to start. No credit card. No generic templates.</p>
        <button className="lp-final-btn" onClick={() => openAuth('signup-free', 'final')}>Upload my first record →</button>
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
