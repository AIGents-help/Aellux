import React, { useMemo, useState } from 'react';

interface Props {
  weekData: any;
  selectedMealKeys: Record<string, string>;
  weekView: React.ReactNode;
  onPrint?: (section: 'week' | 'stack' | 'grocery' | 'today') => void;
  allMarkers?: any[];
  profile?: any;
  userId?: string;
}

// ---- helpers ---------------------------------------------------------------

// Parse a supplement string into { name, dose }.
// Handles:
//   "Magnesium glycinate 300mg"
//   "Magnesium glycinate 350mg (elevated for post-strength soreness management)"
//   "Casein protein shake optional (before bed): casein 30g + whole milk..."
//   "Flax seeds 1 tbsp ground (brewed into tea or sprinkled on yogurt if desired)"
function parseSupp(raw: string) {
  let s = String(raw).trim();
  // Strip everything after the first parenthesis (it's always a rationale/note, not the name)
  s = s.replace(/\s*\(.*$/, '').trim();
  // Strip "optional" flag
  s = s.replace(/\s+optional$/i, '').trim();
  // Strip colon-separated rationale: "Casein protein shake: casein 30g..." → "Casein protein shake"
  s = s.split(':')[0].trim();
  // Now extract dose: match trailing quantity like "300mg", "2g EPA/DHA", "5g", "2000 IU", "1 tbsp"
  const doseMatch = s.match(/\s+(\d+[\d./]*\s*(?:mg|mcg|g|kg|iu|IU|ml|l|tbsp|tsp|µg|%)[^\s]*(?:\s+[A-Z][A-Z/]+)?)\s*$/i);
  if (doseMatch) {
    const dose = doseMatch[1].trim();
    const name = s.slice(0, s.length - doseMatch[0].length).trim();
    return { name, dose };
  }
  return { name: s, dose: '' };
}

// Normalize supplement name for deduplication key:
// strips doses, amounts, and common filler words so variants consolidate.
function suppKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+\d[\d./]*\s*(mg|mcg|g|iu|tbsp|tsp|ml)[\w/]*/gi, '') // inline doses
    .replace(/\b(supplement|extract|complex|formula|powder|capsule|tablet|optional)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Aggregate every supp across the week, deduplicated by normalized name.
// Different doses of the same supplement are shown as a range, not as separate items.
function aggregateSupps(weekData: any) {
  const map = new Map<string, { name: string; doses: Set<string>; ampm: Set<string>; days: Set<string> }>();
  if (!weekData?.days) return [];
  for (const d of weekData.days) {
    const am = d.morning?.supps_am || [];
    const pm = d.evening?.supps_pm || [];
    for (const s of am) {
      const { name, dose } = parseSupp(s);
      const key = suppKey(name);
      if (!map.has(key)) map.set(key, { name, doses: new Set(), ampm: new Set(), days: new Set() });
      const ref = map.get(key)!;
      if (dose) ref.doses.add(dose);
      ref.ampm.add('am');
      ref.days.add(d.day);
    }
    for (const s of pm) {
      const { name, dose } = parseSupp(s);
      const key = suppKey(name);
      if (!map.has(key)) map.set(key, { name, doses: new Set(), ampm: new Set(), days: new Set() });
      const ref = map.get(key)!;
      if (dose) ref.doses.add(dose);
      ref.ampm.add('pm');
      ref.days.add(d.day);
    }
  }
  return Array.from(map.values()).map(s => {
    // Consolidate doses: extract numeric values, show min–max range if they differ
    const doseValues = Array.from(s.doses);
    let doseDisplay = '';
    if (doseValues.length === 0) {
      doseDisplay = '';
    } else if (doseValues.length === 1) {
      doseDisplay = doseValues[0];
    } else {
      // Extract unit from first dose
      const unitMatch = doseValues[0].match(/[a-zA-Z%µ][a-zA-Z/%µ]*/);
      const unit = unitMatch ? unitMatch[0] : '';
      const nums = doseValues.map(d => parseFloat(d)).filter(n => !isNaN(n));
      if (nums.length > 1) {
        const mn = Math.min(...nums), mx = Math.max(...nums);
        doseDisplay = mn === mx ? `${mn}${unit}` : `${mn}–${mx}${unit}`;
      } else {
        doseDisplay = doseValues[0];
      }
    }
    return {
      name: s.name,
      dose: doseDisplay,
      ampm: s.ampm.size === 2 ? 'AM + PM' : (s.ampm.has('am') ? 'AM' : 'PM'),
      days: Array.from(s.days),
      everyDay: s.days.size >= 7,
    };
  });
}

// Aggregate every grocery item across all selected meals, categorized.
// Extract the base ingredient name by stripping quantities, prep notes, and punctuation.
// "chicken breast 5oz grilled" → "chicken breast"
// "frozen broccoli 1 cup" → "broccoli"
// "olive oil 1.5 tbsp + lemon juice" → "olive oil"  (stops at + combos)
function extractIngredientName(raw: string): string {
  let s = raw.toLowerCase().trim();
  // Stop at additive combos (e.g. "olive oil + lemon juice" → just "olive oil")
  s = s.split(/\s*[+&]\s*/)[0].trim();
  // Strip leading "frozen", "canned", "cooked", "fresh", "raw", "dried", "plain"
  s = s.replace(/^(frozen|canned|cooked|fresh|raw|dried|plain|sliced|diced|minced|roasted|baked|grilled|boiled|whole|large|medium|small)\s+/g, '');
  // Strip trailing quantity patterns: "5oz", "1 cup", "2 slices", "0.75 cup drained", etc.
  s = s.replace(/\s+[\d./]+\s*(oz|g|lb|kg|cup|cups|tbsp|tsp|ml|l|slice|slices|piece|pieces|clove|cloves|medium|large|small|serving|scoop|handful)[\w\s]*/i, '');
  // Strip trailing prep descriptors
  s = s.replace(/\s+(grilled|cooked|soft-boiled|hard-boiled|lean|dry|drained|chopped|minced|roasted|baked|sliced|sautéed)$/i, '');
  return s.trim();
}

// Categorize by ingredient name — check fats/oils BEFORE fruit to avoid
// "olive oil + lemon" being classified as Fruit
function categorize(name: string): string {
  const lc = name.toLowerCase();
  if (/(olive oil|avocado oil|coconut oil|ghee|nut butter|peanut butter|almond butter|tahini|nut|seed|chia|flax|almond|walnut|pumpkin seed|sunflower|avocado)/i.test(lc)) return 'Fats, nuts & seeds';
  if (/(chicken|beef|ground beef|ground turkey|pork|turkey|salmon|tuna|cod|halibut|shrimp|tofu|tempeh|egg|cottage cheese|greek yogurt|casein|whey)/i.test(lc)) return 'Proteins';
  if (/(milk|butter|cheese|cream|kefir|feta|mozzarella|cheddar|parmesan)/i.test(lc)) return 'Dairy';
  if (/(bean|lentil|chickpea|black bean|kidney|pinto|navy)/i.test(lc)) return 'Legumes';
  if (/(rice|oat|oatmeal|quinoa|barley|pasta|bread|tortilla|noodle|farro|bulgur|millet|potato|sweet potato|couscous)/i.test(lc)) return 'Grains & starches';
  if (/(spinach|kale|broccoli|cauliflower|carrot|tomato|cucumber|pepper|onion|garlic|lettuce|arugula|cabbage|asparagus|zucchini|squash|beet|mushroom|salad mix)/i.test(lc)) return 'Vegetables';
  if (/(berr|apple|banana|orange|lemon|lime|peach|pear|grape|melon|kiwi|mango|pineapple|blueberr|strawberr)/i.test(lc)) return 'Fruit';
  if (/(salt|pepper|spice|herb|cumin|turmeric|cinnamon|ginger|paprika|oregano|basil|thyme|rosemary|soy sauce|tamari|vinegar|mustard|honey|sriracha|hot sauce)/i.test(lc)) return 'Pantry / seasoning';
  return 'Other';
}

function aggregateGrocery(weekData: any, selectedMealKeys: Record<string, string>) {
  if (!weekData?.days) return { byCategory: {}, total: 0 };

  // Collect all raw item strings — respects active swap selections
  const allItems: string[] = [];
  for (let i = 0; i < weekData.days.length; i++) {
    const day = weekData.days[i];
    if (!day.meals) continue;
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const meal = day.meals[slot];
      if (!meal) continue;
      const swapKey = selectedMealKeys[`${i}|${slot}`];
      // If user has swapped this meal and the alt has items, use those
      const swappedAlt = swapKey && meal.alternatives?.find((a: any) => a.swap === swapKey);
      const items = (swappedAlt as any)?.items || meal.items;
      if (items) allItems.push(...items);
    }
  }

  // Consolidate: group by normalized ingredient name, keep the first (cleanest) label
  const nameToLabel = new Map<string, string>();
  for (const raw of allItems) {
    if (!raw?.trim()) continue;
    const normalized = extractIngredientName(raw);
    if (normalized.length < 2) continue;
    // Keep the shortest/cleanest label as the display name
    if (!nameToLabel.has(normalized)) {
      // Display label: strip qty but keep prep context if short
      const display = raw.split(/\s*[+&]\s*/)[0].trim()
        .replace(/\s+[\d./]+\s*(oz|g|lb|kg|cup|cups|tbsp|tsp|ml|l|slice|slices|piece|pieces|clove|cloves)[\w\s]*/i, '')
        .replace(/\s+(grilled|cooked|lean|dry|drained|chopped|minced|roasted|baked|sliced)$/i, '')
        .trim();
      nameToLabel.set(normalized, display || normalized);
    }
  }

  // Categorize consolidated items
  const byCategory: Record<string, string[]> = {};
  for (const [normalized, label] of nameToLabel.entries()) {
    const cat = categorize(normalized);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(label);
  }

  // Sort items alphabetically within each category
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => a.localeCompare(b));
  }

  const total = Array.from(nameToLabel.keys()).length;
  return { byCategory, total };
}

