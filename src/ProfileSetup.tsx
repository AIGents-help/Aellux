import React, { useState } from 'react';

interface Props {
  initial?: any;
  onSave: (profile: any) => Promise<void> | void;
  onSkip?: () => void;
  forceFull?: boolean; // if true, skip cannot dismiss
}

const fieldStyle = {
  width: '100%',
  background: 'rgba(0,8,18,.7)',
  border: '1px solid rgba(0,210,165,.25)',
  borderRadius: 5,
  color: 'rgba(220,255,235,.95)',
  fontSize: 15,
  fontFamily: 'inherit',
  padding: '10px 14px',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'rgba(0,210,165,.65)',
  marginBottom: 6,
  display: 'block',
};

export default function ProfileSetup({ initial, onSave, onSkip, forceFull = false }: Props) {
  const [sex, setSex] = useState<string>(initial?.biological_sex || '');
  const [birthYear, setBirthYear] = useState<string>(initial?.birth_year ? String(initial.birth_year) : '');
  const [height, setHeight] = useState<string>(initial?.height_cm ? String(initial.height_cm) : '');
  const [weight, setWeight] = useState<string>(initial?.weight_kg ? String(initial.weight_kg) : '');
  const [pregnancy, setPregnancy] = useState<string>(initial?.pregnancy_status || 'none');
  const [menstrual, setMenstrual] = useState<string>(initial?.menstrual_status || 'cycling');
  const [units, setUnits] = useState<'metric' | 'imperial'>('imperial');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Imperial conversions
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [lbs, setLbs] = useState('');

  // Initialize imperial from metric on mount
  React.useEffect(() => {
    if (initial?.height_cm) {
      const totalIn = initial.height_cm / 2.54;
      setFeet(String(Math.floor(totalIn / 12)));
      setInches(String(Math.round(totalIn % 12)));
    }
    if (initial?.weight_kg) setLbs(String(Math.round(initial.weight_kg * 2.20462)));
  }, []);

  function getHeightCm(): number | null {
    if (units === 'metric') {
      const n = parseFloat(height);
      return Number.isFinite(n) ? n : null;
    }
    const f = parseFloat(feet), i = parseFloat(inches || '0');
    if (!Number.isFinite(f)) return null;
    return Math.round(((f * 12) + (Number.isFinite(i) ? i : 0)) * 2.54 * 10) / 10;
  }
  function getWeightKg(): number | null {
    if (units === 'metric') {
      const n = parseFloat(weight);
      return Number.isFinite(n) ? n : null;
    }
    const n = parseFloat(lbs);
    return Number.isFinite(n) ? Math.round((n / 2.20462) * 10) / 10 : null;
  }

  async function handleSave() {
    setError(null);
    if (!sex) { setError('Biological sex is required so Aellux can apply correct reference ranges.'); return; }
    const yr = parseInt(birthYear, 10);
    if (!Number.isFinite(yr) || yr < 1920 || yr > new Date().getFullYear() - 10) {
      setError('Please enter a valid birth year.');
      return;
    }
    const hcm = getHeightCm();
    const wkg = getWeightKg();
    if (!hcm) { setError('Height is required.'); return; }
    if (!wkg) { setError('Weight is required.'); return; }

    setSaving(true);
    try {
      const patch: any = {
        biological_sex: sex,
        birth_year: yr,
        height_cm: hcm,
        weight_kg: wkg,
      };
      if (sex === 'female') {
        patch.pregnancy_status = pregnancy;
        patch.menstrual_status = menstrual;
      } else {
        patch.pregnancy_status = 'not_applicable';
        patch.menstrual_status = 'not_applicable';
      }
      await onSave(patch);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,10,20,0.92)', backdropFilter: 'blur(8px)', padding: 16 }}>
      <div style={{ background: 'rgba(2,12,22,0.98)', border: '1px solid rgba(0,225,180,.3)', borderRadius: 12, padding: '30px 34px', maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, color: 'rgba(0,225,180,.7)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Aellux needs context</div>
        <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 26, color: 'rgba(220,255,235,1)', margin: '0 0 8px', fontWeight: 500 }}>Tell me about you</h2>
        <p style={{ fontSize: 14, color: 'rgba(0,210,165,.78)', lineHeight: 1.65, margin: '0 0 24px' }}>
          Your biological context dramatically changes how I interpret your biomarkers. Reference ranges, supplement doses, calorie targets, and training periodization all shift based on these factors. Required once, used everywhere.
        </p>

        {/* Biological sex */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Biological sex *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { val: 'male', label: 'Male' },
              { val: 'female', label: 'Female' },
              { val: 'intersex', label: 'Intersex' },
            ].map(o => (
              <button key={o.val} type="button" onClick={() => setSex(o.val)}
                style={{ flex: 1, padding: '10px 14px', background: sex === o.val ? 'rgba(0,225,180,.14)' : 'rgba(0,8,18,.5)', border: `1px solid ${sex === o.val ? 'rgba(0,225,180,.6)' : 'rgba(0,210,165,.2)'}`, borderRadius: 5, color: sex === o.val ? 'rgba(0,255,200,1)' : 'rgba(0,210,165,.7)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.04em' }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Birth year */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Birth year *</label>
          <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1985" style={fieldStyle} />
        </div>

        {/* Units toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, justifyContent: 'flex-end' }}>
          {(['imperial', 'metric'] as const).map(u => (
            <button key={u} type="button" onClick={() => setUnits(u)}
              style={{ fontSize: 11, padding: '4px 10px', background: units === u ? 'rgba(0,210,165,.14)' : 'transparent', border: `1px solid ${units === u ? 'rgba(0,210,165,.5)' : 'rgba(0,210,165,.18)'}`, borderRadius: 12, color: units === u ? 'rgba(0,225,180,.95)' : 'rgba(0,210,165,.5)', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {u}
            </button>
          ))}
        </div>

        {/* Height */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Height *</label>
          {units === 'metric' ? (
            <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="cm" style={fieldStyle} />
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={feet} onChange={e => setFeet(e.target.value)} placeholder="ft" style={fieldStyle} />
              <input type="number" value={inches} onChange={e => setInches(e.target.value)} placeholder="in" style={fieldStyle} />
            </div>
          )}
        </div>

        {/* Weight */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Weight *</label>
          {units === 'metric' ? (
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="kg" style={fieldStyle} />
          ) : (
            <input type="number" value={lbs} onChange={e => setLbs(e.target.value)} placeholder="lbs" style={fieldStyle} />
          )}
        </div>

        {/* Conditional female-specific fields */}
        {sex === 'female' && (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Cycle / menstrual status</label>
              <select value={menstrual} onChange={e => setMenstrual(e.target.value)} style={fieldStyle}>
                <option value="cycling">Cycling regularly</option>
                <option value="irregular">Irregular cycles</option>
                <option value="hormonal_bc">On hormonal birth control</option>
                <option value="perimenopausal">Perimenopausal</option>
                <option value="postmenopausal">Postmenopausal</option>
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Pregnancy status</label>
              <select value={pregnancy} onChange={e => setPregnancy(e.target.value)} style={fieldStyle}>
                <option value="none">Not pregnant / breastfeeding</option>
                <option value="trying">Trying to conceive</option>
                <option value="pregnant">Pregnant</option>
                <option value="breastfeeding">Breastfeeding</option>
              </select>
            </div>
          </>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 5, color: 'rgba(255,200,180,1)', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, fontSize: 15, color: 'rgba(0,255,200,1)', background: 'rgba(0,195,155,.16)', border: '1px solid rgba(0,225,180,.55)', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>
            {saving ? 'Saving…' : 'Save & continue →'}
          </button>
          {!forceFull && onSkip && (
            <button onClick={onSkip} disabled={saving}
              style={{ fontSize: 13, color: 'rgba(0,180,140,.55)', background: 'none', border: '1px solid rgba(0,180,140,.2)', borderRadius: 5, padding: '12px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Skip for now
            </button>
          )}
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: 'rgba(0,210,165,.4)', lineHeight: 1.6 }}>
          You can add medications, conditions, and detailed health context later via Profile & Settings. Your data is stored privately and used only to personalise your Aellux experience.
        </div>
      </div>
    </div>
  );
}
