/**
 * /api/supplement-review
 * Takes one supplement (name/dose/frequency) and actually evaluates it —
 * against the person's full current stack (redundancy/interaction checks),
 * their flagged biomarkers, their active protocol, and their profile
 * (sex/age/conditions/medications). Returns a real verdict, not just a
 * saved log entry.
 */
import {
  getProfile, formatProfileForPrompt, hasMedications,
  sbSelect, sbUpdate, rateLimit, logUsage, json, callClaude,
} from './_lib.js';

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

const CACHED_INSTRUCTIONS = `You are Aellux, reviewing ONE supplement or medication a person has just logged, in the full context of everything else they take and everything currently happening in their biology. Your job is to actually take a position — agree, disagree, or flag caution — not describe the supplement in the abstract.

You must:
1. Take a real stance: "agree" (reasonable choice and dose given their picture), "caution" (worth a specific adjustment — dose, timing, or awareness — but not wrong to take), or "disagree" (this looks like the wrong call given their actual data, or actively risky).
2. Assess the DOSE specifically against typical evidence-based ranges — say if it's too low to matter, in a reasonable range, or high enough to warrant caution. Do not fabricate a specific study citation, journal name, or DOI — general dosing ranges are fine, invented citations are not.
3. Check the FULL STACK you're given for redundancy (two forms of the same thing, e.g. two magnesium salts) or known interaction risk — this is often the thing a person logging one supplement at a time would never notice themselves.
4. Give concrete timing guidance if it matters (with food, away from other supplements, time of day) — only if there's a real reason, not generic filler.
5. If any currently-flagged biomarker or active protocol issue is directly relevant to this supplement (helps it, worsens it, or is unrelated but worth naming), say so explicitly and specifically — reference the actual marker/value you're given.
6. Name ONE thing about this specific combination that a person evaluating supplements one at a time would typically miss — this is the most valuable part of your answer, so make it specific to their actual data, not a generic supplement fact.
7. If this supplement has real interaction risk with a listed medication, say so plainly and recommend a pharmacist/doctor check — do not soften this into a vague "consult a professional" throwaway when the risk is specific and known.

Return ONLY valid JSON, no markdown:
{
  "verdict": "agree|caution|disagree",
  "headline": "one direct sentence stating your position",
  "dosage_assessment": "1-2 sentences on whether this dose makes sense for them specifically",
  "timing": "1 sentence, or null if there's nothing specific to say",
  "interactions_or_redundancies": ["specific finding", "..."],
  "connects_to_current_flags": "1-2 sentences tying this to a specific currently-flagged marker or active protocol issue if genuinely relevant, else null",
  "overlooked_nuance": "1-2 sentences — the specific thing about THIS combination most likely to be missed"
}`;

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'No API key configured' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { userId, plan, supplementId, supplement, allMarkers, mealStyle, cycleStartedAt, additionalGoal, protocolWatchFlags } = body || {};
  if (!userId || !supplement?.name) return json({ error: 'Missing supplement' }, { status: 400 });

  if (userId) {
    const r = await rateLimit({ userId, endpoint: 'supplement-review', limit: plan === 'pro' ? 60 : 8, windowHours: 24 });
    if (!r.ok) return json({ error: 'Daily supplement review limit reached.' }, { status: 429 });
  }

  const [profile, stack] = await Promise.all([
    getProfile(userId),
    sbSelect('supplement_log', `user_id=eq.${userId}&ended_date=is.null&select=name,dose,frequency,started_date`),
  ]);
  const profileStr = formatProfileForPrompt(profile);
  const medFlag = hasMedications(profile);

  const stackStr = (stack || [])
    .filter(s => s.name?.toLowerCase().trim() !== supplement.name?.toLowerCase().trim())
    .map(s => `${s.name}${s.dose ? ` ${s.dose}` : ''} (${s.frequency || 'daily'}, since ${s.started_date || 'unknown'})`)
    .join(', ') || 'None currently logged';

  const GPS_NOISE = /horizontal.?acc|vertical.?acc|hAcc|vAcc|HDOP|elevation.?(gain|change|loss)|GPS.?signal|route.?duration|avg.?speed|average.?speed|m\/s|ECG.?raw|accelerometer/i;
  const flaggedStr = (allMarkers || [])
    .filter(m => m?.name && !GPS_NOISE.test(m.name) && (m.status === 'elevated' || m.status === 'low'))
    .slice(0, 15)
    .map(m => `${m.name}: ${m.value}${m.unit || ''} [${m.status}]`)
    .join(', ') || 'None currently flagged';

  const watchStr = Array.isArray(protocolWatchFlags) && protocolWatchFlags.length > 0
    ? protocolWatchFlags.map(f => `${f.marker} (${f.severity === 'physician' ? 'physician-severity' : 'protocol-severity'}): ${f.alert || ''}`).join(' | ')
    : 'None currently active';

  const medSafetyBlock = medFlag
    ? `\nCRITICAL: This person is on medications (see profile). Explicitly check this supplement for known interactions with those medications. If there's real interaction risk, say so plainly and specifically — do not bury it as a generic disclaimer.\n`
    : '';

  const dynamicData = `User profile: ${profileStr || 'Not provided'}${medSafetyBlock}

SUPPLEMENT BEING REVIEWED: ${supplement.name}${supplement.dose ? ` — ${supplement.dose}` : ''}, ${supplement.frequency || 'Daily'}${supplement.notes ? `, notes: ${supplement.notes}` : ''}

REST OF THEIR CURRENT STACK (check for redundancy/interaction against this): ${stackStr}

CURRENTLY FLAGGED BIOMARKERS: ${flaggedStr}

ACTIVE PROTOCOL: ${mealStyle && mealStyle !== 'none' ? mealStyle : 'none set'}${cycleStartedAt ? `, started ${cycleStartedAt.slice(0, 10)}` : ''}${additionalGoal ? `, goal: ${additionalGoal}` : ''}

ALREADY-DETECTED TRAJECTORY FLAGS (markers trending wrong since protocol start): ${watchStr}`;

  try {
    const { text } = await callClaude({
      apiKey, model: 'claude-sonnet-4-20250514', maxTokens: 2800,
      cachedText: CACHED_INSTRUCTIONS, dynamicText: dynamicData, thinkingBudget: 1600,
    });

    let result;
    try { result = parseJSON(text); }
    catch (e) {
      console.error('[supplement-review] parse failed:', e?.message, 'raw:', String(text).slice(0, 500));
      return json({ error: `Parse failed: ${e.message}` }, { status: 500 });
    }

    // Persist onto the supplement row so it survives reload — this is a real
    // verdict, not a throwaway chat response.
    if (supplementId) {
      sbUpdate('supplement_log', `id=eq.${supplementId}`, { review: result, reviewed_at: new Date().toISOString() }).catch(() => {});
    }
    if (userId) logUsage(userId, 'supplement-review').catch(() => {});

    return json({ review: result });
  } catch (err) {
    console.error('[supplement-review] failed:', err?.message, err?.stack);
    return json({ error: err.message || 'Review failed' }, { status: 500 });
  }
}
