import React, { useState } from 'react';
import { useAuth } from './useAuth';

const FREE = ['Upload up to 3 health documents','Extract and view all biomarkers','Basic health dashboard','Ask Aellux (5 questions/day)'];
const PRO = ['Unlimited document uploads','Full biomarker trend graphs','AI-generated meal protocol','AI-generated supplement stack','AI-generated daily protocol','Unlimited Aellux conversations','Priority Claude Opus analysis','Export your health data'];

const inp: React.CSSProperties = {background:'rgba(0,8,18,.9)',border:'1.5px solid rgba(0,200,160,.4)',borderRadius:6,color:'#e0fff8',fontSize:18,fontFamily:'inherit',padding:'14px 18px',outline:'none',width:'100%',boxSizing:'border-box'};
const btn: React.CSSProperties = {fontSize:18,fontFamily:'inherit',fontWeight:600,borderRadius:6,padding:'15px 0',cursor:'pointer',width:'100%',border:'none'};

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
                        const r = await fetch('/api/checkout', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: emailPro.trim() }) });
                        const d = await r.json();
                        if (d.url) window.location.href = d.url; else setError(d.error || 'Checkout failed.');
              } catch (e: any) { setError(e.message); } finally { setLoading(false); }
      };

  const wrap = { minHeight:'100vh', background:'#030d14', fontFamily:'"EB Garamond",Georgia,serif', display:'flex', flexDirection:'column' as const, alignItems:'center', overflowY:'auto' as const };

  return (
          <div style={wrap}>
                    <div style={{textAlign:'center',padding:'64px 24px 40px',maxWidth:640,width:'100%'}}>
                                <div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 24px',background:'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)',boxShadow:'0 0 48px rgba(0,210,165,.2)'}} />
                                <div style={{fontSize:12,letterSpacing:6,textTransform:'uppercase',color:'rgba(0,210,165,.65)',marginBottom:12,fontWeight:600}}>Ancient Intelligence. Present Clarity.</div>div>
                                <h1 style={{fontSize:58,color:'#a8ffe8',fontWeight:500,margin:'0 0 20px'}}>Aellux</h1>h1>
                                <p style={{fontSize:20,color:'#8ae8d0',maxWidth:500,margin:'0 auto 12px',lineHeight:1.7}}>Upload your medical records. Aellux reads everything and synthesises your complete biology.</p>p>
                                <p style={{fontSize:17,color:'rgba(120,220,190,.7)',maxWidth:420,margin:'0 auto 28px',lineHeight:1.65}}>Personalised meals, supplements, and daily protocols. Not templates.</p>p>
                                <button onClick={() => { setView(view === 'signin' ? 'landing' : 'signin'); setError(''); }} style={{background:'rgba(0,200,160,.15)',border:'1.5px solid rgba(0,200,160,.4)',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontSize:16,color:'#7de8cc',padding:'11px 28px',fontWeight:600}}>
                                    {view === 'signin' ? 'Back to plans' : 'Already a member? Sign in'}
                                </button>button>
                    </div>div>

              {view === 'signin' && (
                      <div style={{maxWidth:440,width:'100%',padding:'0 24px 48px'}}>
                                    <div style={{background:'rgba(0,18,30,.9)',border:'1.5px solid rgba(0,180,140,.3)',borderRadius:12,padding:'36px 32px'}}>
                                                    <div style={{fontSize:13,letterSpacing:4,textTransform:'uppercase',color:'rgba(0,200,160,.7)',marginBottom:8,fontWeight:700}}>Member Sign In</div>div>
                                                    <p style={{fontSize:18,color:'#8ae8d0',marginBottom:28,lineHeight:1.6}}>Enter your email. Your plan and data load automatically.</p>p>
                                                    <form onSubmit={doSignIn} style={{display:'flex',flexDirection:'column',gap:14}}>
                                                           
