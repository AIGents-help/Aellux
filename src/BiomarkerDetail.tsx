import React, { useEffect, useState } from 'react';

// ── Reference ranges ─────────────────────────────────────────────────────────
// low/high = lab reference range  |  optLow/optHigh = functional optimal
const REF: Record<string, { low: number; high: number; optLow?: number; optHigh?: number }> = {
  'Total Testosterone': { low: 250, high: 900, optLow: 500, optHigh: 800 },
  'Free Testosterone':  { low: 46,  high: 224, optLow: 100, optHigh: 180 },
  'Estrogen':           { low: 15,  high: 32,  optLow: 18,  optHigh: 28 },
  'SHBG':               { low: 10,  high: 57,  optLow: 20,  optHigh: 45 },
  'Free T3':            { low: 2.3, high: 4.4, optLow: 3.0, optHigh: 4.0 },
  'Ferritin':           { low: 30,  high: 300, optLow: 70,  optHigh: 150 },
  'Vitamin D':          { low: 20,  high: 80,  optLow: 40,  optHigh: 70 },
  'ApoB':               { low: 40,  high: 120, optLow: 40,  optHigh: 80 },
  'LDL':                { low: 0,   high: 160, optLow: 0,   optHigh: 100 },
  'HDL':                { low: 40,  high: 100, optLow: 55,  optHigh: 100 },
  'Triglycerides':      { low: 0,   high: 200, optLow: 0,   optHigh: 100 },
  'HbA1c':              { low: 4.5, high: 6.5, optLow: 4.5, optHigh: 5.4 },
  'Fasting Glucose':    { low: 70,  high: 126, optLow: 72,  optHigh: 95 },
  'CRP':                { low: 0,   high: 10,  optLow: 0,   optHigh: 1.0 },
  'Cortisol':           { low: 6,   high: 23,  optLow: 8,   optHigh: 18 },
  'TSH':                { low: 0.4, high: 4.0, optLow: 0.5, optHigh: 2.5 },
  'IGF-1':              { low: 100, high: 300, optLow: 150, optHigh: 250 },
  'DHEA-S':             { low: 70,  high: 430, optLow: 150, optHigh: 350 },
};

// ── Range bar component ───────────────────────────────────────────────────────
function RangeBar({ value, markerName, unit, compact = false }: { value: number; markerName: string; unit?: string; compact?: boolean }) {
  const ref = REF[markerName];
  if (!ref || isNaN(value)) return null;

  // Extend display range 15% beyond lab limits so the bar has breathing room
  const padding = (ref.high - ref.low) * 0.15;
  const displayMin = Math.max(0, ref.low - padding);
  const displayMax = ref.high + padding;
  const span = displayMax - displayMin;

  const pct = (v: number) => Math.min(100, Math.max(0, ((v - displayMin) / span) * 100));
  const valuePct = pct(value);
  const lowPct = pct(ref.low);
  const highPct = pct(ref.high);
  const optLowPct = ref.optLow != null ? pct(ref.optLow) : lowPct;
  const optHighPct = ref.optHigh != null ? pct(ref.optHigh) : highPct;

  const statusColor = value < ref.low ? '#fb923c'
    : value > ref.high ? '#f87171'
    : (ref.optLow != null && value < ref.optLow) || (ref.optHigh != null && value > ref.optHigh)
      ? '#f59e0b'
      : '#34d399';

  const h = compact ? 8 : 10;

  return (
    <div style={{ marginTop: compact ? 8 : 14 }}>
      <div style={{ position: 'relative', height: h, borderRadius: h, background: 'rgba(0,210,165,.08)', overflow: 'visible' }}>
        {/* Full lab range background */}
        <div style={{
          position: 'absolute', top: 0, height: '100%', borderRadius: h,
          left: `${lowPct}%`, width: `${highPct - lowPct}%`,
          background: 'rgba(0,210,165,.15)',
        }} />
        {/* Optimal zone */}
        {ref.optLow != null && (
          <div style={{
            position: 'absolute', top: 0, height: '100%',
            left: `${optLowPct}%`, width: `${optHighPct - optLowPct}%`,
            background: 'rgba(52,211,153,.25)',
          }} />
        )}
        {/* Value marker */}
        <div style={{
          position: 'absolute', top: '50%',
          left: `${valuePct}%`,
          transform: 'translate(-50%, -50%)',
          width: compact ? 12 : 16, height: compact ? 12 : 16,
          borderRadius: '50%',
          background: statusColor,
          border: `2px solid rgba(2,12,22,1)`,
          boxShadow: `0 0 8px ${statusColor}88`,
          zIndex: 2,
        }} />
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: compact ? 4 : 6 }}>
        <span style={{ fontSize: compact ? 11 : 12, color: 'rgba(0,210,165,.5)' }}>
          Low {ref.low}{unit ? ` ${unit}` : ''}
        </span>
        {ref.optLow != null && !compact && (
          <span style={{ fontSize: 11, color: 'rgba(52,211,153,.6)' }}>
            Optimal {ref.optLow}–{ref.optHigh}{unit ? ` ${unit}` : ''}
          </span>
        )}
        <span style={{ fontSize: compact ? 11 : 12, color: 'rgba(0,210,165,.5)' }}>
          High {ref.high}{unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  );
}

