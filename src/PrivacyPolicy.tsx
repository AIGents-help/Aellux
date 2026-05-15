// @ts-nocheck
import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
      <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 30%, #064e23 0%, #052e16 50%, #0a1a0a 100%)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>Aellux</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none' }}>Back to Aellux</a>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>
        <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>Legal</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: 16 }}>Privacy Policy</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 56 }}>Effective date: May 15, 2025</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>Overview</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>Aellux is a health intelligence platform operated by AIGents. This Privacy Policy explains how we collect, use, and safeguard your information at aellux.health.</p>
              <div style={{ padding: '16px 18px', background: 'var(--brand-ghost)', border: '1px solid var(--brand-border)', borderRadius: 8, borderLeft: '3px solid var(--brand-dim)' }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>We do not sell your health data. Ever.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>What We Collect</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Email address and hashed password', 'Biological profile (sex, birth year, height, weight, activity level)', 'Health goals and onboarding answers', 'Uploaded health documents (blood panels, DEXA, genetic reports, wearables)', 'Questions submitted to the AI engine', 'Usage data, device info, IP address, session tokens, error logs'].map((item, i) => (
                  <li key={i} style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item}</li>
                ))}
              </ul>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>We do not use your health data to train AI models.</p>
            </div>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>Third-Party Services</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Supabase', 'Database and authentication infrastructure', 'https://supabase.com/privacy'],
                ['Anthropic', 'AI analysis via Claude API — does not retain data for training', 'https://www.anthropic.com/privacy'],
                ['Stripe', 'Payment processing for Pro subscriptions', 'https://stripe.com/privacy'],
                ['Resend', 'Transactional email delivery', 'https://resend.com/privacy'],
                ['Vercel', 'Application hosting', 'https://vercel.com/legal/privacy-policy'],
                ['PostHog', 'Anonymized product analytics', 'https://posthog.com/privacy'],
              ].map(([name, desc, url], i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, margin: '0 0 4px' }}>{name}</p>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Privacy policy</a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>Your Rights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Access: request a copy of your data', 'Correction: fix inaccurate data', 'Deletion: delete your account and data', 'Portability: export your data in a machine-readable format', 'Objection: opt out of analytics'].map((item, i) => (
                  <li key={i} style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item}</li>
                ))}
              </ul>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                Contact <a href="mailto:contact@aigents.help" style={{ color: 'var(--brand-dim)', textDecoration: 'none' }}>contact@aigents.help</a> to exercise any right. We respond within 30 days.
              </p>
            </div>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>Health Disclaimer</h2>
            <div style={{ padding: '16px 18px', background: 'rgba(120,53,15,.06)', border: '1px solid rgba(120,53,15,.2)', borderRadius: 8, borderLeft: '3px solid #78350f' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>Aellux provides AI-generated analysis for informational purposes only. Nothing constitutes medical advice. Always consult a qualified healthcare provider before changing your diet, supplements, or health protocols.</p>
            </div>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>Contact</h2>
            <div style={{ padding: '20px 24px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, margin: '0 0 4px' }}>AIGents</p>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                Email: <a href="mailto:contact@aigents.help" style={{ color: 'var(--brand-dim)', textDecoration: 'none' }}>contact@aigents.help</a><br />
                Website: <a href="https://aellux.health" style={{ color: 'var(--brand-dim)', textDecoration: 'none' }}>aellux.health</a>
              </p>
            </div>
          </section>

        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
          {new Date().getFullYear()} AIGents · Aellux
        </p>
      </footer>
    </div>
  );
}
