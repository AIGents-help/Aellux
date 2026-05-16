// @ts-nocheck
import React, { useState, useMemo } from 'react';

interface MealAlt {
  swap: 'nutrient_match' | 'cheaper' | 'faster' | 'diet_pref';
  name: string;
  why: string;
}

interface Meal {
  name: string;
  items?: string[];
  why?: string;
  macros?: { p?: number; c?: number; f?: number; cal?: number };
  targets?: string[];
  flavor_boost?: string;
  alternatives?: MealAlt[];
}

interface Day {
  day: string;
  theme?: string;
  focus_marker?: string;
  morning?: { wake_time?: string; actions?: string[]; supps_am?: string[] };
  meals?: { breakfast?: Meal; lunch?: Meal; dinner?: Meal };
  movement?: { type?: string; duration?: string; when?: string };
  evening?: { supps_pm?: string[]; wind_down?: string; sleep_target?: string };
}

interface WeekData {
  key_insight?: string;
  principles?: string[];
  days?: Day[];
  weekly_summary?: { training_load?: string; total_supp_cost?: string; estimated_calorie_target?: number };
}

interface Props {
  data: WeekData;
  selectedMealKeys: Record<string, string>;
  onSwap: (dayIdx: number, slot: 'breakfast' | 'lunch' | 'dinner', swapKey: string) => void;
  isPreview?: boolean;
  onUpgrade?: () => void;
}

const SWAP_LABEL: Record<string, string> = {
  nutrient_match: 'Same nutrients',
  cheaper: 'Budget swap',
  faster: 'Under 10 min',
  diet_pref: 'Diet preference',
};

// Curated Unsplash food photos — free, no auth, deterministic
const MEAL_PHOTOS = {
  breakfast: [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80', // avocado toast
    'https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=600&q=80', // oatmeal
    'https://images.unsplash.com/photo-1481671703460-040cb8a2d909?w=600&q=80', // eggs
    'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=600&q=80', // smoothie bowl
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', // healthy breakfast
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80', // salad bowl
    'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=600&q=80', // egg bowl
  ],
  lunch: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80', // salad
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80', // grain bowl
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80', // fish
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80', // food plate
    'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?w=600&q=80', // healthy lunch
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80', // buddha bowl
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&q=80', // healthy plate
  ],
  dinner: [
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&q=80', // protein dinner
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80', // pizza/flatbread
    'https://images.unsplash.com/photo-1544025162-d76538485696?w=600&q=80', // steak
    'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=600&q=80', // fish dinner
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80', // bowl
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80', // curry
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', // dinner plate
  ],
};

function getPhoto(slot: string, dayIdx: number) {
  const pool = MEAL_PHOTOS[slot] || MEAL_PHOTOS.lunch;
  return pool[dayIdx % pool.length];
}

function resolveMeal(meal: Meal | undefined, selectedSwap: string | undefined) {
  if (!meal) return { displayName: '', current: { name: '' } as any, isOriginal: true };
  if (!selectedSwap) return { displayName: meal.name, current: meal, isOriginal: true };
  const alt = meal.alternatives?.find(a => a.swap === selectedSwap);
  if (!alt) return { displayName: meal.name, current: meal, isOriginal: true };
  return { displayName: alt.name, current: alt, isOriginal: false };
}

