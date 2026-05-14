import React, { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

const FREE = ['Upload up to 3 health documents', 'Extract and view all biomarkers', 'Basic health dashboard', 'Ask Aellux (5 questions/day)'];
const HSA_NOTE = 'HSA/FSA eligible — check with your plan administrator';
const PRO  = ['Unlimited document uploads', 'Full biomarker trend graphs', 'AI-generated meal protocol', 'AI-generated supplement stack', 'AI-generated daily protocol', 'Unlimited Aellux conversations', 'Priority Claude Opus analysis', 'Export your health data'];

type View = 'landing' | 'signup-free' | 'signup-pro' | 'signin' | 'forgot' | 'reset';

// ── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ── Password input with visibility toggle ────────────────────────────────────
function PasswordInput({
  value, onChange, placeholder, style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'rgba(0,8,18,.9)',
          border: '1.5px solid rgba(0,200,160,.4)',
          borderRadius: 6,
          color: '#e0fff8',
          fontSize: 17,
          fontFamily: 'inherit',
          padding: '12px 48px 12px 16px',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          ...style,
        }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: visible ? 'rgba(0,210,165,.85)' : 'rgba(0,175,140,.35)',
          padding: 2, display: 'flex', alignItems: 'center',
          transition: 'color .15s',
        }}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: 'rgba(0,8,18,.9)', border: '1.5px solid rgba(0,200,160,.4)', borderRadius: 6,
  color: '#e0fff8', fontSize: 17, fontFamily: 'inherit', padding: '12px 16px',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  fontSize: 17, fontFamily: 'inherit', fontWeight: 600, borderRadius: 6,
  padding: '13px 0', cursor: 'pointer', width: '100%', border: 'none',
};
const wrap: React.CSSProperties = {
  minHeight: '100vh', background: '#030d14', fontFamily: '"EB Garamond",Georgia,serif',
  display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto',
};
const orb: React.CSSProperties = {
  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
  background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)',
};
const errorBox: React.CSSProperties = {
  fontSize: 14, color: '#ff8c60', padding: '8px 12px',
  background: 'rgba(255,80,40,.08)', borderRadius: 4, border: '1px solid rgba(255,80,40,.2)',
};
const successBox: React.CSSProperties = {
  fontSize: 14, color: '#4dd4a8', padding: '8px 12px',
  background: 'rgba(0,210,165,.08)', borderRadius: 4, border: '1px solid rgba(0,210,165,.2)',
};
const ghost: React.CSSProperties = {
  marginTop: 16, background: 'none', border: 'none',
  color: 'rgba(0,200,160,.5)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthPaywall() {
  const { signIn, signUp } = useAuth();

  const [view, setView]     = useState<View>('landing');
  const [email, setEmail]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Reset-token state
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // ── On mount: detect ?reset_token= in URL ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    const emailParam = params.get('email');
    if (token && emailParam) {
      setResetToken(token);
      setResetEmail(decodeURIComponent(emailParam));
      setView('reset');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const reset = (v: View) => {
    setView(v); setError(''); setSuccess('');
    setEmail(''); setPassword(''); setConfirmPassword('');
    setNewPassword(''); setConfirmNewPassword('');
  };

  // ── Sign in ────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setLoading(true); setError('');
    const result = await signIn(email.trim(), password);
    if (result?.error) setError(result.error);
    setLoading(false);
  };

  // ── Sign up ────────────────────────────────────────────────────────────────
  const handleSignUp = async (plan: 'free' | 'pro') => {
    if (!email.includes('@')) { setError('Enter a valid email.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
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

  // ── Forgot password — send reset email ────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: email.trim() }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); }
      else { setSuccess('Check your inbox — a reset link is on its way. It expires in 1 hour.'); }
    } catch { setError('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  // ── Reset password — apply new password ───────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8)          { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', email: resetEmail, token: resetToken, newPassword }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); }
      else {
        setSuccess('Password updated. Signing you in…');
        setTimeout(async () => {
          const result = await signIn(resetEmail, newPassword);
          if (result?.error) { setError(result.error); setSuccess(''); }
        }, 1200);
      }
    } catch { setError('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  // ── SIGN IN ───────────────────────────────────────────────────────────────
  if (view === 'signin') return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', padding: '56px 24px 32px', maxWidth: 480, width: '100%' }}>
        <div style={orb} />
        <h1 style={{ fontSize: 42, color: '#a8ffe8', fontWeight: 500, margin: '0 0 6px' }}>Aellux</h1>
        <p style={{ fontSize: 15, color: 'rgba(0,210,165,.55)', marginBottom: 32, letterSpacing: 3, textTransform: 'uppercase' }}>Member Sign In</p>
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="your@email.com" required style={inp}
          />
          <PasswordInput
            value={password}
            onChange={v => { setPassword(v); setError(''); }}
            placeholder="Password"
          />
          {error   && <div style={errorBox}>{error}</div>}
          {success && <div style={successBox}>{success}</div>}
          <button type="submit" disabled={loading} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)', opacity: loading ? .7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <button onClick={() => reset('forgot')} style={{ ...ghost, display: 'block', margin: '12px auto 0' }}>
          Forgot password?
        </button>
        <button onClick={() => reset('landing')} style={{ ...ghost, display: 'block', margin: '8px auto 0' }}>
          Back to plans
        </button>
      </div>
    </div>
  );

  // ── SIGN UP ───────────────────────────────────────────────────────────────
  if (view === 'signup-free' || view === 'signup-pro') {
    const isPro = view === 'signup-pro';
    return (
      <div style={wrap}>
        <div style={{ textAlign: 'center', padding: '56px 24px 32px', maxWidth: 480, width: '100%' }}>
          <div style={orb} />
          <h1 style={{ fontSize: 42, color: '#a8ffe8', fontWeight: 500, margin: '0 0 6px' }}>Aellux</h1>
          <p style={{ fontSize: 15, color: 'rgba(0,210,165,.55)', marginBottom: 32, letterSpacing: 3, textTransform: 'uppercase' }}>
            {isPro ? 'Pro Account' : 'Free Account'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="your@email.com" style={inp}
            />
            <PasswordInput
              value={password}
              onChange={v => { setPassword(v); setError(''); }}
              placeholder="Create password (min 8 chars)"
            />
            <PasswordInput
              value={confirmPassword}
              onChange={v => { setConfirmPassword(v); setError(''); }}
              placeholder="Confirm password"
            />
            {error && <div style={errorBox}>{error}</div>}
            <button
              onClick={() => handleSignUp(isPro ? 'pro' : 'free')}
              disabled={loading}
              style={{ ...btn, color: '#030d14', background: isPro ? 'rgba(0,210,165,.9)' : 'rgba(0,190,150,.8)', opacity: loading ? .7 : 1 }}
            >
              {loading ? 'Creating account…' : isPro ? 'Create Account & Subscribe — $29/mo' : 'Create Free Account'}
            </button>
          </div>
          <button onClick={() => reset('landing')} style={{ ...ghost, display: 'block', margin: '16px auto 0' }}>
            Back to plans
          </button>
        </div>
      </div>
    );
  }

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
  if (view === 'forgot') return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', padding: '56px 24px 32px', maxWidth: 480, width: '100%' }}>
        <div style={orb} />
        <h1 style={{ fontSize: 42, color: '#a8ffe8', fontWeight: 500, margin: '0 0 6px' }}>Aellux</h1>
        <p style={{ fontSize: 15, color: 'rgba(0,210,165,.55)', marginBottom: 12, letterSpacing: 3, textTransform: 'uppercase' }}>Password Reset</p>
        <p style={{ fontSize: 15, color: 'rgba(120,210,175,.6)', marginBottom: 28, lineHeight: 1.6 }}>
          Enter your email and we'll send a reset link. It expires in 1 hour.
        </p>
        <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); setSuccess(''); }}
            placeholder="your@email.com" required style={inp}
          />
          {error   && <div style={errorBox}>{error}</div>}
          {success && <div style={successBox}>{success}</div>}
          {!success && (
            <button type="submit" disabled={loading} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)', opacity: loading ? .7 : 1 }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          )}
        </form>
        <button onClick={() => reset('signin')} style={{ ...ghost, display: 'block', margin: '14px auto 0' }}>
          Back to sign in
        </button>
      </div>
    </div>
  );

  // ── RESET PASSWORD (arrived via email link) ───────────────────────────────
  if (view === 'reset') return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', padding: '56px 24px 32px', maxWidth: 480, width: '100%' }}>
        <div style={orb} />
        <h1 style={{ fontSize: 42, color: '#a8ffe8', fontWeight: 500, margin: '0 0 6px' }}>Aellux</h1>
        <p style={{ fontSize: 15, color: 'rgba(0,210,165,.55)', marginBottom: 12, letterSpacing: 3, textTransform: 'uppercase' }}>Set New Password</p>
        <p style={{ fontSize: 15, color: 'rgba(120,210,175,.6)', marginBottom: 28, lineHeight: 1.6 }}>
          Resetting password for <strong style={{ color: 'rgba(0,210,165,.8)' }}>{resetEmail}</strong>
        </p>
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PasswordInput
            value={newPassword}
            onChange={v => { setNewPassword(v); setError(''); }}
            placeholder="New password (min 8 chars)"
          />
          <PasswordInput
            value={confirmNewPassword}
            onChange={v => { setConfirmNewPassword(v); setError(''); }}
            placeholder="Confirm new password"
          />
          {error   && <div style={errorBox}>{error}</div>}
          {success && <div style={successBox}>{success}</div>}
          {!success && (
            <button type="submit" disabled={loading} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)', opacity: loading ? .7 : 1 }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          )}
        </form>
        <button onClick={() => reset('signin')} style={{ ...ghost, display: 'block', margin: '14px auto 0' }}>
          Back to sign in
        </button>
      </div>
    </div>
  );

  // ── LANDING ───────────────────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', padding: '64px 24px 40px', maxWidth: 640, width: '100%' }}>
        <div style={{ ...orb, width: 80, height: 80, boxShadow: '0 0 48px rgba(0,210,165,.2)' }} />
        <div style={{ fontSize: 12, letterSpacing: 6, textTransform: 'uppercase', color: 'rgba(0,210,165,.65)', marginBottom: 12, fontWeight: 600 }}>
          Ancient Intelligence. Present Clarity.
        </div>
        <h1 style={{ fontSize: 58, color: '#a8ffe8', fontWeight: 500, margin: '0 0 20px' }}>Aellux</h1>
        <p style={{ fontSize: 20, color: '#8ae8d0', maxWidth: 500, margin: '0 auto 12px', lineHeight: 1.7 }}>
          Upload your medical records. Aellux reads everything and synthesises your complete biology.
        </p>
        <p style={{ fontSize: 17, color: 'rgba(120,220,190,.7)', maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.65 }}>
          Personalised meals, supplements, and daily protocols. Not templates.
        </p>
        <button onClick={() => reset('signin')} style={{ background: 'rgba(0,200,160,.15)', border: '1.5px solid rgba(0,200,160,.4)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, color: '#7de8cc', padding: '10px 28px', fontWeight: 600 }}>
          Already a member? Sign in
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, padding: '0 20px 52px', maxWidth: 880, width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Free plan */}
        <div style={{ flex: '1 1 360px', background: 'rgba(0,18,28,.85)', border: '1.5px solid rgba(0,170,130,.25)', borderRadius: 12, padding: '32px 28px' }}>
          <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,190,150,.65)', marginBottom: 10, fontWeight: 700 }}>Free</div>
          <div style={{ fontSize: 52, color: '#a8ffe8', fontWeight: 500, marginBottom: 4 }}>$0</div>
          <div style={{ fontSize: 17, color: 'rgba(120,210,175,.6)', marginBottom: 28 }}>Forever free</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {FREE.map(f => (
              <div key={f} style={{ display: 'flex', gap: 12, fontSize: 16, color: '#8ae8d0', lineHeight: 1.4 }}>
                <span style={{ color: '#4dd4a8', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>{f}
              </div>
            ))}
          </div>
          <button onClick={() => reset('signup-free')} style={{ ...btn, color: '#a8ffe8', background: 'rgba(0,190,150,.12)', border: '1.5px solid rgba(0,190,150,.4)' }}>
            Get started free
          </button>
        </div>

        {/* Pro plan */}
        <div style={{ flex: '1 1 360px', background: 'rgba(0,22,36,.92)', border: '1.5px solid rgba(0,210,165,.45)', borderRadius: 12, padding: '32px 28px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', background: 'rgba(0,210,165,.2)', border: '1.5px solid rgba(0,210,165,.45)', color: '#5de8c0', padding: '5px 18px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
            Most powerful
          </div>
          <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,215,165,.75)', marginBottom: 10, fontWeight: 700 }}>Pro</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 52, color: '#c0fff0', fontWeight: 500 }}>$29</span>
            <span style={{ fontSize: 18, color: 'rgba(140,220,190,.6)' }}>/month</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,210,165,.5)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ padding: '2px 7px', background: 'rgba(0,210,165,.1)', border: '1px solid rgba(0,210,165,.3)', borderRadius: 3, fontSize: 11, color: 'rgba(0,225,180,.8)', letterSpacing: '0.06em' }}>HSA/FSA</span>
            <span>May be eligible — check with your plan</span>
          </div>
          <div style={{ fontSize: 17, color: 'rgba(120,210,175,.6)', marginBottom: 28 }}>Full biological intelligence</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {PRO.map(f => (
              <div key={f} style={{ display: 'flex', gap: 12, fontSize: 16, color: '#c0fff0', lineHeight: 1.4 }}>
                <span style={{ color: '#4dd4a8', fontWeight: 700, flexShrink: 0 }}>&#10022;</span>{f}
              </div>
            ))}
          </div>
          <button onClick={() => reset('signup-pro')} style={{ ...btn, color: '#030d14', background: 'rgba(0,210,165,.9)' }}>
            Start with Pro
          </button>
          <div style={{ fontSize: 13, color: 'rgba(100,200,160,.4)', textAlign: 'center', marginTop: 10 }}>
            Powered by Stripe &middot; Cancel anytime
          </div>
        </div>
      </div>
    </div>
  );
}
