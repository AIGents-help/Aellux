import { sbSelect, sbUpsert, sbUpdate, rateLimit, logUsage, sha256, hashMarkers, getProfile, formatProfileForPrompt, hashProfile, hasMedications } from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

const SYSTEM = 'You are Aellux, a precision health intelligence. Respond with ONLY a single valid JSON object matching the schema. No prose, no preamble, no markdown fences. Start with { and end with }.';

function parseJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in model output');
  const candidate = text.slice(start, end + 1);

  try { return JSON.parse(candidate); } catch {}
  try { return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')); } catch {}
  const tryRepair = (s) => {
    const daysMatch = s.match(/"days"\s*:\s*\[/);
    if (!daysMatch) throw new Error('no days array');
    const arrStart = daysMatch.index + daysMatch[0].length;
    let depth = 0, inString = false, escape = false, lastCloseIdx = -1;
    for (let i = arrStart; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) lastCloseIdx = i; }
    }
    if (lastCloseIdx === -1) throw new Error('no complete day');
    const repaired = s.slice(0, lastCloseIdx + 1) + ']}';
    return JSON.parse(repaired.replace(/,\s*([}\]])/g, '$1'));
  };
  try { return tryRepair(candidate); } catch {}
  throw new Error('All JSON repair strategies failed');
}

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// FIX: Rate limit only applies when isRegenerate=true (user already has a protocol).
// Never block viewing an existing protocol. Never block first-time generation.
async function checkLimits({ userId, plan, isRegenerate }) {
  if (!userId) return { ok: true };
  if (plan === 'pro') {
    if (isRegenerate) {
      const r = await rateLimit({ userId, endpoint: 'personalise-week', limit: 1, windowHours: 24 * 7 });
      if (!r.ok) {
        return {
          ok: false,
          msg: 'Your Biologic Protocol was recently generated. Protocols are designed to run 30–90 days. Come back after your cycle completes, or upload updated medical records to unlock an early refresh.',
          code: 'regenerate_too_soon'
        };
      }
    }
    return { ok: true };
  }
  // Free tier: 1 Day-1 preview ever
  const rows = await sbSelect('usage_log', `user_id=eq.${userId}&endpoint=eq.personalise-week-preview&select=id&limit=1`);
  if (rows && rows.length > 0) return { ok: false, msg: 'Your Day 1 preview has been generated. Upgrade to Pro to unlock all 7 days.' };
  return { ok: true };
}

// Persist the generated protocol to meal_plans so it survives logout/login.
// Upserts on user_id — one active protocol per user at a time.
async function saveProtocol({ userId, result, mealStyle, additionalGoal, cycleLengthDays, isPreview }) {
  if (!userId || !result) return;
  try {
    await sbUpsert('meal_plans', {
      user_id: userId,
      title: 'Biologic Protocol',
      goal: additionalGoal || null,
      duration_days: 7,
      dietary_preferences: mealStyle ? { mealStyle } : null,
      meals: result,
      meal_style: mealStyle || 'none',
      additional_goal: additionalGoal || null,
      cycle_length_days: cycleLengthDays || 30,
      cycle_started_at: new Date().toISOString(),
      is_preview: !!isPreview,
      generated_by_model: 'claude-haiku-4-5-20251001',
      updated_at: new Date().toISOString(),
    }, 'user_id');
  } catch (e) {
    console.error('[week-stream] saveProtocol failed:', e?.message);
  }
}

