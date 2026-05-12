import React, { useEffect, useState } from 'react';

interface Props {
  user: any;
  isPro: boolean;
  signOut: () => void;
  documents: any[];
  personalised: any;
  setPanel: (panel: any) => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,8,18,.7)',
  border: '1px solid rgba(0,210,165,.22)',
  borderRadius: 5,
  color: 'rgba(220,255,235,.95)',
  fontSize: 14,
  fontFamily: 'inherit',
  padding: '9px 12px',
  outline: 'none',
};
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'rgba(0,210,165,.6)',
  marginBottom: 5,
  display: 'block',
};

const ACTIVITY_OPTIONS = [
  { val: 'sedentary', label: 'Sedentary (desk job, no exercise)' },
  { val: 'light',     label: 'Light (walking, casual yoga)' },
  { val: 'moderate',  label: 'Moderate (3-4 workouts/week)' },
  { val: 'active',    label: 'Active (5+ workouts/week)' },
  { val: 'athlete',   label: 'Athlete (training daily, competing)' },
];

const GOAL_OPTIONS = [
  { val: 'longevity',       label: 'Longevity & healthspan' },
  { val: 'fat_loss',        label: 'Fat loss / body recomp' },
  { val: 'muscle_gain',     label: 'Build muscle / strength' },
  { val: 'energy',          label: 'More energy / less fatigue' },
  { val: 'cognition',       label: 'Cognitive performance' },
  { val: 'hormonal_balance',label: 'Hormonal balance' },
  { val: 'cardiovascular',  label: 'Cardiovascular health' },
  { val: 'fertility',       label: 'Fertility / reproductive health' },
  { val: 'inflammation',    label: 'Reduce inflammation' },
];

