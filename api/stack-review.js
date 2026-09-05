/**
 * /api/stack-review
 * Reviews the WHOLE supplement/medication stack as a system, not one at a
 * time: redundant combinations, ones that work against each other, whether
 * any of them plausibly explain a marker's movement (checked against every
 * supplement's own start date, not just one), known lab-assay interference
 * risks, and whether anything in the stack could be masking an underlying
 * deficiency rather than actually fixing it.
 *
 * Node runtime + persisted snapshot, same reasoning as premortem.js and
 * symptom-review.js: this is a real generation cost, so it shouldn't have
 * to be re-run just to look at it again.
 */
import {
  getProfile, formatProfileForPrompt, hasMedications,
  sbSelect, sbUpsert, hashMarkers, callClaude, rateLimit, logUsage,
} from './_lib.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function extractJSON(raw) {
  let text = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model output');
  const candidate = text.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch {
    return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
  }
}

const GPS_NOISE = /horizontal.?acc|vertical.?acc|hAcc|vAcc|HDOP|elevation.?(gain|change|loss)|GPS.?signal|route.?duration|avg.?speed|average.?speed|m\/s|ECG.?raw|accelerometer|supplement.?intake|food.?diary/i;

// Trimmed marker timelines — enough points for the model to see a trajectory
// and reason about timing against EACH supplement's own start date, without
// sending the person's entire lab history for every marker.
function buildMarkerTimelines(markers) {
  return (markers || [])
    .filter(m => m?.name && !GPS_NOISE.test(m.name) && m.history?.length >= 2)
    .slice(0, 25)
    .map(m => {
      const sorted = [...m.history]
        .filter(h => h.date && h.value !== undefined && h.value !== null && !isNaN(parseFloat(h.value)))
        .sort((a, b) => a.date.localeCompare(b.date));
      const trimmed = sorted.length > 8 ? sorted.slice(-8) : sorted; // most recent 8 points is plenty for a trend
      return `${m.name}${m.unit ? ` (${m.unit})` : ''}: ${trimmed.map(h => `${h.date}:${h.value}`).join(' → ')}`;
    });
}

