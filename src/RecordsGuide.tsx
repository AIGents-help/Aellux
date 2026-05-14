// @ts-nocheck
import React, { useState } from 'react';

// Affiliate/referral links — swap in real affiliate URLs when approved
const AFFILIATE = {
  function_health: 'https://www.functionhealth.com/?ref=aellux',
  labcorp: 'https://www.labcorpondemand.com/?ref=aellux',
  quest: 'https://www.questhealth.com/?ref=aellux',
  inside_tracker: 'https://www.insidetracker.com/a/aellux',
  nebula: 'https://nebula.org/?ref=aellux',
  dexafit: 'https://www.dexafit.com/?ref=aellux',
  thorne: 'https://www.thorne.com/a/aellux',
  momentous: 'https://www.livemomentous.com/?ref=aellux',
};

const SOURCES = [
  {
    tier: 1,
    id: 'function',
    name: 'Function Health',
    tagline: 'Recommended lab partner — 100+ biomarkers, upload results to Aellux',
    price: '$499/year',
    what: 'Comprehensive annual panel covering all hormones, metabolic markers, cardiovascular risk, thyroid, inflammatory, nutritional, and more. Physician-reviewed. Results upload directly to Aellux.',
    why: 'Function Health orders your labs, delivers the numbers, and stops there. Aellux is what happens next — the synthesis, the cascade analysis, the protocol, the accountability layer. Upload your Function Health results to Aellux and you have the full stack: their lab, our intelligence.',
    turnaround: '5-7 days',
    affiliate: true,
    link: AFFILIATE.function_health,
    cta: 'Order Function Health →',
    badge: 'Most recommended',
    badgeColor: 'var(--brand)',
    markers: ['Full hormone panel', 'Metabolic markers', 'Cardiovascular risk', 'Thyroid (T3, T4, TSH)', 'Inflammatory markers', 'Vitamins & minerals'],
  },
  {
    tier: 1,
    id: 'labcorp',
    name: 'Labcorp OnDemand',
    tagline: 'Order specific panels — no doctor required',
    price: '$49–$399 per panel',
    what: 'Direct-to-consumer lab testing. Order online, draw at a local Labcorp location, results in 1-3 days. Build exactly the panel Aellux says you need.',
    why: 'If you have specific markers Aellux flagged as missing from your picture, order just those. Cheaper than a full panel if you know what you need.',
    turnaround: '1-3 days',
    affiliate: true,
    link: AFFILIATE.labcorp,
    cta: 'Order at Labcorp →',
    badge: null,
    markers: ['Testosterone & hormones', 'Thyroid panel', 'Metabolic / glucose', 'Lipids & ApoB', 'Vitamins & minerals'],
  },
  {
    tier: 1,
    id: 'quest',
    name: 'Quest Health',
    tagline: 'Wide network, competitive pricing',
    price: '$35–$299 per panel',
    what: 'Direct-to-consumer testing at 2,200+ Quest locations nationwide. Good for baseline panels and specific marker follow-ups.',
    why: 'Often cheaper than Labcorp for specific panels. Large nationwide presence.',
    turnaround: '1-5 days',
    affiliate: true,
    link: AFFILIATE.quest,
    cta: 'Order at Quest →',
    badge: null,
    markers: ['Basic metabolic panel', 'Complete blood count', 'Hormone panels', 'Lipid panels'],
  },
  {
    tier: 2,
    id: 'insidetracker',
    name: 'InsideTracker',
    tagline: 'Longevity-focused with biological age scoring',
    price: '$299–$589',
    what: 'Blood testing with a focus on longevity biomarkers and biological age. They provide their own optimization suggestions — upload results to Aellux for a second, deeper perspective.',
    why: 'Their biological age score is a useful data point. Aellux will cross-reference their findings with your full protocol.',
    turnaround: '5-7 days',
    affiliate: true,
    link: AFFILIATE.inside_tracker,
    cta: 'Order InsideTracker →',
    badge: null,
    markers: ['Longevity biomarkers', 'Biological age score', 'Performance markers', 'Hormones'],
  },
  {
    tier: 2,
    id: 'dexa',
    name: 'DEXA Body Composition Scan',
    tagline: 'Gold-standard body composition data',
    price: '$45–$75',
    what: 'The most accurate measurement of body fat %, lean mass, visceral fat, and bone density (T-score). A single scan gives Aellux data it cannot get anywhere else.',
    why: 'Visceral fat and bone density are major inputs for Aellux\'s risk models that a blood draw alone cannot provide.',
    turnaround: 'Same day',
    affiliate: true,
    link: AFFILIATE.dexafit,
    cta: 'Find a DexaFit location →',
    badge: 'High-value add',
    badgeColor: 'rgba(167,139,250,.9)',
    markers: ['Body fat %', 'Lean muscle mass', 'Visceral fat score', 'Bone density (T-score)', 'Regional fat distribution'],
  },
  {
    tier: 2,
    id: 'nebula',
    name: 'Nebula Genomics',
    tagline: 'Whole genome — permanent biological context',
    price: '$299',
    what: 'Whole genome sequencing (not just the SNPs 23andMe covers). Genetic data uploaded to Aellux becomes permanent context for every recommendation — pharmacogenomics, disease risk genes, nutrient metabolism variants.',
    why: 'Your genome doesn\'t change. Upload it once and Aellux factors it into every protocol, supplement recommendation, and risk assessment forever.',
    turnaround: '4-6 weeks',
    affiliate: true,
    link: AFFILIATE.nebula,
    cta: 'Order Nebula Genomics →',
    badge: 'Lifetime value',
    badgeColor: 'rgba(129,140,248,.9)',
    markers: ['Pharmacogenomics', 'Disease risk variants', 'Nutrient metabolism genes', 'Hormone sensitivity', 'Longevity-associated variants'],
  },
  {
    tier: 3,
    id: 'wearable',
    name: 'Export from your wearable',
    tagline: 'Apple Health, Garmin, Oura, Fitbit — free',
    price: 'Free',
    what: 'Your wearable already tracks HRV, sleep stages, resting heart rate, recovery score, VO2 max estimates, and activity. Export it and upload to Aellux.',
    why: 'Continuous data over time is often more valuable than a single blood draw. Aellux overlays wearable data with blood markers to find correlations.',
    turnaround: 'Instant',
    affiliate: false,
    link: null,
    cta: null,
    badge: 'Free',
    badgeColor: 'rgba(52,211,153,.9)',
    markers: ['HRV', 'Sleep stages', 'Resting heart rate', 'Recovery score', 'Activity & steps'],
    instructions: [
      { device: 'Apple Health', steps: 'Health app → your profile icon → Export All Health Data → share the zip file' },
      { device: 'Garmin Connect', steps: 'garmin.com → Activities → Export to CSV, or use the Health Snapshot report' },
      { device: 'Oura Ring', steps: 'Oura app → Profile → Download My Data → export CSV' },
      { device: 'Fitbit', steps: 'Account → Data Export → Export Account Archive' },
    ],
  },
  {
    tier: 3,
    id: 'doctor',
    name: 'Request from your doctor',
    tagline: 'Free — they are legally required to provide it',
    price: 'Free',
    what: 'Under HIPAA and the 21st Century Cures Act, your physician must provide your medical records including all lab results, typically within 30 days (often within days electronically).',
    why: 'You may have years of lab data sitting in your patient portal or physician\'s system. This is the most comprehensive historical record Aellux can work with.',
    turnaround: '1-30 days',
    affiliate: false,
    link: null,
    cta: null,
    badge: null,
    emailTemplate: `Subject: Request for Complete Medical Records and Lab Results

Dear [Doctor's name],

I am requesting a complete copy of my medical records, including all laboratory results, under my rights provided by HIPAA (45 CFR §164.524).

Please include:
- All laboratory results and blood panels
- Physician notes from all visits
- Any imaging or diagnostic results
- Immunization records

I prefer to receive these electronically in PDF or CSV format if possible. Please send to [your email].

Thank you,
[Your name]
Date of birth: [DOB]`,
  },
];

