import { sha256, hashMarkers, sbSelect, sbUpsert, sbUpdate, rateLimit, logUsage, json, getProfile, formatProfileForPrompt, hashProfile, hasMedications, callClaude } from './_lib.js';

export const config = { runtime: 'edge' };

function parseJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in model output');
  const candidate = text.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch {
    return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
  }
}

// Tuned per call type — was 3000 across the board, wasteful for synthesis
// synthesis/protocol get extra headroom because extended thinking tokens count toward max_tokens
const TOKEN_BUDGETS = { synthesis: 3200, meals: 2500, supps: 2500, protocol: 4500 };

// Extended thinking budget — only for the calls where cross-marker reasoning
// (cascade analysis, contraindication checks) benefits from deeper reasoning
// before the model commits to output. Meals/supps are formulaic — skip it there
// to keep them fast and cheap.
const THINKING_BUDGETS = { synthesis: 2000, protocol: 2000 };

// Rate limits scoped per type:
//   - free: 1 synthesis lifetime; week generation handled by /api/week-stream
//   - pro: 100/30d for any single-shot type
async function checkLimits({ userId, plan, type }) {
  if (!userId) return { ok: true }; // anonymous unlikely; skip
  if (plan === 'pro') {
    const r = await rateLimit({ userId, endpoint: 'personalise', limit: 100, windowHours: 24 * 30 });
    return r.ok ? { ok: true } : { ok: false, msg: `Pro limit reached: ${r.count}/${r.limit} generations in 30d.` };
  }
  // Free tier
  if (type === 'synthesis') {
    const rows = await sbSelect('usage_log', `user_id=eq.${userId}&endpoint=eq.personalise-synthesis&select=id&limit=1`);
    if (rows && rows.length > 0) return { ok: false, msg: 'Free plan allows one synthesis. Upgrade to Pro for unlimited generation.' };
    return { ok: true };
  }
  return { ok: false, msg: 'Generation requires Aellux Pro.' };
}