const SLOT_ICONS = { breakfast: '☀', lunch: '🌤', dinner: '🌙' };
const SLOT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function MealCard({ slot, meal, dayIdx, selectedSwap, onSwap }: {
  slot: 'breakfast' | 'lunch' | 'dinner';
  meal: Meal | undefined;
  dayIdx: number;
  selectedSwap: string | undefined;
  onSwap: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!meal) return null;
  const { displayName, current, isOriginal } = resolveMeal(meal, selectedSwap);
  const hasAlts = !!(meal.alternatives && meal.alternatives.length > 0);
  const photo = getPhoto(slot, dayIdx);

  return (
    <div style={{
      borderRadius: 12,
      overflow: 'hidden',
      background: '#fff',
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      transition: 'box-shadow .2s',
    }}>
      {/* Photo strip */}
      <div style={{
        height: 140,
        backgroundImage: `url(${photo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,.55) 100%)',
        }} />
        {/* Slot badge */}
        <div style={{
          position: 'absolute', top: 10, left: 12,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: 'rgba(255,255,255,.92)', color: 'var(--text-primary)',
          padding: '3px 10px', borderRadius: 20,
        }}>
          {SLOT_ICONS[slot]} {SLOT_LABELS[slot]}
        </div>
        {!isOriginal && (
          <div style={{
            position: 'absolute', top: 10, right: 12,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            background: '#166534', color: '#fff',
            padding: '3px 8px', borderRadius: 20,
          }}>SWAPPED</div>
        )}
        {/* Meal name overlay */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,.4)', fontFamily: 'var(--font-display)' }}>
            {displayName}
          </div>
        </div>
      </div>

      {/* Macros row */}
      {meal.macros?.cal && (
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-sunken)',
        }}>
          {[
            { label: 'Cal', val: meal.macros.cal },
            { label: 'Protein', val: `${meal.macros.p}g` },
            { label: 'Carbs', val: `${meal.macros.c}g` },
            { label: 'Fat', val: `${meal.macros.f}g` },
          ].map(({ label, val }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '12px 16px' }}>
        {/* Ingredients */}
        {meal.items && meal.items.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 10 }}>
            {meal.items.join(' · ')}
          </div>
        )}

        {/* Why */}
        {current.why && (
          <div style={{ fontSize: 13, color: 'var(--brand-dim)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 10, paddingLeft: 10, borderLeft: '2px solid var(--brand-border)' }}>
            {current.why}
          </div>
        )}

        {/* Flavor boost */}
        {meal.flavor_boost && (
          <div style={{ padding: '8px 12px', background: 'rgba(146,64,14,.05)', border: '1px solid rgba(146,64,14,.15)', borderRadius: 6, fontSize: 13, color: 'var(--accent-watch)', lineHeight: 1.6, marginBottom: 10 }}>
            ✨ {meal.flavor_boost}
          </div>
        )}

        {/* Swaps */}
        {hasAlts && (
          <>
            <button type="button" onClick={() => setOpen(!open)}
              style={{ width: '100%', fontSize: 12, color: 'var(--brand-dim)', background: 'var(--brand-ghost)', border: '1px solid var(--brand-border)', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, letterSpacing: '0.04em', marginBottom: open ? 10 : 0 }}>
              {open ? '↑ Hide swaps' : `↕ Swap this meal (${meal.alternatives.length} options)`}
            </button>
            {open && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => { onSwap(''); setOpen(false); }}
                  style={{ textAlign: 'left', padding: '8px 12px', background: isOriginal ? 'var(--brand-ghost)' : 'var(--bg-sunken)', border: `1.5px solid ${isOriginal ? 'var(--brand-border)' : 'var(--border-subtle)'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Original{isOriginal ? ' · active' : ''}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{meal.name}</div>
                </button>
                {meal.alternatives?.map(alt => {
                  const active = selectedSwap === alt.swap;
                  return (
                    <button key={alt.swap} onClick={() => { onSwap(alt.swap); setOpen(false); }}
                      style={{ textAlign: 'left', padding: '8px 12px', background: active ? 'var(--brand-ghost)' : 'var(--bg-sunken)', border: `1.5px solid ${active ? 'var(--brand-border)' : 'var(--border-subtle)'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{SWAP_LABEL[alt.swap]}{active ? ' · active' : ''}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>{alt.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{alt.why}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DayCard({ day, dayIdx, isToday, selected, onSwap }: {
  day: Day; dayIdx: number; isToday: boolean;
  selected: Record<string, string>;
  onSwap: Props['onSwap'];
}) {
  const [expanded, setExpanded] = useState(isToday);

  return (
    <div style={{
      marginBottom: 20,
      border: `1.5px solid ${isToday ? 'var(--brand-dim)' : 'var(--border-subtle)'}`,
      borderRadius: 14,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: isToday ? '0 2px 12px rgba(3,26,13,.1)' : '0 1px 4px rgba(0,0,0,.04)',
    }}>
      {/* Day header */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, background: isToday ? 'var(--brand-ghost)' : '#fff' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', fontWeight: 400 }}>{day.day}</div>
            {day.theme && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--bg-sunken)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border-subtle)' }}>
                {day.theme}
              </div>
            )}
            {isToday && (
              <div style={{ fontSize: 11, padding: '3px 10px', background: '#1a4731', borderRadius: 20, color: '#fff', letterSpacing: '0.08em', fontWeight: 600 }}>TODAY</div>
            )}
          </div>
          {day.focus_marker && (
            <div style={{ fontSize: 13, color: 'var(--brand-dim)', marginTop: 4 }}>Focus: {day.focus_marker}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {day.movement?.type && <span>🏃 {day.movement.type}</span>}
          {day.morning?.wake_time && <span>↑ {day.morning.wake_time}</span>}
        </div>
        <div style={{ fontSize: 18, color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>⌄</div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 22px', borderTop: '1px solid var(--border-subtle)' }}>

          {/* Morning */}
          {day.morning && (day.morning.actions?.length || day.morning.supps_am?.length) ? (
            <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(255,200,80,.05)', border: '1px solid rgba(255,200,80,.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-watch)', marginBottom: 8, fontWeight: 600 }}>
                ☀ Morning {day.morning.wake_time ? `· ${day.morning.wake_time}` : ''}
              </div>
              {day.morning.actions?.map((a, i) => (
                <div key={i} style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.5 }}>• {a}</div>
              ))}
              {day.morning.supps_am?.length ? (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                  <strong>AM supps:</strong> {day.morning.supps_am.join(', ')}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Meal cards grid */}
          {day.meals && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 500 }}>
                Meals · tap any meal to swap
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {(['breakfast', 'lunch', 'dinner'] as const).map(slot => (
                  <MealCard key={slot} slot={slot} meal={day.meals?.[slot]} dayIdx={dayIdx}
                    selectedSwap={selected[`${dayIdx}|${slot}`]} onSwap={s => onSwap(dayIdx, slot, s)} />
                ))}
              </div>
            </div>
          )}

          {/* Movement */}
          {day.movement?.type && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(30,58,95,.04)', border: '1px solid rgba(30,58,95,.12)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-info)', marginBottom: 6, fontWeight: 600 }}>🏃 Movement</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                {day.movement.type}{day.movement.duration ? ` · ${day.movement.duration}` : ''}{day.movement.when ? ` · ${day.movement.when}` : ''}
              </div>
            </div>
          )}

          {/* Evening */}
          {day.evening && (day.evening.supps_pm?.length || day.evening.wind_down) ? (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(88,28,135,.04)', border: '1px solid rgba(88,28,135,.12)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6d28d9', marginBottom: 8, fontWeight: 600 }}>
                🌙 Evening {day.evening.sleep_target ? `· sleep ${day.evening.sleep_target}` : ''}
              </div>
              {day.evening.supps_pm?.length ? (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <strong>PM supps:</strong> {day.evening.supps_pm.join(', ')}
                </div>
              ) : null}
              {day.evening.wind_down && (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{day.evening.wind_down}</div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function WeekView({ data, selectedMealKeys, onSwap, isPreview = false, onUpgrade }: Props) {
  const todayIdx = useMemo(() => {
    const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
    return map[new Date().toLocaleDateString('en-US', { weekday: 'long' })] ?? -1;
  }, []);

  if (!data || !Array.isArray(data.days) || data.days.length === 0) return null;

  return (
    <div>
      {/* Key insight */}
      {data.key_insight && (
        <div style={{ padding: '18px 22px', marginBottom: 20, background: 'var(--brand-ghost)', border: '1px solid var(--brand-border)', borderRadius: 10, borderLeft: '3px solid var(--brand-dim)' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 600 }}>This week's design</div>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{data.key_insight}</div>
        </div>
      )}

      {/* Principles */}
      {data.principles && data.principles.length > 0 && (
        <div style={{ padding: '16px 20px', marginBottom: 20, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 600 }}>Guiding principles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.principles.map((p, i) => (
              <div key={i} style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--brand-dim)', flexShrink: 0, marginTop: 1 }}>✓</span>{p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day cards */}
      {data.days.map((d, i) => (
        <DayCard key={i} day={d} dayIdx={i} isToday={i === todayIdx} selected={selectedMealKeys} onSwap={onSwap} />
      ))}

      {/* Free preview upsell */}
      {isPreview && (
        <div style={{ padding: '28px 32px', marginTop: 20, background: '#fff', border: '2px solid var(--brand-border)', borderRadius: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 600 }}>Free preview — Day 1 only</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.35 }}>Unlock the full 7-day Biologic Protocol</div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
            Six more biologically distinct days, meal swaps, training rotation, supplement timing, and a printable weekly PDF — all designed from your actual biomarkers.
          </div>
          <button onClick={onUpgrade} style={{ fontSize: 16, color: '#fff', background: '#1a4731', border: 'none', borderRadius: 8, padding: '13px 32px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Upgrade to Aellux Pro →</button>
        </div>
      )}

      {/* Weekly summary */}
      {data.weekly_summary && !isPreview && (
        <div style={{ padding: '18px 22px', marginTop: 16, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 600 }}>Weekly summary</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {data.weekly_summary.training_load && (
              <div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Training</div><div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{data.weekly_summary.training_load}</div></div>
            )}
            {data.weekly_summary.total_supp_cost && (
              <div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Supp cost</div><div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{data.weekly_summary.total_supp_cost}</div></div>
            )}
            {data.weekly_summary.estimated_calorie_target && (
              <div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Weekly calories</div><div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>~{data.weekly_summary.estimated_calorie_target.toLocaleString()}</div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