const CACHED_INSTRUCTIONS = `You are Aellux, reviewing a person's FULL supplement/medication stack as a system — not one item at a time. You will be given every active supplement with its exact start date, and biomarker timelines (date:value pairs) for their tracked markers.

Do all of the following, thoroughly:

1. REDUNDANCIES: identify any supplements in the stack that overlap in mechanism or active ingredient (e.g. two forms of the same mineral, two sources of the same vitamin, overlapping antioxidant pathways). Name the specific overlap.

2. COUNTERPRODUCTIVE COMBINATIONS: identify pairs that work against each other — competing for absorption, opposing physiological effects, or timing conflicts (e.g. one needing an empty stomach while another needs food, one that should be taken hours apart from another for absorption). Be specific about the mechanism.

3. MARKER CORRELATIONS: for each supplement, look at its start date against every marker's timeline. Did any marker's trajectory visibly change around when that supplement started? Report this even when the direction is unclear or when the timing argues AGAINST a supplement being the cause (e.g. a marker that was already trending the same way before the supplement started is evidence AGAINST that supplement being responsible — say so explicitly, don't just report positive correlations).

4. LAB INTERFERENCE RISKS: some supplements are well-documented to interfere with specific lab assays regardless of the person's true physiology (the clearest example: high-dose biotin interfering with many immunoassays, including thyroid and troponin tests, producing a falsely abnormal or falsely normal result that doesn't reflect reality). Check the stack for anything with known assay-interference risk and name exactly which marker(s) could be affected and how.

5. MASKING RISK: identify anything in the stack that could be masking an underlying deficiency or condition rather than resolving it — the classic example is high-dose folate masking the anemia of B12 deficiency while allowing neurological damage from that same deficiency to progress silently. Look for this pattern in what's actually in the stack.

Ground every finding in the ACTUAL data given — supplement names, start dates, marker names and values. Do not invent a specific study, citation, or DOI; general mechanism-level and dosing knowledge is fine, fabricated specifics are not.

Return ONLY valid JSON, no markdown, nothing after the closing brace:
{
  "headline": "One direct sentence — the single most important thing about this stack as a whole.",
  "redundancies": [{"supplements": ["name1","name2"], "issue": "the specific overlap", "recommendation": "what to do about it"}],
  "counterproductive_combinations": [{"supplements": ["name1","name2"], "issue": "the specific conflict", "recommendation": "what to do about it"}],
  "marker_correlations": [{"supplement": "name", "started_date": "date", "marker": "name", "observation": "what the timeline actually shows relative to the start date", "supports_causation": true, "confidence": "strong|possible|weak"}],
  "lab_interference_risks": [{"supplement": "name", "affected_marker": "name", "risk": "how it could produce a false reading", "recommendation": "e.g. stop N days before next draw"}],
  "masking_risks": [{"supplement": "name", "could_mask": "what underlying issue this could be hiding", "recommendation": "what to actually check instead"}],
  "overall_recommendation": "1-3 sentences — the single most important structural change to make to this stack, if any."
}`;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    if (!userId) return sendJson(res, 400, { error: 'userId required' });
    const rows = await sbSelect('stack_review_snapshots', `user_id=eq.${userId}&select=result,created_at&limit=1`);
    if (rows && rows.length > 0) {
      return sendJson(res, 200, { ...rows[0].result, savedAt: rows[0].created_at, fromSnapshot: true });
    }
    return sendJson(res, 200, { headline: null });
  }

  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed'); }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: 'No API key configured' });

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsedBody;
  try { parsedBody = JSON.parse(body); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }

  const { userId, plan, allMarkers } = parsedBody || {};
  if (!userId) return sendJson(res, 400, { error: 'Missing userId' });

  const r = await rateLimit({ userId, endpoint: 'stack-review', limit: plan === 'pro' ? 20 : 3, windowHours: 24 * 7 });
  if (!r.ok) return sendJson(res, 200, { error: 'Weekly stack review limit reached.' });

  const [profile, stack] = await Promise.all([
    getProfile(userId),
    sbSelect('supplement_log', `user_id=eq.${userId}&ended_date=is.null&select=name,dose,frequency,started_date,notes`),
  ]);

  if (!stack || stack.length < 2) {
    return sendJson(res, 200, { error: 'Log at least 2 active supplements to review the stack as a whole.' });
  }

  const profileStr = formatProfileForPrompt(profile);
  const medFlag = hasMedications(profile);
  const stackStr = stack.map(s => `${s.name}${s.dose ? ` ${s.dose}` : ''} — ${s.frequency || 'daily'}, started ${s.started_date || 'unknown'}${s.notes ? ` (${s.notes})` : ''}`).join('\n');
  const timelines = buildMarkerTimelines(allMarkers);
  const medSafetyNote = medFlag ? '\nThis person has logged medications — check the stack for interactions with those too, not just within the supplements themselves.' : '';

  const dynamicData = `USER PROFILE: ${profileStr || 'Not provided'}${medSafetyNote}

FULL ACTIVE STACK:
${stackStr}

MARKER TIMELINES (date:value, most recent points):
${timelines.join('\n') || 'No marker history available.'}`;

  try {
    const { text } = await callClaude({
      apiKey, model: 'claude-sonnet-5', maxTokens: 3200,
      cachedText: CACHED_INSTRUCTIONS, dynamicText: dynamicData, thinkingBudget: 2200,
    });

    let result;
    try { result = extractJSON(text); }
    catch (e) {
      console.error('[stack-review] parse failed:', e?.message, text.slice(-300));
      return sendJson(res, 502, { error: "Analysis didn't come back in a usable format — try again." });
    }

    const stackHash = await hashMarkers(stack.map(s => ({ name: s.name, value: s.dose, unit: s.frequency, status: s.started_date })));
    sbUpsert('stack_review_snapshots', { user_id: userId, result, stack_hash: stackHash, updated_at: new Date().toISOString() }, 'user_id').catch(() => {});
    logUsage(userId, 'stack-review').catch(() => {});

    return sendJson(res, 200, result);
  } catch (err) {
    console.error('[stack-review] failed:', err?.message);
    return sendJson(res, 502, { error: err.message || 'Stack review failed.' });
  }
}