function ChipInput({ label, values, onChange, placeholder, helpText }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; helpText?: string }) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) { setDraft(''); return; }
    onChange([...values, v]);
    setDraft('');
  }
  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {helpText && <div style={{ fontSize: 11, color: 'rgba(0,210,165,.55)', marginBottom: 6, lineHeight: 1.5 }}>{helpText}</div>}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ ...fieldStyle, flex: 1 }}
        />
        <button type="button" onClick={add} style={{ fontSize: 13, color: 'rgba(0,225,180,.95)', background: 'rgba(0,195,155,.14)', border: '1px solid rgba(0,225,180,.45)', borderRadius: 5, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>Add</button>
      </div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {values.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 8px 4px 10px', background: 'rgba(0,210,165,.08)', border: '1px solid rgba(0,210,165,.22)', borderRadius: 14, color: 'rgba(220,255,235,.9)' }}>
              {v}
              <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'rgba(0,210,165,.5)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({ user, isPro, signOut, documents, personalised, setPanel }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetch(`/api/profile?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { setProfile(d.profile || {}); setLoading(false); })
      .catch(() => { setProfile({}); setLoading(false); });
  }, [user?.id]);

  function update<K extends string>(key: K, value: any) {
    setProfile((p: any) => ({ ...(p || {}), [key]: value }));
  }

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true); setSaveStatus(null);
    try {
      const res = await fetch(`/api/profile?userId=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSaveStatus(`Save failed: ${data.error || res.status}`);
      } else {
        setProfile(data.profile);
        setSaveStatus('Saved ✓');
        setTimeout(() => setSaveStatus(null), 2500);
      }
    } catch (e: any) {
      setSaveStatus(`Save failed: ${e?.message || 'network error'}`);
    }
    setSaving(false);
  }

  const isFemale = profile?.biological_sex === 'female';
  const hasMeds = profile?.medications && profile.medications.length > 0;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 28, color: 'rgba(220,255,235,1)', fontWeight: 500, marginBottom: 6, marginTop: 0 }}>Profile &amp; Settings</h2>
      <p style={{ color: 'rgba(0,210,165,.55)', fontSize: 12, letterSpacing: '0.1em', marginBottom: 28, marginTop: 0, textTransform: 'uppercase' }}>Your account &amp; biological context</p>

      {/* Account */}
      <div style={{ background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 8, padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 12, color: 'rgba(0,210,165,.55)', letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>Account</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%,rgba(0,240,185,.95) 0%,rgba(0,180,210,.75) 35%,rgba(0,8,22,.99) 100%)', flexShrink: 0 }} />
          <div>
            <div style={{ color: 'rgba(220,255,235,.95)', fontSize: 16, fontFamily: 'EB Garamond, Georgia, serif', marginBottom: 4 }}>{user?.email || 'Not signed in'}</div>
            <div style={{ display: 'inline-block', background: isPro ? 'rgba(0,225,180,.14)' : 'rgba(0,210,165,.06)', border: `1px solid ${isPro ? 'rgba(0,225,180,.45)' : 'rgba(0,210,165,.18)'}`, borderRadius: 12, padding: '2px 10px', fontSize: 10, color: isPro ? 'rgba(0,255,200,1)' : 'rgba(0,210,165,.55)', letterSpacing: '0.12em' }}>
              {isPro ? '✦ PRO' : 'FREE'}
            </div>
          </div>
        </div>
      </div>

      {/* HEALTH PROFILE */}
      <div style={{ background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.18)', borderRadius: 8, padding: '22px 26px', marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 12, color: 'rgba(0,225,180,.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Health Profile</div>
          {saveStatus && <div style={{ fontSize: 11, color: saveStatus.startsWith('Saved') ? 'rgba(0,255,200,.9)' : 'rgba(255,160,100,.9)', letterSpacing: '0.06em' }}>{saveStatus}</div>}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', lineHeight: 1.6, margin: '0 0 18px' }}>
          The more context you give Aellux, the more accurate your protocols. Required fields shape every recommendation. Medications are checked for interactions with any supplement Aellux recommends.
        </p>

        {loading ? (
          <div style={{ padding: '20px 0', color: 'rgba(0,210,165,.55)', fontSize: 13 }}>Loading profile…</div>
        ) : (
          <>
            {/* Tier 1: essentials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Biological sex *</label>
                <select value={profile?.biological_sex || ''} onChange={e => update('biological_sex', e.target.value)} style={fieldStyle}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="intersex">Intersex</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Birth year *</label>
                <input type="number" value={profile?.birth_year || ''} onChange={e => update('birth_year', e.target.value ? parseInt(e.target.value, 10) : null)} placeholder="1985" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Height (cm) *</label>
                <input type="number" step="0.1" value={profile?.height_cm || ''} onChange={e => update('height_cm', e.target.value ? parseFloat(e.target.value) : null)} placeholder="175" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weight (kg) *</label>
                <input type="number" step="0.1" value={profile?.weight_kg || ''} onChange={e => update('weight_kg', e.target.value ? parseFloat(e.target.value) : null)} placeholder="72" style={fieldStyle} />
              </div>
            </div>

            {/* Female-specific */}
            {isFemale && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Menstrual status</label>
                  <select value={profile?.menstrual_status || 'cycling'} onChange={e => update('menstrual_status', e.target.value)} style={fieldStyle}>
                    <option value="cycling">Cycling regularly</option>
                    <option value="irregular">Irregular cycles</option>
                    <option value="hormonal_bc">Hormonal birth control</option>
                    <option value="perimenopausal">Perimenopausal</option>
                    <option value="postmenopausal">Postmenopausal</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Pregnancy status</label>
                  <select value={profile?.pregnancy_status || 'none'} onChange={e => update('pregnancy_status', e.target.value)} style={fieldStyle}>
                    <option value="none">Not pregnant / breastfeeding</option>
                    <option value="trying">Trying to conceive</option>
                    <option value="pregnant">Pregnant</option>
                    <option value="breastfeeding">Breastfeeding</option>
                  </select>
                </div>
              </div>
            )}

            {/* Activity + Goal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Activity level</label>
                <select value={profile?.activity_level || ''} onChange={e => update('activity_level', e.target.value)} style={fieldStyle}>
                  <option value="">—</option>
                  {ACTIVITY_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Primary goal</label>
                <select value={profile?.goal || ''} onChange={e => update('goal', e.target.value)} style={fieldStyle}>
                  <option value="">—</option>
                  {GOAL_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Tier 2 chips */}
            <ChipInput
              label="Known conditions / diagnoses"
              values={profile?.conditions || []}
              onChange={v => update('conditions', v)}
              placeholder="e.g. Hashimoto's, PCOS, Type 2 diabetes"
              helpText="Aellux adjusts recommendations for these conditions."
            />

            <ChipInput
              label="Current medications"
              values={profile?.medications || []}
              onChange={v => update('medications', v)}
              placeholder="e.g. levothyroxine 75mcg, metformin 500mg"
              helpText="Including drug + dose lets Aellux check supplements and foods for known interactions. Required field for clinical safety."
            />

            <ChipInput
              label="Allergies"
              values={profile?.allergies || []}
              onChange={v => update('allergies', v)}
              placeholder="e.g. peanuts, shellfish, penicillin"
            />

            <ChipInput
              label="Dietary restrictions"
              values={profile?.dietary_restrictions || []}
              onChange={v => update('dietary_restrictions', v)}
              placeholder="e.g. vegetarian, halal, kosher, gluten-free"
            />

            {hasMeds && (
              <div style={{ marginTop: 8, marginBottom: 16, padding: '10px 14px', background: 'rgba(255,200,80,.06)', border: '1px solid rgba(255,200,80,.3)', borderRadius: 5 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,210,100,.9)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>⚠ Medication interaction safety</div>
                <p style={{ fontSize: 12, color: 'rgba(220,255,235,.78)', lineHeight: 1.55, margin: 0 }}>
                  Aellux will flag known interactions between your medications and any recommended supplement, food, or protocol. This is not a substitute for clinical pharmacist review. <strong style={{ color: 'rgba(255,210,100,.9)' }}>Always clear new supplements or significant dietary changes with your prescribing physician.</strong>
                </p>
              </div>
            )}

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', marginTop: 14, fontSize: 14, color: 'rgba(0,255,200,1)', background: 'rgba(0,195,155,.16)', border: '1px solid rgba(0,225,180,.55)', borderRadius: 5, padding: '11px 0', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em' }}>
              {saving ? 'Saving…' : 'Save health profile'}
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div style={{ background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 8, padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 12, color: 'rgba(0,210,165,.55)', letterSpacing: '0.1em', marginBottom: 14, textTransform: 'uppercase' }}>Activity</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Documents', value: documents.length },
            { label: 'Protocols generated', value: Object.keys(personalised || {}).length },
            { label: 'Status', value: 'Active' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.1)', borderRadius: 6, padding: '14px 8px' }}>
              <div style={{ color: 'rgba(220,255,235,.95)', fontSize: 22, fontFamily: 'EB Garamond, Georgia, serif', marginBottom: 4 }}>{value}</div>
              <div style={{ color: 'rgba(0,210,165,.5)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={signOut} style={{ width: '100%', background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.22)', color: 'rgba(255,120,120,.9)', borderRadius: 6, padding: '12px 0', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em' }}>
        ⤺ Sign Out
      </button>
    </div>
  );
}
