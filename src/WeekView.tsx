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

// ── Type scale (never go below these) ───────────────────────────────────────
// label/eyebrow : 12px  (uppercase, tracked)
// body-sm       : 14px
// body          : 16px
// meal-name     : 18px  (serif)
// day-name      : 26px  (serif)

const SWAP_LABEL: Record<string, string> = {
  nutrient_match: 'Same nutrients',
  cheaper: 'Cheaper',
  faster: 'Faster (<10 min)',
  diet_pref: 'Diet preference',
};

const SWAP_COLOR: Record<string, string> = {
  nutrient_match: 'rgba(100, 210, 255, .85)',
  cheaper: 'rgba(180, 255, 100, .85)',
  faster: 'rgba(255, 200, 80, .85)',
  diet_pref: 'rgba(200, 160, 255, .85)',
};

function resolveMeal(meal: Meal | undefined, selectedSwap: string | undefined) {
  if (!meal) return { displayName: '', current: { name: '' } as any, isOriginal: true };
  if (!selectedSwap || selectedSwap === '') return { displayName: meal.name, current: meal, isOriginal: true };
  const alt = meal.alternatives?.find(a => a.swap === selectedSwap);
  if (!alt) return { displayName: meal.name, current: meal, isOriginal: true };
  return { displayName: alt.name, current: alt, isOriginal: false };
}