function buildPrompt({ markers, profileStr, medFlag, mealStyle, additionalGoal, dayOnly }) {
  const ms = markers.slice(0, 20).map(m => `${m.name}:${m.value}${m.unit || ''}(${m.status || 'unknown'})`).join(', ');
  const profileBlock = profileStr ? `User profile: ${profileStr}\n` : '';
  const medSafetyBlock = medFlag
    ? '\nCRITICAL SAFETY: User is on medications listed above. Before recommending any supplement, food, or protocol, check for known interactions. Include contraindications. Never recommend stopping a prescription.\n'
    : '';
  const styleBlock = mealStyle && mealStyle !== 'none' ? `\nMeal style preference: ${mealStyle}. ALL meals AND alternatives must respect this style.\n` : '';
  const goalBlock = additionalGoal ? `\nAdditional weekly focus from user: "${additionalGoal}". Optimize the week's design toward this goal IN ADDITION to the biomarker-driven priorities. Reflect this in key_insight.\n` : '';

  const dayCount = dayOnly ? 1 : 7;
  const dayList = dayOnly ? ['Monday'] : ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  return `${profileBlock}User biomarkers: ${ms}${styleBlock}${goalBlock}${medSafetyBlock}

Design a personalised ${dayCount}-day Biologic Protocol calibrated to the user's profile and biomarkers. ${dayOnly ? 'Return EXACTLY ONE day (Monday) — this is a free-tier preview. Do not generate Tuesday through Sunday.' : 'Each of the 7 days MUST be biologically distinct: different theme, meals, training stimulus, focus marker. Do NOT repeat any meal across days. Generate ALL 7 days in order: ' + dayList.join(', ') + '.'} If the user is female and cycling, periodize training (heavier loads in follicular, lower-intensity in luteal). If postmenopausal, prioritize strength training and bone density. Calorie/protein targets must reflect sex/age/weight/activity.

**MEAL DESIGN RULES — STRICT, NO EXCEPTIONS:**
- This is a busy normal person, not a chef. Meals MUST be 5 ingredients or fewer, recognizable to the average American shopper, and buildable in 15 minutes or less.
- ALLOWED PROTEINS ONLY: chicken breast, chicken thigh, ground beef, ground turkey, eggs, plain salmon fillet, canned tuna, canned salmon, plain shrimp, tofu, greek yogurt, cottage cheese, peanut butter. (If meal style is vegetarian/vegan, drop animal items.)
- ALLOWED CARBS ONLY: white rice, brown rice, oatmeal, sweet potato, regular potato, whole wheat bread/toast, regular pasta, whole grain pasta, tortillas, canned beans (black/pinto/chickpeas), bananas, apples, berries.
- ALLOWED VEG ONLY: broccoli, spinach, kale, carrots, bell peppers, cucumber, tomato, onion, garlic, lettuce/salad mix, frozen mixed vegetables, zucchini, mushrooms, avocado.
- ALLOWED FATS ONLY: olive oil, butter, avocado, nuts (almonds, walnuts, peanuts, cashews), nut butter, cheese (cheddar, mozzarella, feta), seeds (chia, flax, pumpkin).
- BANNED ENTIRELY: lamb, duck, veal, game meats, organ meats, scallops, mussels, octopus, ahi tuna steaks, exotic mushrooms (shiitake/maitake okay; everything else no), quinoa unless user style is keto/paleo, farro, bulgur, millet, sorghum, miso (unless Asian dietary restriction), tahini, harissa, gochujang, white bean puree, anything PUREED, COMPOTED, CONFITED, BRAISED for longer than 20 min, or with French/Italian chef terminology.
- BANNED WORDS in meal names: puree, confit, compote, beurre, jus, reduction, brunoise, julienne, sous vide, charred, blistered, smoked (unless smoked salmon), seared (just say "cooked"), finished with.
- Meal NAMES must be plain English a 10-year-old would understand: "Chicken & Rice Bowl", "Scrambled Eggs with Toast", "Tuna Sandwich", "Greek Yogurt with Berries". NOT "Pan-seared chicken with herbed rice pilaf".
- Items array must list raw grocery-store ingredient names ONLY (e.g. "chicken breast 6oz", "cooked white rice 1 cup", "frozen broccoli 1 cup", "olive oil 1 tbsp"). No prep verbs in items.

**FLAVOR BOOST — separate optional field per meal:**
Each meal includes a "flavor_boost" field (string, max 2 sentences) describing how to make it more interesting if the user wants. THIS is where you can suggest soy sauce, herbs, sriracha, lemon, garlic powder, paprika, hot sauce, parmesan, ranch, salsa, etc. — common condiments only. Example: "Doctor it up: add a splash of soy sauce + sesame seeds + sriracha for a teriyaki feel." Default flavor_boost = pantry condiments. NEVER advanced techniques.

For EACH meal, provide exactly 2 alternatives: one swap="nutrient_match" (different but equally simple protein/carb combo, same allowed list), one swap="diet_pref" (honors any listed dietary_restrictions or the meal style; if none, offer a cheaper version using canned/frozen options). All alternatives follow the SAME meal design rules above.

Schema (return ONLY this JSON, no markdown, no commentary):
{
"key_insight":"one sentence describing the design${additionalGoal ? ' AND how it addresses the user\'s stated focus' : ''}",
"principles":["3-5 short guiding rules"],
"days":[
{
"day":"Monday","theme":"Foundation","focus_marker":"marker name",
"morning":{"wake_time":"6:30am","actions":["action 1","action 2"],"supps_am":["Supp name dose"]},
"meals":{
"breakfast":{"name":"plain meal name (e.g. Scrambled Eggs with Toast)","items":["raw ingredient + qty","raw ingredient + qty","raw ingredient + qty"],"why":"one sentence with user's actual numbers","macros":{"p":30,"c":45,"f":15,"cal":430},"targets":["marker"],"flavor_boost":"Doctor it up: add X + Y for flavor.","alternatives":[
{"swap":"nutrient_match","name":"alt plain name","why":"same nutrients"},
{"swap":"diet_pref","name":"alt plain name","why":"honors restriction/style or cheaper"}
]},
"lunch":{"name":"...","items":[],"why":"...","macros":{},"targets":[],"flavor_boost":"...","alternatives":[...2 items same shape]},
"dinner":{"name":"...","items":[],"why":"...","macros":{},"targets":[],"flavor_boost":"...","alternatives":[...2 items same shape]}
},
"movement":{"type":"Zone 2 cardio","duration":"45 min","when":"afternoon"},
"evening":{"supps_pm":["Magnesium glycinate 300mg"],"wind_down":"screens off 9:30pm","sleep_target":"10:30pm"}
}${dayOnly ? '' : `,\n { ...same shape for Tuesday Strength },\n { ...Wednesday Recovery },\n { ...Thursday Metabolic },\n { ...Friday Hormonal },\n { ...Saturday Long Movement },\n { ...Sunday Restoration }\n [must include all 7 days]`}
],
"weekly_summary":{"training_load":"e.g. 3 heavy + 2 zone 2 + 2 recovery","total_supp_cost":"$X/week","estimated_calorie_target":${dayCount * 2000}}
}`;
}

