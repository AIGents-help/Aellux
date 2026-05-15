import React, { useState, useEffect } from 'react';
import { track } from './analytics';

// ──────────────────────────────────────────────────────────────────────────────
// GetTested.tsx — dedicated "How to get tested" panel.
// Aellux is most useful when you have biomarker data. This page solves the
// upstream problem ("where do I get tested?") with Function Health as the
// recommended path. Affiliate disclosure shown clearly; copy is honest.
//
// Strategic intent: this is the ONLY surface in Aellux where affiliate links
// live. Synthesis output, AI recommendations, protocols, and PDFs stay clean.
// Keeping it contained protects the brand promise of unbiased intelligence.
// ──────────────────────────────────────────────────────────────────────────────

// Function Health referral link — Tony's member referral code AKATES11
// Gives the new member $25 off + Aellux earns $25 once they maintain
// membership for 60 days. Tracked via Function's referrals.functionhealth.com
// (Impact-powered).
const FUNCTION_REFERRAL_URL = 'https://my.functionhealth.com/signup?code=AKATES11&_saasquatch=AKATES11&d=FHREF25';

interface Props {
  userId?: string;
  isPro?: boolean;
}

export default function GetTested({ userId }: Props) {
  const [clickedFunction, setClickedFunction] = useState(false);

  // Fire view event once per panel visit — separate from landing_viewed
  useEffect(() => {
    track('get_tested_viewed');
  }, []);

  // Log clicks server-side so we have an honest source of truth that doesn't
  // depend on Function/Impact's attribution dashboard.
  const trackClick = async (partner: string) => {
    // Client-side PostHog event for funnel visibility
    track('get_tested_partner_clicked', { partner });
    // Server-side log into usage_log table for revenue reconciliation
    if (!userId) return;
    try {
      await fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, endpoint: `affiliate-click-${partner}` }),
      });
    } catch { /* silent — never block the click */ }
  };

  const handleFunctionClick = () => {
    setClickedFunction(true);
    trackClick('function');
    // Don't preventDefault — let the link open naturally in new tab
  };

  // ── Style tokens — light theme to match LandingPage ──────────────────────
  const S = {
    page: {
      maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    },
    eyebrow: {
      fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
      color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 12,
    },
    h1: {
      fontFamily: "'EB Garamond', serif",
      fontSize: 44, fontWeight: 400, color: 'var(--text-primary)',
      margin: 0, marginBottom: 12, lineHeight: 1.1, letterSpacing: '-0.01em',
    },
    intro: {
      fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.6,
      maxWidth: 640, marginBottom: 48,
    },
    primaryCard: {
      background: 'var(--bg-surface)',
      border: '1.5px solid var(--text-primary)',
      borderRadius: 16, padding: 36, marginBottom: 32,
      boxShadow: '0 20px 40px -12px rgba(15,26,15,.12)',
      position: 'relative' as const,
    },
    secondaryCard: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle, rgba(0,0,0,.08))',
      borderRadius: 14, padding: 28, marginBottom: 16,
    },
    recommendedBadge: {
      position: 'absolute' as const, top: -12, left: 32,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      background: 'var(--text-primary)', color: '#fff',
      padding: '5px 12px', borderRadius: 100,
    },
    partnerName: {
      fontFamily: "'EB Garamond', serif",
      fontSize: 32, fontWeight: 400, color: 'var(--text-primary)',
      marginBottom: 6, lineHeight: 1.1,
    },
    partnerTagline: {
      fontSize: 14, color: 'var(--text-tertiary)',
      marginBottom: 24, letterSpacing: '0.02em',
    },
    bulletList: {
      listStyle: 'none', padding: 0, margin: '0 0 28px',
      display: 'flex', flexDirection: 'column' as const, gap: 10,
    },
    bullet: {
      fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.55,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    },
    bulletCheck: {
      color: 'var(--brand, #052e16)', fontWeight: 600,
      fontSize: 14, marginTop: 2, flexShrink: 0,
    },
    priceRow: {
      display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4,
    },
    price: {
      fontFamily: "'EB Garamond', serif", fontSize: 36, fontWeight: 400,
      color: 'var(--text-primary)',
    },
    priceUnit: {
      fontSize: 14, color: 'var(--text-tertiary)',
    },
    priceNote: {
      fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 20,
      lineHeight: 1.5,
    },
    primaryBtn: {
      display: 'inline-block', padding: '14px 24px', fontSize: 15,
      background: 'var(--text-primary)', color: '#fff',
      border: 'none', borderRadius: 10, fontWeight: 500,
      textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
      transition: 'transform .15s, opacity .15s',
    },
    discount: {
      fontSize: 12, color: 'var(--brand, #052e16)', marginTop: 10,
      fontWeight: 500, letterSpacing: '0.02em',
    },
    disclosure: {
      fontSize: 11, color: 'var(--text-tertiary)',
      marginTop: 20, lineHeight: 1.6,
      padding: '14px 16px',
      background: 'rgba(0,0,0,.025)', borderRadius: 8,
    },
    altOptionTitle: {
      fontSize: 18, fontWeight: 500, color: 'var(--text-primary)',
      fontFamily: "'EB Garamond', serif", marginBottom: 4,
    },
    altOptionBody: {
      fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6,
    },
    sectionDivider: {
      borderTop: '1px solid rgba(0,0,0,.06)', margin: '48px 0 32px',
      paddingTop: 32,
    },
    sectionEyebrow: {
      fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
      color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 14,
    },
    sectionH2: {
      fontFamily: "'EB Garamond', serif",
      fontSize: 28, fontWeight: 400, color: 'var(--text-primary)',
      margin: '0 0 24px', lineHeight: 1.2,
    },
    quietLink: {
      color: 'var(--text-primary)', textDecoration: 'underline',
      textUnderlineOffset: 3, fontWeight: 500,
    },
    successPing: {
      background: 'rgba(20,83,45,.06)',
      border: '1px solid rgba(20,83,45,.2)',
      color: '#14532d', padding: '12px 16px', borderRadius: 10,
      fontSize: 13, marginTop: 16, lineHeight: 1.55,
    },
  };

  return (
    <div style={S.page}>
      <p style={S.eyebrow}>Lab Testing</p>
      <h1 style={S.h1}>You need the labs first.</h1>
      <p style={S.intro}>
        Aellux is most powerful when it has the full picture of your biology — at least
        100 biomarkers, ideally hormones, thyroid, micronutrients, inflammation, and
        metabolic markers. Most insurance-covered annual physicals run 10–15. Here's
        how to actually get tested at depth.
      </p>

      {/* ─── PRIMARY: Function Health ──────────────────────────────────── */}
      <div style={S.primaryCard}>
        <div style={S.recommendedBadge}>Recommended</div>

        <div style={S.partnerName}>Function Health</div>
        <div style={S.partnerTagline}>160+ biomarkers · twice yearly · physician oversight</div>

        <ul style={S.bulletList}>
          <li style={S.bullet}><span style={S.bulletCheck}>✓</span><span>160+ tests covering hormones, thyroid, heart, inflammation, vitamins, toxins, metabolic, and more</span></li>
          <li style={S.bullet}><span style={S.bulletCheck}>✓</span><span>Two full panels per year — track changes over time, not a one-time snapshot</span></li>
          <li style={S.bullet}><span style={S.bulletCheck}>✓</span><span>Drawn at 2,000+ Quest Diagnostics locations nationwide (48 states)</span></li>
          <li style={S.bullet}><span style={S.bulletCheck}>✓</span><span>Results download as PDF — upload directly into Aellux for full synthesis</span></li>
          <li style={S.bullet}><span style={S.bulletCheck}>✓</span><span>Founded by Dr. Mark Hyman; physician-reviewed results included</span></li>
        </ul>

        <div style={S.priceRow}>
          <span style={S.price}>$499</span>
          <span style={S.priceUnit}>/ year — two full panels included</span>
        </div>
        <p style={S.priceNote}>
          Lab draw fees vary by state (~$0–$200 per visit, often covered by insurance even when the membership isn't).
        </p>

        <a
          href={FUNCTION_REFERRAL_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={S.primaryBtn}
          onClick={(e) => { window.open(FUNCTION_REFERRAL_URL, '_blank', 'noopener,noreferrer')?.scrollTo(0,0); handleFunctionClick(e); }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.92'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.opacity = '1'; }}
        >
          Get started with Function →
        </a>
        <div style={S.discount}>✦ $25 off your first year through Aellux</div>

        {clickedFunction && (
          <div style={S.successPing}>
            Opening Function Health in a new tab. After you sign up and complete your first panel (usually 2–3 weeks), come back here and upload the PDF — Aellux will read every marker.
          </div>
        )}

        <div style={S.disclosure}>
          <strong style={{ color: 'var(--text-secondary)' }}>Disclosure:</strong> Aellux earns a referral fee when you sign up for Function Health through this link. This never influences our recommendations — we picked Function because it's the most comprehensive at-scale option available, and the data format integrates cleanly with Aellux. If Function isn't right for you, see the alternatives below.
        </div>
      </div>

      {/* ─── GIFT FUNCTION HEALTH ──────────────────────────────────────── */}
      <div style={{ ...S.secondaryCard, marginTop: 16, border: '1px solid var(--border-medium)', borderRadius: 10, padding: '24px 28px', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 28 }}>🎁</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Gift a Function Health membership</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Give someone the full picture of their biology</div>
          </div>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 18 }}>
          Function Health memberships make exceptional gifts — 160+ lab tests, twice yearly, with physician-reviewed results. Available as a one-year digital gift. No shipping needed, delivered instantly by email.
        </p>
        <a
          href="https://my.functionhealth.com/gift"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick('function-gift')}
          style={{ display: 'inline-block', fontSize: 15, fontWeight: 600, color: '#fff', background: '#1a4731', borderRadius: 8, padding: '12px 24px', textDecoration: 'none', transition: 'opacity .15s' }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          Gift Function Health →
        </a>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>$365/year · Recipient redeems via email · Aellux discount applies at checkout with code AKATES11</div>
      </div>

      {/* ─── ALTERNATIVES ──────────────────────────────────────────────── */}
      <div style={S.sectionDivider}>
        <p style={S.sectionEyebrow}>Other ways to get tested</p>
        <h2 style={S.sectionH2}>If Function isn't a fit</h2>
      </div>

      <div style={S.secondaryCard}>
        <div style={S.altOptionTitle}>Ask your primary care doctor</div>
        <div style={S.altOptionBody}>
          Request a comprehensive panel including thyroid (TSH, free T3, free T4, reverse T3), hormones
          (full sex hormone panel for your biological sex), full iron panel (ferritin + TIBC + sat),
          fasting insulin, ApoB, Lp(a), hs-CRP, homocysteine, and a full vitamin/mineral panel.
          Most insurance covers this if framed as preventive. <span style={{ color: 'var(--text-tertiary)' }}>Cost: $0–$200 depending on plan.</span>
        </div>
      </div>

      <div style={S.secondaryCard}>
        <div style={S.altOptionTitle}>Quest Diagnostics direct</div>
        <div style={S.altOptionBody}>
          Buy individual tests à la carte at <a href="https://www.questhealth.com" target="_blank" rel="noopener noreferrer" style={S.quietLink}>questhealth.com</a>.
          No doctor visit needed for purchase. Cheaper than Function for a one-time check ($30–$200 per test),
          but you'll need to assemble the panel yourself and the data isn't tracked over time.
          <span style={{ color: 'var(--text-tertiary)' }}> Good for filling specific gaps.</span>
        </div>
      </div>

      <div style={S.secondaryCard}>
        <div style={S.altOptionTitle}>Already have records?</div>
        <div style={S.altOptionBody}>
          Most providers will release the last 3–5 years of your lab results to you on request.
          Call your doctor's office and ask for a copy of all blood work — they're legally required
          to provide it (US HIPAA). Upload the PDFs to Aellux and you'll see your trajectory immediately.
        </div>
      </div>

      <div style={{ ...S.disclosure, marginTop: 32 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Why we only recommend Function as a partner:</strong> We tested every major direct-to-consumer lab service. Function is the only one that combines (1) comprehensive panel breadth, (2) twice-yearly cadence for tracking change, (3) data export that integrates with Aellux. We're not affiliated with Quest, InsideTracker, or any other lab — those are listed above as honest alternatives, not paid placements.
      </div>
    </div>
  );
}
