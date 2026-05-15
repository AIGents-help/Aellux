aava// @ts-nocheck
import React from 'react';

export default function PrivacyPolicy() {
    return (
          <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
                  <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
                            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 30%, #064e23 0%, #052e16 50%, #0a1a0a 100%)' }} />
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>Aellux</span>span>
                            </a>a>
                            <a href="/" style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none' }}>← Back to Aellux</a>a>
                  </header>header>
                  <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 96px' }}>
                            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>Legal</p>p>
                            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: 16 }}>Privacy Policy</h1>h1>
                            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 56 }}>Effective date: May 15, 2025</p>p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                                        <S title="Overview">
                                                    <P>Aellux is a health intelligence platform by AIGents. This policy explains how we collect, use, and safeguard information at aellux.health.</P>P>
                                                    <Note>We do not sell your health data. Ever.</Note>Note>
                                        </S>S>
                                      <S title="What We Collect">
                                                  <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>{['Email and hashed password','Biological profile (sex, birth year, height, weight, activity)','Health goals and onboarding answers','Uploaded health documents','Questions to the AI engine','Usage data, device info, IP, session tokens, error logs'].map((v,i)=><li key={i} style={{fontSize:15,color:'var(--text-secondary)',lineHeight:1.7}}>{v}</li>li>)}</ul>ul>
                                                  <P>We do not use your health data to train AI models.</P>P>
                                      </S>S>
                                      <S title="Third-Party Services">
                                        {[['Supabase','Database and auth','https://supabase.com/privacy'],['Anthropic','AI analysis (no training data retention)','https://www.anthropic.com/privacy'],['Stripe','Payment processing','https://stripe.com/privacy'],['Resend','Transactional email','https://resend.com/privacy'],['Vercel','Hosting','https://vercel.com/legal/privacy-policy'],['PostHog','Anonymized analytics','https://posthog.com/privacy']].map(([n,d,u],i)=>(
                          <div key={i} style={{padding:'14px 16px',background:'var(--bg-sunken)',border:'1px solid var(--border-subtle)',borderRadius:8,marginBottom:8}}>
                                          <div style={{display:'flex',justifyContent:'space-between',gap:12}}>
                              <div><p style={{fontSize:14,fontWeight:500,color:'var(--text-primary)',marginBottom:4}}>{n}</p>p><p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.6}}>{d}</p>p></div>div>
                                                            <a href={u} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'var(--text-tertiary)',textDecoration:'none',whiteSpace:'nowrap'}}>Privacy </a>a>
                                          </div>div>
                          </div>div>
                        ))}
                                      </S>S>
                                      <S title="Your Rights">
                                                  <P>You may request access, correction, deletion, or export of your data. Contact: <a href="mailto:contact@aigents.help" style={{color:'var(--brand-dim)',textDecoration:'none'}}>contact@aigents.help</a>a>. We respond within 30 days.</P>P>
                                      </S>S>
                                      <S title="Health Disclaimer">
                                                  <Note variant="warning">Aellux provides AI-generated analysis for informational purposes only. Nothing constitutes medical advice. Always consult a qualified healthcare provider before changing your diet, supplements, or health protocols.</Note>Note>
                                      </S>S>
                                      <S title="Contact">
                                                  <div style={{padding:'20px 24px',background:'var(--bg-sunken)',border:'1px solid var(--border-subtle)',borderRadius:8}}>
                                                                <p style={{fontSize:15,fontWeight:500,color:'var(--text-primary)',marginBottom:4}}>AIGents</p>p>
                                                                <p style={{fontSize:15,color:'var(--text-secondary)',lineHeight:1.8}}>Email: <a href="mailto:contact@aigents.help" style={{color:'var(--brand-dim)',textDecoration:'none'}}>contact@aigents.help</a>a></p>p>
                                                  </div>div>
                                      </S>S>
                            </div>div>
                  </main>main>
                <footer style={{borderTop:'1px solid var(--border-subtle)',padding:'24px',textAlign:'center'}}>
                        <p style={{fontSize:13,color:'var(--text-tertiary)'}}>&copy; {new Date().getFullYear()} AIGents &middot; Aellux</p>p>
                </footer>footer>
          </div>div>
        );
}
function S({title,children}){return(<section><h2 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:400,color:'var(--text-primary)',marginBottom:20,paddingBottom:12,borderBottom:'1px solid var(--border-subtle)'}}>{title}</h2>h2><div style={{display:'flex',flexDirection:'column',gap:12}}>{children}</div>div></section>section>);}
function P({children}){return <p style={{fontSize:15,color:'var(--text-secondary)',lineHeight:1.75}}>{children}</p>p>;}
function Note({children,variant='info'}){return(<div style={{padding:'16px 18px',background:variant==='warning'?'rgba(120,53,15,.06)':'var(--brand-ghost)',border:`1px solid ${variant==='warning'?'rgba(120,53,15,.2)':'var(--brand-border)'}`,borderRadius:8,borderLeft:`3px solid ${variant==='warning'?'#78350f':'var(--brand-dim)'}`}}><p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.75}}>{children}</p>p></div>div>);}</S>