// ── Sparkline with range bar ──────────────────────────────────────────────────
function TrendLine({ history, markerName, unit, currentValue }: { history: { value: any; date: string }[]; markerName: string; unit?: string; currentValue: any }) {
  const ref = REF[markerName];
  const nums = history.map(h => parseFloat(h.value)).filter(n => !isNaN(n));
  if (nums.length < 2) return null;

  const padding = ref ? (ref.high - ref.low) * 0.2 : 0;
  const chartMin = ref ? Math.max(0, ref.low - padding) : Math.min(...nums) * 0.9;
  const chartMax = ref ? ref.high + padding : Math.max(...nums) * 1.1;
  const span = chartMax - chartMin || 1;

  const W = 280, H = 80, PAD = 16;
  const px = (i: number) => PAD + (i / Math.max(nums.length - 1, 1)) * (W - PAD * 2);
  const py = (v: number) => H - PAD - ((v - chartMin) / span) * (H - PAD * 2);

  const pts = nums.map((v, i) => `${px(i)},${py(v)}`).join(' ');

  const last = nums[nums.length - 1];
  const statusColor = ref
    ? (last < ref.low ? '#fb923c' : last > ref.high ? '#f87171' : '#34d399')
    : '#34d399';

  const optLowY = ref?.optLow != null ? py(ref.optLow) : null;
  const optHighY = ref?.optHigh != null ? py(ref.optHigh) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
      {/* Optimal zone band */}
      {optLowY != null && optHighY != null && (
        <rect x={PAD} y={optHighY} width={W - PAD * 2} height={optLowY - optHighY}
          fill="rgba(52,211,153,.08)" rx="2" />
      )}
      {/* Low/high reference lines */}
      {ref && (
        <>
          <line x1={PAD} x2={W - PAD} y1={py(ref.low)} y2={py(ref.low)} stroke="rgba(251,146,60,.3)" strokeWidth="1" strokeDasharray="3,3" />
          <line x1={PAD} x2={W - PAD} y1={py(ref.high)} y2={py(ref.high)} stroke="rgba(248,113,113,.3)" strokeWidth="1" strokeDasharray="3,3" />
        </>
      )}
      {/* Trend line */}
      <polyline points={pts} fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {/* Data points */}
      {nums.map((v, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(v)} r="3" fill={statusColor} opacity="0.7" />
          {history[i]?.date && (
            <text x={px(i)} y={H - 2} textAnchor="middle" fontSize="9" fill="rgba(0,210,165,.4)" fontFamily="inherit">
              {history[i].date?.slice(0, 7)}
            </text>
          )}
        </g>
      ))}
      {/* Current value label */}
      <text x={px(nums.length - 1)} y={py(last) - 8} textAnchor="middle" fontSize="11" fill={statusColor} fontFamily="inherit" fontWeight="600">
        {last}
      </text>
    </svg>
  );
}

