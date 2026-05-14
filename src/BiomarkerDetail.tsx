import React, { useEffect, useState } from 'react';
import { useIsMobile } from './useIsMobile';

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

  const statusColor = value < ref.low ? 'var(--accent-watch)'
    : value > ref.high ? 'var(--accent-elevated)'
    : (ref.optLow != null && value < ref.optLow) || (ref.optHigh != null && value > ref.optHigh)
      ? 'var(--accent-watch)'
      : 'var(--accent-optimal)';

  const h = compact ? 8 : 10;

  return (
    <div style={{ marginTop: compact ? 8 : 14 }}>
      <div style={{ position: 'relative', height: h, borderRadius: h, background: 'var(--brand-ghost)', overflow: 'visible' }}>
        {/* Full lab range background */}
        <div style={{
          position: 'absolute', top: 0, height: '100%', borderRadius: h,
          left: `${lowPct}%`, width: `${highPct - lowPct}%`,
          background: 'var(--border-subtle)',
        }} />
        {/* Optimal zone */}
        {ref.optLow != null && (
          <div style={{
            position: 'absolute', top: 0, height: '100%',
            left: `${optLowPct}%`, width: `${optHighPct - optLowPct}%`,
            background: 'rgba(20,83,45,.15)',
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
          border: `2px solid var(--bg-surface)`,
          boxShadow: `0 0 8px ${statusColor}88`,
          zIndex: 2,
        }} />
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: compact ? 4 : 6 }}>
        <span style={{ fontSize: compact ? 11 : 12, color: 'var(--text-tertiary)' }}>
          Low {ref.low}{unit ? ` ${unit}` : ''}
        </span>
        {ref.optLow != null && !compact && (
          <span style={{ fontSize: 11, color: 'var(--brand)' }}>
            Optimal {ref.optLow}–{ref.optHigh}{unit ? ` ${unit}` : ''}
          </span>
        )}
        <span style={{ fontSize: compact ? 11 : 12, color: 'var(--text-tertiary)' }}>
          High {ref.high}{unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  );
}

