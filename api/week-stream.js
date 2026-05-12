import { sbSelect, sbUpsert, sbUpdate, rateLimit, logUsage, sha256, hashMarkers, getProfile, formatProfileForPrompt, hashProfile, hasMedications } from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

const SYSTEM = 'You are Aellux, a precision health intelligence. Respond with ONLY a single valid JSON object matching the schema. No prose, no preamble, no markdown fences. Start with { and end with }.';

function parseJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in model output');
  const candidate = text.slice(start, end + 1);

  // Strategy 1: as-is
  try { return JSON.parse(candidate); } catch {}
  // Strategy 2: strip trailing commas before } or ]
  try { return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')); } catch {}
  // Strategy 3: if the JSON appears truncated (no closing }), try to close the days array gracefully
  // and the outer object. Walk back from end to find the last complete day object's }, then close.
  const tryRepair = (s) => {
    // Find "days":[ and walk through complete day objects, then truncate after the last one
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
      else if (ch === '}') {
        depth--;
        if (depth === 0) lastCloseIdx = i;
      }
    }
    if (lastCloseIdx === -1) throw new Error('no complete day');
    // Truncate after last complete day, close array and object
    const repaired = s.slice(0, lastCloseIdx + 1) + ']}';
    return JSON.parse(repaired.replace(/,\s*([}\]])/g, '$1'));
  };
  try { return tryRepair(candidate); } catch {}
  throw new Error('All JSON repair strategies failed');
}

// Streaming progress events sent to the client over SSE.
// Phases: starting, generating, parsing, days_extracted, complete, error
function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function checkLimits({ userId, plan }) {
  if (!userId) return { ok: true };
  if (plan === 'pro') {
    const r = await rateLimit({ userId, endpoint: 'personalise-week', limit: 1, windowHours: 24 * 7 });
    return r.ok ? { ok: true } : { ok: false, msg: 'Your Biologic Protocol refreshes every 7 days. Tap regenerate next week, or swap meals/goals individually right now.' };
  }
  // Free tier: 1 Day-1 preview ever
  const rows = await sbSelect('usage_log', `user_id=eq.${userId}&endpoint=eq.personalise-week-preview&select=id&limit=1`);
  if (rows && rows.length > 0) return { ok: false, msg: 'Your Day 1 preview has been generated. Upgrade to Pro to unlock all 7 days.' };
  return { ok: true };
}