// ── Known biomarker info dictionary ─────────────────────────────────────────
const KNOWN: Record<string, BiomarkerInfo> = {
  'Estrogen': { what: 'Primary female sex hormone, present in all sexes. Regulates reproductive function, bone density, cardiovascular health, mood, and skin.', why: 'Estrogen affects bone mineral density, lipid profiles, insulin sensitivity, and cognitive function. Chronic imbalance accelerates aging and disease.', high: 'Weight gain (especially hips/thighs), mood swings, breast tenderness, reduced libido, heavy periods, increased clot risk.', low: 'Hot flashes, vaginal dryness, bone loss (osteoporosis), depression, brain fog, joint pain, cardiovascular risk.', mitigateHigh: 'Reduce alcohol and processed foods. Increase cruciferous vegetables (DIM), fiber, and exercise. Evaluate for estrogen-disrupting chemicals in environment.', mitigateLow: 'HRT/bioidentical hormones (consult physician). Phytoestrogens (flaxseed, soy). Strength training boosts estrogen naturally. Address stress and sleep.', goodFor: 'Bone strength, cardiovascular protection, skin collagen, cognitive sharpness, mood stability.', badFor: 'Excess estrogen with progesterone deficiency increases breast/uterine cancer risk. Very high estrogen impairs thyroid function.' },
  'Total Testosterone': { what: 'Primary anabolic hormone in men, also essential in women. Drives muscle growth, bone density, libido, energy, and red blood cell production.', why: 'Testosterone declines ~1% per year after age 30. Low levels are linked to metabolic syndrome, depression, sarcopenia, and cardiovascular disease.', high: 'Acne, aggression, hair loss (DHT conversion), elevated hematocrit, infertility (suppresses FSH/LH), sleep apnea.', low: 'Fatigue, low libido, muscle loss, depression, brain fog, increased body fat, reduced bone density, anemia.', mitigateHigh: 'Evaluate exogenous testosterone use. Rule out adrenal/testicular tumors. Avoid anabolic steroids and DHEA supplements.', mitigateLow: 'Optimize sleep (testosterone surges at night), zinc and vitamin D, strength training, reduce alcohol. TRT under physician supervision.', goodFor: 'Muscle mass, bone density, energy, mood, metabolic health, heart health, cognitive function, longevity.', badFor: 'Very high levels increase cardiovascular risk (elevated hematocrit), potential prostate effects in men, virilization in women.' },
  'Free Testosterone': { what: 'The biologically active fraction (~2%) of testosterone not bound to SHBG or albumin. This is what actually enters cells and drives effects.', why: 'You can have normal total testosterone but low free testosterone if SHBG is high. Free T is often the better predictor of symptoms.', high: 'Same as total testosterone — acne, aggression, fertility issues.', low: 'All symptoms of low testosterone even when total T appears normal.', mitigateHigh: 'Address source of high total T. Lower SHBG (boron supplements).', mitigateLow: 'Reduce SHBG (boron, avoid excess estrogen). Optimize zinc, vitamin D, sleep. Consider TRT if total T is also low.', goodFor: 'Actual driver of all testosterone benefits — muscle, energy, libido, mood.', badFor: 'Elevated free T without elevation in total T suggests SHBG is low, which has independent cardiovascular risks.' },
  'ApoB': { what: 'Apolipoprotein B — a protein on every atherogenic particle (LDL, VLDL, IDL, Lp(a)). One ApoB per particle, so it directly counts particle number.', why: 'ApoB is currently considered the gold standard cardiovascular risk marker, superior to LDL-C. Particle number predicts arterial plaque formation better than cholesterol concentration.', high: 'Dramatically elevated atherosclerosis risk. Each ApoB particle can lodge in arterial walls. Silent until a heart attack or stroke.', low: 'Strongly protective against cardiovascular events. Very low ApoB (on statin or PCSK9i) is associated with lowest event rates.', mitigateHigh: 'Statins, PCSK9 inhibitors, ezetimibe. Dietary: reduce saturated fat and refined carbs, increase soluble fiber, plant sterols. Aerobic exercise.', mitigateLow: 'No action needed. Very low ApoB is the goal.', goodFor: 'Low ApoB is one of the strongest predictors of cardiovascular longevity.', badFor: 'High ApoB causes atherosclerosis — the #1 cause of premature death worldwide.' },
  'SHBG': { what: 'Sex Hormone Binding Globulin — liver-produced protein that binds to sex hormones (testosterone, estrogen, DHT), regulating how much is biologically active.', why: 'SHBG acts as a hormone buffer. Too high = too little free hormone. Too low = too much free hormone, also linked to metabolic syndrome.', high: 'Reduces free testosterone/estrogen. Symptoms of low T or low E even with normal total levels. Associated with hyperthyroidism, liver disease.', low: 'Metabolic syndrome, insulin resistance, PCOS (women), obesity. Elevates free androgen levels.', mitigateHigh: 'Address liver and thyroid health. Boron may lower SHBG. Adequate caloric intake (very low calorie diets raise SHBG).', mitigateLow: 'Reduce insulin resistance (exercise, diet). Treat PCOS if present. Avoid excess insulin-spiking foods.', goodFor: 'Balanced SHBG optimizes free hormone levels, protecting from both excess and deficiency.', badFor: 'High SHBG linked to frailty. Low SHBG is a marker of insulin resistance and metabolic syndrome.' },
  'Free T3': { what: 'Free Triiodothyronine — the active thyroid hormone that enters cells and controls metabolism. T4 converts to T3 in tissues. Most biologically potent thyroid hormone.', why: 'Even when TSH and T4 appear normal, low Free T3 causes hypothyroid symptoms. Often the missing piece in thyroid workups.', high: 'Hyperthyroidism symptoms: weight loss, rapid heartbeat, anxiety, tremor, heat intolerance, hair loss, osteoporosis risk.', low: 'Hypothyroidism symptoms: fatigue, weight gain, cold intolerance, depression, constipation, brain fog, dry skin, slow pulse.', mitigateHigh: 'Investigate hyperthyroidism. Methimazole, radioactive iodine, or surgery depending on cause.', mitigateLow: 'Selenium supports T4-to-T3 conversion. Zinc, iron essential. T3 medication (liothyronine) under physician care. Optimize gut health.', goodFor: 'Drives metabolic rate, heart rate, body temperature, protein synthesis, and neurological function.', badFor: 'Chronically low T3 slows every cellular process. High T3 causes cardiac arrhythmias and bone loss.' },
  'Ferritin': { what: 'The main iron storage protein. Reflects total iron stores in the body. More reliable than serum iron alone.', why: 'Iron drives oxygen transport, energy production (via mitochondria), immune function, and neurotransmitter synthesis. Deficiency is the most common nutrient deficiency globally.', high: 'Hemochromatosis, liver disease, chronic inflammation, repeated blood transfusions. High ferritin from inflammation is a separate concern from true iron excess.', low: 'Iron deficiency anemia: fatigue, brain fog, poor exercise tolerance, cold hands/feet, brittle nails, restless leg syndrome.', mitigateHigh: 'Therapeutic phlebotomy. Donate blood. Reduce red meat and alcohol. Check HFE gene for hemochromatosis mutations.', mitigateLow: 'Iron supplementation (ferrous bisglycinate most tolerated). Eat iron-rich foods (red meat, lentils, spinach). Pair with vitamin C for absorption. Avoid calcium/tea near iron intake.', goodFor: 'Optimal ferritin (50-100 ng/mL for women, 100-150 for men) supports energy, immunity, and cognitive function.', badFor: 'Extremely high ferritin drives oxidative stress and liver damage. Very high ferritin (>300) independently predicts cardiovascular disease.' },
  'Vitamin D': { what: '25-hydroxyvitamin D — the main circulating form of vitamin D. Functions as a hormone more than a vitamin, with receptors in nearly every tissue.', why: 'Deficiency affects >40% of adults globally. Impacts bone density, immune function, cancer risk, autoimmune disease, depression, cardiovascular health, and testosterone production.', high: 'Toxicity rare from sun, more common with supplement overuse. Hypercalcemia: nausea, weakness, kidney stones, calcification.', low: 'Bone loss, frequent illness, fatigue, depression, muscle weakness, increased cancer risk, cardiovascular disease, insulin resistance.', mitigateHigh: 'Stop supplementation. Increase hydration. Reduce calcium intake temporarily.', mitigateLow: 'Vitamin D3 (5000-10000 IU/day, retest in 3 months). Sun exposure (20 min midday). Take with K2 to direct calcium to bones, not arteries.', goodFor: 'Bone density, immune modulation, testosterone production, mood, cancer protection, cardiovascular health, insulin sensitivity.', badFor: 'Very high D3 without K2 can cause arterial calcification. Toxicity above 150 ng/mL.' },
};