// ---- subcomponents ---------------------------------------------------------

function SuppDetail({ supp, allMarkers, profile, userId, onClose }: { supp: any; allMarkers: any[]; profile: any; userId?: string; onClose: () => void }) {
  const [info, setInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/supplement-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: supp.name, dose: supp.dose, userId, allMarkers, profile }),
    }).then(r => r.json()).then(d => { setInfo(d); setLoading(false); }).catch(() => setLoading(false));
  }, [supp.name]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,26,15,.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 14, padding: '32px 28px', maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Supplement</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>{supp.name}</h2>
            {supp.dose && <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>{supp.dose} · {supp.ampm} · {supp.everyDay ? 'Daily' : `${supp.days.length}×/week`}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-tertiary)', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
            Aellux is cross-referencing your biomarkers…
          </div>
        ) : info?.error ? (
          <div style={{ color: 'var(--accent-elevated)', fontSize: 14 }}>Could not load supplement info.</div>
        ) : info ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InfoBlock icon="🎯" label="Why you specifically need this" text={info.why_you} accent="var(--brand-dim)" />
            <InfoBlock icon="⚙" label="How it works" text={info.mechanism} accent="var(--accent-info)" />
            <InfoBlock icon="📈" label="What to expect" text={info.what_to_expect} accent="var(--accent-optimal)" />
            <InfoBlock icon="💡" label="Best practice" text={info.best_practice} accent="var(--accent-watch)" />
            {info.caution && info.caution !== 'null' && (
              <InfoBlock icon="⚠" label="Note" text={info.caution} accent="var(--accent-elevated)" />
            )}
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              Educational context only — not medical advice. Consult your physician before starting any new supplement.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, text, accent }: { icon: string; label: string; text: string; accent: string }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-sunken)', borderRadius: 8, borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent, marginBottom: 6 }}>{icon} {label}</div>
      <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>{text}</p>
    </div>
  );
}

