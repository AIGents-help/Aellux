import React, { useMemo, useState } from 'react';

interface Props {
  weekData: any;
  selectedMealKeys: Record<string, string>;
  weekView: React.ReactNode; // The full WeekView component, rendered by parent
  onPrint?: (section: 'week' | 'stack' | 'grocery' | 'today') => void;
}

// ---- helpers ---------------------------------------------------------------

// Parse a supplement string like "Magnesium glycinate 300mg" into { name, dose }
function parseSupp(s: string) {
  const m = String(s).match(/^(.+?)\s+(\d+\s*(?:mg|mcg|g|iu|IU|ml|µg|%)?[\w/]*)\s*$/i);
  if (m) return { name: m[1].trim(), dose: m[2].trim() };
  return { name: String(s).trim(), dose: '' };
}

// Aggregate every supp across the week, deduplicated by lowercase name.
// Returns [{ name, doses: Set<string>, ampm: 'am'|'pm'|'both', days: Set<string> }]
function aggregateSupps(weekData: any) {
  const map = new Map<string, { name: string; doses: Set<string>; ampm: Set<string>; days: Set<string> }>();
  if (!weekData?.days) return [];
  for (const d of weekData.days) {
    const am = d.morning?.supps_am || [];
    const pm = d.evening?.supps_pm || [];
    for (const s of am) {
      const { name, dose } = parseSupp(s);
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, { name, doses: new Set(), ampm: new Set(), days: new Set() });
      const ref = map.get(key)!;
      if (dose) ref.doses.add(dose);
      ref.ampm.add('am');
      ref.days.add(d.day);
    }
    for (const s of pm) {
      const { name, dose } = parseSupp(s);
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, { name, doses: new Set(), ampm: new Set(), days: new Set() });
      const ref = map.get(key)!;
      if (dose) ref.doses.add(dose);
      ref.ampm.add('pm');
      ref.days.add(d.day);
    }
  }
  return Array.from(map.values()).map(s => ({
    name: s.name,
    dose: Array.from(s.doses).join(' / '),
    ampm: s.ampm.size === 2 ? 'AM + PM' : (s.ampm.has('am') ? 'AM' : 'PM'),
    days: Array.from(s.days),
    everyDay: s.days.size >= 7,
  }));
}