const SUPPLEMENT_AFFILIATES = [
  { name: 'Thorne', desc: 'NSF-certified, clinician-grade supplements. Aellux recommends Thorne formulations frequently for their purity and bioavailability.', link: AFFILIATE.thorne, cta: 'Shop Thorne →' },
  { name: 'Momentous', desc: 'Performance-focused supplements with third-party testing. Strong on testosterone support, sleep, and recovery formulations.', link: AFFILIATE.momentous, cta: 'Shop Momentous →' },
];

export default function RecordsGuide() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSupps, setShowSupps] = useState(false);

  const copyTemplate = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const tierGroups = [
    { tier: 1, label: 'Comprehensive lab testing', sub: 'The fastest path to a complete biological picture' },
    { tier: 2, label: 'Specialized data', sub: 'Body composition, genetics, and longevity-focused panels' },
    { tier: 3, label: 'Free options', sub: 'No cost — you already own this data' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Get Your Health Data</div>
        <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 24, color: 'var(--text-primary)', marginBottom: 10 }}>
          Aellux is only as powerful as the data you give it.
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
          Most people don't have their medical records — not because they don't exist, but because the system makes retrieval inconvenient. Here is every path to getting your biology into Aellux, ranked by completeness.
        </p>
      </div>

      {tierGroups.map(group => (
        <div key={group.tier} style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'rgba(220,255,235,.7)', fontWeight: 500, marginBottom: 2 }}>{group.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{group.sub}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SOURCES.filter(s => s.tier === group.tier).map(source => {
              const isOpen = expanded === source.id;
              return (
                <div key={source.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${isOpen ? 'var(--text-tertiary)' : 'var(--border-subtle)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color .2s' }}>
                  {/* Header */}
                  <div onClick={() => setExpanded(isOpen ? null : source.id)}
                    style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500 }}>{source.name}</span>
                        {source.badge && (
                          <span style={{ fontSize: 11, padding: '2px 8px', background: source.badgeColor + '20', border: `1px solid ${source.badgeColor}55`, borderRadius: 10, color: source.badgeColor, letterSpacing: '0.06em' }}>
                            {source.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{source.tagline}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 15, color: 'rgba(220,255,235,.8)', fontWeight: 500 }}>{source.price}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{source.turnaround}</div>
                    </div>
                    <span style={{ fontSize: 16, color: 'rgba(0,210,165,.3)', flexShrink: 0, marginTop: 2, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--brand-ghost)' }}>
                      <p style={{ fontSize: 14, color: 'rgba(180,240,210,.8)', lineHeight: 1.75, margin: '16px 0 10px', fontWeight: 300 }}>{source.what}</p>

                      <div style={{ padding: '10px 14px', background: 'var(--brand-ghost)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 14 }}>
                        <strong style={{ color: 'var(--brand)' }}>Why Aellux recommends this: </strong>{source.why}
                      </div>

                      {/* Markers covered */}
                      {source.markers && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Markers covered</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {source.markers.map(m => (
                              <span key={m} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--brand-ghost)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'rgba(0,225,180,.75)' }}>{m}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Wearable instructions */}
                      {source.instructions && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>How to export</div>
                          {source.instructions.map(inst => (
                            <div key={inst.device} style={{ marginBottom: 8, padding: '10px 14px', background: 'var(--bg-sunken)', border: '1px solid var(--brand-ghost)', borderRadius: 6 }}>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{inst.device}</div>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{inst.steps}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Doctor email template */}
                      {source.emailTemplate && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Email template — copy and send</div>
                          <div style={{ padding: '14px 16px', background: 'rgba(0,4,12,.7)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: 'rgba(0,225,180,.75)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                            {source.emailTemplate}
                          </div>
                          <button onClick={() => copyTemplate(source.emailTemplate)}
                            style={{ fontSize: 13, padding: '7px 16px', background: copied ? 'rgba(52,211,153,.12)' : 'var(--brand-ghost)', border: `1px solid ${copied ? 'rgba(52,211,153,.4)' : 'var(--border-subtle)'}`, borderRadius: 5, color: copied ? 'var(--accent-optimal)' : 'var(--brand-dim)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
                            {copied ? '✓ Copied to clipboard' : 'Copy email template'}
                          </button>
                        </div>
                      )}

                      {/* CTA */}
                      {source.link && source.cta && (
                        <div>
                          <a href={source.link} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-block', fontSize: 14, color: 'rgba(0,20,14,1)', background: 'var(--brand)', padding: '11px 24px', borderRadius: 6, textDecoration: 'none', fontFamily: 'inherit', fontWeight: 600, transition: 'background .2s' }}>
                            {source.cta}
                          </a>
                          {source.affiliate && (
                            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.3)', marginTop: 6 }}>Aellux may receive a referral fee — never influences our recommendations</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Supplement affiliates */}
      <div style={{ marginBottom: 20 }}>
        <div onClick={() => setShowSupps(!showSupps)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSupps ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 13, color: 'rgba(220,255,235,.7)', fontWeight: 500, marginBottom: 2 }}>Supplement sourcing</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Where to buy what Aellux recommends</div>
          </div>
          <span style={{ fontSize: 16, color: 'var(--text-tertiary)', transform: showSupps ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
        </div>
        {showSupps && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SUPPLEMENT_AFFILIATES.map(s => (
              <div key={s.name} style={{ padding: '14px 16px', background: 'rgba(0,8,18,.45)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 6 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 12 }}>{s.desc}</div>
                <a href={s.link} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: 'var(--brand)', background: 'var(--brand-ghost)', border: '1px solid var(--border-subtle)', padding: '7px 16px', borderRadius: 5, textDecoration: 'none', fontFamily: 'inherit', transition: 'all .2s' }}>
                  {s.cta}
                </a>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'rgba(0,210,165,.3)', lineHeight: 1.6 }}>
              Aellux may receive a referral fee from these links. We only list supplement brands with third-party testing and clinician-grade standards — the recommendation never comes from the affiliate relationship.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