function SuppStack({ weekData, allMarkers, profile, userId }: { weekData: any; allMarkers?: any[]; profile?: any; userId?: string }) {
  const supps = useMemo(() => aggregateSupps(weekData), [weekData]);
  const [selected, setSelected] = React.useState<any>(null);

  if (supps.length === 0) return <div style={{ padding: '20px', color: 'var(--text-tertiary)' }}>No supplements listed in this week's protocol.</div>;
  return (
    <div>
      <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
        {supps.length} supplements · tap any to see why it was prescribed for your biology.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {supps.map((s, i) => (
          <button key={i} onClick={() => setSelected(s)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color .15s, box-shadow .15s', width: '100%' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(3,26,13,.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</div>
              {s.dose && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>{s.dose}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', background: 'var(--brand-ghost)', borderRadius: 10, border: '1px solid var(--brand-border)' }}>{s.ampm}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.everyDay ? 'Daily' : `${s.days.length}×/wk`}</div>
              <div style={{ fontSize: 14, color: 'var(--brand-dim)', opacity: 0.6 }}>→</div>
            </div>
          </button>
        ))}
      </div>
      {selected && <SuppDetail supp={selected} allMarkers={allMarkers || []} profile={profile} userId={userId} onClose={() => setSelected(null)} />}
    </div>
  );
}

function GroceryList({ weekData, selectedMealKeys }: { weekData: any; selectedMealKeys: Record<string, string> }) {
  const { byCategory, total } = useMemo(() => aggregateGrocery(weekData, selectedMealKeys), [weekData, selectedMealKeys]);
  if (total === 0) return <div style={{ padding: '20px', color: 'var(--text-tertiary)' }}>No grocery items found in this week's meals.</div>;
  const order = ['Proteins', 'Vegetables', 'Grains & starches', 'Legumes', 'Dairy', 'Fats, nuts & seeds', 'Fruit', 'Pantry / seasoning', 'Other'];
  const categories = order.filter(c => byCategory[c]);
  return (
    <div>
      <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
        {total} unique ingredients · {categories.length} categories · swaps update this list automatically
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {categories.map(category => (
          <div key={category} style={{ padding: '16px 20px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              {category} · {byCategory[category].length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 24px' }}>
              {byCategory[category].map((item: string, i: number) => (
                <div key={i} style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, minWidth: 160 }}>• {item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function todayIndex() {
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[new Date().toLocaleDateString('en-US', { weekday: 'long' })] ?? 0;
}

function TodayChecklist({ weekData, selectedMealKeys }: { weekData: any; selectedMealKeys: Record<string, string> }) {
  const tIdx = todayIndex();
  const days = weekData?.days || [];

  // Try to match by day name first, then fall back to index, then day 0
  let day = days.find((d: any) => d.day?.toLowerCase() === new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
  let resolvedIdx = days.indexOf(day);
  if (!day) {
    // Fall back to position index
    day = days[tIdx] || days[0];
    resolvedIdx = days[tIdx] ? tIdx : 0;
  }

  if (!day) return <div style={{ padding: '20px', color: 'var(--text-tertiary)' }}>Generate your protocol first to see today's plan.</div>;

  const resolveMeal = (slot: string) => {
    const meal = day.meals?.[slot];
    if (!meal) return null;
    const swap = selectedMealKeys[`${resolvedIdx}|${slot}`];
    if (swap && meal.alternatives) {
      const alt = meal.alternatives.find((a: any) => a.swap === swap);
      if (alt) return { name: alt.name, swapped: true };
    }
    return { name: meal.name, swapped: false };
  };

  return (
    <div>
      <div style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
        Today is <strong style={{ color: 'var(--text-primary)' }}>{day.day} · {day.theme}</strong>
        {day.focus_marker && <> · Focus: {day.focus_marker}</>}
      </div>

      {/* Self-monitoring note */}
      <div style={{ marginBottom: 18, padding: '12px 16px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Print this page</strong> and check off each item as you complete it.
          This is intentionally self-monitored — your results are only as honest as your effort.
          In a future version, Aellux will track completion in-app and adapt your protocol accordingly.
          For now, the most effective thing you can do is be honest with yourself.
        </div>
        <button onClick={() => window.print()} style={{ marginTop: 10, fontSize: 13, color: '#fff', background: '#1a4731', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
          🖨 Print Today's Checklist
        </button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .today-checklist, .today-checklist * { visibility: visible !important; }
          .today-checklist { position: fixed; top: 0; left: 0; width: 100%; padding: 32px; }
          .today-checklist .print-hide { display: none !important; }
          .today-checklist .check-box {
            display: inline-block !important;
            width: 14px; height: 14px;
            border: 2px solid #1a4731;
            border-radius: 2px;
            margin-right: 8px;
            vertical-align: middle;
          }
        }
      `}</style>

      <div className="today-checklist">
        <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {day.day} · {day.theme}
        </div>

      {day.morning && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(255,200,80,.04)', border: '1px solid rgba(255,200,80,.18)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--accent-watch)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>☀ Morning {day.morning.wake_time ? `· ${day.morning.wake_time}` : ''}</div>
          {day.morning.actions?.map((a: string, i: number) => (
            <div key={i} style={{ fontSize: 16, color: 'var(--text-primary)', padding: '5px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span className="check-box" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #1a4731', borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
              {a}
            </div>
          ))}
          {day.morning.supps_am?.map((s: string, i: number) => (
            <div key={`s${i}`} style={{ fontSize: 16, color: 'var(--text-secondary)', padding: '5px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span className="check-box" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #1a4731', borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
              Take {s}
            </div>
          ))}
        </div>
      )}

      {day.meals && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--brand-dim)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🍽 Meals</div>
          {['breakfast', 'lunch', 'dinner'].map(slot => {
            const m = resolveMeal(slot);
            if (!m) return null;
            return (
              <div key={slot} style={{ fontSize: 16, color: 'var(--text-primary)', padding: '5px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span className="check-box" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #1a4731', borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
                <span><strong style={{ textTransform: 'capitalize', color: 'var(--brand-dim)' }}>{slot}:</strong> {m.name}
                {m.swapped && <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', background: 'var(--border-subtle)', borderRadius: 3, color: 'var(--brand-dim)', letterSpacing: '0.06em' }}>SWAPPED</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {day.movement && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(30,58,95,.04)', border: '1px solid rgba(30,58,95,.12)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--accent-info)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>⚡ Movement</div>
          <div style={{ fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span className="check-box" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #1a4731', borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
            {day.movement.type}{day.movement.duration ? ` · ${day.movement.duration}` : ''}{day.movement.when ? ` · ${day.movement.when}` : ''}
          </div>
        </div>
      )}

      {day.evening && (
        <div style={{ padding: '14px 18px', background: 'rgba(88,28,135,.04)', border: '1px solid rgba(88,28,135,.12)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#6d28d9', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🌙 Evening {day.evening.sleep_target ? `· sleep ${day.evening.sleep_target}` : ''}</div>
          {day.evening.supps_pm?.map((s: string, i: number) => (
            <div key={i} style={{ fontSize: 16, color: 'var(--text-primary)', padding: '5px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span className="check-box" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #1a4731', borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
              Take {s}
            </div>
          ))}
          {day.evening.wind_down && (
            <div style={{ fontSize: 16, color: 'var(--text-primary)', padding: '5px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span className="check-box" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #1a4731', borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
              {day.evening.wind_down}
            </div>
          )}
        </div>
      )}

      {/* Print footer */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-tertiary)' }}>
        Generated by Aellux · aellux.health · {day.day} protocol
      </div>

      </div>
    </div>
  );
}

// ---- main ------------------------------------------------------------------

export default function DerivedViews({ weekData, selectedMealKeys, weekView, onPrint, allMarkers, profile, userId }: Props) {
  const [tab, setTab] = useState<'week' | 'today' | 'stack' | 'grocery'>('week');

  const printSection = () => {
    const sectionId = 'print-section-' + tab;
    const el = document.getElementById(sectionId);
    if (!el) { window.print(); return; }
    const content = el.innerHTML;
    const w = window.open('', '_blank');
    if (!w) return;
    const css = [
      'body{font-family:"DM Sans",system-ui,sans-serif;padding:32px;color:#0f1a0f;max-width:700px;margin:0 auto}',
      'h1{font-size:24px;margin-bottom:4px}',
      '.section-header{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#3a4a3a;margin-bottom:16px}',
      '.category{background:#f5f3ef;border-radius:8px;padding:14px 18px;margin-bottom:10px}',
      '.cat-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#3a4a3a;margin-bottom:8px}',
      '.items{display:flex;flex-wrap:wrap;gap:4px 24px}',
      '.item{font-size:15px;min-width:160px;line-height:1.7}',
      '.supp-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid #e0ddd6;border-radius:8px;margin-bottom:8px}',
      '.supp-name{font-size:16px;font-weight:500;flex:1}',
      '.badge{font-size:11px;padding:3px 8px;background:#f0f7f0;border:1px solid #c8dfc8;border-radius:10px;letter-spacing:.08em;text-transform:uppercase}',
      '.check-row{display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:16px}',
      '.checkbox{width:16px;height:16px;border:2px solid #1a4731;border-radius:2px;flex-shrink:0;margin-top:2px}',
      '.section-block{border:1px solid #e0ddd6;border-radius:8px;padding:14px 18px;margin-bottom:12px}',
      '.block-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;font-weight:600}',
      'footer{margin-top:32px;padding-top:14px;border-top:1px solid #e0ddd6;font-size:12px;color:#6b7b6b}',
    ].join('');
    const html = '<!DOCTYPE html><html><head><title>Aellux \xB7 ' + tab + '</title><style>' + css + '</style></head><body>'
      + '<p class="section-header">Aellux \xB7 aellux.health</p>'
      + content
      + '<footer>Generated by Aellux \xB7 aellux.health \xB7 ' + new Date().toLocaleDateString() + '</footer>'
      + '</body></html>';
    w.document.write(html);
    w.document.close();
    setTimeout(function() { w.focus(); w.print(); }, 400);
  };

  return (
    <div>
      {/* Tab bar + print button */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0, flexWrap: 'wrap', gap: 4 }}>
        <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap' }}>
          {[
            { id: 'week',    label: 'Full Week' },
            { id: 'today',   label: "Today's Plan" },
            { id: 'stack',   label: 'Supplement Stack' },
            { id: 'grocery', label: 'Grocery List' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.id ? 'var(--brand-dim)' : 'transparent'}`,
                color: tab === t.id ? 'var(--brand-dim)' : 'var(--text-secondary)',
                fontSize: 15, fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: tab === t.id ? 600 : 400,
                transition: 'color .15s, border-color .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={printSection}
          style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexShrink: 0 }}>
          🖨 Print {tab === 'week' ? 'Full Week' : tab === 'today' ? "Today" : tab === 'stack' ? 'Supplements' : 'Grocery List'}
        </button>
      </div>

      <div id={`print-section-${tab}`}>
        {tab === 'week'    && weekView}
        {tab === 'today'   && <TodayChecklist weekData={weekData} selectedMealKeys={selectedMealKeys} />}
        {tab === 'stack'   && <SuppStack weekData={weekData} allMarkers={allMarkers} profile={profile} userId={userId} />}
        {tab === 'grocery' && <GroceryList weekData={weekData} selectedMealKeys={selectedMealKeys} />}
      </div>
    </div>
  );
}

export { aggregateSupps, aggregateGrocery, todayIndex };