function buildPrompt({ markers, profileStr, medFlag, mealStyle, additionalGoal, dayOnly }) {
  const ms = markers.slice(0, 20).map(m => `${m.name}:${m.value}${m.unit || ''}(${m.status || 'unknown'})`).join(', ');
  const profileBlock = profileStr ? `User profile: ${profileStr}\n` : '';
  const medSafetyBlock = medFlag
    ? '\nCRITICAL SAFETY: User is on medications listed above. Before recommending any supplement, food, or protocol, check for known interactions. Include contraindications. Never recommend stopping a prescription.\n'
    : '';
  const styleBlock = mealStyle && mealStyle !== 'none' ? `\nMeal style preference: ${mealStyle}. ALL meals AND alternatives must respect this style.\n` : '';
  const goalBlock = additionalGoal ? `\nAdditional weekly focus from user: "${additionalGoal}". Optimize the week's design toward this goal IN ADDITION to the biomarker-driven priorities. Reflect this in key_insight.\n` : '';

  return `${profileBlock}User biomarkers: ${ms}${styleBlock}${goalBlock}${medSafetyBlock}

Design a personalised 7-day Biologic Protocol calibrated to the user's profile and biomarkers. ${dayOnly ? 'Return ONLY Monday (Day 1) — this is a free-tier preview.' : 'Each of the 7 days MUST be biologically distinct: different theme, meals, training stimulus, focus marker. Do NOT repeat any meal across days.'} If the user is female and cycling, periodize training (heavier loads in follicular, lower-intensity in luteal). If postmenopausal, prioritize strength training and bone density. Calorie/protein targets must reflect sex/age/weight/activity. For EACH meal, provide 4 alternatives keyed by swap reason: nutrient_match, cheaper, faster (<10min prep), and diet_pref (respecting any listed dietary_restrictions or the meal style above).

Schema (return ONLY this JSON, no markdown):
{
  "key_insight":"one sentence describing the week's overall design${additionalGoal ? ' AND how it addresses the user\'s stated focus' : ''}",
  "principles":["3-5 short guiding rules across the week"],
  "days":[
    {
      "day":"Monday","theme":"Foundation","focus_marker":"marker name",
      "morning":{"wake_time":"6:30am","actions":["short action 1","short action 2"],"supps_am":["Supp name dose"]},
      "meals":{
        "breakfast":{"name":"meal name","items":["item 1","item 2","item 3"],"why":"one sentence referencing user's actual numbers","macros":{"p":30,"c":45,"f":15,"cal":430},"targets":["marker"],"alternatives":[
          {"swap":"nutrient_match","name":"alt name","why":"hits same nutrient profile"},
          {"swap":"cheaper","name":"alt name","why":"$X vs $Y, same goal"},
          {"swap":"faster","name":"alt name","why":"5 min prep, same nutrient hit"},
          {"swap":"diet_pref","name":"alt name","why":"honors restriction/style"}
        ]},
        "lunch":{"name":"...","items":[],"why":"...","macros":{},"targets":[],"alternatives":[...4 items same shape]},
        "dinner":{"name":"...","items":[],"why":"...","macros":{},"targets":[],"alternatives":[...4 items same shape]}
      },
      "movement":{"type":"Zone 2 cardio","duration":"45 min","when":"afternoon"},
      "evening":{"supps_pm":["Magnesium glycinate 300mg"],"wind_down":"screens off 9:30pm","sleep_target":"10:30pm"}
    }${dayOnly ? '' : ',\n    { ...same shape for Tuesday Strength },\n    { ...Wednesday Recovery },\n    { ...Thursday Metabolic },\n    { ...Friday Hormonal },\n    { ...Saturday Long Movement },\n    { ...Sunday Restoration }'}
  ],
  "weekly_summary":{"training_load":"e.g. 3 heavy days + 2 zone 2 + 2 recovery","total_supp_cost":"$X/week","estimated_calorie_target":14000}
}`;
}

