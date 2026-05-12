import React, { useEffect, useState } from 'react';

// Hardcoded KNOWN dictionary kept as instant-load fallback for common markers.
// Anything not in KNOWN is fetched from /api/biomarker-info (cached globally in DB).
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

interface Marker { name: string; value: any; unit?: string; status?: string; category?: string; }

interface Props {
  marker: Marker;
  onClose: () => void;
}

const SECTION = ({ title, text, color = 'rgba(0,210,165,.65)' }: {title:string;text:string;color?:string}) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 6, fontFamily: 'Georgia,serif' }}>{title}</div>
    <p style={{ fontSize: 14, color: 'rgba(0,225,180,.92)', lineHeight: 1.7, margin: 0 }}>{text}</p>
  </div>
);

export default function BiomarkerDetail({ marker, onClose }: Props) {
  const [info, setInfo] = useState<BiomarkerInfo | null>(KNOWN[marker.name] || null);
  const [loading, setLoading] = useState<boolean>(!KNOWN[marker.name]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already in KNOWN, nothing to do
    if (KNOWN[marker.name]) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/biomarker-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: marker.name, category: marker.category || '', unit: marker.unit || '' }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          setError(data.error || `Failed to load biomarker info (${res.status})`);
        } else if (data.what && data.why) {
          setInfo(data);
        } else {
          setError('Aellux returned an unexpected response shape.');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Network error fetching biomarker info');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [marker.name]);

  const statusColor = marker.status === 'high' || marker.status === 'elevated' ? '#f87171'
    : marker.status === 'low' ? '#fb923c'
    : marker.status === 'borderline' ? '#f59e0b'
    : '#34d399';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,10,20,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div style={{ background: 'rgba(2,12,22,0.98)', border: '1px solid rgba(0,210,165,.2)', borderRadius: 12, padding: '32px 36px', maxWidth: 600, width: '90%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{marker.category || 'Biomarker'}</div>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 24, color: 'rgba(220,255,235,1)', margin: '0 0 8px', fontWeight: 400 }}>{marker.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, color: statusColor, fontFamily: 'Georgia,serif' }}>{marker.value}</span>
              {marker.unit && <span style={{ fontSize: 14, color: 'rgba(0,210,165,.5)' }}>{marker.unit}</span>}
              {marker.status && <span style={{ fontSize: 11, color: statusColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 8, background: statusColor + '18', border: '1px solid ' + statusColor + '40', borderRadius: 12, padding: '2px 10px' }}>{marker.status}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(0,210,165,.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ borderTop: '1px solid rgba(0,210,165,.1)', paddingTop: 20 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,210,165,.8)', animation: 'aellux-star-twinkle 1s ease-in-out infinite', marginBottom: 14 }} />
              <div style={{ fontSize: 13, color: 'rgba(0,210,165,.65)', fontStyle: 'italic', letterSpacing: '0.05em' }}>Aellux is researching this marker…</div>
              <div style={{ fontSize: 11, color: 'rgba(0,210,165,.4)', marginTop: 6 }}>Generated once, then cached for everyone.</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: '12px 18px', background: 'rgba(80,12,12,.4)', border: '1px solid rgba(255,120,80,.45)', borderRadius: 6, color: 'rgba(255,200,180,1)', fontSize: 13, lineHeight: 1.5 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,160,100,.85)', marginBottom: 4 }}>⚠ Could not load marker info</div>
              {error}
            </div>
          )}

          {info && !loading && (
            <>
              <SECTION title="What is it?" text={info.what} />
              <SECTION title="Why it matters" text={info.why} color="rgba(0,210,165,.5)" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(248,113,113,.85)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>If too high</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,180,180,.9)', lineHeight: 1.65, margin: 0 }}>{info.high}</p>
                </div>
                <div style={{ background: 'rgba(251,146,60,.06)', border: '1px solid rgba(251,146,60,.15)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(251,146,60,.85)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>If too low</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,200,150,.9)', lineHeight: 1.65, margin: 0 }}>{info.low}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div style={{ background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.15)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(52,211,153,.85)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Mitigate high</div>
                  <p style={{ fontSize: 13, color: 'rgba(160,240,200,.9)', lineHeight: 1.65, margin: 0 }}>{info.mitigateHigh}</p>
                </div>
                <div style={{ background: 'rgba(56,189,248,.04)', border: '1px solid rgba(56,189,248,.15)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(56,189,248,.85)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Mitigate low</div>
                  <p style={{ fontSize: 13, color: 'rgba(160,220,255,.9)', lineHeight: 1.65, margin: 0 }}>{info.mitigateLow}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,210,165,.12)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(0,225,180,.85)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Good for</div>
                  <p style={{ fontSize: 13, color: 'rgba(0,232,184,.9)', lineHeight: 1.65, margin: 0 }}>{info.goodFor}</p>
                </div>
                <div style={{ background: 'rgba(167,139,250,.04)', border: '1px solid rgba(167,139,250,.15)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(167,139,250,.85)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Watch out for</div>
                  <p style={{ fontSize: 13, color: 'rgba(200,180,255,.9)', lineHeight: 1.65, margin: 0 }}>{info.badFor}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0,210,165,.08)', fontSize: 11, color: 'rgba(0,210,165,.35)', lineHeight: 1.5 }}>
          This information is educational and not medical advice. Always consult your physician before making health decisions.
        </div>
      </div>
    </div>
  );
}
