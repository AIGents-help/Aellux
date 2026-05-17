import { sbSelect, sbUpsert, sbUpdate, rateLimit, logUsage, sha256, hashMarkers, getProfile, formatProfileForPrompt, hashProfile, hasMedications, getIntelligenceContext, formatIntelligenceForPrompt } from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 300 };

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
async function saveProtocol({ userId, result, mealStyle, additionalGoal, cycleLengthDays, isPreview, mealPrep = false }) {
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
      meal_prep: !!mealPrep,
      generated_by_model: 'claude-haiku-4-5-20251001',
      updated_at: new Date().toISOString(),
    }, 'user_id');
  } catch (e) {
    console.error('[week-stream] saveProtocol failed:', e?.message);
  }
}

function buildPrompt({ markers, profileStr, medFlag, mealStyle, additionalGoal, dayOnly, mealPrep, intelligenceStr = '' }) {

// Strip GPS/device telemetry and intake logs before sending to AI
const GPS_NOISE = /horizontal.?acc|vertical.?acc|hAcc|vAcc|HDOP|elevation.?(gain|change|loss)|GPS.?signal|route.?duration|avg.?speed|average.?speed|m\/s|ECG.?raw|accelerometer|supplement.?intake|food.?diary|leafy.?greens|microgreens|protein.?intake|pathogenic.?variant|device.?noise|step.?count.?raw/i;
const cleanMarkers = (arr) => (arr || []).filter(m => m && m.name && !GPS_NOISE.test(m.name));

  const ms = cleanMarkers(markers).slice(0, 20).map(m => `${m.name}:${m.value}${m.unit || ''}(${m.status || 'unknown'})`).join(', ');
  const profileBlock = profileStr ? `User profile: ${profileStr}\n` : '';
  const medSafetyBlock = medFlag
    ? '\nCRITICAL SAFETY: User is on medications listed above. Before recommending any supplement, food, or protocol, check for known interactions. Include contraindications. Never recommend stopping a prescription.\n'
    : '';
  const styleBlock = mealStyle && mealStyle !== 'none' ? `\nMeal style preference: ${mealStyle}. ALL meals AND alternatives must respect this style.\n` : '';
  const mealPrepBlock = mealPrep ? `
MEAL PREP MODE — ACTIVE. The user wants to cook everything on prep day and portion into containers for the full week. Design meals around this constraint:
- Choose EXACTLY 2 bulk proteins for the week (e.g. 10 lbs ground beef + 1 dozen eggs). Every meal uses one of these two proteins.
- Choose EXACTLY 2 bulk carbs/sides (e.g. a large pot of brown rice + roasted sweet potatoes). Every meal pairs one of these two sides.
- Choose EXACTLY 1-2 bulk vegetables (e.g. 2 lbs steamed broccoli + a bag of spinach). Used across all meals.
- Every meal name MUST reference the container format: "Ground Beef & Rice Container", "Egg & Sweet Potato Bowl", "Ground Beef & Broccoli Box".
- Items array lists PORTIONED amounts per container, not full batch amounts.
- The "why" field MUST include the batch cook instruction for that protein/carb (e.g. "Cook 10 lbs ground beef with garlic and salt Sunday; portion 6oz per container").
- flavor_boost field is the ONLY place to add variety — different sauces/seasonings each day so it doesn't get boring: Day 1 teriyaki, Day 2 hot sauce + lime, Day 3 ranch, Day 4 salsa, Day 5 garlic + parmesan, Day 6 sriracha mayo, Day 7 BBQ sauce.
- Set key_insight to describe the batch cook strategy, including estimated total cook time (target: under 2 hours on prep day).
- weekly_summary.training_load should include "Batch cook Day 1: [protein] + [carb] + [veg] → 21 containers"
` : '';
  const goalBlock = additionalGoal ? `\nAdditional weekly focus from user: "${additionalGoal}". Optimize the week's design toward this goal IN ADDITION to the biomarker-driven priorities. Reflect this in key_insight.\n` : '';

  const dayCount = dayOnly ? 1 : 7;
  const dayList = dayOnly ? ['Day 1'] : ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7'];

  return `${profileBlock}User biomarkers: ${ms}${styleBlock}${mealPrepBlock}${goalBlock}${intelligenceStr}${medSafetyBlock}

Design a personalised ${dayCount}-day Biologic Protocol calibrated to the user's profile and biomarkers. ${dayOnly ? 'Return EXACTLY ONE day (Day 1) — this is a free-tier preview. Do not generate Day 2 through Day 7.' : 'Each of the 7 days MUST be biologically distinct: different theme, meals, training stimulus, focus marker. Do NOT repeat any meal across days. Generate ALL 7 days in order: ' + dayList.join(', ') + '.'} If the user is female and cycling, periodize training (heavier loads in follicular, lower-intensity in luteal). If postmenopausal, prioritize strength training and bone density.

**PROTEIN TARGETS — CRITICAL, DO NOT UNDERESTIMATE:**
- Minimum protein: 1g per pound of target bodyweight (not current weight if overweight). For a 175lb male target = 175g protein/day minimum.
- For males with low testosterone, elevated estrogen, or body recomposition goals: 1.0–1.2g per pound of target bodyweight. Protein IS the testosterone substrate — underfeeding it directly worsens hormonal recovery.
- Distribute evenly: ~55–65g protein per meal across 3 meals. Breakfast must NOT be low-protein. 30–35g per meal is insufficient for a male trying to build or preserve lean mass.
- The example macros below (p:30) are PLACEHOLDERS ONLY — always override with the user's actual calculated targets.
- Calorie targets: multiply target bodyweight in lbs × 14–16 (fat loss) or × 16–18 (recomp/maintenance). Always state the daily calorie and protein target in key_insight.

**IDEAL BODY WEIGHT — always include guidance:**
- In key_insight, briefly note the user's estimated ideal body weight range based on height, frame size, and goals. Reference it as the protein calculation basis.
- For males: ~106 lbs for first 5 feet of height + 6 lbs per inch above 5 feet (medium frame). Adjust ±10% for frame.

**MEAL DESIGN RULES — STRICT, NO EXCEPTIONS:**
- This is a busy normal person, not a chef. Meals MUST be 5 ingredients or fewer, recognizable to the average American shopper, and buildable in 15 minutes or less.

MEAL STYLE DETERMINES ALL ALLOWED FOODS — the style OVERRIDES all default lists below:

- ANIMAL-BASED: Proteins = beef (all cuts), lamb, pork, chicken, salmon, sardines, eggs, liver, heart, kidney, full-fat aged cheese, kefir, butter, ghee. Carbs = FRUIT ONLY (berries, banana, mango, pineapple, melon, honey). Fats = butter, ghee, tallow, beef fat. ABSOLUTELY FORBIDDEN: white rice, brown rice, oats, bread, pasta, tortillas, beans, broccoli (high oxalate), spinach (high oxalate), seed oils, anything processed. Small amounts of low-toxin veg (zucchini, cucumber, squash) only if needed.
- CARNIVORE: Beef, lamb, pork, chicken, fish, eggs, butter, tallow only. Zero plants. Zero fruit. Salt for seasoning.
- KETO: Proteins = any meat/fish/eggs. Total daily net carbs = 20-50g MAX for the entire day across all meals. Carbs = non-starchy vegetables only. Fats = avocado, olive oil, butter, cheese, nuts. No grains. No fruit except a small handful of berries (under 5g net carbs). Track daily totals — do not exceed 50g net carbs across all 3 meals combined.
- AIP: Proteins = any meat or fish. No eggs, no dairy, no nuts, no seeds, no coffee, no alcohol. No NIGHTSHADE vegetables (NO tomato, NO bell pepper, NO chili pepper, NO potato, NO eggplant, NO paprika, NO cayenne — these are the nightshades). Black pepper IS allowed (it is not a nightshade). No grains, no legumes. YES: sweet potato, cassava, plantain, coconut, olive oil, all non-nightshade vegetables, all fruit, all vinegars except apple cider.
- LOW-FODMAP: No onion, no garlic (garlic-infused oil OK), no wheat, no rye, no lentils, no cashews, no pistachios, no apples, no pears, no stone fruit (peaches/plums/cherries), no watermelon, no regular mushrooms, no cauliflower. Canned chickpeas OK in 1/4 cup servings only (rinse thoroughly). Avocado limit 1/8 per serving. YES: rice, oats, potato, carrot, bell pepper (limit 1/2 cup), cucumber, tomato (limit 1 small), strawberries, blueberries, oranges, grapes, lactose-free dairy.
- WHOLE30: No sugar or sweeteners of any kind (including honey, maple syrup, coconut sugar), no alcohol, no grains, no legumes (includes peanuts and peanut butter), no dairy, no soy, no MSG or carrageenan. YES: all meat, fish, eggs, all vegetables, all fruit, almonds, walnuts, cashews, olive oil, coconut oil, ghee.
- HIGH-PROTEIN: Every single meal MUST contain 55-65g protein. Use: chicken breast, 93% lean ground beef, eggs + egg whites, greek yogurt, cottage cheese, canned tuna/salmon. Carbs are secondary and timed around training. Do not let carbs or fat crowd out protein.
- DIABETIC-FRIENDLY: GI under 55 for every carb. NO white rice (GI 73), NO white bread (GI 75), NO regular potato (GI 78), NO watermelon (GI 72), NO refined sugar, NO instant oats (GI 83). EVERY carb MUST be paired with protein + fat in the same meal. YES: lentils (GI 32), chickpeas (GI 28), sweet potato (GI 54), barley (GI 28), steel-cut oats (GI 42), most berries (GI 25-40), all non-starchy vegetables.
- PALEO: All meat/fish/eggs, vegetables, fruit, nuts, seeds, sweet potato. No grains, no legumes, no dairy, no processed foods, no refined sugar, no white potato (sweet potato OK), no peanuts (legume), no alcohol.
- VEGETARIAN: Eggs, greek yogurt, cottage cheese, tofu, tempeh, legumes, cheese. No meat or fish.
- VEGAN: Tofu, tempeh, legumes, nuts, seeds. No animal products whatsoever — NO meat, NO fish, NO eggs, NO dairy, NO honey (bees are animals). Use maple syrup or dates as sweeteners.
- PESCATARIAN: Any fish or seafood + eggs + dairy + vegetables + grains. No land meat.
- MEDITERRANEAN: Fish, chicken, legumes, whole grains, olive oil, vegetables, moderate dairy. Red meat max 1-2x per week.
- DEFAULT (no preference): Proteins: chicken breast, chicken thigh, ground beef, ground turkey, eggs, salmon, canned tuna, shrimp, greek yogurt, cottage cheese. Carbs: white rice, brown rice, oatmeal, sweet potato, potato, whole wheat bread, pasta, tortillas, canned beans, bananas, apples, berries. Veg: broccoli, spinach, kale, carrots, bell peppers, cucumber, tomato, onion, garlic, lettuce, zucchini, mushrooms, avocado. Fats: olive oil, butter, avocado, almonds, walnuts, peanut butter, cheese, seeds.

GLOBAL BANS (apply to ALL styles unless style explicitly allows): scallops, mussels, octopus, ahi tuna steaks, farro, bulgur, millet, sorghum, miso (unless Asian flavor profile), white bean puree, anything PUREED, COMPOTED, CONFITED, BRAISED longer than 20 min, or using French/Italian chef terminology.
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
"day":"Day 1","theme":"Foundation","focus_marker":"marker name",
"morning":{"wake_time":"6:30am","actions":["action 1","action 2"],"supps_am":["Supp name dose"]},
"meals":{
"breakfast":{"name":"plain meal name (e.g. Scrambled Eggs with Toast)","items":["raw ingredient + qty","raw ingredient + qty","raw ingredient + qty"],"why":"one sentence with user's actual numbers","macros":{"p":55,"c":45,"f":15,"cal":530},"targets":["marker"],"flavor_boost":"Doctor it up: add X + Y for flavor.","alternatives":[
{"swap":"nutrient_match","name":"alt plain name","why":"same nutrients"},
{"swap":"diet_pref","name":"alt plain name","why":"honors restriction/style or cheaper"}
]},
"lunch":{"name":"...","items":[],"why":"...","macros":{},"targets":[],"flavor_boost":"...","alternatives":[...2 items same shape]},
"dinner":{"name":"...","items":[],"why":"...","macros":{},"targets":[],"flavor_boost":"...","alternatives":[...2 items same shape]}
},
"movement":{"type":"Zone 2 cardio","duration":"45 min","when":"afternoon"},
"evening":{"supps_pm":["Magnesium glycinate 300mg"],"wind_down":"screens off 9:30pm","sleep_target":"10:30pm"}
}${dayOnly ? '' : `,\n { ...same shape for Day 2 Strength },\n { ...Day 3 Recovery },\n { ...Day 4 Metabolic },\n { ...Day 5 Hormonal },\n { ...Day 6 Long Movement },\n { ...Day 7 Restoration }\n [must include all 7 days]`}
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
  const { markers, userId = null, plan = 'free', mealStyle = 'none', additionalGoal = '', dayOnly = false, isRegenerate = false, cycleLengthDays = 30, mealPrep = false } = parsed || {};
  if (!Array.isArray(markers) || markers.length === 0) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'No markers provided' }));
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Keepalive ping every 20s to prevent proxy/CDN from closing idle connections mid-stream
  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
  }, 20000);

  // FIX: pass isRegenerate so first-time generation is never blocked
  const lim = await checkLimits({ userId, plan, isRegenerate });
  if (!lim.ok) {
    sse(res, 'error', { message: lim.msg, code: lim.code || 'rate_limited' });
    clearInterval(keepalive); return res.end();
  }

  const profile = await getProfile(userId);
  const profileStr = formatProfileForPrompt(profile);
  const profileHash = await hashProfile(profile);
  const medFlag = hasMedications(profile);
  const intelligence = await getIntelligenceContext(userId);
  const intelligenceStr = formatIntelligenceForPrompt(intelligence);

  const markerHash = await hashMarkers(markers);
  const PROMPT_VERSION = 'v2-pantry';
  const intelHash = intelligence ? await sha256(JSON.stringify(intelligence)) : 'nointel';
  const cacheKey = await sha256(`week|${PROMPT_VERSION}|${mealStyle}|${mealPrep ? 'prep' : 'standard'}|${additionalGoal.toLowerCase().trim()}|${dayOnly ? 'preview' : 'full'}|${profileHash}|${markerHash}|${intelHash}`);
  const cachedRows = await sbSelect('personalised_cache', `cache_key=eq.${cacheKey}&select=result,hits&limit=1`);
  if (cachedRows && cachedRows.length > 0) {
    const row = cachedRows[0];
    sbUpdate('personalised_cache', `cache_key=eq.${cacheKey}`, { hits: (row.hits || 0) + 1, last_hit_at: new Date().toISOString() }).catch(() => {});
    logUsage(userId, 'personalise-week-cached').catch(() => {});
    // FIX: also save cached result to meal_plans for persistence
    saveProtocol({ userId, result: row.result, mealStyle, additionalGoal, cycleLengthDays, isPreview: dayOnly, mealPrep }).catch(() => {});
    sse(res, 'cached', { cache: 'HIT' });
    if (row.result?.days) {
      for (let i = 0; i < row.result.days.length; i++) {
        sse(res, 'day', { index: i, day: row.result.days[i] });
      }
    }
    sse(res, 'complete', { result: row.result });
    clearInterval(keepalive); return res.end();
  }

  const prompt = buildPrompt({ markers, profileStr, medFlag, mealStyle, additionalGoal, dayOnly, mealPrep, intelligenceStr });
  const maxTokens = dayOnly ? 2500 : 12000;

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
    clearInterval(keepalive); return res.end();
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => '');
    sse(res, 'error', { message: `Claude API ${anthropicRes.status}: ${errText.slice(0, 200)}` });
    clearInterval(keepalive); return res.end();
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
    clearInterval(keepalive); return res.end();
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
      clearInterval(keepalive); return res.end();
    }
  }

  if (!result.days || !Array.isArray(result.days) || result.days.length === 0) {
    sse(res, 'error', { message: 'Model returned no days', raw: accumulated.slice(0, 400) });
    clearInterval(keepalive); return res.end();
  }

  // Persist to cache and to user's meal_plans for session-persistent access
  try {
    await sbUpsert('personalised_cache', { cache_key: cacheKey, type: 'week', result, hits: 0, created_at: new Date().toISOString() }, 'cache_key');
  } catch (e) { console.error('[week-stream] cache write failed:', e?.message); }

  // FIX: Save to meal_plans so user sees their protocol on next login
  await saveProtocol({ userId, result, mealStyle, additionalGoal, cycleLengthDays, isPreview: dayOnly, mealPrep });

  const logEndpoint = dayOnly ? 'personalise-week-preview' : 'personalise-week';
  try { await logUsage(userId, logEndpoint); } catch (e) { console.error('[week-stream] usage log failed:', e?.message); }

  sse(res, 'complete', { result });
  clearInterval(keepalive); return res.end();
}