// Heuristic: progressively try to parse the partial JSON. As Claude streams,
// we look for completed "day" objects inside the days array and emit them.
// Returns { days: [extracted day objects so far] } or null if nothing parseable yet.
function tryExtractProgress(accumulatedText) {
  // Find the start of the days array
  const daysIdx = accumulatedText.indexOf('"days"');
  if (daysIdx === -1) return null;
  const arrayStart = accumulatedText.indexOf('[', daysIdx);
  if (arrayStart === -1) return null;

  // Scan for balanced day objects (each is a top-level {...} inside the array)
  const extracted = [];
  let i = arrayStart + 1;
  while (i < accumulatedText.length) {
    // Skip whitespace and commas
    while (i < accumulatedText.length && /[\s,]/.test(accumulatedText[i])) i++;
    if (i >= accumulatedText.length) break;
    if (accumulatedText[i] === ']') break; // end of days array
    if (accumulatedText[i] !== '{') break; // unexpected

    // Find matching closing brace
    const objStart = i;
    let depth = 0;
    let inString = false;
    let escape = false;
    let objEnd = -1;
    for (let j = objStart; j < accumulatedText.length; j++) {
      const ch = accumulatedText[j];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { objEnd = j; break; } }
    }
    if (objEnd === -1) break; // day object incomplete

    const dayText = accumulatedText.slice(objStart, objEnd + 1);
    try {
      const parsed = JSON.parse(dayText.replace(/,\s*([}\]])/g, '$1'));
      extracted.push(parsed);
    } catch {
      break; // malformed; stop here, will retry on next chunk
    }
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

  // Parse body (Node runtime needs explicit body parsing)
  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }

  const { markers, userId = null, plan = 'free', mealStyle = 'none', additionalGoal = '', dayOnly = false } = parsed || {};
  if (!Array.isArray(markers) || markers.length === 0) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'No markers provided' }));
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering
  res.flushHeaders?.();

  // Rate limit
  const lim = await checkLimits({ userId, plan });
  if (!lim.ok) {
    sse(res, 'error', { message: lim.msg, code: 'rate_limited' });
    return res.end();
  }

  // Load profile
  const profile = await getProfile(userId);
  const profileStr = formatProfileForPrompt(profile);
  const profileHash = await hashProfile(profile);
  const medFlag = hasMedications(profile);

  // Cache lookup (cache key includes mealStyle + additionalGoal so different focuses cache separately)
  const markerHash = await hashMarkers(markers);
  const cacheKey = await sha256(`week|${mealStyle}|${additionalGoal.toLowerCase().trim()}|${dayOnly ? 'preview' : 'full'}|${profileHash}|${markerHash}`);
  const cachedRows = await sbSelect('personalised_cache', `cache_key=eq.${cacheKey}&select=result,hits&limit=1`);
  if (cachedRows && cachedRows.length > 0) {
    const row = cachedRows[0];
    sbUpdate('personalised_cache', `cache_key=eq.${cacheKey}`, { hits: (row.hits || 0) + 1, last_hit_at: new Date().toISOString() }).catch(() => {});
    logUsage(userId, 'personalise-week-cached').catch(() => {});
    sse(res, 'cached', { cache: 'HIT' });
    // Emit each day as a progress event so the UI animates the same way
    if (row.result?.days) {
      for (let i = 0; i < row.result.days.length; i++) {
        sse(res, 'day', { index: i, day: row.result.days[i] });
      }
    }
    sse(res, 'complete', { result: row.result });
    return res.end();
  }

  const prompt = buildPrompt({ markers, profileStr, medFlag, mealStyle, additionalGoal, dayOnly });
  const maxTokens = dayOnly ? 3500 : 9000;

  sse(res, 'start', { dayOnly });

  // Stream from Anthropic
  let accumulated = '';
  let emittedDayCount = 0;
  let lastProgressDays = [];   // Hold onto last successful progressive extraction for fallback
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

  // Process Anthropic SSE stream
  const reader = anthropicRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Anthropic SSE: each event is "event: <name>\ndata: <json>\n\n"
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const dataMatch = evt.match(/^data: (.+)$/m);
        if (!dataMatch) continue;
        try {
          const data = JSON.parse(dataMatch[1]);
          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            accumulated += data.delta.text;

            // Try to emit any newly-completed day objects
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

  // Final parse of complete output
  sse(res, 'parsing', {});
  let result;
  try {
    result = parseJSON(accumulated);
  } catch (e) {
    // Fallback: if we extracted any complete days during streaming, use those
    if (lastProgressDays.length > 0) {
      console.warn('[week-stream] final parse failed, using progressive extraction:', e.message);
      // Try to also extract key_insight from the accumulated text
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

  // Persist + log usage — must await on Node runtime, fire-and-forget would be killed when res.end() returns
  try {
    await sbUpsert('personalised_cache', { cache_key: cacheKey, type: 'week', result, hits: 0, created_at: new Date().toISOString() }, 'cache_key');
  } catch (e) { console.error('[week-stream] cache write failed:', e?.message); }
  const logEndpoint = dayOnly ? 'personalise-week-preview' : 'personalise-week';
  try { await logUsage(userId, logEndpoint); } catch (e) { console.error('[week-stream] usage log failed:', e?.message); }

  sse(res, 'complete', { result });
  return res.end();
}