function MealRow({ slot, meal, dayIdx, selectedSwap, onSwap }: {
  slot: 'breakfast' | 'lunch' | 'dinner';
  meal: Meal | undefined;
  dayIdx: number;
  selectedSwap: string | undefined;
  onSwap: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!meal) return null;
  const { displayName, isOriginal } = resolveMeal(meal, selectedSwap);
  const hasAlts = !!(meal.alternatives && meal.alternatives.length > 0);
  const hasItems = !!(meal.items && meal.items.length > 0);
  const hasBoost = !!(meal.flavor_boost && meal.flavor_boost.trim().length > 0);
  const isExpandable = hasAlts || hasItems || hasBoost;

  return (
    <div style={{ marginBottom: 12, border: '1px solid rgba(0,210,165,.14)', borderRadius: 8, overflow: 'hidden', background: 'rgba(0,6,14,.4)' }}>
      <div
        onClick={() => isExpandable && setOpen(!open)}
        style={{ padding: '16px 18px', cursor: isExpandable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 14 }}
      >
        {/* Slot label */}
        <div style={{ fontSize: 12, color: 'rgba(0,225,180,.65)', letterSpacing: 1.5, textTransform: 'uppercase', width: 80, flexShrink: 0 }}>{slot}</div>

        {/* Meal name + macros */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, color: 'rgba(220,255,235,1)', fontFamily: 'EB Garamond, Georgia, serif', lineHeight: 1.3 }}>
            {displayName}
            {!isOriginal && (
              <span style={{ fontSize: 11, marginLeft: 10, padding: '2px 8px', background: 'rgba(0,210,165,.15)', borderRadius: 3, color: 'rgba(0,225,180,.85)', letterSpacing: '0.06em' }}>SWAPPED</span>
            )}
          </div>
          {meal.macros?.cal && (
            <div style={{ fontSize: 13, color: 'rgba(0,200,160,.65)', marginTop: 4 }}>
              {meal.macros.cal} cal · P {meal.macros.p}g · C {meal.macros.c}g · F {meal.macros.f}g
            </div>
          )}
        </div>

        {isExpandable && (
          <div style={{ fontSize: 20, color: 'rgba(0,210,165,.5)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>⌄</div>
        )}
      </div>

      {open && isExpandable && (
        <div style={{ padding: '12px 18px 18px', borderTop: '1px solid rgba(0,210,165,.1)' }}>

          {/* Ingredients */}
          {meal.items && meal.items.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Ingredients</div>
              <div style={{ fontSize: 15, color: 'rgba(220,255,235,.85)', lineHeight: 1.7 }}>{meal.items.join(' · ')}</div>
            </div>
          )}

          {/* Flavor boost */}
          {meal.flavor_boost && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(255,200,80,.06)', border: '1px solid rgba(255,200,80,.22)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,210,100,.8)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>✨ Doctor it up (optional)</div>
              <div style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', lineHeight: 1.6 }}>{meal.flavor_boost}</div>
            </div>
          )}

          {/* Why */}
          {meal.why && (
            <div style={{ fontSize: 14, color: 'rgba(0,210,165,.75)', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 14, paddingLeft: 12, borderLeft: '2px solid rgba(0,210,165,.25)' }}>
              {meal.why}
            </div>
          )}

          {/* Swaps */}
          {hasAlts && (
            <>
              <div style={{ fontSize: 12, color: 'rgba(0,210,165,.55)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Swap to:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {/* Original option */}
                <button
                  onClick={(e) => { e.stopPropagation(); onSwap(''); setOpen(false); }}
                  style={{ textAlign: 'left', padding: '10px 12px', background: isOriginal ? 'rgba(0,210,165,.14)' : 'rgba(0,210,165,.04)', border: `1px solid ${isOriginal ? 'rgba(0,225,180,.55)' : 'rgba(0,210,165,.18)'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(220,255,235,.92)' }}
                >
                  <div style={{ fontSize: 11, color: 'rgba(0,225,180,.7)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Original {isOriginal ? '· active' : ''}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.3 }}>{meal.name}</div>
                </button>

                {meal.alternatives?.map((alt) => {
                  const active = selectedSwap === alt.swap;
                  return (
                    <button
                      key={alt.swap}
                      onClick={(e) => { e.stopPropagation(); onSwap(alt.swap); setOpen(false); }}
                      style={{ textAlign: 'left', padding: '10px 12px', background: active ? 'rgba(0,210,165,.14)' : 'rgba(0,210,165,.04)', border: `1px solid ${active ? SWAP_COLOR[alt.swap] : 'rgba(0,210,165,.18)'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', color: 'rgba(220,255,235,.92)' }}
                    >
                      <div style={{ fontSize: 11, color: SWAP_COLOR[alt.swap], letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{SWAP_LABEL[alt.swap]}{active ? ' · active' : ''}</div>
                      <div style={{ fontSize: 14, lineHeight: 1.3, marginBottom: 4 }}>{alt.name}</div>
                      <div style={{ fontSize: 13, color: 'rgba(0,200,160,.65)', fontStyle: 'italic', lineHeight: 1.4 }}>{alt.why}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DayCard({ day, dayIdx, isToday, selected, onSwap }: {
  day: Day;
  dayIdx: number;
  isToday: boolean;
  selected: Record<string, string>;
  onSwap: Props['onSwap'];
}) {
  const [expanded, setExpanded] = useState(isToday);

  return (
    <div style={{ marginBottom: 16, border: `1px solid ${isToday ? 'rgba(0,225,180,.55)' : 'rgba(0,210,165,.18)'}`, borderRadius: 10, overflow: 'hidden', background: isToday ? 'rgba(0,32,50,.4)' : 'rgba(0,8,18,.5)' }}>

      {/* Day header — always visible */}
      <div onClick={() => setExpanded(!expanded)} style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 26, color: 'rgba(220,255,235,1)', fontWeight: 500 }}>{day.day}</div>
            {day.theme && (
              <div style={{ fontSize: 13, color: 'rgba(0,225,180,.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{day.theme}</div>
            )}
            {isToday && (
              <div style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(0,225,180,.18)', border: '1px solid rgba(0,225,180,.5)', borderRadius: 10, color: 'rgba(0,255,200,1)', letterSpacing: '0.08em' }}>TODAY</div>
            )}
          </div>
          {day.focus_marker && (
            <div style={{ fontSize: 13, color: 'rgba(0,200,160,.7)', marginTop: 5, letterSpacing: '0.03em' }}>Focus: {day.focus_marker}</div>
          )}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(0,210,165,.6)', flexShrink: 0 }}>
          {day.movement?.type && <span>{day.movement.type}</span>}
          {day.morning?.wake_time && <span>↑ {day.morning.wake_time}</span>}
          {day.evening?.sleep_target && <span>↓ {day.evening.sleep_target}</span>}
        </div>

        <div style={{ fontSize: 20, color: 'rgba(0,210,165,.5)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>⌄</div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 22px 22px', borderTop: '1px solid rgba(0,210,165,.12)' }}>

          {/* Morning */}
          {day.morning && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,200,80,.8)', marginBottom: 10 }}>
                Morning {day.morning.wake_time ? `· ${day.morning.wake_time}` : ''}
              </div>
              {day.morning.actions?.map((a, i) => (
                <div key={i} style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', marginBottom: 5, lineHeight: 1.55 }}>• {a}</div>
              ))}
              {day.morning.supps_am && day.morning.supps_am.length > 0 && (
                <div style={{ fontSize: 14, color: 'rgba(0,210,165,.8)', marginTop: 8, lineHeight: 1.6 }}>
                  <strong style={{ color: 'rgba(0,225,180,.9)' }}>AM supps:</strong> {day.morning.supps_am.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Meals */}
          {day.meals && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(0,225,180,.7)', marginBottom: 10 }}>Meals · tap any meal to see alternatives</div>
              <MealRow slot="breakfast" meal={day.meals.breakfast} dayIdx={dayIdx} selectedSwap={selected[`${dayIdx}|breakfast`]} onSwap={(s) => onSwap(dayIdx, 'breakfast', s)} />
              <MealRow slot="lunch"     meal={day.meals.lunch}     dayIdx={dayIdx} selectedSwap={selected[`${dayIdx}|lunch`]}     onSwap={(s) => onSwap(dayIdx, 'lunch', s)}     />
              <MealRow slot="dinner"    meal={day.meals.dinner}    dayIdx={dayIdx} selectedSwap={selected[`${dayIdx}|dinner`]}    onSwap={(s) => onSwap(dayIdx, 'dinner', s)}    />
            </div>
          )}

          {/* Movement */}
          {day.movement && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(100,210,255,.7)', marginBottom: 8 }}>Movement</div>
              <div style={{ fontSize: 16, color: 'rgba(220,255,235,.92)', lineHeight: 1.5 }}>
                {day.movement.type}
                {day.movement.duration ? ` · ${day.movement.duration}` : ''}
                {day.movement.when ? ` · ${day.movement.when}` : ''}
              </div>
            </div>
          )}

          {/* Evening */}
          {day.evening && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(200,160,255,.7)', marginBottom: 8 }}>
                Evening {day.evening.sleep_target ? `· sleep ${day.evening.sleep_target}` : ''}
              </div>
              {day.evening.supps_pm && day.evening.supps_pm.length > 0 && (
                <div style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', marginBottom: 5, lineHeight: 1.6 }}>
                  <strong style={{ color: 'rgba(0,225,180,.9)' }}>PM supps:</strong> {day.evening.supps_pm.join(', ')}
                </div>
              )}
              {day.evening.wind_down && (
                <div style={{ fontSize: 15, color: 'rgba(220,255,235,.85)', lineHeight: 1.6 }}>{day.evening.wind_down}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WeekView({ data, selectedMealKeys, onSwap, isPreview = false, onUpgrade }: Props) {
  const todayIdx = useMemo(() => {
    const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return map[today] ?? -1;
  }, []);

  if (!data || !Array.isArray(data.days) || data.days.length === 0) return null;

  return (
    <div>
      {/* Key insight */}
      {data.key_insight && (
        <div style={{ padding: '16px 20px', marginBottom: 16, background: 'rgba(0,210,165,.06)', border: '1px solid rgba(0,225,180,.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(0,225,180,.7)', marginBottom: 8 }}>Week design</div>
          <div style={{ fontSize: 16, color: 'rgba(220,255,235,.95)', fontStyle: 'italic', lineHeight: 1.7 }}>{data.key_insight}</div>
        </div>
      )}

      {/* Principles */}
      {data.principles && data.principles.length > 0 && (
        <div style={{ padding: '14px 18px', marginBottom: 16, background: 'rgba(0,8,18,.5)', border: '1px solid rgba(0,210,165,.15)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(0,210,165,.65)', marginBottom: 10 }}>Guiding principles</div>
          {data.principles.map((p, i) => (
            <div key={i} style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', marginBottom: 6, lineHeight: 1.6 }}>• {p}</div>
          ))}
        </div>
      )}

      {/* Day cards */}
      {data.days.map((d, i) => (
        <DayCard key={i} day={d} dayIdx={i} isToday={i === todayIdx} selected={selectedMealKeys} onSwap={onSwap} />
      ))}

      {/* Free preview upsell */}
      {isPreview && (
        <div style={{ padding: '24px 28px', marginTop: 20, background: 'rgba(0,8,18,.7)', border: '1px solid rgba(0,225,180,.45)', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,225,180,.7)', marginBottom: 12 }}>Free preview — Day 1 only</div>
          <div style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: 22, color: 'rgba(220,255,235,1)', marginBottom: 10, lineHeight: 1.4 }}>Unlock the full 7-day Aellux Protocol</div>
          <div style={{ fontSize: 15, color: 'rgba(0,210,165,.75)', marginBottom: 20, lineHeight: 1.65 }}>Six more biologically distinct days, meal swaps, training rotation, supplement timing, and a printable weekly PDF.</div>
          <button onClick={onUpgrade} style={{ fontSize: 15, color: 'rgba(0,225,180,1)', background: 'rgba(0,195,155,.16)', border: '1px solid rgba(0,225,180,.55)', borderRadius: 6, padding: '12px 28px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}>Upgrade to Aellux Pro — $29/mo →</button>
        </div>
      )}

      {/* Weekly summary */}
      {data.weekly_summary && !isPreview && (
        <div style={{ padding: '16px 20px', marginTop: 16, background: 'rgba(255,200,80,.06)', border: '1px solid rgba(255,200,80,.25)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,200,80,.75)', marginBottom: 10 }}>Weekly summary</div>
          {data.weekly_summary.training_load && (
            <div style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', marginBottom: 5 }}><strong>Training:</strong> {data.weekly_summary.training_load}</div>
          )}
          {data.weekly_summary.total_supp_cost && (
            <div style={{ fontSize: 15, color: 'rgba(220,255,235,.9)', marginBottom: 5 }}><strong>Supp cost:</strong> {data.weekly_summary.total_supp_cost}</div>
          )}
          {data.weekly_summary.estimated_calorie_target && (
            <div style={{ fontSize: 15, color: 'rgba(220,255,235,.9)' }}><strong>Weekly calorie target:</strong> ~{data.weekly_summary.estimated_calorie_target.toLocaleString()}</div>
          )}
        </div>
      )}
    </div>
  );
}
