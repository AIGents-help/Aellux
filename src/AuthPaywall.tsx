import React, { useState } from 'react';
import { useAuth } from './useAuth';

const FREE = ['Upload up to 3 health documents', 'Extract and view all biomarkers', 'Basic health dashboard', 'Ask Aellux (5 questions/day)'];
const PRO = ['Unlimited document uploads', 'Full biomarker trend graphs', 'AI-generated meal protocol', 'AI-generated supplement stack', 'AI-generated daily protocol', 'Unlimited Aellux conversations', 'Priority Claude Opus analysis', 'Export your health data'];

const inp: React.CSSProperties = { background: 'rgba(0,8,18,.9)', border: '1.5px solid rgba(0,200,160,.4)', borderRadius: 6, color: '#e0fff8', fontSize: 17, fontFamily: 'inherit', padding: '12px 16px', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { fontSize: 17, fontFamily: 'inherit', fontWeight: 600, borderRadius: 6, padding: '13px 0', cursor: 'pointer', width: '100%', border: 'none' };

export default function AuthPaywall() {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<'landing' | 'signup-free' | 'signup-pro' | 'signin'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = (v: typeof view) => { setView(v); setError(''); setEmail(''); setPassword(''); setConfirmPassword(''); };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setLoading(true); setError('');
    const result = await signIn(email.trim(), password);
    if (result?.error) setError(result.error);
    setLoading(false);
  };

  const handleSignUp = async (plan: 'free' | 'pro') => {
    if (!email.includes('@')) { setError('Enter a valid email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    if (plan === 'pro') {
      const result = await signUp(email.trim(), password);
      if (result?.error) { setError(result.error); setLoading(false); return; }
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else { setError(d.error || 'Checkout failed.'); setLoading(false); }
    } else {
      const result = await signUp(email.trim(), password);
      if (result?.error) setError(result.error);
      setLoading(false);
    }
  };

  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#030d14', fontFamily: '"EB Garamond",Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' };

  if (view === 'signin') return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', padding: '56px 24px 32px', maxWidth: 480, width: '100%' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)' }} />
        <h1 style={{ fontSize: 42, color: '#a8ffe8', fontWeight: 500, margin: '0 0 6px' }}>Aellux</h1>
        <p style={{ fontSize: 15, color: 'rgba(0,210,165,.55)', marginBottom: 32, letterSpacing: 3, textTransform: 'uppercase' }}>Member Sign In</p>
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="your@email.com" required style={inp} />
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Password" required style={inp} />
          {error && <div style={{ fontSize: 14, color: '#ff8c60', padding: '8px 12px', background: 'rgba(255,80,40,.08)', borderRadius: 4, border: '1px solid rgba(255,80,40,.2)' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <button onClick={() => reset('landing')} style={{ marginTop: 20, background: 'none', border: 'none', color: 'rgba(0,200,160,.5)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Back to plans</button>
      </div>
    </div>
  );

  if (view === 'signup-free' || view === 'signup-pro') {
    const isPro = view === 'signup-pro';
    return (
      <div style={wrap}>
        <div style={{ textAlign: 'center', padding: '56px 24px 32px', maxWidth: 480, width: '100%' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)' }} />
          <h1 style={{ fontSize: 42, color: '#a8ffe8', fontWeight: 500, margin: '0 0 6px' }}>Aellux</h1>
          <p style={{ fontSize: 15, color: 'rgba(0,210,165,.55)', marginBottom: 32, letterSpacing: 3, textTransform: 'uppercase' }}>{isPro ? 'Pro Account' : 'Free Account'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="your@email.com" style={inp} />
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Create password (min 6 chars)" style={inp} />
            <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} placeholder="Confirm password" style={inp} />
            {error && <div style={{ fontSize: 14, color: '#ff8c60', padding: '8px 12px', background: 'rgba(255,80,40,.08)', borderRadius: 4, border: '1px solid rgba(255,80,40,.2)' }}>{error}</div>}
            <button onClick={() => handleSignUp(isPro ? 'pro' : 'free')} disabled={loading} style={{ ...btn, color: '#030d14', background: isPro ? 'rgba(0,210,165,.9)' : 'rgba(0,190,150,.8)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account...' : (isPro ? 'Create Account & Subscribe — $29/mo' : 'Create Free Account')}
            </button>
          </div>
          <button onClick={() => reset('landing')} style={{ marginTop: 20, background: 'none', border: 'none', color: 'rgba(0,200,160,.5)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Back to plans</button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', padding: '64px 24px 40px', maxWidth: 640, width: '100%' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)', boxShadow: '0 0 48px rgba(0,210,165,.2)' }} />
        <div style={{ fontSize: 12, letterSpacing: 6, textTransform: 'uppercase', color: 'rgba(0,210,165,.65)', marginBottom: 12, fontWeight: 600 }}>Ancient Intelligence. Present Clarity.</div>
        <h1 style={{ fontSize: 58, color: '#a8ffe8', fontWeight: 500, margin: '0 0 20px' }}>Aellux</h1>
        <p style={{ fontSize: 20, color: '#8ae8d0', maxWidth: 500, margin: '0 auto 12px', lineHeight: 1.7 }}>Upload your medical records. Aellux reads everything and synthesises your complete biology.</p>
        <p style={{ fontSize: 17, color: 'rgba(120,220,190,.7)', maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.65 }}>Personalised meals, supplements, and daily protocols. Not templates.</p>
        <button onClick={() => reset('signin')} style={{ background: 'rgba(0,200,160,.15)', border: '1.5px solid rgba(0,200,160,.4)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, color: '#7de8cc', padding: '10px 28px', fontWeight: 600 }}>
          Already a member? Sign in
        </button>
      </div>
      <div style={{ display: 'flex', gap: 20, padding: '0 20px 52px', maxWidth: 880, width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ flex: '1 1 360px', background: 'rgba(0,18,28,.85)', border: '1.5px solid rgba(0,170,130,.25)', borderRadius: 12, padding: '32px 28px' }}>
          <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,190,150,.65)', marginBottom: 10, fontWeight: 700 }}>Free</div>
          <div style={{ fontSize: 52, color: '#a8ffe8', fontWeight: 500, marginBottom: 4 }}>$0</div>
          <div style={{ fontSize: 17, color: 'rgba(120,210,175,.6)', marginBottom: 28 }}>Forever free</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {FREE.map(f => <div key={f} style={{ display: 'flex', gap: 12, fontSize: 16, color: '#8ae8d0', lineHeight: 1.4 }}><span style={{ color: '#4dd4a8', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>{f}</div>)}
          </div>
          <button onClick={() => reset('signup-free')} style={{ ...btn, color: '#a8ffe8', background: 'rgba(0,190,150,.12)', border: '1.5px solid rgba(0,190,150,.4)' }}>Get started free</button>
        </div>
        <div style={{ flex: '1 1 360px', background: 'rgba(0,22,36,.92)', border: '1.5px solid rgba(0,210,165,.45)', borderRadius: 12, padding: '32px 28px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', background: 'rgba(0,210,165,.2)', border: '1.5px solid rgba(0,210,165,.45)', color: '#5de8c0', padding: '5px 18px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>Most powerful</div>
          <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,215,165,.75)', marginBottom: 10, fontWeight: 700 }}>Pro</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 52, color: '#c0fff0', fontWeight: 500 }}>$29</span>
            <span style={{ fontSize: 18, color: 'rgba(140,220,190,.6)' }}>/month</span>
          </div>
          <div style={{ fontSize: 17, color: 'rgba(120,210,175,.6)', marginBottom: 28 }}>Full biological intelligence</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {PRO.map(f => <div key={f} style={{ display: 'flex', gap: 12, fontSize: 16, color: '#c0fff0', lineHeight: 1.4 }}><span style={{ color: '#4dd4a8', fontWeight: 700, flexShrink: 0 }}>&#10022;</span>{f}</div>)}
          </div>
          <button onClick={() => reset('signup-pro')} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)' }}>Start with Pro</button>
          <div style={{ fontSize: 13, color: 'rgba(100,200,160,.4)', textAlign: 'center', marginTop: 10 }}>Powered by Stripe &#183; Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}