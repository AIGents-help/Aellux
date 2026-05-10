import React from 'react';

interface Props {
  user: any;
  isPro: boolean;
  signOut: () => void;
  documents: any[];
  personalised: any;
  setPanel: (panel: any) => void;
}

export default function ProfilePage({ user, isPro, signOut, documents, personalised, setPanel }: Props) {
  return (
    <div style={{ padding: '32px 28px', maxWidth: 680, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 26, color: 'rgba(0,210,165,.9)', fontWeight: 400, letterSpacing: '0.04em', marginBottom: 6, marginTop: 0 }}>Profile &amp; Settings</h2>
      <p style={{ color: 'rgba(0,210,165,.45)', fontSize: 13, letterSpacing: '0.06em', marginBottom: 32, marginTop: 0 }}>YOUR ACCOUNT</p>

      <div style={{ background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 10, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: 'rgba(0,210,165,.5)', letterSpacing: '0.1em', marginBottom: 16, textTransform: 'uppercase' as const }}>Account</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)', flexShrink: 0 }} />
          <div>
            <div style={{ color: 'rgba(0,210,165,.9)', fontSize: 16, fontFamily: 'Georgia,serif', marginBottom: 4 }}>{user?.email || 'Not signed in'}</div>
            <div style={{ display: 'inline-block', background: isPro ? 'rgba(0,210,165,.15)' : 'rgba(0,210,165,.06)', border: `1px solid ${isPro ? 'rgba(0,210,165,.4)' : 'rgba(0,210,165,.15)'}`, borderRadius: 20, padding: '2px 12px', fontSize: 11, color: isPro ? 'rgba(0,210,165,.9)' : 'rgba(0,210,165,.45)', letterSpacing: '0.1em' }}>
              {isPro ? '✦ PRO' : 'FREE'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 10, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: 'rgba(0,210,165,.5)', letterSpacing: '0.1em', marginBottom: 16, textTransform: 'uppercase' as const }}>Plan</div>
        {isPro ? (
          <div>
            <div style={{ color: 'rgba(0,210,165,.85)', fontSize: 15, marginBottom: 8 }}>Aellux Pro — $29/month</div>
            <div style={{ color: 'rgba(0,210,165,.6)', fontSize: 13, lineHeight: 1.6 }}>Unlimited documents · Unlimited questions · Full biomarker analysis · All protocols</div>
          </div>
        ) : (
          <div>
            <div style={{ color: 'rgba(0,210,165,.85)', fontSize: 15, marginBottom: 8 }}>Free Plan</div>
            <div style={{ color: 'rgba(0,210,165,.6)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>3 documents · 5 questions/day · Basic dashboard</div>
            <div style={{ color: 'rgba(0,210,165,.5)', fontSize: 12 }}>Use the Upgrade button in the sidebar to upgrade to Pro.</div>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(0,210,165,.05)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 10, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: 'rgba(0,210,165,.5)', letterSpacing: '0.1em', marginBottom: 16, textTransform: 'uppercase' as const }}>Health Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Biomarkers', value: Object.keys(personalised || {}).length },
            { label: 'Documents', value: documents.length },
            { label: 'Status', value: 'Active' }
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.1)', borderRadius: 8, padding: '16px 8px' }}>
              <div style={{ color: 'rgba(0,210,165,.9)', fontSize: 22, fontFamily: 'Georgia,serif', marginBottom: 4 }}>{value}</div>
              <div style={{ color: 'rgba(0,210,165,.4)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={signOut} style={{ width: '100%', background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.2)', color: 'rgba(255,100,100,.85)', borderRadius: 8, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: '0.06em' }}>
        &#10554; Sign Out
      </button>
    </div>
  );
}