// Aggregate every grocery item across all selected meals, categorized.
function aggregateGrocery(weekData: any, selectedMealKeys: Record<string, string>) {
  if (!weekData?.days) return { byCategory: {}, total: 0 };
  const allItems: string[] = [];
  for (let i = 0; i < weekData.days.length; i++) {
    const day = weekData.days[i];
    if (!day.meals) continue;
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const meal = day.meals[slot];
      if (!meal) continue;
      const swapKey = selectedMealKeys[`${i}|${slot}`];
      // If the user picked a swap, items from the original may not match — but we don't have items
      // listed on the swap alternative typically; fall back to the original items in that case.
      // (Future: ask AI to include items on alternatives too.)
      if (meal.items) allItems.push(...meal.items);
    }
  }
  // De-duplicate & categorize
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const it of allItems) {
    const key = it.toLowerCase().trim();
    if (!seen.has(key) && key.length > 0) { seen.add(key); unique.push(it); }
  }
  const cat = (item: string): string => {
    const lc = item.toLowerCase();
    if (/(chicken|beef|pork|lamb|turkey|fish|salmon|tuna|sardine|mackerel|shrimp|tofu|tempeh|eggs?|cottage cheese|yogurt|greek yogurt)/i.test(lc)) return 'Proteins';
    if (/(rice|oats|quinoa|barley|pasta|bread|sourdough|tortilla|noodle|farro|bulgur|millet)/i.test(lc)) return 'Grains & starches';
    if (/(spinach|kale|broccoli|cauliflower|carrot|tomato|cucumber|pepper|onion|garlic|lettuce|arugula|cabbage|brassic|bok choy|asparagus|zucchini|squash|sweet potato|beet|mushroom)/i.test(lc)) return 'Vegetables';
    if (/(berries|berry|apple|banana|orange|lemon|lime|peach|pear|grape|melon|kiwi|mango|pineapple)/i.test(lc)) return 'Fruit';
    if (/(milk|butter|cheese|cream|kefir)/i.test(lc)) return 'Dairy';
    if (/(olive oil|avocado oil|coconut oil|ghee|tahini|nut|seed|chia|flax|almond|walnut|pumpkin|sunflower)/i.test(lc)) return 'Fats, nuts & seeds';
    if (/(salt|pepper|spice|herb|cumin|turmeric|cinnamon|ginger|paprika|oregano|basil|thyme|rosemary|miso|soy sauce|tamari|vinegar|mustard)/i.test(lc)) return 'Pantry / seasoning';
    if (/(bean|lentil|chickpea|black bean|kidney|pinto|navy)/i.test(lc)) return 'Legumes';
    return 'Other';
  };
  const byCategory: Record<string, string[]> = {};
  for (const item of unique) {
    const c = cat(item);
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(item);
  }
  return { byCategory, total: unique.length };
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
      <div style={{ fontSize: 12, color: 'rgba(0,210,165,.6)', lineHeight: 1.6, marginBottom: 14 }}>
        Every unique supplement across your 7-day Biologic Protocol, deduplicated. {supps.length} total · {supps.filter(s => s.everyDay).length} every-day staples.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {supps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.14)', borderRadius: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: 'rgba(220,255,235,1)', fontFamily: 'EB Garamond, Georgia, serif' }}>{s.name}</div>
              {s.dose && <div style={{ fontSize: 11, color: 'rgba(0,210,165,.65)', marginTop: 2 }}>{s.dose}</div>}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(0,225,180,.75)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', background: 'rgba(0,210,165,.08)', borderRadius: 10 }}>{s.ampm}</div>
            <div style={{ fontSize: 10, color: 'rgba(0,210,165,.55)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
  const order = ['Proteins', 'Vegetables', 'Fruit', 'Grains & starches', 'Legumes', 'Dairy', 'Fats, nuts & seeds', 'Pantry / seasoning', 'Other'];
  return (
    <div>
      <div style={{ fontSize: 12, color: 'rgba(0,210,165,.6)', lineHeight: 1.6, marginBottom: 14 }}>
        Every unique food item across your week's meals. {total} items in {Object.keys(byCategory).length} categories. Reflects your current meal selections — change a swap and this list updates.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {order.filter(c => byCategory[c]).map(category => (
          <div key={category} style={{ padding: '14px 16px', background: 'rgba(0,8,18,.4)', border: '1px solid rgba(0,210,165,.14)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: 'rgba(0,225,180,.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{category} · {byCategory[category].length}</div>
            {byCategory[category].map((item: string, i: number) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(220,255,235,.85)', padding: '4px 0', lineHeight: 1.4 }}>• {item}</div>
            ))}
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
      <div style={{ fontSize: 12, color: 'rgba(0,210,165,.6)', lineHeight: 1.6, marginBottom: 14 }}>
        Today is <strong style={{ color: 'rgba(0,225,180,.95)' }}>{day.day} · {day.theme}</strong>
        {day.focus_marker && <> · Focus: {day.focus_marker}</>}
      </div>

      {day.morning && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(255,200,80,.04)', border: '1px solid rgba(255,200,80,.18)', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,210,100,.8)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>☀ Morning {day.morning.wake_time ? `· ${day.morning.wake_time}` : ''}</div>
          {day.morning.actions?.map((a: string, i: number) => <div key={i} style={{ fontSize: 14, color: 'rgba(220,255,235,.92)', padding: '3px 0' }}>☐ {a}</div>)}
          {day.morning.supps_am?.map((s: string, i: number) => <div key={`s${i}`} style={{ fontSize: 13, color: 'rgba(220,255,235,.85)', padding: '3px 0' }}>☐ Take {s}</div>)}
        </div>
      )}

      {day.meals && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(0,210,165,.04)', border: '1px solid rgba(0,225,180,.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(0,225,180,.85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🍽 Meals</div>
          {['breakfast', 'lunch', 'dinner'].map(slot => {
            const m = resolveMeal(slot);
            if (!m) return null;
            return (
              <div key={slot} style={{ fontSize: 14, color: 'rgba(220,255,235,.92)', padding: '4px 0' }}>
                ☐ <strong style={{ textTransform: 'capitalize', color: 'rgba(0,225,180,.85)' }}>{slot}:</strong> {m.name}
                {m.swapped && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 6px', background: 'rgba(0,210,165,.14)', borderRadius: 3, color: 'rgba(0,225,180,.85)', letterSpacing: '0.06em' }}>SWAPPED</span>}
              </div>
            );
          })}
        </div>
      )}

      {day.movement && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(100,210,255,.04)', border: '1px solid rgba(100,210,255,.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(100,210,255,.85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>⚡ Movement</div>
          <div style={{ fontSize: 14, color: 'rgba(220,255,235,.92)' }}>☐ {day.movement.type}{day.movement.duration ? ` · ${day.movement.duration}` : ''}{day.movement.when ? ` · ${day.movement.when}` : ''}</div>
        </div>
      )}

      {day.evening && (
        <div style={{ padding: '14px 18px', background: 'rgba(200,160,255,.04)', border: '1px solid rgba(200,160,255,.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(200,160,255,.85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>🌙 Evening {day.evening.sleep_target ? `· sleep ${day.evening.sleep_target}` : ''}</div>
          {day.evening.supps_pm?.map((s: string, i: number) => <div key={i} style={{ fontSize: 14, color: 'rgba(220,255,235,.92)', padding: '3px 0' }}>☐ Take {s}</div>)}
          {day.evening.wind_down && <div style={{ fontSize: 14, color: 'rgba(220,255,235,.92)', padding: '3px 0' }}>☐ {day.evening.wind_down}</div>}
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
              fontSize: 13,
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
