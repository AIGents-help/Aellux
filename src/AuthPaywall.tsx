import React, { useState } from 'react';
import { useAuth } from './useAuth';

const FREE_FEATURES = [
    'Upload up to 3 health documents',
    'Extract and view all biomarkers',
    'Basic health dashboard',
    'Ask Aellux (5 questions/day)',
  ];

const PRO_FEATURES = [
    'Unlimited document uploads',
    'Full biomarker trend graphs',
    'AI-generated meal protocol',
    'AI-generated supplement stack',
    'AI-generated daily protocol',
    'Unlimited Aellux conversations',
    'Priority Claude Opus analysis',
    'Export your health data',
  ];

type View = 'landing' | 'signup' | 'signin';

export default function AuthPaywall() {
    const { signIn } = useAuth();
    const [view, setView] = useState<View>('landing');
    const [emailFree, setEmailFree] = useState('');
    const [emailPro, setEmailPro] = useState('');
    const [emailSignIn, setEmailSignIn] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [error, setError] = useState('');

  const handleFreeSignup = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!emailFree.trim() || !emailFree.includes('@')) { setError('Enter a valid email.'); return; }
        signIn(emailFree.trim());
  };

  const handleProCheckout = async () => {
        if (!emailPro.trim() || !emailPro.includes('@')) { setError('Enter your email first.'); return; }
        setCheckoutLoading(true); setError('');
        try {
                const res = await fetch('/api/checkout', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: emailPro.trim() }),
                });
                const data = await res.json();
                if (data.url) { window.location.href = data.url; }
                else { setError(data.error || 'Checkout failed. Try again.'); }
        } catch (err: any) { setError(err.message); }
        finally { setCheckoutLoading(false); }
  };

  const handleSignIn = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!emailSignIn.trim() || !emailSignIn.includes('@')) { setError('Enter a valid email.'); return; }
        signIn(emailSignIn.trim());
  };

  const inp: React.CSSProperties = {
        background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,175,138,.25)',
        borderRadius: 4, color: 'rgba(0,220,175,.92)', fontSize: 17, fontFamily: 'inherit',
        padding: '12px 16px', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  return (
        <div style={{ minHeight: '100vh', background: '#020810', fontFamily: '"EB Garamond", Georgia, serif', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
                <div style={{ textAlign: 'center', padding: '72px 24px 48px' }}>
                          <div style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 28px', background: 'radial-gradient(ellipse at 38% 32%, rgba(0,240,185,.92) 0%, rgba(0,180,210,.72) 32%, rgba(0,8,22,.98) 100%)', boxShadow: '0 0 40px rgba(0,210,165,.15)' }} />
                          <div style={{ fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: 'rgba(0,190,152,.55)', marginBottom: 16 }}>Ancient Intelligence. Present Clarity.</div>div>
                          <h1 style={{ fontSize: 52, color: 'rgba(0,215,172,.95)', fontWeight: 400, margin: '0 0 16px', letterSpacing: 1 }}>Aellux</h1>h1>
                          <p style={{ fontSize: 20, color: 'rgba(0,185,150,.7)', maxWidth: 520, margin: '0 auto 12px', lineHeight: 1.75 }}>
                                      Upload your medical records. Aellux reads everything and synthesises your complete biology.
                          </p>p>
                          <p style={{ fontSize: 17, color: 'rgba(0,165,132,.55)', maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.7 }}>
                                      Personalised meals, supplements, and daily protocols. Not templates.
                          </p>p>
                          <button
                                      onClick={() => { setView(v => v === 'signin' ? 'landing' : 'signin'); setError(''); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, color: 'rgba(0,185,150,.6)', textDecoration: 'underline', padding: 0 }}
                                    >
                            {view === 'signin' ? 'Back to plans' : 'Already a member? Sign in'}
                          </button>button>
                </div>div>
        
          {view === 'signin' && (
                  <div style={{ maxWidth: 420, width: '100%', padding: '0 24px 48px' }}>
                            <div style={{ background: 'rgba(0,6,14,.85)', border: '1px solid rgba(0,165,132,.25)', borderRadius: 10, padding: '32px 28px' }}>
                                        <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(0,165,132,.55)', marginBottom: 20 }}>Sign In</div>div>
                                        <p style={{ fontSize: 16, color: 'rgba(0,175,142,.6)', marginBottom: 24, lineHeight: 1.6 }}>
                                                      Enter your email to access your account. Your plan and data load automatically.
                                        </p>p>
                                        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                      <input type="email" value={emailSignIn}
                                                                        onChange={e => { setEmailSignIn(e.target.value); setError(''); }}
                                                                        placeholder="your@email.com" required autoFocus style={inp} />
                                          {error && <div style={{ fontSize: 14, color: 'rgba(255,130,60,.85)' }}>{error}</div>div>}
                                                      <button type="submit" style={{ fontSize: 17, color: 'rgba(0,210,165,.9)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                                      Enter Aellux
                                                      </button>button>
                                        </form>form>
                            </div>div>
                  </div>div>
              )}
        
          {view !== 'signin' && (
                  <div style={{ display: 'flex', gap: 20, padding: '0 24px 48px', maxWidth: 860, width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div style={{ flex: '1 1 340px', background: 'rgba(0,6,14,.85)', border: '1px solid rgba(0,165,132,.18)', borderRadius: 10, padding: '32px 28px' }}>
                                        <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(0,165,132,.55)', marginBottom: 12 }}>Free</div>div>
                                        <div style={{ fontSize: 44, color: 'rgba(0,200,162,.9)', fontWeight: 400, marginBottom: 6 }}>$0</div>div>
                                        <div style={{ fontSize: 15, color: 'rgba(0,155,125,.5)', marginBottom: 28 }}>Forever free</div>div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                                          {FREE_FEATURES.map(f => (
                                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 16, color: 'rgba(0,195,160,.78)' }}>
                                                      <span style={{ color: 'rgba(0,185,150,.6)', marginTop: 1 }}>✓</span>span>{f}
                                    </div>div>
                                  ))}
                                        </div>div>
                                        <div style={{ borderTop: '1px solid rgba(0,165,132,.1)', paddingTop: 24 }}>
                                          {view === 'landing' ? (
                                    <button onClick={() => { setView('signup'); setError(''); }}
                                                        style={{ width: '100%', fontSize: 17, color: 'rgba(0,210,165,.88)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                      Get started free →
                                    </button>button>
                                  ) : (
                                    <form onSubmit={handleFreeSignup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                      <input type="email" value={emailFree}
                                                                            onChange={e => { setEmailFree(e.target.value); setError(''); }}
                                                                            placeholder="your@email.com" required style={inp} />
                                      {error && <div style={{ fontSize: 14, color: 'rgba(255,130,60,.85)' }}>{error}</div>div>}
                                                      <button type="submit" style={{ fontSize: 17, color: 'rgba(0,210,165,.9)', background: 'rgba(0,195,155,.1)', border: '1px solid rgba(0,195,155,.3)', borderRadius: 5, padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
                                                                          Enter Aellux free →
                                                      </button>button>
                                    </form>form>
                                                      )}
                                        </div>div>
                            </div>div>
                  
                            <div style={{ flex: '1 1 340px', background: 'rgba(0,12,22,.9)', border: '1px solid rgba(0,195,155,.35)', borderRadius: 10, padding: '32px 28px', boxShadow: '0 0 40px rgba(0,195,155,.06)', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', background: 'rgba(0,195,155,.15)', border: '1px solid rgba(0,195,155,.35)', color: 'rgba(0,210,165,.9)', padding: '4px 16px', borderRadius: 20 }}>Most powerful</div>div>
                                        <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(0,195,155,.65)', marginBottom: 12 }}>Pro</div>div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                                                      <span style={{ fontSize: 44, color: 'rgba(0,215,172,.96)', fontWeight: 400 }}>$29</span>span>
                                                      <span style={{ fontSize: 16, color: 'rgba(0,175,142,.55)' }}>/month</span>span>
                                        </div>div>
                                        <div style={{ fontSize: 15, color: 'rgba(0,155,125,.5)', marginBottom: 28 }}>Full biological intelligence</div>div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                                          {PRO_FEATURES.map(f => (
                                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 16, color: 'rgba(0,215,172,.88)' }}>
                                                      <span style={{ color: 'rgba(0,210,165,.8)', marginTop: 1 }}>✦</span>span>{f}
                                    </div>div>
                                  ))}
                                        </div>div>
                                        <div style={{ borderTop: '1px solid rgba(0,195,155,.15)', paddingTop: 24 }}>
                                          {view === 'landing' ? (
                                    <button onClick={() => { setView('signup'); setError(''); }}
                                                        style={{ width: '100%', fontSize: 17, color: '#020810', background: 'rgba(0,200,160,.85)', border: 'none', borderRadius: 5, padding: '14px 0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                                                      Start with Pro →
                                    </button>button>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                      <input type="email" value={emailPro}
                                                                            onChange={e => { setEmailPro(e.target.value); setError(''); }}
                                                                            placeholder="your@email.com" style={{ ...inp, border: '1px solid rgba(0,195,155,.3)' }} />
                                      {error && <div style={{ fontSize: 14, color: 'rgba(255,130,60,.85)' }}>{error}</div>div>}
                                                      <button onClick={handleProCheckout} disabled={checkoutLoading}
                                                                            style={{ fontSize: 17, color: '#020810', background: 'rgba(0,200,160,.85)', border: 'none', borderRadius: 5, padding: '14px 0', cursor: checkoutLoading ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                                                        {checkoutLoading ? 'Opening Stripe...' : 'Subscribe with Stripe →'}
                                                      </button>button>
                                                      <div style={{ fontSize: 13, color: 'rgba(0,155,125,.45)', textAlign: 'center' }}>Powered by Stripe · Cancel anytime</div>div>
                                    </div>div>
                                                      )}
                                        </div>div>
                            </div>div>
                  </div>div>
              )}
        
              <div style={{ maxWidth: 800, width: '100%', padding: '0 24px 72px' }}>
                      <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(0,165,132,.5)', textAlign: 'center', marginBottom: 28 }}>What Aellux reads and understands</div>div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                        {[
                      ['🩸', 'Blood Panels', 'CBC, CMP, lipids, hormones, vitamins, minerals, inflammatory markers'],
                      ['📊', 'Wearable Data', 'Apple Health, Garmin, Oura, Whoop — HRV, sleep stages, VO2max'],
                      ['🧬', 'Body Composition', 'DEXA scans — body fat %, lean mass, bone density, visceral fat'],
                      ['😴', 'Sleep Reports', 'Sleep stages, deep sleep, efficiency, disturbances, recovery scores'],
                      ['🦠', 'Microbiome', 'Gut bacteria ratios, diversity scores, pathogen detection'],
                      ['📋', 'Physician Notes', 'Clinical observations, diagnoses, medication effects, history'],
                    ].map(([icon, title, desc]) => (
                                  <div key={String(title)} style={{ background: 'rgba(0,6,14,.7)', border: '1px solid rgba(0,165,132,.1)', borderRadius: 6, padding: '18px 16px' }}>
                                                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>div>
                                                <div style={{ fontSize: 16, color: 'rgba(0,205,165,.85)', marginBottom: 6, fontWeight: 500 }}>{title}</div>div>
                                                <div style={{ fontSize: 14, color: 'rgba(0,155,128,.58)', lineHeight: 1.65 }}>{desc}</div>div>
                                  </div>div>
                                ))}
                      </div>div>
              </div>div>
        </div>div>
      );
}</button>
