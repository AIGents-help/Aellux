import React, { useState } from 'react';
import { useAuth } from './useAuth';

export default function AuthPaywall() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'idle'|'entered'>('idle');

  const handleEnter = () => {
    if (!email.trim()) return;
    signIn(email.trim());
  };

  return (
    <div style={{
      height: '100vh', background: '#020810',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 32,
      fontFamily: '"EB Garamond", Georgia, serif',
    }}>
      {/* Minimal orb indicator */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 40% 35%, rgba(0,220,170,0.9) 0%, rgba(0,160,200,0.6) 35%, rgba(0,8,22,0.98) 100%)',
        boxShadow: '0 0 28px rgba(0,210,165,0.15)',
      }} />

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: 'rgba(0,210,165,0.85)', fontSize: 26, fontWeight: 400, marginBottom: 8, letterSpacing: 2 }}>
          Aellux
        </h1>
        <p style={{ color: 'rgba(0,160,130,0.45)', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' }}>
          Ancient Intelligence. Present Clarity.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 260 }}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleEnter()}
          style={{
            background: 'rgba(0,12,24,0.7)',
            border: '0.5px solid rgba(0,175,138,0.2)',
            borderRadius: 3, color: 'rgba(0,205,162,0.85)',
            fontSize: 13, fontFamily: 'inherit',
            padding: '10px 14px', outline: 'none',
            letterSpacing: '0.5px',
          }}
        />
        <button
          onClick={handleEnter}
          style={{
            background: 'rgba(0,195,155,0.1)',
            border: '0.5px solid rgba(0,195,155,0.3)',
            borderRadius: 3, color: 'rgba(0,210,165,0.85)',
            fontSize: 11, fontFamily: 'inherit',
            letterSpacing: 3, textTransform: 'uppercase',
            padding: '10px 14px', cursor: 'pointer',
          }}
        >
          Enter
        </button>
      </div>

      <p style={{ color: 'rgba(0,120,100,0.3)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
        Free during beta
      </p>
    </div>
  );
}