// ── Interactive Trend Chart ────────────────────────────────────────────────────
// Clickable data points open an AI-powered "what changed?" analysis
function TrendChart({ history, markerName, unit, profile, allMarkers, userId, plan }: {
  history: { value: any; date: string }[];
  markerName: string;
  unit?: string;
  profile?: any;
  allMarkers?: any[];
  userId?: string;
  plan?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const ref = REF[markerName];
  const sorted = [...history]
    .filter(h => h.date && !isNaN(parseFloat(h.value)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const nums = sorted.map(h => parseFloat(h.value));
  if (nums.length < 1) return null;

  const padding = ref ? (ref.high - ref.low) * 0.25 : 0;
  const chartMin = ref ? Math.max(0, ref.low - padding) : Math.min(...nums) * 0.88;
  const chartMax = ref ? ref.high + padding : Math.max(...nums) * 1.12;
  const span = chartMax - chartMin || 1;

  const W = 560, H = 160, PAD_X = 20, PAD_Y = 24;
  const px = (i: number) => PAD_X + (i / Math.max(nums.length - 1, 1)) * (W - PAD_X * 2);
  const py = (v: number) => H - PAD_Y - ((v - chartMin) / span) * (H - PAD_Y * 2);
  const pts = nums.map((v, i) => `${px(i)},${py(v)}`).join(' ');

  // Detect significant changes (>15% jump between consecutive readings)
  const significantChanges: number[] = [];
  for (let i = 1; i < nums.length; i++) {
    const pct = Math.abs((nums[i] - nums[i-1]) / (nums[i-1] || 1));
    if (pct > 0.15) significantChanges.push(i);
  }

  const last = nums[nums.length - 1];
  const pointColor = (v: number) => !isNaN(v) && ref
    ? (v < ref.low ? 'var(--accent-watch)' : v > ref.high ? 'var(--accent-elevated)' : 'var(--accent-optimal)')
    : 'var(--accent-optimal)';

  const optLowY = ref?.optLow != null ? py(ref.optLow) : null;
  const optHighY = ref?.optHigh != null ? py(ref.optHigh) : null;

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d + (d.length === 10 ? 'T12:00:00' : ''));
    return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const askAI = async (idx: number) => {
    if (idx < 0 || idx >= sorted.length) return;
    setSelectedIdx(idx);
    setAnalysis(null);
    setAnalysisLoading(true);

    const point = sorted[idx];
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
    const delta = prev ? (parseFloat(point.value) - parseFloat(prev.value)) : null;
    const pct = prev && parseFloat(prev.value) ? ((delta! / parseFloat(prev.value)) * 100).toFixed(1) : null;
    const isSignificant = significantChanges.includes(idx);

    // Build context about all markers around this date
    const dateContext = point.date?.slice(0, 7) ?? '';
    const markerSnapshot = (allMarkers || [])
      .filter((m: any) => m.name !== markerName)
      .map((m: any) => {
        const nearbyReading = (m.history || [])
          .filter((h: any) => h.date?.startsWith(dateContext.slice(0, 4)))
          .sort((a: any, b: any) => Math.abs(new Date(a.date).getTime() - new Date(point.date).getTime()) - Math.abs(new Date(b.date).getTime() - new Date(point.date).getTime()))[0];
        return nearbyReading ? `${m.name}: ${nearbyReading.value}${m.unit ? ' ' + m.unit : ''}` : null;
      })
      .filter(Boolean)
      .slice(0, 12)
      .join(', ');

    const profileCtx = profile ? [
      profile.biological_sex && `sex: ${profile.biological_sex}`,
      profile.birth_year && `age: ${new Date().getFullYear() - profile.birth_year}`,
      profile.weight_kg && `weight: ${profile.weight_kg}kg`,
      profile.goal && `goal: ${profile.goal}`,
      profile.activity_level && `activity: ${profile.activity_level}`,
    ].filter(Boolean).join(', ') : '';

    try {
      const res = await fetch('/api/trend-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || null,
          plan: plan || 'free',
          markerName,
          unit,
          pointDate: formatDate(point.date),
          pointValue: point.value,
          prevDate: prev ? formatDate(prev.date) : null,
          prevValue: prev ? prev.value : null,
          nextDate: next ? formatDate(next.date) : null,
          nextValue: next ? next.value : null,
          delta: delta !== null ? delta.toFixed(2) : null,
          deltaPct: pct,
          isSignificant,
          allReadings: sorted.map((r) => `${formatDate(r.date)}: ${r.value}${unit ? ' ' + unit : ''}`).join(' | '),
          markerSnapshot,
          profileCtx,
          refRange: ref ? `Low ${ref.low}, Optimal ${ref.optLow ?? ref.low}–${ref.optHigh ?? ref.high}, High ${ref.high}` : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAnalysis(data.error || 'Analysis unavailable — please try again.');
      } else {
        setAnalysis(data.analysis || 'No analysis returned.');
      }
    } catch {
      setAnalysis('Analysis unavailable — please try again.');
    }
    setAnalysisLoading(false);
  };

  return (
    <div>
      {/* Chart hint */}
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.04em' }}>
        Tap any data point to ask Aellux what changed
      </div>

      {/* The chart */}
      <div style={{ position: 'relative', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '16px 8px 8px', cursor: 'crosshair' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
          {/* Optimal zone */}
          {optLowY != null && optHighY != null && (
            <rect x={PAD_X} y={optHighY} width={W - PAD_X * 2} height={Math.max(0, optLowY - optHighY)}
              fill="rgba(20,83,45,.06)" rx="2" />
          )}
          {/* Reference lines */}
          {ref && (
            <>
              <line x1={PAD_X} x2={W - PAD_X} y1={py(ref.low)} y2={py(ref.low)} stroke="var(--accent-watch)" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4,4" />
              <line x1={PAD_X} x2={W - PAD_X} y1={py(ref.high)} y2={py(ref.high)} stroke="var(--accent-elevated)" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4,4" />
              <text x={PAD_X + 2} y={py(ref.high) - 4} fontSize="9" fill="var(--accent-elevated)" fontFamily="inherit">High {ref.high}</text>
              <text x={PAD_X + 2} y={py(ref.low) + 12} fontSize="9" fill="var(--accent-watch)" fontFamily="inherit">Low {ref.low}</text>
            </>
          )}
          {/* Trend line */}
          {nums.length > 1 && (
            <polyline points={pts} fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {/* Significant change highlights */}
          {significantChanges.map(i => (
            <line key={i} x1={px(i)} x2={px(i)} y1={PAD_Y} y2={H - PAD_Y}
              stroke="var(--accent-watch)" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="2,3" />
          ))}
          {/* Data points — clickable */}
          {nums.map((v, i) => {
            const col = pointColor(v);
            const isHov = hoveredIdx === i;
            const isSel = selectedIdx === i;
            const isSig = significantChanges.includes(i);
            return (
              <g key={i} style={{ cursor: 'pointer' }}
                onClick={() => askAI(i)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}>
                {/* Hit area */}
                <circle cx={px(i)} cy={py(v)} r="16" fill="transparent" />
                {/* Glow ring on selected */}
                {isSel && <circle cx={px(i)} cy={py(v)} r="10" fill="none" stroke={col} strokeWidth="1" opacity="0.4" />}
                {/* Significant change ring */}
                {isSig && !isSel && <circle cx={px(i)} cy={py(v)} r="7" fill="none" stroke="var(--accent-watch)" strokeOpacity="0.6" strokeWidth="1.5" />}
                {/* Main dot */}
                <circle cx={px(i)} cy={py(v)} r={isSel ? 6 : isHov ? 5 : 4}
                  fill={col} stroke="var(--bg-surface)" strokeWidth="2"
                  style={{ transition: 'r .15s' }} />
                {/* Date label */}
                {sorted[i]?.date && (
                  <text x={px(i)} y={H - 4} textAnchor="middle" fontSize="9"
                    fill={isSel ? 'var(--brand-dim)' : 'var(--text-tertiary)'} fontFamily="inherit">
                    {sorted[i].date?.slice(0, 7)}
                  </text>
                )}
                {/* Hover tooltip */}
                {isHov && (
                  <g>
                    <rect x={px(i) - 28} y={py(v) - 28} width="56" height="22" rx="4"
                      fill="white" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
                    <text x={px(i)} y={py(v) - 13} textAnchor="middle" fontSize="11"
                      fill={col} fontFamily="inherit" fontWeight="600">
                      {v}{unit ? ' ' + unit : ''}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* AI Analysis Panel */}
      {(analysisLoading || analysis || selectedIdx !== null) && (
        <div style={{ marginTop: 12, padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderLeft: '3px solid var(--brand)', borderRadius: 8 }}>
          {selectedIdx !== null && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {formatDate(sorted[selectedIdx]?.date)} · {sorted[selectedIdx]?.value}{unit ? ' ' + unit : ''}
              {selectedIdx > 0 && (() => {
                const d = parseFloat(sorted[selectedIdx].value) - parseFloat(sorted[selectedIdx - 1].value);
                const p = (d / parseFloat(sorted[selectedIdx - 1].value) * 100).toFixed(1);
                return <span style={{ marginLeft: 10, color: d > 0 ? 'var(--accent-elevated)' : 'var(--accent-optimal)' }}>{d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)} ({Math.abs(parseFloat(p))}%)</span>;
              })()}
            </div>
          )}
          {analysisLoading ? (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Aellux is reading this moment in your biology…
            </div>
          ) : analysis ? (
            <p style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.8, margin: 0, fontFamily: 'Inter, sans-serif', fontStyle: 'normal', fontWeight: 300 }}>
              {analysis.replace(/^#+\s*/gm, '').replace(/\*\*/g, '')}
            </p>
          ) : null}
          {!analysisLoading && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>
              Tap another point to compare · Yellow markers = significant shift (&gt;15%)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Known biomarker info dictionary ─────────────────────────────────────────
const KNOWN: Record<string, BiomarkerInfo> = {
  'Estrogen': {
    what: 'Primary female sex hormone, essential in all sexes. Regulates bone density, cardiovascular health, mood, skin, cognitive function, and reproductive biology.',
    why: 'Estrogen imbalance has cascading effects across every organ system. It directly interacts with thyroid, testosterone, cortisol, and insulin — it is rarely an isolated problem.',
    high: 'Weight gain especially hips and abdomen, mood swings, reduced libido, bloating, increased blood clotting risk, breast tissue changes, and suppressed thyroid function. In men: gynecomastia, fatigue, and direct suppression of free testosterone.',
    low: 'Bone loss accelerating toward osteoporosis, depression, brain fog, joint pain, poor skin elasticity, and cardiovascular risk elevation. In women: hot flashes and vaginal dryness. In men: joint pain, mood instability, and low libido.',
    mitigateHigh: 'Cruciferous vegetables (broccoli, cauliflower, Brussels sprouts) contain DIM which directly supports estrogen metabolism and clearance in both sexes. Increase dietary fiber — it binds excess estrogen for excretion. Reduce alcohol significantly — it raises aromatase activity and estrogen levels. Eliminate BPA plastics. Prioritize liver health by reducing processed foods and seed oils — the liver is the primary estrogen detoxifier. Reduce excess body fat, which produces estrogen via aromatase. Regular vigorous exercise reduces circulating estrogen. Address gut health — estrobolome bacteria regulate estrogen recirculation.',
    mitigateHighMedical: 'See a physician if estrogen dominance persists despite lifestyle changes, you have unexplained heavy bleeding, or breast density is significantly elevated. Always test progesterone alongside estrogen — dominance is often a ratio issue. Bioidentical progesterone or aromatase inhibitors may be appropriate under supervision.',
    mitigateLow: 'Phytoestrogens from fermented soy, ground flaxseed, and legumes provide mild estrogenic support for women. For men, very low estrogen is uncommon and usually indicates hypogonadism — address the underlying testosterone production. Optimize body fat. Address adrenal fatigue and chronic stress.',
    mitigateLowMedical: 'Women: see a physician if symptoms significantly impair quality of life or bone density is declining. Bioidentical hormone replacement (estradiol plus progesterone) has strong evidence when initiated within 10 years of menopause. Men: see a physician if very low estrogen is confirmed — this requires evaluation of the hypothalamic-pituitary-gonadal axis.',
    goodFor: 'Bone mineral density, cardiovascular protection, skin collagen and elasticity, cognitive sharpness, mood stability, libido, metabolic efficiency.',
    badFor: 'Chronically elevated estrogen without progesterone balance increases breast and uterine cancer risk. Very high estrogen suppresses thyroid function and free testosterone.',
  },
  'Total Testosterone': {
    what: 'Primary anabolic hormone in men, essential in women at lower levels. Drives muscle growth, bone density, libido, energy, mood, and red blood cell production.',
    why: 'Testosterone declines approximately 1% per year after age 30. Low levels independently link to metabolic syndrome, depression, sarcopenia, cardiovascular disease, and cognitive decline.',
    high: 'Acne, oily skin, irritability, hair thinning via DHT conversion, elevated red blood cell count, infertility by suppressing FSH and LH, sleep apnea.',
    low: 'Fatigue, low or absent libido, muscle loss, difficulty building muscle, depression or flat mood, brain fog, increased abdominal fat, reduced bone density.',
    mitigateHigh: 'If using exogenous testosterone, work with prescriber to adjust dose. Avoid DHEA, androstenedione, and testosterone booster supplements. Increase aerobic exercise to reduce aromatization. Eliminate anabolic steroids completely.',
    mitigateHighMedical: 'See a physician to rule out adrenal or testicular tumors if significantly elevated without exogenous use. Monitor hematocrit — above 54% requires intervention regardless of source.',
    mitigateLow: 'Sleep is the highest-leverage intervention — 80% of daily testosterone is released during sleep, and one week of poor sleep reduces levels 10-15%. Strength training especially compound lifts (squat, deadlift, press) directly stimulates production. Optimize zinc from food (oysters, red meat, pumpkin seeds), vitamin D, and magnesium. Reduce alcohol — even moderate drinking suppresses testosterone for 24 hours. Lower chronic stress — cortisol is the direct hormonal antagonist of testosterone. Maintain healthy body fat — both very high and very low body fat suppress production.',
    mitigateLowMedical: 'See a physician if levels remain low after 3 months of aggressive lifestyle optimization, or symptoms significantly impair function. Request Free Testosterone and SHBG alongside Total T. TRT is appropriate for confirmed hypogonadism — but exhaust lifestyle first, as many men restore levels naturally.',
    goodFor: 'Muscle mass and strength, bone density, energy and motivation, cardiovascular health, cognitive function, libido, mood, insulin sensitivity, longevity.',
    badFor: 'Very high levels especially from exogenous use increase cardiovascular risk via elevated hematocrit. Potential prostate effects in men with pre-existing prostate issues.',
  },
  'Free Testosterone': {
    what: 'The biologically active fraction of testosterone not bound to SHBG or albumin — approximately 2% of total. This is what actually enters cells and drives all effects.',
    why: 'You can have normal total testosterone but functionally low testosterone if SHBG is high. Free T is the better predictor of symptoms and the more actionable number.',
    high: 'Same effects as high total testosterone — acne, aggression, fertility suppression. Also suggests SHBG may be low, which independently indicates metabolic stress.',
    low: 'All symptoms of low testosterone even when total T appears normal: brain fog, low libido, poor recovery, flat mood, muscle loss.',
    mitigateHigh: 'Boron (10mg/day) raises SHBG which lowers free T. Address underlying metabolic drivers. Avoid DHEA and pro-hormone supplements.',
    mitigateHighMedical: 'See a physician if very high free T is unexplained — warrants the same workup as high total T including adrenal and gonadal tumor screening.',
    mitigateLow: 'Boron (10mg/day) directly reduces SHBG, raising free testosterone — one of the most evidence-backed natural interventions. Nettle root has evidence for SHBG reduction. Optimize zinc, vitamin D, and sleep. Everything that raises total T also raises free T.',
    mitigateLowMedical: 'See a physician if free T is low despite normal total T — high SHBG may indicate hyperthyroidism or liver disease requiring investigation. If both total and free T are low, TRT evaluation is appropriate.',
    goodFor: 'The actual driver of all testosterone benefits — muscle synthesis, libido, mood, cognitive sharpness, energy. Free T predicts symptoms better than total T.',
    badFor: 'Low SHBG (causing elevated free T) is a marker of insulin resistance and metabolic syndrome with independent cardiovascular risk.',
  },
  'ApoB': {
    what: 'Apolipoprotein B — one protein sits on every atherogenic particle (LDL, VLDL, IDL, Lp(a)). ApoB directly counts the number of particles that can lodge in arterial walls.',
    why: 'ApoB is the gold standard cardiovascular risk marker, superior to LDL-C. Particle number determines plaque formation risk. Normal LDL cholesterol can coexist with high ApoB and significant risk.',
    high: 'Elevated atherosclerosis risk. Each ApoB particle can embed in arterial walls and initiate plaque. This process is completely silent until a cardiac event.',
    low: 'Strongly protective. Very low ApoB consistently associates with the lowest cardiovascular event rates in population data.',
    mitigateHigh: 'Eliminate refined carbohydrates and sugar — they are the primary driver of VLDL and small dense LDL. Add soluble fiber: oats, psyllium husk, legumes bind cholesterol in the gut for elimination. Increase omega-3 fatty acids from fatty fish or 2-4g EPA/DHA daily. Add plant sterols (2g/day with meals). Aerobic exercise 150+ minutes per week directly lowers ApoB. Reduce excess body fat — visceral fat is the primary production driver. Reduce alcohol and prioritize sleep quality.',
    mitigateHighMedical: 'See a physician if ApoB remains above 90 mg/dL after 3-6 months of aggressive lifestyle change, or if additional cardiovascular risk factors are present. Statins, ezetimibe, and PCSK9 inhibitors are highly effective — but exhaust lifestyle measures first unless risk is high enough to justify immediate intervention.',
    mitigateLow: 'Low ApoB requires no intervention — this is the goal. Protect it by maintaining current lifestyle.',
    mitigateLowMedical: 'No medical intervention needed for low ApoB.',
    goodFor: 'Low ApoB is among the strongest predictors of cardiovascular longevity and freedom from atherosclerotic disease.',
    badFor: 'High ApoB is the primary driver of atherosclerosis — the leading cause of premature death globally. Even modest elevation compounds over decades of exposure.',
  },
  'SHBG': {
    what: 'Sex Hormone Binding Globulin — a liver protein that binds testosterone, estrogen, and DHT, regulating how much of each hormone is biologically active and available to tissues.',
    why: 'SHBG determines whether your sex hormones are actually usable. It explains why someone can have normal total testosterone but feel every symptom of deficiency.',
    high: 'Functional sex hormone deficiency despite normal total levels. Symptoms of low testosterone and low estrogen simultaneously. Associated with hyperthyroidism, liver disease, and very low calorie intake.',
    low: 'A reliable marker of metabolic dysfunction. Low SHBG signals insulin resistance, metabolic syndrome, PCOS in women, and obesity.',
    mitigateHigh: 'Ensure adequate caloric intake — extreme restriction raises SHBG dramatically. Boron (10mg/day) has consistent evidence for lowering SHBG. Adequate zinc from food sources. Strength training and maintaining healthy muscle mass help regulate levels over time.',
    mitigateHighMedical: 'See a physician to check thyroid and liver function — both are common causes of elevated SHBG. If causing symptomatic sex hormone deficiency, hormone therapy may be considered alongside treating the root cause.',
    mitigateLow: 'Improve insulin sensitivity through the fundamentals: reduce refined carbohydrates, increase dietary fiber, add resistance training, reduce excess body fat. Intermittent fasting raises SHBG over time. Reduce alcohol — it suppresses SHBG significantly.',
    mitigateLowMedical: 'See a physician for formal insulin resistance evaluation if persistently low. In women, rule out PCOS. Metformin or GLP-1 agonists improve insulin sensitivity and raise SHBG, but lifestyle is always first line.',
    goodFor: 'Balanced SHBG acts as a hormone buffer — protecting against both excess and deficiency while keeping the endocrine system responsive.',
    badFor: 'Low SHBG independently predicts type 2 diabetes, cardiovascular disease, and fatty liver disease. High SHBG leads to functional sex hormone deficiency despite normal total levels.',
  },
  'Free T3': {
    what: 'Free Triiodothyronine — the active thyroid hormone that enters cells and controls metabolism. T4 converts to T3 in tissues. Most biologically potent thyroid hormone.',
    why: 'Even when TSH and T4 appear normal, low Free T3 causes hypothyroid symptoms. T3 is the end signal your cells actually respond to — not T4, not TSH.',
    high: 'Hyperthyroidism symptoms: unexpected weight loss, racing heartbeat, anxiety, tremor, excessive sweating, heat intolerance, hair thinning, disrupted sleep, osteoporosis risk.',
    low: 'Hypothyroidism symptoms: persistent fatigue even after sleep, unexplained weight gain, cold hands and feet, depression, constipation, brain fog, dry skin, slow pulse, hair loss.',
    mitigateHigh: 'Reduce chronic stress first — cortisol directly disrupts thyroid signaling. Avoid iodine-heavy supplements like kelp and seaweed. Try eliminating gluten temporarily. Ashwagandha and lemon balm have evidence for calming thyroid overactivity naturally. Prioritize sleep — thyroid hormone rhythm is nocturnal.',
    mitigateHighMedical: 'See a physician if resting heart rate exceeds 100bpm persistently, you have significant unintentional weight loss, or symptoms are severe. Confirmed Graves disease or hot nodules require evaluation — but antithyroid medications, radioactive iodine, and surgery are last resorts after ruling out lifestyle and environmental triggers.',
    mitigateLow: 'Selenium (200mcg/day) is the most critical nutrient — it drives T4-to-T3 conversion and without it no intervention works fully. Zinc and iron are essential cofactors. Optimize gut health — significant T3 conversion happens in the intestinal lining. Cold exposure (cold showers) stimulates thyroid output. Avoid very low calorie diets which suppress T3.',
    mitigateLowMedical: 'See a physician if holistic measures fail after 8-12 weeks or symptoms significantly impact daily function. Specifically request Free T3 testing — many practitioners only test TSH. Liothyronine (T3 medication) or desiccated thyroid (NDT) may be appropriate; T4-only medication (levothyroxine) often leaves Free T3 suboptimal.',
    goodFor: 'Drives metabolic rate, heart rate, body temperature, protein synthesis, hair growth, and neurological function. Optimal T3 supports healthy weight, sharp cognition, and strong energy.',
    badFor: 'Chronically elevated T3 accelerates cellular aging and stresses the heart. Chronically low T3 slows every cellular process and is strongly associated with depression and metabolic syndrome.',
  },
  'Ferritin': {
    what: 'The primary iron storage protein, reflecting total iron reserves across bone marrow, liver, and spleen. Far more reliable than serum iron alone.',
    why: 'Iron is fundamental to oxygen transport, mitochondrial energy production, immune function, and neurotransmitter synthesis including dopamine and serotonin. Iron deficiency is the most common nutritional deficiency globally.',
    high: 'Without concurrent inflammation, high ferritin signals true iron excess — possible hemochromatosis, excessive red meat intake, or repeated transfusions. With elevated CRP, it may reflect inflammation rather than iron overload.',
    low: 'Pre-anemia iron deficiency: fatigue disproportionate to activity, brain fog, poor concentration, reduced exercise tolerance, cold extremities, brittle nails, hair shedding, restless legs at night.',
    mitigateHigh: 'If inflammation is the root cause, address that first. For true iron excess: reduce red meat and iron-fortified foods. Eliminate alcohol — it increases iron absorption significantly. Give blood regularly — this is the most effective natural intervention, and therapeutic phlebotomy achieves the same result. Avoid vitamin C with iron-rich meals. Switch from cast iron to stainless steel cookware.',
    mitigateHighMedical: 'See a physician for HFE gene testing (hemochromatosis screening) if ferritin is persistently above 300 ng/mL in men or 200 in women without obvious inflammatory cause. Untreated hemochromatosis causes liver cirrhosis, diabetes, and heart disease. Regular therapeutic phlebotomy is the primary treatment.',
    mitigateLow: 'Prioritize heme iron (most absorbable form): red meat, organ meats especially liver, shellfish. Non-heme sources — lentils, spinach, pumpkin seeds — should always be paired with vitamin C to increase absorption dramatically. Take ferrous bisglycinate (most tolerated form) on an empty stomach, away from coffee, tea, dairy, and calcium. Address gut inflammation which reduces iron uptake.',
    mitigateLowMedical: 'See a physician if ferritin remains below 30 ng/mL despite dietary changes, you have symptoms of clinical anemia (severe fatigue, pallor, palpitations), or you are pregnant. IV iron infusion works rapidly when oral forms are insufficient. Rule out internal bleeding in unexplained deficiency.',
    goodFor: 'Optimal ferritin (70-150 ng/mL for most adults) supports sustained energy, strong immunity, sharp cognition, and athletic performance.',
    badFor: 'Chronic iron overload generates free radicals via Fenton chemistry — accelerating cellular aging, liver damage, and cardiovascular disease. Ferritin above 300 ng/mL is an independent cardiovascular risk factor.',
  },
  'Vitamin D': {
    what: '25-hydroxyvitamin D — the circulating storage form. Functions as a hormone with receptors in nearly every tissue including brain, immune cells, heart, gut, and reproductive organs.',
    why: 'Deficiency affects over 40% of adults globally and associates with increased risk of virtually every chronic disease including cancer, autoimmune conditions, depression, and cardiovascular disease.',
    high: 'Vitamin D toxicity from sun exposure is essentially impossible. Supplement toxicity causes hypercalcemia: nausea, weakness, frequent urination, kidney stones, and in severe cases soft tissue calcification.',
    low: 'Bone loss toward osteoporosis, frequent infections, fatigue, depression, muscle weakness and pain, poor wound healing, hair loss, insulin resistance, and suppressed testosterone production.',
    mitigateHigh: 'Stop all vitamin D supplementation. Increase water intake significantly. Reduce dietary calcium temporarily. Most cases resolve within weeks once supplementation stops.',
    mitigateHighMedical: 'See a physician if you experience nausea, vomiting, or confusion with very high vitamin D levels above 150 ng/mL. Severe hypercalcemia requires medical management.',
    mitigateLow: 'Sun exposure is the most natural method — 20-30 minutes of midday sun on arms and legs produces 10,000-20,000 IU. Supplement with vitamin D3 (not D2) at 5,000-10,000 IU/day for deficient adults. Always pair with vitamin K2 (100-200mcg MK-7 form) to direct calcium to bones rather than arteries. Take with a fat-containing meal. Fatty fish, egg yolks, and UV-exposed mushrooms are food sources. Retest after 3 months.',
    mitigateLowMedical: 'See a physician if levels remain below 30 ng/mL after 3 months of supplementation — gut absorption issues or genetic variants may be preventing normalization. Above 5,000 IU/day without monitoring warrants checking calcium and parathyroid hormone.',
    goodFor: 'Bone mineral density, immune regulation, cancer protection, mood and depression prevention, cardiovascular health, testosterone production, insulin sensitivity, and muscle function.',
    badFor: 'Very high vitamin D without vitamin K2 co-supplementation can drive calcium into arteries rather than bones. Supplement toxicity is rare but possible with sustained very high doses.',
  },
};

interface BiomarkerInfo {
  what: string; why: string; high: string; low: string;
  mitigateHigh: string;
  mitigateHighMedical: string;
  mitigateLow: string;
  mitigateLowMedical: string;
  goodFor: string; badFor: string;
}
interface Marker { name: string; value: any; unit?: string; status?: string; category?: string; history?: { value: any; date: string }[] }
interface Props { marker: Marker; onClose: () => void; profile?: any; }

function InfoBlock({ title, text, bg, border, titleColor, textColor }: { title: string; text: string; bg: string; border: string; titleColor: string; textColor: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: titleColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 14, color: textColor, lineHeight: 1.7, margin: 0 }}>{text}</p>
    </div>
  );
}

export default function BiomarkerDetail({ marker, onClose, profile }: Props) {
  const isMobile = useIsMobile();
  const sex = ((profile?.biological_sex) || '').toLowerCase();
  const isMale = sex === 'male';
  const isFemale = sex === 'female';

  // Build sex-aware KNOWN entry — override female-specific copy for male users
  function getSexAwareInfo(base: BiomarkerInfo | undefined): BiomarkerInfo | undefined {
    if (!base) return undefined;
    if (!isMale) return base; // female or unknown: use base as-is
    const overrides: Partial<Record<string, Partial<BiomarkerInfo>>> = {
      'Estrogen': {
        high: 'Weight gain especially around the abdomen, reduced libido, low mood, fatigue, brain fog, breast tissue growth (gynecomastia), reduced muscle tone, and suppressed free testosterone. In men, elevated estrogen directly competes with and displaces testosterone at receptor sites.',
        low: 'Bone loss, joint pain, low libido, cardiovascular risk elevation, and mood instability. Men need a small amount of estrogen for bone density and cardiovascular health — the goal is ratio balance, not elimination.',
        mitigateHigh: 'Cruciferous vegetables (broccoli, cauliflower, Brussels sprouts) contain DIM which directly supports estrogen clearance in men. Increase dietary fiber. Eliminate alcohol — it significantly raises aromatase activity which converts testosterone to estrogen. Reduce excess body fat — adipose tissue produces estrogen via aromatase. Avoid BPA plastics and xenoestrogen exposure (pesticide-heavy foods, conventional meat). Zinc is a natural aromatase inhibitor — prioritize oysters, red meat, pumpkin seeds. Exercise reduces circulating estrogen.',
        mitigateHighMedical: 'See a physician if estrogen is persistently elevated alongside low testosterone, or if gynecomastia is present. Aromatase inhibitors (anastrozole, exemestane) are used in men — but only after exhausting lifestyle measures. If on TRT, estrogen management is part of the protocol.',
        mitigateLow: 'Very low estrogen in men is uncommon — usually from aromatase deficiency or hypogonadism. Ensure adequate body fat (very lean men may have low estrogen). Address any underlying hypogonadism.',
        mitigateLowMedical: 'See a physician — very low estrogen in men requires investigation of the hypothalamic-pituitary-gonadal axis.',
      },
    };
    const markerOverride = overrides[marker.name];
    if (!markerOverride) return base;
    return { ...base, ...markerOverride };
  }

  const [rawInfo, setRawInfo] = useState<BiomarkerInfo | null>(KNOWN[marker.name] || null);
  const info = rawInfo ? getSexAwareInfo(rawInfo) ?? null : null;
  const [loading, setLoading] = useState<boolean>(!KNOWN[marker.name]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (KNOWN[marker.name]) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch('/api/biomarker-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: marker.name, category: marker.category || '', unit: marker.unit || '', sex: sex || 'unknown', age: profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null }) });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) setError(data.error || `Failed (${res.status})`);
        else if (data.what && data.why) setRawInfo(data);
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
    ? (numValue < ref.low ? 'var(--accent-watch)' : numValue > ref.high ? 'var(--accent-elevated)' : 'var(--accent-optimal)')
    : (marker.status === 'high' || marker.status === 'elevated' ? 'var(--accent-elevated)' : marker.status === 'low' ? 'var(--accent-watch)' : 'var(--accent-optimal)');

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,26,15,0.45)', backdropFilter: 'blur(16px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.18)', padding: isMobile ? '20px 16px' : '28px 32px', maxWidth: 640, width: '95%', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>

        {/* Header: value + trend side by side */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{marker.category || 'Biomarker'}</div>
            <h2 style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 26, color: 'var(--text-primary)', margin: '0 0 10px', fontWeight: 500 }}>{marker.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 36, color: statusColor, fontFamily: 'EB Garamond, Georgia, serif', fontWeight: 500 }}>{marker.value}</span>
              {marker.unit && <span style={{ fontSize: 15, color: 'var(--text-tertiary)' }}>{marker.unit}</span>}
              {marker.status && (
                <span style={{ fontSize: 12, color: statusColor, letterSpacing: '0.08em', textTransform: 'uppercase', background: statusColor + '18', border: '1px solid ' + statusColor + '40', borderRadius: 12, padding: '3px 10px' }}>
                  {marker.status}
                </span>
              )}
            </div>
            {/* Range bar under value */}
            <RangeBar value={numValue} markerName={marker.name} unit={marker.unit} />
          </div>

          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Full-width interactive trend chart */}
        {history.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <TrendChart
              history={history}
              markerName={marker.name}
              unit={marker.unit}
              profile={profile}
              allMarkers={(marker as any).allMarkers}
              userId={profile?.id || (marker as any).userId}
              plan={(marker as any).plan || 'free'}
            />
          </div>
        )}

        {/* Personalised context banner */}
        {personalContext && (
          <div style={{ padding: '12px 16px', background: statusColor + '0d', border: `1px solid ${statusColor}33`, borderRadius: 8, marginBottom: 20, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.65 }}>
            {personalContext}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--brand-ghost)', paddingTop: 20 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-dim)', animation: 'aellux-star-twinkle 1s ease-in-out infinite', marginBottom: 14 }} />
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Researching {marker.name}…</div>
            </div>
          )}
          {error && !loading && (
            <div style={{ padding: '12px 18px', background: 'rgba(127,29,29,.06)', border: '1px solid rgba(127,29,29,.2)', borderRadius: 6, color: 'var(--accent-elevated)', fontSize: 14, lineHeight: 1.5 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent-elevated)', marginBottom: 4 }}>⚠ Could not load marker info</div>
              {error}
            </div>
          )}
          {info && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <InfoBlock title="What is it?" text={info.what} bg="var(--bg-sunken)" border="var(--border-subtle)" titleColor="var(--brand-dim)" textColor="var(--text-primary)" />
              <InfoBlock title="Why it matters" text={info.why} bg="var(--bg-sunken)" border="var(--border-subtle)" titleColor="var(--text-secondary)" textColor="var(--text-secondary)" />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <InfoBlock title="If too high" text={info.high} bg="rgba(127,29,29,.04)" border="rgba(127,29,29,.15)" titleColor="var(--accent-elevated)" textColor="var(--text-primary)" />
                <InfoBlock title="If too low" text={info.low} bg="rgba(120,53,15,.04)" border="rgba(120,53,15,.15)" titleColor="var(--accent-watch)" textColor="var(--text-primary)" />
                <div style={{ background: 'rgba(20,83,45,.04)', border: '1px solid rgba(20,83,45,.15)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>To bring it down — natural first</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{info.mitigateHigh}</p>
                  {info.mitigateHighMedical && info.mitigateHighMedical !== 'No medical intervention needed.' && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(20,83,45,.12)' }}>
                      <div style={{ fontSize: 11, color: 'var(--accent-watch)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>When to involve a physician</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{info.mitigateHighMedical}</p>
                    </div>
                  )}
                </div>
                <div style={{ background: 'rgba(30,58,95,.04)', border: '1px solid rgba(30,58,95,.15)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-info)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>To bring it up — natural first</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{info.mitigateLow}</p>
                  {info.mitigateLowMedical && info.mitigateLowMedical !== 'No medical intervention needed.' && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(30,58,95,.12)' }}>
                      <div style={{ fontSize: 11, color: 'var(--accent-watch)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>When to involve a physician</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{info.mitigateLowMedical}</p>
                    </div>
                  )}
                </div>
                <InfoBlock title="Good for" text={info.goodFor} bg="var(--brand-ghost)" border="var(--border-subtle)" titleColor="var(--brand)" textColor="rgba(0,232,184,.9)" />
                <InfoBlock title="Watch out for" text={info.badFor} bg="var(--bg-sunken)" border="var(--border-subtle)" titleColor="var(--text-secondary)" textColor="var(--text-primary)" />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--brand-ghost)', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Educational context only — not medical advice. Consult your physician before making health decisions.
        </div>
      </div>
    </div>
  );
}