interface BiomarkerInfo {
  what: string; why: string; high: string; low: string;
  mitigateHigh: string; mitigateLow: string; goodFor: string; badFor: string;
}
interface Marker { name: string; value: any; unit?: string; status?: string; category?: string; history?: { value: any; date: string }[] }
interface Props { marker: Marker; onClose: () => void; }

function InfoBlock({ title, text, bg, border, titleColor, textColor }: { title: string; text: string; bg: string; border: string; titleColor: string; textColor: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: titleColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 14, color: textColor, lineHeight: 1.7, margin: 0 }}>{text}</p>
    </div>
  );
}

export default function BiomarkerDetail({ marker, onClose }: Props) {
  const [info, setInfo] = useState<BiomarkerInfo | null>(KNOWN[marker.name] || null);
  const [loading, setLoading] = useState<boolean>(!KNOWN[marker.name]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (KNOWN[marker.name]) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch('/api/biomarker-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: marker.name, category: marker.category || '', unit: marker.unit || '' }) });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) setError(data.error || `Failed (${res.status})`);
        else if (data.what && data.why) setInfo(data);
        else setError('Unexpected response shape.');
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Network error'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [marker.name]);

  const numValue = parseFloat(marker.value);
  const ref = REF[marker.name];
  const history: { value: any; date: string }[] = (marker as any).history || [{ value: marker.value, date: '' }];
  const hasHistory = history.length > 1;

  const statusColor = !isNaN(numValue) && ref
    ? (numValue < ref.low ? '#fb923c' : numValue > ref.high ? '#f87171' : '#34d399')
    : (marker.status === 'high' || marker.status === 'elevated' ? '#f87171' : marker.status === 'low' ? '#fb923c' : '#34d399');

  // Personalised context based on status
  const personalContext = !isNaN(numValue) && ref
    ? numValue < ref.low
      ? `Your ${marker.name} of ${marker.value}${marker.unit ? ' ' + marker.unit : ''} is below the reference floor of ${ref.low}. This is worth addressing — see what moves it below.`
      : numValue > ref.high
        ? `Your ${marker.name} of ${marker.value}${marker.unit ? ' ' + marker.unit : ''} is above the reference ceiling of ${ref.high}. Review the mitigation strategies below.`
        : ref.optHigh && numValue > ref.optHigh
          ? `Your ${marker.name} is within normal range but above the functional optimal of ${ref.optHigh}. There's room to optimize.`
          : ref.optLow && numValue < ref.optLow
            ? `Your ${marker.name} is within normal range at ${marker.value} but below the functional optimal of ${ref.optLow}. You can push this higher.`
            : `Your ${marker.name} is at ${marker.value}${marker.unit ? ' ' + marker.unit : ''} — sitting in the optimal zone. Keep doing what you're doing.`
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,10,20,0.88)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(2,12,22,0.99)', border: '1px solid rgba(0,210,165,.22)', borderRadius: 14, padding: '28px 32px', maxWidth: 640, width: '93%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>

        {/* Header: value + trend side by side */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{marker.category || 'Biomarker'}</div>
            <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 26, color: 'rgba(220,255,235,1)', margin: '0 0 10px', fontWeight: 500 }}>{marker.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 36, color: statusColor, fontFamily: 'EB Garamond, Georgia, serif', fontWeight: 500 }}>{marker.value}</span>
              {marker.unit && <span style={{ fontSize: 15, color: 'rgba(0,210,165,.55)' }}>{marker.unit}</span>}
              {marker.status && (
                <span style={{ fontSize: 12, color: statusColor, letterSpacing: '0.08em', textTransform: 'uppercase', background: statusColor + '18', border: '1px solid ' + statusColor + '40', borderRadius: 12, padding: '3px 10px' }}>
                  {marker.status}
                </span>
              )}
            </div>
            {/* Range bar under value */}
            <RangeBar value={numValue} markerName={marker.name} unit={marker.unit} />
          </div>

          {/* Trend chart beside the value */}
          {hasHistory && (
            <div style={{ width: 180, flexShrink: 0, marginLeft: 20, paddingTop: 28 }}>
              <TrendLine history={history} markerName={marker.name} unit={marker.unit} currentValue={marker.value} />
            </div>
          )}

          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(0,210,165,.4)', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Personalised context banner */}
        {personalContext && (
          <div style={{ padding: '12px 16px', background: statusColor + '0d', border: `1px solid ${statusColor}33`, borderRadius: 8, marginBottom: 20, fontSize: 15, color: 'rgba(220,255,235,.92)', lineHeight: 1.65 }}>
            {personalContext}
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(0,210,165,.1)', paddingTop: 20 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,210,165,.8)', animation: 'aellux-star-twinkle 1s ease-in-out infinite', marginBottom: 14 }} />
              <div style={{ fontSize: 14, color: 'rgba(0,210,165,.65)', fontStyle: 'italic' }}>Researching {marker.name}…</div>
            </div>
          )}
          {error && !loading && (
            <div style={{ padding: '12px 18px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 6, color: 'rgba(255,200,180,1)', fontSize: 14, lineHeight: 1.5 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,160,100,.85)', marginBottom: 4 }}>⚠ Could not load marker info</div>
              {error}
            </div>
          )}
          {info && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <InfoBlock title="What is it?" text={info.what} bg="rgba(0,210,165,.03)" border="rgba(0,210,165,.12)" titleColor="rgba(0,225,180,.75)" textColor="rgba(220,255,235,.9)" />
              <InfoBlock title="Why it matters" text={info.why} bg="rgba(0,210,165,.03)" border="rgba(0,210,165,.1)" titleColor="rgba(0,200,160,.65)" textColor="rgba(220,255,235,.85)" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InfoBlock title="If too high" text={info.high} bg="rgba(248,113,113,.05)" border="rgba(248,113,113,.18)" titleColor="rgba(248,113,113,.9)" textColor="rgba(255,190,180,.9)" />
                <InfoBlock title="If too low" text={info.low} bg="rgba(251,146,60,.05)" border="rgba(251,146,60,.18)" titleColor="rgba(251,146,60,.9)" textColor="rgba(255,210,165,.9)" />
                <InfoBlock title="To bring it down" text={info.mitigateHigh} bg="rgba(52,211,153,.04)" border="rgba(52,211,153,.15)" titleColor="rgba(52,211,153,.85)" textColor="rgba(160,240,200,.9)" />
                <InfoBlock title="To bring it up" text={info.mitigateLow} bg="rgba(56,189,248,.04)" border="rgba(56,189,248,.15)" titleColor="rgba(56,189,248,.85)" textColor="rgba(160,220,255,.9)" />
                <InfoBlock title="Good for" text={info.goodFor} bg="rgba(0,210,165,.04)" border="rgba(0,210,165,.12)" titleColor="rgba(0,225,180,.85)" textColor="rgba(0,232,184,.9)" />
                <InfoBlock title="Watch out for" text={info.badFor} bg="rgba(167,139,250,.04)" border="rgba(167,139,250,.15)" titleColor="rgba(167,139,250,.85)" textColor="rgba(200,180,255,.9)" />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(0,210,165,.08)', fontSize: 12, color: 'rgba(0,210,165,.35)', lineHeight: 1.5 }}>
          Educational context only — not medical advice. Consult your physician before making health decisions.
        </div>
      </div>
    </div>
  );
}
