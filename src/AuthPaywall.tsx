import React, { useState } from 'react';
import { useAuth } from './useAuth';

const FREE = ['Upload up to 3 health documents', 'Extract and view all biomarkers', 'Basic health dashboard', 'Ask Aellux (5 questions/day)'];
const PRO = ['Unlimited document uploads', 'Full biomarker trend graphs', 'AI-generated meal protocol', 'AI-generated supplement stack', 'AI-generated daily protocol', 'Unlimited Aellux conversations', 'Priority Claude Opus analysis', 'Export your health data'];

const inp: React.CSSProperties = { background: 'rgba(0,8,18,.9)', border: '1.5px solid rgba(0,200,160,.4)', borderRadius: 6, color: '#e0fff8', fontSize: 18, fontFamily: 'inherit', padding: '14px 18px', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { fontSize: 18, fontFamily: 'inherit', fontWeight: 600, borderRadius: 6, padding: '15px 0', cursor: 'pointer', width: '100%', border: 'none' };

export default function AuthPaywall() {
  const { signIn } = useAuth();
  const [view, setView] = useState('landing');
  const [emailFree, setEmailFree] = useState('');
  const [emailPro, setEmailPro] = useState('');
  const [emailSignIn, setEmailSignIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doFree = (e: React.FormEvent) => { e.preventDefault(); if (!emailFree.includes('@')) { setError('Enter a valid email.'); return; } signIn(emailFree.trim()); };
  const doSignIn = (e: React.FormEvent) => { e.preventDefault(); if (!emailSignIn.includes('@')) { setError('Enter a valid email.'); return; } signIn(emailSignIn.trim()); };
  const doPro = async () => {
    if (!emailPro.includes('@')) { setError('Enter your email first.'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailPro.trim() }) });
      const d = await r.json();
      if (d.url) window.location.href = d.url; else setError(d.error || 'Checkout failed.');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030d14', fontFamily: '"EB Garamond", Georgia, serif', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', padding: '64px 24px 40px', maxWidth: 640, width: '100%' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', background: 'radial-gradient(ellipse at 38% 32%, rgba(0,240,185,.95) 0%, rgba(0,180,210,.75) 35%, rgba(0,8,22,.99) 100%)', boxShadow: '0 0 48px rgba(0,210,165,.2)' }} />
        <div style={{ fontSize: 12, letterSpacing: 6, textTransform: 'uppercase', color: 'rgba(0,210,165,.65)', marginBottom: 12, fontWeight: 600 }}>Ancient Intelligence. Present Clarity.</div>
        <h1 style={{ fontSize: 58, color: '#a8ffe8', fontWeight: 500, margin: '0 0 20px' }}>Aellux</h1>
        <p style={{ fontSize: 20, color: '#8ae8d0', maxWidth: 500, margin: '0 auto 12px', lineHeight: 1.7 }}>Upload your medical records. Aellux reads everything and synthesises your complete biology.</p>
        <p style={{ fontSize: 17, color: 'rgba(120,220,190,.7)', maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.65 }}>Personalised meals, supplements, and daily protocols. Not templates.</p>
        <button onClick={() => { setView(view === 'signin' ? 'landing' : 'signin'); setError(''); }} style={{ background: 'rgba(0,200,160,.15)', border: '1.5px solid rgba(0,200,160,.4)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, color: '#7de8cc', padding: '11px 28px', fontWeight: 600 }}>
          {view === 'signin' ? 'Back to plans' : 'Already a member? Sign in'}
        </button>
      </div>

      {view === 'signin' && (
        <div style={{ maxWidth: 440, width: '100%', padding: '0 24px 48px' }}>
          <div style={{ background: 'rgba(0,18,30,.9)', border: '1.5px solid rgba(0,180,140,.3)', borderRadius: 12, padding: '36px 32px' }}>
            <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,200,160,.7)', marginBottom: 8, fontWeight: 700 }}>Member Sign In</div>
            <p style={{ fontSize: 18, color: '#8ae8d0', marginBottom: 28, lineHeight: 1.6 }}>Enter your email. Your plan and data load automatically.</p>
            <form onSubmit={doSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="email" value={emailSignIn} onChange={e => { setEmailSignIn(e.target.value); setError(''); }} placeholder="your@email.com" required autoFocus style={inp} />
              {error && <div style={{ fontSize: 15, color: '#ff8c60', fontWeight: 500 }}>{error}</div>}
              <button type="submit" style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)' }}>Enter Aellux</button>
            </form>
          </div>
        </div>
      )}

      {view !== 'signin' && (
        <div style={{ display: 'flex', gap: 20, padding: '0 20px 52px', maxWidth: 880, width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 360px', background: 'rgba(0,18,28,.85)', border: '1.5px solid rgba(0,170,130,.25)', borderRadius: 12, padding: '32px 28px' }}>
            <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,190,150,.65)', marginBottom: 10, fontWeight: 700 }}>Free</div>
            <div style={{ fontSize: 52, color: '#a8ffe8', fontWeight: 500, marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 17, color: 'rgba(120,210,175,.6)', marginBottom: 28 }}>Forever free</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {FREE.map(f => (<div key={f} style={{ display: 'flex', gap: 12, fontSize: 17, color: '#8ae8d0', lineHeight: 1.4 }}><span style={{ color: '#4dd4a8', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>{f}</div>))}
            </div>
            <div style={{ borderTop: '1px solid rgba(0,170,130,.2)', paddingTop: 24 }}>
              {view === 'landing' ? (
                <button onClick={() => { setView('signup'); setError(''); }} style={{ ...btn, color: '#a8ffe8', background: 'rgba(0,190,150,.12)', border: '1.5px solid rgba(0,190,150,.4)' }}>Get started free</button>
              ) : (
                <form onSubmit={doFree} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="email" value={emailFree} onChange={e => { setEmailFree(e.target.value); setError(''); }} placeholder="your@email.com" required style={inp} />
                  {error && <div style={{ fontSize: 15, color: '#ff8c60', fontWeight: 500 }}>{error}</div>}
                  <button type="submit" style={{ ...btn, color: '#a8ffe8', background: 'rgba(0,190,150,.12)', border: '1.5px solid rgba(0,190,150,.4)' }}>Enter Aellux free</button>
                </form>
              )}
            </div>
          </div>
          <div style={{ flex: '1 1 360px', background: 'rgba(0,22,36,.92)', border: '1.5px solid rgba(0,210,165,.45)', borderRadius: 12, padding: '32px 28px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', background: 'rgba(0,210,165,.2)', border: '1.5px solid rgba(0,210,165,.45)', color: '#5de8c0', padding: '5px 18px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>Most powerful</div>
            <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,215,165,.75)', marginBottom: 10, fontWeight: 700 }}>Pro</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 52, color: '#c0fff0', fontWeight: 500 }}>$29</span>
              <span style={{ fontSize: 18, color: 'rgba(140,220,190,.6)' }}>/month</span>
            </div>
            <div style={{ fontSize: 17, color: 'rgba(120,210,175,.6)', marginBottom: 28 }}>Full biological intelligence</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {PRO.map(f => (<div key={f} style={{ display: 'flex', gap: 12, fontSize: 17, color: '#c0fff0', lineHeight: 1.4 }}><span style={{ color: '#4dd4a8', fontWeight: 700, flexShrink: 0 }}>&#10022;</span>{f}</div>))}
            </div>
            <div style={{ borderTop: '1px solid rgba(0,210,165,.18)', paddingTop: 24 }}>
              {view === 'landing' ? (
                <button onClick={() => { setView('signup'); setError(''); }} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)' }}>Start with Pro</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="email" value={emailPro} onChange={e => { setEmailPro(e.target.value); setError(''); }} placeholder="your@email.com" style={{ ...inp, border: '1.5px solid rgba(0,210,165,.45)' }} />
                  {error && <div style={{ fontSize: 15, color: '#ff8c60', fontWeight: 500 }}>{error}</div>}
                  <button onClick={doPro} disabled={loading} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)', opacity: loading ? 0.7 : 1 }}>{loading ? 'Opening Stripe...' : 'Subscribe with Stripe'}</button>
                  <div style={{ fontSize: 14, color: 'rgba(100,200,160,.5)', textAlign: 'center' }}>Powered by Stripe. Cancel anytime.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}