// @ts-nocheck
import React, { useState } from 'react';

interface Props { userId?: string; isPro?: boolean; }

export default function PractitionerShare({ userId, isPro }: Props) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [label, setLabel] = useState('My Practitioner');
  const [expiry, setExpiry] = useState(30);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const create = async () => {
    if (!userId) return;
    setCreating(true);
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, label, expiryDays: expiry }),
    });
    const data = await res.json();
    if (data.shareUrl) setShareUrl(data.shareUrl);
    setCreating(false);
  };

  const copy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (!isPro) {
    return (
      <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8 }}>
        <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Practitioner Share</div>
        <p style={{ fontSize: 14, color: 'rgba(0,210,165,.6)', lineHeight: 1.65, margin: '0 0 10px' }}>
          Share a read-only view of your biomarkers and protocol with your doctor, trainer, or functional medicine practitioner. Available on Pro.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 18px', background: 'rgba(0,8,18,.5)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 16 : 0 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Practitioner Share</div>
          <div style={{ fontSize: 13, color: 'rgba(0,210,165,.5)' }}>Read-only link for your doctor, trainer, or coach</div>
        </div>
        <button onClick={() => setOpen(!open)}
          style={{ fontSize: 13, padding: '7px 14px', background: 'rgba(0,210,165,.08)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 5, color: 'rgba(0,225,180,.85)', cursor: 'pointer', fontFamily: 'inherit' }}>
          {open ? 'Close' : 'Create link →'}
        </button>
      </div>

      {open && (
        <div>
          {!shareUrl ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', display: 'block', marginBottom: 4 }}>Label (for your reference)</label>
                  <input value={label} onChange={e => setLabel(e.target.value)}
                    style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 5, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', display: 'block', marginBottom: 4 }}>Expires after</label>
                  <select value={expiry} onChange={e => setExpiry(parseInt(e.target.value))}
                    style={{ width: '100%', fontSize: 14, padding: '9px 12px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.25)', borderRadius: 5, color: 'rgba(220,255,235,.9)', fontFamily: 'inherit' }}>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 6, fontSize: 13, color: 'rgba(0,210,165,.65)', lineHeight: 1.6, marginBottom: 14 }}>
                Your practitioner will see your biomarker timeline, protocol structure, and supplement log. They cannot see your login credentials, payment info, or personal contact details.
              </div>
              <button onClick={create} disabled={creating}
                style={{ fontSize: 14, color: 'rgba(0,20,14,1)', background: 'rgba(0,225,180,.9)', border: 'none', borderRadius: 5, padding: '10px 22px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {creating ? 'Creating…' : 'Generate share link →'}
              </button>
            </>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: 'rgba(52,211,153,.8)', marginBottom: 10 }}>✓ Share link created — expires in {expiry} days</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 5, fontSize: 13, color: 'rgba(0,225,180,.75)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shareUrl}
                </div>
                <button onClick={copy}
                  style={{ flexShrink: 0, fontSize: 14, padding: '10px 16px', background: copied ? 'rgba(52,211,153,.15)' : 'rgba(0,210,165,.08)', border: `1px solid ${copied ? 'rgba(52,211,153,.5)' : 'rgba(0,210,165,.25)'}`, borderRadius: 5, color: copied ? '#34d399' : 'rgba(0,225,180,.85)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <button onClick={() => { setShareUrl(null); setOpen(false); }} style={{ marginTop: 10, fontSize: 13, color: 'rgba(0,210,165,.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Create another link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