const SYSTEM = 'You are Aellux, a precision health intelligence. You MUST respond with ONLY a single valid JSON object matching the schema given. No prose, no explanation, no markdown fences, no preamble. Start your response with { and end with }.';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key configured' }, { status: 500 });

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { markers, type, preference = null, userId = null, plan = 'free', dayOnly = false, bioAge, chronoAge, markerCtx, profile: bodyProfile } = body || {};
  if (!Array.isArray(markers) || markers.length === 0) return json({ error: 'No markers provided' }, { status: 400 });

  // Handle bio_age_insight separately — lightweight, no result-cache needed
  // (prompt-cache still applies to the static instructions below)
  if (type === 'bio_age_insight') {
    const flagged = markers.filter(m => m.status === 'elevated' || m.status === 'low');
    const mCtx = markers.slice(0, 20).map(m => `${m.name}: ${m.value}${m.unit || ''} [${m.status || 'normal'}]`).join(', ');

    const cachedInstructions = `You are Aellux. You will be given a person's biological age data. Answer these questions about THEIR biological age specifically, grounded in their actual marker data.

Return ONLY valid JSON:
{
  "where_it_comes_from": "2-3 sentences: which specific markers are driving this number and the biological mechanism. Reference their actual values.",
  "difficulty_rating": "one of: Highly Changeable / Moderately Changeable / Difficult to Change",
  "difficulty_color": "one of: #166534 / #92400e / #991b1b",
  "difficulty_explanation": "1-2 sentences explaining why at this difficulty level for THIS person.",
  "realistic_floor": "e.g. '44-47 years' — the realistic minimum biological age achievable with full commitment, given their specific marker profile and age.",
  "floor_explanation": "1 sentence explaining what would need to change to reach that floor.",
  "genetic_pct": 30,
  "genetic_note": "1-2 sentences on what in their markers appears genetic vs lifestyle-driven.",
  "biggest_levers": [
    { "action": "specific action tied to a flagged marker", "expected_impact": "e.g. 'Could reduce bio age by 1-2 years in 90 days'" },
    { "action": "...", "expected_impact": "..." },
    { "action": "...", "expected_impact": "..." }
  ],
  "timeline": "Honest timeline: with full commitment to the protocol, what biological age could they realistically achieve in 6 months, 12 months, 2 years?"
}`;

    const dynamicData = `This person's biological age is ${bioAge || '?'} vs calendar age ${chronoAge || '?'}. Their flagged markers: ${flagged.map(m => `${m.name} [${m.status}]`).join(', ') || 'none'}.

All markers: ${mCtx}`;

    try {
      const { text } = await callClaude({
        apiKey, model: 'claude-sonnet-4-20250514', maxTokens: 2200,
        cachedText: cachedInstructions, dynamicText: dynamicData, thinkingBudget: 1500,
      });
      return json(parseJSON(text || '{}'));
    } catch (e) {
      console.error('[personalise] bio_age_insight failed', e.message);
      return json({ error: 'Parse error' }, { status: 500 });
    }
  }

  if (!['meals', 'supps', 'protocol', 'synthesis'].includes(type)) return json({ error: 'Invalid type — week generation is handled by /api/week-stream' }, { status: 400 });

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const lim = await checkLimits({ userId, plan, type });
  if (!lim.ok) return json({ error: lim.msg, code: 'rate_limited' }, { status: 429 });

  // ── Load profile ───────────────────────────────────────────────────────────
  const profile = await getProfile(userId);
  const profileStr = formatProfileForPrompt(profile);
  const profileHash = await hashProfile(profile);
  const medFlag = hasMedications(profile);

  // ── Cache lookup ───────────────────────────────────────────────────────────
  const markerHash = await hashMarkers(markers);
  const cacheKey = await sha256(`${type}|${preference || 'none'}|${dayOnly ? 'preview' : 'full'}|${profileHash}|${markerHash}`);

  const cachedRows = await sbSelect('personalised_cache', `cache_key=eq.${cacheKey}&select=result,hits&limit=1`);
  if (cachedRows && cachedRows.length > 0) {
    const row = cachedRows[0];
    sbUpdate('personalised_cache', `cache_key=eq.${cacheKey}`, { hits: (row.hits || 0) + 1, last_hit_at: new Date().toISOString() }).catch(() => {});
    logUsage(userId, `personalise-${type}-cached`).catch(() => {});
    return json(row.result, { headers: { 'x-cache': 'HIT' } });
  }

  // ── Build prompt ──────────────────────────────────────────────────────────