function tryExtractProgress(accumulatedText) {
  const daysIdx = accumulatedText.indexOf('"days"');
  if (daysIdx === -1) return null;
  const arrayStart = accumulatedText.indexOf('[', daysIdx);
  if (arrayStart === -1) return null;

  const extracted = [];
  let i = arrayStart + 1;
  while (i < accumulatedText.length) {
    while (i < accumulatedText.length && /[\s,]/.test(accumulatedText[i])) i++;
    if (i >= accumulatedText.length) break;
    if (accumulatedText[i] === ']') break;
    if (accumulatedText[i] !== '{') break;

    const objStart = i;
    let depth = 0, inString = false, escape = false, objEnd = -1;
    for (let j = objStart; j < accumulatedText.length; j++) {
      const ch = accumulatedText[j];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { objEnd = j; break; } }
    }
    if (objEnd === -1) break;

    const dayText = accumulatedText.slice(objStart, objEnd + 1);
    try {
      const parsed = JSON.parse(dayText.replace(/,\s*([}\]])/g, '$1'));
      extracted.push(parsed);
    } catch { break; }
    i = objEnd + 1;
  }
  return extracted.length > 0 ? { days: extracted } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'No API key configured' }));
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }

  // FIX: accept isRegenerate and cycleLengthDays from client
  const { markers, userId = null, plan = 'free', mealStyle = 'none', additionalGoal = '', dayOnly = false, isRegenerate = false, cycleLengthDays = 30 } = parsed || {};
  if (!Array.isArray(markers) || markers.length === 0) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'No markers provided' }));
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // FIX: pass isRegenerate so first-time generation is never blocked
  const lim = await checkLimits({ userId, plan, isRegenerate });
  if (!lim.ok) {
    sse(res, 'error', { message: lim.msg, code: lim.code || 'rate_limited' });
    return res.end();
  }

  const profile = await getProfile(userId);
  const profileStr = formatProfileForPrompt(profile);
  const profileHash = await hashProfile(profile);
  const medFlag = hasMedications(profile);

  const markerHash = await hashMarkers(markers);
  const PROMPT_VERSION = 'v2-pantry';
  const cacheKey = await sha256(`week|${PROMPT_VERSION}|${mealStyle}|${additionalGoal.toLowerCase().trim()}|${dayOnly ? 'preview' : 'full'}|${profileHash}|${markerHash}`);
  const cachedRows = await sbSelect('personalised_cache', `cache_key=eq.${cacheKey}&select=result,hits&limit=1`);
  if (cachedRows && cachedRows.length > 0) {
    const row = cachedRows[0];
    sbUpdate('personalised_cache', `cache_key=eq.${cacheKey}`, { hits: (row.hits || 0) + 1, last_hit_at: new Date().toISOString() }).catch(() => {});
    logUsage(userId, 'personalise-week-cached').catch(() => {});
    // FIX: also save cached result to meal_plans for persistence
    saveProtocol({ userId, result: row.result, mealStyle, additionalGoal, cycleLengthDays, isPreview: dayOnly }).catch(() => {});
    sse(res, 'cached', { cache: 'HIT' });
    if (row.result?.days) {
      for (let i = 0; i < row.result.days.length; i++) {
        sse(res, 'day', { index: i, day: row.result.days[i] });
      }
    }
    sse(res, 'complete', { result: row.result });
    return res.end();
  }

  const prompt = buildPrompt({ markers, profileStr, medFlag, mealStyle, additionalGoal, dayOnly });
  const maxTokens = dayOnly ? 2500 : 7000;

  sse(res, 'start', { dayOnly });

  let accumulated = '';
  let emittedDayCount = 0;
  let lastProgressDays = [];
  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system: SYSTEM,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    sse(res, 'error', { message: `Network error: ${e.message}` });
    return res.end();
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => '');
    sse(res, 'error', { message: `Claude API ${anthropicRes.status}: ${errText.slice(0, 200)}` });
    return res.end();
  }

  const reader = anthropicRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const dataMatch = evt.match(/^data: (.+)$/m);
        if (!dataMatch) continue;
        try {
          const data = JSON.parse(dataMatch[1]);
          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            accumulated += data.delta.text;
            const progress = tryExtractProgress(accumulated);
            if (progress && progress.days.length > emittedDayCount) {
              for (let i = emittedDayCount; i < progress.days.length; i++) {
                sse(res, 'day', { index: i, day: progress.days[i] });
              }
              emittedDayCount = progress.days.length;
              lastProgressDays = progress.days;
            }
          }
        } catch { /* ignore malformed events */ }
      }
    }
  } catch (e) {
    sse(res, 'error', { message: `Stream read error: ${e.message}` });
    return res.end();
  }

  sse(res, 'parsing', {});
  let result;
  try {
    result = parseJSON(accumulated);
  } catch (e) {
    if (lastProgressDays.length > 0) {
      console.warn('[week-stream] final parse failed, using progressive extraction:', e.message);
      const keyMatch = accumulated.match(/"key_insight"\s*:\s*"([^"]+)"/);
      const principlesMatch = accumulated.match(/"principles"\s*:\s*\[([^\]]+)\]/);
      result = {
        key_insight: keyMatch ? keyMatch[1] : 'Your protocol has been designed from your biology.',
        principles: principlesMatch ? principlesMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean) : [],
        days: lastProgressDays,
        _recovered: true,
      };
    } else {
      sse(res, 'error', { message: `Parse failed: ${e.message}`, raw: accumulated.slice(0, 400) });
      return res.end();
    }
  }

  if (!result.days || !Array.isArray(result.days) || result.days.length === 0) {
    sse(res, 'error', { message: 'Model returned no days', raw: accumulated.slice(0, 400) });
    return res.end();
  }

  // Persist to cache and to user's meal_plans for session-persistent access
  try {
    await sbUpsert('personalised_cache', { cache_key: cacheKey, type: 'week', result, hits: 0, created_at: new Date().toISOString() }, 'cache_key');
  } catch (e) { console.error('[week-stream] cache write failed:', e?.message); }

  // FIX: Save to meal_plans so user sees their protocol on next login
  await saveProtocol({ userId, result, mealStyle, additionalGoal, cycleLengthDays, isPreview: dayOnly });

  const logEndpoint = dayOnly ? 'personalise-week-preview' : 'personalise-week';
  try { await logUsage(userId, logEndpoint); } catch (e) { console.error('[week-stream] usage log failed:', e?.message); }

  sse(res, 'complete', { result });
  return res.end();
}
