import React, { useMemo, useState } from 'react';

interface Props {
  weekData: any;
  selectedMealKeys: Record<string, string>;
  weekView: React.ReactNode; // The full WeekView component, rendered by parent
  onPrint?: (section: 'week' | 'stack' | 'grocery' | 'today') => void;
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

  // Collect all raw item strings
  const allItems: string[] = [];
  for (let i = 0; i < weekData.days.length; i++) {
    const day = weekData.days[i];
    if (!day.meals) continue;
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const meal = day.meals[slot];
      if (!meal?.items) continue;
      allItems.push(...meal.items);
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

function todayIndex() {
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[new Date().toLocaleDateString('en-US', { weekday: 'long' })] ?? 0;
}

// ---- subcomponents ---------------------------------------------------------

function SuppStack({ weekData }: { weekData: any }) {
  const supps = useMemo(() => aggregateSupps(weekData), [weekData]);
  if (supps.length === 0) return <div style={{ padding: '20px', color: 'rgba(0,210,165,.55)' }}>No supplements listed in this week's protocol.</div>;
  return (
    <div>
      <div style={{ fontSize: 16, color: 'rgba(0,210,165,.6)', lineHeight: 1.6, marginBottom: 14 }}>
        Every unique supplement across your 7-day Biologic Protocol, deduplicated. {supps.length} total · {supps.filter(s => s.everyDay).length} every-day staples.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {supps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.14)', borderRadius: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: 'rgba(220,255,235,1)', fontFamily: 'EB Garamond, Georgia, serif' }}>{s.name}</div>
              {s.dose && <div style={{ fontSize: 16, color: 'rgba(0,210,165,.65)', marginTop: 2 }}>{s.dose}</div>}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,225,180,.75)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', background: 'rgba(0,210,165,.08)', borderRadius: 10 }}>{s.ampm}</div>
            <div style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {s.everyDay ? 'Daily' : `${s.days.length}×/wk`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroceryList({ weekData, selectedMealKeys }: { weekData: any; selectedMealKeys: Record<string, string> }) {
  const { byCategory, total } = useMemo(() => aggregateGrocery(weekData, selectedMealKeys), [weekData, selectedMealKeys]);
  if (total === 0) return <div style={{ padding: '20px', color: 'rgba(0,210,165,.55)' }}>No grocery items found in this week's meals.</div>;
  const order = ['Proteins', 'Vegetables', 'Grains & starches', 'Legumes', 'Dairy', 'Fats, nuts & seeds', 'Fruit', 'Pantry / seasoning', 'Other'];
  const categories = order.filter(c => byCategory[c]);
  return (
    <div>
      <div style={{ fontSize: 15, color: 'rgba(0,210,165,.65)', lineHeight: 1.6, marginBottom: 18 }}>
        {total} unique ingredients · {categories.length} categories · swaps update this list automatically
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {categories.map(category => (
          <div key={category} style={{ padding: '16px 20px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.14)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(0,225,180,.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              {category} · {byCategory[category].length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 24px' }}>
              {byCategory[category].map((item: string, i: number) => (
                <div key={i} style={{ fontSize: 15, color: 'rgba(220,255,235,.88)', lineHeight: 1.7, minWidth: 160 }}>• {item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayChecklist({ weekData, selectedMealKeys }: { weekData: any; selectedMealKeys: Record<string, string> }) {
  const tIdx = todayIndex();
  const day = weekData?.days?.[tIdx];
  if (!day) return <div style={{ padding: '20px', color: 'rgba(0,210,165,.55)' }}>No plan available for today.</div>;

  const resolveMeal = (slot: string) => {
    const meal = day.meals?.[slot];
    if (!meal) return null;
    const swap = selectedMealKeys[`${tIdx}|${slot}`];
    if (swap && meal.alternatives) {
      const alt = meal.alternatives.find((a: any) => a.swap === swap);
      if (alt) return { name: alt.name, swapped: true };
    }
    return { name: meal.name, swapped: false };
  };

  return (
    <div>
      <div style={{ fontSize: 16, color: 'rgba(0,210,165,.6)', lineHeight: 1.6, marginBottom: 14 }}>
        Today is <strong style={{ color: 'rgba(0,225,180,.95)' }}>{day.day} · {day.theme}</strong>
        {day.focus_marker && <> · Focus: {day.focus_marker}</>}
      </div>

      {day.morning && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(255,200,80,.04)', border: '1px solid rgba(255,200,80,.18)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,210,100,.8)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>☀ Morning {day.morning.wake_time ? `· ${day.morning.wake_time}` : ''}</div>
          {day.morning.actions?.map((a: string, i: number) => <div key={i} style={{ fontSize: 16, color: 'rgba(220,255,235,.92)', padding: '3px 0' }}>☐ {a}</div>)}
          {day.morning.supps_am?.map((s: string, i: number) => <div key={`s${i}`} style={{ fontSize: 16, color: 'rgba(220,255,235,.85)', padding: '3px 0' }}>☐ Take {s}</div>)}
        </div>
      )}

      {day.meals && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,225,180,.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'rgba(0,225,180,.85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🍽 Meals</div>
          {['breakfast', 'lunch', 'dinner'].map(slot => {
            const m = resolveMeal(slot);
            if (!m) return null;
            return (
              <div key={slot} style={{ fontSize: 16, color: 'rgba(220,255,235,.92)', padding: '4px 0' }}>
                ☐ <strong style={{ textTransform: 'capitalize', color: 'rgba(0,225,180,.85)' }}>{slot}:</strong> {m.name}
                {m.swapped && <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', background: 'rgba(0,210,165,.14)', borderRadius: 3, color: 'rgba(0,225,180,.85)', letterSpacing: '0.06em' }}>SWAPPED</span>}
              </div>
            );
          })}
        </div>
      )}

      {day.movement && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(100,210,255,.04)', border: '1px solid rgba(100,210,255,.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'rgba(100,210,255,.85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>⚡ Movement</div>
          <div style={{ fontSize: 16, color: 'rgba(220,255,235,.92)' }}>☐ {day.movement.type}{day.movement.duration ? ` · ${day.movement.duration}` : ''}{day.movement.when ? ` · ${day.movement.when}` : ''}</div>
        </div>
      )}

      {day.evening && (
        <div style={{ padding: '14px 18px', background: 'rgba(200,160,255,.04)', border: '1px solid rgba(200,160,255,.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: 'rgba(200,160,255,.85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🌙 Evening {day.evening.sleep_target ? `· sleep ${day.evening.sleep_target}` : ''}</div>
          {day.evening.supps_pm?.map((s: string, i: number) => <div key={i} style={{ fontSize: 16, color: 'rgba(220,255,235,.92)', padding: '3px 0' }}>☐ Take {s}</div>)}
          {day.evening.wind_down && <div style={{ fontSize: 16, color: 'rgba(220,255,235,.92)', padding: '3px 0' }}>☐ {day.evening.wind_down}</div>}
        </div>
      )}
    </div>
  );
}

// ---- main ------------------------------------------------------------------

export default function DerivedViews({ weekData, selectedMealKeys, weekView, onPrint }: Props) {
  const [tab, setTab] = useState<'week' | 'today' | 'stack' | 'grocery'>('week');

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid rgba(0,210,165,.14)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {[
          { id: 'week',    label: 'Full Week' },
          { id: 'today',   label: "Today's Plan" },
          { id: 'stack',   label: 'Supplement Stack' },
          { id: 'grocery', label: 'Grocery List' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.id ? 'rgba(0,225,180,.9)' : 'transparent'}`,
              color: tab === t.id ? 'rgba(0,255,200,1)' : 'rgba(0,210,165,.55)',
              fontSize: 16,
              fontFamily: 'inherit',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'color .15s, border-color .15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'week'    && weekView}
      {tab === 'today'   && <TodayChecklist weekData={weekData} selectedMealKeys={selectedMealKeys} />}
      {tab === 'stack'   && <SuppStack weekData={weekData} />}
      {tab === 'grocery' && <GroceryList weekData={weekData} selectedMealKeys={selectedMealKeys} />}
    </div>
  );
}

export { aggregateSupps, aggregateGrocery, todayIndex };
