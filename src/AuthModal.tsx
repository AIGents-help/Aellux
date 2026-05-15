import React, { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

// ──────────────────────────────────────────────────────────────────────────────
// AuthModal — light-themed, matches LandingPage aesthetic.
// Replaces the dark-theme AuthPaywall. Self-contained: signin, signup-free,
// signup-pro, forgot password, and reset password flows.
// ──────────────────────────────────────────────────────────────────────────────

type View = 'signin' | 'signup-free' | 'signup-pro' | 'forgot' | 'reset';

interface Props {
  initialView?: View;
  onClose?: () => void;
}

// Eye icon for password visibility toggle
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

export default function AuthModal({ initialView = 'signin', onClose }: Props) {
  const { signIn, signUp } = useAuth();

  const [view, setView] = useState<View>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset-token state (when user clicks email link)
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Detect ?reset_token= in URL on mount
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

  const switchView = (v: View) => {
    setView(v);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setLoading(true); setError('');
    const result = await signIn(email.trim(), password);
    if (result?.error) setError(result.error);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');

    const isPro = view === 'signup-pro';
    if (isPro) {
      const result = await signUp(email.trim(), password);
      if (result?.error) { setError(result.error); setLoading(false); return; }
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else { setError(d.error || 'Checkout failed.'); setLoading(false); }
    } else {
      const result = await signUp(email.trim(), password);
      if (result?.error) setError(result.error);
      setLoading(false);
    }
  };

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
      if (d.error) setError(d.error);
      else setSuccess('Check your inbox — a reset link is on its way. It expires in 1 hour.');
    } catch { setError('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
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

  // ── Style tokens (light theme, matches LandingPage) ────────────────────────
  const S = {
    card: {
      background: '#fff',
      borderRadius: 16,
      padding: '40px 36px',
      width: '100%',
      maxWidth: 420,
      boxShadow: '0 30px 80px -20px rgba(15,26,15,.35), 0 0 0 1px rgba(0,0,0,.04)',
      position: 'relative' as const,
      fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    },
    close: {
      position: 'absolute' as const, top: 16, right: 16,
      background: 'transparent', border: 'none', cursor: 'pointer',
      width: 32, height: 32, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#8a9e8a', transition: 'all .15s',
    },
    eyebrow: {
      fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      color: '#4a5e4a', fontWeight: 500, marginBottom: 12,
    },
    title: {
      fontFamily: "'EB Garamond', serif",
      fontSize: 32, fontWeight: 400, color: '#0f1a0f',
      margin: 0, marginBottom: 8, lineHeight: 1.15,
    },
    sub: {
      fontSize: 14, color: '#4a5e4a', marginBottom: 28, lineHeight: 1.55,
    },
    label: {
      display: 'block', fontSize: 12, fontWeight: 500,
      color: '#4a5e4a', marginBottom: 6, letterSpacing: '0.02em',
    },
    input: {
      width: '100%', padding: '12px 14px', fontSize: 15,
      background: '#f7f6f2', border: '1px solid rgba(0,0,0,.08)',
      borderRadius: 10, color: '#0f1a0f',
      outline: 'none', boxSizing: 'border-box' as const,
      fontFamily: 'inherit', transition: 'border-color .15s, background .15s',
    },
    inputWrap: { position: 'relative' as const, marginBottom: 16 },
    eyeBtn: {
      position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)',
      background: 'transparent', border: 'none', cursor: 'pointer',
      color: '#8a9e8a', padding: 4, display: 'flex',
    },
    primaryBtn: {
      width: '100%', padding: '14px 20px', fontSize: 15,
      background: '#0f1a0f', color: '#fff', border: 'none', borderRadius: 10,
      cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
      transition: 'background .15s, transform .15s',
      marginTop: 8,
    },
    error: {
      background: 'rgba(127,29,29,.06)', border: '1px solid rgba(127,29,29,.2)',
      color: '#7f1d1d', padding: '10px 14px', borderRadius: 8,
      fontSize: 13, marginBottom: 16, lineHeight: 1.5,
    },
    success: {
      background: 'rgba(20,83,45,.06)', border: '1px solid rgba(20,83,45,.2)',
      color: '#14532d', padding: '10px 14px', borderRadius: 8,
      fontSize: 13, marginBottom: 16, lineHeight: 1.5,
    },
    linkRow: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginTop: 20, fontSize: 13, color: '#4a5e4a',
    },
    link: {
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#0f1a0f', textDecoration: 'underline', textUnderlineOffset: 3,
      fontSize: 13, padding: 0, fontFamily: 'inherit', fontWeight: 500,
    },
    proBadge: {
      display: 'inline-block', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.1em', textTransform: 'uppercase' as const,
      background: '#0f1a0f', color: '#fff',
      padding: '3px 10px', borderRadius: 100, marginLeft: 8,
      verticalAlign: 'middle', position: 'relative' as const, top: -2,
    },
    hsa: {
      fontSize: 12, color: '#4a5e4a', marginTop: 12, lineHeight: 1.5,
      padding: '10px 12px', background: 'rgba(5,46,22,.04)',
      border: '1px solid rgba(5,46,22,.1)', borderRadius: 8,
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderClose = onClose ? (
    <button style={S.close} onClick={onClose} aria-label="Close" onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.05)'; e.currentTarget.style.color = '#0f1a0f'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a9e8a'; }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  ) : null;

  // ── SIGN IN ─────────────────────────────────────────────────────────────────
  if (view === 'signin') {
    return (
      <div style={S.card}>
        {renderClose}
        <p style={S.eyebrow}>Welcome back</p>
        <h2 style={S.title}>Sign in to Aellux</h2>
        <p style={S.sub}>Continue your biological intelligence work.</p>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSignIn}>
          <label style={S.label}>Email</label>
          <div style={S.inputWrap}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={S.input} autoFocus autoComplete="email" />
          </div>

          <label style={S.label}>Password</label>
          <div style={S.inputWrap}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...S.input, paddingRight: 44 }} autoComplete="current-password" />
            <button type="button" style={S.eyeBtn} onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showPassword} />
            </button>
          </div>

          <button type="submit" disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={S.linkRow}>
          <button style={S.link} onClick={() => switchView('forgot')}>Forgot password?</button>
          <span>New here? <button style={S.link} onClick={() => switchView('signup-free')}>Create account</button></span>
        </div>
      </div>
    );
  }

  // ── SIGN UP (free or pro) ───────────────────────────────────────────────────
  if (view === 'signup-free' || view === 'signup-pro') {
    const isPro = view === 'signup-pro';
    return (
      <div style={S.card}>
        {renderClose}
        <p style={S.eyebrow}>Create your account</p>
        <h2 style={S.title}>
          {isPro ? <>Start with Pro<span style={S.proBadge}>$29/mo</span></> : 'Start free'}
        </h2>
        <p style={S.sub}>
          {isPro
            ? 'Full biological intelligence. Cancel anytime.'
            : 'Upload up to 3 documents and explore your biology. Upgrade anytime.'}
        </p>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSignUp}>
          <label style={S.label}>Email</label>
          <div style={S.inputWrap}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={S.input} autoFocus autoComplete="email" />
          </div>

          <label style={S.label}>Password</label>
          <div style={S.inputWrap}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={{ ...S.input, paddingRight: 44 }} autoComplete="new-password" />
            <button type="button" style={S.eyeBtn} onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showPassword} />
            </button>
          </div>

          <label style={S.label}>Confirm password</label>
          <div style={S.inputWrap}>
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={{ ...S.input, paddingRight: 44 }} autoComplete="new-password" />
            <button type="button" style={S.eyeBtn} onClick={() => setShowConfirm(s => !s)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>

          {isPro && (
            <div style={S.hsa}>
              <strong style={{ color: '#0f1a0f' }}>HSA / FSA eligible</strong> — Aellux Pro often qualifies as an eligible medical expense. Check with your plan administrator.
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...S.primaryBtn, opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? (isPro ? 'Redirecting to checkout…' : 'Creating account…') : (isPro ? 'Continue to checkout →' : 'Create free account')}
          </button>

          {isPro && (
            <p style={{ fontSize: 11, color: '#8a9e8a', textAlign: 'center', marginTop: 12 }}>Powered by Stripe · Cancel anytime</p>
          )}
        </form>

        <div style={S.linkRow}>
          <span>Already a member? <button style={S.link} onClick={() => switchView('signin')}>Sign in</button></span>
          {!isPro && <button style={S.link} onClick={() => switchView('signup-pro')}>Start with Pro</button>}
          {isPro && <button style={S.link} onClick={() => switchView('signup-free')}>Start free</button>}
        </div>
      </div>
    );
  }

  // ── FORGOT PASSWORD ─────────────────────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <div style={S.card}>
        {renderClose}
        <p style={S.eyebrow}>Password recovery</p>
        <h2 style={S.title}>Reset your password</h2>
        <p style={S.sub}>Enter your email and we'll send you a link to set a new password.</p>

        {error && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <form onSubmit={handleForgot}>
          <label style={S.label}>Email</label>
          <div style={S.inputWrap}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={S.input} autoFocus autoComplete="email" />
          </div>

          <button type="submit" disabled={loading || !!success} style={{ ...S.primaryBtn, opacity: (loading || success) ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Sending…' : success ? 'Sent' : 'Send reset link'}
          </button>
        </form>

        <div style={S.linkRow}>
          <button style={S.link} onClick={() => switchView('signin')}>← Back to sign in</button>
        </div>
      </div>
    );
  }

  // ── RESET PASSWORD (from email link) ───────────────────────────────────────
  if (view === 'reset') {
    return (
      <div style={S.card}>
        {renderClose}
        <p style={S.eyebrow}>Set new password</p>
        <h2 style={S.title}>Choose a new password</h2>
        <p style={S.sub}>For <strong style={{ color: '#0f1a0f' }}>{resetEmail}</strong></p>

        {error && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <form onSubmit={handleReset}>
          <label style={S.label}>New password</label>
          <div style={S.inputWrap}>
            <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" style={{ ...S.input, paddingRight: 44 }} autoFocus autoComplete="new-password" />
            <button type="button" style={S.eyeBtn} onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showPassword} />
            </button>
          </div>

          <label style={S.label}>Confirm new password</label>
          <div style={S.inputWrap}>
            <input type={showConfirm ? 'text' : 'password'} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Repeat new password" style={{ ...S.input, paddingRight: 44 }} autoComplete="new-password" />
            <button type="button" style={S.eyeBtn} onClick={() => setShowConfirm(s => !s)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>

          <button type="submit" disabled={loading || !!success} style={{ ...S.primaryBtn, opacity: (loading || success) ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Updating…' : success ? 'Done' : 'Update password'}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