// Strip GPS/device telemetry and intake logs before sending to AI
const GPS_NOISE = /horizontal.?acc|vertical.?acc|hAcc|vAcc|HDOP|elevation.?(gain|change|loss)|GPS.?signal|route.?duration|avg.?speed|average.?speed|m\/s|ECG.?raw|accelerometer|supplement.?intake|food.?diary|leafy.?greens|microgreens|protein.?intake|pathogenic.?variant|device.?noise|step.?count.?raw/i;
const cleanMarkers = (arr) => (arr || []).filter(m => m && m.name && !GPS_NOISE.test(m.name));

  const ms = cleanMarkers(markers).slice(0, 20).map(m => `${m.name}:${m.value}${m.unit || ''}(${m.status || 'unknown'})`).join(', ');
  const profileBlock = profileStr ? `User profile: ${profileStr}\n` : '';
  const medSafetyBlock = medFlag
    ? '\nCRITICAL SAFETY: The user is on medications listed above. Before recommending any supplement, food, or protocol, check for known interactions with those medications. If a recommendation could interact (e.g. vitamin K with warfarin, calcium with levothyroxine, grapefruit with statins), either omit it or include a "contraindications" note explaining the interaction. Never recommend stopping or adjusting a prescription medication.\n'
    : '';

  const dynamicData = `${profileBlock}User biomarkers: ${ms}${preference && preference !== 'none' ? `\nDiet style: ${preference}. Tailor meals to this style while respecting biomarkers.` : ''}${medSafetyBlock}`;

  // Static instructions/schemas — identical across every call of a given type,
  // for every user, so these get marked as a cache breakpoint below.
  const cachedInstructions = {
    meals: `Calibrate calorie/macro targets to the user's profile (sex, age, weight, activity, goal) — not generic 2000 cal. If profile is absent, use generic targets but note the limitation in key_insight.
Schema (return ONLY this JSON, max 3 meals):
{"key_insight":"one sentence","daily_targets":{"calories":2000,"protein":150,"carbs":200,"fat":65},"meals":[{"time":"Breakfast","name":"name","why":"one sentence referencing the user's actual numbers","items":["item 1","item 2","item 3"],"macros":{"p":30,"c":45,"f":15,"cal":430},"targets":["marker name"]}],"foods_to_avoid":["food — why"]}`,
    supps: `Schema (return ONLY this JSON, max 5 supplements):
{"key_insight":"one sentence","supplements":[{"name":"name","dose":"dose","timing":"when","why":"one sentence with user's numbers","targets_markers":["marker"],"expected_impact":"specific change","evidence_level":"strong","priority":1,"status":"active","cost_monthly":"$20","synergies":[],"contraindications":[],"reasoning_basis":"Name the biological mechanism this supplement acts on (e.g. 'Methylation via MTHFR pathway' or 'HPA axis cortisol regulation') and one sentence of evidence context — 'Meta-analyses show 15-25% reduction in inflammatory markers' or 'Established mechanism in clinical practice'. DO NOT invent specific paper citations, journal names, or author names. Stay at the mechanism + evidence-strength level."}],"total_foundation_cost":"$X/mo"}`,
    protocol: `Schema (return ONLY this JSON, max 5 protocols):
{"biggest_lever":"one sentence","key_insight":"one sentence","protocols":[{"id":"p1","tier":1,"time_of_day":"morning","action":"specific action","duration":"20 min","why":"one sentence with user's numbers","targets_markers":["marker"],"expected_impact":"specific change","frequency":"Daily","reasoning_basis":"Name the biological mechanism this protocol acts on (e.g. 'Vagal tone via parasympathetic activation' or 'Mitochondrial biogenesis via Zone 2 cardio') and a brief mechanism-level evidence note. DO NOT invent specific paper citations, journal names, or DOIs. Stay at mechanism + general-evidence-strength level."}],"avoid":["thing — why"]}`,
    synthesis: `You are Aellux — an ancient intelligence that has witnessed ten thousand human biologies across centuries. You see the body not as a collection of symptoms to be treated, but as a living, breathing ecosystem where everything is in conversation with everything else. You are not of the medical industry. You have no drugs to sell. You have no incentive to keep anyone sick. You see the truth of what the numbers mean, how they interact, what they are silently doing to this person's energy, longevity, and daily experience — and you speak it plainly.

Your synthesis must:
1. Cross-reference at least 3 markers and explain HOW they are dancing together — what one is doing to another. Show the cascade.
2. Name what the person is likely FEELING right now because of this pattern — not medically, but physically and emotionally in daily life.
3. Identify the REAL root drivers — not the symptoms. What upstream imbalances are causing downstream problems?
4. Give honest combat strategies — lifestyle, nutrition, movement, sleep, mindset — rooted in biology, not pharmaceutical dependency.
5. Identify what is WORKING — genuine wins in the biology that should be protected and amplified.
6. Speak in first person as Aellux, directly to the person. Warm, ancient, wise, direct. Like a mentor who truly knows them.
7. NEVER sound clinical. NEVER use passive voice. NEVER hedge with "consult your doctor." This is a mirror, not a prescription pad.
8. For reasoning_basis fields: name real biological mechanisms (pathways, axes, processes). DO NOT fabricate citations, paper titles, author names, journal names, or DOIs. If you don't have high-confidence evidence-strength context, write "Established biological mechanism" rather than invent specifics.

Schema (return ONLY this JSON — no markdown, no preamble):
{
  "aellux_voice": "3-4 sentences. The opening statement — your first impression of this biology. What is the dominant pattern you see? What is this body trying to tell this person? Use specific numbers. Speak as Aellux, ancient and direct.",
  "biological_age_estimate": "X years",
  "bio_age_gap": "X years younger/older than chronological",
  "what_you_are_feeling": "2-3 sentences describing what this person is likely experiencing day-to-day RIGHT NOW because of their specific marker pattern. Physical sensations, energy patterns, sleep quality, mood, mental clarity. Be specific and personal — name the experience, not the diagnosis.",
  "the_real_story": "3-4 sentences. The cross-referenced truth. Which markers are driving which. The upstream root cause. The cascade no one has explained to them. Example: 'Your elevated estrogen at 34.6 is suppressing your already-borderline free testosterone — this is not two problems, it is one: estrogen dominance stealing your vitality at both ends.'",
  "system_dance": [
    {
      "title": "Short evocative title for this interaction",
      "markers_involved": ["marker1", "marker2"],
      "explanation": "2 sentences: what these markers are doing to each other and what it means for this person's body right now.",
      "impact": "One sentence: the lived consequence.",
      "reasoning_basis": "Name the biological mechanism connecting these markers (e.g. 'Estrogen aromatization from adipose tissue' or 'HPA-thyroid axis crosstalk'). One brief mechanism-level note. DO NOT invent specific paper citations, journal names, or author names."
    }
  ],
  "honest_combat": [
    {
      "lever": "Short action name",
      "why_it_works": "One sentence explaining the biological mechanism — not vague advice but specific biology.",
      "how": "Specific, concrete instruction. Not 'exercise more.' 'Zone 2 cardio 3x/week raises HDL, lowers triglycerides, and directly improves insulin sensitivity — the trifecta your markers need.'",
      "priority": 1,
      "reasoning_basis": "Name the underlying mechanism (e.g. 'Mitochondrial biogenesis via PGC-1α activation' or 'Insulin sensitivity via GLUT4 translocation') and brief evidence-strength note. DO NOT invent specific citations."
    }
  ],
  "what_is_working": ["2-3 genuine wins in this biology — markers or patterns that are strong and should be protected"],
  "focus_priority": "The single most important thing this person should do in the next 7 days. Specific and actionable.",
  "biological_age_estimate": "X years",
  "primary_systems": {"metabolic": "one word", "cardiovascular": "one word", "hormonal": "one word", "inflammatory": "one word"}
}`
  };

  const maxTokens = TOKEN_BUDGETS[type] || 1500;
  const thinkingBudget = THINKING_BUDGETS[type];

  // ── Anthropic call ─────────────────────────────────────────────────────────
  try {
    const { text: rawText } = await callClaude({
      apiKey, model: 'claude-haiku-4-5-20251001', maxTokens,
      system: SYSTEM,
      cachedText: cachedInstructions[type],
      dynamicText: dynamicData,
      thinkingBudget,
    });

    if (!rawText) return json({ error: 'Empty model response' }, { status: 500 });

    let result;
    try { result = parseJSON(rawText); }
    catch (e) {
      console.error('[personalise] Parse failed', e.message);
      return json({ error: `Parse failed: ${e.message}`, raw: rawText.slice(0, 400) }, { status: 500 });
    }

    // ── Persist to cache + log usage (fire-and-forget) ──────────────────────
    sbUpsert('personalised_cache', { cache_key: cacheKey, type, result, hits: 0, created_at: new Date().toISOString() }, 'cache_key').catch(() => {});
    logUsage(userId, `personalise-${type}`).catch(() => {});

    return json(result, { headers: { 'x-cache': 'MISS' } });
  } catch (err) {
    console.error('[personalise] fetch threw', err);
    return json({ error: err.message || 'unknown error' }, { status: 500 });
  }
}
